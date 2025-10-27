import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { injectSupabase } from '@app/core/services/supabase-client.service';

interface CoverageFund {
  id: string;
  balance_cents: number;
  created_at: string;
  updated_at: string;
  meta: Record<string, unknown>;
}

interface FundStats {
  total_franchises_collected: number;
  total_franchises_disbursed: number;
  total_ledger_entries: number;
  avg_franchise_amount: number;
}

@Component({
  selector: 'app-coverage-fund-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="max-w-6xl mx-auto p-6">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">📊 Fondo de Cobertura</h1>
        <p class="text-gray-600 dark:text-gray-400">
          Administración del fondo de franquicias para incidentes
        </p>
      </div>

      <!-- Loading State -->
      @if (loading()) {
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
          <div
            class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"
          ></div>
          <p class="text-gray-600 dark:text-gray-400">Cargando datos del fondo...</p>
        </div>
      }

      <!-- Error State -->
      @else if (error()) {
        <div
          class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6"
        >
          <h3 class="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Error</h3>
          <p class="text-red-700 dark:text-red-300">{{ error() }}</p>
          <button
            (click)="loadFundData()"
            class="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      }

      <!-- Dashboard Content -->
      @else if (fund()) {
        <div class="space-y-6">
          <!-- Main Balance Card -->
          <div
            class="bg-gradient-to-r from-green-600 to-green-700 rounded-lg shadow-lg p-8 text-white"
          >
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm opacity-90 mb-2">Balance del Fondo</p>
                <p class="text-5xl font-bold">
                  {{ formatAmount(fund()!.balance_cents) }}
                </p>
                <p class="text-sm opacity-75 mt-2">= {{ fund()!.balance_cents }} centavos</p>
              </div>
              <div class="text-6xl opacity-80">🛡️</div>
            </div>

            <div class="mt-6 pt-6 border-t border-green-500/30">
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p class="opacity-75">Última actualización</p>
                  <p class="font-medium">{{ formatDate(fund()!.updated_at) }}</p>
                </div>
                <div>
                  <p class="opacity-75">Creado</p>
                  <p class="font-medium">{{ formatDate(fund()!.created_at) }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Statistics Cards -->
          @if (stats()) {
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <!-- Total Collected -->
              <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div class="flex items-center justify-between mb-2">
                  <p class="text-sm text-gray-600 dark:text-gray-400">Total Recaudado</p>
                  <span class="text-2xl">📥</span>
                </div>
                <p class="text-2xl font-bold text-gray-900 dark:text-white">
                  {{ stats()!.total_franchises_collected }}
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-500 mt-1">franquicias cobradas</p>
              </div>

              <!-- Total Disbursed -->
              <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div class="flex items-center justify-between mb-2">
                  <p class="text-sm text-gray-600 dark:text-gray-400">Total Desembolsado</p>
                  <span class="text-2xl">📤</span>
                </div>
                <p class="text-2xl font-bold text-gray-900 dark:text-white">
                  {{ stats()!.total_franchises_disbursed }}
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-500 mt-1">franquicias pagadas</p>
              </div>

              <!-- Total Entries -->
              <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div class="flex items-center justify-between mb-2">
                  <p class="text-sm text-gray-600 dark:text-gray-400">Entradas en Ledger</p>
                  <span class="text-2xl">📝</span>
                </div>
                <p class="text-2xl font-bold text-gray-900 dark:text-white">
                  {{ stats()!.total_ledger_entries }}
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-500 mt-1">movimientos totales</p>
              </div>

              <!-- Average Amount -->
              <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div class="flex items-center justify-between mb-2">
                  <p class="text-sm text-gray-600 dark:text-gray-400">Promedio Franquicia</p>
                  <span class="text-2xl">💰</span>
                </div>
                <p class="text-2xl font-bold text-gray-900 dark:text-white">
                  {{ formatAmount(stats()!.avg_franchise_amount) }}
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-500 mt-1">por incidente</p>
              </div>
            </div>
          }

          <!-- Fund Metadata -->
          @if (fund()!.meta && Object.keys(fund()!.meta).length > 0) {
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                  Metadata del Fondo
                </h2>
              </div>
              <div class="p-6">
                <pre class="bg-gray-100 dark:bg-gray-900 rounded p-4 text-sm overflow-x-auto">{{
                  JSON.stringify(fund()!.meta, null, 2)
                }}</pre>
              </div>
            </div>
          }

          <!-- Recent Activity -->
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div
              class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between"
            >
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                Actividad Reciente
              </h2>
              <button
                (click)="loadRecentActivity()"
                [disabled]="loadingActivity()"
                class="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
              >
                {{ loadingActivity() ? 'Cargando...' : 'Actualizar' }}
              </button>
            </div>

            @if (loadingActivity()) {
              <div class="p-8 text-center">
                <div
                  class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"
                ></div>
              </div>

            } @else if (recentActivity().length === 0) {
              <div class="p-8 text-center">
                <p class="text-gray-500 dark:text-gray-400">No hay actividad reciente</p>
              </div>

            } @else {
              <div class="divide-y divide-gray-200 dark:divide-gray-700">
                @for (entry of recentActivity(); track entry.id) {
                  <div class="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div class="flex items-start justify-between">
                      <div class="flex items-start space-x-3">
                        <span class="text-2xl">
                          {{ entry.kind === 'franchise_fund' ? '📥' : '📤' }}
                        </span>
                        <div>
                          <p class="font-medium text-gray-900 dark:text-white">
                            {{ getKindLabel(entry.kind) }}
                          </p>
                          @if (entry.meta?.['description']) {
                            <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {{ entry.meta['description'] }}
                            </p>
                          }
                          <div class="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <span>Ref: {{ entry.ref }}</span>
                            @if (entry.booking_id) {
                              <span>Reserva: {{ entry.booking_id.substring(0, 8) }}...</span>
                            }
                            <span>{{ formatDate(entry.ts) }}</span>
                          </div>
                        </div>
                      </div>
                      <div class="text-right">
                        <p
                          class="text-lg font-bold"
                          [class.text-green-600]="entry.kind === 'franchise_fund'"
                          [class.text-red-600]="entry.kind === 'franchise_user'"
                        >
                          {{ entry.kind === 'franchise_fund' ? '+' : '-'
                          }}{{ formatAmount(entry.amount_cents) }}
                        </p>
                      </div>
                    </div>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Action Buttons (Admin Only) -->
          <div
            class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6"
          >
            <h3 class="text-lg font-semibold text-yellow-900 dark:text-yellow-100 mb-4">
              ⚠️ Acciones Administrativas
            </h3>
            <div class="flex flex-wrap gap-3">
              <button
                (click)="refreshAll()"
                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700
                       disabled:opacity-50 disabled:cursor-not-allowed"
                [disabled]="loading()"
              >
                🔄 Actualizar Todo
              </button>

              <button
                class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                disabled
                title="Próximamente: Ajustar balance manualmente"
              >
                ⚙️ Ajustar Balance
              </button>

              <button
                class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                disabled
                title="Próximamente: Exportar reporte completo"
              >
                📥 Exportar Reporte
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [],
})
export class CoverageFundDashboardComponent implements OnInit {
  private readonly supabase = injectSupabase();

  // State
  readonly loading = signal(false);
  readonly loadingActivity = signal(false);
  readonly error = signal<string | null>(null);

  // Data
  readonly fund = signal<CoverageFund | null>(null);
  readonly stats = signal<FundStats | null>(null);
  readonly recentActivity = signal<any[]>([]);

  // Expose JSON for template
  JSON = JSON;
  Object = Object;

  async ngOnInit(): Promise<void> {
    await this.loadFundData();
    await this.loadRecentActivity();
  }

  async loadFundData(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      // Load coverage fund
      const { data: fundData, error: fundError } = await this.supabase
        .from('coverage_fund')
        .select('*')
        .single();

      if (fundError) throw fundError;

      this.fund.set(fundData as CoverageFund);

      // Load statistics
      await this.loadStats();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al cargar datos del fondo';
      this.error.set(errorMsg);
      console.error('Error loading fund data:', err);
    } finally {
      this.loading.set(false);
    }
  }

  async loadStats(): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('wallet_ledger')
        .select('kind, amount_cents')
        .in('kind', ['franchise_user', 'franchise_fund']);

      if (error) throw error;

      const entries = data || [];

      const collected = entries.filter((e) => e.kind === 'franchise_fund');
      const disbursed = entries.filter((e) => e.kind === 'franchise_user');

      const avgAmount =
        collected.length > 0
          ? Math.round(collected.reduce((sum, e) => sum + e.amount_cents, 0) / collected.length)
          : 0;

      this.stats.set({
        total_franchises_collected: collected.length,
        total_franchises_disbursed: disbursed.length,
        total_ledger_entries: entries.length,
        avg_franchise_amount: avgAmount,
      });
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  }

  async loadRecentActivity(): Promise<void> {
    this.loadingActivity.set(true);

    try {
      const { data, error } = await this.supabase
        .from('wallet_ledger')
        .select('*')
        .in('kind', ['franchise_user', 'franchise_fund'])
        .order('ts', { ascending: false })
        .limit(20);

      if (error) throw error;

      this.recentActivity.set(data || []);
    } catch (err) {
      console.error('Error loading recent activity:', err);
    } finally {
      this.loadingActivity.set(false);
    }
  }

  async refreshAll(): Promise<void> {
    await Promise.all([this.loadFundData(), this.loadRecentActivity()]);
  }

  formatAmount(cents: number): string {
    const amount = cents / 100;
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  formatDate(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getKindLabel(kind: string): string {
    const labels: Record<string, string> = {
      franchise_user: 'Franquicia cobrada a usuario',
      franchise_fund: 'Franquicia depositada al fondo',
    };
    return labels[kind] || kind;
  }
}
