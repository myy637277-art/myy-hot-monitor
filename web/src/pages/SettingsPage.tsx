import { useOutletContext } from 'react-router';
import type { IntegrationName, SourceRunStatus } from '@hot/shared';
import { Agent, agents, expressionLabels, type AgentId, type Expression } from '../components/agents/Agent.tsx';
import { Badge, type Tone } from '../components/ui/Badge.tsx';
import { Button } from '../components/ui/Button.tsx';
import { HudCard } from '../components/ui/HudCard.tsx';
import { Meter } from '../components/ui/Meter.tsx';
import { PageHeader } from '../components/ui/PageHeader.tsx';
import { collectStatus, usageLabel, useCollect, useSources } from '../lib/feed.ts';
import type { HealthState } from '../lib/useHealth.ts';

const integrationLabels: Record<IntegrationName, string> = {
  deepseek: 'DeepSeek',
  twitterapiIo: 'twitterapi.io',
  smtp: '邮件 SMTP',
  serverchan: 'Server酱',
};

// Contrast ratios measured against the card panel (#1F2731), the darkest common text background.
const swatches = [
  { name: 'ink', hex: '#0F1923', use: '背景' },
  { name: 'panel', hex: '#1F2731', use: '卡片' },
  { name: 'accent', hex: '#FF4655', use: '强调色块' },
  { name: 'accent-text', hex: '#FF6170', use: '强调文字 · 5.2:1' },
  { name: 'bone', hex: '#ECE8E1', use: '正文 · 12.4:1' },
  { name: 'muted', hex: '#A9B0B6', use: '次要文字 · 6.9:1' },
  { name: 'ok', hex: '#17E5C9', use: '可信 · 9.4:1' },
  { name: 'warn', hex: '#F5B83D', use: '存疑 · 8.5:1' },
];

const expressions = Object.keys(expressionLabels) as Expression[];

const sourceTone: Record<SourceRunStatus, Tone> = {
  ok: 'ok',
  paused: 'warn',
  skipped: 'warn',
  error: 'danger',
  unconfigured: 'info',
  idle: 'info',
};

