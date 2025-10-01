import type { ChatCompletionMessageParam } from 'token.js';

import type { DocumentJob } from '../domain/document.js';
import type { MetadataExtractionContext } from './context.js';
import { renderTemplate } from './templates.js';
import { truncate } from '../utils/text.js';

const MAX_BASE64_ATTACH_BYTES = 2 * 1024 * 1024; // 2 MiB

export function buildUserMessage(
  template: string,
  variables: Record<string, string>,
  job: DocumentJob,
  context: MetadataExtractionContext,
): ChatCompletionMessageParam {
  const rendered = renderTemplate(template, variables);

  if (!context.config.ai.uploadOriginal || !job.originalFile) {
    return {
      role: 'user',
      content: rendered,
    };
  }

  const { originalFile } = job;
  if (!originalFile) {
    return {
      role: 'user',
      content: rendered,
    };
  }

  if (originalFile.byteLength > MAX_BASE64_ATTACH_BYTES) {
    context.logger.warn(
      {
        documentId: job.document.id,
        size: originalFile.byteLength,
        limit: MAX_BASE64_ATTACH_BYTES,
      },
      'Original file too large for inline upload; falling back to text only',
    );
    return {
      role: 'user',
      content: rendered,
    };
  }

  const base64 = originalFile.toString('base64');
  const appended = `${rendered}\n\nOriginal document (base64-encoded PDF):\n${base64}`;

  context.logger.debug(
    {
      documentId: job.document.id,
      preview: truncate(base64, 32),
    },
    'Attached base64-encoded document to prompt',
  );

  return {
    role: 'user',
    content: appended,
  };
}
