import { inject, Injectable, Injector } from '@angular/core';
import { DebugService } from '@core/services/admin/debug.service';
import { environment } from '@environment';
import { LogLevel } from '../../../../environments/environment.base';

/**
 * Sentry module type definition for lazy loading
 * We only import the types, not the actual module
 */
type SentryModule = typeof import('@sentry/angular');

/**
 * Log level priority map for comparison
 * Higher number = higher priority (fewer logs)
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

/**
 * Centralized LoggerService for Angular Frontend
 *
 * Part of the centralized logging infrastructure (Issue #120).
 *
 * Features:
 * - Structured logging with LAZY-LOADED Sentry integration (saves ~238KB)
 * - Level-based filtering (debug, info, warn, error, critical)
 * - Automatic sensitive data sanitization
 * - Trace ID support for request correlation
 * - Performance and action logging
 * - [AR] prefix for ADB filtering on Android devices
 * - Integration with DebugService for in-app debug panel
 *
 * Usage:
 *   constructor(private logger: LoggerService) {}
 *
 *   // Basic logging
 *
 *   // With ChildLogger
 *   private logger = inject(LoggerService).createChildLogger('MyService');
 *   this.logger.info('Action completed'); // Auto-prefixed with [MyService]
 *
 * Log Format (Console):
 *   [AR][14:30:45.123][INFO][PaymentService] Processing payment { amount: 1000 }
 *
 * ADB Filtering:
 *   adb logcat | grep "\[AR\]"
 *
 * Production:
 * - DEBUG/INFO filtered out, only WARN/ERROR/CRITICAL sent to Sentry
 * - Sensitive data automatically redacted
 * - Trace IDs included in Sentry context
 */
@Injectable({
  providedIn: 'root',
})
export class LoggerService {
  private readonly logger = globalThis.console;
  private readonly isDevelopment = !environment.production;
  private readonly injector = inject(Injector); // Inject Injector
  private traceId?: string;
  private debugService?: DebugService;

  /** Cached Sentry module (lazy-loaded) */
  private sentryModule: SentryModule | null = null;
  private sentryLoadPromise: Promise<SentryModule> | null = null;

  /**
   * Current log level from environment configuration
   * Defaults to 'debug' in development, 'warn' in production
   */
  private readonly logLevel: LogLevel = this.resolveLogLevel();

  /**
   * Resolve log level from environment or use sensible defaults
   */
  private resolveLogLevel(): LogLevel {
    // Check environment configuration first
    const envLogLevel = (environment as { logLevel?: LogLevel }).logLevel;
    if (envLogLevel) {
      return envLogLevel;
    }
    // Default: debug in development, warn in production
    return this.isDevelopment ? 'debug' : 'warn';
  }

  /**
   * Check if a log level should be logged based on current configuration
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.logLevel];
  }

  /**
   * Set trace ID for request correlation
   */
  setTraceId(traceId: string): void {
    this.traceId = traceId;
  }

  /**
   * Get current trace ID
   */
  getTraceId(): string | undefined {
    return this.traceId;
  }

