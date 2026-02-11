import { LoggerService } from '@core/services/infrastructure/logger.service';
import { RealtimeConnectionService } from '@core/services/infrastructure/realtime-connection.service';
import { computed, Injectable, signal, inject, OnDestroy } from '@angular/core';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';

/**
 * REAL-TIME PRICING SERVICE
 *
 * Sistema de precios dinámicos con WebSocket pooling usando RealtimeConnectionService
 *
 * Features:
 * - WebSocket subscription a exchange_rates (tasas de Binance)
 * - WebSocket subscription a pricing_demand_snapshots (demanda)
 * - WebSocket subscription a pricing_special_events (eventos)
 * - Retry automático y deduplicación via RCS
 * - Signal-based reactivity
 * - Auto-cleanup on destroy
 */

// Use `type` instead of `interface` so TypeScript infers implicit index signatures,
// required by subscribeWithRetry<T extends DatabaseRecord>
export type ExchangeRateUpdate = {
  id: string;
  pair: string;
  source: string;
  binance_rate: number;
  rate: number;
  margin_percent: number;
  last_updated: string;
  is_active: boolean;
};

export type DemandSnapshot = {
  id: string;
  region_id: string;
  created_at: string;
  available_cars: number;
  active_bookings: number;
  pending_requests: number;
  demand_ratio: number;
  surge_factor: number;
};

export type SpecialEvent = {
  id: string;
  region_id: string;
  name: string;
  start_date: string;
  end_date: string;
  factor: number;
  active: boolean;
};

type PricingUpdateCallbacks = {
  onExchangeRateUpdate?: () => void;
  onDemandUpdate?: (regionId: string) => void;
  onEventUpdate?: () => void;
};

// Channel names managed by RealtimeConnectionService
const CHANNEL_EXCHANGE_RATES = 'pricing-exchange-rates';
const CHANNEL_DEMAND_SNAPSHOTS = 'pricing-demand-snapshots';
const CHANNEL_SPECIAL_EVENTS = 'pricing-special-events';

@Injectable({
  providedIn: 'root',
})
export class RealtimePricingService implements OnDestroy {
  private readonly logger = inject(LoggerService).createChildLogger('RealtimePricingService');
  private readonly supabase = injectSupabase();
  private readonly realtimeConnection = inject(RealtimeConnectionService);

  // Track which channels are active
  private exchangeRatesActive = false;
  private demandActive = false;
  private eventsActive = false;

  private readonly sharedSubscribers = new Set<PricingUpdateCallbacks>();
  private sharedSubscriptionsActive = false;

  // Signals para estado reactivo
  readonly latestExchangeRate = signal<ExchangeRateUpdate | null>(null);
  readonly demandByRegion = signal<Map<string, DemandSnapshot>>(new Map());
  readonly activeEvents = signal<SpecialEvent[]>([]);
  readonly isConnected = signal<boolean>(false);
  readonly connectionStatus = signal<string>('disconnected');

  // Computed signals
  readonly currentSurgeFactor = computed(() => {
    const demands = Array.from(this.demandByRegion().values());
    if (demands.length === 0) return 0;
    return demands.reduce((acc, d) => acc + d.surge_factor, 0) / demands.length;
  });

  readonly hasActiveEvents = computed(() => this.activeEvents().length > 0);

  ngOnDestroy(): void {
    this.cleanup();
  }

  /**
   * Suscribirse a actualizaciones de tasas de cambio (Binance)
   */
  subscribeToExchangeRates(onChange?: () => void): () => void {
    if (!this.exchangeRatesActive) {
      this.exchangeRatesActive = true;
      this.realtimeConnection.subscribeWithRetry<ExchangeRateUpdate>(
        CHANNEL_EXCHANGE_RATES,
        {
          event: '*',
          schema: 'public',
          table: 'exchange_rates',
          filter: 'is_active=eq.true',
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            this.latestExchangeRate.set(payload.new as ExchangeRateUpdate);
            onChange?.();
          }
        },
        (status) => {
          this.connectionStatus.set(status);
          this.isConnected.set(status === 'connected');
        },
      );

      void this.loadInitialExchangeRate();
    }

