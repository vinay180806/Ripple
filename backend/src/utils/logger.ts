import { env } from '../config/env';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogPayload {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private format(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): string {
    const payload: LogPayload = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(context ? { context: this.sanitize(context) } : {}),
      ...(error
        ? {
            error: {
              name: error.name,
              message: error.message,
              ...(env.NODE_ENV !== 'production' ? { stack: error.stack } : {}),
            },
          }
        : {}),
    };

    return JSON.stringify(payload);
  }

  private sanitize(obj: Record<string, unknown>): Record<string, unknown> {
    const sensitiveKeys = ['password', 'password_hash', 'token', 'secret', 'authorization', 'access_token', 'jwt'];
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
        sanitized[key] = '[REDACTED]';
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        sanitized[key] = this.sanitize(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (env.NODE_ENV === 'development' || env.NODE_ENV === 'test') {
      console.debug(this.format('debug', message, context));
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    console.info(this.format('info', message, context));
  }

  warn(message: string, context?: Record<string, unknown>, error?: Error): void {
    console.warn(this.format('warn', message, context, error));
  }

  error(message: string, context?: Record<string, unknown>, error?: Error): void {
    console.error(this.format('error', message, context, error));
  }
}

export const logger = new Logger();
