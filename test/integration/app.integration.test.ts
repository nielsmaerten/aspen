import { describe, expect, it } from 'vitest';

import { loadConfig, clearCachedConfig } from '../../src/config/index.js';
import { PaperlessService } from '../../src/clients/paperless.js';
import { run } from '../../src/app.js';

const shouldRun = process.env.ASPEN_DEV_RUN_INTEGRATION === 'true';

describe('integration tests', () => {
  it.skipIf(!shouldRun)('connects to Paperless and lists correspondents', async () => {
    clearCachedConfig();
    const config = loadConfig();
    const paperless = PaperlessService.fromConfig(config.paperless);

    const correspondents = await paperless.listCorrespondents();

    expect(Array.isArray(correspondents)).toBe(true);
  });

  it.skipIf(!shouldRun)('runs a single processing loop', async () => {
    clearCachedConfig();
    const runOnce = true;
    await run(runOnce);
  });
});
