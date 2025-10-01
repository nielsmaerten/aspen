#!/usr/bin/env node
import { setTimeout as delay } from 'node:timers/promises';

import { loadEnvironment } from './bootstrap/env.js';
import { run } from './app.js';
import { ensurePromptDefaults } from './prompts/bootstrap.js';

loadEnvironment();

const intervalMinutes = parseIntervalMinutes(process.env.ASPEN_INTERVAL);

// Graceful shutdown state
let shutdownRequested = false;
let processingDocument = false;

async function main(): Promise<void> {
  const runOnce = async () => {
    await ensurePromptDefaults();
    processingDocument = true;
    try {
      await run(false, () => shutdownRequested);
    } finally {
      processingDocument = false;
    }
  };

  if (intervalMinutes === undefined) {
    await runOnce();
    return;
  }

  const intervalMs = intervalMinutes * 60_000;

  // Set up graceful shutdown handlers
  const handleShutdown = (signal: string) => {
    console.log(`\nReceived ${signal}, initiating graceful shutdown...`);
    shutdownRequested = true;

    // If processing a document, wait up to 20 seconds
    if (processingDocument) {
      console.log('Waiting for current document to finish (max 20s)...');
      setTimeout(() => {
        if (processingDocument) {
          console.error('Document processing timeout exceeded, forcing exit');
          process.exit(1);
        }
      }, 20_000);
    }
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));

  // Run continuously, pausing between iterations when no documents remain.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (shutdownRequested) {
      console.log('Shutdown complete');
      break;
    }

    try {
      await runOnce();
    } catch (error) {
      console.error('Aspen run failed', error);
    }

    if (shutdownRequested) {
      console.log('Shutdown complete');
      break;
    }

    // Use AbortSignal to interrupt delay on shutdown
    const abortController = new AbortController();
    const checkShutdown = setInterval(() => {
      if (shutdownRequested) {
        abortController.abort();
      }
    }, 100);

    try {
      await delay(intervalMs, undefined, { signal: abortController.signal });
    } catch (error) {
      // Expected when shutdown is requested during delay
      if (shutdownRequested) {
        clearInterval(checkShutdown);
        console.log('Shutdown complete');
        break;
      }
      throw error;
    } finally {
      clearInterval(checkShutdown);
    }
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
