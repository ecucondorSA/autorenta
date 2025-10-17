import { Injectable } from '@angular/core';
import { Car, Booking } from '../models';
import { injectSupabase } from './supabase-client.service';

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private readonly supabase = injectSupabase();

  async approveCar(carId: string): Promise<void> {
    const { error } = await this.supabase.from('cars').update({ status: 'active' }).eq('id', carId);
    if (error) throw error;
  }

  async listPendingCars(): Promise<Car[]> {
    const { data, error } = await this.supabase
      .from('cars')
      .select('*, car_photos(*)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Car[];
  }

  async listRecentBookings(limit: number = 20): Promise<Booking[]> {
    const { data, error } = await this.supabase
      .from('bookings')
      .select('*, cars(*), profiles(*)')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as Booking[];
  }
}
