import { Injectable } from '@angular/core';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';

/**
 * Service for managing booking approval workflow
 * Handles manual approval/rejection of bookings by car owners
 */
@Injectable({
  providedIn: 'root',
})
export class BookingApprovalService {
  private readonly supabase = injectSupabase();

  /**
   * Get pending booking approvals for current user (car owner)
   */
  async getPendingApprovals(): Promise<Record<string, unknown>[]> {
    const { data, error } = await this.supabase.from('owner_pending_approvals').select('*');

    if (error) {
      throw error;
    }

    return data || [];
  }

  /**
   * Approve a pending booking
   */
  async approveBooking(
    bookingId: string,
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
      const { data, error } = await this.supabase.rpc('approve_booking_v2', {
        p_booking_id: bookingId,
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      // data es JSON con {success, message, booking_id, etc}
      if (data && typeof data === 'object') {
        if (data.success === false) {
          return {
            success: false,
            error: data.error || data.message,
          };
        }

        return {
          success: true,
          message: data.message || 'Reserva aprobada exitosamente',
        };
      }

      return {
        success: true,
        message: 'Reserva aprobada exitosamente',
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error inesperado al aprobar reserva',
      };
    }
  }

  /**
   * Reject a pending booking
   */
  async rejectBooking(
    bookingId: string,
    reason: string = 'No especificado',
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
      const { data, error } = await this.supabase.rpc('reject_booking', {
        p_booking_id: bookingId,
        p_reason: reason,
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      // data es JSON con {success, message, booking_id, etc}
      if (data && typeof data === 'object') {
        if (data.success === false) {
          return {
            success: false,
            error: data.error || data.message,
          };
        }

        return {
          success: true,
          message: data.message || 'Reserva rechazada exitosamente',
        };
      }

      return {
        success: true,
        message: 'Reserva rechazada exitosamente',
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error inesperado al rechazar reserva',
      };
    }
  }

  /**
   * Check if a car requires manual approval
   */
  async carRequiresApproval(carId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('cars')
      .select('instant_booking, require_approval')
      .eq('id', carId)
      .single();

    if (error || !data) {
      return false;
    }

    // Si require_approval es true O instant_booking es false, requiere aprobación
    return data.require_approval === true || data.instant_booking === false;
  }
}
