import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  signal,
  computed,
  inject,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  RiskSnapshot,
  WalletLock,
  FxSnapshot,
  formatUsd,
  formatArs,
} from '../../../../core/models/booking-detail-payment.model';
import { WalletService } from '../../../../core/services/wallet.service';
import { ReembolsabilityBadgeComponent } from './reembolsability-badge.component';

/**
 * Panel para gestionar Crédito de Seguridad (wallet no retirable)
 * Solo visible cuando paymentMode === 'wallet'
 */
@Component({
  selector: 'app-credit-security-panel',
  standalone: true,
  imports: [CommonModule, ReembolsabilityBadgeComponent],
  template: `
    <div
      class="rounded-xl border border-pearl-gray/60 bg-white-pure shadow p-6 dark:border-neutral-800/70 dark:bg-anthracite transition-colors duration-300"
    >
      <!-- Header -->
      <div class="flex items-start justify-between mb-4">
        <div class="flex items-center space-x-2">
          <svg
            class="w-6 h-6 text-purple-600 dark:text-purple-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <h3 class="text-lg font-semibold text-smoke-black dark:text-ivory-luminous">
            Garantía con Wallet
          </h3>
        </div>
        @if (lockStatus() === 'locked') {
          <span
            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-success-900/30 dark:text-success-100 transition-colors"
          >
            <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clip-rule="evenodd"
              />
            </svg>
            Bloqueado
          </span>
        }
      </div>

      <!-- Amount Required -->
      <div
        class="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-900/10 rounded-lg p-4 mb-4 transition-colors duration-300"
      >
        <p class="text-sm text-gray-700 dark:text-pearl-light/70 mb-2">
          Garantía con Wallet requerida
        </p>
        <div class="flex items-baseline justify-between mb-3">
          <div>
            <p class="text-3xl font-bold text-purple-900 dark:text-purple-200">
              {{ formatArs(creditSecurityArs()) }}
            </p>
            <p class="text-xs text-gray-600 dark:text-pearl-light/60 mt-1">
              ≈ {{ formatUsd(riskSnapshot.creditSecurityUsd) }}
            </p>
          </div>
          <div class="text-right">
            <p class="text-xs text-gray-600 dark:text-pearl-light/60">
              {{ riskSnapshot.vehicleValueUsd <= 20000 ? 'Autos ≤ $20k' : 'Autos > $20k' }}
            </p>
            <p class="text-xs text-gray-500 dark:text-pearl-light/50 mt-1">
              TC: {{ fxSnapshot.rate | number:'1.2-2' }} ARS/USD
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <app-reembolsability-badge
            type="no-reembolsable"
            customTooltip="Este monto queda bloqueado en tu wallet (no puedes retirarlo a tu banco)."
          ></app-reembolsability-badge>
          <app-reembolsability-badge
            type="reutilizable"
            customTooltip="Si no se usa para daños, queda disponible como saldo para futuras reservas en AutoRenta."
          ></app-reembolsability-badge>
        </div>
      </div>

      <!-- Explanation -->
      <div
        class="mb-4 p-3 bg-gray-50 dark:bg-slate-deep/40 rounded-lg transition-colors duration-300"
      >
        <p class="text-sm text-gray-700 dark:text-pearl-light/80">
          <strong>¿Cómo funciona?</strong> Este monto queda como saldo de garantía en tu wallet
          (no puedes retirarlo a tu banco, pero puedes usarlo en futuras reservas). Si hay daños, se
          descuenta automáticamente. Si no hay daños, el saldo queda disponible para tu próxima reserva.
        </p>
      </div>

      <!-- Current Balance & Status -->
      @if (isCheckingBalance()) {
        <!-- Loading Balance -->
        <div class="flex items-center justify-center py-8">
          <svg
            class="animate-spin h-8 w-8 text-purple-600 dark:text-purple-300"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            ></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span class="ml-3 text-sm text-gray-600 dark:text-pearl-light/70"
            >Verificando saldo...</span
          >
        </div>
      } @else {
        <!-- Balance Info -->
        <div
          class="mb-4 p-4 bg-gray-50 border border-gray-200 dark:bg-slate-deep/40 dark:border-neutral-700 rounded-lg transition-colors duration-300"
        >
          <div class="space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-gray-600 dark:text-pearl-light/70">Crédito disponible:</span>
              <span class="font-semibold text-gray-900 dark:text-ivory-luminous">
                {{ formatUsd(currentProtectedCredit()) }}
              </span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-600 dark:text-pearl-light/70">Crédito requerido:</span>
              <span class="font-semibold text-gray-900 dark:text-ivory-luminous">
                {{ formatUsd(riskSnapshot.creditSecurityUsd) }}
              </span>
            </div>
            <div class="h-px bg-gray-300 dark:bg-neutral-700"></div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-700 dark:text-pearl-light/80 font-medium">
                {{ creditDifference() >= 0 ? 'Te sobra:' : 'Te falta:' }}
              </span>
              <span
                class="font-bold"
                [ngClass]="
                  creditDifference() >= 0
                    ? 'text-green-600 dark:text-success-200'
                    : 'text-red-600 dark:text-error-200'
                "
              >
                {{ formatUsd(Math.abs(creditDifference())) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Action based on status -->
        @switch (lockStatus()) {
          <!-- SUFFICIENT: Puede bloquear -->
          @case ('sufficient') {
            <button
              type="button"
              (click)="onLockFunds()"
              [disabled]="isLoading()"
              class="w-full flex justify-center items-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:ring-offset-ivory-soft dark:focus:ring-offset-graphite-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              @if (isLoading()) {
                <svg
                  class="animate-spin -ml-1 mr-3 h-5 w-5 text-white dark:text-ivory-luminous"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  ></circle>
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Bloqueando fondos...
              } @else {
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                Bloquear Crédito de Seguridad
              }
            </button>
          }

          <!-- INSUFFICIENT: Necesita cargar -->
          @case ('insufficient') {
            <div class="space-y-3">
              <div
                class="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 dark:bg-error-900/30 dark:border-error-700/60 rounded-lg transition-colors duration-300"
              >
                <svg
                  class="w-5 h-5 text-red-600 dark:text-error-300 flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clip-rule="evenodd"
                  />
                </svg>
                <div class="flex-1">
                  <p class="text-sm font-medium text-red-900 dark:text-error-100">
                    Crédito insuficiente
                  </p>
                  <p class="text-xs text-red-700 dark:text-error-200 mt-1">
                    Necesitas cargar {{ formatUsd(Math.abs(creditDifference())) }} adicionales.
                  </p>
                </div>
              </div>
              <button
                type="button"
                (click)="onLoadCredit()"
                class="w-full px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:ring-offset-ivory-soft dark:focus:ring-offset-graphite-dark transition-colors"
              >
                <svg
                  class="w-5 h-5 inline-block mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                Cargar Ahora
              </button>
            </div>
          }

          <!-- LOCKED: Ya está bloqueado -->
          @case ('locked') {
            <div class="space-y-3">
              <div
                class="flex items-start space-x-2 p-3 bg-green-50 border border-green-200 dark:bg-success-900/25 dark:border-success-700/60 rounded-lg transition-colors duration-300"
              >
                <svg
                  class="w-5 h-5 text-green-600 dark:text-success-200 flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clip-rule="evenodd"
                  />
                </svg>
                <div class="flex-1">
                  <p class="text-sm font-medium text-green-900 dark:text-success-50">
                    Crédito bloqueado
                  </p>
                  <p class="text-xs text-green-700 dark:text-success-200 mt-1">
                    El Crédito de Seguridad de {{ formatUsd(riskSnapshot.creditSecurityUsd) }} está
                    bloqueado correctamente para esta reserva.
                  </p>
                </div>
              </div>
              @if (currentLock(); as lock) {
                <div
                  class="p-3 bg-gray-50 dark:bg-slate-deep/40 rounded-lg transition-colors duration-300"
                >
                  <p class="text-xs text-gray-600 dark:text-pearl-light/70">
                    Lock ID: <span class="font-mono">{{ lock.lockId }}</span>
                  </p>
                </div>
              }
            </div>
          }

          <!-- ERROR -->
          @case ('error') {
            <div class="space-y-3">
              <div
                class="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 dark:bg-error-900/30 dark:border-error-700/60 rounded-lg transition-colors duration-300"
              >
                <svg
                  class="w-5 h-5 text-red-600 dark:text-error-300 flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clip-rule="evenodd"
                  />
                </svg>
                <div class="flex-1">
                  <p class="text-sm font-medium text-red-900 dark:text-error-100">Error</p>
                  <p class="text-xs text-red-700 dark:text-error-200 mt-1">
                    {{ errorMessage() || 'Ocurrió un error. Intenta nuevamente.' }}
                  </p>
                </div>
              </div>
              <button
                type="button"
                (click)="onRetry()"
                class="w-full px-4 py-2 border border-gray-300 dark:border-neutral-700 text-sm font-medium rounded-md text-gray-700 dark:text-pearl-light bg-white dark:bg-slate-deep/60 hover:bg-gray-50 dark:hover:bg-slate-deep/70 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:ring-offset-ivory-soft dark:focus:ring-offset-graphite-dark transition-colors"
              >
                Reintentar
              </button>
            </div>
          }
        }
      }

      <!-- Info adicional -->
      <div
        class="mt-4 p-3 bg-blue-50 border border-blue-100 dark:bg-info-900/25 dark:border-info-700/40 rounded-lg transition-colors duration-300"
      >
        <div class="flex space-x-2">
          <svg
            class="w-5 h-5 text-blue-600 dark:text-info-200 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fill-rule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clip-rule="evenodd"
            />
          </svg>
          <div class="flex-1">
            <p class="text-xs text-blue-800 dark:text-info-100">
              <strong>Waterfall de cobro:</strong> Si hay daños/consumos, cobramos en este orden: 1)
              Crédito de Seguridad, 2) Top-up adicional, 3) FGO (hasta $800), 4) Recupero.
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
    `,
  ],
})
export class CreditSecurityPanelComponent implements OnInit {
  @Input({ required: true }) riskSnapshot!: RiskSnapshot;
  @Input({ required: true }) fxSnapshot!: FxSnapshot;
  @Input() userId = '';
  @Input() bookingId?: string;
  @Input() currentLockInput: WalletLock | null = null;

