import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import {
  SubscriptionTier,
  SubscriptionTierConfig,
  SUBSCRIPTION_TIERS,
} from '@core/models/subscription.model';
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
            <ion-icon name="sparkles" class="text-amber-500"></ion-icon>
            <p class="text-xs uppercase tracking-widest text-text-secondary font-semibold">
              Autorentar Club
            </p>
          </div>
          <h2 class="text-xl sm:text-2xl font-bold text-text-primary">
            Mejora tu plan con Silver y Black
          </h2>
          <p class="text-sm text-text-secondary mt-1">
            Mas cobertura, menos deposito y acceso a autos de mayor valor.
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
        @for (tier of tiers; track tier.tier) {
          <div [class]="getPlanCardClass(tier)">
            <div class="flex items-start justify-between gap-3">
              <div class="space-y-1">
                <p class="text-xs uppercase tracking-widest text-text-secondary font-semibold">
                  Plan
                </p>
                <h3 class="text-lg font-bold text-text-primary">{{ tier.name }}</h3>
                <p class="text-xs text-text-secondary">{{ tier.description }}</p>
              </div>
              <div class="flex flex-col items-end gap-2">
                @if (tier.tier === 'club_black') {
                  <span class="px-2 py-0.5 rounded-full bg-gray-700 text-white text-[10px] font-bold">
                    MAS POPULAR
                  </span>
                }
                @if (tier.tier === 'club_luxury') {
                  <span
                    class="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-[10px] font-bold"
                  >
                    PREMIUM
                  </span>
                }
                @if (isCurrentTier(tier.tier)) {
                  <span class="px-2 py-0.5 rounded-full bg-success-strong/10 text-success-strong text-[10px] font-bold">
                    ACTUAL
                  </span>
                }
              </div>
            </div>

            <div class="flex items-baseline gap-1">
              <span class="text-2xl font-bold text-text-primary">\${{ tier.price_usd }}</span>
              <span class="text-xs text-text-secondary">/ano</span>
            </div>

            <div [class]="getCoverageBoxClass(tier)" class="rounded-lg p-3">
              <p class="text-xs uppercase tracking-widest font-semibold opacity-80">Cobertura</p>
              <p class="text-base font-semibold">\${{ tier.coverage_limit_usd }} USD</p>
            </div>

            <ul class="space-y-1">
              @for (feature of previewFeatures(tier); track feature) {
                <li class="flex items-start gap-2 text-xs text-text-secondary">
                  <ion-icon name="checkmark-circle" class="text-success-strong mt-0.5"></ion-icon>
                  {{ feature }}
                </li>
              }
            </ul>

            <button
              type="button"
              (click)="selectPlan(tier.tier)"
              [disabled]="isCurrentTier(tier.tier) || isDowngrade(tier.tier)"
              [class]="getCtaButtonClass(tier)"
              class="w-full mt-2 py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              @if (isCurrentTier(tier.tier)) {
                Plan actual
              } @else if (isDowngrade(tier.tier)) {
                Plan inferior
              } @else if (hasActiveSubscription()) {
                Mejorar a {{ tier.name }}
              } @else {
                Unirse por \${{ tier.price_usd }}/ano
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

  readonly tiers: SubscriptionTierConfig[] = [
    SUBSCRIPTION_TIERS['club_standard'],
    SUBSCRIPTION_TIERS['club_black'],
    SUBSCRIPTION_TIERS['club_luxury'],
  ];

  previewFeatures(tier: SubscriptionTierConfig): string[] {
    return tier.features.slice(0, 2);
  }

  isCurrentTier(tier: SubscriptionTier): boolean {
    const sub = this.subscription();
    return sub?.tier === tier && sub.status === 'active';
  }

  isDowngrade(tier: SubscriptionTier): boolean {
    const sub = this.subscription();
    if (!sub || sub.status !== 'active') return false;
    return this.getTierRank(tier) < this.getTierRank(sub.tier);
  }

  getPlanCardClass(tier: SubscriptionTierConfig): string {
    const base = 'rounded-xl border p-4 space-y-4 transition shadow-sm';
    const current = this.isCurrentTier(tier.tier)
      ? 'ring-2 ring-success-strong/40 border-success-strong/40'
      : 'border-border-default/50';

    if (tier.tier === 'club_luxury') {
      return `${base} ${current} bg-gradient-to-br from-amber-500/10 to-amber-700/10`;
    }
    if (tier.tier === 'club_black') {
      return `${base} ${current} bg-gradient-to-br from-gray-900/5 to-gray-700/5`;
    }
    return `${base} ${current} bg-gradient-to-br from-amber-500/5 to-surface-raised`;
  }

  getCoverageBoxClass(tier: SubscriptionTierConfig): string {
    if (tier.tier === 'club_luxury') {
      return 'bg-amber-500/10 text-amber-700';
    }
    if (tier.tier === 'club_black') {
      return 'bg-gray-900/10 text-gray-800';
    }
    return 'bg-amber-500/10 text-amber-700';
  }

  getCtaButtonClass(tier: SubscriptionTierConfig): string {
    if (tier.tier === 'club_luxury') {
      return 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black hover:from-amber-400 hover:to-yellow-300';
    }
    if (tier.tier === 'club_black') {
      return 'bg-gray-900 text-white hover:bg-gray-800';
    }
    return 'bg-amber-500 text-black hover:bg-amber-400';
  }

  selectPlan(tier: SubscriptionTier): void {
    this.analytics.trackEvent('club_plan_selected', { tier, source: 'wallet' });
    void this.router.navigate(['/wallet/club/subscribe'], { queryParams: { tier } });
  }

  viewAllPlans(): void {
    this.analytics.trackEvent('club_view_plans_clicked', { source: 'wallet' });
    void this.router.navigate(['/wallet/club/plans']);
  }

  private getTierRank(tier: SubscriptionTier): number {
    const tierHierarchy: Record<SubscriptionTier, number> = {
      club_standard: 1,
      club_black: 2,
      club_luxury: 3,
    };
    return tierHierarchy[tier] ?? 0;
  }
}
