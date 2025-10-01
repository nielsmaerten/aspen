import type { Logger } from 'pino';

import type { AiService } from '../clients/ai.js';
import type { AspenConfig } from '../config/types.js';
import type { DocumentAllowlists } from '../domain/allowlists.js';
import type { PromptRepository } from '../prompts/index.js';

export interface MetadataExtractionContext {
  ai: AiService;
  prompts: PromptRepository;
  config: AspenConfig;
  allowlists: DocumentAllowlists;
  logger: Logger;
}
