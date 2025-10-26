import type { ChatCompletionMessageParam } from 'token.js';

import type { MetadataStrategy } from '../../domain/metadata.js';
import type { DocumentJob } from '../../domain/document.js';
import type { MetadataExtractionContext } from '../context.js';
import { BasicTitleResponseSchema, TitleResponseSchema } from '../schemas.js';
import { buildUserMessage } from '../message-builder.js';
import { executeAiCall } from './shared.js';

export class TitleStrategy implements MetadataStrategy<'title', string, MetadataExtractionContext> {
  readonly field = 'title' as const;

  async extract(job: DocumentJob, context: MetadataExtractionContext) {
    const prompt = await context.prompts.get('title');

    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content:
          'You are an assistant that extracts document titles. Always reply in JSON. If unsure, set status to "unknown".',
      },
      buildUserMessage(
        prompt,
        {
          DOCUMENT_TEXT: job.textContent,
          CURRENT_TITLE: job.document.title ?? '',
        },
        job,
        context,
      ),
    ];

    const response = await executeAiCall({
      field: this.field,
      schema: TitleResponseSchema,
      wireSchema: BasicTitleResponseSchema,
      context,
      messages,
      responseName: 'title_response',
    });

    if (!response.success) {
      return {
        field: this.field,
        type: 'invalid' as const,
        message: response.error,
      };
    }

    const message = response.data.reason ?? undefined;

    if (response.data.status === 'unknown') {
      return {
        field: this.field,
        type: 'unknown' as const,
        message,
      };
    }

    const value = response.data.value;
    if (value === null) {
      return {
        field: this.field,
        type: 'invalid' as const,
        message: 'Model returned null title for ok status',
      };
    }

    return {
      field: this.field,
      type: 'ok' as const,
      value: value.trim(),
      message,
    };
  }
}
