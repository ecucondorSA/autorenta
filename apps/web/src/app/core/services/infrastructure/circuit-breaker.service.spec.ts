import { TestBed } from '@angular/core/testing';
import {
  CircuitBreakerService,
  CircuitOpenError,
  CircuitState,
} from './circuit-breaker.service';
import { LoggerService } from './logger.service';

describe('CircuitBreakerService', () => {
  let service: CircuitBreakerService;
  let mockLogger: jasmine.SpyObj<LoggerService>;

  beforeEach(() => {
    mockLogger = jasmine.createSpyObj('LoggerService', ['info', 'warn', 'error', 'debug']);

    TestBed.configureTestingModule({
      providers: [
        CircuitBreakerService,
        { provide: LoggerService, useValue: mockLogger },
      ],
    });

    service = TestBed.inject(CircuitBreakerService);
  });

  afterEach(() => {
    service.resetAll();
  });

  describe('Basic Functionality', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should execute successful operations', async () => {
      const result = await service.execute('test-circuit', async () => {
        return 'success';
      });

      expect(result).toBe('success');
    });

    it('should propagate errors from the wrapped function', async () => {
      await expectAsync(
        service.execute('test-circuit', async () => {
          throw new Error('Test error');
        })
      ).toBeRejectedWithError('Test error');
    });

    it('should track circuit statistics', async () => {
      await service.execute('stats-test', async () => 'ok');

      const stats = service.getStats('stats-test');
      expect(stats).toBeTruthy();
      expect(stats?.totalCalls).toBe(1);
      expect(stats?.totalSuccesses).toBe(1);
      expect(stats?.state).toBe('CLOSED');
    });
  });

  describe('Circuit Opening (Failure Threshold)', () => {
    it('should open circuit after 3 consecutive failures (default threshold)', async () => {
      const circuitName = 'failure-test';

      // Fail 3 times
      for (let i = 0; i < 3; i++) {
        await expectAsync(
          service.execute(circuitName, async () => {
            throw new Error(`Failure ${i + 1}`);
          })
        ).toBeRejected();
      }

      // Circuit should now be open
      expect(service.isOpen(circuitName)).toBeTrue();

      // Next call should fail with CircuitOpenError
      await expectAsync(
        service.execute(circuitName, async () => 'should not reach')
      ).toBeRejectedWith(jasmine.any(CircuitOpenError));
    });

    it('should not open circuit if failures are below threshold', async () => {
      const circuitName = 'below-threshold';

      // Fail 2 times (below default threshold of 3)
      for (let i = 0; i < 2; i++) {
        await expectAsync(
          service.execute(circuitName, async () => {
            throw new Error(`Failure ${i + 1}`);
          })
        ).toBeRejected();
      }

      // Circuit should still be closed
      expect(service.isOpen(circuitName)).toBeFalse();

      // Next call should execute normally
      const result = await service.execute(circuitName, async () => 'success after failures');
      expect(result).toBe('success after failures');
    });

    it('should reset failure count on success', async () => {
      const circuitName = 'reset-on-success';

      // Fail 2 times
      for (let i = 0; i < 2; i++) {
        await expectAsync(
          service.execute(circuitName, async () => {
            throw new Error('Failure');
          })
        ).toBeRejected();
      }

      // Success resets counter
      await service.execute(circuitName, async () => 'success');

      // Fail 2 more times - should not open because counter was reset
      for (let i = 0; i < 2; i++) {
        await expectAsync(
          service.execute(circuitName, async () => {
            throw new Error('Failure');
          })
        ).toBeRejected();
      }

      // Circuit should still be closed
      expect(service.isOpen(circuitName)).toBeFalse();
    });
  });

  describe('Circuit Recovery (Half-Open State)', () => {
    it('should transition to half-open after reset timeout', async () => {
      const circuitName = 'recovery-test';
      const shortTimeout = 100; // 100ms for testing

      // Configure with short timeout
      for (let i = 0; i < 3; i++) {
        await expectAsync(
          service.execute(circuitName, async () => {
            throw new Error('Failure');
          }, { resetTimeout: shortTimeout, failureThreshold: 3 })
        ).toBeRejected();
      }

      expect(service.isOpen(circuitName)).toBeTrue();

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, shortTimeout + 50));

      // Next call should attempt (half-open state)
      const result = await service.execute(circuitName, async () => 'recovered');
      expect(result).toBe('recovered');
    });

    it('should close circuit after successful recovery', async () => {
      const circuitName = 'close-after-recovery';
      const shortTimeout = 100;

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await expectAsync(
          service.execute(circuitName, async () => {
            throw new Error('Failure');
          }, { resetTimeout: shortTimeout, failureThreshold: 3, successThreshold: 2 })
        ).toBeRejected();
      }

      // Wait for reset
      await new Promise(resolve => setTimeout(resolve, shortTimeout + 50));

      // Two successful calls should close the circuit
      await service.execute(circuitName, async () => 'success 1');
      await service.execute(circuitName, async () => 'success 2');

      const stats = service.getStats(circuitName);
      expect(stats?.state).toBe('CLOSED');
    });

    it('should re-open circuit on failure during half-open', async () => {
      const circuitName = 're-open-test';
      const shortTimeout = 100;

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await expectAsync(
          service.execute(circuitName, async () => {
            throw new Error('Failure');
          }, { resetTimeout: shortTimeout, failureThreshold: 3 })
        ).toBeRejected();
      }

      // Wait for reset
      await new Promise(resolve => setTimeout(resolve, shortTimeout + 50));

      // Fail during half-open - should re-open
      await expectAsync(
        service.execute(circuitName, async () => {
          throw new Error('Failed during recovery');
        })
      ).toBeRejected();

      expect(service.isOpen(circuitName)).toBeTrue();
    });
  });

  describe('Custom Configuration', () => {
    it('should use custom failure threshold', async () => {
      const circuitName = 'custom-threshold';

      // Fail 5 times with threshold of 5
      for (let i = 0; i < 5; i++) {
        await expectAsync(
          service.execute(circuitName, async () => {
            throw new Error('Failure');
          }, { failureThreshold: 5 })
        ).toBeRejected();
      }

      expect(service.isOpen(circuitName)).toBeTrue();
    });

    it('should use predefined mercadopago configuration', async () => {
      const circuitName = 'mercadopago';

      // Default threshold for mercadopago is 3
      for (let i = 0; i < 3; i++) {
        await expectAsync(
          service.execute(circuitName, async () => {
            throw new Error('MP Failure');
          })
        ).toBeRejected();
      }

      expect(service.isOpen(circuitName)).toBeTrue();
    });
  });

  describe('Manual Reset', () => {
    it('should allow manual reset of a circuit', async () => {
      const circuitName = 'manual-reset';

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await expectAsync(
          service.execute(circuitName, async () => {
            throw new Error('Failure');
          })
        ).toBeRejected();
      }

      expect(service.isOpen(circuitName)).toBeTrue();

      // Manual reset
      service.reset(circuitName);

      expect(service.isOpen(circuitName)).toBeFalse();

      // Should be able to execute again
      const result = await service.execute(circuitName, async () => 'after reset');
      expect(result).toBe('after reset');
    });

    it('should reset all circuits', async () => {
      // Open two circuits
      for (let i = 0; i < 3; i++) {
        await expectAsync(service.execute('circuit-1', async () => { throw new Error('Fail'); })).toBeRejected();
        await expectAsync(service.execute('circuit-2', async () => { throw new Error('Fail'); })).toBeRejected();
      }

      expect(service.isOpen('circuit-1')).toBeTrue();
      expect(service.isOpen('circuit-2')).toBeTrue();

      service.resetAll();

      expect(service.isOpen('circuit-1')).toBeFalse();
      expect(service.isOpen('circuit-2')).toBeFalse();
    });
  });

  describe('Statistics', () => {
    it('should track all calls and outcomes', async () => {
      const circuitName = 'stats-tracking';

      // 3 successes
      for (let i = 0; i < 3; i++) {
        await service.execute(circuitName, async () => 'success');
      }

      // 2 failures
      for (let i = 0; i < 2; i++) {
        await expectAsync(
          service.execute(circuitName, async () => {
            throw new Error('Failure');
          })
        ).toBeRejected();
      }

      const stats = service.getStats(circuitName);
      expect(stats?.totalCalls).toBe(5);
      expect(stats?.totalSuccesses).toBe(3);
      expect(stats?.totalFailures).toBe(2);
    });

    it('should return all circuit stats', async () => {
      await service.execute('circuit-a', async () => 'a');
      await service.execute('circuit-b', async () => 'b');
      await service.execute('circuit-c', async () => 'c');

      const allStats = service.getAllStats();
      expect(allStats.length).toBe(3);
      expect(allStats.map(s => s.name).sort()).toEqual(['circuit-a', 'circuit-b', 'circuit-c']);
    });

    it('should return null for non-existent circuit', () => {
      const stats = service.getStats('non-existent');
      expect(stats).toBeNull();
    });
  });

  describe('CircuitOpenError', () => {
    it('should include retry information', async () => {
      const circuitName = 'error-info';

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await expectAsync(
          service.execute(circuitName, async () => {
            throw new Error('Failure');
          })
        ).toBeRejected();
      }

      try {
        await service.execute(circuitName, async () => 'should fail');
        fail('Should have thrown CircuitOpenError');
      } catch (error) {
        expect(error instanceof CircuitOpenError).toBeTrue();
        const circuitError = error as CircuitOpenError;
        expect(circuitError.retryAfter).toBeTruthy();
        expect(circuitError.retryAfter! > new Date()).toBeTrue();
      }
    });
  });

  describe('Logging', () => {
    it('should log circuit creation', async () => {
      await service.execute('new-circuit', async () => 'test');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Circuit "new-circuit" created',
        jasmine.any(Object)
      );
    });

    it('should log failures', async () => {
      await expectAsync(
        service.execute('log-failure', async () => {
          throw new Error('Test failure');
        })
      ).toBeRejected();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Circuit "log-failure" failure #1',
        jasmine.objectContaining({ error: 'Test failure' })
      );
    });

    it('should log state transitions', async () => {
      const circuitName = 'log-transition';

      for (let i = 0; i < 3; i++) {
        await expectAsync(
          service.execute(circuitName, async () => {
            throw new Error('Failure');
          })
        ).toBeRejected();
      }

      expect(mockLogger.info).toHaveBeenCalledWith(
        `Circuit "${circuitName}" transitioned: CLOSED -> OPEN`,
        jasmine.any(Object)
      );
    });
  });
});
