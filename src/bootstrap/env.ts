import fs from 'node:fs';
import path from 'node:path';

import dotenv from 'dotenv';

import { getExecutableDir } from '../utils/runtime-paths.js';

const runtimeDir = getExecutableDir();
const envFilePath = path.join(runtimeDir, '.env');
const result = dotenv.config({ path: envFilePath });

if (result.error) {
  if ((result.error as NodeJS.ErrnoException).code === 'ENOENT') {
    dotenv.config();
  } else {
    throw result.error;
  }
} else if (!fs.existsSync(envFilePath)) {
  dotenv.config();
}

export function loadEnvironment(): void {
  // Intentionally empty: calling this function documents the bootstrap step.
}
