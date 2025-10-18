import { Injectable } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';
import { Car, CarFilters, CarPhoto } from '../models';
import { injectSupabase } from './supabase-client.service';

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

    // Map car_photos to photos for backward compatibility
    return {
      ...data,
      photos: data.car_photos || []
    } as Car;
  }

  async uploadPhoto(file: File, carId: string, position = 0): Promise<CarPhoto> {
    const userId = (await this.supabase.auth.getUser()).data.user?.id;
    if (!userId) throw new Error('Usuario no autenticado');
    const extension = file.name.split('.').pop() ?? 'jpg';
    const filePath = `${userId}/${carId}/${uuidv4()}.${extension}`;
    const { error } = await this.supabase.storage.from('car-images').upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (error) throw error;
    const { data } = this.supabase.storage.from('car-images').getPublicUrl(filePath);

    // Crear registro en car_photos
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

  async listActiveCars(filters: CarFilters): Promise<Car[]> {
    let query = this.supabase
      .from('cars')
      .select('*, car_photos(*)')
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    if (filters.city) {
      query = query.ilike('location_city', `%${filters.city}%`);
    }
    if (filters.from && filters.to) {
      // TODO: filtrar por disponibilidad real usando reservas existentes
    }
    const { data, error } = await query;
    if (error) throw error;

    // Map car_photos to photos for backward compatibility
    return (data ?? []).map(car => ({
      ...car,
      photos: car.car_photos || []
    })) as Car[];
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

    // Map car_photos to photos for backward compatibility
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

    // Map car_photos to photos for backward compatibility
    return (data ?? []).map(car => ({
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

  async listPendingCars(): Promise<Car[]> {
    // Note: 'pending' status doesn't exist in DB. Using 'draft' for pending approval.
    const { data, error } = await this.supabase
      .from('cars')
      .select('*, car_photos(*)')
      .eq('status', 'draft')
      .order('created_at', { ascending: false });
    if (error) throw error;

    // Map car_photos to photos for backward compatibility
    return (data ?? []).map(car => ({
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
}
