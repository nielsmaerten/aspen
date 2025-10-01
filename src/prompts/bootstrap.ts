import { constants } from 'node:fs';
import { access, copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

import { METADATA_FIELDS } from '../domain/metadata.js';

const PROMPTS_DIR = path.resolve(process.cwd(), 'prompts');
const DEFAULT_PROMPTS_DIR = path.resolve(process.cwd(), 'prompts-default');

export async function ensurePromptDefaults(): Promise<void> {
  await mkdir(PROMPTS_DIR, { recursive: true });

  for (const field of METADATA_FIELDS) {
    const target = path.join(PROMPTS_DIR, `${field}.txt`);
    if (await fileExists(target)) {
      continue;
    }

    const source = path.join(DEFAULT_PROMPTS_DIR, `${field}.txt`);
    if (!(await fileExists(source))) {
      throw new Error(`Default prompt missing: ${source}`);
    }

    await copyFile(source, target);
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
      return false;
    }

    throw error;
  }
}
