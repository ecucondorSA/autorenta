import { inject, Injectable, Signal, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

/**
 * P1-027 & P1-028 FIX: URL State Manager
 *
 * Persists filter and sort state to URL query parameters
 *
 * Features:
 * - Filters saved to ?filter=value
 * - Sort saved to ?sortBy=field&order=asc
 * - State restored on page load
 * - Type-safe with generics
 *
 * Usage:
 * ```ts
 * const urlState = inject(UrlStateManager);
 *
 * // Set filter
 * urlState.setFilter('status', 'confirmed');
 *
 * // Set sort
 * urlState.setSort('created_at', 'desc');
 *
 * // Get current state
 * const filters = urlState.filters();
 * const sort = urlState.sort();
 * ```
 */

export interface SortState {
  sortBy: string;
  order: 'asc' | 'desc';
}

@Injectable({
  providedIn: 'root',
})
export class UrlStateManager {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  private readonly filtersSignal = signal<Record<string, string>>({});
  private readonly sortSignal = signal<SortState | null>(null);

  readonly filters: Signal<Record<string, string>> = this.filtersSignal.asReadonly();
  readonly sort: Signal<SortState | null> = this.sortSignal.asReadonly();

  constructor() {
    this.initializeFromUrl();
  }

  /**
   * Initialize state from URL query parameters
   */
  private initializeFromUrl(): void {
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      // Parse filters
      const filters: Record<string, string> = {};
      Object.keys(params).forEach((key) => {
        if (key !== 'sortBy' && key !== 'order') {
          filters[key] = params[key];
        }
      });
      this.filtersSignal.set(filters);

      // Parse sort
      if (params['sortBy']) {
        this.sortSignal.set({
          sortBy: params['sortBy'],
          order: params['order'] === 'desc' ? 'desc' : 'asc',
        });
      }
    });
  }

  /**
   * Set a filter value and update URL
   */
  setFilter(key: string, value: string | null): void {
    const currentFilters = this.filtersSignal();
    const newFilters = { ...currentFilters };

    if (value === null || value === '') {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }

    this.filtersSignal.set(newFilters);
    this.updateUrl();
  }

  /**
   * Set multiple filters at once
   */
  setFilters(filters: Record<string, string>): void {
    this.filtersSignal.set(filters);
    this.updateUrl();
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.filtersSignal.set({});
    this.updateUrl();
  }

  /**
   * Set sort state and update URL
   */
  setSort(sortBy: string, order: 'asc' | 'desc'): void {
    this.sortSignal.set({ sortBy, order });
    this.updateUrl();
  }

  /**
   * Clear sort state
   */
  clearSort(): void {
    this.sortSignal.set(null);
    this.updateUrl();
  }

  /**
   * Get a specific filter value
   */
  getFilter(key: string): string | null {
    return this.filtersSignal()[key] || null;
  }

  /**
   * Update URL with current state
   */
  private updateUrl(): void {
    const queryParams: Record<string, string> = {
      ...this.filtersSignal(),
    };

    const sort = this.sortSignal();
    if (sort) {
      queryParams['sortBy'] = sort.sortBy;
      queryParams['order'] = sort.order;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
    });
  }
}