  @Output() lockChange = new EventEmitter<WalletLock | null>();
  @Output() needsTopUp = new EventEmitter<number>(); // Emit amount needed

  private walletService = inject(WalletService);

  // Signals
  protected lockStatus = signal<'checking' | 'sufficient' | 'insufficient' | 'locked' | 'error'>(
    'checking',
  );
  protected isLoading = signal(false);
  protected isCheckingBalance = signal(true);
  protected errorMessage = signal<string | null>(null);
  protected currentProtectedCredit = signal(0);
  protected currentLock = signal<WalletLock | null>(null);

  // Computed
  protected creditDifference = computed(() => {
    return this.currentProtectedCredit() - this.riskSnapshot.creditSecurityUsd;
  });

  protected creditSecurityArs = computed(() => {
    return this.riskSnapshot.creditSecurityUsd * this.fxSnapshot.rate;
  });

  formatUsd = formatUsd;
  formatArs = formatArs;
  Math = Math;

  constructor() {
    // Effect para actualizar cuando cambia el balance del wallet service
    effect(() => {
      const balance = this.walletService.balance();
      if (balance) {
        this.currentProtectedCredit.set(balance.protected_credit_balance || 0);
        this.updateLockStatus();
      }
    });
  }

  async ngOnInit(): Promise<void> {
    // Inicializar lock si existe
    if (this.currentLockInput) {
      this.currentLock.set(this.currentLockInput);
      this.lockStatus.set('locked');
      this.isCheckingBalance.set(false);
      return;
    }

    // Obtener balance actual
    await this.fetchBalance();
  }

