/**
 * Signal Helpers
 *
 * Utilities for working with Angular Signals and RxJS integration.
 * Provides type-safe wrappers and helpers for common reactive patterns.
 */

import { Signal } from '@angular/core';
import { toSignal, ToSignalOptions } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';

type SafeSignalOptions<T> = ToSignalOptions<T>;

export function toSignalSafe<T>(source$: Observable<T>, options?: SafeSignalOptions<T>): Signal<T | undefined> {
  try {
    // Use @ts-expect-error because Angular's toSignal has strict overloads
    // that don't work well with our wrapper. The function signature provides
    // type safety at the call site level.
    // @ts-expect-error - Angular's toSignal overloads are too strict for our wrapper
    return toSignal(source$, options);
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
  return toSignalSafe<T>(source$, { initialValue } as SafeSignalOptions<T>) as Signal<T>;
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
  return toSignalSafe<T | null>(source$, { initialValue: null } as SafeSignalOptions<T | null>) as Signal<T | null>;
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
  return toSignalSafe<T>(source$);
}
