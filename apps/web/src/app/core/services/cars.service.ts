import { Injectable, inject, signal, computed } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';
import { firstValueFrom } from 'rxjs';
import { Car, CarFilters, CarPhoto } from '../models';
import { injectSupabase } from './supabase-client.service';
import { GoogleCalendarService } from './google-calendar.service';

interface ImageOptimizeOptions {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  format: 'webp' | 'jpeg';
}

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
  private readonly googleCalendarService = inject(GoogleCalendarService);
  private readonly defaultValuationConfig = {
    averageRentalDays: 300,
  };

  // ============================================================================
  // SIGNAL-BASED STATE MANAGEMENT
  // ============================================================================

  // Cache for user's cars
  readonly myCars = signal<Car[]>([]);
  readonly myCarsLoading = signal(false);
  readonly myCarsError = signal<string | null>(null);

  // Cache for active cars listing
  readonly activeCars = signal<Car[]>([]);
  readonly activeCarsLoading = signal(false);
  readonly activeCarsError = signal<string | null>(null);
  readonly activeCarsFilters = signal<CarFilters | null>(null);

  // Cache for individual car details (by ID)
  private readonly carCacheMap = signal<Map<string, Car>>(new Map());
  readonly carCache = computed(() => this.carCacheMap());

  // Computed: Total number of user's cars
  readonly myCarsCount = computed(() => this.myCars().length);

  // Computed: Active cars count
  readonly activeCarsCount = computed(() => this.activeCars().length);

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

    // ✅ CRITICAL: Preparar datos limpios, excluyendo coordenadas null/undefined
    // Esto evita errores de schema cache si las columnas no están disponibles
    const cleanInput = { ...input };
    if (!carInput.location_lat || !carInput.location_lng) {
      console.warn('⚠️ Auto sin coordenadas - no aparecerá en el mapa');
      // Remover propiedades null/undefined para evitar errores de schema cache
      delete (cleanInput as Record<string, unknown>).location_lat;
      delete (cleanInput as Record<string, unknown>).location_lng;
    }

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

    const newCar = {
      ...data,
      photos: data.car_photos || [],
    } as Car;

    // Update cache: add new car to myCars
    this.myCars.update((cars) => [newCar, ...cars]);

    return newCar;
  }

  async uploadPhoto(file: File, carId: string, position = 0): Promise<CarPhoto> {
    const userId = (await this.supabase.auth.getUser()).data.user?.id;
    if (!userId) throw new Error('Usuario no autenticado');

    const optimizedFile = await this.optimizeImage(file, {
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

  private async optimizeImage(file: File, options: ImageOptimizeOptions): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > options.maxWidth) {
          height = (height * options.maxWidth) / width;
          width = options.maxWidth;
        }

        if (height > options.maxHeight) {
          width = (width * options.maxHeight) / height;
          height = options.maxHeight;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(
                new File([blob], file.name.replace(/\.[^/.]+$/, '.webp'), { type: 'image/webp' }),
              );
            } else {
              reject(new Error('Failed to optimize image'));
            }
          },
          'image/webp',
          options.quality,
        );
      };

      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  async listActiveCars(
    filters: CarFilters,
    options: { forceRefresh?: boolean } = {},
  ): Promise<Car[]> {
    // Check if we have cached data with same filters
    const cachedFilters = this.activeCarsFilters();
    const hasMatchingCache =
      !options.forceRefresh &&
      cachedFilters &&
      JSON.stringify(cachedFilters) === JSON.stringify(filters) &&
      this.activeCars().length > 0;

    if (hasMatchingCache) {
      return this.activeCars();
    }

    this.activeCarsLoading.set(true);
    this.activeCarsError.set(null);

    try {
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

      const { data, error } = await query;
      if (error) throw error;

      // ✅ FIX P0.2: Filtrar por disponibilidad si hay fechas
      let cars: Car[];
      if (filters.from && filters.to && data) {
        const availableCars = await this.filterByAvailability(
          data as Car[],
          filters.from,
          filters.to,
          filters.blockedCarIds || [],
        );
        cars = (availableCars as unknown[]).map((car) => {
          const typedCar = car as CarWithPhotosRaw;
          return {
            ...typedCar,
            photos: typedCar.car_photos || [],
            owner: Array.isArray(typedCar.owner) ? typedCar.owner[0] : typedCar.owner,
          };
        }) as Car[];
      } else {
        cars = (data ?? []).map((car: CarWithPhotosRaw) => ({
          ...car,
          photos: car.car_photos || [],
          owner: Array.isArray(car.owner) ? car.owner[0] : car.owner,
        })) as Car[];
      }

      // Update cache
      this.activeCars.set(cars);
      this.activeCarsFilters.set(filters);

      return cars;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al cargar autos activos';
      this.activeCarsError.set(errorMessage);
      throw error;
    } finally {
      this.activeCarsLoading.set(false);
    }
  }

  /**
   * ✅ FIX P0.2: Filtrar autos que NO tienen reservas conflictivas
   * Verifica disponibilidad real contra bookings existentes
   */
  private async filterByAvailability(
    cars: Car[],
    startDate: string,
    endDate: string,
    additionalBlockedIds: string[] = [],
  ): Promise<Car[]> {
    if (cars.length === 0) return [];

    const carIds = cars.map((c) => c.id);

    // Buscar bookings que se solapan con las fechas solicitadas
    const { data: conflicts, error } = await this.supabase
      .from('bookings')
      .select('car_id')
      .in('car_id', carIds)
      .in('status', ['confirmed', 'in_progress', 'pending'])
      .or(`start_at.lte.${endDate},end_at.gte.${startDate}`);

    if (error) {
      return cars; // Fallback: mostrar todos si falla
    }

    // IDs de autos bloqueados
    const blockedIds = new Set([
      ...additionalBlockedIds,
      ...(conflicts || []).map((c) => c.car_id),
    ]);

    // Filtrar autos disponibles
    return cars.filter((car) => !blockedIds.has(car.id));
  }

  async getCarById(id: string, options: { forceRefresh?: boolean } = {}): Promise<Car | null> {
    // Check cache first
    if (!options.forceRefresh) {
      const cachedCar = this.carCacheMap().get(id);
      if (cachedCar) {
        return cachedCar;
      }
    }

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

    const car = {
      ...data,
      photos: data.car_photos || [],
    } as Car;

    // Update cache
    this.carCacheMap.update((cache) => {
      const newCache = new Map(cache);
      newCache.set(id, car);
      return newCache;
    });

    return car;
  }

  async listMyCars(options: { forceRefresh?: boolean } = {}): Promise<Car[]> {
    // Return cached data if available and not forcing refresh
    if (!options.forceRefresh && this.myCars().length > 0) {
      return this.myCars();
    }

    this.myCarsLoading.set(true);
    this.myCarsError.set(null);

    try {
      const userId = (await this.supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error('Usuario no autenticado');

      const { data, error } = await this.supabase
        .from('cars')
        .select('*, car_photos(*)')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const cars = (data ?? []).map((car: CarWithPhotosRaw) => ({
        ...car,
        photos: car.car_photos || [],
      })) as Car[];

      // Update cache
      this.myCars.set(cars);
      return cars;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al cargar mis autos';
      this.myCarsError.set(errorMessage);
      throw error;
    } finally {
      this.myCarsLoading.set(false);
    }
  }

  /**
   * Alias for listMyCars for backward compatibility
   */
  async getMyCars(): Promise<Car[]> {
    return this.listMyCars();
  }

  /**
   * Get blocked date ranges for a car (bookings + manual blocks)
   * Returns dates where the car is unavailable
   */
  async getBlockedDateRanges(carId: string): Promise<Array<{ from: string; to: string }>> {
    try {
      // Get bookings that block the car
      const { data: bookings, error: bookingsError } = await this.supabase
        .from('bookings')
        .select('start_at, end_at')
        .eq('car_id', carId)
        .in('status', ['pending', 'pending_payment', 'confirmed', 'in_progress'])
        .order('start_at', { ascending: true });

      if (bookingsError) throw bookingsError;

      // Get manual blocks - temporal fix: try the table, fallback to empty if not exists
      let blocks: Array<{ blocked_from: string; blocked_to: string }> = [];
      try {
        const { data: blocksData, error: blocksError } = await this.supabase
          .from('car_blocked_dates')
          .select('blocked_from, blocked_to')
          .eq('car_id', carId)
          .order('blocked_from', { ascending: true });

        if (blocksError) {
          // If table doesn't exist, just log and continue with empty blocks
        } else {
          blocks = blocksData || [];
        }
      } catch {
        // Table doesn't exist, continue without manual blocks
      }

      // Combine and format
      const ranges: Array<{ from: string; to: string }> = [];

      // Add booking ranges
      if (bookings) {
        for (const booking of bookings) {
          ranges.push({
            from: booking.start_at.split('T')[0],
            to: booking.end_at.split('T')[0],
          });
        }
      }

      // Add manual block ranges
      for (const block of blocks) {
        ranges.push({
          from: block.blocked_from,
          to: block.blocked_to,
        });
      }

      return ranges;
    } catch (error) {
      console.error('Error getting blocked date ranges:', error);
      return [];
    }
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

    // Invalidate caches
    this.myCars.update((cars) => cars.filter((car) => car.id !== carId));
    this.activeCars.update((cars) => cars.filter((car) => car.id !== carId));
    this.carCacheMap.update((cache) => {
      const newCache = new Map(cache);
      newCache.delete(carId);
      return newCache;
    });
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

    // Update caches
    const updateFn = (cars: Car[]) =>
      cars.map((car) =>
        car.id === carId ? { ...car, status, updated_at: new Date().toISOString() } : car,
      );

    this.myCars.update(updateFn);
    this.activeCars.update(updateFn);

    // Update individual car cache
    this.carCacheMap.update((cache) => {
      const newCache = new Map(cache);
      const car = newCache.get(carId);
      if (car) {
        newCache.set(carId, { ...car, status, updated_at: new Date().toISOString() });
      }
      return newCache;
    });
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

    const updatedCar = {
      ...data,
      photos: data.car_photos || [],
    } as Car;

    // Update caches
    const updateFn = (cars: Car[]) =>
      cars.map((car) => (car.id === carId ? updatedCar : car));

    this.myCars.update(updateFn);
    this.activeCars.update(updateFn);
    this.carCacheMap.update((cache) => {
      const newCache = new Map(cache);
      newCache.set(carId, updatedCar);
      return newCache;
    });

    return updatedCar;
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
   * ✅ SPRINT 2 FIX: Obtener autos disponibles usando RPC function
   * Previene doble reserva validando en base de datos
   *
   * @param startDate - Fecha inicio (ISO string)
   * @param endDate - Fecha fin (ISO string)
   * @param options - Opciones adicionales (limit, offset, city)
   * @returns Promise<Car[]> - Solo autos SIN conflictos de fechas
   *
   * @example
   * const cars = await carsService.getAvailableCars(
   *   '2025-11-01T00:00:00Z',
   *   '2025-11-05T00:00:00Z',
   *   { city: 'Montevideo', limit: 20 }
   * );
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
    // Llamar a la función RPC que creamos en Sprint 2
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
   * ✅ NEW: Get available cars with Google Calendar availability check
   * Enhanced version that includes Calendar blocked dates
   */
  async getAvailableCarsWithCalendar(
    startDate: string,
    endDate: string,
    options: {
      limit?: number;
      offset?: number;
      city?: string;
    } = {},
  ): Promise<
    Array<
      Car & {
        calendar_availability?: {
          google_calendar_checked: boolean;
          blocked_dates: string[];
          events: Array<{ date: string; title: string }>;
        };
      }
    >
  > {
    // First get available cars from database
    const cars = await this.getAvailableCars(startDate, endDate, options);

    // Enrich with Google Calendar data for each car
    const carsWithCalendarData = await Promise.all(
      cars.map(async (car) => {
        try {
          const calendarData = await firstValueFrom(
            this.googleCalendarService.getCarCalendarAvailability(car.id, startDate, endDate),
          );

          return {
            ...car,
            calendar_availability: {
              google_calendar_checked: calendarData.google_calendar_checked,
              blocked_dates: calendarData.blocked_dates,
              events: calendarData.events.map((e) => ({
                date: e.date,
                title: e.title,
              })),
            },
          };
        } catch {
          // If Calendar check fails, return car without calendar data
          return {
            ...car,
            calendar_availability: {
              google_calendar_checked: false,
              blocked_dates: [],
              events: [],
            },
          };
        }
      }),
    );

    return carsWithCalendarData;
  }

  /**
   * ✅ SPRINT 2 FIX: Verificar si un auto específico está disponible
   * Útil antes de crear una reserva
   *
   * @param carId - ID del auto
   * @param startDate - Fecha inicio (ISO string)
   * @param endDate - Fecha fin (ISO string)
   * @returns Promise<boolean> - true si está disponible, false si no
   *
   * @example
   * const available = await carsService.isCarAvailable(
   *   'uuid-del-auto',
   *   '2025-11-01T00:00:00Z',
   *   '2025-11-05T00:00:00Z'
   * );
   * if (!available) {
   *   alert('Auto no disponible para esas fechas');
   * }
   */
  async isCarAvailable(carId: string, startDate: string, endDate: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.rpc('is_car_available', {
        p_car_id: carId,
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) {
        return false; // En caso de error, asumir no disponible por seguridad
      }

      return data === true;
    } catch {
      return false;
    }
  }

  /**
   * ✅ NUEVO: Verifica si un auto tiene reservas activas
   * Usado antes de permitir eliminación del vehículo
   */
  async hasActiveBookings(carId: string): Promise<{
    hasActive: boolean;
    count: number;
    bookings?: Array<{ id: string; status: string; start_date: string; end_date: string }>;
  }> {
    // Verificar TODAS las reservas (incluidas completadas y canceladas)
    // porque el foreign key no tiene ON DELETE CASCADE
    const { data: allBookings, error: allError } = await this.supabase
      .from('bookings')
      .select('id, status')
      .eq('car_id', carId);

    if (allError) {
      throw allError;
    }

    // Si hay CUALQUIER reserva, no permitir eliminar
    if (allBookings && allBookings.length > 0) {
      // Contar activas para el mensaje
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
   * Retorna hasta 3 opciones de rangos disponibles con la misma duración solicitada
   *
   * @param carId - ID del auto
   * @param startDate - Fecha inicio solicitada (ISO string)
   * @param endDate - Fecha fin solicitada (ISO string)
   * @param maxOptions - Número máximo de opciones a retornar (default: 3)
   * @returns Promise con array de rangos disponibles
   *
   * @example
   * const alternatives = await carsService.getNextAvailableRange(
   *   'car-uuid',
   *   '2025-11-10',
   *   '2025-11-15'
   * );
   * // Retorna: [
   * //   { startDate: '2025-11-16', endDate: '2025-11-21', daysCount: 5 },
   * //   { startDate: '2025-11-22', endDate: '2025-11-27', daysCount: 5 },
   * //   { startDate: '2025-12-01', endDate: '2025-12-06', daysCount: 5 }
   * // ]
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
    try {
      // 1. Calcular duración solicitada
      const requestedStart = new Date(startDate);
      const requestedEnd = new Date(endDate);
      const durationMs = requestedEnd.getTime() - requestedStart.getTime();
      const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));

      // 2. Obtener todas las reservas futuras del auto (desde hoy)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: bookings, error } = await this.supabase
        .from('bookings')
        .select('start_at, end_at')
        .eq('car_id', carId)
        .in('status', ['pending', 'confirmed', 'in_progress'])
        .gte('end_at', today.toISOString())
        .order('start_at', { ascending: true });

      if (error) {
        console.error('Error fetching bookings for availability:', error);
        return [];
      }

      // 3. Construir intervalos bloqueados
      const blockedIntervals: Array<{ start: Date; end: Date }> =
        bookings?.map((b) => ({
          start: new Date(b.start_at),
          end: new Date(b.end_at),
        })) || [];

      // 4. Buscar ventanas disponibles
      const alternatives: Array<{
        startDate: string;
        endDate: string;
        daysCount: number;
      }> = [];

      // Comenzar a buscar desde el día siguiente al rango solicitado
      let searchStart = new Date(requestedEnd);
      searchStart.setDate(searchStart.getDate() + 1);
      searchStart.setHours(0, 0, 0, 0);

      // Limitar búsqueda a los próximos 90 días
      const maxSearchDate = new Date(today);
      maxSearchDate.setDate(maxSearchDate.getDate() + 90);

      let attempts = 0;
      const maxAttempts = 100; // Evitar loops infinitos

      while (
        alternatives.length < maxOptions &&
        searchStart < maxSearchDate &&
        attempts < maxAttempts
      ) {
        attempts++;

        // Calcular end date propuesto
        const searchEnd = new Date(searchStart);
        searchEnd.setDate(searchEnd.getDate() + durationDays);

        // Verificar si este rango está libre
        const hasConflict = blockedIntervals.some((blocked) => {
          // Overlap si: searchStart < blocked.end && searchEnd > blocked.start
          return searchStart < blocked.end && searchEnd > blocked.start;
        });

        if (!hasConflict) {
          // Rango disponible!
          alternatives.push({
            startDate: searchStart.toISOString().split('T')[0],
            endDate: searchEnd.toISOString().split('T')[0],
            daysCount: durationDays,
          });

          // Avanzar al siguiente día después de este rango
          searchStart = new Date(searchEnd);
          searchStart.setDate(searchStart.getDate() + 1);
        } else {
          // Hay conflicto, buscar el próximo día libre
          // Encontrar la reserva que bloquea
          const blockingReservation = blockedIntervals.find((blocked) => {
            return searchStart < blocked.end && searchEnd > blocked.start;
          });

          if (blockingReservation) {
            // Saltar al día siguiente después del fin de la reserva bloqueante
            searchStart = new Date(blockingReservation.end);
            searchStart.setDate(searchStart.getDate() + 1);
            searchStart.setHours(0, 0, 0, 0);
          } else {
            // No debería pasar, pero por seguridad avanzamos 1 día
            searchStart.setDate(searchStart.getDate() + 1);
          }
        }
      }

      return alternatives;
    } catch (error) {
      console.error('Error in getNextAvailableRange:', error);
      return [];
    }
  }
}
