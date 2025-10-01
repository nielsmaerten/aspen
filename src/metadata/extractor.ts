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

    const result = await strategy.extract(job, context);
    results[strategy.field] = result as MetadataResult<MetadataField, unknown>;
  }

  return results;
}

export function requiresReview(results: ExtractedMetadata): boolean {
  return Object.values(results).some((result) => result && result.type !== 'ok');
}
