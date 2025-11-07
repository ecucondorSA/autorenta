import { Injectable, inject, signal } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { format } from 'date-fns';
import { SupabaseService } from './supabase.service';

export interface BlockedDateRange {
  id: string;
  car_id: string;
  blocked_from: string; // YYYY-MM-DD
  blocked_to: string; // YYYY-MM-DD
  reason: string;
  notes?: string;
  created_at: string;
  created_by: string;
}

export interface BlockDateParams {
  carId: string;
  startDate: Date;
  endDate: Date;
  reason: 'maintenance' | 'personal_use' | 'vacation' | 'other';
  notes?: string;
}

@Injectable({
  providedIn: 'root',
})
export class CarBlockingService {
  private readonly supabase: SupabaseClient;
  private readonly cache = new Map<string, { data: BlockedDateRange[]; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    const supabaseService = inject(SupabaseService);
    this.supabase = supabaseService.getClient();
  }

  /**
   * Bloquea un rango de fechas para un auto
   */
  async blockDates(params: BlockDateParams): Promise<BlockedDateRange | null> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const { data: userData } = await this.supabase.auth.getUser();
      if (!userData.user) {
        throw new Error('Usuario no autenticado');
      }

      const blockData = {
        car_id: params.carId,
        blocked_from: format(params.startDate, 'yyyy-MM-dd'),
        blocked_to: format(params.endDate, 'yyyy-MM-dd'),
        reason: params.reason,
        notes: params.notes || null,
        created_by: userData.user.id,
      };

      const { data, error } = await this.supabase
        .from('car_blocked_dates')
        .insert(blockData)
        .select()
        .single();

      if (error) throw error;

      // Invalidar cache
      this.clearCache(params.carId);

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al bloquear fechas';
      this.error.set(errorMsg);
      console.error('Error blocking dates:', err);
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Bloquea fechas en múltiples autos simultáneamente
   */
  async bulkBlockDates(
    carIds: string[],
    startDate: Date,
    endDate: Date,
    reason: BlockDateParams['reason'],
    notes?: string,
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    this.loading.set(true);
    this.error.set(null);

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    try {
      const { data: userData } = await this.supabase.auth.getUser();
      if (!userData.user) {
        throw new Error('Usuario no autenticado');
      }

      const blocksData = carIds.map((carId) => ({
        car_id: carId,
        blocked_from: format(startDate, 'yyyy-MM-dd'),
        blocked_to: format(endDate, 'yyyy-MM-dd'),
        reason,
        notes: notes || null,
        created_by: userData.user.id,
      }));

      const { data, error } = await this.supabase.from('car_blocked_dates').insert(blocksData).select();

      if (error) {
        errors.push(error.message);
        failed = carIds.length;
      } else {
        success = data?.length || 0;
        failed = carIds.length - success;

        // Invalidar cache de todos los autos
        carIds.forEach((carId) => this.clearCache(carId));
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error en bloqueo masivo';
      errors.push(errorMsg);
      failed = carIds.length;
    } finally {
      this.loading.set(false);
    }

    return { success, failed, errors };
  }

  /**
   * Desbloquea un rango de fechas específico por ID
   */
  async unblockById(blockId: string, carId: string): Promise<boolean> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const { error } = await this.supabase.from('car_blocked_dates').delete().eq('id', blockId);

      if (error) throw error;

      // Invalidar cache
      this.clearCache(carId);

      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al desbloquear fechas';
      this.error.set(errorMsg);
      console.error('Error unblocking dates:', err);
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Obtiene todos los bloqueos manuales de un auto
   */
  async getBlockedDates(carId: string, useCache = true): Promise<BlockedDateRange[]> {
    // Verificar cache
    if (useCache) {
      const cached = this.cache.get(carId);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.data;
      }
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      const { data, error } = await this.supabase
        .from('car_blocked_dates')
        .select('*')
        .eq('car_id', carId)
        .order('blocked_from', { ascending: true });

      if (error) throw error;

      const blocks = data || [];

      // Actualizar cache
      this.cache.set(carId, {
        data: blocks,
        timestamp: Date.now(),
      });

      return blocks;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al obtener bloqueos';
      this.error.set(errorMsg);
      console.error('Error getting blocked dates:', err);
      return [];
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Obtiene todos los bloqueos de múltiples autos
   */
  async getBlockedDatesForCars(carIds: string[]): Promise<Map<string, BlockedDateRange[]>> {
    this.loading.set(true);
    this.error.set(null);

    const result = new Map<string, BlockedDateRange[]>();

    try {
      const { data, error } = await this.supabase
        .from('car_blocked_dates')
        .select('*')
        .in('car_id', carIds)
        .order('blocked_from', { ascending: true });

      if (error) throw error;

      // Agrupar por car_id
      (data || []).forEach((block) => {
        if (!result.has(block.car_id)) {
          result.set(block.car_id, []);
        }
        result.get(block.car_id)!.push(block);
      });

      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al obtener bloqueos múltiples';
      this.error.set(errorMsg);
      console.error('Error getting blocked dates for multiple cars:', err);
      return result;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Limpia todos los bloqueos de un auto
   */
  async clearAllBlocks(carId: string): Promise<boolean> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const { error } = await this.supabase.from('car_blocked_dates').delete().eq('car_id', carId);

      if (error) throw error;

      // Invalidar cache
      this.clearCache(carId);

      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al limpiar bloqueos';
      this.error.set(errorMsg);
      console.error('Error clearing all blocks:', err);
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Limpia el cache de un auto específico o todos
   */
  clearCache(carId?: string): void {
    if (carId) {
      this.cache.delete(carId);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Convierte bloqueos a array de fechas YYYY-MM-DD
   */
  convertBlocksToDateArray(blocks: BlockedDateRange[]): string[] {
    const dates: string[] = [];

    blocks.forEach((block) => {
      const start = new Date(block.blocked_from);
      const end = new Date(block.blocked_to);

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(format(d, 'yyyy-MM-dd'));
      }
    });

    return dates;
  }
}
