import type { ChatCompletionMessageParam } from 'token.js';

import type { MetadataStrategy } from '../../domain/metadata.js';
import type { DocumentJob } from '../../domain/document.js';
import type { MetadataExtractionContext } from '../context.js';
import { DateResponseSchema } from '../schemas.js';
import { buildUserMessage } from '../message-builder.js';
import { executeAiCall } from './shared.js';

export class DateStrategy implements MetadataStrategy<'date', string, MetadataExtractionContext> {
  readonly field = 'date' as const;

  async extract(job: DocumentJob, context: MetadataExtractionContext) {
    const prompt = await context.prompts.get('date');

    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content:
          'You extract the main document date in ISO format (YYYY-MM-DD). Respond in JSON. Use status "unknown" if unsure.',
      },
      buildUserMessage(
        prompt,
        {
          DOCUMENT_TEXT: job.textContent,
          CURRENT_DATE: job.document.created ?? '',
        },
        job,
        context,
      ),
    ];

    const response = await executeAiCall({
      field: this.field,
      schema: DateResponseSchema,
      context,
      messages,
      responseName: 'date_response',
    });

    if (!response.success) {
      return {
        field: this.field,
        type: 'invalid' as const,
        message: response.error,
      };
    }

    if (response.data.status === 'unknown') {
      return {
        field: this.field,
        type: 'unknown' as const,
        message: response.data.reason,
      };
    }

    return {
      field: this.field,
      type: 'ok' as const,
      value: response.data.value,
      message: response.data.reason,
    };
  }
}
