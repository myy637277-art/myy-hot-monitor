import type { CollectResponse, HealthResponse, SourcesResponse, StoriesResponse, WatchesResponse } from '@hot/shared';
import express from 'express';
import { z } from 'zod';
import { aiEnvForNet, aiEnvFromProcess, readAiStatus } from './ai/score.ts';
import { embeddingLayerStatus } from './collect/embed.ts';
import { capsFromNet, type Collector } from './collect/run.ts';
import { listHomepage, listSourceStatus } from './collect/store.ts';
import type { Net } from './collect/types.ts';
import { integrationStatus } from './config.ts';
import type { Db } from './db/index.ts';
import { createWatch, deleteWatch, listWatchState, setWatchPaused } from './notify/watch.ts';
import { getRun, HEARTBEAT_JOB } from './scheduler.ts';

const limitSchema = z.coerce.number().int().min(1).max(100);
const keywordSchema = z.object({ keyword: z.string().trim().min(1).max(40) });
const pauseSchema = z.object({ paused: z.boolean() });

function routeId(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function createApp(db: Db, opts: { heartbeatSec: number; collector?: Collector; net?: Net }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json());

  const embedding = () => embeddingLayerStatus();
  const caps = () => (opts.net ? capsFromNet(opts.net) : { search: 80, twitter: 150 });
  const ai = () => readAiStatus(db, opts.net ? aiEnvForNet(opts.net) : aiEnvFromProcess(process.env));

  app.get('/api/v1/health', (_req, res) => {
    const run = getRun(db, HEARTBEAT_JOB);
    const body: HealthResponse = {
      ok: true,
      serverTime: new Date().toISOString(),
      uptimeSec: Math.round(process.uptime()),
      heartbeat: {
        lastAt: run ? run.lastRunAt.toISOString() : null,
        count: run?.runCount ?? 0,
        intervalSec: opts.heartbeatSec,
      },
      integrations: integrationStatus(),
    };
    res.json(body);
  });

  app.get('/api/v1/stories', (req, res) => {
    const parsed = limitSchema.safeParse(req.query.limit ?? 30);
    if (!parsed.success) {
      res.status(400).json({ ok: false, error: 'bad_request' });
      return;
    }
    const env = opts.net ? aiEnvForNet(opts.net) : aiEnvFromProcess(process.env);
    const now = opts.net?.now() ?? new Date();
    const body: StoriesResponse = {
      ok: true,
      embedding: embedding(),
      ai: ai(),
      stories: listHomepage(db, parsed.data, now, readAiStatus(db, env).enabled),
    };
    res.json(body);
  });

  app.get('/api/v1/sources', (_req, res) => {
    const now = opts.net?.now() ?? new Date();
    const twitterConfigured = Boolean((opts.net?.twitterKey ?? process.env.TWITTERAPI_IO_API_KEY)?.trim());
    const payload = listSourceStatus(db, now, {
      twitterConfigured,
      caps: caps(),
      running: opts.collector?.running() ?? false,
      embedding: embedding(),
    });
    const body: SourcesResponse = {
      ok: true,
      ...payload,
      ai: ai(),
      progress: opts.collector?.progress() ?? { sourceName: null, items: 0 },
    };
    res.json(body);
  });

  app.get('/api/v1/watches', (_req, res) => {
    const body: WatchesResponse = { ok: true, ...listWatchState(db) };
    res.json(body);
  });

  app.post('/api/v1/watches', (req, res) => {
    const parsed = keywordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ ok: false, error: 'bad_request' });
      return;
    }
    const result = createWatch(db, parsed.data.keyword, new Date());
    if (!result.ok) {
      res.status(409).json(result);
      return;
    }
    res.status(201).json(result);
  });

  app.patch('/api/v1/watches/:id', (req, res) => {
    const parsed = pauseSchema.safeParse(req.body);
    const id = z.string().uuid().safeParse(routeId(req.params.id));
    if (!parsed.success || !id.success) {
      res.status(400).json({ ok: false, error: 'bad_request' });
      return;
    }
    if (!setWatchPaused(db, id.data, parsed.data.paused, new Date())) {
      res.status(404).json({ ok: false, error: 'not_found' });
      return;
    }
    res.json({ ok: true });
  });

  app.delete('/api/v1/watches/:id', (req, res) => {
    const id = z.string().uuid().safeParse(routeId(req.params.id));
    if (!id.success || !deleteWatch(db, id.data)) {
      res.status(404).json({ ok: false, error: 'not_found' });
      return;
    }
    res.json({ ok: true });
  });

  app.post('/api/v1/collect', (_req, res) => {
    if (!opts.collector) {
      res.status(503).json({ ok: false, error: 'collector_unavailable' });
      return;
    }
    const { started } = opts.collector.start();
    const body: CollectResponse = { ok: true, running: true, started };
    res.status(started ? 202 : 409).json(body);
  });

  app.use('/api', (_req, res) => {
    res.status(404).json({ ok: false, error: 'not_found' });
  });

  return app;
}
