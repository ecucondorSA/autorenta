import { signal, WritableSignal } from '@angular/core';

/**
 * P1-023 FIX: Optimistic Updates Utility
 *
 * Enables instant UI feedback before server confirmation
 *
 * Pattern:
 * 1. User performs action
 * 2. UI updates immediately (optimistic)
 * 3. Server request is sent
 * 4. On success: keep optimistic update
 * 5. On error: revert to previous state
 *
 * Usage:
 * ```ts
 * const state = createOptimisticState({ count: 0 });
 *
 * // Optimistic update
 * const rollback = state.optimisticUpdate({ count: 1 });
 *
 * try {
 *   await serverUpdate();
 *   state.commit(); // Keep the change
 * } catch (error) {
 *   rollback(); // Revert on error
 * }
 * ```
 */

export interface OptimisticState<T> {
  /** Current state value (optimistic or committed) */
  value: WritableSignal<T>;

  /** Apply optimistic update and return rollback function */
  optimisticUpdate: (newValue: Partial<T>) => () => void;

  /** Commit the current optimistic state */
  commit: () => void;

  /** Rollback to last committed state */
  rollback: () => void;

  /** Check if there are pending optimistic updates */
  hasPendingUpdates: () => boolean;
}

export function createOptimisticState<T extends object>(initialValue: T): OptimisticState<T> {
  const valueSignal = signal<T>(initialValue);
  let committedValue: T = initialValue;
  let pendingUpdates = 0;

  return {
    value: valueSignal,

    optimisticUpdate(newValue: Partial<T>) {
      // Store previous state for rollback
      const previousValue = valueSignal();

      // Apply optimistic update
      valueSignal.set({ ...previousValue, ...newValue });
      pendingUpdates++;

      // Return rollback function
      return () => {
        valueSignal.set(previousValue);
        pendingUpdates = Math.max(0, pendingUpdates - 1);
      };
    },

    commit() {
      committedValue = valueSignal();
      pendingUpdates = 0;
    },

    rollback() {
      valueSignal.set(committedValue);
      pendingUpdates = 0;
    },

    hasPendingUpdates() {
      return pendingUpdates > 0;
    },
  };
}

/**
 * Optimistic mutation wrapper for async operations
 *
 * Usage:
 * ```ts
 * await withOptimisticUpdate(
 *   state,
 *   { status: 'loading' },
 *   async () => {
 *     return await api.updateBooking();
 *   }
 * );
 * ```
 */
export async function withOptimisticUpdate<T extends object, R>(
  state: OptimisticState<T>,
  optimisticValue: Partial<T>,
  mutationFn: () => Promise<R>,
): Promise<R> {
  const rollback = state.optimisticUpdate(optimisticValue);

  try {
    const result = await mutationFn();
    state.commit();
    return result;
  } catch (error) {
    rollback();
    throw error;
  }
}
