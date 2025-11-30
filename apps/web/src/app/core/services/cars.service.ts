import { Injectable, inject } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';
import { Car, CarFilters, CarPhoto } from '../models';
import { optimizeImage } from '../utils/image.utils';
import { CarAvailabilityService } from './car-availability.service';
import { injectSupabase } from './supabase-client.service';

// Type for raw car data from Supabase with photos joined
type CarWithPhotosRaw = Record<string, unknown> & {
  car_photos?: unknown[];
  owner?: unknown | unknown[];
};

@Injectable({
  providedIn: 'root',
})
export class CarsService {
  private readonly supabase = injectSupabase();
  private readonly carAvailabilityService = inject(CarAvailabilityService);
  private readonly defaultValuationConfig = {
    averageRentalDays: 300,
  };

  async createCar(input: Partial<Car>): Promise<Car> {
    const userId = (await this.supabase.auth.getUser()).data.user?.id;
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
    if (!input.price_per_day || input.price_per_day <= 0) {
      throw new Error('Precio por día debe ser mayor a 0');
    }

    // Check for coordinates (using type assertion since location_lat/location_lng come from form)
    const carInput = input as Record<string, unknown>;

    // ✅ CRITICAL: Las coordenadas son OBLIGATORIAS para que el auto aparezca en búsquedas
    // Si no hay coordenadas, el auto será invisible en el mapa y en búsquedas espaciales
    if (!carInput.location_lat || !carInput.location_lng) {
      throw new Error(
        'Ubicación del vehículo requerida. Por favor selecciona una ubicación en el mapa o usa tu ubicación actual.',
      );
    }

    const cleanInput = { ...input };

    // ✅ CRITICAL: Mapear campos de ubicación legacy (city, province, country)
    // La base de datos requiere city/province/country (NOT NULL)
    // pero el formulario envía location_city/location_state/location_country
    const city =
      (input as Record<string, unknown>).city ||
      (input as Record<string, unknown>).location_city ||
      '';
    const province =
      (input as Record<string, unknown>).province ||
      (input as Record<string, unknown>).location_state ||
      (input as Record<string, unknown>).location_province ||
      '';
    const country =
      (input as Record<string, unknown>).country ||
      (input as Record<string, unknown>).location_country ||
      'AR';

    // Prepare clean data for insert
    const carData = {
      ...cleanInput,
      // ✅ Mapear campos legacy requeridos por la base de datos
      city: city || 'Buenos Aires', // Default si está vacío
      province: province || 'Buenos Aires', // Default si está vacío
      country: country || 'AR',
      owner_id: userId,
      status: input.status || 'active', // Default to active if not specified
      created_at: new Date().toISOString(),
    };

    console.log('🚗 Creating car with data:', {
      ...carData,
      // Redact sensitive fields for logging
      owner_id: '***',
    });

    const { data, error } = await this.supabase
      .from('cars')
      .insert(carData)
      .select('*, car_photos(*)')
      .single();

    if (error) {
      console.error('❌ Error creating car:', error);
      throw error;
    }

    console.log('✅ Car created successfully:', data.id);

    return {
      ...data,
      photos: data.car_photos || [],
    } as Car;
  }

  async uploadPhoto(file: File, carId: string, position = 0): Promise<CarPhoto> {
    const userId = (await this.supabase.auth.getUser()).data.user?.id;
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

    if (filters.city) {
      query = query.ilike('location_city', `%${filters.city}%`);
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
    const userId = (await this.supabase.auth.getUser()).data.user?.id;
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
    const userId = (await this.supabase.auth.getUser()).data.user?.id;
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
    const userId = (await this.supabase.auth.getUser()).data.user?.id;
    if (!userId) throw new Error('Usuario no autenticado');

    const { error } = await this.supabase
      .from('cars')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', carId)
      .eq('owner_id', userId);

    if (error) throw error;
  }

  async updateCar(carId: string, input: Partial<Car>): Promise<Car> {
    const userId = (await this.supabase.auth.getUser()).data.user?.id;
    if (!userId) throw new Error('Usuario no autenticado');

    // ✅ CRITICAL: Mapear campos de ubicación legacy (city, province, country)
    // La base de datos requiere city/province/country (NOT NULL)
    // pero el formulario envía location_city/location_state/location_country
    const inputRecord = input as Record<string, unknown>;
    const updateData: Record<string, unknown> = { ...input };

    // Mapear location_city a city si existe
    if (inputRecord.location_city && !inputRecord.city) {
      updateData.city = inputRecord.location_city;
    }
    // Mapear location_state/location_province a province si existe
    if ((inputRecord.location_state || inputRecord.location_province) && !inputRecord.province) {
      updateData.province = inputRecord.location_state || inputRecord.location_province;
    }
    // Mapear location_country a country si existe
    if (inputRecord.location_country && !inputRecord.country) {
      updateData.country = inputRecord.location_country;
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
    const userId = (await this.supabase.auth.getUser()).data.user?.id;
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
    return this.carAvailabilityService.getAvailableCars(startDate, endDate, options);
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
}