  /**
   * Generate a trace ID for request correlation
   * Format: req-{timestamp}-{random}
   */
  generateTraceId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 9);
    const traceId = `req-${timestamp}-${random}`;
    this.setTraceId(traceId);
    return traceId;
  }

  /**
   * Get DebugService lazily to avoid circular dependency
   */
  private getDebugService(): DebugService {
    if (!this.debugService) {
      // Use Injector to avoid calling inject() outside DI context
      this.debugService = this.injector.get(DebugService);
    }
    return this.debugService;
  }

  /**
   * Format timestamp for logging (HH:mm:ss.SSS)
   */
  private formatTimestamp(): string {
    return new Date().toISOString().substring(11, 23);
  }

  /**
   * Build log prefix with [AR] tag for ADB filtering
   * Format: [AR][HH:mm:ss.SSS][LEVEL][Context]
   */
  private buildLogPrefix(level: string, context?: string): string {
    const timestamp = this.formatTimestamp();
    const parts: string[] = ['[AR]', `[${timestamp}]`, level];

    if (this.traceId) {
      parts.push(`[${this.traceId.substring(0, 8)}]`);
    }

    if (context) {
      parts.push(`[${context}]`);
    }

    return parts.join('');
  }

  private looksLikeContext(value: string): boolean {
    if (!/^[A-Za-z0-9]+$/.test(value)) return false;
    return /[A-Z]/.test(value) && /[a-z]/.test(value);
  }

  private resolveLogArgs(
    message: string,
    args: unknown[],
  ): { context?: string; data?: unknown; extra: unknown[] } {
    if (args.length === 0) {
      return { extra: [] };
    }

    const [first, ...rest] = args;

    if (typeof first === 'string') {
      if (rest.length >= 1) {
        return { context: first, data: rest[0], extra: rest.slice(1) };
      }

      const messageLooksLikeData = message.trim().endsWith(':');
      if (!messageLooksLikeData && this.looksLikeContext(first)) {
        return { context: first, data: undefined, extra: [] };
      }
    }

    return { context: undefined, data: first, extra: rest };
  }

  private mergeLogData(data: unknown, extra: unknown[]): unknown {
    if (!extra.length) return data;
    const merged: unknown[] = [];
    if (data !== undefined) merged.push(data);
    merged.push(...extra);
    return merged.length === 1 ? merged[0] : merged;
  }

  private sanitizeLogArgs(data: unknown, extra: unknown[]): unknown[] {
    const safeArgs: unknown[] = [];
    if (data !== undefined) safeArgs.push(this.sanitizeData(data));
    for (const item of extra) {
      if (item !== undefined) safeArgs.push(this.sanitizeData(item));
    }
    return safeArgs;
  }

  /**
   * Log to DebugService for in-app panel
   */
  private logToDebugService(
    level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL',
    context: string,
    message: string,
    data?: unknown,
  ): void {
    try {
      const debug = this.getDebugService();
      if (debug.isEnabled()) {
        debug.log(level, context || 'App', message, this.sanitizeData(data));
      }
    } catch {
      // Ignore if DebugService not available
    }
  }

  /**
   * Debug level: Detailed diagnostic information
   * Respects logLevel configuration from environment
   */
  debug(message: string, ...args: unknown[]): void {
    const { context, data, extra } = this.resolveLogArgs(message, args);
    const mergedData = this.mergeLogData(data, extra);
    // Always log to DebugService if enabled
    this.logToDebugService('DEBUG', context || 'App', message, mergedData);

    // Only log to console if log level allows
    if (this.shouldLog('debug')) {
      const safeArgs = this.sanitizeLogArgs(data, extra);
      const prefix = this.buildLogPrefix('[DEBUG]', context);
      this.logger.debug(`${prefix} ${message}`, ...safeArgs);
    }
  }

  /**
   * Info level: Informational messages
   * Respects logLevel configuration from environment
   */
  info(message: string, ...args: unknown[]): void {
    const { context, data, extra } = this.resolveLogArgs(message, args);
    const mergedData = this.mergeLogData(data, extra);
    // Always log to DebugService if enabled
    this.logToDebugService('INFO', context || 'App', message, mergedData);

    // Only log to console if log level allows
    if (this.shouldLog('info')) {
      const safeArgs = this.sanitizeLogArgs(data, extra);
      const prefix = this.buildLogPrefix('[INFO]', context);
      this.logger.debug(`${prefix} ${message}`, ...safeArgs);
    }
    // INFO is never sent to Sentry (too noisy)
  }

  /**
   * Warn level: Warning messages
   * Respects logLevel configuration from environment
   * Always sent to Sentry in production
   */
  warn(message: string, ...args: unknown[]): void {
    const { context, data, extra } = this.resolveLogArgs(message, args);
    const mergedData = this.mergeLogData(data, extra);
    // Always log to DebugService if enabled
    this.logToDebugService('WARN', context || 'App', message, mergedData);

    const prefix = this.buildLogPrefix('[WARN]', context);
    // Log to console if log level allows
    if (this.shouldLog('warn')) {
      const safeArgs = this.sanitizeLogArgs(data, extra);
      this.logger.warn(`${prefix} ${message}`, ...safeArgs);
    }
    // Always send warnings to Sentry in production
    if (!this.isDevelopment) {
      this.sendToSentry('warning', message, mergedData);
    }
  }

  /**
   * Error level: Error conditions
   * Respects logLevel for console output
   * ALWAYS sent to Sentry with full stack trace
   */
  error(message: string, ...args: unknown[]): void {
    const { context, data, extra } = this.resolveLogArgs(message, args);
    const mergedData = this.mergeLogData(data, extra);
    // Always log to DebugService if enabled
    this.logToDebugService('ERROR', context || 'App', message, mergedData);

    // Log to console if log level allows
    if (this.shouldLog('error')) {
      const safeArgs = this.sanitizeLogArgs(data, extra);
      const prefix = this.buildLogPrefix('[ERROR]', context);
      this.logger.error(`${prefix} ${message}`, ...safeArgs);
    }

    // Always report errors to Sentry
    if (mergedData instanceof Error) {
      this.sendToSentry('error', message, mergedData);
    } else if (mergedData !== undefined) {
      this.sendToSentry('error', message, new Error(String(mergedData)));
    } else {
      this.sendToSentry('error', message, new Error(message));
    }
  }

  /**
   * Critical level: Critical errors that may cause downtime
   * Respects logLevel for console output
   * ALWAYS sent to Sentry with highest priority
   */
  critical(message: string, ...args: unknown[]): void {
    const { context, data, extra } = this.resolveLogArgs(message, args);
    const mergedData = this.mergeLogData(data, extra);
    // Always log to DebugService if enabled
    this.logToDebugService('CRITICAL', context || 'App', message, mergedData);

    // Critical errors always log to console (even if log level is 'silent')
    // because critical errors should never be silenced locally
    const safeArgs = this.sanitizeLogArgs(data, extra);
    const prefix = this.buildLogPrefix('[CRITICAL]', context);
    this.logger.error(`${prefix} ${message}`, ...safeArgs);

    // Always send to Sentry
    this.sendToSentry('fatal', message, mergedData);
  }

  /**
   * Log user action for analytics
   * Useful for tracking user behavior
   */
  logAction(action: string, metadata?: Record<string, unknown>): void {
    const safeMeta = this.sanitizeData(metadata);
    if (this.isDevelopment) {
      this.logger.debug(`[ACTION] ${action}`, safeMeta);
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
      this.logger.debug(`[PERF] ${message}`, safeMeta);
    } else {
      this.sendToSentry(level, message, safeMeta);
    }
  }

  /**
   * Log a business-critical error (e.g. Payment Failed, Booking Failed)
   * Always sent to Sentry with high priority and specific tag.
   */
  logBusinessError(event: string, metadata?: Record<string, unknown>): void {
    const message = `[BUSINESS_ERROR] ${event}`;
    const safeMeta = this.sanitizeData(metadata);

    // Always log to console
    this.logger.error(this.buildLogPrefix('[BUSINESS]', 'Business'), message, safeMeta);

    // Always send to Sentry with tag
    void this.sendToSentryAsync('error', message, safeMeta).then(async () => {
      const Sentry = await this.getSentry();
      if (Sentry) {
        Sentry.setTag('business_event', event);
      }
    });
  }

  /**
   * Log a security event (e.g. Brute Force, Auth Fail)
   * Always sent to Sentry with high priority.
   */
  logSecurityEvent(event: string, metadata?: Record<string, unknown>): void {
    const message = `[SECURITY_EVENT] ${event}`;
    const safeMeta = this.sanitizeData(metadata);

    // Always log to console
    this.logger.warn(this.buildLogPrefix('[SECURITY]', 'Security'), message, safeMeta);

    // Always send to Sentry with tag
    void this.sendToSentryAsync('warning', message, safeMeta).then(async () => {
      const Sentry = await this.getSentry();
      if (Sentry) {
        Sentry.setTag('security_event', event);
      }
    });
  }

  /**
   * Remove sensitive data from logs (tokens, passwords, etc)
   * @private
   */
  private sanitizeData(data: unknown): unknown {
    if (data === null || data === undefined) return undefined;

    if (data instanceof Error) {
      return {
        name: data.name,
        message: this.sanitizeData(data.message),
        stack: this.isDevelopment && data.stack ? this.sanitizeData(data.stack) : undefined,
      };
    }

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
   * Lazy-load Sentry module (saves ~238KB from initial bundle)
   * Caches the module for subsequent calls
   * @private
   */
  private async getSentry(): Promise<SentryModule | null> {
    // Return cached module if available
    if (this.sentryModule) {
      return this.sentryModule;
    }

    // Only load Sentry if DSN is configured
    if (!environment.sentryDsn) {
      return null;
    }

    // Reuse existing load promise to avoid duplicate imports
    if (!this.sentryLoadPromise) {
      this.sentryLoadPromise = import('@sentry/angular')
        .then((module) => {
          this.sentryModule = module;
          return module;
        })
        .catch((err) => {
          console.error('Failed to load Sentry:', err);
          this.sentryLoadPromise = null;
          return null;
        }) as unknown as Promise<SentryModule>;
    }

    return this.sentryLoadPromise;
  }

  /**
   * Send log to Sentry (production)
   * Uses lazy loading to avoid including Sentry in the initial bundle
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

    // Use void to indicate we're intentionally not awaiting this async operation
    void this.sendToSentryAsync(level, message, data);
  }

  /**
   * Async implementation of sendToSentry
   * @private
   */
  private async sendToSentryAsync(
    level: 'debug' | 'info' | 'warning' | 'error' | 'fatal',
    message: string,
    data?: unknown,
  ): Promise<void> {
    try {
      const Sentry = await this.getSentry();
      if (!Sentry) return;

      const captureContext = {
        level: level as 'debug' | 'info' | 'warning' | 'error' | 'fatal',
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
    } catch (e: unknown) {
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

  debug(message: string, ...args: unknown[]): void {
    this.parent.debug(message, this.context, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    this.parent.info(message, this.context, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.parent.warn(message, this.context, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    this.parent.error(message, this.context, ...args);
  }

  critical(message: string, ...args: unknown[]): void {
    this.parent.critical(message, this.context, ...args);
  }
}
