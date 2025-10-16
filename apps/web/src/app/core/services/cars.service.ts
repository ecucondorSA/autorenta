import { Injectable } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';
import { injectSupabase } from './supabase-client.service';
import { Car, CarFilters, CarPhoto } from '../models';

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
    return data as Car;
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
    let query = this.supabase.from('cars').select('*, car_photos(*)').eq('status', 'active').limit(20);
    if (filters.city) {
      query = query.ilike('location_city', `%${filters.city}%`);
    }
    if (filters.from && filters.to) {
      // TODO: filtrar por disponibilidad real usando reservas existentes
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as Car[];
  }

  async getCarById(id: string): Promise<Car | null> {
    const { data, error } = await this.supabase.from('cars').select('*, car_photos(*)').eq('id', id).single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as Car;
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
    return (data ?? []) as Car[];
  }

  async deleteCar(carId: string): Promise<void> {
    const userId = (await this.supabase.auth.getUser()).data.user?.id;
    if (!userId) throw new Error('Usuario no autenticado');
    const { error } = await this.supabase.from('cars').delete().eq('id', carId).eq('owner_id', userId);
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
    return (data ?? []) as Car[];
  }

  async getCarBrands(): Promise<Array<{ id: string; name: string }>> {
    const { data, error } = await this.supabase
      .from('car_brands')
      .select('id, name')
      .order('name');
    if (error) throw error;
    return data ?? [];
  }

  async getCarModels(brandId: string): Promise<Array<{ id: string; name: string; category: string }>> {
    const { data, error } = await this.supabase
      .from('car_models')
      .select('id, name, category')
      .eq('brand_id', brandId)
      .order('name');
    if (error) throw error;
    return data ?? [];
  }
}
