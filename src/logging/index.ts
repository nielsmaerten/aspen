import { mkdirSync } from 'node:fs';
import path from 'node:path';

import pino, {
  stdTimeFunctions,
  type DestinationStream,
  type Level,
  type LevelWithSilent,
  type Logger,
  type StreamEntry,
} from 'pino';
import pretty from 'pino-pretty';

type SupportedLevel = LevelWithSilent;

let sharedLogger: Logger | undefined;
let sharedLogFilePath: string | undefined;

export function initializeLogging(): Logger {
  if (!sharedLogger) {
    const { logger, logFilePath } = buildLogger();
    sharedLogger = logger;
    sharedLogFilePath = logFilePath;
  }

  return sharedLogger;
}

export function getLogger(): Logger {
  if (!sharedLogger) {
    return initializeLogging();
  }

  return sharedLogger;
}

export function getLogFilePath(): string | undefined {
  return sharedLogFilePath;
}

export function flushLogger(): void {
  if (sharedLogger && typeof sharedLogger.flush === 'function') {
    sharedLogger.flush();
  }
}

function buildLogger(): { logger: Logger; logFilePath?: string } {
  const rawLevel = process.env.ASPEN_LOG_LEVEL;
  const consoleLevel = validateLogLevel(rawLevel) ?? 'info';

  const consoleStream = pretty({
    colorize: process.stdout.isTTY,
    translateTime: 'SYS:HH:MM:ss',
    ignore: 'pid,hostname',
    singleLine: false,
    levelFirst: true,
    messageKey: 'msg',
    errorLikeObjectKeys: ['err', 'error'],
    errorProps: '*',
  });

  const streams: StreamEntry[] = [];
  if (consoleLevel !== 'silent') {
    streams.push({
      level: consoleLevel as Level,
      stream: consoleStream as DestinationStream,
    });
  }

  const resolvedFilePath = resolveFilePath(process.env.ASPEN_LOG_FILE);

  if (resolvedFilePath && consoleLevel !== 'silent') {
    mkdirSync(path.dirname(resolvedFilePath), { recursive: true });
    const fileStream = pino.destination({ dest: resolvedFilePath, sync: false });
    streams.push({ level: consoleLevel as Level, stream: fileStream });
  }

  const destination =
    streams.length === 0
      ? undefined
      : streams.length === 1
        ? streams[0]!.stream
        : pino.multistream(streams);

  const logger = pino(
    {
      level: consoleLevel,
      base: undefined,
      timestamp: stdTimeFunctions.isoTime,
      formatters: {
        level(label) {
          return { level: label.toUpperCase() };
        },
      },
    },
    destination,
  );

  return {
    logger,
    logFilePath: resolvedFilePath,
  };
}

function validateLogLevel(level: string | undefined): SupportedLevel | undefined {
  const lowercase = level?.toLowerCase().trim();
  const allowedLevels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'];
  if (lowercase && allowedLevels.includes(lowercase)) {
    return lowercase as SupportedLevel;
  }
  return 'info';
}

function resolveFilePath(raw: string | undefined): string | undefined {
  if (!raw || raw.trim().toLowerCase() === 'off') return undefined;
  const resolvedPath = path.resolve(process.cwd(), raw.trim());
  return resolvedPath === '.' ? path.join(process.cwd(), 'aspen.log') : resolvedPath;
}
