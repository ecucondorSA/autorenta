import { Injectable, signal, computed, inject } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { from, Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { SupabaseClientService } from './supabase-client.service';
import { LoggerService } from './logger.service';

export interface TelemetryData {
  total_km: number;
  hard_brakes: number;
  speed_violations: number;
  night_driving_hours: number;
  risk_zones_visited: number;
  [key: string]: any; // Allow additional custom fields
}

export interface RecordTelemetryResult {
  success: boolean;
  message: string;
  telemetry_id: string;
  driver_score: number;
}

export interface TelemetrySummary {
  total_trips: number;
  total_km: number;
  avg_driver_score: number;
  current_driver_score: number;
  hard_brakes_total: number;
  speed_violations_total: number;
  night_driving_hours_total: number;
  risk_zones_visited_total: number;
  best_score: number;
  worst_score: number;
  score_trend: 'improving' | 'declining' | 'stable' | 'insufficient_data';
}

export interface TelemetryHistoryEntry {
  id: string;
  booking_id: string;
  trip_date: string;
  total_km: number;
  driver_score: number;
  hard_brakes: number;
  speed_violations: number;
  night_driving_hours: number;
  risk_zones_visited: number;
}

@Injectable({
  providedIn: 'root',
})
export class TelemetryService {
  private readonly supabase: SupabaseClient = inject(SupabaseClientService).getClient();
  private readonly logger = inject(LoggerService);

  readonly summary = signal<TelemetrySummary | null>(null);
  readonly history = signal<TelemetryHistoryEntry[]>([]);
  readonly loading = signal(false);
  readonly error = signal<{ message: string } | null>(null);

  // Computed signals for easy access
  readonly currentDriverScore = computed(() => this.summary()?.current_driver_score ?? 50);
  readonly avgDriverScore = computed(() => this.summary()?.avg_driver_score ?? 50);
  readonly totalTrips = computed(() => this.summary()?.total_trips ?? 0);
  readonly totalKm = computed(() => this.summary()?.total_km ?? 0);
  readonly scoreTrend = computed(() => this.summary()?.score_trend ?? 'insufficient_data');
  readonly isImproving = computed(() => this.scoreTrend() === 'improving');
  readonly isDeclining = computed(() => this.scoreTrend() === 'declining');

  constructor() {
    // Auto-load telemetry summary on service init
    this.getSummary().subscribe();
  }

  /**
   * Record telemetry data from a trip
   */
  recordTelemetry(params: {
    userId: string;
    bookingId: string;
    telemetryData: TelemetryData;
  }): Observable<RecordTelemetryResult> {
    this.loading.set(true);
    this.error.set(null);

    return from(
      this.supabase.rpc('record_telemetry', {
        p_user_id: params.userId,
        p_booking_id: params.bookingId,
        p_telemetry_data: params.telemetryData,
      })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        const result = data[0] as RecordTelemetryResult;

        // Refresh summary after recording
        this.getSummary().subscribe();

        return result;
      }),
      catchError((err) => {
        this.handleError(err, 'Error al registrar telemetría');
        return throwError(() => err);
      }),
      tap(() => this.loading.set(false))
    );
  }

  /**
   * Get telemetry summary (last N months)
   */
  getSummary(userId?: string, monthsBack: number = 3): Observable<TelemetrySummary> {
    this.loading.set(true);
    this.error.set(null);

    return from(
      this.supabase.rpc('get_user_telemetry_summary', {
        p_user_id: userId ?? null,
        p_months_back: monthsBack,
      })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        if (!data || data.length === 0) {
          // No telemetry data yet, return default
          const defaultSummary: TelemetrySummary = {
            total_trips: 0,
            total_km: 0,
            avg_driver_score: 50,
            current_driver_score: 50,
            hard_brakes_total: 0,
            speed_violations_total: 0,
            night_driving_hours_total: 0,
            risk_zones_visited_total: 0,
            best_score: 0,
            worst_score: 0,
            score_trend: 'insufficient_data',
          };
          this.summary.set(defaultSummary);
          return defaultSummary;
        }
        const summary = data[0] as TelemetrySummary;
        this.summary.set(summary);
        return summary;
      }),
      catchError((err) => {
        this.handleError(err, 'Error al obtener resumen de telemetría');
        return throwError(() => err);
      }),
      tap(() => this.loading.set(false))
    );
  }

  /**
   * Get detailed telemetry history for charts
   */
  getHistory(userId?: string, limit: number = 10): Observable<TelemetryHistoryEntry[]> {
    this.loading.set(true);
    this.error.set(null);

    return from(
      this.supabase.rpc('get_user_telemetry_history', {
        p_user_id: userId ?? null,
        p_limit: limit,
      })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        const history = (data || []) as TelemetryHistoryEntry[];
        this.history.set(history);
        return history;
      }),
      catchError((err) => {
        this.handleError(err, 'Error al obtener historial de telemetría');
        return throwError(() => err);
      }),
      tap(() => this.loading.set(false))
    );
  }

  /**
   * Refresh telemetry data (summary + history)
   */
  refresh(monthsBack: number = 3, historyLimit: number = 10): void {
    this.getSummary(undefined, monthsBack).subscribe();
    this.getHistory(undefined, historyLimit).subscribe();
  }

  /**
   * Format driver score for display with color coding
   */
  formatScore(score: number): { value: number; label: string; color: string } {
    if (score >= 90) {
      return { value: score, label: 'Excelente', color: 'green' };
    } else if (score >= 75) {
      return { value: score, label: 'Bueno', color: 'blue' };
    } else if (score >= 60) {
      return { value: score, label: 'Regular', color: 'yellow' };
    } else if (score >= 40) {
      return { value: score, label: 'Bajo', color: 'orange' };
    } else {
      return { value: score, label: 'Muy Bajo', color: 'red' };
    }
  }

  /**
   * Get trend icon/label for UI
   */
  getTrendDisplay(): { icon: string; label: string; color: string } {
    const trend = this.scoreTrend();
    switch (trend) {
      case 'improving':
        return { icon: '↗', label: 'Mejorando', color: 'green' };
      case 'declining':
        return { icon: '↘', label: 'Bajando', color: 'red' };
      case 'stable':
        return { icon: '→', label: 'Estable', color: 'blue' };
      default:
        return { icon: '?', label: 'Sin datos', color: 'gray' };
    }
  }

  /**
   * Calculate hard brakes per 100km for display
   */
  getHardBrakesRate(): number {
    const summary = this.summary();
    if (!summary || summary.total_km === 0) return 0;
    return Math.round((summary.hard_brakes_total / summary.total_km) * 100 * 10) / 10;
  }

  /**
   * Calculate speed violations per 100km for display
   */
  getSpeedViolationsRate(): number {
    const summary = this.summary();
    if (!summary || summary.total_km === 0) return 0;
    return Math.round((summary.speed_violations_total / summary.total_km) * 100 * 10) / 10;
  }

  private handleError(error: any, defaultMessage: string): void {
    const message = error?.message || defaultMessage;
    this.error.set({ message });
    this.loading.set(false);
    this.logger.error(defaultMessage, error);
  }
}
