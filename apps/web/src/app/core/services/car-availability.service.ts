import { Injectable, inject } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';

export interface CarBlackout {
  starts_at: string;
  ends_at: string;
  reason: string | null;
}

export interface CarHandoverPoint {
  id: string;
  kind: string;
  lat: number;
  lng: number;
  radius_m: number | null;
}

@Injectable({ providedIn: 'root' })
export class CarAvailabilityService {
  private readonly supabase = inject(SupabaseClientService).getClient();

  async getBlackouts(carId: string): Promise<CarBlackout[]> {
    const { data, error } = await this.supabase
      .from('car_blackouts')
      .select('starts_at, ends_at, reason')
      .eq('car_id', carId)
      .order('starts_at', { ascending: true });

    if (error) {
      throw error;
    }

    return (data || []) as CarBlackout[];
  }

  async getHandoverPoints(carId: string): Promise<CarHandoverPoint[]> {
    const { data, error } = await this.supabase
      .from('car_handover_points')
      .select('id, kind, lat, lng, radius_m')
      .eq('car_id', carId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data || []) as CarHandoverPoint[];
  }
}