export function SettingsPage() {
  const health = useOutletContext<HealthState>();
  const integrations = health.status === 'ok' || health.status === 'stale' ? health.health.integrations : null;
  const sources = useSources();
  const collect = useCollect();
  const collecting = collect.isPending || Boolean(sources.data?.running);
  const status = collectStatus(Boolean(sources.data?.running), sources.data?.progress);

  return (
    <>
      <PageHeader code="05 SETTINGS" title="设置">
        各来源今天的状态和用量。来源开关和信誉表会在后面的里程碑出现。
      </PageHeader>

      <HudCard
        code="SOURCES"
        title="来源状态"
        className="mb-4"
        action={
          <Button onClick={() => collect.mutate()} disabled={collecting}>
            {collecting ? `采集中 · ${sources.data?.progress?.items ?? 0} 条` : '立即采集'}
          </Button>
        }
      >
        {status && (
          <p aria-live="polite" className="mb-3 text-sm text-bone">
            {status}
          </p>
        )}
        {sources.data?.embedding.skipped && sources.data.embedding.reason && (
          <p className="mb-3 text-sm text-muted">{sources.data.embedding.reason}</p>
        )}
        {sources.data?.ai && (
          <p className="mb-3 text-sm text-muted">
            {sources.data.ai.reason ? `${sources.data.ai.reason}。` : ''}
            AI 今日 {sources.data.ai.used} 次
            {sources.data.ai.cap != null ? ` / 上限 ${sources.data.ai.cap}` : ''}
            {sources.data.ai.modelNote ? `。${sources.data.ai.modelNote}` : ''}
          </p>
        )}
        {sources.isPending && <p className="text-sm text-muted">正在读取来源状态…</p>}
        {sources.isError && (
          <p role="alert" className="text-sm text-accent-text">
            来源状态加载失败。确认后端已启动后再试。
          </p>
        )}
        {sources.data && (
          <ul className="space-y-2">
            {sources.data.sources.map((source) => (
              <li key={source.id} className="flex flex-col gap-2 border border-line px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="min-w-0">
                  <span className="font-medium">{source.name}</span>
                  <span className="ml-2 font-mono text-xs text-muted">{source.type}</span>
                  {(source.pauseReason || source.lastError) && (
                    <span className="mt-1 block text-xs text-muted">{source.pauseReason ?? source.lastError}</span>
                  )}
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  <Badge tone={sourceTone[source.status]}>{source.statusText}</Badge>
                  <span className="font-mono text-xs text-muted">{usageLabel(source)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </HudCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <HudCard code="KEYS" title="密钥配置">
          <p className="mb-3 text-sm text-muted">只显示是否已在 server/.env 中设置，不会显示具体值。</p>
          {integrations && (
            <p className="mb-3 text-sm text-muted">
              {integrations.serverchan
                ? 'Server酱已设置。关键词命中会推送到微信。'
                : '未配置 SERVERCHAN_SENDKEY，命中只记在站内，不推送到微信。'}
            </p>
          )}
          <ul className="grid grid-cols-2 gap-2 text-sm">
            {(Object.keys(integrationLabels) as IntegrationName[]).map((k) => (
              <li key={k} className="flex items-center justify-between gap-2 border border-line px-3 py-2">
                <span>{integrationLabels[k]}</span>
                {integrations === null ? (
                  <Badge tone="info">未知</Badge>
                ) : integrations[k] ? (
                  <Badge tone="ok">已设置</Badge>
                ) : (
                  <Badge tone="info">未设置</Badge>
                )}
              </li>
            ))}
          </ul>
        </HudCard>

        <HudCard code="TOKENS" title="配色">
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {swatches.map((s) => (
              <li key={s.name} className="flex items-center gap-2">
                <span aria-hidden="true" className="size-8 shrink-0 border border-line-strong" style={{ background: s.hex }} />
                <span className="min-w-0 text-xs leading-tight">
                  <span className="block font-mono text-bone">{s.hex}</span>
                  <span className="block text-muted">{s.use}</span>
                </span>
              </li>
            ))}
          </ul>
        </HudCard>

        <HudCard code="COMPONENTS" title="组件">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button>主要按钮</Button>
              <Button variant="ghost">次要按钮</Button>
              <Button disabled>禁用</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="ok">可信</Badge>
              <Badge tone="warn">存疑</Badge>
              <Badge tone="danger">疑似虚假</Badge>
              <Badge tone="info">仅规则判断</Badge>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Meter label="热度" value={78} />
              <Meter label="可信度" value={64} tone="ok" />
            </div>
          </div>
        </HudCard>

        <HudCard code="TYPE" title="字体">
          <p className="font-display text-3xl font-bold tracking-wide uppercase">Hot Monitor 标题</p>
          <p className="mt-2 text-sm">正文 Inter + 系统中文字体，确保中文显示清晰。</p>
          <p className="mt-2 font-mono text-sm text-muted">MONO 0123456789 · 16:35:00</p>
        </HudCard>
      </div>

      <HudCard code="AGENTS" title="原创角色 · 表情表" className="mt-4">
        <p className="mb-4 text-sm text-muted">三位原创 Q 版特工，用于空状态、加载、成功和错误提示。不使用任何官方游戏角色或素材。</p>
        <div className="space-y-6">
          {(Object.keys(agents) as AgentId[]).map((id) => (
            <section key={id} aria-labelledby={`agent-${id}`}>
              <h3 id={`agent-${id}`} className="mb-2 font-display text-base font-semibold tracking-wider uppercase">
                <span style={{ color: agents[id].accent }}>{agents[id].codename}</span> {agents[id].name}
                <span className="ml-2 text-xs font-normal tracking-normal text-muted normal-case">
                  {agents[id].role} · {agents[id].feature}
                </span>
              </h3>
              <ul className="grid grid-cols-4 gap-2 sm:gap-4">
                {expressions.map((e) => (
                  <li key={e} className="border border-line bg-ink p-2 text-center">
                    <Agent id={id} expression={e} />
                    <span className="mt-1 block text-xs text-muted">{expressionLabels[e]}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </HudCard>
    </>
  );
}
