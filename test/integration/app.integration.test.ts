import { describe, expect, it } from 'vitest';

import { loadConfig, clearCachedConfig } from '../../src/config/index.js';
import { PaperlessService } from '../../src/clients/paperless.js';
import { run } from '../../src/app.js';

describe(
  'integration tests',
  {
    timeout: 5 * 60 * 1000,
    concurrent: false,
    skip: process.env.ASPEN_DEV_RUN_INTEGRATION !== 'true',
  },
  () => {
    it('connects to Paperless and lists correspondents', async () => {
      clearCachedConfig();
      const config = loadConfig();
      const paperless = PaperlessService.fromConfig(config.paperless);

      const correspondents = await paperless.listCorrespondents();

      expect(Array.isArray(correspondents)).toBe(true);
    });

    it('runs a single processing loop', async () => {
      clearCachedConfig();
      const runOnce = true;
      await run(runOnce);
    });
  },
);
