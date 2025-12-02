import { inject, Injectable } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';

export interface CarLatestLocation {
  car_id: string;
  lat: number | null;
  lng: number | null;
  recorded_at: string | null;
}

@Injectable({ providedIn: 'root' })
export class CarLocationService {
  private readonly supabase = inject(SupabaseClientService).getClient();

  /**
   * Fetch latest tracking location per car using the `car_latest_location` view
   * joined with `car_tracking_sessions` to obtain car_id.
   */
  async getLatestLocations(carIds: string[]): Promise<CarLatestLocation[]> {
    if (!carIds.length) return [];

    type LatestLocationRow = {
      lat: number | null;
      lng: number | null;
      recorded_at: string | null;
      car_tracking_sessions?: { car_id: string }[];
    };

    const { data, error } = await this.supabase
      .from('car_latest_location')
      .select('lat, lng, recorded_at, car_tracking_sessions ( car_id )')
      .in('car_tracking_sessions.car_id', carIds);

    if (error) throw error;

    return ((data || []) as LatestLocationRow[])
      .map((row) => ({
        car_id: row.car_tracking_sessions?.[0]?.car_id ?? '',
        lat: row.lat,
        lng: row.lng,
        recorded_at: row.recorded_at,
      }))
      .filter((r) => !!r.car_id);
  }
}
