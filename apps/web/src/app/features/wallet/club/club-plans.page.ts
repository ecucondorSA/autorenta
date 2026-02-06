import { Component, inject, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { SubscriptionService } from '@core/services/subscriptions/subscription.service';
import { AnalyticsService } from '@core/services/infrastructure/analytics.service';
import { 
  MEMBERSHIP_CONFIG, 
  VEHICLE_TIER_CONFIG, 
  VEHICLE_TIER_ORDER,
  getVehicleTierName,
  MembershipPlanConfig
} from '@core/models/guarantee-tiers.model';

@Component({
  selector: 'app-club-plans',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonicModule],
  template: `
    <div class="min-h-screen bg-surface-base py-6 px-4 pb-24">
      <div class="max-w-5xl mx-auto space-y-10">
        <!-- Header -->
        <div class="text-center space-y-4">
          <button
            (click)="goBack()"
            class="inline-flex items-center gap-2 text-text-secondary hover:text-cta-default transition mb-4 font-bold text-sm"
          >
            <ion-icon name="arrow-back"></ion-icon>
            VOLVER A WALLET
          </button>

          <div class="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-cta-default to-emerald-600 flex items-center justify-center shadow-xl shadow-cta-default/30 rotate-3">
            <ion-icon name="sparkles" class="text-4xl text-cta-text"></ion-icon>
          </div>
          
          <h1 class="text-4xl md:text-5xl font-black text-text-primary tracking-tighter italic">
            AUTORENTAR <span class="text-cta-default">CLUB</span>
          </h1>
          <p class="text-lg text-text-secondary max-w-2xl mx-auto font-medium">
            Olvidate de las garantías gigantes. Uníte al Club y alquilá con depósitos reducidos y protección total de la comunidad.
          </p>
        </div>

        <!-- NEW: Vehicle Tiers Education Section -->
        <div class="bg-surface-secondary/50 rounded-3xl p-6 md:p-8 border border-border-default">
          <div class="flex items-center gap-3 mb-6">
            <div class="w-10 h-10 rounded-xl bg-cta-default/10 flex items-center justify-center text-cta-default">
              <ion-icon name="car-sport" class="text-xl"></ion-icon>
            </div>
            <div>
              <h2 class="text-xl font-bold text-text-primary italic uppercase tracking-tight">Escala de Garantías</h2>
              <p class="text-xs text-text-secondary font-bold uppercase tracking-widest">Hold base según el valor del vehículo</p>
            </div>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-6 gap-3">
            @for (tier of vehicleTiers; track tier) {
              <div class="bg-surface-base p-4 rounded-2xl border border-border-default text-center space-y-1">
                <p class="text-[10px] font-black uppercase text-text-muted">{{ tier }}</p>
                <p class="text-lg font-black text-text-primary">\${{ vehicleConfigs[tier].holdBaseUsd }}</p>
                <p class="text-[9px] text-text-secondary leading-none">{{ vehicleConfigs[tier].description.split('(')[1].replace(')', '') }}</p>
              </div>
            }
          </div>
        </div>

        <!-- Already subscribed banner -->
        @if (hasActiveSubscription()) {
          <div class="rounded-3xl bg-cta-default p-1 shadow-xl shadow-cta-default/20">
            <div class="bg-surface-base rounded-[22px] p-6 flex flex-col md:flex-row items-center gap-6">
              <div class="w-14 h-14 rounded-2xl bg-cta-default/10 flex items-center justify-center flex-shrink-0">
                <ion-icon name="ribbon" class="text-3xl text-cta-default"></ion-icon>
              </div>
              <div class="flex-1 text-center md:text-left">
                <h3 class="text-xl font-black text-text-primary italic uppercase tracking-tighter">Miembro {{ currentTierName() }}</h3>
                <p class="text-sm text-text-secondary font-medium">
                  Tu protección está activa y cubre hasta vehículos nivel <strong>{{ currentMaxTier() }}</strong>.
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

        <!-- Plans comparison -->
        <div class="grid md:grid-cols-3 gap-8">
          @for (plan of membershipPlans; track plan.plan) {
            <div
              [class]="getPlanCardClass(plan)"
              class="relative rounded-[32px] p-8 space-y-8 transition-all hover:scale-[1.02] duration-300 shadow-sm"
            >
              <!-- Popular/Premium badge -->
              @if (plan.plan === 'silver') {
                <div class="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span class="px-6 py-1.5 rounded-full bg-cta-default text-cta-text text-[10px] font-black uppercase tracking-widest shadow-lg">
                    RECOMENDADO
                  </span>
                </div>
              }
              @if (plan.plan === 'black') {
                <div class="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span class="px-6 py-1.5 rounded-full bg-black text-white text-[10px] font-black uppercase tracking-widest shadow-lg border border-white/20">
                    NIVEL ELITE
                  </span>
                </div>
              }

              <!-- Tier header -->
              <div class="text-center space-y-3">
                <h3 class="text-2xl font-black text-text-primary italic uppercase tracking-tighter">{{ plan.name }}</h3>
                <p class="text-xs font-bold text-text-secondary uppercase tracking-widest">Hasta autos {{ getVehicleTierName(plan.maxVehicleTier) }}</p>
              </div>

              <!-- Price -->
              <div class="text-center py-4 bg-surface-secondary/30 rounded-2xl border border-border-default/50">
                <div class="flex items-baseline justify-center gap-1">
                  <span class="text-xs font-black text-text-muted">USD</span>
                  <span class="text-5xl font-black text-text-primary tracking-tighter italic">{{ plan.priceMonthlyUsd }}</span>
                  <span class="text-xs font-bold text-text-muted">/mes</span>
                </div>
              </div>

              <!-- Features list -->
              <div class="space-y-4">
                <p class="text-[10px] font-black text-text-muted uppercase tracking-widest text-center">Beneficios Exclusivos</p>
                <ul class="space-y-4">
                  <li class="flex items-center gap-3">
                    <div class="w-6 h-6 rounded-lg bg-cta-default text-cta-text flex items-center justify-center flex-shrink-0">
                      <ion-icon name="checkmark" class="text-sm font-bold"></ion-icon>
                    </div>
                    <span class="text-sm font-bold text-text-primary">{{ plan.holdDiscountPct * 100 }}% OFF en Garantía</span>
                  </li>
                  @for (feature of plan.features.slice(1); track feature) {
                    <li class="flex items-center gap-3">
                      <div class="w-6 h-6 rounded-lg bg-surface-secondary text-cta-default flex items-center justify-center flex-shrink-0">
                        <ion-icon name="checkmark" class="text-sm"></ion-icon>
                      </div>
                      <span class="text-sm font-medium text-text-secondary">{{ feature }}</span>
                    </li>
                  }
                </ul>
              </div>

              <!-- CTA -->
              <button
                (click)="selectPlan(plan.plan)"
                [disabled]="isCurrentTierByPlan(plan.plan) || isDowngradeByPlan(plan.plan)"
                [class]="getCtaButtonClassByPlan(plan)"
                class="w-full py-5 rounded-2xl font-black uppercase tracking-widest text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl"
              >
                @if (isCurrentTierByPlan(plan.plan)) {
                  <span>Membresía Actual</span>
                } @else if (isDowngradeByPlan(plan.plan)) {
                  <span>Plan Inferior</span>
                } @else {
                  <span>Elegir {{ plan.name.split(' ')[0] }}</span>
                }
              </button>
            </div>
          }
        </div>

        <!-- Trust & Security -->
        <div class="grid md:grid-cols-3 gap-6 pt-10 border-t border-border-default">
          <div class="flex flex-col items-center text-center space-y-2">
            <ion-icon name="shield-half" class="text-3xl text-cta-default"></ion-icon>
            <h4 class="font-black text-sm uppercase tracking-tighter italic">Protección FGO</h4>
            <p class="text-xs text-text-secondary font-medium">El Fondo de Garantía cubre la diferencia del depósito.</p>
          </div>
          <div class="flex flex-col items-center text-center space-y-2">
            <ion-icon name="flash" class="text-3xl text-cta-default"></ion-icon>
            <h4 class="font-black text-sm uppercase tracking-tighter italic">Alquiler Instantáneo</h4>
            <p class="text-xs text-text-secondary font-medium">Sin esperas ni burocracia. Elegís, pagás y salís.</p>
          </div>
          <div class="flex flex-col items-center text-center space-y-2">
            <ion-icon name="infinite" class="text-3xl text-cta-default"></ion-icon>
            <h4 class="font-black text-sm uppercase tracking-tighter italic">Sin Compromiso</h4>
            <p class="text-xs text-text-secondary font-medium">Cancelá o cambiá de plan en cualquier momento.</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .rotate-3 { transform: rotate(3deg); }
  `]
})
export class ClubPlansPage implements OnInit {
  private readonly router = inject(Router);
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly analytics = inject(AnalyticsService);

