import { Component, inject, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { SubscriptionService } from '@core/services/subscriptions/subscription.service';
import { AnalyticsService } from '@core/services/infrastructure/analytics.service';
import {
  MEMBERSHIP_CONFIG,
  VEHICLE_TIER_CONFIG,
  VEHICLE_TIER_ORDER,
  VehicleTier,
  MembershipPlan,
  MembershipPlanConfig,
  getVehicleTierName,
  calcHoldAndBuydown,
  canAccessTierWithDiscount,
} from '@core/models/guarantee-tiers.model';

@Component({
  selector: 'app-club-plans',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonicModule, DecimalPipe],
  template: `
    <div class="min-h-screen bg-surface-base py-6 px-4 pb-24">
      <div class="max-w-6xl mx-auto space-y-10">
        <!-- Header -->
        <div class="text-center space-y-4">
          <button
            (click)="goBack()"
            class="inline-flex items-center gap-2 text-text-secondary hover:text-cta-default transition mb-4 font-bold text-sm"
          >
            <ion-icon name="arrow-back"></ion-icon>
            VOLVER A WALLET
          </button>

          <div
            class="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-cta-default to-emerald-600 flex items-center justify-center shadow-xl shadow-cta-default/30 rotate-3"
          >
            <ion-icon name="sparkles" class="text-4xl text-cta-text"></ion-icon>
          </div>

          <h1 class="text-4xl md:text-5xl font-black text-text-primary tracking-tighter italic">
            AUTORENTAR <span class="text-cta-default">CLUB</span>
          </h1>
          <p class="text-lg text-text-secondary max-w-2xl mx-auto font-medium">
            Elegí tu tipo de auto y mirá cuánto ahorrás en garantía con cada plan.
          </p>
        </div>

        <!-- Cómo Funciona -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="flex items-center gap-4 bg-surface-secondary/50 rounded-2xl p-5 border border-border-default">
            <div class="w-12 h-12 rounded-xl bg-cta-default/10 flex items-center justify-center flex-shrink-0">
              <ion-icon name="ribbon" class="text-2xl text-cta-default"></ion-icon>
            </div>
            <div>
              <p class="text-sm font-black text-text-primary uppercase tracking-tight">1. Elegí un plan</p>
              <p class="text-xs text-text-secondary">Membresía mensual desde USD 19.99</p>
            </div>
          </div>
          <div class="flex items-center gap-4 bg-surface-secondary/50 rounded-2xl p-5 border border-border-default">
            <div class="w-12 h-12 rounded-xl bg-cta-default/10 flex items-center justify-center flex-shrink-0">
              <ion-icon name="car-sport" class="text-2xl text-cta-default"></ion-icon>
            </div>
            <div>
              <p class="text-sm font-black text-text-primary uppercase tracking-tight">2. Alquilá</p>
              <p class="text-xs text-text-secondary">Reservá cualquier auto dentro de tu cobertura</p>
            </div>
          </div>
          <div class="flex items-center gap-4 bg-surface-secondary/50 rounded-2xl p-5 border border-border-default">
            <div class="w-12 h-12 rounded-xl bg-cta-default/10 flex items-center justify-center flex-shrink-0">
              <ion-icon name="wallet" class="text-2xl text-cta-default"></ion-icon>
            </div>
            <div>
              <p class="text-sm font-black text-text-primary uppercase tracking-tight">3. Depositá menos</p>
              <p class="text-xs text-text-secondary">Tu garantía se reduce, la plataforma cubre el resto</p>
            </div>
          </div>
        </div>

        <!-- Already subscribed banner -->
        @if (hasActiveSubscription()) {
          <div class="rounded-3xl bg-cta-default p-1 shadow-xl shadow-cta-default/20">
            <div
              class="bg-surface-base rounded-[22px] p-6 flex flex-col md:flex-row items-center gap-6"
            >
              <div
                class="w-14 h-14 rounded-2xl bg-cta-default/10 flex items-center justify-center flex-shrink-0"
              >
                <ion-icon name="ribbon" class="text-3xl text-cta-default"></ion-icon>
              </div>
              <div class="flex-1 text-center md:text-left">
                <h3 class="text-xl font-black text-text-primary italic uppercase tracking-tighter">
                  Miembro {{ currentTierName() }}
                </h3>
                <p class="text-sm text-text-secondary font-medium">
                  Tu protección está activa y cubre hasta vehículos nivel
                  <strong>{{ currentMaxTier() }}</strong>.
                </p>
              </div>
              <button
                (click)="goToHistory()"
                class="w-full md:w-auto px-8 py-3 rounded-xl bg-cta-default text-cta-text font-black text-sm hover:bg-cta-hover transition-all uppercase tracking-widest"
              >
                Ver Cobertura
              </button>
            </div>
          </div>
        }

        <!-- Vehicle Tier Carousel -->
        <div class="space-y-4">
          <div class="text-center">
            <h2 class="text-2xl font-black text-text-primary italic uppercase tracking-tighter">
              Elegí tu vehículo
            </h2>
            <p class="text-sm text-text-secondary mt-1">
              Deslizá para ver cada categoría y cuánto ahorrás por alquiler
            </p>
          </div>

          <div
            class="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth
                   [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5
                   [&::-webkit-scrollbar-track]:bg-surface-secondary
                   [&::-webkit-scrollbar-thumb]:bg-cta-default/40 [&::-webkit-scrollbar-thumb]:rounded-full"
          >
            @for (tier of vehicleTiers; track tier) {
              <div class="snap-start flex-shrink-0 w-[85vw] md:w-[420px]">
                <div class="rounded-3xl border-2 border-border-default bg-surface-raised p-6 space-y-5 h-full">
                  <!-- Card Header -->
                  <div class="text-center space-y-2">
                    <div class="inline-flex items-center gap-2 bg-cta-default/10 rounded-full px-4 py-1">
                      <ion-icon name="car-sport" class="text-sm text-cta-default"></ion-icon>
                      <span class="text-[10px] font-black uppercase tracking-widest text-cta-default">
                        {{ getVehicleTierName(tier) }}
                      </span>
                    </div>
                    <p class="text-xs text-text-secondary">{{ formatTierRange(tier) }}</p>
                  </div>

                  <!-- Base guarantee (anchor price) -->
                  <div class="text-center bg-surface-secondary/40 rounded-2xl py-3 px-4">
                    <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">
                      Sin membresía
                    </p>
                    <p class="text-2xl font-black text-text-primary">
                      USD {{ vehicleConfigs[tier].holdBaseUsd | number }}
                    </p>
                    <p class="text-[10px] text-text-secondary">de garantía por alquiler</p>
                  </div>

                  <!-- Membership options -->
                  <div class="space-y-3">
                    <p class="text-[10px] font-black uppercase tracking-widest text-text-muted text-center">
                      Con membresía pagás menos
                    </p>

                    @for (plan of membershipPlans; track plan.plan) {
                      @let calc = getCalc(tier, plan.plan);
                      @let accessible = canAccess(plan.plan, tier);
                      @let isSilver = plan.plan === 'silver';
                      @let isBlack = plan.plan === 'black';

                      <div
                        class="relative rounded-2xl p-4 transition-all border-2"
                        [class.border-cta-default]="isSilver && accessible"
                        [class.border-border-default]="!isSilver || !accessible"
                        [class.bg-cta-default/5]="isSilver && accessible"
                        [class.bg-gradient-to-r]="isBlack && accessible"
                        [class.from-gray-900]="isBlack && accessible"
                        [class.to-gray-800]="isBlack && accessible"
                        [class.opacity-40]="!accessible"
                      >
                        @if (isSilver && accessible) {
                          <span class="absolute -top-2.5 left-4 px-3 py-0.5 bg-cta-default text-cta-text text-[8px] font-black uppercase tracking-widest rounded-full">
                            Recomendado
                          </span>
                        }

                        <div class="flex items-center justify-between gap-3">
                          <!-- Plan info -->
                          <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2">
                              <p class="text-sm font-black uppercase tracking-tight"
                                 [class.text-text-primary]="!isBlack || !accessible"
                                 [class.text-white]="isBlack && accessible"
                              >{{ plan.name }}</p>
                              <span class="text-[10px] text-text-secondary font-medium"
                                    [class.text-gray-400]="isBlack && accessible"
                              >\${{ plan.priceMonthlyUsd }}/mes</span>
                            </div>

                            @if (accessible) {
                              <div class="flex items-baseline gap-2 mt-1">
                                <span class="text-xs text-text-muted line-through"
                                      [class.text-gray-500]="isBlack"
                                >USD {{ calc.baseHoldUsd | number }}</span>
                                <span class="text-[10px] font-bold text-cta-default"
                                      [class.text-emerald-400]="isBlack"
                                >-{{ calc.discountPct * 100 }}%</span>
                              </div>
                            } @else {
                              <p class="text-[10px] text-text-muted italic mt-1">
                                Auto excede cobertura de este plan
                              </p>
                            }
                          </div>

                          <!-- Price + CTA -->
                          @if (accessible) {
                            <div class="text-right flex-shrink-0">
                              <p class="text-xl font-black text-cta-default"
                                 [class.text-emerald-400]="isBlack"
                              >
                                \${{ calc.holdUsd | number }}
                              </p>
                              <button
                                (click)="selectPlan(plan.plan)"
                                class="mt-1 px-4 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all active:scale-95"
                                [class.bg-cta-default]="!isBlack"
                                [class.text-cta-text]="!isBlack"
                                [class.hover:bg-cta-hover]="!isBlack"
                                [class.bg-white]="isBlack"
                                [class.text-black]="isBlack"
                                [class.hover:bg-gray-200]="isBlack"
                              >
                                Elegir
                              </button>
                            </div>
                          } @else {
                            <div class="text-right flex-shrink-0">
                              <p class="text-sm font-bold text-text-muted">
                                \${{ calc.holdUsd | number }}
                              </p>
                              <p class="text-[9px] text-text-muted">sin descuento</p>
                            </div>
                          }
                        </div>

                        @if (accessible && calc.buyDownFgoUsd > 0) {
                          <div class="mt-2 bg-cta-default/10 rounded-lg px-3 py-1.5 text-center"
                               [class.bg-emerald-400/10]="isBlack"
                          >
                            <span class="text-[10px] font-bold text-cta-default"
                                  [class.text-emerald-400]="isBlack"
                            >
                              Ahorrás USD {{ calc.buyDownFgoUsd | number }} por alquiler
                            </span>
                          </div>
                        }
                      </div>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Trust & Security -->
        <div class="grid md:grid-cols-3 gap-6 pt-10 border-t border-border-default">
          <div class="flex flex-col items-center text-center space-y-2">
            <ion-icon name="shield-half" class="text-3xl text-cta-default"></ion-icon>
            <h4 class="font-black text-sm uppercase tracking-tighter italic">Garantía Reducida</h4>
            <p class="text-xs text-text-secondary font-medium">
              La plataforma cubre hasta el 50% de tu depósito de garantía.
            </p>
          </div>
          <div class="flex flex-col items-center text-center space-y-2">
            <ion-icon name="flash" class="text-3xl text-cta-default"></ion-icon>
            <h4 class="font-black text-sm uppercase tracking-tighter italic">
              Alquiler Instantáneo
            </h4>
            <p class="text-xs text-text-secondary font-medium">
              Sin esperas ni burocracia. Elegís, pagás y salís.
            </p>
          </div>
          <div class="flex flex-col items-center text-center space-y-2">
            <ion-icon name="infinite" class="text-3xl text-cta-default"></ion-icon>
            <h4 class="font-black text-sm uppercase tracking-tighter italic">Sin Compromiso</h4>
            <p class="text-xs text-text-secondary font-medium">
              Cancelá o cambiá de plan en cualquier momento. Sin permanencia.
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .rotate-3 {
        transform: rotate(3deg);
      }
    `,
  ],
})
export class ClubPlansPage implements OnInit {
  private readonly router = inject(Router);
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly analytics = inject(AnalyticsService);

