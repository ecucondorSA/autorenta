import { Injectable } from '@angular/core';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';

export interface CarLatestLocation {
  car_id: string;
  lat: number | null;
  lng: number | null;
  recorded_at: string | null;
}

@Injectable({ providedIn: 'root' })
export class CarLocationService {
  private readonly supabase = injectSupabase();

  /**
   * Fetch latest tracking location per car using the `car_latest_location` view.
   * The view now exposes `car_id` directly, so we filter on that column.
   */
  async getLatestLocations(carIds: string[]): Promise<CarLatestLocation[]> {
    if (!carIds.length) return [];

    const { data, error } = await this.supabase
      .from('car_latest_location')
      .select('car_id, lat, lng, recorded_at')
      .in('car_id', carIds);

    if (error) throw error;

    return (data || []).filter((row): row is CarLatestLocation => !!row.car_id);
  }
}
