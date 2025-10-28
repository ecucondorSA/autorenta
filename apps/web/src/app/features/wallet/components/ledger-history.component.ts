import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  WalletLedgerService,
  LedgerEntry,
  LedgerKind,
} from '@app/core/services/wallet-ledger.service';
import { injectSupabase } from '@app/core/services/supabase-client.service';
import { FgoV1_1Service } from '@app/core/services/fgo-v1-1.service';

@Component({
  selector: 'app-ledger-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-4xl mx-auto p-4">
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Historial de Movimientos
        </h1>
        <p class="text-gray-600 dark:text-gray-400">Todos tus movimientos de AutoCréditos</p>
      </div>

      <!-- Filters -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4">
        <div class="flex flex-wrap gap-4">
          <!-- Filter by type -->
          <div class="flex-1 min-w-[200px]">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tipo de movimiento
            </label>
            <select
              [(ngModel)]="selectedKind"
              (change)="onFilterChange()"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option [value]="null">Todos</option>
              <option value="deposit">Depósitos</option>
              <option value="transfer_out">Transferencias enviadas</option>
              <option value="transfer_in">Transferencias recibidas</option>
              <option value="rental_charge">Cargos por alquiler</option>
              <option value="rental_payment">Pagos recibidos</option>
              <option value="refund">Reembolsos</option>
              <option value="withdrawal">Retiros</option>
              <option value="bonus">Bonificaciones</option>
              <option value="fee">Comisiones</option>
            </select>
          </div>

          <!-- Refresh button -->
          <div class="flex items-end">
            <button
              (click)="refreshHistory()"
              [disabled]="loading()"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700
                     disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ loading() ? 'Cargando...' : 'Actualizar' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Error message -->
      @if (error()) {
        <div
          class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800
                    rounded-lg p-4 mb-4"
        >
          <p class="text-red-800 dark:text-red-200">{{ error() }}</p>
        </div>
      }

      <!-- Loading state -->
      @if (loading() && filteredHistory().length === 0) {
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
          <div
            class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"
          ></div>
          <p class="text-gray-600 dark:text-gray-400">Cargando historial...</p>
        </div>
      }

      <!-- Empty state -->
      @else if (filteredHistory().length === 0) {
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
          <div class="text-6xl mb-4">📋</div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No hay movimientos
          </h3>
          <p class="text-gray-600 dark:text-gray-400">
            {{
              selectedKind
                ? 'No hay movimientos de este tipo'
                : 'Aún no tienes movimientos en tu wallet'
            }}
          </p>
        </div>
      }

      <!-- History list -->
      @else {
        <div class="space-y-3">
          @for (entry of filteredHistory(); track entry.id) {
            <div
              class="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <div class="p-4">
                <div class="flex items-start justify-between">
                  <!-- Left: Icon + Details -->
                  <div class="flex items-start space-x-3 flex-1">
                    <!-- Icon -->
                    <div class="text-3xl mt-1">
                      {{ ledgerService.getKindIcon(entry.kind) }}
                    </div>

                    <!-- Details -->
                    <div class="flex-1 min-w-0">
                      <!-- Type label -->
                      <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                        {{ ledgerService.getKindLabel(entry.kind) }}
                      </h3>

                      <!-- Description from meta -->
                      @if (entry.meta && entry.meta['description']) {
                        <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          {{ entry.meta['description'] }}
                        </p>
                      }

                      <!-- Reference -->
                      <p class="text-xs text-gray-500 dark:text-gray-500 font-mono">
                        Ref: {{ entry.ref }}
                      </p>

                      <!-- Booking info if available -->
                      @if (entry.booking_id) {
                        <p class="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          Reserva: {{ entry.booking_id.substring(0, 8) }}...
                          @if (entry.booking_status) {
                            <span class="ml-1 px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">
                              {{ entry.booking_status }}
                            </span>
                          }
                        </p>
                      }

                      <!-- Date -->
                      <p class="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {{ formatDate(entry.ts) }}
                      </p>

                      <!-- 🆕 FGO v1.1: Aporte FGO (solo para depósitos) -->
                      @if (entry.kind === 'deposit') {
                        <div
                          class="mt-2 inline-flex items-center px-2 py-1 bg-green-50 dark:bg-green-900/20
                                    border border-green-200 dark:border-green-800 rounded text-xs"
                        >
                          <span class="mr-1">🛡️</span>
                          <span class="text-green-800 dark:text-green-200 font-medium">
                            Aporte FGO: {{ formatFgoContribution(entry) }}
                          </span>
                        </div>
                      }
                    </div>
                  </div>

                  <!-- Right: Amount -->
                  <div class="text-right ml-4">
                    <p class="text-lg font-bold" [ngClass]="ledgerService.getKindColor(entry.kind)">
                      {{ formatBalanceChange(entry.balance_change_cents) }}
                    </p>
                    <p class="text-xs text-gray-500 dark:text-gray-500">
                      {{ ledgerService.formatAmount(entry.amount_cents) }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Load more button -->
        @if (canLoadMore()) {
          <div class="mt-6 text-center">
            <button
              (click)="loadMore()"
              [disabled]="loading()"
              class="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                     text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700
                     disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ loading() ? 'Cargando...' : 'Cargar más' }}
            </button>
          </div>
        }
      }
    </div>
  `,
  styles: [],
})
export class LedgerHistoryComponent implements OnInit, OnDestroy {
  readonly ledgerService = inject(WalletLedgerService);
  private readonly supabase = injectSupabase();
  private readonly fgoService = inject(FgoV1_1Service); // 🆕 FGO v1.1

  // State
  readonly loading = this.ledgerService.loading;
  readonly error = this.ledgerService.error;
  readonly ledgerHistory = this.ledgerService.ledgerHistory;

  // Filters
  selectedKind: LedgerKind | null = null;

  // Filtered history
  readonly filteredHistory = computed(() => {
    const history = this.ledgerHistory();
    const kind = this.selectedKind;

    if (!kind) {
      return history;
    }

    return history.filter((entry) => entry.kind === kind);
  });

  // Pagination
  private currentLimit = 50;
  readonly canLoadMore = signal(true);

  // Realtime subscription cleanup
  private unsubscribe?: () => void;

  async ngOnInit(): Promise<void> {
    await this.loadInitialHistory();
    this.setupRealtimeSubscription();
  }

  ngOnDestroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  private async loadInitialHistory(): Promise<void> {
    try {
      const entries = await this.ledgerService.loadLedgerHistory(this.currentLimit);
      this.canLoadMore.set(entries.length >= this.currentLimit);
    } catch (err) {
    }
  }

  async refreshHistory(): Promise<void> {
    try {
      const entries = await this.ledgerService.loadLedgerHistory(this.currentLimit);
      this.canLoadMore.set(entries.length >= this.currentLimit);
    } catch (err) {
    }
  }

  async loadMore(): Promise<void> {
    this.currentLimit += 50;
    await this.refreshHistory();
  }

  onFilterChange(): void {
    // Filter happens reactively via computed signal
  }

  private async setupRealtimeSubscription(): Promise<void> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) return;

    this.unsubscribe = this.ledgerService.subscribeToLedgerChanges(user.id, () => {
      void this.refreshHistory();
    });
  }

  formatDate(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;

    return date.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatBalanceChange(cents: number): string {
    const sign = cents >= 0 ? '+' : '';
    return `${sign}${this.ledgerService.formatAmount(cents)}`;
  }

  /**
   * 🆕 FGO v1.1: Formatea el aporte FGO de un depósito
   *
   * Calcula el aporte al FGO basado en el alpha actual.
   * Por ahora usa alpha hardcoded (15%), pero en futuras versiones
   * se puede obtener dinámicamente del FgoV1_1Service.
   *
   * @param entry - Entrada del ledger (debe ser un depósito)
   * @returns String formateado con el aporte FGO
   */
  formatFgoContribution(entry: LedgerEntry): string {
    if (entry.kind !== 'deposit') return '-';

    // TODO: Obtener alpha dinámicamente desde FgoService
    // const params = await this.fgoService.getParameters('AR', 'default');
    // const alpha = params.alpha;

    // Por ahora, usar alpha hardcoded (15%)
    const alpha = 0.15;

    // Calcular aporte al FGO (alpha% del depósito)
    const contributionCents = Math.round(entry.amount_cents * alpha);
    const contributionUsd = contributionCents / 100;

    return `USD $${contributionUsd.toFixed(2)} (${alpha * 100}%)`;
  }
}
