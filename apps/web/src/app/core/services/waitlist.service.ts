import { Injectable, inject } from '@angular/core';
import { injectSupabase } from './supabase-client.service';
import { LoggerService } from './logger.service';

export interface WaitlistEntry {
  id: string;
  car_id: string;
  car_brand?: string;
  car_model?: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'notified' | 'expired' | 'cancelled';
  notified_at?: string;
  created_at: string;
}

@Injectable({
  providedIn: 'root',
})
export class WaitlistService {
  private readonly supabase = injectSupabase();
  private readonly logger = inject(LoggerService);

  /**
   * Agrega un usuario a la lista de espera para un auto en fechas específicas
   * @param carId - ID del auto
   * @param startDate - Fecha inicio (ISO string)
   * @param endDate - Fecha fin (ISO string)
   * @returns Promise con la entrada de waitlist creada
   */
  async addToWaitlist(
    carId: string,
    startDate: string,
    endDate: string,
  ): Promise<{
    success: boolean;
    waitlistEntry?: WaitlistEntry;
    error?: string;
  }> {
    try {
      const { data, error } = await this.supabase.rpc('add_to_waitlist', {
        p_car_id: carId,
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) {
        this.logger.error('Error adding to waitlist', error?.message || String(error));
        return {
          success: false,
          error: error.message || 'Error al agregar a la lista de espera',
        };
      }

      return {
        success: true,
        waitlistEntry: data as WaitlistEntry,
      };
    } catch (error: unknown) {
      this.logger.error('Exception adding to waitlist', (error as Error)?.message || String(error));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al agregar a la lista de espera',
      };
    }
  }

  /**
   * Remueve una entrada de waitlist
   * @param waitlistId - ID de la entrada de waitlist
   * @returns Promise con resultado de la operación
   */
  async removeFromWaitlist(waitlistId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const { error } = await this.supabase.rpc('remove_from_waitlist', {
        p_waitlist_id: waitlistId,
      });

      if (error) {
        this.logger.error('Error removing from waitlist', error?.message || String(error));
        return {
          success: false,
          error: error.message || 'Error al remover de la lista de espera',
        };
      }

      return { success: true };
    } catch (error: unknown) {
      this.logger.error(
        'Exception removing from waitlist',
        (error as Error)?.message || String(error),
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al remover de la lista de espera',
      };
    }
  }

  /**
   * Obtiene todas las entradas activas de waitlist del usuario actual
   * @returns Promise con lista de entradas de waitlist
   */
  async getMyWaitlist(): Promise<WaitlistEntry[]> {
    try {
      const { data, error } = await this.supabase.rpc('get_my_waitlist');

      if (error) {
        this.logger.error('Error getting waitlist', error?.message || String(error));
        return [];
      }

      return (data ?? []) as WaitlistEntry[];
    } catch (error: unknown) {
      this.logger.error('Exception getting waitlist', (error as Error)?.message || String(error));
      return [];
    }
  }

  /**
   * Verifica cuántos usuarios están en waitlist para un auto en fechas específicas
   * @param carId - ID del auto
   * @param startDate - Fecha inicio (ISO string)
   * @param endDate - Fecha fin (ISO string)
   * @returns Promise con el número de usuarios en waitlist
   */
  async getWaitlistCount(carId: string, startDate: string, endDate: string): Promise<number> {
    try {
      const { data, error } = await this.supabase.rpc('get_waitlist_count', {
        p_car_id: carId,
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) {
        this.logger.error('Error getting waitlist count', error?.message || String(error));
        return 0;
      }

      return (data ?? 0) as number;
    } catch (error: unknown) {
      this.logger.error(
        'Exception getting waitlist count',
        (error as Error)?.message || String(error),
      );
      return 0;
    }
  }
}
