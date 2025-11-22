import { computed, inject, Injectable, signal } from '@angular/core';
import { from, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { LoggerService } from './logger.service';
import { injectSupabase } from './supabase-client.service';

/**
 * TelemetryService
 *
 * Servicio para recolección y gestión de datos telemáticos de conducción.
 *
 * FUNCIONALIDADES:
 * - Recolectar datos de sensores (GPS, acelerómetro)
 * - Detectar eventos de conducción (frenadas bruscas, excesos de velocidad)
 * - Calcular score de conducción (0-100)
 * - Enviar datos al backend para análisis
 * - Obtener historial y estadísticas
 *
 * MÉTRICAS MONITOREADAS:
 * - Frenadas bruscas (hard_brakes)
 * - Excesos de velocidad (speed_violations)
 * - Conducción nocturna (night_driving_hours)
 * - Zonas de riesgo visitadas (risk_zones_visited)
 */

export interface TelemetryData {
  booking_id: string;
  total_km: number;
  hard_brakes: number;
  speed_violations: number;
  night_driving_hours: number;
  risk_zones_visited: number;
  raw_data?: {
    gps_coordinates?: Array<{ lat: number; lng: number; timestamp: number }>;
    speed_readings?: Array<{ speed: number; timestamp: number }>;
    acceleration_events?: Array<{ force: number; timestamp: number }>;
  };
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
  // Compatibility properties for car info
  car_brand?: string;
  car_model?: string;
}

// Alias for backward compatibility
export type TelemetryHistory = TelemetryHistoryEntry;

export interface TelemetryAverage {
  avg_total_km: number;
  avg_driver_score: number;
  avg_hard_brakes: number;
  avg_speed_violations: number;
  avg_night_driving_hours: number;
  avg_risk_zones_visited: number;
  // Compatibility properties (totals and others)
  total_trips?: number;
  total_km?: number;
  total_hard_brakes?: number;
  total_speed_violations?: number;
  total_night_hours?: number;
  total_risk_zones?: number;
  avg_score?: number;
}

export interface TelemetryInsights {
  recommendations: string[];
  risk_level: 'low' | 'medium' | 'high';
  improvement_areas: string[];
  strengths: string[];
  // Compatibility properties
  main_issue?: string;
  recommendation?: string;
  score_trend?: 'improving' | 'declining' | 'stable';
}

export interface RecordTelemetryResult {
  success: boolean;
  message: string;
  telemetry_id: string;
  driver_score: number;
}

interface TelemetryState {
  isCollecting: boolean;
  currentBookingId: string | null;
  sessionData: Partial<TelemetryData>;
}

@Injectable({
  providedIn: 'root',
})
export class TelemetryService {
  private readonly supabase = injectSupabase();
  private readonly authService = inject(AuthService);
  private readonly logger = inject(LoggerService);

  private readonly state = signal<TelemetryState>({
    isCollecting: false,
    currentBookingId: null,
    sessionData: {},
  });

  // Core reactive state
  readonly isCollecting = computed(() => this.state().isCollecting);
  readonly currentBookingId = computed(() => this.state().currentBookingId);
  readonly sessionData = computed(() => this.state().sessionData);

  // Extended state for dashboards
  readonly loading = signal(false);
  readonly error = signal<{ message: string } | null>(null);
  readonly summary = signal<TelemetrySummary | null>(null);
  readonly history = signal<TelemetryHistoryEntry[]>([]);

  readonly currentDriverScore = computed(() => this.summary()?.current_driver_score ?? 50);
  readonly avgDriverScore = computed(() => this.summary()?.avg_driver_score ?? 50);
  readonly totalTrips = computed(() => this.summary()?.total_trips ?? 0);
  readonly totalKm = computed(() => this.summary()?.total_km ?? 0);
  readonly scoreTrend = computed(
    () => this.summary()?.score_trend ?? ('insufficient_data' as const),
  );
  readonly isImproving = computed(() => this.scoreTrend() === 'improving');
  readonly isDeclining = computed(() => this.scoreTrend() === 'declining');

  readonly trendDisplay = computed(() => {
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
  });

  /**
   * Inicia la recolección de datos telemáticos para un booking
   */
  startCollection(bookingId: string): void {
    if (this.state().isCollecting) {
      console.warn('[TelemetryService] Ya hay una sesión de recolección activa');
      return;
    }

    this.state.set({
      isCollecting: true,
      currentBookingId: bookingId,
      sessionData: {
        booking_id: bookingId,
        total_km: 0,
        hard_brakes: 0,
        speed_violations: 0,
        night_driving_hours: 0,
        risk_zones_visited: 0,
        raw_data: {
          gps_coordinates: [],
          speed_readings: [],
          acceleration_events: [],
        },
      },
    });

    console.log('[TelemetryService] Recolección iniciada para booking:', bookingId);
  }

  /**
   * Detiene la recolección y envía los datos al backend
   */
  async stopCollection(): Promise<string | null> {
    if (!this.state().isCollecting) {
      console.warn('[TelemetryService] No hay sesión de recolección activa');
      return null;
    }

    const sessionData = this.state().sessionData;
    const bookingId = this.state().currentBookingId;

    if (!bookingId) {
      throw new Error('No hay booking ID activo');
    }

    try {
      // Enviar datos al backend
      const telemetryId = await this.recordTelemetry(sessionData as TelemetryData);

      // Resetear estado
      this.state.set({
        isCollecting: false,
        currentBookingId: null,
        sessionData: {},
      });

      console.log('[TelemetryService] Datos enviados exitosamente:', telemetryId);
      return telemetryId;
    } catch (error) {
      console.error('[TelemetryService] Error al enviar datos:', error);
      throw error;
    }
  }

  /**
   * Registra un evento de frenada brusca
   */
  recordHardBrake(force: number): void {
    if (!this.state().isCollecting) return;

    const current = this.state().sessionData;
    this.state.update((state) => ({
      ...state,
      sessionData: {
        ...current,
        hard_brakes: (current.hard_brakes || 0) + 1,
        raw_data: {
          ...current.raw_data,
          acceleration_events: [
            ...(current.raw_data?.acceleration_events || []),
            { force, timestamp: Date.now() },
          ],
        },
      },
    }));

    console.log('[TelemetryService] Frenada brusca registrada:', force);
  }

  /**
   * Registra un exceso de velocidad
   */
  recordSpeedViolation(speed: number, speedLimit: number): void {
    if (!this.state().isCollecting) return;

    const current = this.state().sessionData;
    this.state.update((state) => ({
      ...state,
      sessionData: {
        ...current,
        speed_violations: (current.speed_violations || 0) + 1,
      },
    }));

    console.log('[TelemetryService] Exceso de velocidad:', speed, '/', speedLimit);
  }

  /**
   * Actualiza la distancia total recorrida
   */
  updateDistance(km: number): void {
    if (!this.state().isCollecting) return;

    const current = this.state().sessionData;
    this.state.update((state) => ({
      ...state,
      sessionData: {
        ...current,
        total_km: km,
      },
    }));
  }

  /**
   * Incrementa horas de conducción nocturna
   */
  addNightDrivingHours(hours: number): void {
    if (!this.state().isCollecting) return;

    const current = this.state().sessionData;
    this.state.update((state) => ({
      ...state,
      sessionData: {
        ...current,
        night_driving_hours: (current.night_driving_hours || 0) + hours,
      },
    }));
  }

  /**
   * Registra visita a zona de riesgo
   */
  recordRiskZoneVisit(): void {
    if (!this.state().isCollecting) return;

    const current = this.state().sessionData;
    this.state.update((state) => ({
      ...state,
      sessionData: {
        ...current,
        risk_zones_visited: (current.risk_zones_visited || 0) + 1,
      },
    }));

    console.log('[TelemetryService] Zona de riesgo visitada');
  }

  /**
   * Registra coordenadas GPS
   */
  recordGPSCoordinates(lat: number, lng: number): void {
    if (!this.state().isCollecting) return;

    const current = this.state().sessionData;
    this.state.update((state) => ({
      ...state,
      sessionData: {
        ...current,
        raw_data: {
          ...current.raw_data,
          gps_coordinates: [
            ...(current.raw_data?.gps_coordinates || []),
            { lat, lng, timestamp: Date.now() },
          ],
        },
      },
    }));
  }

  /**
   * Envía datos telemáticos al backend (baja nivel, usado por stopCollection)
   */
  async recordTelemetry(data: TelemetryData): Promise<string> {
    const { data: result, error } = await this.supabase.rpc('record_telemetry', {
      p_booking_id: data.booking_id,
      p_telemetry_data: {
        total_km: data.total_km,
        hard_brakes: data.hard_brakes,
        speed_violations: data.speed_violations,
        night_driving_hours: data.night_driving_hours,
        risk_zones_visited: data.risk_zones_visited,
        raw_data: data.raw_data,
      },
    });

    if (error) {
      throw new Error(`Error al registrar telemetría: ${error.message}`);
    }

    return result;
  }

  /**
   * Obtiene el resumen activo de telemetría del usuario
   */
  activeSummary(userId?: string): Observable<TelemetrySummary | null> {
    const summaryPromise = (async () => {
      const user = userId ? { id: userId } : await this.authService.getCurrentUser();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const { data, error } = await this.supabase.rpc('get_telemetry_summary', {
        p_user_id: user.id,
      });

      if (error) {
        this.logger.error('[TelemetryService] Error al obtener resumen', error.message);
        throw error;
      }

      const summary = (data?.[0] || null) as TelemetrySummary | null;
      this.summary.set(summary);
      return summary;
    })();

    return from(summaryPromise);
  }

  /**
   * API de alto nivel usada por dashboards/tests para registrar telemetría
   * y refrescar el resumen activo.
   */
  recordTelemetryForUser(params: {
    userId: string | null;
    bookingId: string;
    telemetryData: TelemetryData;
  }): Observable<RecordTelemetryResult> {
    const { userId, bookingId, telemetryData } = params;
    this.loading.set(true);
    this.error.set(null);

    const recordPromise = (async () => {
      const { data, error } = await this.supabase.rpc('record_telemetry_for_user', {
        p_user_id: userId,
        p_booking_id: bookingId,
        p_telemetry_data: telemetryData,
      });

      if (error) {
        this.error.set({ message: 'Error al registrar telemetría' });
        this.logger.error('[TelemetryService] Error al registrar telemetría', error.message);
        throw error;
      }

      const result = (data?.[0] || null) as RecordTelemetryResult | null;

      // Refrescar resumen activo en background (no esperamos el resultado)
      this.activeSummary(userId ?? undefined).subscribe({
        error: (err: unknown) =>
          this.logger.error('[TelemetryService] Error al refrescar summary', String(err)),
      });

      return result!;
    })();

    return from(recordPromise).pipe(
      tap({
        next: () => this.loading.set(false),
        error: () => this.loading.set(false),
        complete: () => this.loading.set(false),
      }),
    );
  }

  /**
   * Obtiene el historial de telemetría del usuario
   */
  async getHistory(limit = 10): Promise<TelemetryHistory[]> {
    const user = await this.authService.getCurrentUser();
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    const { data, error } = await this.supabase.rpc('get_telemetry_history', {
      p_user_id: user.id,
      p_limit: limit,
    });

    if (error) {
      throw new Error(`Error al obtener historial: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Obtiene estadísticas promedio de telemetría
   */
  async getAverage(months = 3): Promise<TelemetryAverage | null> {
    const user = await this.authService.getCurrentUser();
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    const { data, error } = await this.supabase.rpc('get_driver_telemetry_average', {
      p_user_id: user.id,
      p_months: months,
    });

    if (error) {
      throw new Error(`Error al obtener promedio: ${error.message}`);
    }

    return data?.[0] || null;
  }

  /**
   * Obtiene insights y recomendaciones
   */
  async getInsights(): Promise<TelemetryInsights | null> {
    const user = await this.authService.getCurrentUser();
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    const { data, error } = await this.supabase.rpc('get_telemetry_insights', {
      p_user_id: user.id,
    });

    if (error) {
      throw new Error(`Error al obtener insights: ${error.message}`);
    }

    return data?.[0] || null;
  }

  /**
   * Calcula el score de un viaje específico
   */
  async getTripScore(bookingId: string): Promise<number> {
    const user = await this.authService.getCurrentUser();
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    const { data, error } = await this.supabase.rpc('calculate_telemetry_score', {
      p_user_id: user.id,
      p_booking_id: bookingId,
    });

    if (error) {
      throw new Error(`Error al calcular score: ${error.message}`);
    }

    return data;
  }

  /**
   * Helper: Detecta si es hora nocturna (22:00 - 06:00)
   */
  isNightTime(): boolean {
    const hour = new Date().getHours();
    return hour >= 22 || hour < 6;
  }

  /**
   * Helper: Calcula velocidad a partir de coordenadas GPS
   */
  calculateSpeed(
    prevLat: number,
    prevLng: number,
    currLat: number,
    currLng: number,
    timeElapsed: number,
  ): number {
    // Fórmula de Haversine para distancia entre coordenadas
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.toRad(currLat - prevLat);
    const dLon = this.toRad(currLng - prevLng);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(prevLat)) *
      Math.cos(this.toRad(currLat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distancia en km

    // Velocidad en km/h
    const speed = (distance / timeElapsed) * 3600;

    return speed;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
