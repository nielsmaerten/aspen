import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import pino from 'pino';
import pretty from 'pino-pretty';

const LOG_DIRECTORY = path.resolve(process.cwd(), 'logs');

interface CreateLoggerResult {
  logger: pino.Logger;
  logFilePath: string;
}

export async function createLogger(): Promise<CreateLoggerResult> {
  await mkdir(LOG_DIRECTORY, { recursive: true });

  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+$/, '');
  const logFilePath = path.join(LOG_DIRECTORY, `aspen-${timestamp}.log`);

  const prettyStream = pretty({
    colorize: process.stdout.isTTY,
    translateTime: 'SYS:standard',
    ignore: 'pid,hostname',
  });
  prettyStream.pipe(process.stdout);

  const fileStream = pino.destination({ dest: logFilePath, sync: false });

  const logger = pino(
    {
      level: process.env.LOG_LEVEL ?? 'info',
      base: undefined,
      formatters: {
        level(label) {
          return { level: label };
        },
      },
    },
    pino.multistream([{ stream: fileStream }, { stream: prettyStream }]),
  );

  return { logger, logFilePath };
}
