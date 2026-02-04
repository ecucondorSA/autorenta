import { Component, inject, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { SubscriptionService } from '@core/services/subscriptions/subscription.service';
import { AnalyticsService } from '@core/services/infrastructure/analytics.service';
import { SubscriptionPlan } from '@core/models/subscription.model';

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
            Alquila sin depósito de garantía. Tu membresía cubre el depósito hasta por un año.
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
          @for (plan of plans(); track plan.id) {
            <div
              [class]="getPlanCardClass(plan)"
              class="relative rounded-2xl p-6 space-y-6 transition-all hover:shadow-lg"
            >
              <!-- Popular badge -->
              @if (plan.tier === 'club_black') {
                <div class="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span class="px-4 py-1 rounded-full bg-gray-700 text-white text-xs font-bold">
                    MAS POPULAR
                  </span>
                </div>
              }
              @if (plan.tier === 'club_luxury') {
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
                  [class]="getTierIconClass(plan)"
                  class="w-14 h-14 mx-auto rounded-full flex items-center justify-center"
                >
                  <ion-icon name="shield-checkmark" class="text-2xl"></ion-icon>
                </div>
                <h3 class="text-xl font-bold">{{ plan.name }}</h3>
                <p class="text-sm opacity-80">{{ plan.description }}</p>
              </div>

              <!-- Price -->
              <div class="text-center">
                <div class="flex items-baseline justify-center gap-1">
                  <span class="text-4xl font-bold">\${{ plan.price_cents / 100 }}</span>
                  <span class="text-sm opacity-60">/mes</span>
                </div>
              </div>

              <!-- Coverage highlight -->
              <div class="rounded-xl p-4 text-center bg-white/10 border border-white/10">
                <p class="text-xs font-medium opacity-80 uppercase tracking-widest">Cobertura</p>
                <p class="text-2xl font-bold">Inscripción al Club</p>
              </div>

              <!-- Features list -->
              <ul class="space-y-3">
                <li class="flex items-start gap-3">
                  <ion-icon name="checkmark-circle" class="text-lg text-success-strong mt-0.5"></ion-icon>
                  <span class="text-sm">Sin depósito de garantía</span>
                </li>
                <li class="flex items-start gap-3">
                  <ion-icon name="checkmark-circle" class="text-lg text-success-strong mt-0.5"></ion-icon>
                  <span class="text-sm">Hold reducido al 50%</span>
                </li>
              </ul>

              <!-- CTA -->
              <button
                (click)="selectPlan(plan.tier)"
                [disabled]="isCurrentTier(plan.tier) || isDowngrade(plan.tier)"
                [class]="getCtaButtonClass(plan)"
                class="w-full py-3 rounded-xl font-bold transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                @if (isCurrentTier(plan.tier)) {
                  <span class="flex items-center justify-center gap-2">
                    <ion-icon name="checkmark-circle"></ion-icon>
                    Plan actual
                  </span>
                } @else if (isDowngrade(plan.tier)) {
                  <span class="flex items-center justify-center gap-2">
                    <ion-icon name="lock-closed"></ion-icon>
                    Plan inferior
                  </span>
                } @else {
                  Suscribirme
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
export class ClubPlansPage implements OnInit {
  private readonly router = inject(Router);
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly analytics = inject(AnalyticsService);

  readonly plans = this.subscriptionService.plans;
  readonly hasActiveSubscription = this.subscriptionService.hasActiveSubscription;
  readonly subscription = this.subscriptionService.subscription;

  readonly faqs = [
    {
      question: '¿Cómo funciona la cobertura del Club?',
      answer:
        'Tu membresía incluye un saldo de cobertura que se usa para cubrir el depósito de garantía en tus alquileres. Si el depósito es menor o igual a tu saldo, no pagás nada. Si es mayor, solo pagás la diferencia.',
    },
    {
      question: '¿Qué pasa si tengo un daño durante el alquiler?',
      answer:
        'Si hay un daño, el monto se deduce de tu saldo de cobertura. Si el daño supera tu saldo disponible, la diferencia se cobra de tu wallet o tarjeta.',
    },
    {
      question: '¿Puedo cancelar mi membresía?',
      answer:
        'Sí, podés cancelar en cualquier momento. Tu membresía seguirá activa hasta la fecha de vencimiento. No hay reembolsos por el tiempo no utilizado.',
    },
  ];

  async ngOnInit() {
    await this.subscriptionService.fetchPlans();
  }

  currentTierName(): string {
    const sub = this.subscription();
    if (!sub) return '';
    const plan = this.plans().find(p => p.tier === sub.tier);
    return plan ? plan.name : sub.tier;
  }

  subscriptionExpiry(): Date {
    const sub = this.subscription();
    return sub ? new Date(sub.expires_at) : new Date();
  }

  isCurrentTier(tierSlug: string): boolean {
    const sub = this.subscription();
    return sub?.tier === tierSlug && sub.status === 'active';
  }

  isDowngrade(tierSlug: string): boolean {
    const sub = this.subscription();
    if (!sub || sub.status !== 'active') return false;

    const currentPlan = this.plans().find(p => p.tier === sub.tier);
    const targetPlan = this.plans().find(p => p.tier === tierSlug);
    
    if (!currentPlan || !targetPlan) return false;
    return targetPlan.price_cents < currentPlan.price_cents;
  }

  getPlanCardClass(plan: SubscriptionPlan): string {
    const base = 'border-2';
    if (plan.tier === 'club_luxury') {
      return `${base} border-amber-400 bg-gradient-to-br from-amber-900/90 to-amber-800/80 text-white`;
    }
    if (plan.tier === 'club_black') {
      return `${base} border-gray-600 bg-gradient-to-br from-gray-800 to-gray-700 text-white`;
    }
    return `${base} border-amber-500/40 bg-gradient-to-br from-amber-500/5 to-surface-raised`;
  }

  getTierIconClass(plan: SubscriptionPlan): string {
    if (plan.tier === 'club_luxury') return 'bg-amber-400 text-amber-900';
    if (plan.tier === 'club_black') return 'bg-gray-600 text-white';
    return 'bg-amber-500/20 text-amber-600';
  }

  getCtaButtonClass(plan: SubscriptionPlan): string {
    if (plan.tier === 'club_luxury') return 'bg-amber-400 text-amber-900 hover:bg-amber-300';
    if (plan.tier === 'club_black') return 'bg-white text-gray-900 hover:bg-gray-100';
    return 'bg-amber-500 text-black hover:bg-amber-400';
  }

  selectPlan(tierSlug: string): void {
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
