import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { injectSupabase } from './supabase-client.service';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

/**
 * 🔄 REAL-TIME PRICING SERVICE (ECUCONDOR08122023 Pattern)
 * 
 * Sistema de precios dinámicos con WebSocket pooling usando Supabase Realtime
 * 
 * Features:
 * - 🔴 WebSocket subscription a exchange_rates (tasas de Binance)
 * - 🔴 WebSocket subscription a pricing_demand_snapshots (demanda)
 * - 🔴 WebSocket subscription a pricing_special_events (eventos)
 * - ⚡ Updates instantáneos sin polling
 * - 🎯 Signal-based reactivity
 * - 🧹 Auto-cleanup on destroy
 * 
 * Uso:
 * ```typescript
 * // En componente
 * private realtimePricing = inject(RealtimePricingService);
 * 
 * ngOnInit() {
 *   // Suscribirse a updates
 *   this.realtimePricing.subscribeToExchangeRates(() => {
 *     console.log('Nueva tasa de cambio:', this.realtimePricing.latestExchangeRate());
 *   });
 * }
 * ```
 */

export interface ExchangeRateUpdate {
  id: string;
  pair: string;
  source: string;
  binance_rate: number;
  platform_rate: number;
  margin_percent: number;
  last_updated: string;
  is_active: boolean;
}

export interface DemandSnapshot {
  id: string;
  region_id: string;
  timestamp: string;
  available_cars: number;
  active_bookings: number;
  pending_requests: number;
  demand_ratio: number;
  surge_factor: number;
}

export interface SpecialEvent {
  id: string;
  region_id: string;
  name: string;
  start_date: string;
  end_date: string;
  factor: number;
  active: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class RealtimePricingService {
  private readonly supabase = injectSupabase();

  // Realtime channels
  private exchangeRatesChannel: RealtimeChannel | null = null;
  private demandChannel: RealtimeChannel | null = null;
  private eventsChannel: RealtimeChannel | null = null;

  // Signals para estado reactivo
  readonly latestExchangeRate = signal<ExchangeRateUpdate | null>(null);
  readonly demandByRegion = signal<Map<string, DemandSnapshot>>(new Map());
  readonly activeEvents = signal<SpecialEvent[]>([]);
  readonly isConnected = signal<boolean>(false);
  readonly connectionStatus = signal<string>('disconnected');

  // Computed signals
  readonly currentSurgeFactor = computed(() => {
    // Retorna el factor de surge promedio de todas las regiones
    const demands = Array.from(this.demandByRegion().values());
    if (demands.length === 0) return 0;
    return demands.reduce((acc, d) => acc + d.surge_factor, 0) / demands.length;
  });

  readonly hasActiveEvents = computed(() => this.activeEvents().length > 0);

  constructor() {
    // Effect para log de debug (opcional)
    effect(() => {
      console.log('💱 Exchange Rate Updated:', this.latestExchangeRate());
      console.log('📈 Demand Snapshots:', this.demandByRegion().size);
      console.log('🎉 Active Events:', this.activeEvents().length);
    });
  }

  /**
   * 🔴 Suscribirse a actualizaciones de tasas de cambio (Binance)
   * Se actualiza cada vez que la Edge Function actualiza exchange_rates
   */
  subscribeToExchangeRates(onChange?: () => void): () => void {
    console.log('🔴 Subscribing to exchange_rates realtime updates...');

    this.exchangeRatesChannel = this.supabase
      .channel('exchange_rates_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'exchange_rates',
          filter: 'is_active=eq.true', // Solo tasas activas
        },
        (payload: RealtimePostgresChangesPayload<ExchangeRateUpdate>) => {
          console.log('💱 Exchange rate updated:', payload);

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            this.latestExchangeRate.set(payload.new as ExchangeRateUpdate);
            onChange?.();
          }
        }
      )
      .subscribe((status) => {
        console.log('💱 Exchange rates channel status:', status);
        this.connectionStatus.set(status);
        this.isConnected.set(status === 'SUBSCRIBED');
      });

    // Cargar tasa inicial
    void this.loadInitialExchangeRate();

