import { Injectable, inject } from '@angular/core';
import { Car, CarFilters, CarPhoto } from '@core/models';
import { CarAvailabilityService } from '@core/services/cars/car-availability.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { optimizeImage } from '@core/utils/image.utils';
import { v4 as uuidv4 } from 'uuid';

// Type for raw car data from Supabase with photos joined
type CarWithPhotosRaw = Record<string, unknown> & {
  car_photos?: unknown[];
  owner?: unknown | unknown[];
};

@Injectable({
  providedIn: 'root',
})
export class CarsService {
  private readonly logger = inject(LoggerService);
  private readonly supabase = injectSupabase();
  private readonly carAvailabilityService = inject(CarAvailabilityService);
  private readonly defaultValuationConfig = {
    averageRentalDays: 300,
  };

  private parseMissingColumnFromSchemaCacheError(error: unknown): string | null {
    const anyError = error as { code?: string; message?: string } | null;
    if (!anyError || anyError.code !== 'PGRST204' || typeof anyError.message !== 'string') {
      return null;
    }

    // Example: "Could not find the 'allow_second_driver' column of 'cars' in the schema cache"
    const match = anyError.message.match(
      /Could not find the '([^']+)' column of 'cars' in the schema cache/,
    );
    return match?.[1] ?? null;
  }

  async createCar(input: Partial<Car>): Promise<Car> {
    const userId = (await this.supabase.auth.getUser()).data['user']?.['id'];
    if (!userId) {
      throw new Error('Usuario no autenticado');
    }

    // Validate required fields
    // ✅ CRITICAL: brand_id/model_id son UUIDs (pueden ser null si usamos FIPE)
    // Si no hay UUIDs, debemos tener brand_text_backup y model_text_backup
    const hasBrandId = !!input.brand_id;
    const hasModelId = !!input.model_id;
    const hasBrandText = !!input.brand_text_backup;
    const hasModelText = !!input.model_text_backup;

    if (!hasBrandId && !hasBrandText) {
      throw new Error('Marca es requerida (brand_id o brand_text_backup)');
    }
    if (!hasModelId && !hasModelText) {
      throw new Error('Modelo es requerido (model_id o model_text_backup)');
    }
    if (!input['price_per_day'] || input['price_per_day'] <= 0) {
      throw new Error('Precio por día debe ser mayor a 0');
    }

    // Check for coordinates (using type assertion since location_lat/location_lng come from form)
    const carInput = input as Record<string, unknown>;

    // ✅ CRITICAL: Las coordenadas son OBLIGATORIAS para que el auto aparezca en búsquedas
    // Si no hay coordenadas, el auto será invisible en el mapa y en búsquedas espaciales
    if (!carInput['location_lat'] || !carInput['location_lng']) {
      throw new Error(
        'Ubicación del vehículo requerida. Por favor selecciona una ubicación en el mapa o usa tu ubicación actual.',
      );
    }

    const cleanInput = { ...input };

    // ✅ CRITICAL: Mapear campos de ubicación legacy (city, province, country)
    // La base de datos requiere city/province/country (NOT NULL)
    // pero el formulario envía location_city/location_state/location_country
    const city =
      (input as Record<string, unknown>)['city'] ||
      (input as Record<string, unknown>)['location_city'] ||
      '';
    const province =
      (input as Record<string, unknown>)['province'] ||
      (input as Record<string, unknown>)['location_state'] ||
      (input as Record<string, unknown>)['location_province'] ||
      '';
    const country =
      (input as Record<string, unknown>)['country'] ||
      (input as Record<string, unknown>)['location_country'] ||
      'AR';

    // Prepare clean data for insert
    const carData = {
      ...cleanInput,
      // ✅ Mapear campos legacy requeridos por la base de datos
      city: city || 'Buenos Aires', // Default si está vacío
      province: province || 'Buenos Aires', // Default si está vacío
      country: country || 'AR',
      owner_id: userId,
      status: input['status'] || 'active', // Default to active if not specified
      created_at: new Date().toISOString(),
    };

    this.logger.debug('🚗 Creating car with data:', {
      ...carData,
      // Redact sensitive fields for logging
      owner_id: '***',
    });

    // Resilient insert: if PostgREST schema cache is missing a column (PGRST204),
    // retry once per missing-column by stripping the offending field.
    // This avoids blocking publishing right after migrations, or when envs are out-of-sync.
    let lastError: unknown = null;
    let insertPayload: Record<string, unknown> = { ...carData } as Record<string, unknown>;

    for (let attempt = 0; attempt < 6; attempt++) {
      const { data, error } = await this.supabase
        .from('cars')
        .insert(insertPayload)
        .select('*, car_photos(*)')
        .single();

      if (!error) {
        this.logger.debug('✅ Car created successfully:', data['id']);
        return {
          ...data,
          photos: data.car_photos || [],
        } as Car;
      }

      lastError = error;
      const missingColumn = this.parseMissingColumnFromSchemaCacheError(error);
      if (missingColumn && Object.prototype.hasOwnProperty.call(insertPayload, missingColumn)) {
        this.logger.warn(
          `PostgREST schema cache missing column '${missingColumn}'. Retrying car insert without it.`,
        );
        delete insertPayload[missingColumn];
        continue;
      }

      console.error('❌ Error creating car:', error);
      throw error;
    }

    console.error('❌ Error creating car after retries:', lastError);
    throw lastError;
  }

  async uploadPhoto(file: File, carId: string, position = 0): Promise<CarPhoto> {
    const userId = (await this.supabase.auth.getUser()).data['user']?.['id'];
    if (!userId) throw new Error('Usuario no autenticado');

    const optimizedFile = await optimizeImage(file, {
      maxWidth: 1200,
      maxHeight: 900,
      quality: 0.85,
      format: 'webp',
    });

    const extension = 'webp';
    const filePath = `${userId}/${carId}/${uuidv4()}.${extension}`;
    const { error } = await this.supabase.storage
      .from('car-images')
      .upload(filePath, optimizedFile, {
        cacheControl: '3600',
        upsert: false,
      });
    if (error) throw error;
    const { data } = this.supabase.storage.from('car-images').getPublicUrl(filePath);

    const photoId = uuidv4();
    const { data: photoData, error: photoError } = await this.supabase
      .from('car_photos')
      .insert({
        id: photoId,
        car_id: carId,
        stored_path: filePath,
        url: data.publicUrl,
        position,
        sort_order: position,
      })
      .select()
      .single();

    if (photoError) throw photoError;
    return photoData as CarPhoto;
  }

  async getCarPhotos(carId: string): Promise<CarPhoto[]> {
    const { data, error } = await this.supabase
      .from('car_photos')
      .select('*')
      .eq('car_id', carId)
      .order('sort_order', { ascending: true })
      .order('position', { ascending: true });

    if (error) throw error;
    return (data ?? []) as CarPhoto[];
  }

  suggestVehicleValueUsd(
    pricePerDay: number | null | undefined,
    options?: { averageRentalDays?: number },
  ): number {
    if (!pricePerDay || pricePerDay <= 0) {
      return 0;
    }

    const days = options?.averageRentalDays ?? this.defaultValuationConfig.averageRentalDays;
    return Math.round(pricePerDay * days);
  }

  getDefaultAverageRentalDays(): number {
    return this.defaultValuationConfig.averageRentalDays;
  }

  async listActiveCars(filters: CarFilters): Promise<Car[]> {
    let query = this.supabase
      .from('cars')
      .select(
        `
        *,
        car_photos(*),
        owner:profiles!cars_owner_id_fkey(
          id,
          full_name,
          avatar_url,
          rating_avg,
          rating_count,
          created_at
        )
      `,
      )
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (filters['city']) {
      query = query.ilike('location_city', `%${filters['city']}%`);
    }

    // ✅ FIX P0.3: Filtrar por coordenadas (bounding box)
    if (filters.bounds) {
      query = query
        .lte('location_lat', filters.bounds.north)
        .gte('location_lat', filters.bounds.south)
        .lte('location_lng', filters.bounds.east)
        .gte('location_lng', filters.bounds.west);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Data loaded successfully

    // ✅ FIX P0.2: Filtrar por disponibilidad si hay fechas
    if (filters.from && filters.to && data) {
      const availableCars = await this.carAvailabilityService.filterByAvailability(
        data as Car[],
        filters.from,
        filters.to,
        filters.blockedCarIds || [],
      );
      return (availableCars as unknown[]).map((car) => {
        const typedCar = car as CarWithPhotosRaw;
        return {
          ...typedCar,
          photos: typedCar.car_photos || [],
          owner: Array.isArray(typedCar.owner) ? typedCar.owner[0] : typedCar.owner,
        };
      }) as Car[];
    }

    return (data ?? []).map((car: CarWithPhotosRaw) => ({
      ...car,
      photos: car.car_photos || [],
      owner: Array.isArray(car.owner) ? car.owner[0] : car.owner,
    })) as Car[];
  }

  /**
   * 🚀 SCALABILITY: Paginated car listing with server-side count
   * Supports 10,000+ cars with efficient offset/limit pagination
   */
  async listActiveCarsPage(
    filters: CarFilters & { page?: number; pageSize?: number },
  ): Promise<{ data: Car[]; total: number; hasMore: boolean }> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 24;
    const offset = (page - 1) * pageSize;

    // Build base query with count
    let query = this.supabase
      .from('cars')
      .select(
        `
        *,
        car_photos(*),
        owner:profiles!cars_owner_id_fkey(
          id,
          full_name,
          avatar_url,
          rating_avg,
          rating_count,
          created_at
        )
      `,
        { count: 'exact' },
      )
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters['city']) {
      query = query.ilike('location_city', `%${filters['city']}%`);
    }

    if (filters.bounds) {
      query = query
        .lte('location_lat', filters.bounds.north)
        .gte('location_lat', filters.bounds.south)
        .lte('location_lng', filters.bounds.east)
        .gte('location_lng', filters.bounds.west);
    }

    // Apply pagination
    query = query.range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    const total = count ?? 0;
    const cars = (data ?? []).map((car: CarWithPhotosRaw) => ({
      ...car,
      photos: car.car_photos || [],
      owner: Array.isArray(car.owner) ? car.owner[0] : car.owner,
    })) as Car[];

    return {
      data: cars,
      total,
      hasMore: offset + cars.length < total,
    };
  }

  async getCarById(id: string): Promise<Car | null> {
    const { data, error } = await this.supabase
      .from('cars')
      .select(
        `
        *,
        car_photos(*),
        owner:profiles!cars_owner_id_fkey(
          id,
          full_name,
          avatar_url,
          rating_avg,
          rating_count,
          created_at
        )
      `,
      )
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return {
      ...data,
      photos: data.car_photos || [],
    } as Car;
  }

  async listMyCars(): Promise<Car[]> {
    const userId = (await this.supabase.auth.getUser()).data['user']?.['id'];
    if (!userId) throw new Error('Usuario no autenticado');

    // 1. Get my orgs IDs (to include fleet cars)
    const { data: orgs } = await this.supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId);

    const orgIds = orgs?.map((o) => o.organization_id) || [];

    // 2. Build query
    let query = this.supabase
      .from('cars')
      .select('*, car_photos(*)')
      .order('created_at', { ascending: false });

    if (orgIds.length > 0) {
      // Fetch cars where:
      // A) I am the owner (owner_id = me)
      // B) OR the car belongs to an organization I am a member of
      query = query.or(`owner_id.eq.${userId},organization_id.in.(${orgIds.join(',')})`);
    } else {
      // Fallback for individuals with no orgs
      query = query.eq('owner_id', userId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data ?? []).map((car: CarWithPhotosRaw) => ({
      ...car,
      photos: car.car_photos || [],
    })) as Car[];
  }

  /**
   * Alias for listMyCars for backward compatibility
   */
  async getMyCars(): Promise<Car[]> {
    return this.listMyCars();
  }

  /**
   * @deprecated Use CarAvailabilityService.getBlockedDateRanges instead
   */
  async getBlockedDateRanges(carId: string): Promise<Array<{ from: string; to: string }>> {
    const ranges = await this.carAvailabilityService.getBlockedDates(carId);
    return ranges.map((r) => ({ from: r.from, to: r.to }));
  }

  async deleteCar(carId: string): Promise<void> {
    const userId = (await this.supabase.auth.getUser()).data['user']?.['id'];
    if (!userId) throw new Error('Usuario no autenticado');
    const { error } = await this.supabase
      .from('cars')
      .delete()
      .eq('id', carId)
      .eq('owner_id', userId);
    if (error) throw error;
  }

  /**
   * ✅ NUEVO: Actualizar solo el status del auto
   */
  async updateCarStatus(carId: string, status: string): Promise<void> {
    const userId = (await this.supabase.auth.getUser()).data['user']?.['id'];
    if (!userId) throw new Error('Usuario no autenticado');

    const { error } = await this.supabase
      .from('cars')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', carId)
      .eq('owner_id', userId);

    if (error) throw error;
  }

  async updateCar(carId: string, input: Partial<Car>): Promise<Car> {
    const userId = (await this.supabase.auth.getUser()).data['user']?.['id'];
    if (!userId) throw new Error('Usuario no autenticado');

    // ✅ CRITICAL: Mapear campos de ubicación legacy (city, province, country)
    // La base de datos requiere city/province/country (NOT NULL)
    // pero el formulario envía location_city/location_state/location_country
    const inputRecord = input as Record<string, unknown>;
    const updateData: Record<string, unknown> = { ...input };

    // Mapear location_city a city si existe
    if (inputRecord['location_city'] && !inputRecord['city']) {
      updateData['city'] = inputRecord['location_city'];
    }
    // Mapear location_state/location_province a province si existe
    if (
      (inputRecord['location_state'] || inputRecord['location_province']) &&
      !inputRecord['province']
    ) {
      updateData['province'] = inputRecord['location_state'] || inputRecord['location_province'];
    }
    // Mapear location_country a country si existe
    if (inputRecord['location_country'] && !inputRecord['country']) {
      updateData['country'] = inputRecord['location_country'];
    }

    const { data, error } = await this.supabase
      .from('cars')
      .update(updateData)
      .eq('id', carId)
      .eq('owner_id', userId)
      .select('*, car_photos(*)')
      .single();

    if (error) throw error;

    return {
      ...data,
      photos: data.car_photos || [],
    } as Car;
  }

  async listPendingCars(): Promise<Car[]> {
    const { data, error } = await this.supabase
      .from('cars')
      .select('*, car_photos(*)')
      .eq('status', 'draft')
      .order('created_at', { ascending: false });
    if (error) throw error;

    return (data ?? []).map((car: CarWithPhotosRaw) => ({
      ...car,
      photos: car.car_photos || [],
    })) as Car[];
  }

  async getCarBrands(): Promise<Array<{ id: string; name: string }>> {
    const { data, error } = await this.supabase.from('car_brands').select('id, name').order('name');
    if (error) throw error;
    return data ?? [];
  }

  async getCarModels(
    brandId: string,
  ): Promise<Array<{ id: string; name: string; category: string; seats: number; doors: number }>> {
    const { data, error } = await this.supabase
      .from('car_models')
      .select('id, name, category, seats, doors')
      .eq('brand_id', brandId)
      .order('name');
    if (error) throw error;
    return data ?? [];
  }

  async getAllCarModels(): Promise<
    Array<{
      id: string;
      brand_id: string;
      name: string;
      category: string;
      seats: number;
      doors: number;
    }>
  > {
    const { data, error } = await this.supabase
      .from('car_models')
      .select('id, brand_id, name, category, seats, doors')
      .order('name');
    if (error) throw error;
    return data ?? [];
  }

  async getUserLastCar(): Promise<Car | null> {
    const userId = (await this.supabase.auth.getUser()).data['user']?.['id'];
    if (!userId) return null;

    const { data, error } = await this.supabase
      .from('cars')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows found
      throw error;
    }

    return data as Car;
  }

  async getCarsByOwner(ownerId: string): Promise<Car[]> {
    const { data, error } = await this.supabase
      .from('cars')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data as Car[]) ?? [];
  }

  /**
   * @deprecated Use CarAvailabilityService.getAvailableCars instead
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
    const available = await this.carAvailabilityService.getAvailableCars(
      startDate,
      endDate,
      options,
    );
    // Map to Car model if needed (Supabase returns `cars` rows already compatible with `Car`).
    return available as Car[];
  }

  /**
   * @deprecated Use CarAvailabilityService.isCarAvailable instead
   */
  async isCarAvailable(carId: string, startDate: string, endDate: string): Promise<boolean> {
    return this.carAvailabilityService.checkAvailability(carId, startDate, endDate);
  }

  /**
   * @deprecated Use CarAvailabilityService.hasActiveBookings instead
   */
  async hasActiveBookings(carId: string): Promise<{
    hasActive: boolean;
    count: number;
    bookings?: Array<{ id: string; status: string; start_date: string; end_date: string }>;
  }> {
    return this.carAvailabilityService.hasActiveBookings(carId);
  }

  /**
   * @deprecated Use CarAvailabilityService.getNextAvailableRange instead
   */
  async getNextAvailableRange(
    carId: string,
    startDate: string,
    endDate: string,
    maxOptions = 3,
  ): Promise<
    Array<{
      startDate: string;
      endDate: string;
      daysCount: number;
    }>
  > {
    return this.carAvailabilityService.getNextAvailableRange(carId, startDate, endDate, maxOptions);
  }

  /**
   * Get available cars using server-side RPC with PostGIS distance scoring.
   * This method uses the `get_available_cars` Postgres function which:
   * - Filters by availability (no overlapping bookings)
   * - Calculates distance from user location using ST_DistanceSphere
   * - Applies smart scoring (distance, rating, price, auto_approval)
   * - Returns cars sorted by score (distance prioritized for nearby cars)
   */
  async getAvailableCarsWithDistance(
    startDate: string,
    endDate: string,
    options: {
      lat?: number;
      lng?: number;
      limit?: number;
      offset?: number;
      minPrice?: number;
      maxPrice?: number;
      transmission?: string[];
      verifiedOwner?: boolean;
      noCreditCard?: boolean;
    } = {},
  ): Promise<CarWithScore[]> {
    const { lat, lng, limit = 12, offset = 0 } = options;

    const { data, error } = await this.supabase.rpc('get_available_cars', {
      p_start_date: startDate,
      p_end_date: endDate,
      p_lat: lat ?? null,
      p_lng: lng ?? null,
      p_limit: limit,
      p_offset: offset,
      p_min_price: options.minPrice ?? null,
      p_max_price: options.maxPrice ?? null,
      p_transmission: options.transmission ?? null,
      p_verified_owner: options.verifiedOwner ?? false,
      p_no_credit_card: options.noCreditCard ?? false,
    });

    if (error) {
      console.error('Error calling get_available_cars RPC:', error);
      throw error;
    }

    return (data || []) as CarWithScore[];
  }

  /**
   * Get cars within a specific radius from user location.
   * Uses the `get_cars_within_radius` Postgres function.
   */
  async getCarsWithinRadius(
    userLat: number,
    userLng: number,
    radiusKm: number,
    options: {
      startDate?: string;
      endDate?: string;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<CarWithDistance[]> {
    const { startDate, endDate, limit = 50, offset = 0 } = options;

    const { data, error } = await this.supabase.rpc('get_cars_within_radius', {
      p_user_lat: userLat,
      p_user_lng: userLng,
      p_radius_km: radiusKm,
      p_start_date: startDate ?? null,
      p_end_date: endDate ?? null,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) {
      console.error('Error calling get_cars_within_radius RPC:', error);
      throw error;
    }

    return (data || []) as CarWithDistance[];
  }
}

/**
 * Car with score from get_available_cars RPC
 */
export interface CarWithScore {
  id: string;
  owner_id: string;
  brand: string;
  model: string;
  year: number;
  plate: string;
  price_per_day: number;
  currency: string;
  status: string;
  location: {
    city?: string;
    state?: string;
    province?: string;
    country?: string;
    lat?: number;
    lng?: number;
  };
  images: string[];
  features: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  total_bookings: number;
  avg_rating: number;
  score: number;
}

/**
 * Car with distance from get_cars_within_radius RPC
 */
export interface CarWithDistance {
  id: string;
  owner_id: string;
  title: string;
  brand_text_backup: string;
  model_text_backup: string;
  year: number;
  price_per_day: number;
  currency: string;
  value_usd: number;
  location_city: string;
  location_state: string;
  location_lat: number;
  location_lng: number;
  location_formatted_address: string;
  distance_km: number;
  status: string;
  photos_count: number;
  avg_rating: number;
}
