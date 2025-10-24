import { Component, Input, Output, EventEmitter, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  RiskSnapshot,
  FxSnapshot,
  PaymentAuthorization,
  formatArs,
  formatUsd,
} from '../../../../core/models/booking-detail-payment.model';
import { PaymentAuthorizationService } from '../../../../core/services/payment-authorization.service';

/**
 * Panel para autorizar preautorización (hold) en tarjeta
 * Solo visible cuando paymentMode === 'card'
 */
@Component({
  selector: 'app-card-hold-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rounded-xl border border-pearl-gray/60 bg-white-pure shadow p-6 dark:border-neutral-800/70 dark:bg-anthracite transition-colors duration-300">
      <!-- Header -->
      <div class="flex items-start justify-between mb-4">
        <div class="flex items-center space-x-2">
          <svg class="w-6 h-6 text-blue-600 dark:text-info-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          <h3 class="text-lg font-semibold text-smoke-black dark:text-ivory-luminous">Preautorización (Hold)</h3>
        </div>
        @if (authorizationStatus() === 'authorized') {
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-success-900/30 dark:text-success-100 transition-colors">
            <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
            Autorizado
          </span>
        }
      </div>

      <!-- Amount Display -->
      <div class="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-slate-deep/80 dark:via-slate-deep/60 dark:to-slate-deep/50 border border-blue-100 dark:border-neutral-700 rounded-lg p-4 mb-4 transition-colors duration-300">
        <p class="text-sm text-gray-700 dark:text-pearl-light/80 mb-2">Monto a autorizar</p>
        <div class="flex items-baseline justify-between">
          <div>
            <p class="text-3xl font-bold text-blue-900 dark:text-info-200">
              {{ formatArs(riskSnapshot.holdEstimatedArs) }}
            </p>
            <p class="text-sm text-gray-600 dark:text-pearl-light/70 mt-1">
              ≈ {{ formatUsd(riskSnapshot.holdEstimatedUsd) }}
            </p>
          </div>
          <div class="text-right">
            <p class="text-xs text-gray-600 dark:text-pearl-light/80">Tipo de cambio</p>
            <p class="text-sm font-medium text-gray-900 dark:text-ivory-luminous">
              {{ fxSnapshot.rate.toFixed(2) }} ARS/USD
            </p>
          </div>
        </div>
      </div>

      <!-- Explanation -->
      <div class="mb-4 p-3 bg-gray-50 dark:bg-slate-deep/40 rounded-lg transition-colors duration-300">
        <p class="text-sm text-gray-700 dark:text-pearl-light/80">
          <strong>¿Qué es esto?</strong> Autorizamos un monto temporal en tu tarjeta (hold).
          No se cobra inmediatamente. Si todo está OK al devolver el auto, <strong>se libera completamente</strong>.
          Si hay consumos o daños, capturamos solo lo necesario (hasta tu franquicia).
        </p>
      </div>

      <!-- Authorization States -->
      @switch (authorizationStatus()) {
        <!-- IDLE: Sin autorización -->
        @case ('idle') {
          <button
            type="button"
            (click)="onAuthorize()"
            [disabled]="isLoading()"
            class="w-full flex justify-center items-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 dark:bg-accent-petrol dark:hover:bg-accent-petrol/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-accent-petrol/60 focus:ring-offset-ivory-soft dark:focus:ring-offset-graphite-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            @if (isLoading()) {
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white dark:text-ivory-luminous" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Autorizando...
            } @else {
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Autorizar Tarjeta
            }
          </button>
        }

        <!-- AUTHORIZED: Exitoso -->
        @case ('authorized') {
          <div class="space-y-3">
            <!-- Card Info -->
            @if (currentAuthSignal(); as auth) {
            <div class="flex items-center justify-between p-3 bg-green-50 border border-green-200 dark:bg-success-900/25 dark:border-success-700/50 rounded-lg transition-colors duration-300">
              <div class="flex items-center space-x-3">
                <div class="flex-shrink-0">
                  <svg class="w-10 h-10 text-green-600 dark:text-success-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div>
                  <p class="text-sm font-medium text-green-900 dark:text-success-50">
                    Tarjeta •••• {{ auth.cardLast4 || '****' }}
                  </p>
                  <p class="text-xs text-green-700 dark:text-success-200">
                    Expira: {{ auth.expiresAt | date: 'dd/MM/yyyy HH:mm' }}
                  </p>
                </div>
              </div>
              <button
                type="button"
                (click)="onChangeCard()"
                class="text-xs font-medium text-green-700 dark:text-success-200 hover:text-green-800 dark:hover:text-success-50 underline"
              >
                Cambiar
              </button>
            </div>
          }

            <!-- Success Message -->
            <div class="flex items-start space-x-2 p-3 bg-green-50 border border-green-100 dark:bg-success-900/25 dark:border-success-700/40 rounded-lg transition-colors duration-300">
              <svg class="w-5 h-5 text-green-600 dark:text-success-200 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
              <div class="flex-1">
                <p class="text-sm font-medium text-green-900 dark:text-success-50">Preautorización exitosa</p>
                <p class="text-xs text-green-700 dark:text-success-200 mt-1">
                  El monto quedó retenido temporalmente. Podrás ver este cargo como "pendiente" en tu estado de cuenta.
                </p>
              </div>
            </div>
          </div>
        }

        <!-- EXPIRED: Autorización expirada -->
        @case ('expired') {
          <div class="space-y-3">
            <div class="flex items-start space-x-2 p-3 bg-yellow-50 border border-yellow-200 dark:bg-warning-900/30 dark:border-warning-700/60 rounded-lg transition-colors duration-300">
              <svg class="w-5 h-5 text-yellow-600 dark:text-warning-200 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
              <div class="flex-1">
                <p class="text-sm font-medium text-yellow-900 dark:text-warning-50">Autorización expirada</p>
                <p class="text-xs text-yellow-700 dark:text-warning-200 mt-1">
                  La preautorización anterior ha expirado. Necesitas autorizar nuevamente.
                </p>
              </div>
            </div>
            <button
              type="button"
              (click)="onReauthorize()"
              [disabled]="isLoading()"
              class="w-full px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 dark:bg-warning-700 dark:hover:bg-warning-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 dark:focus:ring-warning-500 focus:ring-offset-ivory-soft dark:focus:ring-offset-graphite-dark disabled:opacity-50 transition-colors"
            >
              @if (isLoading()) {
                <span class="flex items-center justify-center">
                  <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white dark:text-ivory-luminous" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Re-autorizando...
                </span>
              } @else {
                Re-autorizar Tarjeta
              }
            </button>
          </div>
        }

        <!-- FAILED: Error -->
        @case ('failed') {
          <div class="space-y-3">
            <div class="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 dark:bg-error-900/30 dark:border-error-700/60 rounded-lg transition-colors duration-300">
              <svg class="w-5 h-5 text-red-600 dark:text-error-300 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
              <div class="flex-1">
                <p class="text-sm font-medium text-red-900 dark:text-error-100">Error al autorizar</p>
                <p class="text-xs text-red-700 dark:text-error-200 mt-1">
                  {{ errorMessage() || 'No se pudo autorizar la tarjeta. Intenta nuevamente o usa otra modalidad de pago.' }}
                </p>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                (click)="onRetry()"
                [disabled]="isLoading()"
                class="px-4 py-2 border border-gray-300 dark:border-neutral-700 text-sm font-medium rounded-md text-gray-700 dark:text-pearl-light bg-white dark:bg-slate-deep/60 hover:bg-gray-50 dark:hover:bg-slate-deep/70 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-accent-petrol/60 focus:ring-offset-ivory-soft dark:focus:ring-offset-graphite-dark transition-colors"
              >
                Reintentar
              </button>
              <button
                type="button"
                (click)="onFallbackToWallet()"
                class="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 dark:bg-neutral-500 dark:hover:bg-neutral-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-neutral-400 focus:ring-offset-ivory-soft dark:focus:ring-offset-graphite-dark transition-colors"
              >
                Usar Wallet
              </button>
            </div>
          </div>
        }
      }

      <!-- Hold Reauthorization Info (for long bookings) -->
      @if (authorizationStatus() === 'authorized' && needsReauthorizationWarning()) {
        <div class="mt-4 p-3 bg-blue-50 border border-blue-100 dark:bg-info-900/25 dark:border-info-700/40 rounded-lg transition-colors duration-300">
          <div class="flex space-x-2">
            <svg class="w-5 h-5 text-blue-600 dark:text-info-200 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
            </svg>
            <div class="flex-1">
              <p class="text-xs text-blue-800 dark:text-info-100">
                <strong>Nota:</strong> Si tu alquiler es mayor a 7 días, es posible que necesitemos re-autorizar
                la tarjeta durante el periodo de alquiler. Te notificaremos con anticipación.
              </p>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `],
})
export class CardHoldPanelComponent implements OnInit {
  @Input({ required: true }) riskSnapshot!: RiskSnapshot;
  @Input({ required: true }) fxSnapshot!: FxSnapshot;
  @Input() userId = '';
  @Input() bookingId?: string;
  @Input() currentAuthorization: PaymentAuthorization | null = null;

  @Output() authorizationChange = new EventEmitter<PaymentAuthorization | null>();
  @Output() fallbackToWallet = new EventEmitter<void>();

  private authService = inject(PaymentAuthorizationService);

  // Signals para estado reactivo
  protected authorizationStatus = signal<'idle' | 'authorized' | 'expired' | 'failed'>('idle');
  protected isLoading = signal(false);
  protected errorMessage = signal<string | null>(null);
  protected currentAuthSignal = signal<PaymentAuthorization | null>(null);

  // Computed
  protected needsReauthorizationWarning = computed(() => {
    // Si el booking es > 7 días, mostrar advertencia
    return this.bookingId ? true : false; // Simplificado
  });

  formatArs = formatArs;
  formatUsd = formatUsd;

  ngOnInit(): void {
    // Inicializar estado con autorización existente si la hay
    if (this.currentAuthorization) {
      this.currentAuthSignal.set(this.currentAuthorization);
      this.authorizationStatus.set(this.mapAuthStatus(this.currentAuthorization));
    }
  }

  /**
   * Handler: Autorizar tarjeta
   */
  protected onAuthorize(): void {
    if (!this.userId) {
      this.errorMessage.set('Error: Usuario no identificado');
      this.authorizationStatus.set('failed');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    // TODO: Obtener cardToken de Mercado Pago SDK
    // TODO: Obtener payer email del usuario
    const cardToken = 'DUMMY_TOKEN'; // Reemplazar con token real
    const payerEmail = 'user@example.com'; // Reemplazar con email real

    this.authService
      .authorizePayment({
        userId: this.userId,
        amountUsd: this.riskSnapshot.holdEstimatedUsd,
        amountArs: this.riskSnapshot.holdEstimatedArs,
        fxRate: this.fxSnapshot.rate,
        cardToken,
        payerEmail,
        description: `Preautorización para reserva${this.bookingId ? ` ${this.bookingId}` : ''}`,
        bookingId: this.bookingId,
      })
      .subscribe({
        next: (result) => {
          this.isLoading.set(false);
          if (result.ok && result.authorizedPaymentId) {
            // Éxito
            const authorization: PaymentAuthorization = {
              authorizedPaymentId: result.authorizedPaymentId,
              amountArs: this.riskSnapshot.holdEstimatedArs,
              amountUsd: this.riskSnapshot.holdEstimatedUsd,
              currency: 'ARS',
              expiresAt: result.expiresAt || new Date(),
              status: 'authorized',
              cardLast4: '4242', // Mock
              createdAt: new Date(),
            };
            this.currentAuthSignal.set(authorization);
            this.authorizationStatus.set('authorized');
            this.authorizationChange.emit(authorization);
          } else {
            // Error
            this.errorMessage.set(result.error || 'Error desconocido');
            this.authorizationStatus.set('failed');
            this.authorizationChange.emit(null);
          }
        },
        error: (error) => {
          this.isLoading.set(false);
          this.errorMessage.set(error.message || 'Error de red');
          this.authorizationStatus.set('failed');
          this.authorizationChange.emit(null);
        },
      });
  }

  /**
   * Handler: Re-autorizar (cuando expiró)
   */
  protected onReauthorize(): void {
    this.authorizationStatus.set('idle');
    this.onAuthorize();
  }

  /**
   * Handler: Reintentar (cuando falló)
   */
  protected onRetry(): void {
    this.authorizationStatus.set('idle');
    this.errorMessage.set(null);
    this.onAuthorize();
  }

  /**
   * Handler: Cambiar tarjeta
   */
  protected onChangeCard(): void {
    // Cancelar autorización actual y empezar de nuevo
    const currentAuth = this.currentAuthSignal();
    if (currentAuth) {
      this.authService.cancelAuthorization(currentAuth.authorizedPaymentId).subscribe({
        next: () => {
          this.currentAuthSignal.set(null);
          this.authorizationStatus.set('idle');
          this.authorizationChange.emit(null);
        },
        error: (error) => {
          console.error('Error canceling authorization:', error);
          // Continuar de todos modos
          this.currentAuthSignal.set(null);
          this.authorizationStatus.set('idle');
          this.authorizationChange.emit(null);
        },
      });
    }
  }

  /**
   * Handler: Fallback a wallet
   */
  protected onFallbackToWallet(): void {
    this.fallbackToWallet.emit();
  }

  /**
   * Mapea PaymentAuthorization a status
   */
  private mapAuthStatus(auth: PaymentAuthorization): 'idle' | 'authorized' | 'expired' | 'failed' {
    if (auth.status === 'authorized' && !this.authService.isAuthorizationExpired(auth)) {
      return 'authorized';
    }
    if (auth.status === 'expired' || this.authService.isAuthorizationExpired(auth)) {
      return 'expired';
    }
    if (auth.status === 'failed') {
      return 'failed';
    }
    return 'idle';
  }
}