  /**
   * Obtiene el balance del wallet
   */
  private async fetchBalance(): Promise<void> {
    this.isCheckingBalance.set(true);
    this.errorMessage.set(null);

    this.walletService.getBalance().subscribe({
      next: (balance) => {
        this.currentProtectedCredit.set(balance.protected_credit_balance || 0);
        this.updateLockStatus();
        this.isCheckingBalance.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(error instanceof Error ? error.message : 'Error al obtener balance');
        this.lockStatus.set('error');
        this.isCheckingBalance.set(false);
      },
    });
  }

  /**
   * Actualiza el estado según el balance actual
   */
  private updateLockStatus(): void {
    const difference = this.creditDifference();

    if (this.currentLock()) {
      this.lockStatus.set('locked');
    } else if (difference >= 0) {
      this.lockStatus.set('sufficient');
    } else {
      this.lockStatus.set('insufficient');
      // Emit evento para que parent sepa cuánto falta
      this.needsTopUp.emit(Math.abs(difference));
    }
  }

  /**
   * Handler: Bloquear fondos
   */
  protected async onLockFunds(): Promise<void> {
    if (!this.userId) {
      this.errorMessage.set('Error: Usuario no identificado');
      this.lockStatus.set('error');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.walletService
      .lockFunds(
        this.bookingId || '',
        this.riskSnapshot.creditSecurityUsd,
        `Crédito de Seguridad para reserva${this.bookingId ? ` ${this.bookingId}` : ''}`,
      )
      .subscribe({
        next: (result) => {
          if (!result || !result.transaction_id) {
            throw new Error('Error al bloquear fondos');
          }

          // Crear WalletLock
          const lock: WalletLock = {
            lockId: result.transaction_id,
            userId: this.userId,
            amountUsd: this.riskSnapshot.creditSecurityUsd,
            reason: `Crédito de Seguridad para reserva${this.bookingId ? ` ${this.bookingId}` : ''}`,
            status: 'locked',
            isWithdrawable: false,
            createdAt: new Date(),
          };

          this.currentLock.set(lock);
          this.lockStatus.set('locked');
          this.lockChange.emit(lock);
          this.isLoading.set(false);
        },
        error: (error: unknown) => {
          this.errorMessage.set(
            error instanceof Error ? error.message : 'Error al bloquear fondos',
          );
          this.lockStatus.set('error');
          this.lockChange.emit(null);
          this.isLoading.set(false);
        },
      });
  }

  /**
   * Handler: Cargar crédito
   */
  protected onLoadCredit(): void {
    const amountNeeded = Math.abs(this.creditDifference());

    // Iniciar depósito NO retirable
    this.walletService
      .initiateDeposit({
        amount: Math.ceil(amountNeeded), // Redondear hacia arriba
        provider: 'mercadopago',
        description: 'Carga de Crédito de Seguridad',
        allowWithdrawal: false, // ← CLAVE: NO retirable
      })
      .subscribe({
        next: (result) => {
          if (result.success && result.payment_url) {
            // Redirigir a MercadoPago
            window.location.href = result.payment_url;
          } else {
            throw new Error(result.message || 'Error al iniciar depósito');
          }
        },
        error: (error: unknown) => {
          this.errorMessage.set(error instanceof Error ? error.message : 'Error al cargar crédito');
          this.lockStatus.set('error');
        },
      });
  }

  /**
   * Handler: Reintentar
   */
  protected async onRetry(): Promise<void> {
    this.lockStatus.set('checking');
    this.errorMessage.set(null);
    await this.fetchBalance();
  }
}
