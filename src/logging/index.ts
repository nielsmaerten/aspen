import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import pino, { type DestinationStream, type StreamEntry } from 'pino';
import pretty from 'pino-pretty';

const LOG_DIRECTORY = path.resolve(process.cwd(), 'logs');
const SUPPORTED_LEVELS = new Set(['error', 'warn', 'info'] as const);
type SupportedLevel = 'error' | 'warn' | 'info';

interface CreateLoggerResult {
  logger: pino.Logger;
  logFilePath?: string;
}

export async function createLogger(): Promise<CreateLoggerResult> {
  const normalized = normalizeLogLevel(process.env.ASPEN_LOGLEVEL);
  const consoleLevel: SupportedLevel = normalized ?? 'info';

  const prettyStream = pretty({
    colorize: process.stdout.isTTY,
    translateTime: 'SYS:HH:MM:ss',
    ignore: 'pid,hostname',
    hideObject: true,
  });

  const streams: StreamEntry<SupportedLevel>[] = [
    { level: consoleLevel, stream: prettyStream as DestinationStream },
  ];

  let logFilePath: string | undefined;
  if (normalized) {
    await mkdir(LOG_DIRECTORY, { recursive: true });
    logFilePath = path.join(LOG_DIRECTORY, `aspen.log`);
    const fileStream = pino.destination({ dest: logFilePath, sync: false });
    streams.push({ level: normalized, stream: fileStream });
  }

  const logger = pino(
    {
      level: consoleLevel,
      base: undefined,
      formatters: {
        level(label) {
          return { level: label };
        },
      },
    },
    pino.multistream(streams),
  );

  return { logger, logFilePath };
}

function normalizeLogLevel(level: string | undefined): SupportedLevel | undefined {
  if (!level) return undefined;
  const normalized = level.trim().toLowerCase() as SupportedLevel;
  return SUPPORTED_LEVELS.has(normalized) ? normalized : undefined;
}
