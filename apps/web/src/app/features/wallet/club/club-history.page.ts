import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import {
  SubscriptionUsageLogWithDetails,
  SUBSCRIPTION_TIERS,
  SUBSCRIPTION_STATUS_LABELS,
} from '@core/models/subscription.model';
import { SubscriptionService } from '@core/services/subscriptions/subscription.service';

@Component({
  selector: 'app-club-history',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonicModule],
  template: `
    <div class="min-h-screen bg-surface-base py-6 px-4">
      <div class="max-w-2xl mx-auto space-y-6">
        <!-- Header -->
        <div class="flex items-center gap-4">
          <button (click)="goBack()" class="p-2 rounded-lg hover:bg-surface-raised transition">
            <ion-icon name="arrow-back" class="text-xl text-text-primary"></ion-icon>
          </button>
          <div>
            <h1 class="text-xl font-bold text-text-primary">Historial de Cobertura</h1>
            <p class="text-sm text-text-secondary">Uso de tu membresia Autorentar Club</p>
          </div>
        </div>

        <!-- Subscription summary -->
        @if (subscription(); as sub) {
          <div [class]="getCardClass(sub.tier)" class="rounded-2xl p-5 space-y-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <ion-icon name="shield-checkmark" class="text-xl text-white"></ion-icon>
                </div>
                <div>
                  <h3 class="font-bold text-white">{{ getTierName(sub.tier) }}</h3>
                  <p class="text-xs text-white/70">
                    {{ SUBSCRIPTION_STATUS_LABELS[sub.status] }}
                  </p>
                </div>
              </div>
              <div
                [class]="getStatusBadgeClass(sub.status)"
                class="px-3 py-1 rounded-full text-xs font-semibold"
              >
                {{ SUBSCRIPTION_STATUS_LABELS[sub.status] }}
              </div>
            </div>

            <!-- Balance bar -->
            <div class="space-y-2">
              <div class="flex justify-between text-sm text-white">
                <span>Saldo disponible</span>
                <span class="font-bold"
                  >\${{ sub.remaining_balance_usd }} / \${{ sub.coverage_limit_usd }} USD</span
                >
              </div>
              <div class="h-3 bg-white/20 rounded-full overflow-hidden">
                <div
                  class="h-full bg-white transition-all duration-500 rounded-full"
                  [style.width.%]="getBalancePercent(sub)"
                ></div>
              </div>
            </div>

            <!-- Dates -->
            <div class="flex justify-between text-xs text-white/70">
              <span>Activa desde {{ sub.starts_at | date: 'dd MMM yyyy' }}</span>
              <span>Vence {{ sub.expires_at | date: 'dd MMM yyyy' }}</span>
            </div>
          </div>
        } @else {
          <!-- No subscription -->
          <div
            class="rounded-2xl border-2 border-dashed border-amber-500/50 bg-amber-500/5 p-8 text-center"
          >
            <ion-icon name="shield-outline" class="text-5xl text-amber-500/50"></ion-icon>
            <h3 class="mt-4 font-bold text-text-primary">Sin membresia activa</h3>
            <p class="text-sm text-text-secondary mt-2">
              Unete al Autorentar Club para alquilar sin deposito de garantia.
            </p>
            <button
              (click)="goToPlans()"
              class="mt-4 px-6 py-2 rounded-lg bg-amber-500 text-black font-semibold hover:bg-amber-400 transition"
            >
              Ver planes
            </button>
          </div>
        }

        <!-- Usage history -->
        <div class="space-y-4">
          <h2 class="font-bold text-text-primary">Historial de uso</h2>

          @if (loading()) {
            <div class="flex justify-center py-8">
              <ion-spinner name="crescent" class="text-cta-default"></ion-spinner>
            </div>
          } @else if (usageLogs().length === 0) {
            <div class="rounded-xl border border-border-default bg-surface-raised p-8 text-center">
              <ion-icon name="time-outline" class="text-4xl text-text-muted"></ion-icon>
              <p class="text-text-secondary mt-2">No hay movimientos registrados</p>
              <p class="text-xs text-text-muted mt-1">Los usos de tu cobertura apareceran aqui</p>
            </div>
          } @else {
            <div class="space-y-3">
              @for (log of usageLogs(); track log.id) {
                <div class="rounded-xl border border-border-default bg-surface-raised p-4">
                  <div class="flex items-start justify-between">
                    <div class="flex items-start gap-3">
                      <div
                        [class]="getLogIconClass(log.reason)"
                        class="w-10 h-10 rounded-full flex items-center justify-center"
                      >
                        <ion-icon [name]="getLogIcon(log.reason)" class="text-lg"></ion-icon>
                      </div>
                      <div>
                        <p class="font-medium text-text-primary">{{ getLogTitle(log.reason) }}</p>
                        <p class="text-sm text-text-secondary">{{ log.description }}</p>
                        <p class="text-xs text-text-muted mt-1">
                          {{ log.created_at | date: 'dd MMM yyyy, HH:mm' }}
                        </p>
                      </div>
                    </div>
                    <div class="text-right">
                      <p
                        [class]="
                          log.reason === 'refund' ? 'text-success-strong' : 'text-error-strong'
                        "
                        class="font-bold"
                      >
                        {{ log.reason === 'refund' ? '+' : '-' }}\${{ log.amount_deducted_usd }}
                      </p>
                      <p class="text-xs text-text-muted">Saldo: \${{ log.balance_after_usd }}</p>
                    </div>
                  </div>

                  @if (log.booking_id) {
                    <button
                      (click)="viewBooking(log.booking_id)"
                      class="mt-3 text-xs text-cta-default hover:underline flex items-center gap-1"
                    >
                      <ion-icon name="car-outline"></ion-icon>
                      Ver reserva asociada
                    </button>
                  }
                </div>
              }
            </div>
          }
        </div>

        <!-- Actions -->
        @if (subscription()?.status === 'depleted') {
          <div class="rounded-xl border border-warning-border bg-warning-bg p-4">
            <div class="flex items-start gap-3">
              <ion-icon name="warning" class="text-xl text-warning-strong mt-0.5"></ion-icon>
              <div class="flex-1">
                <p class="font-medium text-warning-strong">Saldo de cobertura agotado</p>
                <p class="text-sm text-warning-strong/80 mt-1">
                  Tu saldo se ha agotado. Renueva tu membresia para seguir disfrutando de alquileres
                  sin deposito.
                </p>
                <button
                  (click)="goToPlans()"
                  class="mt-3 px-4 py-2 rounded-lg bg-warning-strong text-white font-semibold text-sm hover:bg-warning-700 transition"
                >
                  Renovar membresia
                </button>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class ClubHistoryPage implements OnInit {
  private readonly router = inject(Router);
  private readonly subscriptionService = inject(SubscriptionService);

  readonly loading = signal(false);
  readonly usageLogs = signal<
    (SubscriptionUsageLogWithDetails & { amount_deducted_usd: number; balance_after_usd: number })[]
  >([]);
  readonly subscription = this.subscriptionService.subscription;
  readonly SUBSCRIPTION_STATUS_LABELS = SUBSCRIPTION_STATUS_LABELS;

  ngOnInit(): void {
    void this.loadHistory();
  }

  async loadHistory(): Promise<void> {
    this.loading.set(true);
    try {
      const logs = await this.subscriptionService.getUsageHistory();
      // Map cents to USD for display
      const logsWithUsd = logs.map((log) => ({
        ...log,
        amount_deducted_usd: log.amount_deducted_cents / 100,
        balance_after_usd: log.balance_after_cents / 100,
      }));
      this.usageLogs.set(logsWithUsd);
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      this.loading.set(false);
    }
  }

  getTierName(tier: string): string {
    return SUBSCRIPTION_TIERS[tier as keyof typeof SUBSCRIPTION_TIERS]?.name ?? tier;
  }

  getCardClass(tier: string): string {
    if (tier === 'club_black') {
      return 'bg-gradient-to-br from-gray-900 to-gray-800';
    }
    return 'bg-gradient-to-br from-amber-500 to-amber-600';
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-300';
      case 'depleted':
        return 'bg-red-500/20 text-red-300';
      case 'expired':
        return 'bg-gray-500/20 text-gray-300';
      default:
        return 'bg-white/20 text-white';
    }
  }

  getBalancePercent(sub: {
    remaining_balance_cents: number;
    coverage_limit_cents: number;
  }): number {
    if (sub.coverage_limit_cents === 0) return 0;
    return Math.round((sub.remaining_balance_cents / sub.coverage_limit_cents) * 100);
  }

  getLogIcon(reason: string): string {
    switch (reason) {
      case 'claim_deduction':
        return 'alert-circle';
      case 'admin_adjustment':
        return 'construct';
      case 'refund':
        return 'arrow-undo';
      default:
        return 'remove-circle';
    }
  }

  getLogIconClass(reason: string): string {
    switch (reason) {
      case 'claim_deduction':
        return 'bg-error-bg text-error-strong';
      case 'admin_adjustment':
        return 'bg-warning-bg text-warning-strong';
      case 'refund':
        return 'bg-success-bg text-success-strong';
      default:
        return 'bg-surface-secondary text-text-secondary';
    }
  }

  getLogTitle(reason: string): string {
    switch (reason) {
      case 'claim_deduction':
        return 'Deduccion por dano';
      case 'admin_adjustment':
        return 'Ajuste administrativo';
      case 'refund':
        return 'Reembolso';
      default:
        return 'Movimiento';
    }
  }

  viewBooking(bookingId: string): void {
    void this.router.navigate(['/bookings', bookingId]);
  }

  goToPlans(): void {
    void this.router.navigate(['/wallet/club/plans']);
  }

  goBack(): void {
    void this.router.navigate(['/wallet']);
  }
}
