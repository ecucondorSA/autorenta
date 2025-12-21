import { Injectable, signal, inject } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { Observable, from, of, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import type { DashboardStats, DashboardStatsCache } from '../models/dashboard.model';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';

/**
 * Dashboard Statistics Service
 *
 * Handles fetching and caching of owner dashboard statistics
 * from the dashboard-stats Edge Function.
 */
@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private readonly supabase: SupabaseClient = injectSupabase();
  private readonly logger = inject(LoggerService);

  // Cache TTL: 5 minutes
  private readonly CACHE_TTL_MS = 5 * 60 * 1000;

  // Cache storage
  private readonly cache = signal<DashboardStatsCache | null>(null);
  readonly loading = signal(false);
  readonly error = signal<{ message: string } | null>(null);

  /**
   * Get dashboard statistics
   *
   * Implements caching with TTL. If cache is valid, returns cached data.
   * Otherwise, fetches fresh data from Edge Function.
   *
   * @param forceRefresh - Force refresh even if cache is valid
   * @returns Observable<DashboardStats>
   */
  getDashboardStats(forceRefresh: boolean = false): Observable<DashboardStats> {
    // Check cache validity
    const cachedData = this.cache();
    const now = Date.now();

    if (!forceRefresh && cachedData && now - cachedData.timestamp < this.CACHE_TTL_MS) {
      this.logger.info('Dashboard stats: Using cached data');
      return of(cachedData.data);
    }

    // Fetch fresh data
    this.loading.set(true);
    this.error.set(null);

    return from(this.fetchDashboardStats()).pipe(
      tap((stats) => {
        // Update cache
        this.cache.set({
          data: stats,
          timestamp: now,
          ttl: this.CACHE_TTL_MS,
        });
        this.logger.info('Dashboard stats: Cache updated');
      }),
      catchError((_err) => {
        this.handleError(_err, 'Error al obtener estadísticas del dashboard');
        return throwError(() => _err);
      }),
      map((stats) => {
        this.loading.set(false);
        return stats;
      }),
    );
  }

  /**
   * Clear cache
   * Useful when user performs actions that might affect stats
   */
  clearCache(): void {
    this.cache.set(null);
    this.logger.info('Dashboard stats: Cache cleared');
  }

  /**
   * Private: Fetch dashboard stats from Edge Function
   */
  private async fetchDashboardStats(): Promise<DashboardStats> {
    const {
      data: { session },
    } = await this.supabase.auth.getSession();

    if (!session) {
      throw new Error('Usuario no autenticado');
    }

    const response = await this.supabase.functions.invoke('dashboard-stats', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (response.error) {
      throw new Error(response.error.message || 'Error al obtener estadísticas');
    }

    return response.data as DashboardStats;
  }

  /**
   * Private: Error handler
   */
  private handleError(err: unknown, defaultMessage: string): void {
    const errorMessage = err instanceof Error ? err.message : defaultMessage;
    this.error.set({ message: errorMessage });
    this.logger.error(defaultMessage, String(err));
  }
}
