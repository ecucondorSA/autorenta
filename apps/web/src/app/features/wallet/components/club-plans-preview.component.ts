import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import {
  MembershipPlan,
  MembershipPlanConfig,
  MEMBERSHIP_CONFIG,
  getVehicleTierName,
} from '@core/models/guarantee-tiers.model';
import { AnalyticsService } from '@core/services/infrastructure/analytics.service';
import { SubscriptionService } from '@core/services/subscriptions/subscription.service';

@Component({
  selector: 'app-club-plans-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonicModule],
  template: `
    <section
      class="rounded-2xl sm:rounded-3xl border border-border-default/50 bg-surface-raised p-4 sm:p-6 md:p-8"
    >
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <ion-icon name="sparkles" class="text-cta-default"></ion-icon>
            <p class="text-xs uppercase tracking-widest text-text-secondary font-semibold">
              Autorentar Club
            </p>
          </div>
          <h2 class="text-xl sm:text-2xl font-bold text-text-primary">
            Protección a medida de tu viaje
          </h2>
          <p class="text-sm text-text-secondary mt-1">
            Garantías reducidas hasta el 50% y cobertura extendida según el auto que elijas.
          </p>
        </div>
        <button
          type="button"
          (click)="viewAllPlans()"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-border-default text-text-secondary hover:bg-surface-secondary/50 transition"
        >
          Ver todos los planes
          <ion-icon name="arrow-forward-outline"></ion-icon>
        </button>
      </div>

      <div class="grid gap-4 md:grid-cols-3">
        @for (tier of tiers; track tier.plan) {
          <div [class]="getPlanCardClass(tier)">
            <div class="flex items-start justify-between gap-3">
              <div class="space-y-1">
                <p class="text-xs uppercase tracking-widest text-text-secondary font-semibold">
                  Plan
                </p>
                <h3 class="text-lg font-bold text-text-primary">{{ tier.name }}</h3>
                <p class="text-xs text-text-secondary">
                  Hasta autos {{ getVehicleTierName(tier.maxVehicleTier) }}
                </p>
              </div>
              <div class="flex flex-col items-end gap-2">
                @if (tier.plan === 'silver') {
                  <span
                    class="px-2 py-0.5 rounded-full bg-gray-900 text-white text-[10px] font-bold"
                  >
                    MAS POPULAR
                  </span>
                }
                @if (tier.plan === 'black') {
                  <span
                    class="px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-600 to-cta-default text-cta-text text-[10px] font-bold"
                  >
                    PREMIUM
                  </span>
                }
                @if (isCurrentTier(tier.plan)) {
                  <span
                    class="px-2 py-0.5 rounded-full bg-cta-default/10 text-cta-default text-[10px] font-bold border border-cta-default/20"
                  >
                    ACTUAL
                  </span>
                }
              </div>
            </div>

            <div class="flex items-baseline gap-1">
              <span class="text-2xl font-bold text-text-primary">\${{ tier.priceMonthlyUsd }}</span>
              <span class="text-xs text-text-secondary">/mes</span>
            </div>

            <div [class]="getCoverageBoxClass(tier)" class="rounded-lg p-3">
              <p class="text-xs uppercase tracking-widest font-semibold opacity-80">Garantía Off</p>
              <p class="text-base font-semibold">{{ tier.holdDiscountPct * 100 }}% de descuento</p>
            </div>

            <ul class="space-y-1">
              @for (feature of tier.features; track feature) {
                <li class="flex items-start gap-2 text-xs text-text-secondary">
                  <ion-icon name="checkmark-circle" class="text-cta-default mt-0.5"></ion-icon>
                  {{ feature }}
                </li>
              }
            </ul>

            <button
              type="button"
              (click)="selectPlan(tier.plan)"
              [disabled]="isCurrentTier(tier.plan) || isDowngrade(tier.plan)"
              [class]="getCtaButtonClass(tier)"
              class="w-full mt-2 py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              @if (isCurrentTier(tier.plan)) {
                Plan actual
              } @else if (isDowngrade(tier.plan)) {
                Plan inferior
              } @else if (hasActiveSubscription()) {
                Mejorar a {{ tier.name }}
              } @else {
                Unirse por \${{ tier.priceMonthlyUsd }}/mes
              }
            </button>
          </div>
        }
      </div>
    </section>
  `,
})
export class ClubPlansPreviewComponent {
  private readonly router = inject(Router);
  private readonly analytics = inject(AnalyticsService);
  private readonly subscriptionService = inject(SubscriptionService);

