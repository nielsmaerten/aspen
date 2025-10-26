import type { ChatCompletionMessageParam } from 'token.js';

import type { DocumentJob } from '../domain/document.js';
import type { MetadataExtractionOptions } from '../domain/metadata.js';
import type { MetadataExtractionContext } from './context.js';
import { renderTemplate } from './templates.js';
import { truncate } from '../utils/text.js';

const MAX_BASE64_ATTACH_BYTES = 10 * 1024 * 1024; // MiB
const PDF_MIME_TYPE = 'application/pdf';

export function buildUserMessage(
  template: string,
  variables: Record<string, string>,
  job: DocumentJob,
  context: MetadataExtractionContext,
  options?: MetadataExtractionOptions,
): ChatCompletionMessageParam {
  const rendered = renderTemplate(template, variables);
  const wantsAttachment = Boolean(options?.includeOriginalFile) && context.config.ai.uploadOriginal;
  const originalFile = job.originalFile;

  if (!wantsAttachment || !originalFile) {
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
  if (context.config.ai.provider === 'openrouter') {
    const content = [
      {
        type: 'text' as const,
        text: rendered,
      },
      {
        type: 'file' as const,
        file: {
          filename: buildFilename(job),
          file_data: buildPdfDataUrl(base64),
        },
      },
    ];

    context.logger.debug('Attached PDF document to prompt via OpenRouter file part');

    return {
      role: 'user',
      content,
    };
  }

  context.logger.warn(
    {
      documentId: job.document.id,
    },
    'Currently, file attachments are only supported for OpenRouter provider; falling back to text only',
  );

  return {
    role: 'user',
    content: rendered,
  };
}

function buildPdfDataUrl(base64: string): string {
  return `data:${PDF_MIME_TYPE};base64,${base64}`;
}

function buildFilename(job: DocumentJob): string {
  return `document-${job.document.id}.pdf`;
}
