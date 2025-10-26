import type { DocumentJob } from '../domain/document.js';
import type { MetadataField, MetadataResult } from '../domain/metadata.js';
import type { MetadataExtractionContext } from './context.js';
import type { AspenStrategy } from './strategies/index.js';

export type ExtractedMetadata = Partial<
  Record<MetadataField, MetadataResult<MetadataField, unknown>>
>;

export async function extractMetadata(
  job: DocumentJob,
  context: MetadataExtractionContext,
  strategies: AspenStrategy[],
  enabledFields: MetadataField[],
): Promise<ExtractedMetadata> {
  const results: ExtractedMetadata = {};

  for (const strategy of strategies) {
    if (!enabledFields.includes(strategy.field)) {
      continue;
    }

    const initialResult = await strategy.extract(job, context, { includeOriginalFile: false });
    if (initialResult.type === 'ok' || !shouldAttemptPdfFallback(job, context)) {
      results[strategy.field] = initialResult as MetadataResult<MetadataField, unknown>;
      continue;
    }

    context.logger.warn(
      { field: strategy.field, documentId: job.document.id },
      'Retrying metadata extraction with PDF attachment',
    );

    const fallbackResult = await strategy.extract(job, context, { includeOriginalFile: true });
    results[strategy.field] = fallbackResult as MetadataResult<MetadataField, unknown>;
  }

  return results;
}

export function requiresReview(results: ExtractedMetadata): boolean {
  return Object.values(results).some((result) => result && result.type !== 'ok');
}

function shouldAttemptPdfFallback(job: DocumentJob, context: MetadataExtractionContext): boolean {
  if (!context.config.ai.uploadOriginal) {
    return false;
  }

  if (context.config.ai.provider !== 'openrouter') {
    return false;
  }

  if (!job.originalFile) {
    return false;
  }

  return true;
}
