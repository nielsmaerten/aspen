#!/usr/bin/env node
import { CronJob } from 'cron';
import { loadEnvironment } from './bootstrap/env.js';
import { run } from './app.js';

loadEnvironment();

let isRunning = false;
let watchJob: CronJob | undefined;

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
  if (interval !== undefined) {
    const schedule = `*/${interval} * * * *`;
    watchJob = new CronJob(schedule, () => {
      void runOnce().catch((error) => {
        console.error('Aspen scheduled run failed', error);
      });
    });
    watchJob.start();
  }

  await runOnce();
}

function getInterval(): number | undefined {
  const watchRaw = process.env.ASPEN_WATCH?.trim();
  const watchMinutes = watchRaw ? Number(watchRaw) : Number.NaN;
  return Number.isInteger(watchMinutes) && watchMinutes > 0 ? watchMinutes : undefined;
}

main().catch((error) => {
  console.error('Aspen failed to start', error);
  process.exitCode = 1;
});
