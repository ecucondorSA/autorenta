import { Signal, signal } from '@angular/core';
import { debounceTime, distinctUntilChanged, Observable, Subject } from 'rxjs';

/**
 * P1-026 FIX: Search Debounce Utility
 *
 * Creates a debounced search signal that only emits after user stops typing
 *
 * Usage:
 * ```ts
 * const search = createDebouncedSearch(300);
 * search.input('user query'); // Call on each keystroke
 * // search.value() updates after 300ms of no typing
 * ```
 */
export interface DebouncedSearch {
  /** Current debounced search value */
  value: Signal<string>;
  /** Update search input (triggers debounce) */
  input: (value: string) => void;
  /** Clear search */
  clear: () => void;
  /** Immediately trigger search without waiting for debounce */
  immediate: (value: string) => void;
}

export function createDebouncedSearch(debounceMs = 300): DebouncedSearch {
  const valueSignal = signal('');
  const input$ = new Subject<string>();

  // Subscribe to input stream with debounce
  input$
    .pipe(debounceTime(debounceMs), distinctUntilChanged())
    .subscribe((value) => valueSignal.set(value));

  return {
    value: valueSignal.asReadonly(),
    input: (value: string) => input$.next(value),
    clear: () => {
      input$.next('');
      valueSignal.set('');
    },
    immediate: (value: string) => {
      valueSignal.set(value);
      input$.next(value);
    },
  };
}

/**
 * Alternative: RxJS operator-based debounced search
 *
 * Usage with FormControl:
 * ```ts
 * searchControl.valueChanges
 *   .pipe(debounceSearch(300))
 *   .subscribe(query => this.performSearch(query));
 * ```
 */
export function debounceSearch<T>(ms = 300) {
  return (source: Observable<T>) => source.pipe(debounceTime(ms), distinctUntilChanged());
}
