import { Injectable } from '@angular/core';
import { injectSupabase } from './supabase-client.service';

export interface RequestBookingParams {
  car_id: string;
  renter_id: string;
  start_at: string; // ISO
  end_at: string; // ISO
  payment_method?: 'card' | 'wallet';
  idempotency_key?: string;
}

@Injectable({ providedIn: 'root' })
export class BookingService {
  private supabase = injectSupabase();

  async requestBooking(params: RequestBookingParams) {
    const rpcParams: {
      p_car_id: string;
      p_renter_id: string;
      p_start: string;
      p_end: string;
      p_payment_method: 'card' | 'wallet';
      p_idempotency_key: string | null;
    } = {
      p_car_id: params.car_id,
      p_renter_id: params.renter_id,
      p_start: params.start_at,
      p_end: params.end_at,
      p_payment_method: params.payment_method || 'card',
      p_idempotency_key: params.idempotency_key || null,
    };

    const { data, error } = await this.supabase.rpc('request_booking', rpcParams);
    if (error) throw error;
    return data;
  }

  async checkAvailability(carId: string, start: string, end: string): Promise<boolean> {
    const { data, error } = await this.supabase.rpc('check_availability', {
      p_car_id: carId,
      p_start: start,
      p_end: end,
    });
    if (error) throw error;
    // Supabase RPC returns an array of rows; the boolean will be at data[0]
    if (Array.isArray(data)) return !!data[0];
    return !!data;
  }
}
