import { exec as execCallback } from 'node:child_process';
import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const exec = promisify(execCallback);

const TARGETS = [
  'node18-linux-x64',
  'node18-linux-arm64',
  'node18-win-x64',
  'node18-macos-x64',
  'node18-macos-arm64',
];

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const binDir = path.join(rootDir, 'bin');
const distEntry = path.join(rootDir, 'dist', 'index.js');
const promptsDir = path.join(rootDir, 'prompts');
const promptsDefaultDir = path.join(rootDir, 'prompts-default');

async function main() {
  await rm(binDir, { recursive: true, force: true });
  await mkdir(binDir, { recursive: true });

  const targetArg = TARGETS.join(',');
  const command = `pnpm exec pkg "${distEntry}" --targets ${targetArg} --out-dir "${binDir}"`;
  await exec(command, { cwd: rootDir, maxBuffer: 1024 * 1024 * 10 });

  await cp(promptsDir, path.join(binDir, 'prompts'), { recursive: true });
  await cp(promptsDefaultDir, path.join(binDir, 'prompts-default'), { recursive: true });
}

main().catch((error) => {
  console.error('Failed to build binaries', error);
  process.exitCode = 1;
});
