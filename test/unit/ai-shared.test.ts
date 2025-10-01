import { describe, expect, it, beforeEach, vi } from 'vitest';
import { z } from 'zod';

import { executeAiCall } from '../../src/metadata/strategies/shared.js';
import type { MetadataExtractionContext } from '../../src/metadata/context.js';
import type { AspenConfig } from '../../src/config/types.js';
import type { DocumentAllowlists } from '../../src/domain/allowlists.js';

const baseConfig: AspenConfig = {
  paperless: {
    baseUrl: 'https://paperless.test',
    token: 'token',
    tags: {
      queue: '$ai-queue',
      processed: '$ai-processed',
      review: '$ai-review',
    },
  },
  metadata: {
    targets: {
      title: true,
      correspondent: true,
      date: true,
      doctype: true,
    },
    enabledFields: ['title', 'correspondent', 'date', 'doctype'],
    allowNewDocumentTypes: false,
    allowNewCorrespondents: false,
  },
  ai: {
    provider: 'openai',
    model: 'gpt-4o-mini',
    uploadOriginal: false,
    features: {
      supportsJson: true,
      supportsImages: true,
    },
  },
  dev: {
    runIntegration: false,
  },
};

const emptyAllowlists: DocumentAllowlists = {
  correspondents: [],
  documentTypes: [],
};

describe('executeAiCall', () => {
  let context: MetadataExtractionContext;
  const schema = z.object({
    status: z.literal('ok'),
    value: z.string(),
  });

  beforeEach(() => {
    const ai = {
      complete: vi.fn(),
    };

    const logger = {
      warn: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
      trace: vi.fn(),
      child: vi.fn(),
      level: 'info',
    } as unknown as MetadataExtractionContext['logger'];

    context = {
      ai: ai as unknown as MetadataExtractionContext['ai'],
      prompts: {} as MetadataExtractionContext['prompts'],
      config: JSON.parse(JSON.stringify(baseConfig)) as AspenConfig,
      allowlists: JSON.parse(JSON.stringify(emptyAllowlists)) as DocumentAllowlists,
      logger,
    };
  });

  it('parses json responses when provider supports structured output', async () => {
    const ai = context.ai;
    (ai.complete as any).mockResolvedValue({
      text: '{"status":"ok","value":"Example"}',
      finishReason: 'stop',
      response: {} as any,
    });

    const result = await executeAiCall({
      field: 'title',
      schema,
      context,
      messages: [],
      responseName: 'title_response',
    });

    expect(ai.complete).toHaveBeenCalledWith(
      expect.objectContaining({
        responseFormat: expect.objectContaining({ type: 'json_schema' }),
      }),
    );
    expect(result).toEqual({ success: true, data: { status: 'ok', value: 'Example' } });
  });

  it('returns failure when response is not valid JSON', async () => {
    const ai = context.ai;
    (ai.complete as any).mockResolvedValue({
      text: 'not-json',
      finishReason: 'stop',
      response: {} as any,
    });

    const result = await executeAiCall({
      field: 'title',
      schema,
      context,
      messages: [],
      responseName: 'title_response',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/JSON/);
    }
  });

  it('returns failure when validation fails', async () => {
    const ai = context.ai;
    (ai.complete as any).mockResolvedValue({
      text: '{"status":"ok"}',
      finishReason: 'stop',
      response: {} as any,
    });

    const result = await executeAiCall({
      field: 'title',
      schema,
      context,
      messages: [],
      responseName: 'title_response',
    });

    expect(result.success).toBe(false);
  });
});