  readonly plans = this.subscriptionService.plans;
  readonly hasActiveSubscription = this.subscriptionService.hasActiveSubscription;
  readonly subscription = this.subscriptionService.subscription;

  // New Data Sources
  readonly vehicleTiers = VEHICLE_TIER_ORDER;
  readonly vehicleConfigs = VEHICLE_TIER_CONFIG;
  readonly membershipPlans = [
    MEMBERSHIP_CONFIG['club'],
    MEMBERSHIP_CONFIG['silver'],
    MEMBERSHIP_CONFIG['black']
  ];

  getVehicleTierName = getVehicleTierName;

  async ngOnInit() {
    await this.subscriptionService.fetchPlans();
  }

  currentTierName(): string {
    const sub = this.subscription();
    if (!sub) return '';
    const mapping: Record<string, string> = {
      club_standard: 'Club Access',
      club_black: 'Silver Access',
      club_luxury: 'Black Access'
    };
    return mapping[sub.tier] || sub.tier;
  }

  currentMaxTier(): string {
    const sub = this.subscription();
    if (!sub) return 'Standard';
    const mapping: Record<string, string> = {
      club_standard: 'Standard',
      club_black: 'Premium',
      club_luxury: 'Luxury'
    };
    return mapping[sub.tier] || 'Standard';
  }

