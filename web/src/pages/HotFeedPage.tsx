import { useState } from 'react';
import { useOutletContext } from 'react-router';
import { Agent, agents, type AgentId } from '../components/agents/Agent.tsx';
import { Badge } from '../components/ui/Badge.tsx';
import { Button } from '../components/ui/Button.tsx';
import { HudCard } from '../components/ui/HudCard.tsx';
import { Meter } from '../components/ui/Meter.tsx';
import { PageHeader } from '../components/ui/PageHeader.tsx';
import { httpUrl, rulesBadge, StorySourceLink, StoryTitleLink } from '../components/story-link.tsx';
import { collectStatus, useCollect, useSources, useStories } from '../lib/feed.ts';
import { fmtDateTime, type HealthState } from '../lib/useHealth.ts';

function Radar() {
  return (
    <div aria-hidden="true" className="relative size-16 shrink-0 overflow-hidden rounded-full border border-ok/40">
      <span className="absolute inset-3 rounded-full border border-ok/25" />
      <span className="absolute inset-6 rounded-full border border-ok/25" />
      <span
        data-testid="radar-sweep"
        className="absolute inset-0 animate-sweep rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,transparent_300deg,rgb(23_229_201/0.55)_360deg)]"
      />
    </div>
  );
}

function BackendStatus({ state }: { state: HealthState }) {
  const connected = state.status === 'ok' || state.status === 'stale';
  const title =
    state.status === 'loading'
      ? '正在连接后端…'
      : state.status === 'ok'
        ? '后端已连接'
        : state.status === 'stale'
          ? '后端已连接（心跳超时）'
          : '后端未连接';

  return (
    <div data-testid="backend-status" className="h-full">
      <HudCard code="SYSTEM" title={title} className="h-full" action={connected ? <Radar /> : undefined}>
        {connected && (
          <dl className="grid grid-cols-2 gap-3 font-mono text-sm">
            <div>
              <dt className="text-xs text-muted">最近心跳</dt>
              <dd data-testid="heartbeat-time">{fmtDateTime(state.health.heartbeat.lastAt)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">心跳次数 / 间隔</dt>
              <dd>
                {state.health.heartbeat.count} / {state.health.heartbeat.intervalSec}s
              </dd>
            </div>
          </dl>
        )}
        {state.status === 'down' && (
          <p className="text-sm text-muted">
            请在另一个终端运行 <code className="font-mono text-accent-text">npm run dev:server</code>，页面会每 5 秒自动重试。
          </p>
        )}
      </HudCard>
    </div>
  );
}

const HOME_PREVIEW = 15;

export function HotFeedPage() {
  const health = useOutletContext<HealthState>();
  const sources = useSources();
  const stories = useStories();
  const collect = useCollect();
  const [showAll, setShowAll] = useState(false);
  const collecting = collect.isPending || Boolean(sources.data?.running);
  const status = collectStatus(Boolean(sources.data?.running), sources.data?.progress);

  return (
    <>
      <PageHeader code="01 HOT FEED" title="热点">
        近 7 天、有发布时间的热点。微博和 B 站不出现在这页。先显示 15 条代表故事。
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <BackendStatus state={health} />

        <HudCard code="SQUAD" title="特工小队" className="lg:col-span-2">
          <ul className="grid grid-cols-3 gap-3">
            {(Object.keys(agents) as AgentId[]).map((id) => (
              <li key={id} className="text-center">
                <div className="mx-auto max-w-28">
                  <Agent id={id} decorative />
                </div>
                <p className="mt-2 font-display text-base font-semibold tracking-wider uppercase">
                  {agents[id].codename}
                  <span className="ml-1 text-sm text-muted">{agents[id].name}</span>
                </p>
                <p className="text-xs text-muted">{agents[id].role}</p>
                <p className="text-xs whitespace-nowrap text-muted">{agents[id].feature}</p>
              </li>
            ))}
          </ul>
        </HudCard>
      </div>

      <div className="mt-8 mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-mono text-xs tracking-[0.25em] text-muted">// HOT STREAM · 热点流</h2>
        <div className="flex flex-col items-end gap-1">
          <Button onClick={() => collect.mutate()} disabled={collecting}>
            {collecting ? `采集中 · ${sources.data?.progress?.items ?? 0} 条` : '立即采集'}
          </Button>
          {status && (
            <p aria-live="polite" className="text-sm text-bone">
              {status}
            </p>
          )}
        </div>
      </div>

      {stories.isPending && <p className="text-sm text-muted">正在读取热点…</p>}
      {stories.isError && (
        <p role="alert" className="text-sm text-accent-text">
          热点加载失败。确认后端已启动后再试。
        </p>
      )}
      {stories.data && stories.data.stories.length === 0 && (
        <HudCard code="EMPTY" title="还没有热点">
          <p className="text-sm text-muted">近 7 天里没有可放上首页的故事。没有发布时间的条目、微博和 B 站都不会出现在这里。</p>
        </HudCard>
      )}
      {stories.data && stories.data.stories.length > 0 && (
        <>
          <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(showAll ? stories.data.stories : stories.data.stories.slice(0, HOME_PREVIEW)).map((story) => {
              const href = story.sources.map((source) => httpUrl(source.url)).find((url) => url != null) ?? null;
              const rules = rulesBadge(story.aiMode, story.credibilityReason);
              const headline = story.eventTitle ?? story.title;
              return (
              <li key={story.id}>
                <HudCard as="article" className="h-full" bodyClassName="flex flex-col gap-3">
                  <div className="flex flex-wrap gap-2">
                    {story.sources.map((source) => (
                      <StorySourceLink key={`${source.id}:${source.url ?? ''}`} source={source}>
                        <Badge tone="info">{source.name}</Badge>
                      </StorySourceLink>
                    ))}
                    {story.unverified && <Badge tone="warn">未经过模型核实</Badge>}
                    {rules && <Badge tone="info">{rules}</Badge>}
                    {story.credibility != null && story.credibility <= 30 && <Badge tone="danger">低可信</Badge>}
                  </div>
                  <h3 className="leading-snug font-semibold">
                    <StoryTitleLink title={headline} href={href} />
                  </h3>
                  {(story.summaryZh || story.summary) && (
                    <p className="text-sm leading-relaxed text-muted">{story.summaryZh ?? story.summary}</p>
                  )}
                  {story.hotness != null && <Meter label="热度" value={story.hotness} />}
                  {story.credibility != null && (
                    <Meter label="可信度" value={story.credibility} tone={story.credibility >= 60 ? 'ok' : 'warn'} />
                  )}
                  {story.feedReason && <p className="text-xs leading-relaxed text-muted">{story.feedReason}</p>}
                  {story.credibilityReason && <p className="text-xs leading-relaxed text-muted">{story.credibilityReason}</p>}
                  <p className="mt-auto font-mono text-xs text-muted">
                    {fmtDateTime(story.publishedAt ?? story.updatedAt)} · {story.sources.length} 个来源
                  </p>
                </HudCard>
              </li>
              );
            })}
          </ul>
          {!showAll && stories.data.stories.length > HOME_PREVIEW && (
            <div className="mt-4">
              <Button variant="ghost" onClick={() => setShowAll(true)}>
                更多 · {stories.data.stories.length - HOME_PREVIEW}
              </Button>
            </div>
          )}
        </>
      )}
    </>
  );
}
