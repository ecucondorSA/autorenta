import { Injectable, inject } from '@angular/core';
import type { Car } from '../models';
import { SupabaseClientService } from './supabase-client.service';

export interface CarBlackout {
  starts_at: string;
  ends_at: string;
  reason: string | null;
}

export interface CarHandoverPoint {
  id: string;
  kind: string;
  lat: number;
  lng: number;
  radius_m: number | null;
}

export interface DetailedBlockedRange {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  type: 'booking' | 'blackout' | 'manual_block';
  reason?: string | null;
  notes?: string | null;
  block_id?: string;
}

export interface AvailabilityRange {
  from: string;
  to: string;
}

@Injectable({ providedIn: 'root' })
export class CarAvailabilityService {
  private readonly supabase = inject(SupabaseClientService).getClient();

  async getBlackouts(carId: string): Promise<CarBlackout[]> {
    // car_blackouts table no longer exists; use car_blocked_dates as source
    const { data, error } = await this.supabase
      .from('car_blocked_dates')
      .select('blocked_from, blocked_to, reason')
      .eq('car_id', carId)
      .order('blocked_from', { ascending: true });

    if (error) {
      throw error;
    }

    return (data || []).map((row) => ({
      starts_at: row.blocked_from,
      ends_at: row.blocked_to,
      reason: row.reason ?? null,
    })) as CarBlackout[];
  }

  async getHandoverPoints(carId: string): Promise<CarHandoverPoint[]> {
    const { data, error } = await this.supabase
      .from('car_handover_points')
      .select('id, kind, lat, lng, radius_m')
      .eq('car_id', carId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data || []) as CarHandoverPoint[];
  }

  async getBlockedRangesWithDetails(
    carId: string,
    fromDate: string,
    toDate: string,
  ): Promise<DetailedBlockedRange[]> {
    type ManualBlockRow = {
      id: string;
      blocked_from: string;
      blocked_to: string;
      reason: string;
      notes?: string | null;
    };

    // Normalize date boundaries
    const fromIso = this.normalizeToDate(fromDate).toISOString();
    const toIso = this.normalizeToDate(toDate).toISOString();
    const fromDateOnly = this.toDateString(this.normalizeToDate(fromDate));
    const toDateOnly = this.toDateString(this.normalizeToDate(toDate));

    // Execute all queries in parallel for better performance
    // Overlap logic: range1 overlaps range2 when start1 <= end2 AND end1 >= start2
    const [bookingsResult, manualBlocksResult] = await Promise.all([
      this.supabase
        .from('bookings')
        .select('start_at, end_at')
        .eq('car_id', carId)
        .in('status', ['confirmed', 'in_progress'])
        .lte('start_at', toIso)
        .gte('end_at', fromIso),
      this.supabase
        .from('car_blocked_dates')
        .select('id, blocked_from, blocked_to, reason, notes')
        .eq('car_id', carId)
        .lte('blocked_from', toDateOnly)
        .gte('blocked_to', fromDateOnly),
    ]);

    const bookings = bookingsResult.data;
    const manualRows = (manualBlocksResult.data || []) as ManualBlockRow[];

    const ranges: DetailedBlockedRange[] = [];

    if (bookings) {
      ranges.push(
        ...bookings.map((b) => ({
          from: this.toDateString(b.start_at),
          to: this.toDateString(b.end_at),
          type: 'booking' as const,
          reason: 'Reserva',
        })),
      );
    }

    if (manualRows.length) {
      ranges.push(
        ...manualRows.map(
          (b) =>
            ({
              from: b.blocked_from,
              to: b.blocked_to,
              type: 'manual_block' as const,
              reason: b.reason,
              notes: b.notes || null,
              block_id: b.id,
            }) as DetailedBlockedRange,
        ),
      );
    }

    return ranges;
  }

  async checkAvailability(
    carId: string,
    start: Date | string,
    end: Date | string,
  ): Promise<boolean> {
    const fromIso = this.normalizeToDate(start).toISOString();
    const toIso = this.normalizeToDate(end).toISOString();
    const ranges = await this.getBlockedRangesWithDetails(carId, fromIso, toIso);
    return ranges.length === 0;
  }

