/**
 * Minimal structured logging helper
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

function formatLog(entry: Omit<LogEntry, 'timestamp'>): string {
  return JSON.stringify({
    ...entry,
    timestamp: new Date().toISOString(),
  });
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(formatLog({ level: LogLevel.DEBUG, message, ...meta }));
    }
  },

  info: (message: string, meta?: Record<string, unknown>) => {
    console.log(formatLog({ level: LogLevel.INFO, message, ...meta }));
  },

  warn: (message: string, meta?: Record<string, unknown>) => {
    console.warn(formatLog({ level: LogLevel.WARN, message, ...meta }));
  },

  error: (message: string, error?: Error | unknown, meta?: Record<string, unknown>) => {
    const errorMeta: Record<string, unknown> = {
      ...meta,
    };

    if (error instanceof Error) {
      errorMeta.error = {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      };
    }

    console.error(formatLog({ level: LogLevel.ERROR, message, ...errorMeta }));
  },
};

