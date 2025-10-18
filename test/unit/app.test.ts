import { beforeEach, describe, expect, it, vi } from 'vitest';

type MockFn = ReturnType<typeof vi.fn>;

function createPaperlessService() {
  return {
    fetchTagByName: vi.fn(),
    createTag: vi.fn(),
    fetchNextQueuedDocument: vi.fn(),
    retrieveDocument: vi.fn(),
    updateDocument: vi.fn(),
    listCorrespondents: vi.fn(),
    listDocumentTypes: vi.fn(),
    addNote: vi.fn(),
    downloadOriginal: vi.fn(),
    fetchDocumentText: vi.fn(),
  };
}

let loadConfigMock: MockFn;
let extractMetadataMock: MockFn;
let requiresReviewMock: MockFn;
let createMetadataStrategiesMock: MockFn;
let paperlessInstance: ReturnType<typeof createPaperlessService> | undefined;

function getPaperlessInstance() {
  if (!paperlessInstance) {
    paperlessInstance = createPaperlessService();
  }
  return paperlessInstance;
}

function loadConfigProxy(...args: unknown[]) {
  if (!loadConfigMock) {
    throw new Error('loadConfigMock not initialized');
  }
  return loadConfigMock(...args);
}

function extractMetadataProxy(...args: unknown[]) {
  if (!extractMetadataMock) {
    throw new Error('extractMetadataMock not initialized');
  }
  return extractMetadataMock(...args);
}

function requiresReviewProxy(...args: unknown[]) {
  if (!requiresReviewMock) {
    throw new Error('requiresReviewMock not initialized');
  }
  return requiresReviewMock(...args);
}

function createMetadataStrategiesProxy(...args: unknown[]) {
  if (!createMetadataStrategiesMock) {
    throw new Error('createMetadataStrategiesMock not initialized');
  }
  return createMetadataStrategiesMock(...args);
}

vi.mock('../../src/config/index.js', () => ({
  loadConfig: loadConfigProxy,
}));

vi.mock('../../src/clients/paperless.js', () => ({
  PaperlessService: {
    fromConfig: () => getPaperlessInstance(),
  },
}));

vi.mock('../../src/clients/ai.js', () => ({
  AiService: class {},
}));

vi.mock('../../src/prompts/index.js', () => ({
  PromptRepository: class {},
}));

vi.mock('../../src/metadata/strategies/index.js', () => ({
  createMetadataStrategies: createMetadataStrategiesProxy,
}));

vi.mock('../../src/metadata/extractor.js', () => ({
  extractMetadata: extractMetadataProxy,
  requiresReview: requiresReviewProxy,
}));

vi.mock('../../src/metadata/review.js', () => ({
  buildReviewNote: vi.fn(),
}));

import { run } from '../../src/app.js';

describe('run', () => {
  beforeEach(() => {
    paperlessInstance = createPaperlessService();
    const service = getPaperlessInstance();

    loadConfigMock = vi.fn();
    extractMetadataMock = vi.fn();
    requiresReviewMock = vi.fn();
    createMetadataStrategiesMock = vi.fn();

    requiresReviewMock.mockReturnValue(false);
    createMetadataStrategiesMock.mockReturnValue([]);

    const tags = new Map<string, { id: number }>([
      ['queue-tag', { id: 1 }],
      ['processed-tag', { id: 2 }],
      ['review-tag', { id: 3 }],
      ['error-tag', { id: 4 }],
    ]);

    service.fetchTagByName.mockImplementation(async (name: string) => {
      return tags.get(name) ?? null;
    });

    service.createTag.mockImplementation(async (name: string) => {
      const nextId = tags.size + 1;
      const tag = { id: nextId };
      tags.set(name, tag);
      return tag;
    });

    service.listCorrespondents.mockResolvedValue([]);
    service.listDocumentTypes.mockResolvedValue([]);
    service.addNote.mockResolvedValue(undefined);
    service.downloadOriginal.mockResolvedValue(Buffer.from(''));
    service.fetchDocumentText.mockResolvedValue('');
    service.fetchNextQueuedDocument.mockResolvedValue(null);
    service.retrieveDocument.mockResolvedValue(null as any);
    service.updateDocument.mockResolvedValue(null as any);
  });

  it('marks documents with the error tag when metadata extraction throws', async () => {
    const config = {
      paperless: {
        baseUrl: 'https://paperless.test',
        token: 'token',
        tags: {
          queue: 'queue-tag',
          processed: 'processed-tag',
          review: 'review-tag',
          error: 'error-tag',
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
          supportsImages: false,
        },
      },
      dev: {
        runIntegration: false,
      },
    };

    loadConfigMock.mockReturnValue(config);
    createMetadataStrategiesMock.mockReturnValue([]);
    extractMetadataMock.mockRejectedValue(new Error('boom'));

    const queueTagId = 1;
    const errorTagId = 4;

    const document = {
      id: 42,
      tags: [queueTagId],
      title: 'Test Document',
      content: 'text content',
    };

    const queued = [{ id: document.id }];
    const service = getPaperlessInstance();

    service.fetchNextQueuedDocument.mockImplementation(async () => {
      return queued.shift() ?? null;
    });
    service.retrieveDocument.mockResolvedValue(document);
    service.updateDocument.mockResolvedValue(document);

    const logger = {
      info: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      fatal: vi.fn(),
      trace: vi.fn(),
      child: vi.fn(),
      level: 'info',
    };

    await run(logger as any);

    expect(service.updateDocument).toHaveBeenCalledTimes(2);
    const [firstCallDocId, firstCallPayload] = service.updateDocument.mock.calls[0];
    expect(firstCallDocId).toBe(document.id);
    expect(firstCallPayload?.tags).toContain(queueTagId);
    expect(firstCallPayload?.tags).toContain(errorTagId);
    expect(firstCallPayload?.tags?.length).toBe(2);

    const [secondCallDocId, secondCallPayload] = service.updateDocument.mock.calls[1];
    expect(secondCallDocId).toBe(document.id);
    expect(secondCallPayload).toEqual({
      remove_inbox_tags: false,
      tags: [errorTagId],
    });
  });
});
