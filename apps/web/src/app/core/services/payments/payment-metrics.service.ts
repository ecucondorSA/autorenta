import { Injectable, inject, signal, computed } from '@angular/core';
import {
  METRICS_WINDOW_SIZE,
  ALERT_COOLDOWN_MS,
  MIN_SUCCESS_RATE_PERCENT,
  MAX_AVG_DURATION_MS,
} from '@core/constants';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import {
  CircuitBreakerService,
  CircuitStats,
} from '@core/services/infrastructure/circuit-breaker.service';
import { environment } from '../../../../environments/environment';

/**
 * Payment method types for metrics tracking
 */
export type MetricsPaymentMethod = 'card' | 'wallet' | 'paypal';

/**
 * Payment outcome types
 */
export type PaymentOutcome = 'success' | 'rejected' | 'error' | 'timeout' | 'circuit_open';

/**
 * Individual payment metric record
 */
export interface PaymentMetricRecord {
  timestamp: Date;
  bookingId: string;
  method: MetricsPaymentMethod;
  outcome: PaymentOutcome;
  durationMs: number;
  errorCode?: string;
  errorMessage?: string;
  amount?: number;
}

/**
 * Aggregated payment statistics
 */
export interface PaymentStats {
  totalPayments: number;
  successCount: number;
  rejectedCount: number;
  errorCount: number;
  timeoutCount: number;
  circuitOpenCount: number;
  successRate: number;
  averageDurationMs: number;
  p95DurationMs: number;
  lastPaymentAt: Date | null;
  errorsByCode: Record<string, number>;
}

/**
 * Circuit breaker status for dashboard
 */
export interface CircuitStatus {
  name: string;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failures: number;
  successes: number;
  lastFailure: Date | null;
  lastSuccess: Date | null;
}

/**
 * Alert configuration for critical thresholds
 */
export interface AlertConfig {
  /** Minimum success rate before alerting (default: 80%) */
  minSuccessRatePercent: number;
  /** Maximum average duration before alerting (default: 10s) */
  maxAvgDurationMs: number;
  /** Minimum payments in window before evaluating (default: 5) */
  minPaymentsForEvaluation: number;
  /** Cooldown between alerts of same type (default: 5 min) */
  alertCooldownMs: number;
}

/**
 * Alert event types
 */
export type AlertType = 'low_success_rate' | 'high_latency' | 'circuit_open' | 'error_spike';

/**
 * Alert record
 */
export interface AlertRecord {
  type: AlertType;
  timestamp: Date;
  message: string;
  data: Record<string, unknown>;
}

