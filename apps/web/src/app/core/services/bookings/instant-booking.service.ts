import { Injectable, inject, signal, computed } from '@angular/core';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { AuthService } from '@core/services/auth/auth.service';

/**
 * Resultado de verificación de instant booking
 */
export interface InstantBookingCheckResult {
  allowed: boolean;
  reason?: string;
  message?: string;
  current_score?: number;
  required_score?: number;
  score?: number;
}

/**
 * Resultado de proceso de instant booking
 */
export interface InstantBookingResult {
  success: boolean;
  booking_id?: string;
  status?: string;
  is_instant?: boolean;
  reason?: string;
  message?: string;
}

/**
 * Historial de risk score
 */
export interface RiskScoreHistoryEntry {
  id: string;
  old_score: number | null;
  new_score: number;
  reason: string;
  factors: Record<string, unknown>;
  created_at: string;
}

/**
 * Datos de perfil con risk score
 */
export interface RenterRiskProfile {
  risk_score: number;
  risk_score_updated_at: string | null;
  completed_rentals_count: number;
  cancelled_rentals_count: number;
  disputes_count: number;
  average_rating: number;
  email_verified: boolean;
  phone_verified: boolean;
  identity_verified: boolean;
  license_verified: boolean;
}

/**
 * Service para manejar Instant Booking y Risk Scores
 *
 * Instant Booking permite que renters con buen historial
 * reserven sin aprobación del owner, pasando directo a pago.
 *
 * El Risk Score (0-100) considera:
 * - Verificaciones (email, phone, identity, license): +30 máx
 * - Historial (completados, cancelaciones, disputas): +30 / -30
 * - Rating promedio: +20 / -10
 * - Base: 50 puntos
 */
@Injectable({
  providedIn: 'root',
})
export class InstantBookingService {
  private readonly supabase = injectSupabase();
  private readonly logger = inject(LoggerService);
  private readonly auth = inject(AuthService);

  // Estado reactivo
  private readonly _riskScore = signal<number>(50);
  private readonly _lastCheck = signal<InstantBookingCheckResult | null>(null);
  private readonly _isLoading = signal(false);

  // Selectores públicos
  readonly riskScore = this._riskScore.asReadonly();
  readonly lastCheck = this._lastCheck.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();

  readonly riskScoreLevel = computed(() => {
    const score = this._riskScore();
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'average';
    return 'low';
  });

  readonly riskScoreColor = computed(() => {
    const level = this.riskScoreLevel();
    switch (level) {
      case 'excellent':
        return 'text-green-600';
      case 'good':
        return 'text-blue-600';
      case 'average':
        return 'text-yellow-600';
      default:
        return 'text-red-600';
    }
  });

  /**
   * Verifica si el usuario actual puede hacer instant booking para un auto
   */
  async canInstantBook(carId: string): Promise<InstantBookingCheckResult> {
    this._isLoading.set(true);
    try {
      const user = await this.auth.getCurrentUser();
      if (!user) {
        return {
          allowed: false,
          reason: 'not_authenticated',
          message: 'Debes iniciar sesión para reservar',
        };
      }
      const userId = user.id;

      const { data, error } = await this.supabase.rpc('can_instant_book', {
        p_car_id: carId,
        p_renter_id: userId,
      });

      if (error) {
        this.logger.error('Error verificando instant booking', { error });
        return {
          allowed: false,
          reason: 'error',
          message: 'Error verificando disponibilidad de reserva instantánea',
        };
      }

      const result = data as InstantBookingCheckResult;
      this._lastCheck.set(result);

      // Actualizar risk score si viene en la respuesta
      if (result.score !== undefined) {
        this._riskScore.set(result.score);
      } else if (result.current_score !== undefined) {
        this._riskScore.set(result.current_score);
      }

      return result;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Procesa una reserva instantánea
   * Salta la aprobación del owner y va directo a pending_payment
   */
  async processInstantBooking(
    carId: string,
    startAt: Date,
    endAt: Date,
    options?: {
      pickupLocationId?: string;
      dropoffLocationId?: string;
    },
  ): Promise<InstantBookingResult> {
    this._isLoading.set(true);
    try {
      const user = await this.auth.getCurrentUser();
      if (!user) {
        return {
          success: false,
          reason: 'not_authenticated',
          message: 'Debes iniciar sesión para reservar',
        };
      }
      const userId = user.id;

      const { data, error } = await this.supabase.rpc('process_instant_booking', {
        p_car_id: carId,
        p_renter_id: userId,
        p_start_at: startAt.toISOString(),
        p_end_at: endAt.toISOString(),
        p_pickup_location_id: options?.pickupLocationId ?? null,
        p_dropoff_location_id: options?.dropoffLocationId ?? null,
      });

      if (error) {
        this.logger.error('Error procesando instant booking', { error });
        return {
          success: false,
          reason: 'error',
          message: 'Error procesando reserva instantánea',
        };
      }

      return data as InstantBookingResult;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Calcula/actualiza el risk score del usuario actual
   */
  async calculateRiskScore(): Promise<number> {
    this._isLoading.set(true);
    try {
      const user = await this.auth.getCurrentUser();
      if (!user) return 0;
      const userId = user.id;

      const { data, error } = await this.supabase.rpc('calculate_renter_risk_score', {
        p_user_id: userId,
      });

      if (error) {
        this.logger.error('Error calculando risk score', { error });
        return this._riskScore();
      }

      const score = data as number;
      this._riskScore.set(score);
      return score;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Obtiene el historial de cambios del risk score
   */
  async getRiskScoreHistory(limit = 10): Promise<RiskScoreHistoryEntry[]> {
    const user = await this.auth.getCurrentUser();
    if (!user) return [];
    const userId = user.id;

    const { data, error } = await this.supabase
      .from('risk_score_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      this.logger.error('Error obteniendo historial de risk score', { error });
      return [];
    }

    return data as RiskScoreHistoryEntry[];
  }

  /**
   * Obtiene el perfil de riesgo del usuario actual
   */
  async getRenterRiskProfile(): Promise<RenterRiskProfile | null> {
    const user = await this.auth.getCurrentUser();
    if (!user) return null;
    const userId = user.id;

    const { data, error } = await this.supabase
      .from('profiles')
      .select(
        `
        risk_score,
        risk_score_updated_at,
        completed_rentals_count,
        cancelled_rentals_count,
        disputes_count,
        average_rating,
        email_verified,
        phone_verified,
        identity_verified,
        license_verified
      `,
      )
      .eq('id', userId)
      .single();

    if (error) {
      this.logger.error('Error obteniendo perfil de riesgo', { error });
      return null;
    }

    // Actualizar signal
    if (data?.risk_score !== undefined) {
      this._riskScore.set(data.risk_score);
    }

    return data as RenterRiskProfile;
  }

  /**
   * Obtiene autos con instant booking habilitado
   */
  async getInstantBookingCars(filters?: { city?: string; minScore?: number }): Promise<
    Array<{
      id: string;
      title: string;
      brand: string;
      model: string;
      year: number;
      price_per_day: number;
      city: string;
      province: string;
      instant_booking_min_score: number;
      instant_booking_require_verified: boolean;
      owner_name: string;
      owner_avatar: string;
    }>
  > {
    let query = this.supabase.from('v_instant_booking_cars').select('*');

    if (filters?.city) {
      query = query.eq('city', filters.city);
    }

    if (filters?.minScore !== undefined) {
      query = query.lte('instant_booking_min_score', filters.minScore);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error('Error obteniendo autos con instant booking', { error });
      return [];
    }

    return data ?? [];
  }
}