    // Return unsubscribe function
    return () => {
      console.log('🔴 Unsubscribing from exchange_rates...');
      this.exchangeRatesChannel?.unsubscribe();
      this.exchangeRatesChannel = null;
    };
  }

  /**
   * 🔴 Suscribirse a actualizaciones de demanda por región
   * Se actualiza cada 15 minutos por cron job
   */
  subscribeToDemandSnapshots(onChange?: (regionId: string) => void): () => void {
    console.log('🔴 Subscribing to demand_snapshots realtime updates...');

    this.demandChannel = this.supabase
      .channel('demand_snapshots_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pricing_demand_snapshots',
        },
        (payload: RealtimePostgresChangesPayload<DemandSnapshot>) => {
          console.log('📈 Demand snapshot updated:', payload);

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const snapshot = payload.new as DemandSnapshot;
            
            // Actualizar map de demanda por región
            this.demandByRegion.update(map => {
              const newMap = new Map(map);
              newMap.set(snapshot.region_id, snapshot);
              return newMap;
            });

            onChange?.(snapshot.region_id);
          }
        }
      )
      .subscribe((status) => {
        console.log('📈 Demand channel status:', status);
      });

    // Cargar snapshots iniciales
    void this.loadInitialDemandSnapshots();

    return () => {
      console.log('🔴 Unsubscribing from demand_snapshots...');
      this.demandChannel?.unsubscribe();
      this.demandChannel = null;
    };
  }

  /**
   * 🔴 Suscribirse a eventos especiales (conciertos, feriados, etc)
   */
  subscribeToSpecialEvents(onChange?: () => void): () => void {
    console.log('🔴 Subscribing to special_events realtime updates...');

    this.eventsChannel = this.supabase
      .channel('special_events_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pricing_special_events',
          filter: 'active=eq.true',
        },
        (payload: RealtimePostgresChangesPayload<SpecialEvent>) => {
          console.log('🎉 Special event updated:', payload);

          // Recargar todos los eventos activos
          void this.loadActiveEvents();
          onChange?.();
        }
      )
      .subscribe((status) => {
        console.log('🎉 Events channel status:', status);
      });

    // Cargar eventos iniciales
    void this.loadActiveEvents();

    return () => {
      console.log('🔴 Unsubscribing from special_events...');
      this.eventsChannel?.unsubscribe();
      this.eventsChannel = null;
    };
  }

  /**
   * 🔴 Suscribirse a TODO (exchange rates + demand + events)
   * Un solo método para activar todas las subscriptions
   */
  subscribeToAllPricingUpdates(callbacks?: {
    onExchangeRateUpdate?: () => void;
    onDemandUpdate?: (regionId: string) => void;
    onEventUpdate?: () => void;
  }): () => void {
    const unsubExchange = this.subscribeToExchangeRates(callbacks?.onExchangeRateUpdate);
    const unsubDemand = this.subscribeToDemandSnapshots(callbacks?.onDemandUpdate);
    const unsubEvents = this.subscribeToSpecialEvents(callbacks?.onEventUpdate);

    // Return combined unsubscribe
    return () => {
      unsubExchange();
      unsubDemand();
      unsubEvents();
    };
  }

  /**
   * 📊 Obtener factor de surge para una región específica
   */
  getSurgeFactorForRegion(regionId: string): number {
    const snapshot = this.demandByRegion().get(regionId);
    return snapshot?.surge_factor ?? 0;
  }

  /**
   * 💱 Obtener la tasa de cambio actual (platform_rate)
   */
  getCurrentPlatformRate(): number {
    return this.latestExchangeRate()?.platform_rate ?? 1015.0; // Fallback
  }

  /**
   * 🎉 Obtener eventos activos para una región
   */
  getActiveEventsForRegion(regionId: string): SpecialEvent[] {
    return this.activeEvents().filter(e => e.region_id === regionId);
  }

  // ═══════════════════════════════════════════════════════════════
  // MÉTODOS PRIVADOS - Carga inicial de datos
  // ═══════════════════════════════════════════════════════════════

  private async loadInitialExchangeRate(): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('exchange_rates')
        .select('*')
        .eq('is_active', true)
        .order('last_updated', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      if (data) {
        this.latestExchangeRate.set(data as ExchangeRateUpdate);
      }
    } catch (error) {
      console.error('Failed to load initial exchange rate:', error);
    }
  }

  private async loadInitialDemandSnapshots(): Promise<void> {
    try {
      // Obtener el snapshot más reciente de cada región
      const { data, error } = await this.supabase
        .from('pricing_demand_snapshots')
        .select('*')
        .order('timestamp', { ascending: false });

      if (error) throw error;
      if (data) {
        // Agrupar por región (mantener solo el más reciente)
        const snapshotsByRegion = new Map<string, DemandSnapshot>();
        (data as DemandSnapshot[]).forEach(snapshot => {
          if (!snapshotsByRegion.has(snapshot.region_id)) {
            snapshotsByRegion.set(snapshot.region_id, snapshot);
          }
        });

        this.demandByRegion.set(snapshotsByRegion);
      }
    } catch (error) {
      console.error('Failed to load initial demand snapshots:', error);
    }
  }

  private async loadActiveEvents(): Promise<void> {
    try {
      const now = new Date().toISOString();

      const { data, error } = await this.supabase
        .from('pricing_special_events')
        .select('*')
        .eq('active', true)
        .lte('start_date', now)
        .gte('end_date', now);

      if (error) throw error;
      if (data) {
        this.activeEvents.set(data as SpecialEvent[]);
      }
    } catch (error) {
      console.error('Failed to load active events:', error);
    }
  }

  /**
   * 🧹 Cleanup - desuscribirse de todo
   * Llamar en ngOnDestroy del componente
   */
  cleanup(): void {
    console.log('🧹 Cleaning up realtime pricing subscriptions...');
    this.exchangeRatesChannel?.unsubscribe();
    this.demandChannel?.unsubscribe();
    this.eventsChannel?.unsubscribe();

    this.exchangeRatesChannel = null;
    this.demandChannel = null;
    this.eventsChannel = null;
  }
}
