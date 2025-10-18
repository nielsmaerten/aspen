import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import { loadConfig, clearCachedConfig } from '../../src/config/index.js';

const BASE_ENV = { ...process.env };

const REQUIRED_ENV = {
  PAPERLESS_BASE_URL: 'https://paperless.test',
  PAPERLESS_API_TOKEN: 'token',
  ASPEN_AI_MODEL: 'gpt-4o-mini',
};

function resetEnv(overrides: Record<string, string | undefined> = {}): void {
  clearCachedConfig();
  Object.keys(process.env).forEach((key) => {
    delete process.env[key];
  });
  Object.assign(process.env, BASE_ENV, REQUIRED_ENV, overrides);
}

describe('loadConfig', () => {
  beforeEach(() => {
    resetEnv();
  });

  afterEach(() => {
    clearCachedConfig();
    Object.assign(process.env, BASE_ENV);
  });

  it('parses defaults and converts booleans', () => {
    resetEnv({
      ASPEN_UPLOAD_ORIGINAL: 'true',
      ASPEN_SET_TITLE: '1',
      ASPEN_SET_CORRESPONDENT: 'yes',
      ASPEN_SET_DATE: 'on',
      ASPEN_SET_DOCTYPE: 'true',
      ASPEN_ALLOW_NEW_DOCTYPES: 'false',
      ASPEN_AI_PROVIDER: 'openai',
    });

    const config = loadConfig();

    expect(config.paperless.tags.queue).toBe('000-ai-queue');
    expect(config.paperless.tags.error).toBe('000-ai-error');
    expect(config.metadata.targets.title).toBe(true);
    expect(config.ai.provider).toBe('openai');
    expect(config.metadata.enabledFields).toContain('title');
  });

  it('throws when tag names collide', () => {
    resetEnv({ ASPEN_TAG_PROCESSED: '000-ai-queue' });

    expect(() => loadConfig()).toThrowError(/must be unique/i);
  });

  it('throws when all metadata targets are disabled', () => {
    resetEnv({
      ASPEN_SET_TITLE: 'false',
      ASPEN_SET_CORRESPONDENT: 'false',
      ASPEN_SET_DATE: 'false',
      ASPEN_SET_DOCTYPE: 'false',
    });

    expect(() => loadConfig()).toThrowError(/Enable at least one metadata extractor/i);
  });
});
