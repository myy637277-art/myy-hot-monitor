import type { CollectProgress, EmbeddingNote } from '@hot/shared';
import { eq } from 'drizzle-orm';
import { judgeHomepage } from '../ai/judge.ts';
import { aiEnvForNet, scoreStories } from '../ai/score.ts';
import type { Db } from '../db/index.ts';
import { watches } from '../db/schema.ts';
import { interestSearchTerms } from '../discover/interests.ts';
import { matchWatches } from '../notify/watch.ts';
import { collectArxiv, collectBilibili, collectGithub, collectHn, collectRssFeed, collectTwitter, collectWeibo } from './adapters.ts';
import { HOME_WINDOW_MS } from './home.ts';
import { buildCatalog, DEFAULT_SEARCH_QUERY, RSS_FEEDS, SEARCH_ENGINES } from './catalog.ts';
import { embeddingLayerStatus } from './embed.ts';
import { crawlerUa } from './http.ts';
import { collectSearch } from './search.ts';
import { activePause, ensureSources, getSearchUsed, recordAttempt } from './store.ts';
import { shanghaiDate } from './time.ts';
import { failedAttempt, type Attempt, type Net } from './types.ts';

export interface CollectReport {
  embedding: EmbeddingNote;
  attempts: Attempt[];
}

const emptyProgress = (): CollectProgress => ({ sourceName: null, items: 0 });

/** Resolves with `fallback` when `work` is still pending after `ms`, so one hung fetch cannot stall the rest. */
function withDeadline<T>(work: Promise<T>, ms: number, fallback: () => T): Promise<T> {
  return new Promise((resolve) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout>;
    const finish = (value: T) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    timer = setTimeout(() => finish(fallback()), ms);
    work.then(
      (value) => finish(value),
      () => finish(fallback()),
    );
  });
}

export async function runCollect(
  db: Db,
  net: Net,
  caps: { search: number; twitter: number },
  onProgress?: (progress: CollectProgress) => void,
): Promise<CollectReport> {
  ensureSources(db, caps);
  const embedding = embeddingLayerStatus();
  const useEmbedding = !embedding.skipped;
  const attempts: Attempt[] = [];
  const names = new Map(buildCatalog(caps).map((entry) => [entry.id, entry.name]));
  const active = new Set<string>();
  let items = 0;

  const publish = () => onProgress?.({ sourceName: [...active].join('、') || null, items });
  const record = (attempt: Attempt) => {
    try {
      recordAttempt(db, attempt, net.now(), useEmbedding);
    } catch (err) {
      attempt.status = 'error';
      attempt.error = err instanceof Error ? err.message : '写入失败';
    }
    attempts.push(attempt);
    items += attempt.items.length;
    active.delete(names.get(attempt.sourceId) ?? attempt.sourceId);
    publish();
  };
  const timed = async (id: string, ms: number, work: () => Promise<Attempt>) => {
    const name = names.get(id) ?? id;
    active.add(name);
    publish();
    const attempt = await withDeadline(work(), ms, () => failedAttempt(id, 'error', '请求超时', { requests: 1 }));
    record(attempt);
  };

  const feedLimit = net.feedTimeoutMs + 500;
  await Promise.all([
    timed('weibo_hot', feedLimit, () => collectWeibo(net)),
    timed('bili_hot', feedLimit, () => collectBilibili(net)),
    timed('hn', net.hnTimeoutMs + 500, () => collectHn(net)),
    timed('github', feedLimit, () => collectGithub(net)),
    timed('arxiv', feedLimit, () => collectArxiv(net)),
    timed('twitter', feedLimit, () => collectTwitter(db, net)),
    ...RSS_FEEDS.map((feed) => timed(feed.id, feedLimit, () => collectRssFeed(net, feed))),
  ]);

  const searchLimit = net.minGapMs + 30_000 + net.searchTimeoutMs + 5_000;
  for (const engine of SEARCH_ENGINES) {
    await timed(engine.id, searchLimit, () => collectSearch(db, engine.engine, net));
  }

  const keywords = db.select().from(watches).where(eq(watches.paused, false)).all();
  for (const watch of keywords) {
    const engine = keywordEngine(db, net);
    if (engine) await timed(engine.id, searchLimit, () => collectSearch(db, engine.engine, net, watch.keyword));
    if (net.twitterKey?.trim()) await timed('twitter', feedLimit, () => collectTwitter(db, net, watch.keyword, HOME_WINDOW_MS));
  }

  for (const term of interestSearchTerms(db)) {
    const engine = keywordEngine(db, net);
    if (engine) await timed(engine.id, searchLimit, () => collectSearch(db, engine.engine, net, term));
    if (net.twitterKey?.trim()) await timed('twitter', feedLimit, () => collectTwitter(db, net, term, HOME_WINDOW_MS));
  }

  return { embedding, attempts };
}

function keywordEngine(db: Db, net: Net) {
  const now = net.now();
  const day = shanghaiDate(now);
  for (const engine of SEARCH_ENGINES) {
    if (engine.engine === 'google') continue;
    if (activePause(db, engine.id, now)) continue;
    if (getSearchUsed(db, engine.id, day) >= net.searchDailyCap) continue;
    return engine;
  }
  return null;
}

export interface Collector {
  start: () => { started: boolean };
  running: () => boolean;
  progress: () => CollectProgress;
}

export function createCollector(db: Db, net: Net, caps: { search: number; twitter: number }): Collector {
  let current: Promise<CollectReport> | null = null;
  let progress = emptyProgress();
  const show = (name: string) => {
    progress = { sourceName: name, items: progress.items };
  };
  return {
    start() {
      if (current) return { started: false };
      progress = emptyProgress();
      current = runCollect(db, net, caps, (next) => {
        progress = next;
      })
        .then(async (report) => {
          show('中文摘要');
          await scoreStories(db, aiEnvForNet(net));
          await judgeHomepage(db, aiEnvForNet(net));
          show('关键词匹配');
          await matchWatches(db, { now: net.now(), serverchanKey: net.serverchanKey, fetchImpl: net.fetch });
          return report;
        })
        .catch((err) => {
          console.error('[collect] failed', err instanceof Error ? err.message : 'failed');
          return { embedding: embeddingLayerStatus(), attempts: [] };
        })
        .finally(() => {
          current = null;
          progress = emptyProgress();
        });
      return { started: true };
    },
    running: () => current !== null,
    progress: () => progress,
  };
}

function positive(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function netFromEnv(env: NodeJS.ProcessEnv): Net {
  return {
    fetch: globalThis.fetch,
    now: () => new Date(),
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    ua: crawlerUa(env.CRAWLER_CONTACT),
    jitterMs: () => Math.floor(Math.random() * 30_001),
    minGapMs: Math.max(90, positive(env.SEARCH_MIN_INTERVAL_SEC, 90)) * 1000,
    searchDailyCap: Math.min(80, positive(env.SEARCH_DAILY_CAP_PER_ENGINE, 80)),
    searchTimeoutMs: 10_000,
    hnTimeoutMs: 5_000,
    feedTimeoutMs: 10_000,
    twitterCap: Math.min(150, positive(env.TWITTER_DAILY_TWEET_CAP, 150)),
    twitterKey: env.TWITTERAPI_IO_API_KEY,
    deepseekKey: env.DEEPSEEK_API_KEY,
    serverchanKey: env.SERVERCHAN_SENDKEY,
    searchQuery: DEFAULT_SEARCH_QUERY,
  };
}

export function capsFromNet(net: Net): { search: number; twitter: number } {
  return { search: net.searchDailyCap, twitter: net.twitterCap };
}
