/**
 * Centralized Logger for Cloudflare Workers
 *
 * Part of the centralized logging infrastructure (Issue #120).
 *
 * Features:
 * - Structured JSON output for log aggregation
 * - Level-based filtering (debug, info, warn, error)
 * - Automatic sensitive data sanitization
 * - ISO 8601 timestamp formatting
 * - Trace ID support for request correlation
 * - Service identifier for multi-service environments
 * - Context support for worker/module identification
 *
 * Usage:
 * ```typescript
 * import { logger, fromRequest } from './logger';
 *
 * // From request (automatically extracts/generates trace ID)
 * const log = fromRequest(request);
 * log.info('Processing payment', { paymentId: '123' });
 *
 * // With custom trace ID
 * const requestLogger = withTraceId('req-abc-123');
 * requestLogger.info('Payment processed');
 *
 * // Child logger with context
 * const paymentLog = log.child('PaymentProcessor');
 * paymentLog.error('Payment failed', error);
 * ```
 *
 * Log Format (JSON):
 * ```json
 * {
 *   "level": "INFO",
 *   "timestamp": "2025-11-07T10:30:45.123Z",
 *   "service": "worker",
 *   "worker": "payments-webhook",
 *   "trace_id": "req-abc-123",
 *   "message": "Payment processed",
 *   "context": "PaymentProcessor",
 *   "data": { "paymentId": "123" }
 * }
 * ```
 *
 * Production:
 * - DEBUG and INFO are filtered out (only WARN and ERROR logged)
 * - Sensitive data is automatically redacted
 * - Logs are output as JSON for ingestion by Cloudflare Logpush
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
  service: string;
  worker?: string;
  trace_id?: string;
  message: string;
  context?: string;
  data?: unknown;
  error?: unknown;
  /** Additional custom metadata */
  metadata?: Record<string, unknown>;
}

class Logger {
  private readonly isProduction: boolean;
  private readonly minLevel: LogLevel;
  private readonly serviceName: string;
  private readonly workerName?: string;
  private traceId?: string;
  private defaultContext?: string;
  private readonly outputJson: boolean;

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
    'supabase_service_role_key',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];

  constructor(options?: {
    traceId?: string;
    context?: string;
    serviceName?: string;
    workerName?: string;
    outputJson?: boolean;
    isProduction?: boolean;
  }) {
    // Check if running in production
    // Cloudflare Workers don't have a standard env var for this,
    // so we check multiple possible indicators
    this.isProduction =
      options?.isProduction ??
      (typeof ENVIRONMENT !== 'undefined' && ENVIRONMENT === 'production') ||
      false;

    // Production: Only WARN and ERROR
    // Development: All levels
    this.minLevel = this.isProduction ? LogLevel.WARN : LogLevel.DEBUG;

    // Service identification
    this.serviceName = options?.serviceName || 'worker';
    this.workerName = options?.workerName;
    this.traceId = options?.traceId;
    this.defaultContext = options?.context;

    // Output format: JSON for production (easier to parse), human-readable for dev
    this.outputJson = options?.outputJson ?? this.isProduction;
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
   * Create a child logger with the same trace ID but different context
   */
  child(context: string): Logger {
    return new Logger({
      traceId: this.traceId,
      context,
      serviceName: this.serviceName,
      workerName: this.workerName,
      outputJson: this.outputJson,
      isProduction: this.isProduction,
    });
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
    metadata?: Record<string, unknown>,
  ): void {
    // Filter by minimum level
    if (level < this.minLevel) {
      return;
    }

    // Build log entry with full context
    const entry: LogEntry = {
      level: LogLevel[level],
      timestamp: new Date().toISOString(),
      service: this.serviceName,
      worker: this.workerName,
      trace_id: this.traceId,
      message,
      context: context || this.defaultContext,
      data: data ? this.sanitizeData(data) : undefined,
      error: error ? this.formatError(error) : undefined,
      metadata: metadata
        ? (this.sanitizeData(metadata) as Record<string, unknown>)
        : undefined,
    };

    // Output to console
    this.outputToConsole(entry);
  }

  /**
   * Output log entry to console
   */
  private outputToConsole(entry: LogEntry): void {
    if (this.outputJson) {
      // JSON output for production/aggregation
      // Remove undefined fields for cleaner JSON
      const cleanEntry = Object.fromEntries(
        Object.entries(entry).filter(([_, v]) => v !== undefined),
      );
      const jsonString = JSON.stringify(cleanEntry);

      // Use appropriate console method based on level
      switch (entry.level) {
        case 'DEBUG':
        case 'INFO':
          console.log(jsonString);
          break;
        case 'WARN':
          console.warn(jsonString);
          break;
        case 'ERROR':
          console.error(jsonString);
          break;
      }
    } else {
      // Human-readable output for development
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
  }

  /**
   * Build log prefix (for human-readable output)
   */
  private buildPrefix(entry: LogEntry): string {
    const parts: string[] = [entry.level];

    if (entry.trace_id) {
      parts.push(`[${entry.trace_id.substring(0, 8)}]`);
    }

    if (entry.context) {
      parts.push(`[${entry.context}]`);
    }

    parts.push(entry.message);

    return parts.join(' ');
  }

  /**
   * Build log data object (for human-readable output)
   */
  private buildLogData(entry: LogEntry): unknown {
    const data: Record<string, unknown> = {};

    if (entry.data) {
      data.data = entry.data;
    }

    if (entry.error) {
      data.error = entry.error;
    }

    if (entry.metadata) {
      data.metadata = entry.metadata;
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
      lowerKey.includes(sensitiveKey.toLowerCase()),
    );
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger();

/**
 * Generate a trace ID for request correlation
 * Format: req-{timestamp}-{random}
 */
export function generateTraceId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `req-${timestamp}-${random}`;
}

/**
 * Extract trace ID from request headers
 * Supports standard headers: X-Trace-Id, X-Request-Id, X-Correlation-Id
 */
export function extractTraceId(headers: Headers): string | undefined {
  return (
    headers.get('x-trace-id') ||
    headers.get('x-request-id') ||
    headers.get('x-correlation-id') ||
    undefined
  );
}

/**
 * Create a logger with trace ID for request correlation
 *
 * Usage:
 * ```typescript
 * const requestLogger = withTraceId('req-abc-123');
 * requestLogger.info('Processing payment', { amount: 1000 });
 * ```
 */
export function withTraceId(traceId?: string, workerName?: string): Logger {
  return new Logger({
    traceId: traceId || generateTraceId(),
    workerName,
  });
}

/**
 * Create a logger from HTTP request
 * Automatically extracts or generates trace ID
 *
 * Usage:
 * ```typescript
 * const log = fromRequest(request, 'payments-webhook');
 * log.info('Request received');
 * ```
 */
export function fromRequest(request: Request, workerName?: string): Logger {
  const traceId = extractTraceId(request.headers) || generateTraceId();
  return new Logger({ traceId, workerName });
}

/**
 * Create a child logger with fixed context
 *
 * Usage:
 * ```typescript
 * const log = createChildLogger('PaymentProcessor');
 * log.info('Payment received');
 * ```
 */
export function createChildLogger(context: string): Logger {
  return logger.child(context);
}
