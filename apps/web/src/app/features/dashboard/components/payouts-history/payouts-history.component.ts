import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { PayoutService, Payout } from '../../../../core/services/payout.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-payouts-history',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-4">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-text-inverse">Historial de Ingresos</h3>
        <button
          (click)="loadPayouts()"
          [disabled]="loading()"
          class="text-sm px-4 py-2 bg-cta-default text-cta-text rounded-lg hover:bg-cta-default disabled:opacity-50 transition-colors"
        >
          {{ loading() ? 'Cargando...' : 'Actualizar' }}
        </button>
      </div>

      <!-- Loading State -->
      @if (loading()) {
        <div class="flex items-center justify-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-cta-default"></div>
        </div>
      }

      <!-- Error State -->
      @if (error() && !loading()) {
        <div
          class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
        >
          <p class="text-red-800 dark:text-red-200">{{ error() }}</p>
        </div>
      }

      <!-- Empty State -->
      @if (!loading() && !error() && payouts().length === 0) {
        <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center">
          <svg
            class="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-text-inverse">
            No hay ingresos registrados
          </h3>
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-300">
            Tus ingresos por bookings completados aparecerán aquí.
          </p>
        </div>
      }

      <!-- Payouts List -->
      @if (!loading() && !error() && payouts().length > 0) {
        <div class="space-y-3">
          @for (payout of payouts(); track payout.id) {
            <div
              class="bg-surface-raised dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-2">
                    <span
                      class="px-2 py-1 rounded-full text-xs font-medium"
                      [class.bg-yellow-100]="payout.status === 'pending'"
                      [class.text-yellow-800]="payout.status === 'pending'"
                      [class.bg-cta-default/20]="payout.status === 'processing'"
                      [class.text-cta-default]="payout.status === 'processing'"
                      [class.bg-success-light/20]="payout.status === 'completed'"
                      [class.text-success-light]="payout.status === 'completed'"
                      [class.bg-red-100]="payout.status === 'failed'"
                      [class.text-red-800]="payout.status === 'failed'"
                      [class.bg-gray-100]="payout.status === 'cancelled'"
                      [class.text-gray-800]="payout.status === 'cancelled'"
                    >
                      {{ getStatusLabel(payout.status) }}
                    </span>
                    <span class="text-xs text-gray-500 dark:text-gray-400">
                      {{ formatDate(payout.createdAt) }}
                    </span>
                  </div>
                  <div class="mb-2">
                    <p class="text-2xl font-bold text-gray-900 dark:text-text-inverse">
                      {{ formatCurrency(payout.amount, payout.currency) }}
                    </p>
                    @if (payout.splitId) {
                      <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Split ID: {{ payout.splitId }}
                      </p>
                    }
                  </div>
                  @if (payout.providerPayoutId) {
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                      ID Transacción: {{ payout.providerPayoutId }}
                    </p>
                  }
                  @if (payout.failureReason) {
                    <p class="text-xs text-red-600 dark:text-red-400 mt-2">
                      Razón: {{ payout.failureReason }}
                    </p>
                  }
                  @if (payout.completedAt) {
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Completado: {{ formatDate(payout.completedAt) }}
                    </p>
                  }
                </div>
                <div class="flex flex-col items-end gap-2">
                  @if (payout.status === 'completed') {
                    <button
                      (click)="downloadReceipt(payout)"
                      class="text-xs px-3 py-1 bg-cta-default text-cta-text rounded-lg hover:bg-cta-default transition-colors"
                    >
                      Descargar
                    </button>
                  }
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Load More Button -->
        @if (hasMore()) {
          <div class="mt-4 flex justify-center">
            <button
              (click)="loadMore()"
              [disabled]="loadingMore()"
              class="px-6 py-2 bg-cta-default text-cta-text rounded-lg hover:bg-cta-default disabled:opacity-50 transition-colors"
            >
              {{ loadingMore() ? 'Cargando...' : 'Cargar más' }}
            </button>
          </div>
        }

        <!-- Pagination Info -->
        <div class="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
          Mostrando {{ payouts().length }} de {{ totalCount() }} ingresos
        </div>

        <!-- Summary Stats -->
        <div class="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-cta-default/10 dark:bg-cta-default/20 rounded-lg p-4">
            <p class="text-sm text-cta-default dark:text-cta-default mb-1">Total Ingresos</p>
            <p class="text-2xl font-bold text-cta-default dark:text-cta-default">
              {{ formatCurrency(totalAmount(), 'ARS') }}
            </p>
          </div>
          <div class="bg-success-light/10 dark:bg-success-light/20 rounded-lg p-4">
            <p class="text-sm text-success-light dark:text-success-light mb-1">Completados</p>
            <p class="text-2xl font-bold text-success-light dark:text-success-light">
              {{ completedCount() }}
            </p>
          </div>
          <div class="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
            <p class="text-sm text-yellow-600 dark:text-yellow-400 mb-1">Pendientes</p>
            <p class="text-2xl font-bold text-yellow-900 dark:text-yellow-200">
              {{ pendingCount() }}
            </p>
          </div>
        </div>
      }
    </div>
  `,
})
export class PayoutsHistoryComponent implements OnInit {
  private readonly payoutService = inject(PayoutService);
  private readonly authService = inject(AuthService);

  readonly payouts = signal<Payout[]>([]);
  readonly loading = signal(false);
  readonly loadingMore = signal(false);
  readonly error = signal<string | null>(null);

  readonly totalAmount = signal(0);
  readonly completedCount = signal(0);
  readonly pendingCount = signal(0);
  readonly totalCount = signal(0);
  readonly hasMore = signal(false);

  // Pagination state
  private readonly PAGE_SIZE = 10;
  private currentOffset = 0;

  async ngOnInit(): Promise<void> {
    await this.loadPayouts();
  }

  async loadPayouts(reset: boolean = true): Promise<void> {
    if (reset) {
      this.currentOffset = 0;
      this.payouts.set([]);
    }

    this.loading.set(reset);
    this.loadingMore.set(!reset);
    this.error.set(null);

    try {
      const user = this.authService.session$()?.user;
      if (!user?.id) {
        throw new Error('Usuario no autenticado');
      }

      const result = await firstValueFrom(
        this.payoutService.getUserPayoutsPaginated(user.id, this.PAGE_SIZE, this.currentOffset),
      );

      // Append or replace payouts
      if (reset) {
        this.payouts.set(result.data);
      } else {
        this.payouts.set([...this.payouts(), ...result.data]);
      }

      this.hasMore.set(result.hasMore);
      this.totalCount.set(result.total);

      // Calculate stats from all payouts loaded so far
      const allPayouts = this.payouts();
      const total = allPayouts.reduce((sum, p) => sum + p.amount, 0);
      const completed = allPayouts.filter((p) => p.status === 'completed').length;
      const pending = allPayouts.filter(
        (p) => p.status === 'pending' || p.status === 'processing',
      ).length;

      this.totalAmount.set(total);
      this.completedCount.set(completed);
      this.pendingCount.set(pending);

      // Update offset for next page
      this.currentOffset += this.PAGE_SIZE;
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Error al cargar historial de ingresos');
    } finally {
      this.loading.set(false);
      this.loadingMore.set(false);
    }
  }

  async loadMore(): Promise<void> {
    if (!this.hasMore() || this.loadingMore()) {
      return;
    }
    await this.loadPayouts(false);
  }

  getStatusLabel(status: Payout['status']): string {
    const labels: Record<Payout['status'], string> = {
      pending: 'Pendiente',
      processing: 'Procesando',
      completed: 'Completado',
      failed: 'Fallido',
      cancelled: 'Cancelado',
    };
    return labels[status] || status;
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  downloadReceipt(payout: Payout): void {
    // TODO: Implementar descarga de comprobante PDF
    console.log('Descargar comprobante para payout:', payout.id);
    // Por ahora solo mostramos un mensaje
    alert('Funcionalidad de descarga de comprobante próximamente disponible');
  }
}