    return () => {
      this.realtimeConnection.unsubscribe(CHANNEL_EXCHANGE_RATES);
      this.exchangeRatesActive = false;
    };
  }

  /**
   * Suscribirse a actualizaciones de demanda por región
   */
  subscribeToDemandSnapshots(onChange?: (regionId: string) => void): () => void {
    if (!this.demandActive) {
      this.demandActive = true;
      this.realtimeConnection.subscribeWithRetry<DemandSnapshot>(
        CHANNEL_DEMAND_SNAPSHOTS,
        {
          event: '*',
          schema: 'public',
          table: 'pricing_demand_snapshots',
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const snapshot = payload.new as DemandSnapshot;
            this.demandByRegion.update((map) => {
              const newMap = new Map(map);
              newMap.set(snapshot.region_id, snapshot);
              return newMap;
            });
            onChange?.(snapshot.region_id);
          }
        },
      );

      void this.loadInitialDemandSnapshots();
    }

    return () => {
      this.realtimeConnection.unsubscribe(CHANNEL_DEMAND_SNAPSHOTS);
      this.demandActive = false;
    };
  }

  /**
   * Suscribirse a eventos especiales (conciertos, feriados, etc)
   */
  subscribeToSpecialEvents(onChange?: () => void): () => void {
    if (!this.eventsActive) {
      this.eventsActive = true;
      this.realtimeConnection.subscribeWithRetry<SpecialEvent>(
        CHANNEL_SPECIAL_EVENTS,
        {
          event: '*',
          schema: 'public',
          table: 'pricing_special_events',
          filter: 'active=eq.true',
        },
        () => {
          void this.loadActiveEvents();
          onChange?.();
        },
      );

      void this.loadActiveEvents();
    }

    return () => {
      this.realtimeConnection.unsubscribe(CHANNEL_SPECIAL_EVENTS);
      this.eventsActive = false;
    };
  }

  /**
   * Suscribirse a TODO (exchange rates + demand + events)
   * Un solo método para activar todas las subscriptions
   */
  subscribeToAllPricingUpdates(callbacks?: PricingUpdateCallbacks): () => void {
    const subscriber = callbacks ?? {};
    this.sharedSubscribers.add(subscriber);

    if (!this.sharedSubscriptionsActive) {
      this.sharedSubscriptionsActive = true;
      this.startSharedSubscriptions();
    }

    return () => {
      this.sharedSubscribers.delete(subscriber);
      if (this.sharedSubscribers.size === 0) {
        this.cleanup();
      }
    };
  }

  private startSharedSubscriptions(): void {
    if (!this.exchangeRatesActive) {
      this.exchangeRatesActive = true;
      this.realtimeConnection.subscribeWithRetry<ExchangeRateUpdate>(
        CHANNEL_EXCHANGE_RATES,
        {
          event: '*',
          schema: 'public',
          table: 'exchange_rates',
          filter: 'is_active=eq.true',
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            this.latestExchangeRate.set(payload.new as ExchangeRateUpdate);
            for (const sub of this.sharedSubscribers) {
              sub.onExchangeRateUpdate?.();
            }
          }
        },
        (status) => {
          this.connectionStatus.set(status);
          this.isConnected.set(status === 'connected');
        },
      );

      void this.loadInitialExchangeRate();
    }

    if (!this.demandActive) {
      this.demandActive = true;
      this.realtimeConnection.subscribeWithRetry<DemandSnapshot>(
        CHANNEL_DEMAND_SNAPSHOTS,
        {
          event: '*',
          schema: 'public',
          table: 'pricing_demand_snapshots',
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const snapshot = payload.new as DemandSnapshot;
            this.demandByRegion.update((map) => {
              const newMap = new Map(map);
              newMap.set(snapshot.region_id, snapshot);
              return newMap;
            });

            for (const sub of this.sharedSubscribers) {
              sub.onDemandUpdate?.(snapshot.region_id);
            }
          }
        },
      );

      void this.loadInitialDemandSnapshots();
    }

    if (!this.eventsActive) {
      this.eventsActive = true;
      this.realtimeConnection.subscribeWithRetry<SpecialEvent>(
        CHANNEL_SPECIAL_EVENTS,
        {
          event: '*',
          schema: 'public',
          table: 'pricing_special_events',
          filter: 'active=eq.true',
        },
        () => {
          void this.loadActiveEvents();
          for (const sub of this.sharedSubscribers) {
            sub.onEventUpdate?.();
          }
        },
      );

      void this.loadActiveEvents();
    }
  }

  /**
   * Obtener factor de surge para una región específica
   */
  getSurgeFactorForRegion(regionId: string): number {
    const snapshot = this.demandByRegion().get(regionId);
    return snapshot?.surge_factor ?? 0;
  }

  /**
   * Obtener la tasa de cambio actual (platform_rate)
   */
  getCurrentPlatformRate(): number {
    const rate = this.latestExchangeRate()?.rate;
    return rate ? rate * 1.1 : 1015.0; // Fallback
  }

  /**
   * Obtener eventos activos para una región
   */
  getActiveEventsForRegion(regionId: string): SpecialEvent[] {
    return this.activeEvents().filter((e) => e.region_id === regionId);
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
      this.logger.error('Failed to load initial exchange rate', { error });
    }
  }

  private async loadInitialDemandSnapshots(): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('pricing_demand_snapshots')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        const snapshotsByRegion = new Map<string, DemandSnapshot>();
        (data as DemandSnapshot[]).forEach((snapshot) => {
          if (!snapshotsByRegion.has(snapshot.region_id)) {
            snapshotsByRegion.set(snapshot.region_id, snapshot);
          }
        });

        this.demandByRegion.set(snapshotsByRegion);
      }
    } catch (err) {
      this.logger.error('Failed to load initial demand snapshots', { error: err });
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

      if (error) {
        // Table may not exist — expected, non-critical
        return;
      }
      if (data) {
        this.activeEvents.set(data as SpecialEvent[]);
      }
    } catch {
      // Network/table-not-found errors are non-critical
    }
  }

  /**
   * Cleanup - desuscribirse de todo via RealtimeConnectionService
   */
  cleanup(): void {
    if (this.exchangeRatesActive) {
      this.realtimeConnection.unsubscribe(CHANNEL_EXCHANGE_RATES);
      this.exchangeRatesActive = false;
    }

    if (this.demandActive) {
      this.realtimeConnection.unsubscribe(CHANNEL_DEMAND_SNAPSHOTS);
      this.demandActive = false;
    }

    if (this.eventsActive) {
      this.realtimeConnection.unsubscribe(CHANNEL_SPECIAL_EVENTS);
      this.eventsActive = false;
    }

    // Clear shared subscribers to prevent stale references on re-subscribe
    this.sharedSubscribers.clear();
    this.sharedSubscriptionsActive = false;

    // Reset state
    this.isConnected.set(false);
    this.connectionStatus.set('disconnected');
  }
}
