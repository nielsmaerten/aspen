import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { METADATA_FIELDS, type MetadataField } from '../domain/metadata.js';

function normalizeContent(content: string): string {
  return content.replace(/\r\n/g, '\n').trim();
}

export class PromptRepository {
  private readonly cache = new Map<MetadataField, string>();

  constructor(private readonly baseDir = path.resolve(process.cwd(), 'prompts')) {}

  async get(field: MetadataField): Promise<string> {
    const cached = this.cache.get(field);
    if (cached) {
      return cached;
    }

    const filePath = path.join(this.baseDir, `${field}.txt`);

    let raw: string;
    try {
      raw = await readFile(filePath, 'utf-8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
        throw new Error(`Prompt template missing: ${filePath}`);
      }
      throw error;
    }

    const normalized = normalizeContent(raw);
    this.cache.set(field, normalized);
    return normalized;
  }

  async loadAll(): Promise<Record<MetadataField, string>> {
    const entries = await Promise.all(
      METADATA_FIELDS.map(async (field) => [field, await this.get(field)] as const),
    );

    return Object.fromEntries(entries) as Record<MetadataField, string>;
  }
}
