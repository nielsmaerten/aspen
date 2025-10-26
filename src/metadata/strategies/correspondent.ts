import type { ChatCompletionMessageParam } from 'token.js';

import type { MetadataStrategy } from '../../domain/metadata.js';
import type { EntitySelection } from '../../domain/metadata.js';
import type { DocumentJob } from '../../domain/document.js';
import { findAllowlistMatch } from '../../domain/allowlists.js';
import type { MetadataExtractionContext } from '../context.js';
import { CorrespondentResponseSchema } from '../schemas.js';
import { buildUserMessage } from '../message-builder.js';
import { executeAiCall } from './shared.js';

export class CorrespondentStrategy
  implements MetadataStrategy<'correspondent', EntitySelection, MetadataExtractionContext> {
  readonly field = 'correspondent' as const;

  async extract(job: DocumentJob, context: MetadataExtractionContext) {
    const prompt = await context.prompts.get('correspondent');
    const allowlist = context.allowlists.correspondents;
    const allowNew = context.config.metadata.allowNewCorrespondents;

    const allowlistText = allowlist.length
      ? allowlist
        .map((item, index) => `${index + 1}. ${item.name}`)
        .join('\n')
      : 'None';

    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content:
          'You extract the correspondent (sender) of documents. Respond in JSON. Use status "unknown" if unsure.',
      },
      buildUserMessage(
        prompt,
        {
          DOCUMENT_TEXT: job.textContent,
          EXISTING_CORRESPONDENT: job.document.correspondent?.toString() ?? '',
          ALLOWED_CORRESPONDENTS: allowlistText,
          ALLOW_NEW: allowNew ? 'true' : 'false',
        },
        job,
        context,
      ),
    ];

    const response = await executeAiCall({
      field: this.field,
      schema: CorrespondentResponseSchema,
      context,
      messages,
      responseName: 'correspondent_response',
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

    if (!response.data.value) {
      return {
        field: this.field,
        type: 'invalid' as const,
        message: 'Model returned null correspondent for ok status',
      };
    }

    const candidate = response.data.value;
    const existing = findAllowlistMatch(allowlist, candidate.name);

    if (existing) {
      return {
        field: this.field,
        type: 'ok' as const,
        value: {
          type: 'existing',
          id: existing.id,
          name: existing.name,
        } as EntitySelection,
        message: candidate.reason ?? undefined,
      };
    }

    if (context.config.metadata.allowNewCorrespondents && candidate.create) {
      return {
        field: this.field,
        type: 'ok' as const,
        value: {
          type: 'new',
          name: candidate.name,
        } as EntitySelection,
        message: candidate.reason ?? undefined,
      };
    }

    return {
      field: this.field,
      type: 'invalid' as const,
      message: `Correspondent '${candidate.name}' is not in the allowlist`,
    };
  }
}
