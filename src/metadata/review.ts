import type { MetadataField, MetadataResult } from '../domain/metadata.js';
import type { ExtractedMetadata } from './extractor.js';

const FIELD_LABELS: Record<MetadataField, string> = {
  title: 'Title',
  correspondent: 'Correspondent',
  date: 'Date',
  doctype: 'Document type',
};

function buildIssue(result: MetadataResult<MetadataField, unknown>): string {
  const label = FIELD_LABELS[result.field] ?? result.field;
  const message = result.message?.trim();
  const detail = message && message.length > 0 ? message : `Marked as ${result.type}`;
  return `${label}: ${detail}`;
}

export function buildReviewNote(results: ExtractedMetadata): string | null {
  const issues: string[] = [];

  for (const result of Object.values(results)) {
    if (!result || result.type === 'ok') {
      continue;
    }

    issues.push(buildIssue(result));
  }

  if (issues.length === 0) {
    return null;
  }

  const header = 'Aspen requested manual review for:';
  const bulletList = issues.map((issue) => `- ${issue}`).join('\n');

  return `${header}\n${bulletList}`;
}
