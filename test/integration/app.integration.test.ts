import { expect, it } from 'vitest';

import { loadConfig, clearCachedConfig } from '../../src/config/index.js';
import { PaperlessService } from '../../src/clients/paperless.js';

const shouldRun = process.env.ASPEN_DEV_RUN_INTEGRATION === 'true';

const testFn = shouldRun ? it : it.skip;

testFn('connects to Paperless and lists correspondents', async () => {
  clearCachedConfig();
  const config = loadConfig();
  const paperless = PaperlessService.fromConfig(config.paperless);

  const correspondents = await paperless.listCorrespondents();

  expect(Array.isArray(correspondents)).toBe(true);
});
