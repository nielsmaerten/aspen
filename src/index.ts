#!/usr/bin/env node
import { CronJob } from 'cron';
import { loadEnvironment } from './bootstrap/env.js';
import { run } from './app.js';
import { flushLogger, getLogFilePath, getLogger, initializeLogging } from './logging/index.js';

loadEnvironment();
initializeLogging();
const logger = getLogger();
const logFilePath = getLogFilePath();

let isRunning = false;

async function runOnce(): Promise<void> {
  if (isRunning) return;
  isRunning = true;
  try {
    await run();
  } finally {
    isRunning = false;
  }
}

async function main(): Promise<void> {
  const interval = getInterval();
  const schedule = `*/${interval} * * * *`;
  // If no interval is set, run once and exit.
  if (!interval) {
    logger.info('No interval set, running once');
    await runOnce();
    return;
  }
  // Otherwise, set up a cron job to run periodically.
  CronJob.from({
    cronTime: schedule,
    onTick: async () => {
      await runOnce().catch((error) => {
        logger.error({ err: error as Error }, 'Aspen scheduled run failed');
      });
    },
    runOnInit: true, // Run immediately on start
    start: true, // Start the job right away
    waitForCompletion: true, // Prevent overlapping runs
  });
  logger.info(`Aspen started, checking every ${interval} minute(s)`);
  if (logFilePath) {
    logger.info({ logFilePath }, 'Writing logs to file');
  }
}

function getInterval(): number | undefined {
  const watchRaw = process.env.ASPEN_WATCH?.trim();
  const watchMinutes = watchRaw ? Number(watchRaw) : Number.NaN;
  return Number.isInteger(watchMinutes) && watchMinutes > 0 ? watchMinutes : undefined;
}

main()
  .catch((error) => {
    logger.error({ err: error }, 'Aspen failed to start');
    process.exitCode = 1;
  })
  .finally(() => {
    flushLogger();
  });

// Behave well in containers
process.on('SIGINT', () => {
  flushLogger();
  process.exit(0);
});
process.on('SIGTERM', () => {
  flushLogger();
  process.exit(0);
});
