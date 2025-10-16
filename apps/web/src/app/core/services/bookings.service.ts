import { Injectable } from '@angular/core';
import { injectSupabase } from './supabase-client.service';
import { Booking } from '../models';

@Injectable({
  providedIn: 'root',
})
export class BookingsService {
  private readonly supabase = injectSupabase();

  async requestBooking(carId: string, start: string, end: string): Promise<Booking> {
    const { data, error } = await this.supabase.rpc('request_booking', {
      p_car_id: carId,
      p_start: start,
      p_end: end,
    });
    if (error) throw error;
    return data as Booking;
  }

  async getMyBookings(): Promise<Booking[]> {
    const userId = (await this.supabase.auth.getUser()).data.user?.id;
    if (!userId) throw new Error('Usuario no autenticado');
    const { data, error } = await this.supabase
      .from('bookings')
      .select('*, cars(*), payment_intents(*)')
      .eq('renter_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Booking[];
  }

  async getBookingById(bookingId: string): Promise<Booking | null> {
    const { data, error } = await this.supabase
      .from('bookings')
      .select('*, cars(*), payment_intents(*)')
      .eq('id', bookingId)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as Booking;
  }
}
