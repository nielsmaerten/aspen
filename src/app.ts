import type { Logger } from 'pino';

import { loadConfig } from './config/index.js';
import { PaperlessService, type DocumentUpdatePayload } from './clients/paperless.js';
import { AiService } from './clients/ai.js';
import { PromptRepository } from './prompts/index.js';
import { createMetadataStrategies } from './metadata/strategies/index.js';
import { extractMetadata, requiresReview } from './metadata/extractor.js';
import type { ExtractedMetadata } from './metadata/extractor.js';
import type { AspenStrategy } from './metadata/strategies/index.js';
import type { DocumentJob, PaperlessDocument } from './domain/document.js';
import { buildAllowlist, findAllowlistMatch } from './domain/allowlists.js';
import type { DocumentAllowlists, EntityAllowlistItem } from './domain/allowlists.js';
import type { EntitySelection } from './domain/metadata.js';
import type { AspenConfig } from './config/types.js';
import { getLogger } from './logging/index.js';
import { normalizeName } from './utils/text.js';

export async function run(passedLogger: Logger = getLogger()): Promise<void> {
  const config = loadConfig();
  const logger = passedLogger;

  const paperless = PaperlessService.fromConfig(config.paperless);
  const ai = new AiService(config.ai);
  const prompts = new PromptRepository();
  const strategies = createMetadataStrategies();

  const tagSet = await ensureTags(paperless, config, logger);

  while (true) {
    try {
      const processed = await processNextDocument({
        paperless,
        ai,
        prompts,
        strategies,
        config,
        logger,
        tagSet,
      });
      // If no document was processed, the queue is empty - exit the loop.
      if (!processed) break;
    } catch (error) {
      logger.error({ err: error }, 'Fatal error while processing document');
      throw error;
    }
  }
}

interface ProcessingContext {
  paperless: PaperlessService;
  ai: AiService;
  prompts: PromptRepository;
  strategies: AspenStrategy[];
  config: AspenConfig;
  logger: Logger;
  tagSet: TagSet;
}

interface TagSet {
  queue: number;
  processed: number;
  review: number;
}

async function processNextDocument(context: ProcessingContext): Promise<boolean> {
  const { paperless, logger, tagSet, config, ai, prompts, strategies } = context;

  const queued = await paperless.fetchNextQueuedDocument(tagSet.queue);
  if (!queued) {
    logger.debug('No queued documents found');
    return false;
  }

  const document = await paperless.retrieveDocument(queued.id);
  logger.info(
    {
      documentId: document.id,
      title: document.title,
    },
    'Processing document',
  );

  const allowlists = await loadAllowlists(paperless, logger);
  const job = await buildJob(document, paperless, config, logger);

  const extractionContext = {
    ai,
    prompts,
    config,
    allowlists,
    logger,
  };

  const results = await extractMetadata(
    job,
    extractionContext,
    strategies,
    config.metadata.enabledFields,
  );
  await materializeNewEntities(results, paperless, allowlists, logger);

  const review = requiresReview(results);

  const updatePayload = buildUpdatePayload(results);
  const tagsAfterStatus = planTagUpdate(document.tags, tagSet, review);

  await paperless.updateDocument(document.id, {
    ...updatePayload,
    tags: Array.from(tagsAfterStatus.withQueue),
  });

  if (tagsAfterStatus.queueRemoved.length !== tagsAfterStatus.withQueue.length) {
    await paperless.updateDocument(document.id, {
      remove_inbox_tags: false,
      tags: Array.from(tagsAfterStatus.queueRemoved),
    });
  }

  logger.info(
    {
      documentId: document.id,
      status: review ? 'review' : 'processed',
      results: summarizeResults(results),
    },
    'Document processed',
  );

  return true;
}

async function ensureTags(
  paperless: PaperlessService,
  config: AspenConfig,
  logger: Logger,
): Promise<TagSet> {
  const queue = await ensureTag(paperless, config.paperless.tags.queue, logger);
  const processed = await ensureTag(paperless, config.paperless.tags.processed, logger);
  const review = await ensureTag(paperless, config.paperless.tags.review, logger);

  return {
    queue: queue.id,
    processed: processed.id,
    review: review.id,
  };
}

async function ensureTag(paperless: PaperlessService, name: string, logger: Logger) {
  const existing = await paperless.fetchTagByName(name);
  if (existing) {
    return existing;
  }

  logger.info({ tag: name }, 'Creating missing tag');
  return paperless.createTag(name);
}

