import { Injectable } from '@angular/core';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { injectSupabase } from './supabase-client.service';

const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_REFRESH_MS = 60 * 1000;

export interface CarMapLocation {
  carId: string;
  title: string;
  pricePerDay: number;
  pricePerHour?: number; // Dynamic pricing
  currency: string;
  regionId?: string | null; // For dynamic pricing calculation
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
  description?: string | null;
}

interface CacheEntry {
  data: CarMapLocation[];
  expiresAt: number;
}

@Injectable({
  providedIn: 'root',
})
export class CarLocationsService {
  private readonly supabase = injectSupabase();
  private readonly cacheTtlMs = environment.carLocationsCacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
  private readonly refreshMs = environment.carLocationsRefreshMs ?? DEFAULT_REFRESH_MS;

  private cache: CacheEntry | null = null;
  private realtimeChannel: RealtimeChannel | null = null;

  async fetchActiveLocations(force = false): Promise<CarMapLocation[]> {
    const now = Date.now();
    if (!force && this.cache && this.cache.expiresAt > now) {
      return this.cache.data;
    }

    const edgeData = await this.tryEdgeFunction();
    const data = edgeData ?? (await this.fetchFromDatabase());
    this.cache = {
      data,
      expiresAt: now + this.cacheTtlMs,
    };
    return data;
  }

  subscribeToRealtime(onChange: () => void): () => void {
    if (this.realtimeChannel) {
      return () => {
        if (this.realtimeChannel) {
          void this.supabase.removeChannel(this.realtimeChannel);
          this.realtimeChannel = null;
        }
      };
    }

    const channel = this.supabase.channel('public:car_map_feed');
    channel.on(
      'postgres_changes',
      { schema: 'public', table: 'car_locations', event: '*' },
      (_payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => onChange(),
    );
    channel.on(
      'postgres_changes',
      { schema: 'public', table: 'cars', event: '*' },
      (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        const newRecord = payload.new as Record<string, unknown> | undefined;
        const oldRecord = payload.old as Record<string, unknown> | undefined;
        const newStatus = newRecord?.status;
        const oldStatus = oldRecord?.status;
        if (newStatus === 'active' || oldStatus === 'active') {
          onChange();
        }
      },
    );

    void channel.subscribe();
    this.realtimeChannel = channel;

    return () => {
      if (this.realtimeChannel) {
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
    } catch (err) {
      return null;
    }
  }

  private async fetchFromDatabase(): Promise<CarMapLocation[]> {
    // Obtener autos activos con coordenadas desde la vista v_cars_with_main_photo
    const { data: cars, error: carsError } = await this.supabase
      .from('v_cars_with_main_photo')
      .select(
        'id, title, status, price_per_day, currency, region_id, location_city, location_state, location_country, location_lat, location_lng, main_photo_url, description, updated_at',
      )
      .eq('status', 'active')
      .not('location_lat', 'is', null)
      .not('location_lng', 'is', null);

    if (carsError) {
      throw carsError;
    }

    const carsArray = Array.isArray(cars) ? cars : [];
    if (carsArray.length === 0) {
      return [];
    }

    return carsArray
      .map((car: unknown) => this.normalizeEntry(car))
      .filter((value): value is CarMapLocation => !!value);
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
    const car = (record.car ?? record) as Record<string, unknown>;
    const meta = (record.meta ?? {}) as Record<string, unknown>;
    const carId = String(record.car_id ?? car.id ?? meta.car_id ?? '');
    if (!carId) {
      return null;
    }

    const latRaw = record.lat ?? record.location_lat ?? car.location_lat;
    const lngRaw = record.lng ?? record.location_lng ?? car.location_lng;
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

    const status = car.status ?? record.status;
    if (status && status !== 'active') {
      return null;
    }

    const title = String(car.title ?? record.title ?? 'Auto disponible');
    const pricePerDayRaw = car.price_per_day ?? record.price_per_day ?? 0;
    const pricePerDay =
      typeof pricePerDayRaw === 'string'
        ? Number.parseFloat(pricePerDayRaw)
        : Number(pricePerDayRaw ?? 0);
    const currency = String(
      car.currency ?? record.currency ?? environment.defaultCurrency ?? 'USD',
    ).toUpperCase();
    const regionIdRaw = car.region_id ?? record.region_id ?? null;
    const regionId = typeof regionIdRaw === 'string' ? regionIdRaw : null;

    const cityRaw = car.location_city ?? record.city ?? record.location_city ?? null;
    const city = typeof cityRaw === 'string' ? cityRaw : null;

    const stateRaw = car.location_state ?? record.state ?? record.location_state ?? null;
    const state = typeof stateRaw === 'string' ? stateRaw : null;

    const countryRaw = car.location_country ?? record.country ?? record.location_country ?? null;
    const country = typeof countryRaw === 'string' ? countryRaw : null;

    const formattedAddressRaw =
      car.location_formatted_address ?? record.location_formatted_address ?? null;
    const formattedAddress = typeof formattedAddressRaw === 'string' ? formattedAddressRaw : null;

    const updatedAt = String(record.updated_at ?? car.updated_at ?? new Date().toISOString());

    const photoUrlRaw = car.main_photo_url ?? record.main_photo_url ?? record.photo_url ?? null;
    const photoUrl = typeof photoUrlRaw === 'string' ? photoUrlRaw : null;

    const descriptionRaw =
      car.description ??
      record.description ??
      (typeof meta.description === 'string' ? meta.description : '');
    const description = this.buildSummary(typeof descriptionRaw === 'string' ? descriptionRaw : '');

    return {
      carId,
      title,
      pricePerDay: Number.isFinite(pricePerDay) ? pricePerDay : 0,
      currency,
      regionId,
      lat,
      lng,
      updatedAt,
      city,
      state,
      country,
      locationLabel: this.buildLocationLabel(city, state, country),
      formattedAddress,
      photoUrl,
      description,
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
