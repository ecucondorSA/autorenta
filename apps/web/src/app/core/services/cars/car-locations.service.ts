import { LoggerService } from '@core/services/infrastructure/logger.service';
import { Injectable, inject } from '@angular/core';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { environment } from '@environment';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { CarAvailabilityService } from '@core/services/cars/car-availability.service';

const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_REFRESH_MS = 60 * 1000;

export interface CarMapLocation {
  carId: string;
  title: string;
  pricePerDay: number;
  pricePerHour?: number; // Dynamic pricing
  currency: string;
  surgeActive?: boolean; // Surge pricing indicator
  lat: number;
  lng: number;
  updatedAt: string;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  locationLabel: string;
  formattedAddress?: string | null;
  photoUrl?: string | null;
  photoGallery?: string[] | null;
  description?: string | null;
  // Availability status
  availabilityStatus?: 'available' | 'in_use' | 'soon_available' | 'unavailable';
  nextAvailableDate?: string | null; // ISO date string
  currentBookingEndDate?: string | null; // ISO date string for "soon_available"
  // Instant booking & availability flags
  instantBooking?: boolean; // Auto-approval enabled (can book immediately)
  availableToday?: boolean; // Available for pickup today
  availableTomorrow?: boolean; // Available for pickup tomorrow
  minRentalDays?: number; // Minimum rental period
  maxRentalDays?: number; // Maximum rental period
  // Dynamic pricing info
  depositRequired?: boolean;
  depositAmount?: number;
  insuranceIncluded?: boolean;
  usesDynamicPricing?: boolean; // Car opts into dynamic pricing
  // Specs
  transmission?: string;
  seats?: number;
  fuelType?: string;
}

interface CacheEntry {
  data: CarMapLocation[];
  expiresAt: number;
}

interface ReviewsCacheEntry {
  reviewsCount: number;
  expiresAt: number;
}

@Injectable({
  providedIn: 'root',
})
export class CarLocationsService {
  private readonly logger = inject(LoggerService);
  private readonly supabase = injectSupabase();
  private readonly availabilityService = inject(CarAvailabilityService);
  private readonly cacheTtlMs = environment.carLocationsCacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
  private readonly refreshMs = environment.carLocationsRefreshMs ?? DEFAULT_REFRESH_MS;
  private readonly reviewsCacheTtlMs = 10 * 60 * 1000; // 10 minutes for reviews cache

  private cache: CacheEntry | null = null;
  private reviewsCache = new Map<string, ReviewsCacheEntry>();
  private realtimeChannel: RealtimeChannel | null = null;

  async fetchActiveLocations(
    force = false,
    includeAvailability = false,
    options?: {
      center?: { lat: number; lng: number };
      radiusKm?: number;
      dateRange?: { from: string; to: string };
      instantBookingOnly?: boolean;
    },
  ): Promise<CarMapLocation[]> {
    const now = Date.now();
    if (!force && this.cache && this.cache.expiresAt > now) {
      const cached = this.cache.data;
      if (includeAvailability) {
        return this.enrichWithAvailability(cached, options);
      }
      return cached;
    }

    const edgeData = await this.tryEdgeFunction();
    const data = edgeData ?? (await this.fetchFromDatabase(options));

    // Enrich with availability if requested
    const enriched = includeAvailability ? await this.enrichWithAvailability(data, options) : data;

    this.cache = {
      data: enriched,
      expiresAt: now + this.cacheTtlMs,
    };
    return enriched;
  }