  readonly hasActiveSubscription = this.subscriptionService.hasActiveSubscription;
  readonly subscription = this.subscriptionService.subscription;

  readonly vehicleTiers = VEHICLE_TIER_ORDER;
  readonly vehicleConfigs = VEHICLE_TIER_CONFIG;
  readonly membershipPlans: MembershipPlanConfig[] = [
    MEMBERSHIP_CONFIG['club'],
    MEMBERSHIP_CONFIG['silver'],
    MEMBERSHIP_CONFIG['black'],
  ];

  getVehicleTierName = getVehicleTierName;

  // DB tier → UI plan mapping (single source of truth)
  private readonly DB_TO_UI: Record<string, MembershipPlan> = {
    club_standard: 'club',
    club_black: 'silver',
    club_luxury: 'black',
  };
  private readonly UI_TO_DB: Record<string, string> = {
    club: 'club_standard',
    silver: 'club_black',
    black: 'club_luxury',
  };
  private readonly TIER_NAMES: Record<string, string> = {
    club_standard: 'Club Access',
    club_black: 'Silver Access',
    club_luxury: 'Black Access',
  };
  private readonly TIER_MAX_VEHICLE: Record<string, string> = {
    club_standard: 'Standard',
    club_black: 'Premium',
    club_luxury: 'Luxury',
  };