  async getBlockedDates(
    carId: string,
    start?: Date | string,
    end?: Date | string,
  ): Promise<DetailedBlockedRange[]> {
    const startDate = this.normalizeToDate(start ?? new Date());
    const endDate = this.normalizeToDate(end ?? this.addDays(new Date(), 90));
    const fromIso = startDate.toISOString();
    const toIso = endDate.toISOString();
    const ranges = await this.getBlockedRangesWithDetails(carId, fromIso, toIso);

    return ranges.map((r) => ({ ...r }));
  }

  async getNextAvailableDate(carId: string, from: Date | string): Promise<string | null> {
    const startDate = this.normalizeToDate(from);
    const searchHorizon = this.addDays(startDate, 90);
    const blocked = await this.getBlockedDates(carId, startDate, searchHorizon);

    // Build occupied day set
    const occupied = new Set<string>();
    for (const range of blocked) {
      let cursor = new Date(range.from);
      const to = new Date(range.to);
      while (cursor <= to) {
        occupied.add(this.toDateString(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    const cursor = new Date(startDate);
    while (cursor <= searchHorizon) {
      const key = this.toDateString(cursor);
      if (!occupied.has(key)) {
        return key;
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    return null;
  }

  async getNextAvailableRange(
    carId: string,
    start: Date | string,
    end?: Date | string,
    maxOptions = 3,
  ): Promise<Array<{ startDate: string; endDate: string; daysCount: number }>> {
    const startDate = this.normalizeToDate(start);
    const searchEnd = this.normalizeToDate(end ?? this.addDays(startDate, 60));
    const blocked = await this.getBlockedDates(carId, startDate, searchEnd);

    const ranges = blocked.sort((a, b) => (a.from < b.from ? -1 : 1));
    let cursor = new Date(startDate);
    const available: Array<{ startDate: string; endDate: string; daysCount: number }> = [];

    for (const range of ranges) {
      const rangeStart = new Date(range.from);
      const rangeEnd = new Date(range.to);
      if (cursor < rangeStart) {
        const startIso = this.toDateString(cursor);
        const endIso = this.toDateString(this.addDays(rangeStart, -1));
        const daysCount = Math.max(1, this.differenceInCalendarDays(rangeStart, cursor));
        available.push({ startDate: startIso, endDate: endIso, daysCount });
        if (available.length >= maxOptions) return available;
      }
      if (cursor <= rangeEnd) {
        cursor = this.addDays(rangeEnd, 1);
      }
    }

    if (cursor <= searchEnd && available.length < maxOptions) {
      const startIso = this.toDateString(cursor);
      const endIso = this.toDateString(searchEnd);
      const daysCount = Math.max(1, this.differenceInCalendarDays(searchEnd, cursor) + 1);
      available.push({ startDate: startIso, endDate: endIso, daysCount });
    }

    return available;
  }

  /**
   * Filters cars by availability using batch queries instead of N+1 queries.
   * Executes only 3 queries total regardless of the number of cars.
   */
  async filterByAvailability<T extends { id: string }>(
    cars: T[],
    start: Date | string,
    end: Date | string,
    excludedCarIds: string[] = [],
  ): Promise<T[]> {
    if (cars.length === 0) return [];

    const fromIso = this.normalizeToDate(start).toISOString();
    const toIso = this.normalizeToDate(end).toISOString();
    const carIds = cars.map((c) => c.id).filter((id) => !excludedCarIds.includes(id));

    if (carIds.length === 0) return [];

    // Batch query: get all blocked car IDs in a single set of queries
    const blockedByConflict = await this.getBlockedCarIds(fromIso, toIso, carIds);

    return cars.filter((car) => !excludedCarIds.includes(car.id) && !blockedByConflict.has(car.id));
  }

  /**
   * Returns a Set of car IDs that have conflicts in the given date range.
   * Uses batch queries (3 total) instead of per-car queries.
   * @param carIds - Optional list of car IDs to filter. If not provided, checks all cars.
   */
  private async getBlockedCarIds(
    fromDate: string,
    toDate: string,
    carIds?: string[],
  ): Promise<Set<string>> {
    // Build queries with optional car_id filter
    const buildBookingsQuery = () => {
      let q = this.supabase
        .from('bookings')
        .select('car_id')
        .in('status', ['confirmed', 'in_progress'])
        .lte('start_at', toDate)
        .gte('end_at', fromDate);
      if (carIds?.length) q = q.in('car_id', carIds);
      return q;
    };

    // car_blackouts table no longer exists - removed query
    // Use car_blocked_dates for all manual blocks

    const buildBlockedDatesQuery = () => {
      let q = this.supabase
        .from('car_blocked_dates')
        .select('car_id')
        .lte('blocked_from', toDate)
        .gte('blocked_to', fromDate);
      if (carIds?.length) q = q.in('car_id', carIds);
      return q;
    };

    const [bookingsResult, manualBlocksResult] = await Promise.all([
      buildBookingsQuery(),
      buildBlockedDatesQuery(),
    ]);

    const blockedIds = new Set<string>();

    for (const row of bookingsResult.data || []) {
      blockedIds.add(row.car_id);
    }
    for (const row of manualBlocksResult.data || []) {
      blockedIds.add(row.car_id);
    }

    return blockedIds;
  }

  /**
   * Gets available cars with proper pagination.
   * First fetches all blocked car IDs, then paginates excluding them.
   * This ensures consistent pagination results.
   */
  async getAvailableCars(
    start: Date | string,
    end: Date | string,
    options: { limit?: number; offset?: number; city?: string; carIds?: string[] } = {},
  ): Promise<Car[]> {
    const { limit = 50, offset = 0, city, carIds } = options;
    const fromIso = this.normalizeToDate(start).toISOString();
    const toIso = this.normalizeToDate(end).toISOString();

    // First, get all car IDs that are blocked in this date range
    const blockedCarIds = await this.getBlockedCarIds(fromIso, toIso);

    // Build query excluding blocked cars
    let query = this.supabase.from('cars').select('*').eq('status', 'active');
    if (city) query = query.eq('location_city', city);
    if (carIds?.length) query = query.in('id', carIds);

    // Exclude blocked cars from pagination (if any)
    if (blockedCarIds.size > 0) {
      const blockedArray = Array.from(blockedCarIds);
      // Use Supabase SDK's native array support for NOT IN
      query = query.not('id', 'in', blockedArray);
    }

    const { data, error } = await query.range(offset, offset + limit - 1);
    if (error) throw error;

    return (data || []) as Car[];
  }

  async hasActiveBookings(carId: string): Promise<{
    hasActive: boolean;
    count: number;
    bookings?: Array<{ id: string; status: string; start_date: string; end_date: string }>;
  }> {
    type BookingRow = { id: string; status: string; start_at: string; end_at: string };
    const { data, error, count } = await this.supabase
      .from('bookings')
      .select('id, status, start_at, end_at', { count: 'exact' })
      .eq('car_id', carId)
      .in('status', ['confirmed', 'in_progress'])
      .order('start_at', { ascending: true })
      .limit(10);

    if (error) {
      console.warn('hasActiveBookings error', error);
      return { hasActive: false, count: 0 };
    }

    const bookings = (data || []) as BookingRow[];
    return {
      hasActive: (count ?? 0) > 0,
      count: count ?? 0,
      bookings: bookings.map((b) => ({
        id: b.id,
        status: b.status,
        start_date: b.start_at,
        end_date: b.end_at,
      })),
    };
  }

  private normalizeToDate(value: Date | string): Date {
    if (value instanceof Date) return new Date(value);
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error(`Invalid date value: ${value}`);
    }
    return parsed;
  }

  private addDays(date: Date, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  /**
   * Safely extracts YYYY-MM-DD from a date string or Date object.
   * Handles both ISO strings and date objects without timezone issues.
   */
  private toDateString(value: Date | string): string {
    if (typeof value === 'string') {
      // If already YYYY-MM-DD format, return as-is
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
      // Extract date part from ISO string
      const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
      if (match) return match[1];
    }
    // For Date objects, use UTC to avoid timezone shifts
    const d = value instanceof Date ? value : new Date(value);
    return d.toISOString().slice(0, 10);
  }

  /**
   * Calculates the difference in calendar days between two dates.
   * Uses UTC to avoid DST issues (days with 23 or 25 hours).
   */
  private differenceInCalendarDays(later: Date, earlier: Date): number {
    // Normalize both dates to UTC midnight to avoid DST issues
    const utcLater = Date.UTC(later.getFullYear(), later.getMonth(), later.getDate());
    const utcEarlier = Date.UTC(earlier.getFullYear(), earlier.getMonth(), earlier.getDate());
    return Math.round((utcLater - utcEarlier) / 86400000);
  }
}