  /**
   * Enrich car locations with availability status and instant booking flags
   */
  private async enrichWithAvailability(
    locations: CarMapLocation[],
    options?: {
      center?: { lat: number; lng: number };
      radiusKm?: number;
      dateRange?: { from: string; to: string };
      instantBookingOnly?: boolean;
    },
  ): Promise<CarMapLocation[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const in7Days = new Date(today);
    in7Days.setDate(in7Days.getDate() + 7);

    // Use provided date range or default to today-tomorrow
    const checkFrom = options?.dateRange?.from || today.toISOString().split('T')[0];
    const checkTo = options?.dateRange?.to || tomorrow.toISOString().split('T')[0];

    // Check availability for each car in parallel (limited concurrency)
    const enriched = await Promise.all(
      locations.map(async (location) => {
        try {
          // Check if available today
          const availableToday = await this.availabilityService.checkAvailability(
            location['carId'],
            today.toISOString().split('T')[0],
            tomorrow.toISOString().split('T')[0],
          );

          // Check if available tomorrow
          const tomorrowDate = new Date(tomorrow);
          const dayAfterTomorrow = new Date(tomorrow);
          dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
          const availableTomorrow = await this.availabilityService.checkAvailability(
            location['carId'],
            tomorrowDate.toISOString().split('T')[0],
            dayAfterTomorrow.toISOString().split('T')[0],
          );

          // Check if available for requested date range (stored for potential future use)
          if (options?.dateRange) {
            await this.availabilityService.checkAvailability(location['carId'], checkFrom, checkTo);
          }

          if (availableToday) {
            return {
              ...location,
              availabilityStatus: 'available' as const,
              availableToday: true,
              availableTomorrow,
            };
          }

          // Check if available in next 7 days
          const nextAvailable = await this.availabilityService.getNextAvailableDate(
            location['carId'],
            today.toISOString().split('T')[0],
          );

          if (nextAvailable) {
            const nextDate = new Date(nextAvailable);
            const daysUntilAvailable = Math.ceil(
              (nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
            );

            if (daysUntilAvailable <= 7) {
              // Get current booking end date
              const blockedDates = await this.availabilityService.getBlockedDates(
                location['carId'],
              );
              const currentBlock = blockedDates.find(
                (block) => new Date(block.to) >= today && new Date(block.from) <= today,
              );

              return {
                ...location,
                availabilityStatus: 'soon_available' as const,
                nextAvailableDate: nextAvailable,
                currentBookingEndDate: currentBlock?.to || null,
                availableToday: false,
                availableTomorrow,
              };
            }
          }

          return {
            ...location,
            availabilityStatus: 'unavailable' as const,
            availableToday: false,
            availableTomorrow: false,
          };
        } catch (error) {
          console.error(`Error checking availability for car ${location['carId']}:`, error);
          return {
            ...location,
            availabilityStatus: 'unavailable' as const,
            availableToday: false,
            availableTomorrow: false,
          };
        }
      }),
    );

    // Filter by instant booking if requested
    if (options?.instantBookingOnly) {
      return enriched.filter((loc) => loc.instantBooking === true);
    }

    return enriched;
  }

  // 🚀 PERF: Track subscribers to avoid duplicate channels
  private realtimeSubscribers = new Set<() => void>();

  subscribeToRealtime(onChange: () => void): () => void {
    // Add callback to subscribers set
    this.realtimeSubscribers.add(onChange);

    // If channel already exists, just return cleanup (reuse channel)
    if (this.realtimeChannel) {
      this.logger.debug('♻️ [CarLocations] Reusing existing realtime channel');
      return () => {
        this.realtimeSubscribers.delete(onChange);
        // Only remove channel if no more subscribers
        if (this.realtimeSubscribers.size === 0 && this.realtimeChannel) {
          void this.supabase.removeChannel(this.realtimeChannel);
          this.realtimeChannel = null;
        }
      };
    }

    // Create shared notification function
    const notifyAllSubscribers = () => {
      this.realtimeSubscribers.forEach((cb) => cb());
    };

    const channel = this.supabase.channel('public:car_map_feed');
    channel.on(
      'postgres_changes',
      { schema: 'public', table: 'car_locations', event: '*' },
      (_payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => notifyAllSubscribers(),
    );
    channel.on(
      'postgres_changes',
      { schema: 'public', table: 'cars', event: '*' },
      (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        const newRecord = payload.new as Record<string, unknown> | undefined;
        const oldRecord = payload.old as Record<string, unknown> | undefined;
        const newStatus = newRecord?.['status'];
        const oldStatus = oldRecord?.['status'];
        if (newStatus === 'active' || oldStatus === 'active') {
          notifyAllSubscribers();
        }
      },
    );

    void channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.debug('[CarLocations] Realtime subscription active');
      }
    });
    this.realtimeChannel = channel;

