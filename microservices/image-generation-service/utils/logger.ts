export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export class Logger {
  private serviceName: string;

  constructor(serviceName: string = 'ImageGenerationService') {
    this.serviceName = serviceName;
  }

  private log(level: LogLevel, message: string, metadata?: Record<string, unknown>): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      service: this.serviceName,
      message,
      ...metadata,
    };

    console.log(JSON.stringify(logEntry));
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, metadata);
  }

  error(message: string, error?: Error, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, {
      ...metadata,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : undefined,
    });
  }
}
