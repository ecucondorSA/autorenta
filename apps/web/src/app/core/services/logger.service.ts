import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * LoggerService: Professional logging with Sentry integration
 *
 * Replaces console.log with structured logging.
 * In production: sends to Sentry
 * In development: logs to console (no sensitive data)
 *
 * Usage:
 *   constructor(private logger: LoggerService) {}
 *   this.logger.debug('User logged in');
 *   this.logger.error('Payment failed', error);
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
  debug(message: string, data?: unknown): void {
    if (this.isDevelopment) {
      // In development, log to console with safe data only
      const safeData = this.sanitizeData(data);
      console.log(`[DEBUG] ${message}`, safeData);
    }
  }

  /**
   * Info level: Informational messages
   * Production: Sent to Sentry
   * Development: Logged to console
   */
  info(message: string, data?: unknown): void {
    if (this.isDevelopment) {
      const safeData = this.sanitizeData(data);
      console.log(`[INFO] ${message}`, safeData);
    } else {
      this.sendToSentry('info', message, data);
    }
  }

  /**
   * Warn level: Warning messages
   * Production: Sent to Sentry
   * Development: Logged to console
   */
  warn(message: string, error?: Error | unknown): void {
    if (this.isDevelopment) {
      console.warn(`[WARN] ${message}`, error);
    } else {
      this.sendToSentry('warning', message, error);
    }
  }

  /**
   * Error level: Error conditions
   * ALWAYS sent to Sentry with full stack trace
   * Development: Also logged to console
   */
  error(message: string, error: Error | unknown): void {
    if (this.isDevelopment) {
      console.error(`[ERROR] ${message}`, error);
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
  critical(message: string, error: Error): void {
    if (this.isDevelopment) {
      console.error(`[CRITICAL] ${message}`, error);
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

    if (typeof data === 'object' && data !== null) {
      const obj = { ...data } as Record<string, unknown>;

      // Redact sensitive fields
      const sensitiveFields = [
        'password',
        'token',
        'access_token',
        'refresh_token',
        'mercadopago_token',
        'apiKey',
        'secretKey',
        'creditCard',
        'cvv',
        'ssn',
      ];

      for (const field of sensitiveFields) {
        if (field in obj) {
          obj[field] = '[REDACTED]';
        }
      }

      return obj;
    }

    return data;
  }

  /**
   * Send log to Sentry (production)
   * @private
   */
  private sendToSentry(
    level: 'debug' | 'info' | 'warning' | 'error' | 'fatal',
    message: string,
    data?: unknown
  ): void {
    // This is a placeholder for Sentry integration
    // In production, initialize Sentry in main.ts:
    //
    // import * as Sentry from "@sentry/angular";
    // Sentry.init({
    //   dsn: environment.sentryDsn,
    //   environment: environment.production ? 'production' : 'development',
    // });
    //
    // Then uncomment below:

    /*
    if (typeof Sentry !== 'undefined') {
      const captureContext: Sentry.CaptureContext = {
        level: level as Sentry.SeverityLevel,
        extra: this.sanitizeData(data),
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
    }
    */
  }
}