/**
 * Payment Metrics Service
 *
 * Tracks and aggregates payment metrics for monitoring and debugging.
 * Integrates with circuit breaker for system health visibility.
 *
 * Features:
 * - Real-time payment tracking (success/failure/errors)
 * - Processing time metrics with P95
 * - Error categorization by code
 * - Circuit breaker status integration
 * - Sentry metric reporting
 * - Rolling window stats (last 100 payments)
 * - Critical error alerting with thresholds
 *
 * @example
 * ```typescript
 * // Track a payment
 * const startTime = Date.now();
 * try {
 *   const result = await processPayment();
 *   metricsService.recordPayment({
 *     bookingId: 'abc123',
 *     method: 'card',
 *     outcome: 'success',
 *     durationMs: Date.now() - startTime,
 *     amount: 1500
 *   });
 * } catch (error) {
 *   metricsService.recordPayment({
 *     bookingId: 'abc123',
 *     method: 'card',
 *     outcome: 'error',
 *     durationMs: Date.now() - startTime,
 *     errorCode: 'PAYMENT_DECLINED',
 *     errorMessage: error.message
 *   });
 * }
 *
 * // Get current stats
 * const stats = metricsService.getStats();
 * console.log(`Success rate: ${stats.successRate}%`);
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class PaymentMetricsService {
  private readonly logger = inject(LoggerService);
  private readonly circuitBreaker = inject(CircuitBreakerService);

  /** Default alert configuration (uses centralized constants) */
  private readonly DEFAULT_ALERT_CONFIG: AlertConfig = {
    minSuccessRatePercent: MIN_SUCCESS_RATE_PERCENT,
    maxAvgDurationMs: MAX_AVG_DURATION_MS,
    minPaymentsForEvaluation: 5,
    alertCooldownMs: ALERT_COOLDOWN_MS,
  };

  /** Current alert configuration */
  private alertConfig: AlertConfig = { ...this.DEFAULT_ALERT_CONFIG };

  /** Payment records in rolling window */
  private readonly records = signal<PaymentMetricRecord[]>([]);

  /** Alert history */
  private readonly alerts = signal<AlertRecord[]>([]);

  /** Last alert timestamps by type (for cooldown) */
  private readonly lastAlertByType = new Map<AlertType, number>();

  /** Computed stats from rolling window */
  readonly stats = computed<PaymentStats>(() => this.calculateStats(this.records()));

  /** Circuit breaker statuses */
  readonly circuitStatuses = computed<CircuitStatus[]>(() => {
    const allStats = this.circuitBreaker.getAllStats();
    return allStats.map(this.mapCircuitStats);
  });

  /** Quick health check - true if all circuits healthy */
  readonly isHealthy = computed(() => {
    const statuses = this.circuitStatuses();
    return statuses.every((s) => s.state === 'CLOSED');
  });

  /** Recent alerts signal */
  readonly recentAlerts = computed(() => this.alerts().slice(-10));

  /** Sentry module for lazy loading */
  private sentryModule: typeof import('@sentry/angular') | null = null;
  private sentryLoadPromise: Promise<typeof import('@sentry/angular') | null> | null = null;

  /**
   * Record a payment metric
   */
  recordPayment(metric: Omit<PaymentMetricRecord, 'timestamp'>): void {
    const record: PaymentMetricRecord = {
      ...metric,
      timestamp: new Date(),
    };

    // Add to rolling window
    this.records.update((current) => {
      const updated = [...current, record];
      // Keep only last METRICS_WINDOW_SIZE records
      if (updated.length > METRICS_WINDOW_SIZE) {
        return updated.slice(-METRICS_WINDOW_SIZE);
      }
      return updated;
    });

    // Log the metric
    this.logger.info('Payment metric recorded', {
      bookingId: record.bookingId,
      method: record.method,
      outcome: record.outcome,
      durationMs: record.durationMs,
      errorCode: record.errorCode,
    });

    // Send to Sentry for aggregated monitoring
    void this.sendToSentry(record);

    // Check for critical alert conditions
    this.checkAlertConditions(record);
  }

  /**
   * Configure alert thresholds
   */
  configureAlerts(config: Partial<AlertConfig>): void {
    this.alertConfig = { ...this.alertConfig, ...config };
    this.logger.info('Alert configuration updated', { config: this.alertConfig });
  }

  /**
   * Get current alert configuration
   */
  getAlertConfig(): AlertConfig {
    return { ...this.alertConfig };
  }

  /**
   * Get all alert records
   */
  getAlerts(): AlertRecord[] {
    return this.alerts();
  }

  /**
   * Clear alert history
   */
  clearAlerts(): void {
    this.alerts.set([]);
    this.lastAlertByType.clear();
    this.logger.info('Alert history cleared');
  }

  /**
   * Get current payment stats
   */
  getStats(): PaymentStats {
    return this.stats();
  }

  /**
   * Get all circuit breaker statuses
   */
  getCircuitStatuses(): CircuitStatus[] {
    return this.circuitStatuses();
  }

  /**
   * Check if specific circuit is healthy
   */
  isCircuitHealthy(circuitName: string): boolean {
    return !this.circuitBreaker.isOpen(circuitName);
  }

  /**
   * Get specific circuit stats
   */
  getCircuitStats(circuitName: string): CircuitStats | null {
    return this.circuitBreaker.getStats(circuitName);
  }

  /**
   * Get recent payment records (for debugging)
   */
  getRecentRecords(limit = 10): PaymentMetricRecord[] {
    return this.records().slice(-limit);
  }

  /**
   * Clear all metrics (useful for testing)
   */
  clearMetrics(): void {
    this.records.set([]);
    this.logger.info('Payment metrics cleared');
  }

  /**
   * Check alert conditions and trigger alerts if thresholds crossed
   */
  private checkAlertConditions(record: PaymentMetricRecord): void {
    const stats = this.stats();

    // Skip if not enough data
    if (stats.totalPayments < this.alertConfig.minPaymentsForEvaluation) {
      return;
    }

    // Check for circuit open
    if (record.outcome === 'circuit_open') {
      this.triggerAlert('circuit_open', `Circuit breaker is OPEN - payments blocked`, {
        bookingId: record.bookingId,
        errorCode: record.errorCode,
      });
    }

    // Check for low success rate
    if (stats.successRate < this.alertConfig.minSuccessRatePercent) {
      this.triggerAlert(
        'low_success_rate',
        `Payment success rate dropped to ${stats.successRate}% (threshold: ${this.alertConfig.minSuccessRatePercent}%)`,
        {
          successRate: stats.successRate,
          threshold: this.alertConfig.minSuccessRatePercent,
          totalPayments: stats.totalPayments,
          failures: stats.rejectedCount + stats.errorCount,
        },
      );
    }

    // Check for high latency
    if (stats.averageDurationMs > this.alertConfig.maxAvgDurationMs) {
      this.triggerAlert(
        'high_latency',
        `Payment processing time increased to ${stats.averageDurationMs}ms (threshold: ${this.alertConfig.maxAvgDurationMs}ms)`,
        {
          averageDurationMs: stats.averageDurationMs,
          p95DurationMs: stats.p95DurationMs,
          threshold: this.alertConfig.maxAvgDurationMs,
        },
      );
    }

    // Check for error spike (more than 3 consecutive errors)
    const recentRecords = this.records().slice(-5);
    const consecutiveErrors = recentRecords.filter(
      (r) => r.outcome === 'error' || r.outcome === 'timeout',
    ).length;
    if (consecutiveErrors >= 3) {
      this.triggerAlert(
        'error_spike',
        `Error spike detected: ${consecutiveErrors} infrastructure errors in last 5 payments`,
        {
          consecutiveErrors,
          recentErrors: recentRecords
            .filter((r) => r.outcome === 'error' || r.outcome === 'timeout')
            .map((r) => ({ errorCode: r.errorCode, errorMessage: r.errorMessage })),
        },
      );
    }
  }

  /**
   * Trigger an alert if not in cooldown
   */
  private triggerAlert(type: AlertType, message: string, data: Record<string, unknown>): void {
    const now = Date.now();
    const lastAlert = this.lastAlertByType.get(type) || 0;

    // Check cooldown
    if (now - lastAlert < this.alertConfig.alertCooldownMs) {
      return; // Skip, still in cooldown
    }

    // Create alert record
    const alert: AlertRecord = {
      type,
      timestamp: new Date(),
      message,
      data,
    };

    // Add to history
    this.alerts.update((current) => [...current.slice(-99), alert]);

    // Update last alert timestamp
    this.lastAlertByType.set(type, now);

    // Log as warning/error
    this.logger.warn(`PAYMENT ALERT [${type}]: ${message}`, data);

    // Send to Sentry
    void this.sendAlertToSentry(alert);
  }

  /**
   * Send alert to Sentry
   */
  private async sendAlertToSentry(alert: AlertRecord): Promise<void> {
    if (!environment.sentryDsn) return;

    const Sentry = await this.getSentry();
    if (!Sentry) return;

    const severity = alert.type === 'circuit_open' ? 'error' : 'warning';

    Sentry.captureMessage(`Payment Alert: ${alert.message}`, {
      level: severity,
      tags: {
        alert_type: alert.type,
        category: 'payment_monitoring',
      },
      extra: alert.data,
    });
  }

  /**
   * Calculate aggregated stats from records
   */
  private calculateStats(records: PaymentMetricRecord[]): PaymentStats {
    const total = records.length;

    if (total === 0) {
      return {
        totalPayments: 0,
        successCount: 0,
        rejectedCount: 0,
        errorCount: 0,
        timeoutCount: 0,
        circuitOpenCount: 0,
        successRate: 0,
        averageDurationMs: 0,
        p95DurationMs: 0,
        lastPaymentAt: null,
        errorsByCode: {},
      };
    }

    const successCount = records.filter((r) => r.outcome === 'success').length;
    const rejectedCount = records.filter((r) => r.outcome === 'rejected').length;
    const errorCount = records.filter((r) => r.outcome === 'error').length;
    const timeoutCount = records.filter((r) => r.outcome === 'timeout').length;
    const circuitOpenCount = records.filter((r) => r.outcome === 'circuit_open').length;

    const durations = records.map((r) => r.durationMs).sort((a, b) => a - b);
    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / total;
    const p95Index = Math.floor(total * 0.95);
    const p95Duration = durations[p95Index] || durations[durations.length - 1];

    const errorsByCode: Record<string, number> = {};
    records
      .filter((r) => r.errorCode)
      .forEach((r) => {
        const code = r.errorCode!;
        errorsByCode[code] = (errorsByCode[code] || 0) + 1;
      });

    const lastRecord = records[records.length - 1];

    return {
      totalPayments: total,
      successCount,
      rejectedCount,
      errorCount,
      timeoutCount,
      circuitOpenCount,
      successRate: Math.round((successCount / total) * 100),
      averageDurationMs: Math.round(avgDuration),
      p95DurationMs: Math.round(p95Duration),
      lastPaymentAt: lastRecord?.timestamp || null,
      errorsByCode,
    };
  }

  /**
   * Map circuit breaker stats to display format
   */
  private mapCircuitStats(stats: CircuitStats): CircuitStatus {
    return {
      name: stats.name,
      state: stats.state,
      failures: stats.failures,
      successes: stats.successes,
      lastFailure: stats.lastFailure,
      lastSuccess: stats.lastSuccess,
    };
  }

  /**
   * Lazy load Sentry module
   */
  private async getSentry(): Promise<typeof import('@sentry/angular') | null> {
    if (this.sentryModule) {
      return this.sentryModule;
    }

    if (!environment.sentryDsn) {
      return null;
    }

    if (!this.sentryLoadPromise) {
      this.sentryLoadPromise = import('@sentry/angular')
        .then((module) => {
          this.sentryModule = module;
          return module;
        })
        .catch((err) => {
          this.logger.error('Failed to load Sentry for metrics', err);
          this.sentryLoadPromise = null;
          return null;
        });
    }

    return this.sentryLoadPromise;
  }

  /**
   * Send metric to Sentry for aggregated monitoring
   */
  private async sendToSentry(record: PaymentMetricRecord): Promise<void> {
    if (!environment.sentryDsn || !environment.production) return;

    const Sentry = await this.getSentry();
    if (!Sentry) return;

    // Add as breadcrumb for debugging
    Sentry.addBreadcrumb({
      category: 'payment',
      message: `Payment ${record.outcome}`,
      level: record.outcome === 'success' ? 'info' : 'warning',
      data: {
        bookingId: record.bookingId,
        method: record.method,
        durationMs: record.durationMs,
        errorCode: record.errorCode,
      },
    });

    // Set payment context
    Sentry.getCurrentScope().setContext('payment_metrics', {
      method: record.method,
      outcome: record.outcome,
      duration_ms: record.durationMs,
      error_code: record.errorCode,
    });

    // Capture as event for failures
    if (record.outcome !== 'success') {
      Sentry.captureMessage(`Payment ${record.outcome}: ${record.errorCode || 'Unknown'}`, {
        level: 'warning',
        tags: {
          payment_method: record.method,
          payment_outcome: record.outcome,
          error_code: record.errorCode || 'none',
        },
        extra: {
          bookingId: record.bookingId,
          durationMs: record.durationMs,
          errorMessage: record.errorMessage,
        },
      });
    }
  }
}
