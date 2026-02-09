import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  inject,
  computed,
  ChangeDetectionStrategy,
  input,
  output,
} from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { SubscriptionService } from '@core/services/subscriptions/subscription.service';
import { SUBSCRIPTION_STATUS_LABELS, type SubscriptionTier } from '@core/models/subscription.model';

@Component({
  selector: 'app-club-membership-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonicModule],
  template: `
    <!-- Loading State -->
    @if (loading()) {
      <div
        class="rounded-2xl bg-gradient-to-br from-cta-default/10 to-cta-default/5 p-6 animate-pulse border border-cta-default/20"
      >
        <div class="h-6 w-32 bg-cta-default/20 rounded mb-4"></div>
        <div class="h-4 w-48 bg-cta-default/10 rounded"></div>
      </div>
    }

    <!-- No Subscription - Promotional Banner -->
    @if (!loading() && !hasSubscription()) {
      <div
        class="rounded-2xl border border-cta-default/30 bg-gradient-to-br from-cta-default/5 to-surface-raised p-6 space-y-4 shadow-sm"
      >
        <div class="flex items-center gap-3">
          <div
            class="w-12 h-12 rounded-full bg-cta-default/10 flex items-center justify-center border border-cta-default/20"
          >
            <ion-icon name="shield-checkmark" class="text-2xl text-cta-default"></ion-icon>
          </div>
          <div>
            <h3 class="text-lg font-bold text-text-primary">Autorentar Club</h3>
            <p class="text-sm text-text-secondary">Alquila sin depósito de garantía</p>
          </div>
        </div>

        <div class="space-y-2">
          <div class="flex items-center gap-2 text-sm text-text-secondary">
            <ion-icon name="checkmark-circle" class="text-cta-default"></ion-icon>
            <span>Depósito $0 en la mayoría de autos</span>
          </div>
          <div class="flex items-center gap-2 text-sm text-text-secondary">
            <ion-icon name="checkmark-circle" class="text-cta-default"></ion-icon>
            <span>Descuentos de hasta el 50% en garantía</span>
          </div>
          <div class="flex items-center gap-2 text-sm text-text-secondary">
            <ion-icon name="checkmark-circle" class="text-cta-default"></ion-icon>
            <span>FGO Buy-down incluido en todos los planes</span>
          </div>
        </div>

        <div class="flex gap-3">
          <button
            (click)="join.emit('club_standard')"
            class="flex-1 py-3 px-4 rounded-xl bg-cta-default text-cta-text font-bold text-sm hover:bg-cta-hover transition-all shadow-md shadow-cta-default/20 active:scale-95"
          >
            Unirse por $19.99/mes
          </button>
          <button
            (click)="viewPlans.emit()"
            class="py-3 px-4 rounded-xl border border-border-default text-text-secondary font-bold text-sm hover:bg-surface-secondary transition-colors"
          >
            Ver planes
          </button>
        </div>
      </div>
    }

    <!-- Active Subscription Card -->
    @if (!loading() && hasSubscription()) {
      <div [class]="cardClasses()" class="rounded-2xl p-6 space-y-4 relative overflow-hidden">
        <!-- Premium Pattern Background -->
        <div class="absolute inset-0 opacity-10">
          <div
            class="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full -translate-y-1/2 translate-x-1/2"
          ></div>
          <div
            class="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2"
          ></div>
        </div>

        <!-- Header -->
        <div class="relative flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <ion-icon name="shield-checkmark" class="text-xl text-white"></ion-icon>
            </div>
            <div>
              <h3 class="text-lg font-bold text-white">{{ tierName() }}</h3>
              <p class="text-sm text-white/70">
                Miembro desde {{ memberSince() | date: 'MMM yyyy' }}
              </p>
            </div>
          </div>
          <div [class]="statusBadgeClasses()" class="px-3 py-1 rounded-full text-xs font-semibold">
            {{ statusLabel() }}
          </div>
        </div>

        <!-- Balance Progress -->
        <div class="relative space-y-2">
          <div class="flex items-baseline justify-between">
            <span class="text-3xl font-bold text-white"> {{ discountPct() * 100 }}% OFF </span>
            <span class="text-sm text-white/70"> En garantías de vehículos </span>
          </div>

          <!-- Description -->
          <p class="text-xs text-white/80 font-medium">
            Tu plan te permite alquilar autos hasta nivel <strong>{{ maxTierName() }}</strong> con
            beneficio.
          </p>
        </div>

        <!-- Expiration Warning -->
        @if (daysRemaining() <= 30 && daysRemaining() > 0) {
          <div class="relative flex items-center gap-2 p-3 rounded-xl bg-white/10">
            <ion-icon name="time-outline" class="text-white/80"></ion-icon>
            <span class="text-sm text-white/80">
              Tu membresía vence en {{ daysRemaining() }} días
            </span>
            <button
              (click)="renew.emit()"
              class="ml-auto text-sm font-semibold text-white underline"
            >
              Renovar
            </button>
          </div>
        }

        <!-- Actions -->
        <div class="relative flex gap-3">
          <button
            (click)="viewHistory.emit()"
            class="flex-1 py-2.5 px-4 rounded-xl bg-white/20 text-white text-sm font-medium hover:bg-white/30 transition-colors flex items-center justify-center gap-2"
          >
            <ion-icon name="list-outline"></ion-icon>
            Ver historial
          </button>
          @if (subscription()?.status === 'depleted') {
            <button
              (click)="recharge.emit()"
              class="flex-1 py-2.5 px-4 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
            >
              <ion-icon name="add-circle-outline"></ion-icon>
              Recargar saldo
            </button>
          }
        </div>
      </div>
    }
  `,
})
export class ClubMembershipCardComponent implements OnInit {
  private readonly subscriptionService = inject(SubscriptionService);

