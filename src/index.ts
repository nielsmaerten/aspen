#!/usr/bin/env node
import { setTimeout as delay } from 'node:timers/promises';

import { loadEnvironment } from './bootstrap/env.js';
import { run } from './app.js';
import { ensurePromptDefaults } from './prompts/bootstrap.js';

loadEnvironment();

const intervalMinutes = parseIntervalMinutes(process.env.ASPEN_INTERVAL);

async function main(): Promise<void> {
  const runOnce = async () => {
    await ensurePromptDefaults();
    await run();
  };

  if (intervalMinutes === undefined) {
    await runOnce();
    return;
  }

  const intervalMs = intervalMinutes * 60_000;

  // Run continuously, pausing between iterations when no documents remain.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await runOnce();
    } catch (error) {
      console.error('Aspen run failed', error);
    }

    await delay(intervalMs);
  }
}

main().catch((error) => {
  console.error('Aspen failed to start', error);
  process.exitCode = 1;
});

function parseIntervalMinutes(raw: string | undefined): number | undefined {
  if (!raw) {
    return undefined;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }

  const value = Number(trimmed);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('ASPEN_INTERVAL must be a positive number of minutes');
  }

  return value;
}
