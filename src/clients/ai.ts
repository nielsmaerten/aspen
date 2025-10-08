import {
  TokenJS,
  type CompletionResponse,
  type ChatCompletionMessageParam,
  ConfigOptions,
} from 'token.js';

import type { AspenConfig } from '../config/types.js';

export type AiResponseFormat =
  | { type: 'text' }
  | { type: 'json_object' }
  | {
      type: 'json_schema';
      json_schema: {
        name: string;
        description?: string;
        schema: Record<string, unknown>;
        strict?: boolean;
      };
    };

export interface AiCompletionRequest {
  messages: ChatCompletionMessageParam[];
  responseFormat?: AiResponseFormat;
  temperature?: number;
  maxTokens?: number;
}

export interface AiCompletionResult {
  text: string;
  finishReason: CompletionResponse['choices'][number]['finish_reason'];
  response: CompletionResponse;
}

export class AiService {
  private readonly client: TokenJS;

  constructor(private readonly config: AspenConfig['ai']) {
    const opts: ConfigOptions = {};
    if (this.config.provider === 'openai-compatible') {
      opts.baseURL = process.env.OPENAI_COMPATIBLE_BASE_URL;
      opts.apiKey = process.env.OPENAI_COMPATIBLE_API_KEY;
    }
    this.client = new TokenJS(opts);
  }
  async complete(request: AiCompletionRequest): Promise<AiCompletionResult> {
    const response = await this.client.chat.completions.create({
      provider: this.config.provider,
      model: this.config.model,
      messages: request.messages,
      response_format: request.responseFormat,
      temperature: request.temperature,
      max_tokens: request.maxTokens,
    });

    const [choice] = response.choices;
    const text = normalizeMessageText(choice?.message?.content);

    return {
      text,
      finishReason: choice?.finish_reason ?? 'unknown',
      response,
    };
  }
}

function normalizeMessageText(
  content: CompletionResponse['choices'][number]['message']['content'] | null | undefined,
): string {
  if (typeof content === 'string') {
    return content;
  }

  if (!Array.isArray(content)) {
    return '';
  }

  const parts = content as unknown[];
  return parts
    .map((part) => {
      if (typeof part === 'string') {
        return part;
      }

      if (part && typeof part === 'object' && 'text' in part) {
        const maybeText = (part as { text?: string }).text;
        if (typeof maybeText === 'string') {
          return maybeText;
        }
      }

      return '';
    })
    .join('')
    .trim();
}
