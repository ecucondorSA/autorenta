import { Injectable, inject } from '@angular/core';
import * as Sentry from '@sentry/angular';
import { environment } from '../../../environments/environment';

/**
 * LoggerService: Professional logging with Sentry integration
 *
 * Replaces console.log with structured logging.
 * In production: sends to Sentry, filters DEBUG/INFO
 * In development: logs to console (no sensitive data)
 *
 * Usage:
 *   constructor(private logger: LoggerService) {}
 *   this.logger.debug('User logged in', 'AuthService');
 *   this.logger.error('Payment failed', 'PaymentService', error);
 *
 * With ChildLogger:
 *   private logger = inject(LoggerService).createChildLogger('MyService');
 *   this.logger.info('Action completed'); // Auto-prefixed with [MyService]
 */
@Injectable({
  providedIn: 'root',
})
export class LoggerService {
  private readonly isDevelopment = !environment.production;

  /**
   * Debug level: Detailed diagnostic information
   * Only logged in development mode
   */
  debug(message: string, context?: string, data?: unknown): void {
    if (this.isDevelopment) {
      // In development, log to console with safe data only
      const safeData = this.sanitizeData(data);
      const prefix = context ? `[${context}]` : '';
      console.log(`[DEBUG] ${prefix} ${message}`, safeData);
    }
  }

  /**
   * Info level: Informational messages
   * Production: Filtered (not logged)
   * Development: Logged to console
   */
  info(message: string, context?: string, data?: unknown): void {
    if (this.isDevelopment) {
      const safeData = this.sanitizeData(data);
      const prefix = context ? `[${context}]` : '';
      console.log(`[INFO] ${prefix} ${message}`, safeData);
    }
    // Production: INFO is too noisy, don't send to Sentry
  }

  /**
   * Warn level: Warning messages
   * Production: Sent to Sentry
   * Development: Logged to console
   */
  warn(message: string, context?: string, error?: Error | unknown): void {
    const prefix = context ? `[${context}]` : '';
    if (this.isDevelopment) {
      console.warn(`[WARN] ${prefix} ${message}`, error);
    } else {
      this.sendToSentry('warning', message, error);
    }
  }

  /**
   * Error level: Error conditions
   * ALWAYS sent to Sentry with full stack trace
   * Development: Also logged to console
   */
  error(message: string, context?: string, error?: Error | unknown): void {
    const prefix = context ? `[${context}]` : '';
    if (this.isDevelopment) {
      console.error(`[ERROR] ${prefix} ${message}`, error);
    }

    // Always report errors to Sentry
    if (error instanceof Error) {
      this.sendToSentry('error', message, error);
    } else {
      this.sendToSentry('error', message, new Error(String(error)));
    }
  }

  /**
   * Critical level: Critical errors that may cause downtime
   * ALWAYS sent to Sentry with highest priority
   */
  critical(message: string, context?: string, error?: Error): void {
    const prefix = context ? `[${context}]` : '';
    if (this.isDevelopment) {
      console.error(`[CRITICAL] ${prefix} ${message}`, error);
    }
    this.sendToSentry('fatal', message, error);
  }

  /**
   * Log user action for analytics
   * Useful for tracking user behavior
   */
  logAction(action: string, metadata?: Record<string, unknown>): void {
    const safeMeta = this.sanitizeData(metadata);
    if (this.isDevelopment) {
      console.log(`[ACTION] ${action}`, safeMeta);
    } else {
      this.sendToSentry('info', action, safeMeta);
    }
  }

  /**
   * Log performance metrics
   * Useful for identifying slow operations
   */
  logPerformance(operation: string, durationMs: number, metadata?: Record<string, unknown>): void {
    const level = durationMs > 1000 ? 'warning' : 'info';
    const message = `${operation} took ${durationMs}ms`;
    const safeMeta = this.sanitizeData(metadata);

    if (this.isDevelopment) {
      console.log(`[PERF] ${message}`, safeMeta);
    } else {
      this.sendToSentry(level, message, safeMeta);
    }
  }

