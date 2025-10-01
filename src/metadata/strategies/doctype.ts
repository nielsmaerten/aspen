import type { ChatCompletionMessageParam } from 'token.js';

import type { MetadataStrategy } from '../../domain/metadata.js';
import type { EntitySelection } from '../../domain/metadata.js';
import type { DocumentJob } from '../../domain/document.js';
import { findAllowlistMatch } from '../../domain/allowlists.js';
import type { MetadataExtractionContext } from '../context.js';
import { DoctypeResponseSchema } from '../schemas.js';
import { buildUserMessage } from '../message-builder.js';
import { executeAiCall } from './shared.js';

export class DoctypeStrategy
  implements MetadataStrategy<'doctype', EntitySelection, MetadataExtractionContext>
{
  readonly field = 'doctype' as const;

  async extract(job: DocumentJob, context: MetadataExtractionContext) {
    const prompt = await context.prompts.get('doctype');
    const allowlist = context.allowlists.documentTypes;
    const allowNew = context.config.metadata.allowNewDocumentTypes;

    const allowlistText = allowlist.length
      ? allowlist
          .slice(0, 50)
          .map((item, index) => `${index + 1}. ${item.name}`)
          .join('\n')
      : 'None';

    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content:
          'You extract the document type classification. Respond in JSON. Use status "unknown" if unsure.',
      },
      buildUserMessage(
        prompt,
        {
          DOCUMENT_TEXT: job.textContent,
          EXISTING_DOCTYPE: job.document.document_type?.toString() ?? '',
          ALLOWED_DOCTYPES: allowlistText,
          ALLOW_NEW: allowNew ? 'true' : 'false',
        },
        job,
        context,
      ),
    ];

    const response = await executeAiCall({
      field: this.field,
      schema: DoctypeResponseSchema,
      context,
      messages,
      responseName: 'doctype_response',
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
        message: 'Model returned null document type for ok status',
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

    if (context.config.metadata.allowNewDocumentTypes && candidate.create) {
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
      message: `Document type '${candidate.name}' is not in the allowlist`,
    };
  }
}
