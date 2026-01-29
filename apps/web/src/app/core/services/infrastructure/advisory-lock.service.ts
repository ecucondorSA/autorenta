import { Injectable, inject } from '@angular/core';
import { LOCK_TIMEOUT_MS } from '@core/constants';
import { SupabaseClientService } from './supabase-client.service';
import { LoggerService } from './logger.service';

/**
 * Lock types for advisory locks
 * Using numeric prefixes to create unique lock keys
 */
export const LOCK_TYPES = {
  /** Lock for booking payment processing */
  PAYMENT_PROCESSING: 1,
  /** Lock for wallet operations */
  WALLET_OPERATION: 2,
  /** Lock for car availability check */
  CAR_AVAILABILITY: 3,
  /** Lock for booking creation */
  BOOKING_CREATE: 4,
  /** Lock for payout processing */
  PAYOUT_PROCESSING: 5,
} as const;

export type LockType = (typeof LOCK_TYPES)[keyof typeof LOCK_TYPES];

/**
 * Result of a lock acquisition attempt
 */
export interface LockResult {
  acquired: boolean;
  lockId?: number;
  error?: string;
}

/**
 * Advisory Lock Service
 *
 * Provides application-level locking using PostgreSQL advisory locks.
 * These locks are session-scoped and automatically released when the
 * database connection closes.
 *
 * Advisory locks are useful for:
 * - Preventing duplicate payment processing
 * - Ensuring only one booking can be created for a car at a time
 * - Preventing concurrent wallet operations on the same user
 *
 * How it works:
 * - Uses pg_try_advisory_lock() for non-blocking lock attempts
 * - Uses pg_advisory_unlock() to release locks
 * - Lock key is generated from lock type + resource ID hash
 *
 * @example
 * ```typescript
 * // Lock a booking for payment processing
 * const lock = await advisoryLockService.tryLock(
 *   LOCK_TYPES.PAYMENT_PROCESSING,
 *   bookingId
 * );
 *
 * if (!lock.acquired) {
 *   throw new Error('Payment already being processed');
 * }
 *
 * try {
 *   await processPayment(bookingId);
 * } finally {
 *   await advisoryLockService.unlock(
 *     LOCK_TYPES.PAYMENT_PROCESSING,
 *     bookingId
 *   );
 * }
 * ```
 *
 * Note: Advisory locks require the lock_advisory RPC function to be deployed.
 */
@Injectable({
  providedIn: 'root',
})
export class AdvisoryLockService {
  private readonly supabaseService = inject(SupabaseClientService);
  private readonly logger = inject(LoggerService);

  /** Active locks held by this service instance with metadata */
  private readonly activeLocks = new Map<
    number,
    {
      type: LockType;
      resourceId: string;
      acquiredAt: Date;
      timeoutId?: ReturnType<typeof setTimeout>;
    }
  >();

