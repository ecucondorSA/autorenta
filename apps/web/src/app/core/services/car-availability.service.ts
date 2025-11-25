import { Injectable, inject } from '@angular/core';
import { BlockedDateRange } from '../../shared/components/date-range-picker/date-range-picker.component';
import { Car } from '../models';
import { CarBlockingService } from './car-blocking.service';
import { injectSupabase } from './supabase-client.service';

/**
 * Blocked date range from database
 */
export interface BlockedDateRangeDB {
  booking_id: string;
  start_date: string;
  end_date: string;
  status: 'confirmed' | 'in_progress';
}

/**
 * Detailed blocked range with type information
 */
export interface DetailedBlockedRange {
  from: string;
  to: string;
  type: 'booking' | 'manual_block';
  reason?: string;
  notes?: string;
  booking_id?: string;
  block_id?: string;
}

/**
 * Car Availability Service
 *
 * Provides intelligent calendar availability checking by querying
 * the database for blocked dates (confirmed/in_progress bookings).
 *
 * Features:
 * - Get blocked date ranges for a car
 * - Check if a date range is available
 * - Find next available date
 * - Caching for performance (5 minutes TTL)
 *
 * @example
 * ```typescript
 * // Get blocked dates for calendar
 * const blocked = await availability.getBlockedDates(carId);
 *
 * // Check if dates are available
 * const available = await availability.checkAvailability(carId, '2025-01-01', '2025-01-07');
 *
 * // Find next available date
 * const nextDate = await availability.getNextAvailableDate(carId, '2025-01-01');
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class CarAvailabilityService {
  private readonly supabase = injectSupabase();
  private readonly carBlockingService = inject(CarBlockingService);

  // Cache for blocked dates (5 minutes TTL)
  private readonly cache = new Map<string, { data: BlockedDateRange[]; timestamp: number }>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  // ✅ P0-022 FIX: Real-time subscriptions for car availability updates
  private realtimeSubscriptions = new Map<string, ReturnType<typeof this.supabase.channel>>();

  /**
   * Get all blocked date ranges for a car
   *
   * Returns dates where the car is unavailable due to confirmed
   * or in-progress bookings AND manual owner blocks.
   *
   * Results are cached for 5 minutes to reduce database load.
   *
   * @param carId - UUID of the car
   * @param startDate - Start of date range to check (default: today)
   * @param endDate - End of date range to check (default: 6 months from today)
   * @returns Array of blocked date ranges
   */
  async getBlockedDates(
    carId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<BlockedDateRange[]> {
    // Check cache first
    const cacheKey = `${carId}-${startDate || 'default'}-${endDate || 'default'}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.data;
    }

    try {
      // Fetch both booking blocks and manual blocks in parallel
      const [bookingBlocks, manualBlocks] = await Promise.all([
        this.getBookingBlocks(carId, startDate, endDate),
        this.carBlockingService.getBlockedDates(carId),
      ]);

      // Combine and convert to BlockedDateRange format
      const allBlocks: BlockedDateRange[] = [
        ...bookingBlocks.map((range) => ({
          from: range.start_date,
          to: range.end_date,
        })),
        ...manualBlocks.map((block) => ({
          from: block.blocked_from,
          to: block.blocked_to,
        })),
      ];

      // Update cache
      this.cache.set(cacheKey, { data: allBlocks, timestamp: Date.now() });

      return allBlocks;
    } catch (error) {
      console.error('[CarAvailability] Exception in getBlockedDates:', error);
      return []; // Return empty array on error to allow UI to continue
    }
  }

  /**
   * Get blocked dates with detailed information (type, reason, etc.)
   *
   * Useful for owner calendar views where you need to differentiate
   * between bookings and manual blocks.
   *
   * @param carId - UUID of the car
   * @param startDate - Start of date range (optional)
   * @param endDate - End of date range (optional)
   * @returns Array of detailed blocked ranges
   */
  async getBlockedRangesWithDetails(
    carId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<DetailedBlockedRange[]> {
    try {
      // Fetch both booking blocks and manual blocks in parallel
      const [bookingBlocks, manualBlocks] = await Promise.all([
        this.getBookingBlocks(carId, startDate, endDate),
        this.carBlockingService.getBlockedDates(carId),
      ]);

      // Convert booking blocks to detailed format
      const bookingRanges: DetailedBlockedRange[] = bookingBlocks.map((range) => ({
        from: range.start_date,
        to: range.end_date,
        type: 'booking' as const,
        booking_id: range.booking_id,
      }));

      // Convert manual blocks to detailed format
      const manualRanges: DetailedBlockedRange[] = manualBlocks.map((block) => ({
        from: block.blocked_from,
        to: block.blocked_to,
        type: 'manual_block' as const,
        reason: block.reason,
        notes: block.notes,
        block_id: block.id,
      }));

      return [...bookingRanges, ...manualRanges];
    } catch (error) {
      console.error('[CarAvailability] Exception in getBlockedRangesWithDetails:', error);
      return [];
    }
  }

  /**
   * Private helper to fetch booking blocks from database
   */
  private async getBookingBlocks(
    carId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<BlockedDateRangeDB[]> {
    const { data, error } = await this.supabase.rpc('get_car_blocked_dates', {
      p_car_id: carId,
      p_start_date: startDate || undefined,
      p_end_date: endDate || undefined,
    });

    if (error) {
      console.error('[CarAvailability] Error fetching booking blocks:', error);
      throw new Error(`Failed to fetch booking blocks: ${error.message}`);
    }

    return (data as BlockedDateRangeDB[]) || [];
  }

  /**
   * Check if a car is available for the specified date range
   *
   * Returns true if:
   * - Car exists and is active
   * - No confirmed/in_progress bookings overlap with the date range
   * - Dates are valid (start < end, not in past)
   *
   * @param carId - UUID of the car
   * @param startDate - Start date (YYYY-MM-DD)
   * @param endDate - End date (YYYY-MM-DD)
   * @returns true if available, false otherwise
   */
  async checkAvailability(carId: string, startDate: string, endDate: string): Promise<boolean> {
    try {
      // Validate dates client-side first
      const start = new Date(startDate);
      const end = new Date(endDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (start >= end) {
        console.warn('[CarAvailability] Start date must be before end date');
        return false;
      }

      if (start < today) {
        console.warn('[CarAvailability] Cannot book dates in the past');
        return false;
      }

      // Call RPC function
      const { data, error } = await this.supabase.rpc('check_car_availability', {
        p_car_id: carId,
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) {
        console.error('[CarAvailability] Error checking availability:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('[CarAvailability] Exception in checkAvailability:', error);
      return false;
    }
  }

  /**
   * Find the next available date after the specified start date
   *
   * Useful for suggesting alternative dates when the requested
   * date range is not available.
   *
   * Searches up to 1 year in the future.
   *
   * @param carId - UUID of the car
   * @param startDate - Date to start searching from (default: today)
   * @param minDays - Minimum number of days needed (default: 1)
   * @returns Next available date or null if none found within 1 year
   */
  async getNextAvailableDate(
    carId: string,
    startDate?: string,
    minDays: number = 1,
  ): Promise<string | null> {
    try {
      const { data, error } = await this.supabase.rpc('get_next_available_date', {
        p_car_id: carId,
        p_start_date: startDate || undefined,
        p_min_days: minDays,
      });

      if (error) {
        console.error('[CarAvailability] Error finding next available date:', error);
        return null;
      }

      return data as string | null;
    } catch (error) {
      console.error('[CarAvailability] Exception in getNextAvailableDate:', error);
      return null;
    }
  }

  /**
   * Clear cache for a specific car or all cars
   *
   * Call this after creating/updating/cancelling a booking
   * to ensure fresh data on next query.
   *
   * @param carId - UUID of car to clear cache for (optional, clears all if omitted)
   */
  clearCache(carId?: string): void {
    if (carId) {
      // Clear all cache entries for this car
      const keysToDelete: string[] = [];
      for (const key of this.cache.keys()) {
        if (key.startsWith(carId)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach((key) => this.cache.delete(key));
    } else {
      // Clear entire cache
      this.cache.clear();
    }
  }

  /**
   * Create an availability checker function bound to a specific car
   *
   * This is useful for passing to components like date-range-picker
   * that expect a callback function.
   *
   * @param carId - UUID of the car
   * @returns Bound checker function
   *
   * @example
   * ```typescript
   * <app-date-range-picker
   *   [carId]="carId"
   *   [availabilityChecker]="availabilityService.createChecker(carId)"
   * />
   * ```
   */
  /**
   * ✅ SPRINT 2 FIX: Obtener autos disponibles usando RPC function
   * Previene doble reserva validando en base de datos
   */
  async getAvailableCars(
    startDate: string,
    endDate: string,
    options: {
      limit?: number;
      offset?: number;
      city?: string;
    } = {},
  ): Promise<Car[]> {
    const { data, error } = await this.supabase.rpc('get_available_cars', {
      p_start_date: startDate,
      p_end_date: endDate,
      p_limit: options.limit || 100,
      p_offset: options.offset || 0,
    });

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Filtrar por ciudad si se especificó
    let filteredCars = data;
    if (options.city) {
      filteredCars = data.filter((car: Record<string, unknown>) => {
        const carLocation = car.location as Record<string, unknown> | undefined;
        const cityInLocation = (carLocation?.city as string | undefined)?.toLowerCase();
        return cityInLocation?.includes(options.city!.toLowerCase());
      });
    }

    // Cargar fotos para cada auto (la RPC no las incluye por performance)
    const carsWithPhotos = await Promise.all(
      filteredCars.map(async (car: Record<string, unknown>) => {
        const { data: photos } = await this.supabase
          .from('car_photos')
          .select('*')
          .eq('car_id', car.id)
          .order('position');

        return {
          ...car,
          photos: photos || [],
        } as Car;
      }),
    );

    return carsWithPhotos;
  }

  /**
   * ✅ NUEVO: Verifica si un auto tiene reservas activas
   */
  async hasActiveBookings(carId: string): Promise<{
    hasActive: boolean;
    count: number;
    bookings?: Array<{ id: string; status: string; start_date: string; end_date: string }>;
  }> {
    const { data: allBookings, error: allError } = await this.supabase
      .from('bookings')
      .select('id, status')
      .eq('car_id', carId);

    if (allError) {
      throw allError;
    }

    if (allBookings && allBookings.length > 0) {
      const { data: activeBookings, error: activeError } = await this.supabase
        .from('bookings')
        .select('id, status, start_date, end_date')
        .eq('car_id', carId)
        .in('status', ['pending', 'confirmed', 'in_progress'])
        .order('start_date', { ascending: true });

      if (activeError) throw activeError;

      return {
        hasActive: true,
        count: allBookings.length,
        bookings: activeBookings || [],
      };
    }

    return {
      hasActive: false,
      count: 0,
      bookings: [],
    };
  }

  /**
   * ✅ NUEVO: Obtener próximos rangos de fechas disponibles
   *
   * Busca huecos (gaps) disponibles en el calendario entre reservas existentes.
   * Retorna los X rangos disponibles más próximos ordenados por fecha.
   *
   * @param carId - ID del auto
   * @param startDate - Fecha inicial para buscar (ISO string)
   * @param endDate - Fecha final para buscar (ISO string)
   * @param _maxOptions - Máximo número de opciones a retornar (default: 3)
   * @returns Array de rangos disponibles con duración en días
   */
  async getNextAvailableRange(
    carId: string,
    startDate: string,
    endDate: string,
    _maxOptions = 3,
  ): Promise<
    Array<{
      startDate: string;
      endDate: string;
      daysCount: number;
    }>
  > {
    try {
      const searchStart = new Date(startDate);
      const searchEnd = new Date(endDate);
      searchStart.setHours(0, 0, 0, 0);
      searchEnd.setHours(23, 59, 59, 999);

      // Obtener todas las reservas y bloques manuales para este auto
      const { data: bookings, error } = await this.supabase
        .from('bookings')
        .select('start_at, end_at')
        .eq('car_id', carId)
        .in('status', ['pending', 'confirmed', 'in_progress'])
        .gte('end_at', searchStart.toISOString())
        .lte('start_at', searchEnd.toISOString())
        .order('start_at', { ascending: true });

      if (error) {
        console.error('Error fetching bookings for availability:', error);
        return [];
      }

      // Obtener bloques manuales del propietario
      const manualBlocks = await this.carBlockingService.getBlockedDates(carId);

      // Combinar y ordenar todos los bloques (bookings + manual blocks)
      const allBlocks = [
        ...(bookings || []).map((b) => ({
          start: new Date(b.start_at),
          end: new Date(b.end_at),
        })),
        ...manualBlocks.map((m) => ({
          start: new Date(m.blocked_from),
          end: new Date(m.blocked_to),
        })),
      ].sort((a, b) => a.start.getTime() - b.start.getTime());

      // Encontrar huecos (gaps) disponibles
      const availableRanges: Array<{ startDate: string; endDate: string; daysCount: number }> = [];
      let currentGapStart = searchStart;

      for (const block of allBlocks) {
        // Si hay espacio entre el gap actual y este bloque
        if (currentGapStart < block.start) {
          const gapEnd = new Date(Math.min(block.start.getTime(), searchEnd.getTime()));
          const daysCount = Math.ceil((gapEnd.getTime() - currentGapStart.getTime()) / (1000 * 60 * 60 * 24));

          if (daysCount > 0) {
            availableRanges.push({
              startDate: currentGapStart.toISOString().split('T')[0],
              endDate: new Date(gapEnd.getTime() - 1).toISOString().split('T')[0],
              daysCount,
            });
          }
        }

        // Mover el inicio del siguiente gap al final de este bloque
        currentGapStart = new Date(Math.max(currentGapStart.getTime(), block.end.getTime()));
      }

      // Agregar gap final si existe
      if (currentGapStart < searchEnd) {
        const daysCount = Math.ceil((searchEnd.getTime() - currentGapStart.getTime()) / (1000 * 60 * 60 * 24));
        if (daysCount > 0) {
          availableRanges.push({
            startDate: currentGapStart.toISOString().split('T')[0],
            endDate: searchEnd.toISOString().split('T')[0],
            daysCount,
          });
        }
      }

      // Retornar los primeros N rangos disponibles (máximo _maxOptions)
      return availableRanges.slice(0, _maxOptions);
    } catch (error) {
      console.error('Error calculating next available range:', error);
      return [];
    }
  }

  /**
   * ✅ FIX P0.2: Filtrar autos que NO tienen reservas conflictivas
   * Verifica disponibilidad real contra bookings existentes
   */
  async filterByAvailability(
    cars: Car[],
    startDate: string,
    endDate: string,
    additionalBlockedIds: string[] = [],
  ): Promise<Car[]> {
    if (cars.length === 0) return [];

    const carIds = cars.map((c) => c.id);

    const { data: conflicts, error } = await this.supabase
      .from('bookings')
      .select('car_id')
      .in('car_id', carIds)
      .in('status', ['confirmed', 'in_progress', 'pending'])
      .or(`start_at.lte.${endDate},end_at.gte.${startDate}`);

    if (error) {
      return cars;
    }

    const blockedIds = new Set([
      ...additionalBlockedIds,
      ...(conflicts || []).map((c) => c.car_id),
    ]);

    return cars.filter((car) => !blockedIds.has(car.id));
  }

  createChecker(carId: string): (carId: string, from: string, to: string) => Promise<boolean> {
    return async (_carId: string, from: string, to: string) => {
      return this.checkAvailability(carId, from, to);
    };
  }

  /**
   * ✅ P0-022 FIX: Subscribe to real-time availability updates for a car
   *
   * Listens to bookings table changes and clears cache when availability changes
   * This ensures users always see the most up-to-date availability
   *
   * @param carId - UUID of the car to monitor
   * @param callback - Optional callback to execute when availability changes
   * @returns Subscription ID
   */
  subscribeToAvailabilityUpdates(
    carId: string,
    callback?: (payload: { car_id: string; status: string }) => void,
  ): string {
    // Check if already subscribed
    if (this.realtimeSubscriptions.has(carId)) {
      console.warn(`Already subscribed to availability updates for car ${carId}`);
      return carId;
    }

    // Create channel for this car
    const channel = this.supabase
      .channel(`car-availability:${carId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'bookings',
          filter: `car_id=eq.${carId}`,
        },
        (payload) => {
          console.log('Car availability changed via Realtime:', payload);

          // Clear cache for this car
          this.clearCache(carId);

          // Execute callback if provided
          if (callback && payload.new && typeof payload.new === 'object') {
            const newRecord = payload.new as { car_id: string; status: string };
            callback({
              car_id: newRecord.car_id,
              status: newRecord.status,
            });
          }
        },
      )
      .subscribe((status) => {
        console.log(`Realtime subscription status for car ${carId}:`, status);
      });

    // Store subscription
    this.realtimeSubscriptions.set(carId, channel);

    return carId;
  }

  /**
   * ✅ P0-022 FIX: Unsubscribe from real-time availability updates
   *
   * @param carId - UUID of the car to stop monitoring
   */
  unsubscribeFromAvailabilityUpdates(carId: string): void {
    const subscription = this.realtimeSubscriptions.get(carId);

    if (subscription) {
      this.supabase.removeChannel(subscription);
      this.realtimeSubscriptions.delete(carId);
      console.log(`Unsubscribed from availability updates for car ${carId}`);
    }
  }

  /**
   * ✅ P0-022 FIX: Subscribe to global availability updates (all cars)
   *
   * Useful for map views showing multiple cars
   *
   * @param callback - Callback to execute when any car's availability changes
   * @returns Subscription ID
   */
  subscribeToAllAvailabilityUpdates(
    callback: (payload: { car_id: string; status: string }) => void,
  ): string {
    const subscriptionId = 'global-availability';

    // Check if already subscribed
    if (this.realtimeSubscriptions.has(subscriptionId)) {
      console.warn('Already subscribed to global availability updates');
      return subscriptionId;
    }

    // Create channel for all bookings
    const channel = this.supabase
      .channel('all-bookings-availability')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'bookings',
        },
        (payload) => {
          console.log('Booking changed via Realtime:', payload);

          // Extract car_id from payload
          let carId: string | undefined;
          if (payload.new && typeof payload.new === 'object') {
            const newRecord = payload.new as { car_id: string; status: string };
            carId = newRecord.car_id;

            // Clear cache for affected car
            if (carId) {
              this.clearCache(carId);
              callback({
                car_id: carId,
                status: newRecord.status,
              });
            }
          } else if (payload.old && typeof payload.old === 'object') {
            // Handle DELETE events
            const oldRecord = payload.old as { car_id: string; status: string };
            carId = oldRecord.car_id;

            if (carId) {
              this.clearCache(carId);
              callback({
                car_id: carId,
                status: 'deleted',
              });
            }
          }
        },
      )
      .subscribe((status) => {
        console.log('Global realtime subscription status:', status);
      });

    // Store subscription
    this.realtimeSubscriptions.set(subscriptionId, channel);

    return subscriptionId;
  }

  /**
   * ✅ P0-022 FIX: Cleanup all realtime subscriptions
   *
   * Should be called when component/service is destroyed
   */
  unsubscribeAll(): void {
    for (const [key, subscription] of this.realtimeSubscriptions.entries()) {
      this.supabase.removeChannel(subscription);
      console.log(`Unsubscribed from ${key}`);
    }
    this.realtimeSubscriptions.clear();
  }
}
