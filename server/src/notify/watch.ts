import { randomUUID } from 'node:crypto';
import type { NotifyChannel, Watch, WatchNotification } from '@hot/shared';
import { and, desc, eq, gte, inArray, isNull, or } from 'drizzle-orm';
import type { Db } from '../db/index.ts';
import { items, notifications, stories, storyItems, watches } from '../db/schema.ts';
import { postServerchan } from './serverchan.ts';

const LATIN = /[a-z0-9][a-z0-9+]{3,}/g;
let matchNote: string | null = null;

export function keywordHits(keyword: string, title: string, summaryZh: string | null, extra = ''): boolean {
  const needle = keyword.trim().toLowerCase();
  if (!needle) return false;
  const hay = `${title}\n${summaryZh ?? ''}\n${extra}`.toLowerCase();
  if (hay.includes(needle)) return true;
  return (needle.match(LATIN) ?? []).some((token) => hay.includes(token));
}

function toWatch(row: typeof watches.$inferSelect): Watch {
  return {
    id: row.id,
    keyword: row.keyword,
    paused: row.paused,
    createdAt: row.createdAt.toISOString(),
  };
}

function toNote(row: typeof notifications.$inferSelect): WatchNotification {
  const channel: NotifyChannel = row.channel === 'sent' || row.channel === 'failed' ? row.channel : 'skipped';
  return {
    id: row.id,
    watchId: row.watchId,
    storyId: row.storyId,
    keyword: row.keyword,
    title: row.title,
    body: row.body,
    channel,
    httpStatus: row.httpStatus ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export function listWatchState(db: Db): { watches: Watch[]; notifications: WatchNotification[]; matchNote: string | null } {
  const watchRows = db.select().from(watches).orderBy(desc(watches.createdAt)).all();
  const noteRows = db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(50).all();
  return { watches: watchRows.map(toWatch), notifications: noteRows.map(toNote), matchNote };
}

export function createWatch(db: Db, keyword: string, now: Date): { ok: true; watch: Watch } | { ok: false; error: 'duplicate' } {
  const trimmed = keyword.trim();
  const taken = db
    .select()
    .from(watches)
    .all()
    .some((row) => row.keyword.toLowerCase() === trimmed.toLowerCase());
  if (taken) return { ok: false, error: 'duplicate' };
  const row = { id: randomUUID(), keyword: trimmed, paused: false, since: now, createdAt: now };
  db.insert(watches).values(row).run();
  return { ok: true, watch: toWatch(row) };
}

export function setWatchPaused(db: Db, id: string, paused: boolean, now: Date): boolean {
  const row = db.select().from(watches).where(eq(watches.id, id)).get();
  if (!row) return false;
  db.update(watches)
    .set(paused ? { paused: true } : { paused: false, since: now })
    .where(eq(watches.id, id))
    .run();
  return true;
}

export function deleteWatch(db: Db, id: string): boolean {
  const row = db.select().from(watches).where(eq(watches.id, id)).get();
  if (!row) return false;
  db.delete(notifications).where(eq(notifications.watchId, id)).run();
  db.delete(watches).where(eq(watches.id, id)).run();
  return true;
}

async function deliver(
  fetchImpl: typeof fetch,
  key: string | undefined,
  title: string,
  body: string,
  keyword: string,
): Promise<{ channel: NotifyChannel; httpStatus: number | null }> {
  const trimmed = key?.trim();
  if (!trimmed) return { channel: 'skipped', httpStatus: null };
  try {
    const result = await postServerchan(fetchImpl, trimmed, title, `关键词：${keyword}\n\n${body}`);
    return { channel: result.ok ? 'sent' : 'failed', httpStatus: result.status };
  } catch {
    return { channel: 'failed', httpStatus: null };
  }
}

/** Notify active watches about stories created since the watch's `since` time. One row per story and keyword. */
export async function matchWatches(
  db: Db,
  opts: { now: Date; serverchanKey?: string; fetchImpl: typeof fetch },
): Promise<number> {
  const active = db.select().from(watches).where(eq(watches.paused, false)).all();
  let created = 0;
  let matched = 0;
  for (const watch of active) {
    const rows = db
      .select()
      .from(stories)
      .where(and(gte(stories.createdAt, watch.since), or(isNull(stories.relevant), eq(stories.relevant, true))))
      .all();
    const extra = snippetText(db, rows.map((row) => row.id));
    for (const story of rows) {
      const hay = `${story.summary ?? ''}\n${extra.get(story.id) ?? ''}`;
      if (!keywordHits(watch.keyword, story.title, story.summaryZh, hay)) continue;
      matched += 1;
      const existing = db
        .select({ id: notifications.id })
        .from(notifications)
        .where(and(eq(notifications.watchId, watch.id), eq(notifications.storyId, story.id)))
        .get();
      if (existing) continue;
      const body = story.summaryZh?.trim() || story.title;
      const sent = await deliver(opts.fetchImpl, opts.serverchanKey, story.title, body, watch.keyword);
      db.insert(notifications)
        .values({
          id: randomUUID(),
          watchId: watch.id,
          storyId: story.id,
          keyword: watch.keyword,
          title: story.title,
          body,
          channel: sent.channel,
          httpStatus: sent.httpStatus,
          createdAt: opts.now,
        })
        .run();
      created += 1;
    }
  }
  matchNote = active.length > 0 && matched === 0 ? '这次采集没有命中关键词。' : null;
  return created;
}

function snippetText(db: Db, storyIds: string[]): Map<string, string> {
  const out = new Map<string, string>();
  if (storyIds.length === 0) return out;
  const links = db.select().from(storyItems).where(inArray(storyItems.storyId, storyIds)).all();
  const itemIds = [...new Set(links.map((link) => link.itemId))];
  const itemRows = itemIds.length === 0 ? [] : db.select().from(items).where(inArray(items.id, itemIds)).all();
  const itemById = new Map(itemRows.map((row) => [row.id, row]));
  for (const link of links) {
    const item = itemById.get(link.itemId);
    if (!item) continue;
    out.set(link.storyId, `${out.get(link.storyId) ?? ''}\n${item.title}\n${item.summary ?? ''}`);
  }
  return out;
}
