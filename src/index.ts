import { loadEnvironment } from './bootstrap/env.js';
import { run } from './app.js';

loadEnvironment();

async function main(): Promise<void> {
  await run();
}

main().catch((error) => {
  console.error('Aspen failed to start', error);
  process.exitCode = 1;
});
