import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import {
  SubscriptionTier,
  SUBSCRIPTION_TIERS,
  SubscriptionTierConfig,
} from '@core/models/subscription.model';
import { SubscriptionService } from '@core/services/subscriptions/subscription.service';
import { AnalyticsService } from '@core/services/infrastructure/analytics.service';

@Component({
  selector: 'app-club-plans',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonicModule],
  template: `
    <div class="min-h-screen bg-surface-base py-6 px-4">
      <div class="max-w-4xl mx-auto space-y-8">
        <!-- Header -->
        <div class="text-center space-y-4">
          <button
            (click)="goBack()"
            class="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition mb-4"
          >
            <ion-icon name="arrow-back" class="text-xl"></ion-icon>
            Volver a Wallet
          </button>

          <div
            class="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center"
          >
            <ion-icon name="shield-checkmark" class="text-3xl text-white"></ion-icon>
          </div>

          <h1 class="text-3xl font-bold text-text-primary">Autorentar Club</h1>
          <p class="text-lg text-text-secondary max-w-xl mx-auto">
            Alquila sin deposito de garantia. Tu membresia cubre el deposito hasta por un ano.
          </p>
        </div>

        <!-- Already subscribed banner -->
        @if (hasActiveSubscription()) {
          <div
            class="rounded-2xl bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/40 p-6"
          >
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                <ion-icon name="checkmark-circle" class="text-2xl text-amber-600"></ion-icon>
              </div>
              <div class="flex-1">
                <h3 class="font-bold text-text-primary">Ya eres miembro del Club</h3>
                <p class="text-sm text-text-secondary">
                  Tu membresia {{ currentTierName() }} esta activa hasta
                  {{ subscriptionExpiry() | date: 'dd MMM yyyy' }}
                </p>
              </div>
              <button
                (click)="goToHistory()"
                class="px-4 py-2 rounded-lg bg-amber-500 text-black font-semibold hover:bg-amber-400 transition"
              >
                Ver historial
              </button>
            </div>
          </div>
        }

        <!-- Plans comparison -->
        <div class="grid md:grid-cols-3 gap-6">
          @for (tier of tiers; track tier.tier) {
            <div
              [class]="getPlanCardClass(tier)"
              class="relative rounded-2xl p-6 space-y-6 transition-all hover:shadow-lg"
            >
              <!-- Popular badge -->
              @if (tier.tier === 'club_black') {
                <div class="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span class="px-4 py-1 rounded-full bg-gray-700 text-white text-xs font-bold">
                    MAS POPULAR
                  </span>
                </div>
              }
              @if (tier.tier === 'club_luxury') {
                <div class="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span
                    class="px-4 py-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-xs font-bold"
                  >
                    PREMIUM
                  </span>
                </div>
              }

              <!-- Tier header -->
              <div class="text-center space-y-2">
                <div
                  [class]="getTierIconClass(tier)"
                  class="w-14 h-14 mx-auto rounded-full flex items-center justify-center"
                >
                  <ion-icon name="shield-checkmark" class="text-2xl"></ion-icon>
                </div>
                <h3 class="text-xl font-bold text-text-primary">{{ tier.name }}</h3>
                <p class="text-sm text-text-secondary">{{ tier.description }}</p>
              </div>

              <!-- Price -->
              <div class="text-center">
                <div class="flex items-baseline justify-center gap-1">
                  <span class="text-4xl font-bold text-text-primary">\${{ tier.price_usd }}</span>
                  <span class="text-text-secondary">/ano</span>
                </div>
                <p class="text-xs text-text-muted mt-1">
                  \${{ tier.price_usd / 12 | number: '1.0-0' }}/mes aproximadamente
                </p>
              </div>

              <!-- Coverage highlight -->
              <div [class]="getCoverageBoxClass(tier)" class="rounded-xl p-4 text-center">
                <p class="text-sm font-medium opacity-80">Cobertura hasta</p>
                <p class="text-3xl font-bold">\${{ tier.coverage_limit_usd }} USD</p>
              </div>

              <!-- Features list -->
              <ul class="space-y-3">
                @for (feature of tier.features; track feature) {
                  <li class="flex items-start gap-3">
                    <ion-icon
                      name="checkmark-circle"
                      class="text-lg text-success-strong mt-0.5"
                    ></ion-icon>
                    <span class="text-sm text-text-secondary">{{ feature }}</span>
                  </li>
                }
              </ul>

              <!-- CTA -->
              <button
                (click)="selectPlan(tier.tier)"
                [disabled]="isCurrentTier(tier.tier) || isDowngrade(tier.tier)"
                [class]="getCtaButtonClass(tier)"
                class="w-full py-3 rounded-xl font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                @if (isCurrentTier(tier.tier)) {
                  <span class="flex items-center justify-center gap-2">
                    <ion-icon name="checkmark-circle"></ion-icon>
                    Plan actual
                  </span>
                } @else if (isDowngrade(tier.tier)) {
                  <span class="flex items-center justify-center gap-2">
                    <ion-icon name="lock-closed"></ion-icon>
                    Plan inferior
                  </span>
                } @else if (hasActiveSubscription()) {
                  <span class="flex items-center justify-center gap-2">
                    <ion-icon name="arrow-up-circle"></ion-icon>
                    Mejorar a {{ tier.name }}
                  </span>
                } @else {
                  Unirse por \${{ tier.price_usd }}/ano
                }
              </button>
            </div>
          }
        </div>

        <!-- FAQ Section -->
        <div class="space-y-4">
          <h2 class="text-xl font-bold text-text-primary text-center">Preguntas Frecuentes</h2>

          <div class="space-y-3">
            @for (faq of faqs; track faq.question) {
              <details class="group rounded-xl border border-border-default bg-surface-raised">
                <summary class="px-5 py-4 cursor-pointer flex items-center justify-between">
                  <span class="font-medium text-text-primary">{{ faq.question }}</span>
                  <ion-icon
                    name="chevron-down"
                    class="text-text-secondary transition-transform group-open:rotate-180"
                  ></ion-icon>
                </summary>
                <div class="px-5 pb-4 text-sm text-text-secondary">
                  {{ faq.answer }}
                </div>
              </details>
            }
          </div>
        </div>

        <!-- Trust badges -->
        <div class="flex flex-wrap justify-center gap-6 py-6 border-t border-border-default">
          <div class="flex items-center gap-2 text-text-secondary">
            <ion-icon name="lock-closed" class="text-xl text-success-strong"></ion-icon>
            <span class="text-sm">Pago seguro</span>
          </div>
          <div class="flex items-center gap-2 text-text-secondary">
            <ion-icon name="refresh" class="text-xl text-primary-600"></ion-icon>
            <span class="text-sm">Cancela cuando quieras</span>
          </div>
          <div class="flex items-center gap-2 text-text-secondary">
            <ion-icon name="card" class="text-xl text-cta-default"></ion-icon>
            <span class="text-sm">MercadoPago</span>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ClubPlansPage {
  private readonly router = inject(Router);
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly analytics = inject(AnalyticsService);

  readonly tiers: SubscriptionTierConfig[] = [
    SUBSCRIPTION_TIERS['club_standard'],
    SUBSCRIPTION_TIERS['club_black'],
    SUBSCRIPTION_TIERS['club_luxury'],
  ];

  readonly faqs = [
    {
      question: 'Como funciona la cobertura del Club?',
      answer:
        'Tu membresia incluye un saldo de cobertura que se usa para cubrir el deposito de garantia en tus alquileres. Si el deposito es menor o igual a tu saldo, no pagas nada. Si es mayor, solo pagas la diferencia.',
    },
    {
      question: 'Que pasa si tengo un dano durante el alquiler?',
      answer:
        'Si hay un dano, el monto se deduce de tu saldo de cobertura. Si el dano supera tu saldo disponible, la diferencia se cobra de tu wallet o tarjeta.',
    },
    {
      question: 'Puedo cancelar mi membresia?',
      answer:
        'Si, puedes cancelar en cualquier momento. Tu membresia seguira activa hasta la fecha de vencimiento. No hay reembolsos por el tiempo no utilizado.',
    },
    {
      question: 'Que pasa cuando se agota mi saldo de cobertura?',
      answer:
        'Puedes recargar tu saldo comprando una nueva membresia o pagando el deposito normalmente hasta que renueves.',
    },
    {
      question: 'Puedo cambiar de plan?',
      answer:
        'Si, puedes upgradearte a Club Black en cualquier momento. El nuevo plan reemplaza al anterior y se extiende por un ano desde la fecha de compra.',
    },
  ];

  readonly hasActiveSubscription = this.subscriptionService.hasActiveSubscription;
  readonly subscription = this.subscriptionService.subscription;

  currentTierName(): string {
    const sub = this.subscription();
    if (!sub) return '';
    return SUBSCRIPTION_TIERS[sub.tier].name;
  }

  subscriptionExpiry(): Date {
    const sub = this.subscription();
    return sub ? new Date(sub.expires_at) : new Date();
  }

  isCurrentTier(tier: SubscriptionTier): boolean {
    const sub = this.subscription();
    return sub?.tier === tier && sub.status === 'active';
  }

  /**
   * Check if selecting this tier would be a downgrade
   * Tier hierarchy: club_standard < club_black < club_luxury
   */
  isDowngrade(tier: SubscriptionTier): boolean {
    const sub = this.subscription();
    if (!sub || sub.status !== 'active') return false;

    const tierHierarchy: Record<SubscriptionTier, number> = {
      club_standard: 1,
      club_black: 2,
      club_luxury: 3,
    };

    return tierHierarchy[tier] < tierHierarchy[sub.tier];
  }

  getPlanCardClass(tier: SubscriptionTierConfig): string {
    const base = 'border-2';
    if (tier.tier === 'club_luxury') {
      return `${base} border-amber-400 bg-gradient-to-br from-amber-900/90 to-amber-800/80 text-white`;
    }
    if (tier.tier === 'club_black') {
      return `${base} border-gray-600 bg-gradient-to-br from-gray-800 to-gray-700`;
    }
    return `${base} border-amber-500/40 bg-gradient-to-br from-amber-500/10 to-surface-raised`;
  }

  getTierIconClass(tier: SubscriptionTierConfig): string {
    if (tier.tier === 'club_luxury') {
      return 'bg-gradient-to-br from-amber-400 to-yellow-300 text-amber-900';
    }
    if (tier.tier === 'club_black') {
      return 'bg-gray-600 text-white';
    }
    return 'bg-amber-500/20 text-amber-600';
  }

  getCoverageBoxClass(tier: SubscriptionTierConfig): string {
    if (tier.tier === 'club_luxury') {
      return 'bg-amber-400/30 text-amber-100';
    }
    if (tier.tier === 'club_black') {
      return 'bg-gray-600/50 text-white';
    }
    return 'bg-amber-500/20 text-amber-700';
  }

  getCtaButtonClass(tier: SubscriptionTierConfig): string {
    if (tier.tier === 'club_luxury') {
      return 'bg-gradient-to-r from-amber-400 to-yellow-300 text-amber-900 hover:from-amber-300 hover:to-yellow-200 font-bold';
    }
    if (tier.tier === 'club_black') {
      return 'bg-white text-gray-900 hover:bg-gray-100';
    }
    return 'bg-amber-500 text-black hover:bg-amber-400';
  }

  selectPlan(tier: SubscriptionTier): void {
    this.analytics.trackEvent('club_plan_selected', { tier });
    void this.router.navigate(['/wallet/club/subscribe'], { queryParams: { tier } });
  }

  goToHistory(): void {
    void this.router.navigate(['/wallet/club/history']);
  }

  goBack(): void {
    void this.router.navigate(['/wallet']);
  }
}
