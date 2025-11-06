import { Injectable, computed, signal, inject } from '@angular/core';
import { injectSupabase } from './supabase-client.service';
import { AuthService } from './auth.service';

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

export interface TelemetryHistory {
  telemetry_id: string;
  booking_id: string;
  trip_date: string;
  total_km: number;
  driver_score: number;
  hard_brakes: number;
  speed_violations: number;
  night_driving_hours: number;
  risk_zones_visited: number;
  car_title: string;
  car_brand: string;
  car_model: string;
}

export interface TelemetryAverage {
  avg_score: number;
  total_trips: number;
  total_km: number;
  total_hard_brakes: number;
  total_speed_violations: number;
  total_night_hours: number;
  total_risk_zones: number;
  period_start: string;
  period_end: string;
}

export interface TelemetryInsights {
  current_score: number;
  score_trend: string;
  main_issue: string;
  recommendation: string;
  trips_analyzed: number;
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

  private readonly state = signal<TelemetryState>({
    isCollecting: false,
    currentBookingId: null,
    sessionData: {},
  });

  // Computed signals
  readonly isCollecting = computed(() => this.state().isCollecting);
  readonly currentBookingId = computed(() => this.state().currentBookingId);
  readonly sessionData = computed(() => this.state().sessionData);

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
   * Envía datos telemáticos al backend
   */
  private async recordTelemetry(data: TelemetryData): Promise<string> {
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
    timeElapsed: number
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