  /**
   * Try to acquire an advisory lock (non-blocking)
   *
   * @param lockType - Type of lock from LOCK_TYPES
   * @param resourceId - Unique identifier for the resource (e.g., booking_id, user_id)
   * @param timeoutMs - Optional timeout in milliseconds (default: LOCK_TIMEOUT_MS)
   * @returns LockResult indicating if lock was acquired
   */
  async tryLock(
    lockType: LockType,
    resourceId: string,
    timeoutMs: number = LOCK_TIMEOUT_MS,
  ): Promise<LockResult> {
    const lockId = this.generateLockId(lockType, resourceId);

    try {
      const supabase = this.supabaseService.getClient();

      // Use RPC to acquire advisory lock
      const { data, error } = await supabase.rpc('try_advisory_lock', {
        p_lock_key: lockId,
      });

      if (error) {
        this.logger.error('Failed to acquire advisory lock', error, {
          lockType,
          resourceId,
          lockId,
        });
        return { acquired: false, error: error.message };
      }

      const acquired = data === true;

      if (acquired) {
        // Set up timeout to automatically release the lock
        const timeoutId =
          timeoutMs > 0
            ? setTimeout(() => {
                this.handleLockTimeout(lockType, resourceId, lockId);
              }, timeoutMs)
            : undefined;

        this.activeLocks.set(lockId, {
          type: lockType,
          resourceId,
          acquiredAt: new Date(),
          timeoutId,
        });
        this.logger.debug('Advisory lock acquired', {
          lockType,
          resourceId,
          lockId,
          timeoutMs,
        });
      } else {
        this.logger.debug('Advisory lock not available', { lockType, resourceId, lockId });
      }

      return { acquired, lockId };
    } catch (err) {
      this.logger.error('Exception acquiring advisory lock', err);
      return {
        acquired: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  /**
   * Handle lock timeout - automatically release the lock
   */
  private handleLockTimeout(lockType: LockType, resourceId: string, lockId: number): void {
    this.logger.warn('Advisory lock timeout - releasing automatically', {
      lockType,
      resourceId,
      lockId,
    });
    this.unlock(lockType, resourceId).catch((err) => {
      this.logger.error('Failed to release timed-out lock', err, { lockType, resourceId });
    });
  }

  /**
   * Release an advisory lock
   *
   * @param lockType - Type of lock from LOCK_TYPES
   * @param resourceId - Unique identifier for the resource
   * @returns true if lock was released, false otherwise
   */
  async unlock(lockType: LockType, resourceId: string): Promise<boolean> {
    const lockId = this.generateLockId(lockType, resourceId);

    try {
      const supabase = this.supabaseService.getClient();

      // Clear the timeout before releasing
      const lockData = this.activeLocks.get(lockId);
      if (lockData?.timeoutId) {
        clearTimeout(lockData.timeoutId);
      }

      const { data, error } = await supabase.rpc('release_advisory_lock', {
        p_lock_key: lockId,
      });

      if (error) {
        this.logger.error('Failed to release advisory lock', error, {
          lockType,
          resourceId,
          lockId,
        });
        return false;
      }

      this.activeLocks.delete(lockId);
      this.logger.debug('Advisory lock released', { lockType, resourceId, lockId });

      return data === true;
    } catch (err) {
      this.logger.error('Exception releasing advisory lock', err);
      return false;
    }
  }

  /**
   * Execute a function while holding an advisory lock
   *
   * Automatically acquires the lock before execution and releases after,
   * even if an error is thrown.
   *
   * @param lockType - Type of lock from LOCK_TYPES
   * @param resourceId - Unique identifier for the resource
   * @param fn - Function to execute while holding the lock
   * @param options - Additional options
   * @returns Result of the function, or throws if lock couldn't be acquired
   */
  async withLock<T>(
    lockType: LockType,
    resourceId: string,
    fn: () => Promise<T>,
    options: {
      /** Error message if lock can't be acquired */
      lockFailMessage?: string;
      /** Number of retry attempts if lock fails */
      retryAttempts?: number;
      /** Delay between retry attempts in ms */
      retryDelayMs?: number;
      /** Timeout in ms for the lock (default: LOCK_TIMEOUT_MS) */
      timeoutMs?: number;
    } = {},
  ): Promise<T> {
    const {
      lockFailMessage = 'Resource is currently being processed',
      retryAttempts = 0,
      retryDelayMs = 100,
      timeoutMs = LOCK_TIMEOUT_MS,
    } = options;

    let lastError: string | undefined;

    for (let attempt = 0; attempt <= retryAttempts; attempt++) {
      if (attempt > 0) {
        await this.sleep(retryDelayMs * attempt);
      }

      const lock = await this.tryLock(lockType, resourceId, timeoutMs);

      if (lock.acquired) {
        try {
          return await fn();
        } finally {
          await this.unlock(lockType, resourceId);
        }
      }

      lastError = lock.error;
    }

    throw new Error(lastError || lockFailMessage);
  }

  /**
   * Check if a lock is held by this service instance
   */
  isLockHeld(lockType: LockType, resourceId: string): boolean {
    const lockId = this.generateLockId(lockType, resourceId);
    return this.activeLocks.has(lockId);
  }

  /**
   * Get all active locks held by this instance with acquisition time
   */
  getActiveLocks(): Array<{
    lockId: number;
    type: LockType;
    resourceId: string;
    acquiredAt: Date;
  }> {
    return Array.from(this.activeLocks.entries()).map(([lockId, data]) => ({
      lockId,
      type: data.type,
      resourceId: data.resourceId,
      acquiredAt: data.acquiredAt,
    }));
  }

  /**
   * Release all locks held by this instance
   */
  async releaseAllLocks(): Promise<number> {
    let released = 0;
    const locks = Array.from(this.activeLocks.entries());

    for (const [, data] of locks) {
      const success = await this.unlock(data.type, data.resourceId);
      if (success) released++;
    }

    this.logger.info('Released all advisory locks', { count: released });
    return released;
  }

  /**
   * Generate a unique lock ID from type and resource
   *
   * Uses a simple hash to create a consistent bigint key
   */
  private generateLockId(lockType: LockType, resourceId: string): number {
    // Create a string key from type + resource
    const keyString = `${lockType}:${resourceId}`;

    // Simple hash function (djb2 algorithm)
    let hash = 5381;
    for (let i = 0; i < keyString.length; i++) {
      hash = (hash << 5) + hash + keyString.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Add lock type prefix to avoid collisions between different lock types
    // Shift type to upper bits
    const fullKey = lockType * 1000000000 + Math.abs(hash % 1000000000);

    return fullKey;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
