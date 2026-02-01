import { Injectable, inject } from '@angular/core';
import { FgoStatus, FgoStatusView, mapFgoStatus } from '@core/models/fgo.model';
import { NetworkPool, ParticipationPeriod } from '@core/models/participation.model';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
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
    // TODO: Connect to real Edge Function 'get-current-participation'
    // MOCK DATA FOR MVP
    const mockPeriod: ParticipationPeriod = {
      id: 'mock-period-id',
      car_id: 'car-123',
      owner_id: ownerId,
      period: '2026-01',
      total_hours_in_period: 744,
      available_hours: 600,
      days_used: 12,
      location_factor: 1.2,
      vehicle_category_factor: 1.1,
      owner_rating_at_close: 4.8,
      points_availability: 240,
      points_location: 100,
      points_vehicle: 50,
      points_rating: 40,
      points_usage_bonus: 30,
      total_points: 460,
      pool_share_percentage: 0.0015, // 0.15%
      earnings_usd: 450.5,
      currency: 'USD',
      status: 'open',
    };
    return of(mockPeriod).pipe(delay(800));
  }

  /**
   * Obtiene el estado del Fondo de Garantía (FGO)
   * Vital para mostrar la "Cobertura Mutual"
   */
  getFgoStatus(): Observable<FgoStatus> {
    // TODO: Connect to real DB View 'v_fgo_status'
    const mockFgoView: FgoStatusView = {
      liquidity_balance_cents: 15000000, // $150,000 USD
      capitalization_balance_cents: 5000000, // $50,000 USD
      profitability_balance_cents: 1000000, // $10,000 USD
      total_fgo_balance_cents: 21000000, // $210,000 USD
      alpha_percentage: 15,
      target_months_coverage: 12,
      total_contributions_cents: 25000000,
      total_siniestros_paid_cents: 4000000,
      total_siniestros_count: 5,
      coverage_ratio: 1.2,
      loss_ratio: 0.16,
      target_balance_cents: 18000000,
      status: 'healthy',
      last_calculated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return of(mapFgoStatus(mockFgoView)).pipe(delay(600));
  }

  /**
   * Obtiene el Pool de la Red del mes actual
   */
  getCurrentPool(): Observable<NetworkPool> {
    const mockPool: NetworkPool = {
      id: 'pool-2026-01',
      period: '2026-01',
      total_revenue_usd: 150000,
      platform_fee_percentage: 15,
      platform_revenue_usd: 45000,
      distributable_revenue_usd: 105000,
      total_network_points: 350000,
      total_participants_count: 450,
      status: 'collecting',
    };
    return of(mockPool).pipe(delay(700));
  }
}
