import { Injectable } from '@angular/core';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';

/**
 * Resultado de penalizaciones de owner
 */
export interface OwnerPenalties {
  visibilityPenaltyUntil: string | null;
  visibilityFactor: number;
  cancellationCount90d: number;
  isSuspended: boolean;
}

/**
 * Resultado de cancelación de owner
 */
export interface OwnerCancelResult {
  success: boolean;
  error?: string;
  penaltyApplied?: boolean;
}

/**
 * BookingOwnerPenaltyService
 *
 * Responsable de:
 * - Cancelación de reservas por parte del owner con penalización
 * - Obtención de penalizaciones activas del owner
 * - Cálculo del factor de visibilidad
 *
 * Reglas de penalización:
 * - Reembolso 100% al renter
 * - -10% visibilidad por 30 días
 * - 3+ cancelaciones en 90 días = suspensión temporal
 *
 * Extraído de BookingsService para mejor separación de responsabilidades.
 */
@Injectable({
  providedIn: 'root',
})
export class BookingOwnerPenaltyService {
  private readonly supabase = injectSupabase();

  // ============================================================================
  // OWNER CANCELLATION
  // ============================================================================

  /**
   * Owner cancela una reserva con penalización automática
   *
   * Consecuencias:
   * - Reembolso 100% al renter
   * - -10% visibilidad por 30 días
   * - 3+ cancelaciones en 90 días = suspensión temporal
   *
   * @param bookingId - ID de la reserva
   * @param reason - Razón de la cancelación
   */
  async ownerCancelBooking(bookingId: string, reason: string): Promise<OwnerCancelResult> {
    try {
      const { data, error } = await this.supabase.rpc('owner_cancel_booking', {
        p_booking_id: bookingId,
        p_reason: reason,
      });

      if (error) throw error;

      return {
        success: true,
        penaltyApplied: data?.penalty_applied ?? true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al cancelar reserva',
      };
    }
  }

  // ============================================================================
  // PENALTIES QUERIES
  // ============================================================================

  /**
   * Obtiene las penalizaciones activas del owner actual
   */
  async getOwnerPenalties(): Promise<OwnerPenalties | null> {
    try {
      const user = await this.supabase.auth.getUser();
      if (!user.data.user?.id) return null;

      const { data, error } = await this.supabase.rpc('get_owner_penalties', {
        p_owner_id: user.data.user.id,
      });

      if (error) throw error;

      return {
        visibilityPenaltyUntil: data?.visibility_penalty_until || null,
        visibilityFactor: data?.visibility_factor ?? 1.0,
        cancellationCount90d: data?.cancellation_count_90d ?? 0,
        isSuspended: data?.is_suspended ?? false,
      };
    } catch {
      return null;
    }
  }

  /**
   * Obtiene las penalizaciones de un owner específico por ID
   */
  async getOwnerPenaltiesById(ownerId: string): Promise<OwnerPenalties | null> {
    if (!ownerId) return null; // Fix: Prevent 400 bad request

    try {
      const { data, error } = await this.supabase.rpc('get_owner_penalties', {
        p_owner_id: ownerId,
      });

      if (error) throw error;

      return {
        visibilityPenaltyUntil: data?.visibility_penalty_until || null,
        visibilityFactor: data?.visibility_factor ?? 1.0,
        cancellationCount90d: data?.cancellation_count_90d ?? 0,
        isSuspended: data?.is_suspended ?? false,
      };
    } catch {
      return null;
    }
  }

  // ============================================================================
  // VISIBILITY FACTOR
  // ============================================================================

  /**
   * Obtiene el factor de visibilidad de un owner (para búsquedas)
   * Factor entre 0.0 y 1.0 donde 1.0 = visibilidad completa
   *
   * @param ownerId - ID del owner (opcional, usa usuario actual si no se provee)
   * @returns Factor de visibilidad (default 1.0 en caso de error)
   */
  async getOwnerVisibilityFactor(ownerId?: string): Promise<number> {
    try {
      const { data, error } = await this.supabase.rpc('get_owner_visibility_factor', {
        p_owner_id: ownerId || null,
      });

      if (error) throw error;

      return data ?? 1.0;
    } catch {
      return 1.0; // Default to full visibility on error
    }
  }

  /**
   * Verifica si un owner está suspendido
   *
   * @param ownerId - ID del owner
   * @returns true si está suspendido
   */
  async isOwnerSuspended(ownerId?: string): Promise<boolean> {
    const penalties = ownerId
      ? await this.getOwnerPenaltiesById(ownerId)
      : await this.getOwnerPenalties();

    return penalties?.isSuspended ?? false;
  }

  /**
   * Verifica si un owner tiene penalización de visibilidad activa
   *
   * @param ownerId - ID del owner
   * @returns true si tiene penalización activa
   */
  async hasVisibilityPenalty(ownerId?: string): Promise<boolean> {
    const penalties = ownerId
      ? await this.getOwnerPenaltiesById(ownerId)
      : await this.getOwnerPenalties();

    if (!penalties?.visibilityPenaltyUntil) return false;

    const penaltyEndDate = new Date(penalties.visibilityPenaltyUntil);
    return penaltyEndDate > new Date();
  }
}