async function loadAllowlists(
  paperless: PaperlessService,
  logger: Logger,
): Promise<DocumentAllowlists> {
  const [correspondents, documentTypes] = await Promise.all([
    paperless.listCorrespondents(),
    paperless.listDocumentTypes(),
  ]);

  logger.debug(
    { correspondents: correspondents.length, documentTypes: documentTypes.length },
    'Fetched allowlists',
  );

  return {
    correspondents: buildAllowlist(correspondents),
    documentTypes: buildAllowlist(documentTypes),
  };
}

async function buildJob(
  document: PaperlessDocument,
  paperless: PaperlessService,
  config: AspenConfig,
  logger: Logger,
): Promise<DocumentJob> {
  let textContent = document.content ?? '';
  if (!textContent) {
    try {
      textContent = await paperless.fetchDocumentText(document.id);
    } catch (error) {
      logger.warn({ documentId: document.id, err: error }, 'Failed to fetch document text');
    }
  }

  let originalFile: Buffer | undefined;
  if (config.ai.uploadOriginal) {
    try {
      originalFile = await paperless.downloadOriginal(document.id);
    } catch (error) {
      logger.warn({ documentId: document.id, err: error }, 'Failed to download original document');
    }
  }

  return {
    document,
    textContent,
    originalFile,
  };
}

async function materializeNewEntities(
  results: ExtractedMetadata,
  paperless: PaperlessService,
  allowlists: DocumentAllowlists,
  logger: Logger,
): Promise<void> {
  await handleEntity('correspondent', results, allowlists.correspondents, async (name) => {
    const created = await paperless.createCorrespondent(name);
    allowlists.correspondents.push({
      id: created.id,
      name: created.name,
      normalizedName: normalizeName(created.name),
    });
    logger.info({ name: created.name, id: created.id }, 'Created new correspondent');
    return created;
  });

  await handleEntity('doctype', results, allowlists.documentTypes, async (name) => {
    const created = await paperless.createDocumentType(name);
    allowlists.documentTypes.push({
      id: created.id,
      name: created.name,
      normalizedName: normalizeName(created.name),
    });
    logger.info({ name: created.name, id: created.id }, 'Created new document type');
    return created;
  });
}

async function handleEntity(
  field: 'correspondent' | 'doctype',
  results: ExtractedMetadata,
  allowlist: EntityAllowlistItem[],
  creator: (name: string) => Promise<{ id: number; name: string }>,
): Promise<void> {
  const result = results[field];
  if (!result || result.type !== 'ok') {
    return;
  }

  const value = result.value as EntitySelection;
  if (value.type !== 'new') {
    return;
  }

  const existing = findAllowlistMatch(allowlist, value.name);
  if (existing) {
    result.value = {
      type: 'existing',
      id: existing.id,
      name: existing.name,
    };
    return;
  }

  const created = await creator(value.name);
  result.value = {
    type: 'existing',
    id: created.id,
    name: created.name,
  };
}

function buildUpdatePayload(results: ExtractedMetadata): DocumentUpdatePayload {
  const payload: DocumentUpdatePayload = {
    remove_inbox_tags: false,
  };

  const titleResult = results.title;
  if (titleResult?.type === 'ok') {
    payload.title = titleResult.value as string;
  }

  const dateResult = results.date;
  if (dateResult?.type === 'ok') {
    payload.created = dateResult.value as string;
  }

  const correspondentResult = results.correspondent;
  if (correspondentResult?.type === 'ok') {
    const selection = correspondentResult.value as EntitySelection;
    if (selection.type === 'existing') {
      payload.correspondent = selection.id;
    }
  }

  const doctypeResult = results.doctype;
  if (doctypeResult?.type === 'ok') {
    const selection = doctypeResult.value as EntitySelection;
    if (selection.type === 'existing') {
      payload.document_type = selection.id;
    }
  }

  return payload;
}

function planTagUpdate(
  currentTags: number[],
  tagSet: TagSet,
  review: boolean,
): {
  withQueue: number[];
  queueRemoved: number[];
} {
  const desiredTag = review ? tagSet.review : tagSet.processed;
  const tagsWithNew = new Set(currentTags);
  tagsWithNew.add(desiredTag);
  const tagToRemove = review ? tagSet.processed : tagSet.review;
  tagsWithNew.delete(tagToRemove);

  const tagsWithoutQueue = new Set(tagsWithNew);
  tagsWithoutQueue.delete(tagSet.queue);

  return {
    withQueue: Array.from(tagsWithNew),
    queueRemoved: Array.from(tagsWithoutQueue),
  };
}

function summarizeResults(results: ExtractedMetadata) {
  const summary: Record<string, unknown> = {};
  for (const [field, result] of Object.entries(results)) {
    if (!result) {
      continue;
    }

    if (result.type === 'ok') {
      summary[field] = result.value;
    } else {
      summary[field] = { status: result.type, reason: result.message };
    }
  }
  return summary;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
