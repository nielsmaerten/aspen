import { access, copyFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { METADATA_FIELDS, type MetadataField } from '../domain/metadata.js';

function normalizeContent(content: string): string {
  return content.replace(/\r\n/g, '\n').trim();
}

export class PromptRepository {
  private readonly cache = new Map<MetadataField, string>();
  private readonly ready: Promise<void>;

  constructor(
    private readonly baseDir = path.resolve(process.cwd(), 'prompts'),
    private readonly templateDir = path.resolve(process.cwd(), 'prompt-templates'),
  ) {
    this.ready = this.ensurePrompts();
  }

  async get(field: MetadataField): Promise<string> {
    await this.ready;

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

  private async ensurePrompts(): Promise<void> {
    await mkdir(this.baseDir, { recursive: true });

    await Promise.all(
      METADATA_FIELDS.map(async (field) => {
        const promptPath = path.join(this.baseDir, `${field}.txt`);
        try {
          await access(promptPath);
          return;
        } catch (error) {
          if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT') {
            throw error;
          }
        }

        const templatePath = path.join(this.templateDir, `${field}.txt`);
        try {
          await copyFile(templatePath, promptPath);
        } catch (error) {
          if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
            throw new Error(`Prompt template missing: ${templatePath}`);
          }
          throw error;
        }
      }),
    );
  }
}