  // Inputs
  readonly compact = input(false);

  // Outputs
  readonly join = output<SubscriptionTier>();
  readonly viewPlans = output<void>();
  readonly viewHistory = output<void>();
  readonly renew = output<void>();
  readonly recharge = output<void>();

  // State from service
  readonly subscription = this.subscriptionService.subscription;
  readonly loading = this.subscriptionService.loading;

  // Computed
  readonly hasSubscription = computed(() => this.subscription() !== null);

  readonly tierName = computed(() => {
    const sub = this.subscription();
    if (!sub) return '';
    const mapping: Record<string, string> = {
      club_standard: 'Club Access',
      club_black: 'Silver Access',
      club_luxury: 'Black Access',
    };
    return mapping[sub.tier] || sub.tier;
  });

  readonly discountPct = computed(() => {
    const sub = this.subscription();
    if (!sub) return 0;
    const mapping: Record<string, number> = {
      club_standard: 0.25,
      club_black: 0.4,
      club_luxury: 0.5,
    };
    return mapping[sub.tier] || 0;
  });

  readonly maxTierName = computed(() => {
    const sub = this.subscription();
    if (!sub) return '';
    const mapping: Record<string, string> = {
      club_standard: 'Standard',
      club_black: 'Premium',
      club_luxury: 'Luxury',
    };
    return mapping[sub.tier] || 'Standard';
  });

  readonly statusLabel = computed(() => {
    const sub = this.subscription();
    if (!sub) return '';
    return SUBSCRIPTION_STATUS_LABELS[sub.status];
  });

  readonly balanceUsd = computed(() => {
    return this.subscription()?.remaining_balance_usd ?? 0;
  });

  readonly coverageLimitUsd = computed(() => {
    return this.subscription()?.coverage_limit_usd ?? 0;
  });

  readonly balancePercent = computed(() => {
    const sub = this.subscription();
    if (!sub || sub.coverage_limit_cents === 0) return 0;
    return Math.round((sub.remaining_balance_cents / sub.coverage_limit_cents) * 100);
  });

  readonly daysRemaining = computed(() => {
    return this.subscription()?.days_remaining ?? 0;
  });

  readonly memberSince = computed(() => {
    const sub = this.subscription();
    if (!sub) return new Date();
    return new Date(sub.starts_at);
  });

  readonly cardClasses = computed(() => {
    const tier = this.subscription()?.tier;
    if (tier === 'club_black') {
      return 'bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 shadow-xl';
    }
    // club_standard - New Neon Premium Theme
    return 'bg-gradient-to-br from-cta-default to-emerald-600 text-cta-text shadow-lg shadow-cta-default/20';
  });

  readonly statusBadgeClasses = computed(() => {
    const status = this.subscription()?.status;
    switch (status) {
      case 'active':
        return 'bg-white/20 text-white backdrop-blur-md border border-white/30';
      case 'depleted':
        return 'bg-red-500/20 text-red-100';
      case 'expired':
        return 'bg-gray-500/20 text-gray-300';
      default:
        return 'bg-white/10 text-white';
    }
  });

  ngOnInit(): void {
    // Subscription is auto-loaded by the service on init
    // Force refresh if needed
    void this.subscriptionService.fetchSubscription();
  }
}