  readonly subscription = this.subscriptionService.subscription;
  readonly hasActiveSubscription = this.subscriptionService.hasActiveSubscription;

  // New Membership Config
  readonly tiers: MembershipPlanConfig[] = [
    MEMBERSHIP_CONFIG['club'],
    MEMBERSHIP_CONFIG['silver'],
    MEMBERSHIP_CONFIG['black'],
  ];

  getVehicleTierName = getVehicleTierName;

  isCurrentTier(plan: MembershipPlan): boolean {
    const sub = this.subscription();
    if (!sub || sub.status !== 'active') return false;

    // Mapping DB slug to Logic plan
    const mapping: Record<string, MembershipPlan> = {
      club_standard: 'club',
      club_black: 'silver',
      club_luxury: 'black',
    };
    return mapping[sub.tier] === plan;
  }

  isDowngrade(plan: MembershipPlan): boolean {
    const sub = this.subscription();
    if (!sub || sub.status !== 'active') return false;

    const mapping: Record<string, number> = {
      club_standard: 1,
      club_black: 2,
      club_luxury: 3,
    };

    const targetMapping: Record<MembershipPlan, number> = {
      none: 0,
      club: 1,
      silver: 2,
      black: 3,
    };

    return targetMapping[plan] < mapping[sub.tier];
  }

  getPlanCardClass(tier: MembershipPlanConfig): string {
    const base = 'rounded-xl border p-4 space-y-4 transition shadow-sm';
    const current = this.isCurrentTier(tier.plan)
      ? 'ring-2 ring-cta-default/40 border-cta-default/40'
      : 'border-border-default/50';

    if (tier.plan === 'black') {
      return `${base} ${current} bg-gradient-to-br from-gray-900 to-gray-800 text-white`;
    }
    if (tier.plan === 'silver') {
      return `${base} ${current} bg-gradient-to-br from-surface-secondary to-surface-base`;
    }
    return `${base} ${current} bg-gradient-to-br from-cta-default/5 to-surface-raised`;
  }

  getCoverageBoxClass(tier: MembershipPlanConfig): string {
    if (tier.plan === 'black') {
      return 'bg-white/10 text-white';
    }
    return 'bg-cta-default/10 text-text-primary';
  }

  getCtaButtonClass(tier: MembershipPlanConfig): string {
    if (this.isCurrentTier(tier.plan)) {
      return 'bg-surface-secondary text-text-secondary border border-border-default';
    }
    if (this.isDowngrade(tier.plan)) {
      return 'bg-surface-secondary text-text-secondary opacity-50';
    }
    // "Radioactive" Call to Action for all upgrade buttons
    return 'bg-cta-default text-cta-text font-bold shadow-lg shadow-cta-default/20 hover:bg-cta-hover hover:shadow-cta-default/40 hover:-translate-y-0.5';
  }

  selectPlan(tier: MembershipPlan): void {
    // Map back to DB tier for navigation
    const dbMapping: Record<MembershipPlan, string> = {
      club: 'club_standard',
      silver: 'club_black',
      black: 'club_luxury',
      none: '',
    };
    this.analytics.trackEvent('club_plan_selected', { tier, source: 'wallet' });
    void this.router.navigate(['/wallet/club/subscribe'], {
      queryParams: { tier: dbMapping[tier] },
    });
  }

  viewAllPlans(): void {
    this.analytics.trackEvent('club_view_plans_clicked', { source: 'wallet' });
    void this.router.navigate(['/wallet/club/plans']);
  }
}
