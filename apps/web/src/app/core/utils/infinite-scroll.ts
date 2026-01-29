import { signal, Signal, computed } from '@angular/core';

/**
 * P1-029 FIX: Infinite Scroll Manager
 *
 * Manages infinite scroll state with automatic reset on filter changes
 *
 * Features:
 * - Auto-resets offset when filters change
 * - Tracks loading and hasMore states
 * - Prevents duplicate loads
 * - Type-safe with generics
 *
 * Usage:
 * ```ts
 * const scroll = createInfiniteScroll({
 *   pageSize: 20,
 *   loadFn: (offset, limit) => bookingsService.getMyBookings({ offset, limit })
 * });
 *
 * // Listen to filter changes
 * effect(() => {
 *   const filters = filtersSignal();
 *   scroll.resetOnFilterChange(filters);
 * });
 *
 * // Load more
 * scroll.loadMore();
 * ```
 */

export interface InfiniteScrollOptions<T> {
  pageSize: number;
  loadFn: (offset: number, limit: number) => Promise<{ items: T[]; total: number }>;
}

export interface InfiniteScrollState<T> {
  items: Signal<T[]>;
  isLoading: Signal<boolean>;
  hasMore: Signal<boolean>;
  currentPage: Signal<number>;
  total: Signal<number>;
  loadMore: () => Promise<void>;
  reset: () => void;
  resetOnFilterChange: (filters: unknown) => void;
}

export function createInfiniteScroll<T>(options: InfiniteScrollOptions<T>): InfiniteScrollState<T> {
  const itemsSignal = signal<T[]>([]);
  const isLoadingSignal = signal(false);
  const hasMoreSignal = signal(true);
  const currentPageSignal = signal(0);
  const totalSignal = signal(0);

  let previousFilters: unknown = null;

  const hasMore = computed(() => {
    const items = itemsSignal();
    const total = totalSignal();
    return items.length < total;
  });

  const loadMore = async () => {
    if (isLoadingSignal() || !hasMoreSignal()) {
      return;
    }

    isLoadingSignal.set(true);

    try {
      const offset = currentPageSignal() * options.pageSize;
      const result = await options.loadFn(offset, options.pageSize);

      const currentItems = itemsSignal();
      itemsSignal.set([...currentItems, ...result.items]);
      totalSignal.set(result.total);
      currentPageSignal.set(currentPageSignal() + 1);

      // Update hasMore
      hasMoreSignal.set(currentItems.length + result.items.length < result.total);
    } catch (error) {
      console.error('[InfiniteScroll] Load error:', error);
    } finally {
      isLoadingSignal.set(false);
    }
  };

  const reset = () => {
    itemsSignal.set([]);
    currentPageSignal.set(0);
    totalSignal.set(0);
    hasMoreSignal.set(true);
    isLoadingSignal.set(false);
  };

  const resetOnFilterChange = (filters: unknown) => {
    // Deep compare filters
    const filtersChanged = JSON.stringify(filters) !== JSON.stringify(previousFilters);

    if (filtersChanged) {
      previousFilters = filters;
      reset();
      // Auto-load first page
      void loadMore();
    }
  };

  return {
    items: itemsSignal.asReadonly(),
    isLoading: isLoadingSignal.asReadonly(),
    hasMore: computed(() => hasMore()),
    currentPage: currentPageSignal.asReadonly(),
    total: totalSignal.asReadonly(),
    loadMore,
    reset,
    resetOnFilterChange,
  };
}