  // Cache de cálculos para evitar recalcular en template
  private readonly calcCache = new Map<string, ReturnType<typeof calcHoldAndBuydown>>();

  getCalc(vehicleTier: VehicleTier, plan: MembershipPlan): ReturnType<typeof calcHoldAndBuydown> {
    const key = `${vehicleTier}:${plan}`;
    let result = this.calcCache.get(key);
    if (!result) {
      result = calcHoldAndBuydown(vehicleTier, plan);
      this.calcCache.set(key, result);
    }
    return result;
  }

  canAccess(plan: MembershipPlan, vehicleTier: VehicleTier): boolean {
    return canAccessTierWithDiscount(plan, vehicleTier);
  }

  formatTierRange(tier: VehicleTier): string {
    const config = this.vehicleConfigs[tier];
    const formatUsd = (value: number): string => value.toLocaleString('en-US');

    if (config.valueMinUsd === null && config.valueMaxUsd !== null) {
      return `Hasta USD ${formatUsd(config.valueMaxUsd)}`;
    }
    if (config.valueMinUsd !== null && config.valueMaxUsd === null) {
      return `Desde USD ${formatUsd(config.valueMinUsd)}`;
    }
    if (config.valueMinUsd !== null && config.valueMaxUsd !== null) {
      return `USD ${formatUsd(config.valueMinUsd)} - ${formatUsd(config.valueMaxUsd)}`;
    }
    return '';
  }

  async ngOnInit() {
    await this.subscriptionService.fetchPlans();
  }

  currentTierName(): string {
    const sub = this.subscription();
    if (!sub) return '';
    return this.TIER_NAMES[sub.tier] || sub.tier;
  }

  currentMaxTier(): string {
    const sub = this.subscription();
    if (!sub) return 'Standard';
    return this.TIER_MAX_VEHICLE[sub.tier] || 'Standard';
  }

  selectPlan(plan: MembershipPlan): void {
    const tierSlug = this.UI_TO_DB[plan];
    this.analytics.trackEvent('club_plan_selected', { tier: tierSlug });
    void this.router.navigate(['/wallet/club/subscribe'], { queryParams: { tier: tierSlug } });
  }

  goToHistory(): void {
    void this.router.navigate(['/wallet/club/history']);
  }

  goBack(): void {
    void this.router.navigate(['/wallet']);
  }
}