  subscriptionExpiry(): Date {
    const sub = this.subscription();
    return sub ? new Date(sub.expires_at) : new Date();
  }

  isCurrentTierByPlan(plan: string): boolean {
    const sub = this.subscription();
    if (!sub || sub.status !== 'active') return false;
    const mapping: Record<string, string> = {
      club_standard: 'club',
      club_black: 'silver',
      club_luxury: 'black'
    };
    return mapping[sub.tier] === plan;
  }

  isDowngradeByPlan(plan: string): boolean {
    const sub = this.subscription();
    if (!sub || sub.status !== 'active') return false;
    
    const rank: Record<string, number> = { club: 1, silver: 2, black: 3 };
    const currentRank = rank[this.mapDbTierToPlan(sub.tier)] || 0;
    const targetRank = rank[plan] || 0;
    
    return targetRank < currentRank;
  }

  private mapDbTierToPlan(dbTier: string): string {
    const mapping: Record<string, string> = {
      club_standard: 'club',
      club_black: 'silver',
      club_luxury: 'black'
    };
    return mapping[dbTier] || '';
  }

  getPlanCardClass(plan: MembershipPlanConfig): string {
    const base = 'border-2';
    if (plan.plan === 'black') {
      return `${base} border-black bg-gradient-to-br from-gray-900 to-gray-800 text-white`;
    }
    if (plan.plan === 'silver') {
      return `${base} border-border-default bg-surface-secondary/20 text-text-primary`;
    }
    return `${base} border-cta-default/30 bg-gradient-to-br from-cta-default/5 to-surface-raised text-text-primary`;
  }

  getCtaButtonClassByPlan(plan: MembershipPlanConfig): string {
    if (this.isCurrentTierByPlan(plan.plan)) {
      return 'bg-surface-secondary text-text-secondary border border-border-default';
    }
    if (this.isDowngradeByPlan(plan.plan)) {
      return 'bg-surface-secondary text-text-secondary opacity-50 cursor-not-allowed';
    }
    if (plan.plan === 'black') {
      return 'bg-white text-black hover:bg-gray-100';
    }
    return 'bg-cta-default text-cta-text font-black hover:bg-cta-hover shadow-lg shadow-cta-default/20 transition-all active:scale-95';
  }

  selectPlan(plan: string): void {
    const dbMapping: Record<string, string> = {
      club: 'club_standard',
      silver: 'club_black',
      black: 'club_luxury'
    };
    const tierSlug = dbMapping[plan];
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