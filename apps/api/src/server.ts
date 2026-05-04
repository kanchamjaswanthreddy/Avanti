// Vidyut API — Server entry point

import { buildApp } from './app.js';
import { startReportWorker } from './workers/report.worker.js';
import { startNotificationWorker } from './workers/notification.worker.js';
import pg from 'pg';

const PORT = parseInt(process.env['PORT'] ?? '4000', 10);
const HOST = process.env['HOST'] ?? '0.0.0.0';

async function main() {
  const app = await buildApp();

  // ── BullMQ Workers ─────────────────────────────────────────────────────────
  // Workers need a DB pool for report generation. Use the same connection
  // string as tenant DBs (workers operate on the school DB of the job's schoolId).
  if (process.env['REDIS_URL'] || process.env['REDIS_HOST']) {
    try {
      // Pool used by report worker (tenant-scoped queries run inside the worker)
      const workerDb = new pg.Pool({
        connectionString: process.env['DATABASE_URL'] ?? 'postgresql://vidyut:vidyut@localhost:5432/vidyut_dev',
        max: 5,
      });
      startReportWorker(workerDb);
      startNotificationWorker();
      app.log.info('BullMQ workers started (reports, notifications)');
    } catch (err) {
      app.log.warn({ err }, 'BullMQ workers not started — Redis unavailable');
    }
  } else {
    app.log.info('REDIS_URL/REDIS_HOST not set — BullMQ workers skipped');
  }

  // ── HTTP Server ────────────────────────────────────────────────────────────
  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`\n  Vidyut API running at http://localhost:${PORT}`);
    console.log(`  Health:  http://localhost:${PORT}/api/v1/health\n`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