    return () => {
      this.realtimeSubscribers.delete(onChange);
      // Only remove channel if no more subscribers
      if (this.realtimeSubscribers.size === 0 && this.realtimeChannel) {
        void this.supabase.removeChannel(this.realtimeChannel);
        this.realtimeChannel = null;
      }
    };
  }

  getRefreshInterval(): number {
    return this.refreshMs;
  }

  private async tryEdgeFunction(): Promise<CarMapLocation[] | null> {
    const functionName = environment.carLocationsEdgeFunction;
    if (!functionName) {
      return null;
    }

    try {
      const { data, error } = await this.supabase.functions.invoke(functionName, {
        body: {
          ttl: Math.round(this.cacheTtlMs / 1000),
          status: 'active',
        },
      });
      if (error) {
        throw error;
      }
      if (!Array.isArray(data)) {
        return null;
      }
      const normalized = this.normalizePayloadArray(data);
      return normalized.length > 0 ? normalized : null;
    } catch {
      return null;
    }
  }

  private async fetchFromDatabase(options?: {
    center?: { lat: number; lng: number };
    radiusKm?: number;
    dateRange?: { from: string; to: string };
    instantBookingOnly?: boolean;
  }): Promise<CarMapLocation[]> {
    // Build query with optional filters
    let query = this.supabase
      .from('v_cars_with_main_photo')
      .select(
        'id, title, status, price_per_day, currency, location_city, location_state, location_country, location_lat, location_lng, main_photo_url, photo_gallery, description, updated_at, auto_approval, min_rental_days, max_rental_days, deposit_required, deposit_amount, insurance_included, uses_dynamic_pricing',
      )
      .eq('status', 'active')
      .not('location_lat', 'is', null)
      .not('location_lng', 'is', null);

    // Filter by instant booking if requested
    if (options?.instantBookingOnly) {
      query = query.eq('auto_approval', true);
    }

    // Note: Radius filtering should be done client-side or via PostGIS RPC
    // For now, we fetch all and filter client-side if center/radius provided

    const { data: cars, error: carsError } = await query;

    if (carsError) {
      throw carsError;
    }

    const carsArray = Array.isArray(cars) ? cars : [];
    if (carsArray.length === 0) {
      return [];
    }

    // Normalize entries
    let normalized = carsArray
      .map((car: unknown) => this.normalizeEntry(car))
      .filter((value): value is CarMapLocation => !!value);

    // Filter by radius if center and radius provided (client-side filtering)
    if (options?.center && options?.radiusKm) {
      normalized = normalized.filter((loc) => {
        const distance = this.calculateDistance(
          options.center!.lat,
          options.center!.lng,
          loc.lat,
          loc.lng,
        );
        return distance <= options.radiusKm!;
      });
    }

    return normalized;
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get review count for a car with caching
   * This avoids multiple queries when multiple tooltips request the same car's reviews
   */
  async getReviewCount(carId: string, force = false): Promise<number> {
    const now = Date.now();
    const cached = this.reviewsCache.get(carId);

    if (!force && cached && cached.expiresAt > now) {
      return cached.reviewsCount;
    }

    try {
      // Use car_stats table for efficient query
      const { data, error } = await this.supabase
        .from('car_stats')
        .select('reviews_count')
        .eq('car_id', carId)
        .maybeSingle();

      if (error) {
        console.warn(`Error fetching review count for car ${carId}:`, error);
        return 0;
      }

      const reviewsCount = (data?.reviews_count as number | null | undefined) ?? 0;

      // Update cache
      this.reviewsCache.set(carId, {
        reviewsCount,
        expiresAt: now + this.reviewsCacheTtlMs,
      });

      return reviewsCount;
    } catch (error) {
      console.warn(`Exception fetching review count for car ${carId}:`, error);
      return 0;
    }
  }

  /**
   * Clear reviews cache for a specific car or all cars
   */
  clearReviewsCache(carId?: string): void {
    if (carId) {
      this.reviewsCache.delete(carId);
    } else {
      this.reviewsCache.clear();
    }
  }

  /**
   * Batch fetch review counts for multiple cars (more efficient)
   */
  async getReviewCountsBatch(carIds: string[]): Promise<Map<string, number>> {
    const now = Date.now();
    const result = new Map<string, number>();
    const uncachedIds: string[] = [];

    // Check cache first
    for (const carId of carIds) {
      const cached = this.reviewsCache.get(carId);
      if (cached && cached.expiresAt > now) {
        result.set(carId, cached.reviewsCount);
      } else {
        uncachedIds.push(carId);
      }
    }

    // Fetch uncached reviews in batch
    if (uncachedIds.length > 0) {
      try {
        const { data, error } = await this.supabase
          .from('car_stats')
          .select('car_id, reviews_count')
          .in('car_id', uncachedIds);

        if (error) {
          console.warn('Error batch fetching review counts:', error);
          // Set 0 for all uncached
          uncachedIds.forEach((id) => result.set(id, 0));
        } else {
          // Update cache and result
          const stats = (data || []) as Array<{ car_id: string; reviews_count: number | null }>;
          stats.forEach((stat) => {
            const reviewsCount = stat.reviews_count ?? 0;
            result.set(stat['car_id'], reviewsCount);
            this.reviewsCache.set(stat['car_id'], {
              reviewsCount,
              expiresAt: now + this.reviewsCacheTtlMs,
            });
          });

          // Set 0 for cars not found in stats
          uncachedIds.forEach((id) => {
            if (!result.has(id)) {
              result.set(id, 0);
            }
          });
        }
      } catch (error) {
        console.warn('Exception batch fetching review counts:', error);
        uncachedIds.forEach((id) => result.set(id, 0));
      }
    }

    return result;
  }

  private normalizePayloadArray(payload: unknown[]): CarMapLocation[] {
    return payload
      .map((entry) => this.normalizeEntry(entry))
      .filter((value): value is CarMapLocation => !!value);
  }

  private normalizeEntry(entry: unknown): CarMapLocation | null {
    if (!entry || typeof entry !== 'object') {
      return null;
    }

    const record = entry as Record<string, unknown>;
    const car = (record['car'] ?? record) as Record<string, unknown>;
    const meta = (record['meta'] ?? {}) as Record<string, unknown>;
    const carId = String(record['car_id'] ?? car['id'] ?? meta['car_id'] ?? '');
    if (!carId) {
      return null;
    }

    const latRaw = record['lat'] ?? record['location_lat'] ?? car['location_lat'];
    const lngRaw = record['lng'] ?? record['location_lng'] ?? car['location_lng'];
    const lat = typeof latRaw === 'string' ? Number.parseFloat(latRaw) : (latRaw as number);
    const lng = typeof lngRaw === 'string' ? Number.parseFloat(lngRaw) : (lngRaw as number);
    if (
      typeof lat !== 'number' ||
      Number.isNaN(lat) ||
      typeof lng !== 'number' ||
      Number.isNaN(lng)
    ) {
      return null;
    }

    const status = car['status'] ?? record['status'];
    if (status && status !== 'active') {
      return null;
    }

    const title = String(car['title'] ?? record['title'] ?? 'Auto disponible');
    const pricePerDayRaw = car['price_per_day'] ?? record['price_per_day'] ?? 0;
    const pricePerDay =
      typeof pricePerDayRaw === 'string'
        ? Number.parseFloat(pricePerDayRaw)
        : Number(pricePerDayRaw ?? 0);
    const currency = String(
      car['currency'] ?? record['currency'] ?? environment.defaultCurrency ?? 'USD',
    ).toUpperCase();

    const cityRaw = car['location_city'] ?? record['city'] ?? record['location_city'] ?? null;
    const city = typeof cityRaw === 'string' ? cityRaw : null;

    const stateRaw = car['location_state'] ?? record['state'] ?? record['location_state'] ?? null;
    const state = typeof stateRaw === 'string' ? stateRaw : null;

    const countryRaw =
      car['location_country'] ?? record['country'] ?? record['location_country'] ?? null;
    const country = typeof countryRaw === 'string' ? countryRaw : null;

    const formattedAddressRaw =
      car['location_formatted_address'] ?? record['location_formatted_address'] ?? null;
    const formattedAddress = typeof formattedAddressRaw === 'string' ? formattedAddressRaw : null;

    const updatedAt = String(record['updated_at'] ?? car['updated_at'] ?? new Date().toISOString());

    // Get photo URL with fallback logic
    // La vista v_cars_with_main_photo ahora incluye photo_gallery como JSONB array
    const photoUrlRaw =
      car['main_photo_url'] ?? record['main_photo_url'] ?? record['photo_url'] ?? null;
    let photoUrl =
      typeof photoUrlRaw === 'string' && photoUrlRaw.trim() ? photoUrlRaw.trim() : null;

    // Get photo_gallery from view (comes as JSONB, Supabase converts to array automatically)
    const photoGalleryRaw =
      car['photo_gallery'] ?? record['photo_gallery'] ?? record['photoGallery'] ?? null;
    let photoGallery: string[] | null = null;

    if (photoGalleryRaw) {
      if (Array.isArray(photoGalleryRaw)) {
        // Supabase convierte JSONB automáticamente a array
        photoGallery = photoGalleryRaw.filter(
          (url): url is string => typeof url === 'string' && url.trim().length > 0,
        );
      } else if (typeof photoGalleryRaw === 'string') {
        // Fallback: si viene como string JSON (de edge function o payload)
        try {
          const parsed = JSON.parse(photoGalleryRaw);
          if (Array.isArray(parsed)) {
            photoGallery = parsed.filter(
              (url): url is string => typeof url === 'string' && url.trim().length > 0,
            );
          }
        } catch {
          // Invalid JSON, ignore
        }
      }
    }

    // Use first photo from gallery as fallback if main_photo_url is missing
    if (!photoUrl && photoGallery && photoGallery.length > 0) {
      photoUrl = photoGallery[0];
    }

    // If still no photo, photoUrl remains null (will use initials fallback in UI)

    const descriptionRaw =
      car['description'] ??
      record['description'] ??
      (typeof meta['description'] === 'string' ? meta['description'] : '');
    const description = this.buildSummary(typeof descriptionRaw === 'string' ? descriptionRaw : '');

    // Extract instant booking and rental terms
    const autoApprovalRaw =
      car['auto_approval'] ?? record['auto_approval'] ?? meta['auto_approval'] ?? null;
    const instantBooking =
      typeof autoApprovalRaw === 'boolean'
        ? autoApprovalRaw
        : autoApprovalRaw === 'true' || autoApprovalRaw === true;

    const minRentalDaysRaw =
      car['min_rental_days'] ?? record['min_rental_days'] ?? meta['min_rental_days'] ?? null;
    const minRentalDays =
      typeof minRentalDaysRaw === 'number'
        ? minRentalDaysRaw
        : typeof minRentalDaysRaw === 'string'
          ? Number.parseInt(minRentalDaysRaw, 10)
          : undefined;

    const maxRentalDaysRaw =
      car['max_rental_days'] ?? record['max_rental_days'] ?? meta['max_rental_days'] ?? null;
    const maxRentalDays =
      typeof maxRentalDaysRaw === 'number'
        ? maxRentalDaysRaw
        : typeof maxRentalDaysRaw === 'string'
          ? Number.parseInt(maxRentalDaysRaw, 10)
          : undefined;

    const depositRequiredRaw =
      car['deposit_required'] ?? record['deposit_required'] ?? meta['deposit_required'] ?? null;
    const depositRequired =
      typeof depositRequiredRaw === 'boolean'
        ? depositRequiredRaw
        : depositRequiredRaw === 'true' || depositRequiredRaw === true;

    const depositAmountRaw =
      car['deposit_amount'] ?? record['deposit_amount'] ?? meta['deposit_amount'] ?? null;
    const depositAmount =
      typeof depositAmountRaw === 'number'
        ? depositAmountRaw
        : typeof depositAmountRaw === 'string'
          ? Number.parseFloat(depositAmountRaw)
          : undefined;

    const insuranceIncludedRaw =
      car['insurance_included'] ??
      record['insurance_included'] ??
      meta['insurance_included'] ??
      null;
    const insuranceIncluded =
      typeof insuranceIncludedRaw === 'boolean'
        ? insuranceIncludedRaw
        : insuranceIncludedRaw === 'true' || insuranceIncludedRaw === true;

    const usesDynamicPricingRaw =
      car['uses_dynamic_pricing'] ??
      record['uses_dynamic_pricing'] ??
      meta['uses_dynamic_pricing'] ??
      null;
    const usesDynamicPricing =
      typeof usesDynamicPricingRaw === 'boolean'
        ? usesDynamicPricingRaw
        : usesDynamicPricingRaw === 'true' || usesDynamicPricingRaw === true;

    return {
      carId,
      title,
      pricePerDay: Number.isFinite(pricePerDay) ? pricePerDay : 0,
      currency,
      lat,
      lng,
      updatedAt,
      city,
      state,
      country,
      locationLabel: this.buildLocationLabel(city, state, country),
      formattedAddress,
      photoUrl,
      photoGallery,
      description,
      instantBooking,
      minRentalDays,
      maxRentalDays,
      depositRequired,
      depositAmount,
      insuranceIncluded,
      usesDynamicPricing,
    };
  }

  private buildSummary(value: string | null | undefined): string | null {
    if (!value) {
      return null;
    }
    const normalized = value.trim().replace(/\s+/g, ' ');
    if (normalized.length <= 140) {
      return normalized;
    }
    return `${normalized.slice(0, 137)}...`;
  }

  private buildLocationLabel(
    city: string | null | undefined,
    state: string | null | undefined,
    country: string | null | undefined,
  ): string {
    const parts = [city, state, country].filter((part) => !!part && String(part).trim().length > 0);
    return parts.length > 0 ? parts.map((part) => String(part).trim()).join(', ') : 'Uruguay';
  }
}
