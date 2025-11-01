import { Injectable } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';
import { Car, CarFilters, CarPhoto } from '../models';
import { injectSupabase } from './supabase-client.service';

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
  private readonly defaultValuationConfig = {
    averageRentalDays: 300,
  };

  async createCar(input: Partial<Car>): Promise<Car> {
    const userId = (await this.supabase.auth.getUser()).data.user?.id;
    if (!userId) {
      throw new Error('Usuario no autenticado');
    }
    const { data, error } = await this.supabase
      .from('cars')
      .insert({ ...input, owner_id: userId })
      .select('*, car_photos(*)')
      .single();
    if (error) throw error;

    return {
      ...data,
      photos: data.car_photos || [],
    } as Car;
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

  async listActiveCars(filters: CarFilters): Promise<Car[]> {
    let query = this.supabase
      .from('cars')
      .select(
        `
        *,
        car_photos(*),
        owner:v_car_owner_info!owner_id(
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

    // Data loaded successfully

    // ✅ FIX P0.2: Filtrar por disponibilidad si hay fechas
    if (filters.from && filters.to && data) {
      const availableCars = await this.filterByAvailability(
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

  async getCarById(id: string): Promise<Car | null> {
    const { data, error } = await this.supabase
      .from('cars')
      .select(
        `
        *,
        car_photos(*),
        owner:v_car_owner_info!owner_id(
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
    const { data, error } = await this.supabase
      .from('cars')
      .select('*, car_photos(*)')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;

    return (data ?? []).map((car: CarWithPhotosRaw) => ({
      ...car,
      photos: car.car_photos || [],
    })) as Car[];
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

    const { data, error } = await this.supabase
      .from('cars')
      .update(input)
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
    try {
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
    } catch (error) {
      throw error;
    }
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
    } catch (error) {
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
    try {
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
    } catch (error) {
      throw error;
    }
  }
}
