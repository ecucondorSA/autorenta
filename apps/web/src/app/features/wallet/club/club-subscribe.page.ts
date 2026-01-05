import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import {
  SubscriptionTier,
  SUBSCRIPTION_TIERS,
  SubscriptionTierConfig,
} from '@core/models/subscription.model';
import { SubscriptionService } from '@core/services/subscriptions/subscription.service';
import { AnalyticsService } from '@core/services/infrastructure/analytics.service';
import { NotificationManagerService } from '@core/services/infrastructure/notification-manager.service';
import { environment } from '../../../../environments/environment';

declare global {
  interface Window {
    MercadoPago: any;
  }
}

@Component({
  selector: 'app-club-subscribe',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonicModule],
  template: `
    <div class="min-h-screen bg-surface-base py-6 px-4">
      <div class="max-w-xl mx-auto space-y-6">
        <!-- Header -->
        <div class="text-center space-y-4">
          <button
            (click)="goBack()"
            class="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition"
          >
            <ion-icon name="arrow-back" class="text-xl"></ion-icon>
            Volver a planes
          </button>

          <h1 class="text-2xl font-bold text-text-primary">Confirmar Suscripcion</h1>
        </div>

        @if (selectedTier(); as tier) {
          <!-- Selected plan summary -->
          <div [class]="getSummaryCardClass()" class="rounded-2xl p-6 space-y-4">
            <div class="flex items-center gap-4">
              <div [class]="getTierIconClass()" class="w-14 h-14 rounded-full flex items-center justify-center">
                <ion-icon name="shield-checkmark" class="text-2xl"></ion-icon>
              </div>
              <div class="flex-1">
                <h3 class="text-lg font-bold" [class]="getTierTextClass()">{{ tier.name }}</h3>
                <p class="text-sm opacity-70">Membresia anual</p>
              </div>
              <div class="text-right">
                <p class="text-2xl font-bold" [class]="getTierTextClass()">\${{ tier.price_usd }}</p>
                <p class="text-xs opacity-70">USD/ano</p>
              </div>
            </div>

            <div class="border-t border-white/20 pt-4 space-y-2">
              <div class="flex justify-between text-sm">
                <span class="opacity-70">Cobertura incluida</span>
                <span class="font-semibold">\${{ tier.coverage_limit_usd }} USD</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="opacity-70">Vigencia</span>
                <span class="font-semibold">12 meses</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="opacity-70">Renovacion</span>
                <span class="font-semibold">Manual (sin auto-cobro)</span>
              </div>
            </div>
          </div>

          <!-- Benefits reminder -->
          <div class="rounded-xl border border-border-default bg-surface-raised p-4">
            <h4 class="font-semibold text-text-primary mb-3">Lo que incluye tu membresia:</h4>
            <ul class="space-y-2">
              @for (feature of tier.features; track feature) {
                <li class="flex items-start gap-2 text-sm text-text-secondary">
                  <ion-icon name="checkmark-circle" class="text-success-strong mt-0.5"></ion-icon>
                  {{ feature }}
                </li>
              }
            </ul>
          </div>

          <!-- Payment section -->
          <div class="rounded-xl border border-border-default bg-surface-raised p-6 space-y-4">
            <h4 class="font-semibold text-text-primary">Metodo de pago</h4>

            <!-- MercadoPago button container -->
            <div id="wallet_container" class="min-h-[50px]"></div>

            @if (loading()) {
              <div class="flex items-center justify-center py-8">
                <ion-spinner name="crescent" class="text-cta-default"></ion-spinner>
                <span class="ml-2 text-text-secondary">Preparando pago...</span>
              </div>
            }

            @if (error()) {
              <div class="rounded-lg bg-error-bg border border-error-border p-4">
                <div class="flex items-start gap-3">
                  <ion-icon name="alert-circle" class="text-xl text-error-strong"></ion-icon>
                  <div>
                    <p class="font-medium text-error-strong">Error al procesar</p>
                    <p class="text-sm text-error-strong/80">{{ error() }}</p>
                    <button
                      (click)="initializePayment()"
                      class="mt-2 text-sm font-medium underline text-error-strong"
                    >
                      Reintentar
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- Terms -->
          <div class="text-center space-y-2">
            <p class="text-xs text-text-muted">
              Al continuar, aceptas los
              <a href="/legal/terms" class="underline">Terminos del Servicio</a>
              y la
              <a href="/legal/privacy" class="underline">Politica de Privacidad</a>
              de Autorentar Club.
            </p>
            <p class="text-xs text-text-muted">
              Tu membresia se activa inmediatamente despues del pago exitoso.
            </p>
          </div>

          <!-- Security badges -->
          <div class="flex items-center justify-center gap-4 py-4">
            <div class="flex items-center gap-1 text-text-muted">
              <ion-icon name="lock-closed" class="text-success-strong"></ion-icon>
              <span class="text-xs">Pago seguro</span>
            </div>
            <div class="flex items-center gap-1 text-text-muted">
              <ion-icon name="shield-checkmark" class="text-primary-600"></ion-icon>
              <span class="text-xs">SSL 256-bit</span>
            </div>
          </div>
        } @else {
          <!-- No tier selected -->
          <div class="text-center py-12">
            <ion-icon name="alert-circle" class="text-6xl text-warning-text"></ion-icon>
            <p class="text-text-secondary mt-4">No se selecciono ningun plan.</p>
            <button
              (click)="goToPlans()"
              class="mt-4 px-6 py-2 rounded-lg bg-cta-default text-cta-text font-semibold"
            >
              Ver planes disponibles
            </button>
          </div>
        }
      </div>
    </div>
  `,
})
export class ClubSubscribePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly analytics = inject(AnalyticsService);
  private readonly toast = inject(NotificationManagerService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly selectedTier = signal<SubscriptionTierConfig | null>(null);

  private mp: any = null;

  ngOnInit(): void {
    const tierParam = this.route.snapshot.queryParamMap.get('tier') as SubscriptionTier | null;

    if (tierParam && SUBSCRIPTION_TIERS[tierParam]) {
      this.selectedTier.set(SUBSCRIPTION_TIERS[tierParam]);
      this.analytics.trackEvent('club_subscribe_page_viewed', { tier: tierParam });
      void this.initializePayment();
    }
  }

  async initializePayment(): Promise<void> {
    const tier = this.selectedTier();
    if (!tier) return;

    this.loading.set(true);
    this.error.set(null);

    try {
      // Create preference on backend
      const preferenceId = await this.subscriptionService.createSubscriptionPreference(tier.tier);

      // Load MercadoPago SDK
      await this.loadMercadoPagoSDK();

      // Initialize Wallet Brick
      this.mp = new window.MercadoPago(environment.mercadopagoPublicKey, {
        locale: 'es-AR',
      });

      const bricksBuilder = this.mp.bricks();

      await bricksBuilder.create('wallet', 'wallet_container', {
        initialization: {
          preferenceId: preferenceId,
          redirectMode: 'modal',
        },
        customization: {
          texts: {
            action: 'pay',
            valueProp: 'security_details',
          },
          visual: {
            buttonBackground: 'black',
            borderRadius: '12px',
          },
        },
        callbacks: {
          onReady: () => {
            this.loading.set(false);
          },
          onSubmit: () => {
            this.analytics.trackEvent('club_payment_submitted', { tier: tier.tier });
          },
          onError: (error: any) => {
            console.error('MercadoPago error:', error);
            this.error.set('Error al procesar el pago. Por favor intenta nuevamente.');
            this.loading.set(false);
          },
        },
      });
    } catch (err) {
      console.error('Payment initialization error:', err);
      this.error.set('No se pudo inicializar el pago. Intenta mas tarde.');
      this.loading.set(false);
    }
  }

  private loadMercadoPagoSDK(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.MercadoPago) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://sdk.mercadopago.com/js/v2';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load MercadoPago SDK'));
      document.head.appendChild(script);
    });
  }

  getSummaryCardClass(): string {
    const tier = this.selectedTier();
    if (tier?.tier === 'club_black') {
      return 'bg-gradient-to-br from-gray-900 to-gray-800 text-white';
    }
    return 'bg-gradient-to-br from-amber-500 to-amber-600 text-white';
  }

  getTierIconClass(): string {
    const tier = this.selectedTier();
    if (tier?.tier === 'club_black') {
      return 'bg-white/20 text-white';
    }
    return 'bg-white/30 text-white';
  }

  getTierTextClass(): string {
    return 'text-white';
  }

  goBack(): void {
    void this.router.navigate(['/wallet/club/plans']);
  }

  goToPlans(): void {
    void this.router.navigate(['/wallet/club/plans']);
  }
}
