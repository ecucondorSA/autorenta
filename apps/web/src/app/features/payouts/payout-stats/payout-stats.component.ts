import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { PayoutService } from '../../../core/services/payout.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-payout-stats',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rounded-lg border border-gray-200 bg-surface-raised p-6 shadow-sm">
      <h3 class="mb-4 text-lg font-semibold text-gray-900">Estadísticas de Payouts</h3>

      @if (loading()) {
        <div class="flex items-center justify-center py-8">
          <div
            class="h-6 w-6 animate-spin rounded-full border-2 border-cta-default border-t-transparent"
          ></div>
        </div>
      } @else if (stats(); as s) {
        <div class="grid grid-cols-2 gap-4 md:grid-cols-3">
          <div class="rounded-lg bg-cta-default/10 p-4">
            <p class="text-sm font-medium text-cta-default">Total Payouts</p>
            <p class="text-2xl font-bold text-cta-default">{{ s.totalPayouts }}</p>
          </div>
          <div class="rounded-lg bg-success-light/10 p-4">
            <p class="text-sm font-medium text-success-light">Total Monto</p>
            <p class="text-2xl font-bold text-success-light">
              {{ formatCurrency(s.totalAmount) }}
            </p>
          </div>
          <div class="rounded-lg bg-yellow-50 p-4">
            <p class="text-sm font-medium text-yellow-600">Pendientes</p>
            <p class="text-2xl font-bold text-yellow-900">{{ s.pendingPayouts }}</p>
            <p class="text-xs text-yellow-700">
              {{ formatCurrency(s.pendingAmount) }}
            </p>
          </div>
          <div class="rounded-lg bg-purple-50 p-4">
            <p class="text-sm font-medium text-purple-600">Completados</p>
            <p class="text-2xl font-bold text-purple-900">{{ s.completedPayouts }}</p>
            <p class="text-xs text-purple-700">
              {{ formatCurrency(s.completedAmount) }}
            </p>
          </div>
          <div class="rounded-lg bg-cta-default/10 p-4">
            <p class="text-sm font-medium text-cta-default">Promedio</p>
            <p class="text-2xl font-bold text-cta-default">
              {{ formatCurrency(s.averagePayoutAmount) }}
            </p>
          </div>
        </div>
      } @else {
        <div class="rounded-lg bg-gray-50 p-4 text-center text-sm text-gray-600">
          No hay estadísticas disponibles.
        </div>
      }
    </div>
  `,
})
export class PayoutStatsComponent implements OnInit {
  private readonly payoutService = inject(PayoutService);
  private readonly authService = inject(AuthService);

  readonly stats = signal<{
    totalPayouts: number;
    totalAmount: number;
    pendingPayouts: number;
    pendingAmount: number;
    completedPayouts: number;
    completedAmount: number;
    averagePayoutAmount: number;
  } | null>(null);
  readonly loading = signal(false);

  async ngOnInit(): Promise<void> {
    await this.loadStats();
  }

  async loadStats(): Promise<void> {
    this.loading.set(true);

    try {
      const user = await this.authService.getCurrentUser();
      if (!user) return;

      this.payoutService.getPayoutStats(user.id).subscribe({
        next: (stats) => {
          this.stats.set(stats);
        },
        error: (err) => {
          console.error('Error loading payout stats:', err);
        },
        complete: () => {
          this.loading.set(false);
        },
      });
    } catch (err) {
      console.error('Error loading payout stats:', err);
      this.loading.set(false);
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(amount / 100);
  }
}