  /**
   * Remove sensitive data from logs (tokens, passwords, etc)
   * @private
   */
  private sanitizeData(data: unknown): unknown {
    if (!data) return undefined;

    if (typeof data === 'string') {
      // Don't log strings that look like tokens
      if (data.includes('token') || data.includes('key') || data.includes('secret')) {
        return '[REDACTED]';
      }
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeData(item));
    }

    if (typeof data === 'object' && data !== null) {
      const obj = { ...data } as Record<string, unknown>;

      // Redact sensitive fields
      const sensitiveFields = [
        'password',
        'token',
        'access_token',
        'refresh_token',
        'mp_access_token_encrypted',
        'mp_refresh_token_encrypted',
        'mercadopago_token',
        'mercadopago_access_token',
        'apiKey',
        'api_key',
        'secretKey',
        'secret_key',
        'authorization',
        'creditCard',
        'credit_card',
        'cvv',
        'ssn',
        'encryptionKey',
        'encryption_key',
      ];

      for (const field of sensitiveFields) {
        if (field in obj) {
          obj[field] = '[REDACTED]';
        }
      }

      // Recursively sanitize nested objects
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null) {
          obj[key] = this.sanitizeData(value);
        }
      }

      return obj;
    }

    return data;
  }

  /**
   * Create a child logger with fixed context
   * Useful for services that always log with the same context
   *
   * Usage:
   *   private logger = inject(LoggerService).createChildLogger('MyService');
   *   this.logger.info('Action completed'); // [INFO] [MyService] Action completed
   */
  createChildLogger(context: string): ChildLogger {
    return new ChildLogger(this, context);
  }

  /**
   * Send log to Sentry (production)
   * @private
   */
  private sendToSentry(
    level: 'debug' | 'info' | 'warning' | 'error' | 'fatal',
    message: string,
    data?: unknown,
  ): void {
    // Only send to Sentry if DSN is configured
    if (!environment.sentryDsn) {
      return;
    }

    try {
      const captureContext: Sentry.CaptureContext = {
        level: level as Sentry.SeverityLevel,
        extra: { data: this.sanitizeData(data) },
      };

      if (level === 'error' || level === 'fatal') {
        if (data instanceof Error) {
          Sentry.captureException(data, captureContext);
        } else {
          Sentry.captureException(new Error(message), captureContext);
        }
      } else {
        Sentry.captureMessage(message, captureContext);
      }
    } catch (e) {
      // Fallback if Sentry fails
      console.error('Failed to send to Sentry:', e);
    }
  }
}

/**
 * Child logger with fixed context
 *
 * Automatically prefixes all log messages with the context name.
 * Useful for services that always log from the same context.
 *
 * Usage:
 * ```typescript
 * export class MyService {
 *   private logger = inject(LoggerService).createChildLogger('MyService');
 *
 *   doSomething() {
 *     this.logger.info('Action performed', { actionId: 123 });
 *     // Output: [INFO] [MyService] Action performed { actionId: 123 }
 *   }
 *
 *   handleError(error: Error) {
 *     this.logger.error('Operation failed', error);
 *     // Output: [ERROR] [MyService] Operation failed Error: ...
 *   }
 * }
 * ```
 */
export class ChildLogger {
  constructor(
    private parent: LoggerService,
    private context: string,
  ) {}

  debug(message: string, data?: unknown): void {
    this.parent.debug(message, this.context, data);
  }

  info(message: string, data?: unknown): void {
    this.parent.info(message, this.context, data);
  }

  warn(message: string, error?: Error | unknown): void {
    this.parent.warn(message, this.context, error);
  }

  error(message: string, error?: Error | unknown): void {
    this.parent.error(message, this.context, error);
  }

  critical(message: string, error: Error): void {
    this.parent.critical(message, this.context, error);
  }
}
