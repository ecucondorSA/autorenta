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

@Injectable({
  providedIn: 'root',
})
export class CarsService {
  private readonly supabase = injectSupabase();

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
      photos: data.car_photos || []
    } as Car;
  }

  async uploadPhoto(file: File, carId: string, position = 0): Promise<CarPhoto> {
    const userId = (await this.supabase.auth.getUser()).data.user?.id;
    if (!userId) throw new Error('Usuario no autenticado');

    const optimizedFile = await this.optimizeImage(file, {
      maxWidth: 1200,
      maxHeight: 900,
      quality: 0.85,
      format: 'webp'
    });

    const extension = 'webp';
    const filePath = `${userId}/${carId}/${uuidv4()}.${extension}`;
    const { error } = await this.supabase.storage.from('car-images').upload(filePath, optimizedFile, {
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
              resolve(new File([blob], file.name.replace(/\.[^/.]+$/, ".webp"), { type: 'image/webp' }));
            } else {
              reject(new Error('Failed to optimize image'));
            }
          },
          'image/webp',
          options.quality
        );
      };

      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  async listActiveCars(filters: CarFilters): Promise<Car[]> {
    let query = this.supabase
      .from('cars')
      .select(`
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
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    
    if (filters.city) {
      query = query.ilike('location_city', `%${filters.city}%`);
    }
    
    const { data, error } = await query;
    if (error) throw error;

    // ✅ FIX P0.2: Filtrar por disponibilidad si hay fechas
    if (filters.from && filters.to && data) {
      const availableCars = await this.filterByAvailability(
        data as Car[],
        filters.from,
        filters.to,
        filters.blockedCarIds || []
      );
      return availableCars.map((car: any) => ({
        ...car,
        photos: car.car_photos || [],
        owner: Array.isArray(car.owner) ? car.owner[0] : car.owner
      })) as Car[];
    }

    return (data ?? []).map((car: any) => ({
      ...car,
      photos: car.car_photos || [],
      owner: Array.isArray(car.owner) ? car.owner[0] : car.owner
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
    additionalBlockedIds: string[] = []
  ): Promise<Car[]> {
    if (cars.length === 0) return [];

    const carIds = cars.map(c => c.id);

    // Buscar bookings que se solapan con las fechas solicitadas
    const { data: conflicts, error } = await this.supabase
      .from('bookings')
      .select('car_id')
      .in('car_id', carIds)
      .in('status', ['confirmed', 'in_progress', 'pending'])
      .or(`start_at.lte.${endDate},end_at.gte.${startDate}`);

    if (error) {
      console.error('Error checking availability:', error);
      return cars; // Fallback: mostrar todos si falla
    }

    // IDs de autos bloqueados
    const blockedIds = new Set([
      ...additionalBlockedIds,
      ...(conflicts || []).map(c => c.car_id)
    ]);

    console.log(`🚗 Filtered ${blockedIds.size} unavailable cars from ${cars.length} total cars`);

    // Filtrar autos disponibles
    return cars.filter(car => !blockedIds.has(car.id));
  }

  async getCarById(id: string): Promise<Car | null> {
    const { data, error } = await this.supabase
      .from('cars')
      .select(`
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
      `)
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return {
      ...data,
      photos: data.car_photos || []
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

    return (data ?? []).map((car: any) => ({
      ...car,
      photos: car.car_photos || []
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
      photos: data.car_photos || []
    } as Car;
  }

  async listPendingCars(): Promise<Car[]> {
    const { data, error } = await this.supabase
      .from('cars')
      .select('*, car_photos(*)')
      .eq('status', 'draft')
      .order('created_at', { ascending: false });
    if (error) throw error;

    return (data ?? []).map((car: any) => ({
      ...car,
      photos: car.car_photos || []
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

  async getAllCarModels(): Promise<Array<{ id: string; brand_id: string; name: string; category: string; seats: number; doors: number }>> {
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
}
