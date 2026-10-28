import { judgeHomepage } from './ai/judge.ts';
import { aiEnvFromProcess, readAiStatus, scoreStories } from './ai/score.ts';
import { createApp } from './app.ts';
import { capsFromNet, createCollector, netFromEnv } from './collect/run.ts';
import { loadEnvFile, readConfig } from './config.ts';
import { openDb } from './db/index.ts';
import { deliverDigest } from './notify/digest.ts';
import { startScheduler } from './scheduler.ts';

loadEnvFile();
const config = readConfig();
const { db, close } = openDb(config.dbFile);
const scheduler = startScheduler(db, config.heartbeatSec, {
  run: () =>
    deliverDigest(db, {
      now: new Date(),
      modelOpen: readAiStatus(db, aiEnvFromProcess(process.env)).enabled,
      serverchanKey: process.env.SERVERCHAN_SENDKEY,
      fetchImpl: globalThis.fetch,
      mode: 'scheduled',
    }).then(() => undefined),
});
const net = netFromEnv(process.env);
const collector = createCollector(db, net, capsFromNet(net));
const app = createApp(db, {
  heartbeatSec: config.heartbeatSec,
  collector,
  net,
  onDigestChange: () => scheduler.rescheduleDigest(),
});

const server = app.listen(config.port, config.host, () => {
  console.log(`[server] http://${config.host}:${config.port}  db=${config.dbFile}`);
  const env = aiEnvFromProcess(process.env);
  void scoreStories(db, env)
    .then(() => judgeHomepage(db, env))
    .catch((err) => {
      console.error('[ai] score failed', err instanceof Error ? err.message : 'failed');
    });
});

function shutdown() {
  scheduler.stop();
  server.close(() => {
    close();
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
