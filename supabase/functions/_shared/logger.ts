/**
 * Logger utility for Supabase Edge Functions
 *
 * Provides structured logging with:
 * - Level-based filtering (debug, info, warn, error)
 * - Automatic sensitive data sanitization
 * - ISO timestamp formatting
 * - Context support
 *
 * Usage:
 * ```typescript
 * import { logger } from '../_shared/logger.ts';
 *
 * logger.info('Payment processed', { paymentId: '123' });
 * logger.error('Payment failed', error);
 * logger.debug('Processing payment', { amount: 1000 });
 * ```
 *
 * Production:
 * - DEBUG and INFO are filtered out
 * - Only WARN and ERROR are logged
 * - Sensitive data is automatically redacted
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  level: string;
  timestamp: string;
  message: string;
  context?: string;
  data?: unknown;
  error?: unknown;
}

class Logger {
  private readonly isProduction: boolean;
  private readonly minLevel: LogLevel;

  /**
   * Sensitive keys that should never be logged
   */
  private readonly SENSITIVE_KEYS = [
    'password',
    'token',
    'access_token',
    'refresh_token',
    'secret',
    'api_key',
    'apiKey',
    'authorization',
    'creditCard',
    'cvv',
    'ssn',
    'mp_access_token',
    'mp_refresh_token',
    'mercadopago_access_token',
  ];

  constructor() {
    // Check if running in production (Supabase Edge Function environment)
    this.isProduction = Deno.env.get('ENVIRONMENT') === 'production';

    // Production: Only WARN and ERROR
    // Development: All levels
    this.minLevel = this.isProduction ? LogLevel.WARN : LogLevel.DEBUG;
  }

  /**
   * Log debug message (development only)
   */
  debug(message: string, data?: unknown, context?: string): void {
    this.log(LogLevel.DEBUG, message, data, undefined, context);
  }

  /**
   * Log info message (development only)
   */
  info(message: string, data?: unknown, context?: string): void {
    this.log(LogLevel.INFO, message, data, undefined, context);
  }

  /**
   * Log warning message (production + development)
   */
  warn(message: string, data?: unknown, context?: string): void {
    this.log(LogLevel.WARN, message, data, undefined, context);
  }

  /**
   * Log error message (production + development)
   */
  error(message: string, error?: unknown, context?: string): void {
    this.log(LogLevel.ERROR, message, undefined, error, context);
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    data?: unknown,
    error?: unknown,
    context?: string,
  ): void {
    // Filter by minimum level
    if (level < this.minLevel) {
      return;
    }

    // Build log entry
    const entry: LogEntry = {
      level: LogLevel[level],
      timestamp: new Date().toISOString(),
      message,
      context,
      data: data ? this.sanitizeData(data) : undefined,
      error: error ? this.formatError(error) : undefined,
    };

    // Output to console
    this.outputToConsole(entry);
  }

  /**
   * Output log entry to console
   */
  private outputToConsole(entry: LogEntry): void {
    const prefix = this.buildPrefix(entry);
    const logData = this.buildLogData(entry);

    switch (entry.level) {
      case 'DEBUG':
        console.log(prefix, logData);
        break;
      case 'INFO':
        console.info(prefix, logData);
        break;
      case 'WARN':
        console.warn(prefix, logData);
        break;
      case 'ERROR':
        console.error(prefix, logData);
        break;
    }
  }

  /**
   * Build log prefix
   */
  private buildPrefix(entry: LogEntry): string {
    const context = entry.context ? `[${entry.context}]` : '';
    return `[${entry.level}] ${context} ${entry.message}`;
  }

  /**
   * Build log data object
   */
  private buildLogData(entry: LogEntry): unknown {
    const data: Record<string, unknown> = {};

    if (entry.data) {
      data.data = entry.data;
    }

    if (entry.error) {
      data.error = entry.error;
    }

    return Object.keys(data).length > 0 ? data : '';
  }

  /**
   * Format error for logging
   */
  private formatError(error: unknown): unknown {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    if (typeof error === 'string') {
      return { message: error };
    }

    return { message: String(error) };
  }

  /**
   * Sanitize data to remove sensitive information
   */
  private sanitizeData(data: unknown): unknown {
    if (data === null || data === undefined) {
      return data;
    }

    // Primitive types
    if (typeof data !== 'object') {
      return data;
    }

    // Arrays
    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeData(item));
    }

    // Objects
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (this.isSensitiveKey(key)) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Check if key is sensitive
   */
  private isSensitiveKey(key: string): boolean {
    const lowerKey = key.toLowerCase();
    return this.SENSITIVE_KEYS.some((sensitiveKey) =>
      lowerKey.includes(sensitiveKey.toLowerCase())
    );
  }
}

/**
 * Singleton logger instance
 */
export const logger = new Logger();

/**
 * Create a child logger with fixed context
 *
 * Usage:
 * ```typescript
 * const log = createChildLogger('PaymentWebhook');
 * log.info('Payment received'); // [INFO] [PaymentWebhook] Payment received
 * ```
 */
export function createChildLogger(context: string) {
  return {
    debug: (message: string, data?: unknown) => logger.debug(message, data, context),
    info: (message: string, data?: unknown) => logger.info(message, data, context),
    warn: (message: string, data?: unknown) => logger.warn(message, data, context),
    error: (message: string, error?: unknown) => logger.error(message, error, context),
  };
}
