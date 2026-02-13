import { Injectable, inject } from '@angular/core';
import { FgoStatus, FgoStatusView, mapFgoStatus } from '@core/models/fgo.model';
import { NetworkPool, ParticipationPeriod } from '@core/models/participation.model';
import { Observable, from, map } from 'rxjs';
import { SupabaseClientService } from '../infrastructure/supabase-client.service';

@Injectable({
  providedIn: 'root',
})
export class ParticipationService {
  private readonly supabase = inject(SupabaseClientService);

  /**
   * Obtiene el estado actual de la Participación del Dueño
   * (Puntos acumulados, Factores, Ganancia estimada)
   */
  getCurrentPeriod(ownerId: string): Observable<ParticipationPeriod | null> {
    return from(this.supabase.invoke('get-participation-stats', {
      body: { owner_id: ownerId }
    })).pipe(
      map(({ data, error }) => {
        if (error || !data) return null;
        
        // Map Edge Function response to ParticipationPeriod model
        return {
          id: `period-${data.period}`,
          car_id: 'all', // Agregado para el dueño actual
          owner_id: ownerId,
          period: data.period,
          total_points: data.total_points,
          pool_share_percentage: data.estimated_share,
          earnings_usd: data.estimated_earnings_usd,
          currency: 'USD',
          status: 'open',
          // Campos calculados por simplicidad en el MVP
          total_hours_in_period: 720,
          available_hours: 0,
          days_used: 0,
          location_factor: 1,
          vehicle_category_factor: 1,
          owner_rating_at_close: 5,
          points_availability: data.total_points,
          points_location: 0,
          points_vehicle: 0,
          points_rating: 0,
          points_usage_bonus: 0
        } as ParticipationPeriod;
      })
    );
  }

  /**
   * Obtiene el estado del Fondo de Garantía (FGO)
   * Vital para mostrar la "Cobertura Mutual"
   */
  getFgoStatus(): Observable<FgoStatus> {
    return from(this.supabase.from('v_fgo_status').select('*').single()).pipe(
      map(({ data, error }) => {
        if (error || !data) {
          throw new Error('Could not fetch FGO status');
        }
        return mapFgoStatus(data as FgoStatusView);
      })
    );
  }

  /**
   * Obtiene el Pool de la Red del mes actual
   */
  getCurrentPool(): Observable<NetworkPool> {
    return from(this.supabase.from('v_current_reward_pool').select('*').single()).pipe(
      map(({ data, error }) => {
        if (error || !data) {
          throw new Error('Could not fetch Reward Pool status');
        }
        return data as NetworkPool;
      })
    );
  }
}
