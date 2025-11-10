/**
 * Signal Helpers
 *
 * Utilities for working with Angular Signals and RxJS integration.
 * Provides type-safe wrappers and helpers for common reactive patterns.
 */

import { Signal } from '@angular/core';
import { toSignal, ToSignalOptions } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';

/**
 * Extended options for toSignalSafe wrapper
 */
export interface ToSignalSafeOptions<T> extends Omit<ToSignalOptions<T>, 'requireSync'> {
  /**
   * Whether to throw an error if the observable doesn't emit synchronously
   * @default false
   */
  requireSync?: boolean;
}

/**
 * Type-safe wrapper for toSignal() that provides better defaults
 * and clearer error messages.
 *
 * Benefits:
 * - Automatic memory cleanup when component is destroyed
 * - Type-safe with better inference
 * - Consistent error handling
 *
 * @param source$ - Observable to convert to signal
 * @param options - Configuration options
 * @returns Signal that reflects the latest value from the observable
 *
 * @example
 * ```typescript
 * // Basic usage
 * const userSignal = toSignalSafe(this.userService.user$);
 *
 * // With initial value
 * const balanceSignal = toSignalSafe(this.walletService.balance$, {
 *   initialValue: null
 * });
 *
 * // Require sync emission (throws if no sync value)
 * const configSignal = toSignalSafe(this.config$, {
 *   requireSync: true
 * });
 * ```
 */
export function toSignalSafe<T>(
  source$: Observable<T>,
  options?: ToSignalSafeOptions<T & undefined>
): Signal<T | undefined>;

export function toSignalSafe<T>(
  source$: Observable<T>,
  options: ToSignalSafeOptions<T> & { initialValue: T }
): Signal<T>;

export function toSignalSafe<T>(
  source$: Observable<T>,
  options: ToSignalSafeOptions<NoInfer<T | null>> & { initialValue: null }
): Signal<T | null>;

export function toSignalSafe<T>(
  source$: Observable<T>,
  options?: ToSignalSafeOptions<T>
): Signal<T | undefined> {
  try {
    // Use type assertion to bypass TypeScript's strict overload checking
    // This is safe because we're wrapping Angular's toSignal which handles
    // the type checking internally. The overloads above provide type safety
    // at the function signature level.
    return toSignal(source$, options as ToSignalOptions<T>);
  } catch (error) {
    console.error('[toSignalSafe] Error converting observable to signal:', error);
    throw new Error(
      `Failed to convert observable to signal: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Creates a signal from an observable with a guaranteed initial value.
 * This is a convenience wrapper for the common pattern of providing
 * a default value while waiting for the first emission.
 *
 * @param source$ - Observable to convert
 * @param initialValue - Value to use before first emission
 * @returns Signal with the specified initial value
 *
 * @example
 * ```typescript
 * const items = toSignalWithDefault(this.service.items$, []);
 * const count = toSignalWithDefault(this.service.count$, 0);
 * const user = toSignalWithDefault(this.service.user$, null);
 * ```
 */
export function toSignalWithDefault<T>(source$: Observable<T>, initialValue: T): Signal<T> {
  return toSignalSafe(source$, { initialValue }) as Signal<T>;
}

/**
 * Creates a signal from an observable with null as the initial value.
 * Useful for optional/nullable data streams.
 *
 * @param source$ - Observable to convert
 * @returns Signal with null as initial value
 *
 * @example
 * ```typescript
 * const currentUser = toSignalOrNull(this.auth.user$);
 * if (currentUser()) {
 *   // TypeScript knows this is not null
 * }
 * ```
 */
export function toSignalOrNull<T>(source$: Observable<T>): Signal<T | null> {
  return toSignalSafe(source$, { initialValue: null as NoInfer<T | null> }) as Signal<T | null>;
}

/**
 * Creates a signal from an observable with undefined as the initial value.
 * Useful for optional data that may not be available immediately.
 *
 * @param source$ - Observable to convert
 * @returns Signal with undefined as initial value
 *
 * @example
 * ```typescript
 * const config = toSignalOrUndefined(this.config$);
 * const theme = config()?.theme ?? 'light';
 * ```
 */
export function toSignalOrUndefined<T>(source$: Observable<T>): Signal<T | undefined> {
  return toSignalSafe(source$);
}
