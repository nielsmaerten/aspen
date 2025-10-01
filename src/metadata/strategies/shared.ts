import { z } from 'zod';

import type { MetadataField } from '../../domain/metadata.js';
import type { MetadataExtractionContext } from '../context.js';
import type { AiResponseFormat } from '../../clients/ai.js';
import { truncate } from '../../utils/text.js';

interface ExecuteAiOptions<TSchema extends z.ZodTypeAny> {
  field: MetadataField;
  schema: TSchema;
  context: MetadataExtractionContext;
  messages: Parameters<MetadataExtractionContext['ai']['complete']>[0]['messages'];
  responseName: string;
}

export interface ExecuteAiSuccess<T> {
  success: true;
  data: T;
}

export interface ExecuteAiFailure {
  success: false;
  error: string;
}

export type ExecuteAiResult<T> = ExecuteAiSuccess<T> | ExecuteAiFailure;

export async function executeAiCall<TSchema extends z.ZodTypeAny>(
  options: ExecuteAiOptions<TSchema>,
): Promise<ExecuteAiResult<z.infer<TSchema>>> {
  const { field, schema, context, messages, responseName } = options;

  let responseFormat: AiResponseFormat | undefined;
  if (context.config.ai.features.supportsJson) {
    const jsonSchema = z.toJSONSchema(schema, {
      target: 'draft-7',
      io: 'output',
    }) as unknown as Record<string, unknown>;

    responseFormat = {
      type: 'json_schema',
      json_schema: {
        name: responseName,
        schema: jsonSchema,
        strict: true,
      },
    };
  }

  const result = await context.ai.complete({
    messages,
    responseFormat,
  });

  const raw = extractJson(result.text);
  if (!raw) {
    context.logger.warn(
      { field, preview: truncate(result.text, 500) },
      'Model response did not contain JSON payload',
    );
    return { success: false, error: 'Model response did not contain JSON output' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    context.logger.warn(
      { field, preview: truncate(result.text, 500), error: (error as Error).message },
      'Failed to parse model JSON output',
    );
    return { success: false, error: 'Model response could not be parsed as JSON' };
  }

  const validation = schema.safeParse(parsed);
  if (!validation.success) {
    context.logger.warn(
      { field, issues: validation.error.issues },
      'Model JSON response failed validation',
    );
    return { success: false, error: 'Model response failed validation' };
  }

  return { success: true, data: validation.data };
}

function extractJson(content: string): string | null {
  const trimmed = content.trim();
  if (!trimmed) {
    return null;
  }

  const fenced = trimmed.match(/```(?:json)?\n([\s\S]+?)```/i);
  if (fenced) {
    return fenced[1].trim();
  }

  return trimmed;
}
