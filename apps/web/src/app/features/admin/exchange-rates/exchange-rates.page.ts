import { CommonModule } from '@angular/common';
import {Component, computed, OnDestroy, OnInit, signal,
  ChangeDetectionStrategy} from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';

interface ExchangeRate {
  id: string;
  pair: string;
  source: string;
  binance_rate: number;
  rate: number;
  margin_percent: number;
  margin_absolute: number;
  volatility_24h: number | null;
  last_updated: string;
  created_at: string;
  is_active: boolean;
}

interface ExchangeRateStats {
  total_pairs: number;
  active_pairs: number;
  outdated_pairs: number;
  avg_margin_percent: number;
  highest_volatility: number;
  last_sync: string | null;
}

@Component({
  selector: 'app-exchange-rates',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './exchange-rates.page.html',
  styleUrls: ['./exchange-rates.page.css'],
})
export class ExchangeRatesPage implements OnInit, OnDestroy {
  private pollInterval?: ReturnType<typeof setInterval>;
  // Signals
  readonly rates = signal<ExchangeRate[]>([]);
  readonly stats = signal<ExchangeRateStats>({
    total_pairs: 0,
    active_pairs: 0,
    outdated_pairs: 0,
    avg_margin_percent: 0,
    highest_volatility: 0,
    last_sync: null,
  });

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly selectedPair = signal<string | null>(null);
  readonly rateHistory = signal<ExchangeRate[]>([]);

  // Computed
  readonly sortedRates = computed(() => {
    return [...this.rates()].sort((a, b) => {
      // Sort by pair name
      return a.pair.localeCompare(b.pair);
    });
  });

  constructor(
    private supabase: SupabaseClientService,
    private router: Router,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadData();

    // Auto-refresh every 60 seconds
    // Auto-refresh every 60 seconds
    this.pollInterval = setInterval(() => {
      this.loadData();
    }, 60000);
  }

  ngOnDestroy(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  async loadData(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      await Promise.all([this.loadCurrentRates(), this.calculateStats()]);
    } catch (err) {
      console.error('Error loading exchange rates:', err);
      this.error.set('Error al cargar tipos de cambio');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadCurrentRates(): Promise<void> {
    const { data, error } = await this.supabase
      .getClient()
      .from('exchange_rates')
      .select('*')
      .eq('is_active', true)
      .order('pair', { ascending: true });

    if (error) {
      console.error('Error fetching exchange rates:', error);
      throw error;
    }

    this.rates.set((data as ExchangeRate[]) || []);
  }

  private async calculateStats(): Promise<void> {
    const rates = this.rates();
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const outdatedRates = rates.filter((r) => {
      const lastUpdate = new Date(r.last_updated);
      return lastUpdate < oneHourAgo;
    });

    const avgMargin =
      rates.length > 0 ? rates.reduce((sum, r) => sum + r.margin_percent, 0) / rates.length : 0;

    const highestVolatility = rates.reduce((max, r) => {
      return Math.max(max, r.volatility_24h || 0);
    }, 0);

    const lastSync =
      rates.length > 0
        ? rates.reduce((latest, r) => {
            const rateDate = new Date(r.last_updated);
            const latestDate = latest ? new Date(latest) : new Date(0);
            return rateDate > latestDate ? r.last_updated : latest;
          }, '')
        : null;

    this.stats.set({
      total_pairs: rates.length,
      active_pairs: rates.filter((r) => r.is_active).length,
      outdated_pairs: outdatedRates.length,
      avg_margin_percent: avgMargin,
      highest_volatility: highestVolatility,
      last_sync: lastSync,
    });
  }

  async loadRateHistory(pair: string): Promise<void> {
    this.selectedPair.set(pair);

    try {
      const { data, error } = await this.supabase
        .getClient()
        .from('exchange_rates')
        .select('*')
        .eq('pair', pair)
        .order('created_at', { ascending: false })
        .limit(24); // Last 24 records

      if (error) throw error;

      this.rateHistory.set((data as ExchangeRate[]) || []);
    } catch (err) {
      console.error('Error loading rate history:', err);
    }
  }

  isRateOutdated(rate: ExchangeRate): boolean {
    const now = new Date();
    const lastUpdate = new Date(rate.last_updated);
    const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
    return hoursSinceUpdate > 1;
  }

  getVolatilityClass(volatility: number | null): string {
    if (volatility === null) return 'text-text-secondary';
    if (volatility < 1) return 'text-success-strong';
    if (volatility < 3) return 'text-warning-text';
    if (volatility < 5) return 'text-warning-strong';
    return 'text-error-text';
  }

  getVolatilityLabel(volatility: number | null): string {
    if (volatility === null) return 'N/A';
    if (volatility < 1) return 'Baja';
    if (volatility < 3) return 'Media';
    if (volatility < 5) return 'Alta';
    return 'Muy Alta';
  }

  formatRate(rate: number): string {
    return new Intl.NumberFormat('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(rate);
  }

  formatPercent(percent: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(percent / 100);
  }

  formatDateTime(dateString?: string | null): string {
    if (!dateString) {
      return 'Sin datos';
    }
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  }

  formatRelativeTime(dateString?: string | null): string {
    if (!dateString) {
      return 'Sin sincronizaciones';
    }
    const date = new Date(dateString);
    const now = Date.now();
    const diff = now - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Hace unos segundos';
    if (minutes < 60) return `Hace ${minutes} min`;
    if (hours < 24) return `Hace ${hours} h`;
    return `Hace ${days} días`;
  }

  calculateMarginVisualization(_rate: ExchangeRate): number {
    // Calculate percentage for visual representation (10% margin = 100% of bar)
    return (10 / 10) * 100;
  }

  closeHistoryModal(): void {
    this.selectedPair.set(null);
    this.rateHistory.set([]);
  }

  async triggerManualSync(): Promise<void> {
    if (!confirm('¿Desea forzar una sincronización manual de los tipos de cambio?')) {
      return;
    }

    try {
      this.loading.set(true);

      const client = this.supabase.getClient();
      const { data, error } = await client.functions.invoke('sync-binance-rates', {
        body: {},
      });

      if (error) {
        throw new Error(error.message || 'Error al sincronizar tipos de cambio');
      }

      const result = data as { success: boolean; message?: string };

      if (result.success) {
        alert(`✅ Sincronización exitosa\n\n${result.message}`);
        await this.loadData();
      } else {
        alert(`❌ Error en sincronización\n\n${result.message || 'Error desconocido'}`);
      }
    } catch (err) {
      console.error('Error triggering manual sync:', err);
      alert('Error al ejecutar sincronización manual');
    } finally {
      this.loading.set(false);
    }
  }

  goBack(): void {
    this.router.navigate(['/admin']);
  }
}
