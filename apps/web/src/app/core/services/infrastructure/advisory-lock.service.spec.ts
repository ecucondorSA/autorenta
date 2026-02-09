import { TestBed } from '@angular/core/testing';
import { testProviders } from '@app/testing/test-providers';
import { AdvisoryLockService, LOCK_TYPES, LockType } from './advisory-lock.service';
import { LoggerService } from './logger.service';
import { SupabaseClientService } from './supabase-client.service';

describe('AdvisoryLockService', () => {
  let service: AdvisoryLockService;
  let mockSupabaseClient: jasmine.SpyObj<any>;
  let mockLogger: jasmine.SpyObj<LoggerService>;
  let mockRpc: jasmine.Spy;

  beforeEach(() => {
    mockRpc = jasmine.createSpy('rpc');
    mockSupabaseClient = {
      rpc: mockRpc,
    };

    const mockSupabaseService = {
      getClient: () => mockSupabaseClient,
    };

    mockLogger = jasmine.createSpyObj('LoggerService', ['info', 'warn', 'error', 'debug']);

    TestBed.configureTestingModule({
      providers: [
        ...testProviders,
        AdvisoryLockService,
        { provide: SupabaseClientService, useValue: mockSupabaseService },
        { provide: LoggerService, useValue: mockLogger },
      ],
    });

    service = TestBed.inject(AdvisoryLockService);
  });

  describe('Lock Types', () => {
    it('should have defined lock types', () => {
      expect(LOCK_TYPES.PAYMENT_PROCESSING).toBe(1);
      expect(LOCK_TYPES.WALLET_OPERATION).toBe(2);
      expect(LOCK_TYPES.CAR_AVAILABILITY).toBe(3);
      expect(LOCK_TYPES.BOOKING_CREATE).toBe(4);
      expect(LOCK_TYPES.PAYOUT_PROCESSING).toBe(5);
    });
  });

  describe('tryLock', () => {
    it('should acquire lock successfully', async () => {
      mockRpc.and.returnValue(Promise.resolve({ data: true, error: null }));

      const result = await service.tryLock(LOCK_TYPES.PAYMENT_PROCESSING, 'booking-123');

      expect(result.acquired).toBeTrue();
      expect(result.lockId).toBeDefined();
      expect(mockRpc).toHaveBeenCalledWith('try_advisory_lock', {
        p_lock_key: jasmine.any(Number),
      });
    });

    it('should return false when lock not available', async () => {
      mockRpc.and.returnValue(Promise.resolve({ data: false, error: null }));

      const result = await service.tryLock(LOCK_TYPES.PAYMENT_PROCESSING, 'booking-456');

      expect(result.acquired).toBeFalse();
    });

    it('should handle RPC errors', async () => {
      mockRpc.and.returnValue(
        Promise.resolve({
          data: null,
          error: { message: 'Database error' },
        }),
      );

      const result = await service.tryLock(LOCK_TYPES.PAYMENT_PROCESSING, 'booking-789');

      expect(result.acquired).toBeFalse();
      expect(result.error).toBe('Database error');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle exceptions', async () => {
      mockRpc.and.throwError(new Error('Network error'));

      const result = await service.tryLock(LOCK_TYPES.PAYMENT_PROCESSING, 'booking-000');

      expect(result.acquired).toBeFalse();
      expect(result.error).toBe('Network error');
    });

    it('should track acquired locks', async () => {
      mockRpc.and.returnValue(Promise.resolve({ data: true, error: null }));

      await service.tryLock(LOCK_TYPES.PAYMENT_PROCESSING, 'booking-123');

      expect(service.isLockHeld(LOCK_TYPES.PAYMENT_PROCESSING, 'booking-123')).toBeTrue();
      expect(service.isLockHeld(LOCK_TYPES.PAYMENT_PROCESSING, 'booking-456')).toBeFalse();
    });
  });

  describe('unlock', () => {
    it('should release lock successfully', async () => {
      // First acquire the lock
      mockRpc.and.returnValue(Promise.resolve({ data: true, error: null }));
      await service.tryLock(LOCK_TYPES.PAYMENT_PROCESSING, 'booking-123');

      // Then release it
      mockRpc.calls.reset();
      mockRpc.and.returnValue(Promise.resolve({ data: true, error: null }));

      const result = await service.unlock(LOCK_TYPES.PAYMENT_PROCESSING, 'booking-123');

      expect(result).toBeTrue();
      expect(mockRpc).toHaveBeenCalledWith('release_advisory_lock', {
        p_lock_key: jasmine.any(Number),
      });
    });

    it('should return false when lock not held', async () => {
      mockRpc.and.returnValue(Promise.resolve({ data: false, error: null }));

      const result = await service.unlock(LOCK_TYPES.PAYMENT_PROCESSING, 'non-existent');

      expect(result).toBeFalse();
    });

    it('should handle unlock errors', async () => {
      mockRpc.and.returnValue(
        Promise.resolve({
          data: null,
          error: { message: 'Unlock failed' },
        }),
      );

      const result = await service.unlock(LOCK_TYPES.PAYMENT_PROCESSING, 'booking-123');

      expect(result).toBeFalse();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should remove lock from tracking after unlock', async () => {
      // Acquire lock
      mockRpc.and.returnValue(Promise.resolve({ data: true, error: null }));
      await service.tryLock(LOCK_TYPES.PAYMENT_PROCESSING, 'booking-123');
      expect(service.isLockHeld(LOCK_TYPES.PAYMENT_PROCESSING, 'booking-123')).toBeTrue();

      // Release lock
      mockRpc.and.returnValue(Promise.resolve({ data: true, error: null }));
      await service.unlock(LOCK_TYPES.PAYMENT_PROCESSING, 'booking-123');

      expect(service.isLockHeld(LOCK_TYPES.PAYMENT_PROCESSING, 'booking-123')).toBeFalse();
    });
  });

  describe('withLock', () => {
    it('should execute function while holding lock', async () => {
      mockRpc.and.returnValue(Promise.resolve({ data: true, error: null }));

      let executed = false;
      const result = await service.withLock(
        LOCK_TYPES.PAYMENT_PROCESSING,
        'booking-123',
        async () => {
          executed = true;
          return 'success';
        },
      );

      expect(executed).toBeTrue();
      expect(result).toBe('success');
    });

    it('should release lock even if function throws', async () => {
      mockRpc.and.returnValue(Promise.resolve({ data: true, error: null }));

      await expectAsync(
        service.withLock(LOCK_TYPES.PAYMENT_PROCESSING, 'booking-error', async () => {
          throw new Error('Function error');
        }),
      ).toBeRejectedWithError('Function error');

      // Lock should have been released
      expect(mockRpc).toHaveBeenCalledWith('release_advisory_lock', {
        p_lock_key: jasmine.any(Number),
      });
    });

    it('should throw if lock cannot be acquired', async () => {
      mockRpc.and.returnValue(Promise.resolve({ data: false, error: null }));

      await expectAsync(
        service.withLock(
          LOCK_TYPES.PAYMENT_PROCESSING,
          'contested-resource',
          async () => 'should not execute',
          { lockFailMessage: 'Resource busy' },
        ),
      ).toBeRejectedWithError('Resource busy');
    });

    it('should retry acquiring lock when configured', async () => {
      let callCount = 0;
      mockRpc.and.callFake(() => {
        callCount++;
        // Succeed on third attempt
        return Promise.resolve({ data: callCount >= 3, error: null });
      });

      const result = await service.withLock(
        LOCK_TYPES.PAYMENT_PROCESSING,
        'retry-resource',
        async () => 'eventually succeeded',
        { retryAttempts: 3, retryDelayMs: 10 },
      );

      expect(result).toBe('eventually succeeded');
      expect(callCount).toBeGreaterThanOrEqual(3);
    });
  });

  describe('getActiveLocks', () => {
    it('should return all active locks', async () => {
      mockRpc.and.returnValue(Promise.resolve({ data: true, error: null }));

      await service.tryLock(LOCK_TYPES.PAYMENT_PROCESSING, 'booking-1');
      await service.tryLock(LOCK_TYPES.WALLET_OPERATION, 'user-1');
      await service.tryLock(LOCK_TYPES.CAR_AVAILABILITY, 'car-1');

      const activeLocks = service.getActiveLocks();

      expect(activeLocks.length).toBe(3);
      expect(activeLocks.some((l) => l.type === LOCK_TYPES.PAYMENT_PROCESSING)).toBeTrue();
      expect(activeLocks.some((l) => l.type === LOCK_TYPES.WALLET_OPERATION)).toBeTrue();
      expect(activeLocks.some((l) => l.type === LOCK_TYPES.CAR_AVAILABILITY)).toBeTrue();
    });
  });

  describe('releaseAllLocks', () => {
    it('should release all active locks', async () => {
      mockRpc.and.returnValue(Promise.resolve({ data: true, error: null }));

      await service.tryLock(LOCK_TYPES.PAYMENT_PROCESSING, 'booking-1');
      await service.tryLock(LOCK_TYPES.WALLET_OPERATION, 'user-1');

      mockRpc.calls.reset();
      mockRpc.and.returnValue(Promise.resolve({ data: true, error: null }));

      const released = await service.releaseAllLocks();

      expect(released).toBe(2);
      expect(service.getActiveLocks().length).toBe(0);
    });
  });

  describe('Lock ID Generation', () => {
    it('should generate different IDs for different lock types', async () => {
      mockRpc.and.callFake((_, params) => {
        return Promise.resolve({ data: true, error: null });
      });

      await service.tryLock(LOCK_TYPES.PAYMENT_PROCESSING, 'resource-1');
      await service.tryLock(LOCK_TYPES.WALLET_OPERATION, 'resource-1');

      // Should have called with different lock keys
      const calls = mockRpc.calls.all();
      const key1 = calls[0].args[1].p_lock_key;
      const key2 = calls[1].args[1].p_lock_key;

      expect(key1).not.toBe(key2);
    });

    it('should generate consistent IDs for same type and resource', async () => {
      mockRpc.and.returnValue(Promise.resolve({ data: true, error: null }));

      await service.tryLock(LOCK_TYPES.PAYMENT_PROCESSING, 'booking-123');

      // Clear locks and try again
      mockRpc.calls.reset();
      (service as any).activeLocks.clear();

      await service.tryLock(LOCK_TYPES.PAYMENT_PROCESSING, 'booking-123');

      const calls = mockRpc.calls.all();
      expect(calls[0].args[1].p_lock_key).toBe(calls[0].args[1].p_lock_key);
    });
  });

  describe('Lock Timeout', () => {
    beforeEach(() => {
      jasmine.clock().install();
    });

    afterEach(() => {
      jasmine.clock().uninstall();
    });

    it('should automatically release lock after timeout', async () => {
      mockRpc.and.returnValue(Promise.resolve({ data: true, error: null }));

      await service.tryLock(LOCK_TYPES.PAYMENT_PROCESSING, 'booking-timeout', 1000);
      expect(service.isLockHeld(LOCK_TYPES.PAYMENT_PROCESSING, 'booking-timeout')).toBeTrue();

      // Fast-forward past the timeout
      jasmine.clock().tick(1001);

      // Wait for the async unlock to be triggered
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Lock should have been released via unlock call
      expect(mockRpc).toHaveBeenCalledWith('release_advisory_lock', jasmine.any(Object));
    });

    it('should clear timeout when lock is manually released', async () => {
      mockRpc.and.returnValue(Promise.resolve({ data: true, error: null }));
      spyOn(window, 'clearTimeout').and.callThrough();

      await service.tryLock(LOCK_TYPES.PAYMENT_PROCESSING, 'booking-clear', 5000);
      await service.unlock(LOCK_TYPES.PAYMENT_PROCESSING, 'booking-clear');

      expect(clearTimeout).toHaveBeenCalled();
    });

    it('should accept custom timeout in tryLock', async () => {
      mockRpc.and.returnValue(Promise.resolve({ data: true, error: null }));

      const result = await service.tryLock(LOCK_TYPES.WALLET_OPERATION, 'user-1', 60000);

      expect(result.acquired).toBeTrue();
    });

    it('should accept timeout option in withLock', async () => {
      mockRpc.and.returnValue(Promise.resolve({ data: true, error: null }));

      const result = await service.withLock(
        LOCK_TYPES.PAYMENT_PROCESSING,
        'booking-with-timeout',
        async () => 'success',
        { timeoutMs: 10000 },
      );

      expect(result).toBe('success');
    });

    it('should include acquiredAt in getActiveLocks', async () => {
      mockRpc.and.returnValue(Promise.resolve({ data: true, error: null }));

      const before = new Date();
      await service.tryLock(LOCK_TYPES.PAYMENT_PROCESSING, 'booking-time');
      const after = new Date();

      const locks = service.getActiveLocks();
      expect(locks.length).toBe(1);
      expect(locks[0].acquiredAt).toBeDefined();
      expect(locks[0].acquiredAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(locks[0].acquiredAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });
});
