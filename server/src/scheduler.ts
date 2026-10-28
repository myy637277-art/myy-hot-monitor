import { Cron } from 'croner';
import { eq, sql } from 'drizzle-orm';
import type { Db } from './db/index.ts';
import { jobRuns } from './db/schema.ts';

export const HEARTBEAT_JOB = 'heartbeat';

export function recordRun(db: Db, name: string, at = new Date()): void {
  db.insert(jobRuns)
    .values({ name, lastRunAt: at, runCount: 1 })
    .onConflictDoUpdate({
      target: jobRuns.name,
      set: { lastRunAt: at, runCount: sql`${jobRuns.runCount} + 1`, lastError: null },
    })
    .run();
}

export function getRun(db: Db, name: string) {
  return db.select().from(jobRuns).where(eq(jobRuns.name, name)).get() ?? null;
}

export function startScheduler(db: Db, heartbeatSec: number): { stop: () => void } {
  const heartbeat = new Cron(
    `*/${heartbeatSec} * * * * *`,
    { name: HEARTBEAT_JOB, protect: true, catch: (err) => console.error('[scheduler] heartbeat failed', err) },
    () => recordRun(db, HEARTBEAT_JOB),
  );
  recordRun(db, HEARTBEAT_JOB);
  return { stop: () => heartbeat.stop() };
}
