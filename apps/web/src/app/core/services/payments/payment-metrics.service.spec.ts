import { TestBed } from '@angular/core/testing';
import { testProviders } from '@app/testing/test-providers';
import { CircuitBreakerService } from '@core/services/infrastructure/circuit-breaker.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { PaymentMetricsService, PaymentMetricRecord, AlertType } from './payment-metrics.service';

describe('PaymentMetricsService', () => {
  let service: PaymentMetricsService;
  let mockLogger: jasmine.SpyObj<LoggerService>;
  let mockCircuitBreaker: jasmine.SpyObj<CircuitBreakerService>;

  beforeEach(() => {
    mockLogger = jasmine.createSpyObj('LoggerService', ['info', 'warn', 'error', 'debug']);
    mockCircuitBreaker = jasmine.createSpyObj('CircuitBreakerService', [
      'getAllStats',
      'getStats',
      'isOpen',
    ]);

    mockCircuitBreaker.getAllStats.and.returnValue([]);
    mockCircuitBreaker.isOpen.and.returnValue(false);

    TestBed.configureTestingModule({
      providers: [...testProviders, PaymentMetricsService,
        { provide: LoggerService, useValue: mockLogger },
        { provide: CircuitBreakerService, useValue: mockCircuitBreaker },],
    });

    service = TestBed.inject(PaymentMetricsService);
  });

  afterEach(() => {
    service.clearMetrics();
  });

  describe('Recording Metrics', () => {
    it('should record a successful payment', () => {
      service.recordPayment({
        bookingId: 'booking-123',
        method: 'card',
        outcome: 'success',
        durationMs: 1500,
        amount: 10000,
      });

      const stats = service.getStats();
      expect(stats.totalPayments).toBe(1);
      expect(stats.successCount).toBe(1);
      expect(stats.successRate).toBe(100);
    });

    it('should record a rejected payment', () => {
      service.recordPayment({
        bookingId: 'booking-456',
        method: 'card',
        outcome: 'rejected',
        durationMs: 800,
        errorCode: 'cc_rejected_insufficient_amount',
        errorMessage: 'Insufficient funds',
      });

      const stats = service.getStats();
      expect(stats.totalPayments).toBe(1);
      expect(stats.rejectedCount).toBe(1);
      expect(stats.successRate).toBe(0);
    });

    it('should record an error payment', () => {
      service.recordPayment({
        bookingId: 'booking-789',
        method: 'wallet',
        outcome: 'error',
        durationMs: 3000,
        errorCode: 'SERVICE_UNAVAILABLE',
        errorMessage: 'MercadoPago is down',
      });

      const stats = service.getStats();
      expect(stats.errorCount).toBe(1);
      expect(stats.errorsByCode['SERVICE_UNAVAILABLE']).toBe(1);
    });

    it('should log each recorded payment', () => {
      service.recordPayment({
        bookingId: 'booking-123',
        method: 'card',
        outcome: 'success',
        durationMs: 1000,
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Payment metric recorded',
        jasmine.objectContaining({
          bookingId: 'booking-123',
          method: 'card',
          outcome: 'success',
        }),
      );
    });
  });

  describe('Statistics Calculation', () => {
    it('should calculate correct success rate', () => {
      // 7 successes, 3 failures = 70% success rate
      for (let i = 0; i < 7; i++) {
        service.recordPayment({
          bookingId: `success-${i}`,
          method: 'card',
          outcome: 'success',
          durationMs: 1000,
        });
      }
      for (let i = 0; i < 3; i++) {
        service.recordPayment({
          bookingId: `failure-${i}`,
          method: 'card',
          outcome: 'rejected',
          durationMs: 800,
        });
      }

      const stats = service.getStats();
      expect(stats.successRate).toBe(70);
    });

    it('should calculate average duration', () => {
      service.recordPayment({
        bookingId: 'b1',
        method: 'card',
        outcome: 'success',
        durationMs: 1000,
      });
      service.recordPayment({
        bookingId: 'b2',
        method: 'card',
        outcome: 'success',
        durationMs: 2000,
      });
      service.recordPayment({
        bookingId: 'b3',
        method: 'card',
        outcome: 'success',
        durationMs: 3000,
      });

      const stats = service.getStats();
      expect(stats.averageDurationMs).toBe(2000);
    });

    it('should calculate P95 duration', () => {
      // Add 20 payments with increasing durations
      for (let i = 1; i <= 20; i++) {
        service.recordPayment({
          bookingId: `booking-${i}`,
          method: 'card',
          outcome: 'success',
          durationMs: i * 100, // 100, 200, 300, ..., 2000
        });
      }

      const stats = service.getStats();
      // P95 of 100-2000 should be ~1900
      expect(stats.p95DurationMs).toBeGreaterThanOrEqual(1900);
    });

    it('should track errors by code', () => {
      service.recordPayment({
        bookingId: 'b1',
        method: 'card',
        outcome: 'rejected',
        durationMs: 500,
        errorCode: 'cc_rejected_insufficient_amount',
      });
      service.recordPayment({
        bookingId: 'b2',
        method: 'card',
        outcome: 'rejected',
        durationMs: 500,
        errorCode: 'cc_rejected_insufficient_amount',
      });
      service.recordPayment({
        bookingId: 'b3',
        method: 'card',
        outcome: 'error',
        durationMs: 500,
        errorCode: 'NETWORK_ERROR',
      });

      const stats = service.getStats();
      expect(stats.errorsByCode['cc_rejected_insufficient_amount']).toBe(2);
      expect(stats.errorsByCode['NETWORK_ERROR']).toBe(1);
    });

    it('should track last payment timestamp', () => {
      const beforeRecord = new Date();
      service.recordPayment({
        bookingId: 'b1',
        method: 'card',
        outcome: 'success',
        durationMs: 1000,
      });
      const afterRecord = new Date();

      const stats = service.getStats();
      expect(stats.lastPaymentAt).not.toBeNull();
      expect(stats.lastPaymentAt!.getTime()).toBeGreaterThanOrEqual(beforeRecord.getTime());
      expect(stats.lastPaymentAt!.getTime()).toBeLessThanOrEqual(afterRecord.getTime());
    });

    it('should return empty stats when no payments recorded', () => {
      const stats = service.getStats();
      expect(stats.totalPayments).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.averageDurationMs).toBe(0);
      expect(stats.lastPaymentAt).toBeNull();
    });
  });

  describe('Rolling Window', () => {
    it('should maintain rolling window of 100 payments', () => {
      // Record 150 payments
      for (let i = 0; i < 150; i++) {
        service.recordPayment({
          bookingId: `booking-${i}`,
          method: 'card',
          outcome: 'success',
          durationMs: 1000,
        });
      }

      const stats = service.getStats();
      expect(stats.totalPayments).toBe(100);
    });

    it('should keep most recent payments in window', () => {
      // Record 110 payments - first 50 success, last 60 failures
      for (let i = 0; i < 50; i++) {
        service.recordPayment({
          bookingId: `success-${i}`,
          method: 'card',
          outcome: 'success',
          durationMs: 1000,
        });
      }
      for (let i = 0; i < 60; i++) {
        service.recordPayment({
          bookingId: `failure-${i}`,
          method: 'card',
          outcome: 'rejected',
          durationMs: 1000,
        });
      }

      // Window should have 40 successes, 60 failures (last 100)
      const stats = service.getStats();
      expect(stats.totalPayments).toBe(100);
      expect(stats.successCount).toBe(40);
      expect(stats.rejectedCount).toBe(60);
    });
  });

  describe('Circuit Breaker Integration', () => {
    it('should return circuit statuses', () => {
      mockCircuitBreaker.getAllStats.and.returnValue([
        {
          name: 'mercadopago-payment',
          state: 'CLOSED',
          failures: 0,
          successes: 10,
          lastFailure: null,
          lastSuccess: new Date(),
          lastStateChange: new Date(),
          totalCalls: 10,
          totalFailures: 0,
          totalSuccesses: 10,
        },
        {
          name: 'binance',
          state: 'OPEN',
          failures: 3,
          successes: 0,
          lastFailure: new Date(),
          lastSuccess: null,
          lastStateChange: new Date(),
          totalCalls: 5,
          totalFailures: 3,
          totalSuccesses: 2,
        },
      ]);

      const statuses = service.getCircuitStatuses();
      expect(statuses.length).toBe(2);
      expect(statuses[0].name).toBe('mercadopago-payment');
      expect(statuses[0].state).toBe('CLOSED');
      expect(statuses[1].name).toBe('binance');
      expect(statuses[1].state).toBe('OPEN');
    });

    it('should report healthy when all circuits closed', () => {
      mockCircuitBreaker.getAllStats.and.returnValue([
        {
          name: 'circuit-1',
          state: 'CLOSED',
          failures: 0,
          successes: 5,
          lastFailure: null,
          lastSuccess: new Date(),
          lastStateChange: new Date(),
          totalCalls: 5,
          totalFailures: 0,
          totalSuccesses: 5,
        },
      ]);

      expect(service.isHealthy()).toBeTrue();
    });

    it('should report unhealthy when any circuit open', () => {
      mockCircuitBreaker.getAllStats.and.returnValue([
        {
          name: 'circuit-1',
          state: 'CLOSED',
          failures: 0,
          successes: 5,
          lastFailure: null,
          lastSuccess: new Date(),
          lastStateChange: new Date(),
          totalCalls: 5,
          totalFailures: 0,
          totalSuccesses: 5,
        },
        {
          name: 'circuit-2',
          state: 'OPEN',
          failures: 3,
          successes: 0,
          lastFailure: new Date(),
          lastSuccess: null,
          lastStateChange: new Date(),
          totalCalls: 3,
          totalFailures: 3,
          totalSuccesses: 0,
        },
      ]);

      expect(service.isHealthy()).toBeFalse();
    });

    it('should check specific circuit health', () => {
      mockCircuitBreaker.isOpen.and.callFake((name: string) => name === 'broken-circuit');

      expect(service.isCircuitHealthy('good-circuit')).toBeTrue();
      expect(service.isCircuitHealthy('broken-circuit')).toBeFalse();
    });
  });

  describe('Payment Method Tracking', () => {
    it('should track card payments', () => {
      service.recordPayment({
        bookingId: 'b1',
        method: 'card',
        outcome: 'success',
        durationMs: 1000,
      });

      const records = service.getRecentRecords(1);
      expect(records[0].method).toBe('card');
    });

    it('should track wallet payments', () => {
      service.recordPayment({
        bookingId: 'b1',
        method: 'wallet',
        outcome: 'success',
        durationMs: 500,
      });

      const records = service.getRecentRecords(1);
      expect(records[0].method).toBe('wallet');
    });

    it('should track paypal payments', () => {
      service.recordPayment({
        bookingId: 'b1',
        method: 'paypal',
        outcome: 'success',
        durationMs: 2000,
      });

      const records = service.getRecentRecords(1);
      expect(records[0].method).toBe('paypal');
    });
  });

  describe('Outcome Types', () => {
    it('should track timeout outcomes', () => {
      service.recordPayment({
        bookingId: 'b1',
        method: 'card',
        outcome: 'timeout',
        durationMs: 30000,
      });

      const stats = service.getStats();
      expect(stats.timeoutCount).toBe(1);
    });

    it('should track circuit_open outcomes', () => {
      service.recordPayment({
        bookingId: 'b1',
        method: 'card',
        outcome: 'circuit_open',
        durationMs: 0,
        errorCode: 'CIRCUIT_OPEN',
      });

      const stats = service.getStats();
      expect(stats.circuitOpenCount).toBe(1);
    });
  });

  describe('Recent Records', () => {
    it('should return recent records with limit', () => {
      for (let i = 0; i < 10; i++) {
        service.recordPayment({
          bookingId: `booking-${i}`,
          method: 'card',
          outcome: 'success',
          durationMs: 1000,
        });
      }

      const records = service.getRecentRecords(5);
      expect(records.length).toBe(5);
      expect(records[4].bookingId).toBe('booking-9');
    });

    it('should return all records if less than limit', () => {
      service.recordPayment({
        bookingId: 'b1',
        method: 'card',
        outcome: 'success',
        durationMs: 1000,
      });
      service.recordPayment({
        bookingId: 'b2',
        method: 'card',
        outcome: 'success',
        durationMs: 1000,
      });

      const records = service.getRecentRecords(10);
      expect(records.length).toBe(2);
    });
  });

  describe('Clear Metrics', () => {
    it('should clear all metrics', () => {
      for (let i = 0; i < 10; i++) {
        service.recordPayment({
          bookingId: `booking-${i}`,
          method: 'card',
          outcome: 'success',
          durationMs: 1000,
        });
      }

      expect(service.getStats().totalPayments).toBe(10);

      service.clearMetrics();

      expect(service.getStats().totalPayments).toBe(0);
      expect(mockLogger.info).toHaveBeenCalledWith('Payment metrics cleared');
    });
  });

  describe('Alert Configuration', () => {
    it('should have default alert configuration', () => {
      const config = service.getAlertConfig();
      expect(config.minSuccessRatePercent).toBe(80);
      expect(config.maxAvgDurationMs).toBe(10000);
      expect(config.minPaymentsForEvaluation).toBe(5);
    });

    it('should allow configuring alert thresholds', () => {
      service.configureAlerts({
        minSuccessRatePercent: 90,
        maxAvgDurationMs: 5000,
      });

      const config = service.getAlertConfig();
      expect(config.minSuccessRatePercent).toBe(90);
      expect(config.maxAvgDurationMs).toBe(5000);
    });
  });

  describe('Alert Triggering', () => {
    beforeEach(() => {
      // Configure low cooldown for tests
      service.configureAlerts({
        alertCooldownMs: 0,
        minPaymentsForEvaluation: 5,
      });
    });

    it('should trigger alert when circuit breaker opens', () => {
      // Add minimum payments first
      for (let i = 0; i < 5; i++) {
        service.recordPayment({
          bookingId: `success-${i}`,
          method: 'card',
          outcome: 'success',
          durationMs: 1000,
        });
      }

      // Record circuit open
      service.recordPayment({
        bookingId: 'circuit-open-booking',
        method: 'card',
        outcome: 'circuit_open',
        durationMs: 0,
        errorCode: 'CIRCUIT_OPEN',
      });

      const alerts = service.getAlerts();
      expect(alerts.some((a) => a.type === 'circuit_open')).toBeTrue();
    });

    it('should trigger alert when success rate drops below threshold', () => {
      // Configure lower threshold
      service.configureAlerts({
        minSuccessRatePercent: 80,
        alertCooldownMs: 0,
        minPaymentsForEvaluation: 5,
      });

      // 2 successes, 4 failures = 33% success rate (below 80%)
      for (let i = 0; i < 2; i++) {
        service.recordPayment({
          bookingId: `success-${i}`,
          method: 'card',
          outcome: 'success',
          durationMs: 1000,
        });
      }
      for (let i = 0; i < 4; i++) {
        service.recordPayment({
          bookingId: `failure-${i}`,
          method: 'card',
          outcome: 'rejected',
          durationMs: 800,
          errorCode: 'cc_rejected',
        });
      }

      const alerts = service.getAlerts();
      expect(alerts.some((a) => a.type === 'low_success_rate')).toBeTrue();
    });

    it('should trigger alert when latency exceeds threshold', () => {
      service.configureAlerts({
        maxAvgDurationMs: 5000,
        alertCooldownMs: 0,
        minPaymentsForEvaluation: 3,
      });

      // Record slow payments
      for (let i = 0; i < 5; i++) {
        service.recordPayment({
          bookingId: `slow-${i}`,
          method: 'card',
          outcome: 'success',
          durationMs: 8000, // 8 seconds
        });
      }

      const alerts = service.getAlerts();
      expect(alerts.some((a) => a.type === 'high_latency')).toBeTrue();
    });

    it('should trigger alert on error spike', () => {
      service.configureAlerts({
        alertCooldownMs: 0,
        minPaymentsForEvaluation: 3,
      });

      // 3 initial successes
      for (let i = 0; i < 3; i++) {
        service.recordPayment({
          bookingId: `success-${i}`,
          method: 'card',
          outcome: 'success',
          durationMs: 1000,
        });
      }

      // 3 consecutive errors
      for (let i = 0; i < 3; i++) {
        service.recordPayment({
          bookingId: `error-${i}`,
          method: 'card',
          outcome: 'error',
          durationMs: 5000,
          errorCode: 'SERVICE_UNAVAILABLE',
        });
      }

      const alerts = service.getAlerts();
      expect(alerts.some((a) => a.type === 'error_spike')).toBeTrue();
    });

    it('should log alerts with warning level', () => {
      // Setup
      for (let i = 0; i < 5; i++) {
        service.recordPayment({
          bookingId: `success-${i}`,
          method: 'card',
          outcome: 'success',
          durationMs: 1000,
        });
      }

      // Trigger circuit open alert
      service.recordPayment({
        bookingId: 'trigger-alert',
        method: 'card',
        outcome: 'circuit_open',
        durationMs: 0,
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        jasmine.stringMatching(/PAYMENT ALERT \[circuit_open\]/),
        jasmine.any(Object),
      );
    });
  });

  describe('Alert Cooldown', () => {
    it('should not trigger same alert type within cooldown period', () => {
      service.configureAlerts({
        alertCooldownMs: 60000, // 1 minute cooldown
        minPaymentsForEvaluation: 3,
      });

      // Setup: 3 payments to meet minimum
      for (let i = 0; i < 3; i++) {
        service.recordPayment({
          bookingId: `success-${i}`,
          method: 'card',
          outcome: 'success',
          durationMs: 1000,
        });
      }

      // First circuit open alert
      service.recordPayment({
        bookingId: 'first-circuit-open',
        method: 'card',
        outcome: 'circuit_open',
        durationMs: 0,
      });

      // Second circuit open - should be blocked by cooldown
      service.recordPayment({
        bookingId: 'second-circuit-open',
        method: 'card',
        outcome: 'circuit_open',
        durationMs: 0,
      });

      const alerts = service.getAlerts();
      const circuitOpenAlerts = alerts.filter((a) => a.type === 'circuit_open');
      expect(circuitOpenAlerts.length).toBe(1);
    });

    it('should allow different alert types independently', () => {
      service.configureAlerts({
        alertCooldownMs: 60000,
        minPaymentsForEvaluation: 3,
        maxAvgDurationMs: 1000,
      });

      // 3 slow failures to trigger both low_success_rate and high_latency
      for (let i = 0; i < 3; i++) {
        service.recordPayment({
          bookingId: `slow-failure-${i}`,
          method: 'card',
          outcome: 'rejected',
          durationMs: 5000,
          errorCode: 'cc_rejected',
        });
      }

      const alerts = service.getAlerts();
      expect(alerts.some((a) => a.type === 'low_success_rate')).toBeTrue();
      expect(alerts.some((a) => a.type === 'high_latency')).toBeTrue();
    });
  });

  describe('Alert Clearing', () => {
    it('should clear all alerts', () => {
      service.configureAlerts({
        alertCooldownMs: 0,
        minPaymentsForEvaluation: 3,
      });

      // Trigger an alert
      for (let i = 0; i < 5; i++) {
        service.recordPayment({
          bookingId: `payment-${i}`,
          method: 'card',
          outcome: 'circuit_open',
          durationMs: 0,
        });
      }

      expect(service.getAlerts().length).toBeGreaterThan(0);

      service.clearAlerts();

      expect(service.getAlerts().length).toBe(0);
    });
  });
});
