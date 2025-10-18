import { describe, expect, it } from 'vitest';

import { buildReviewNote } from '../../src/metadata/review.js';
import type { ExtractedMetadata } from '../../src/metadata/extractor.js';

describe('buildReviewNote', () => {
  it('returns null when all fields are ok', () => {
    const results: ExtractedMetadata = {
      title: {
        field: 'title',
        type: 'ok',
        value: 'Document Title',
      },
    };

    expect(buildReviewNote(results)).toBeNull();
  });

  it('includes reasons for fields that need review', () => {
    const results: ExtractedMetadata = {
      title: {
        field: 'title',
        type: 'unknown',
        message: 'Confidence too low',
      },
      date: {
        field: 'date',
        type: 'ok',
        value: '2024-01-01',
      },
    };

    expect(buildReviewNote(results)).toEqual(
      'Aspen requested manual review for:\n- Title: Confidence too low',
    );
  });

  it('falls back to the status when no message is provided', () => {
    const results: ExtractedMetadata = {
      doctype: {
        field: 'doctype',
        type: 'invalid',
      },
    };

    const note = buildReviewNote(results);
    expect(note).toBe('Aspen requested manual review for:\n- Document type: Marked as invalid');
  });
});
