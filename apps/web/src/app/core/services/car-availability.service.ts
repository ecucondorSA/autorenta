import { Injectable, inject } from '@angular/core';
import { BlockedDateRange } from '../../shared/components/date-range-picker/date-range-picker.component';
import { injectSupabase } from './supabase-client.service';
import { CarBlockingService, BlockedDateRange as ManualBlock } from './car-blocking.service';
import { LoggerService } from './logger.service';

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
  private readonly logger = inject(LoggerService).createChildLogger('CarAvailability');

  // Cache for blocked dates (5 minutes TTL)
  private readonly cache = new Map<string, { data: BlockedDateRange[]; timestamp: number }>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

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
      this.logger.error('Exception in getBlockedDates', error);
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
      this.logger.error('Exception in getBlockedRangesWithDetails', error);
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
      this.logger.error('Error fetching booking blocks', error);
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
        this.logger.warn('Start date must be before end date');
        return false;
      }

      if (start < today) {
        this.logger.warn('Cannot book dates in the past');
        return false;
      }

      // Call RPC function
      const { data, error } = await this.supabase.rpc('check_car_availability', {
        p_car_id: carId,
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) {
        this.logger.error('Error checking availability', error);
        return false;
      }

      return data === true;
    } catch (error) {
      this.logger.error('Exception in checkAvailability', error);
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
        this.logger.error('Error finding next available date', error);
        return null;
      }

      return data as string | null;
    } catch (error) {
      this.logger.error('Exception in getNextAvailableDate', error);
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
  createChecker(carId: string): (carId: string, from: string, to: string) => Promise<boolean> {
    return async (_carId: string, from: string, to: string) => {
      return this.checkAvailability(carId, from, to);
    };
  }
}
