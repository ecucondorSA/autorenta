import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import type { Car } from '../../../core/models';
import { WalletService } from '../../../core/services/wallet.service';
import { MoneyPipe } from '../../pipes/money.pipe';

export interface QuickBookingData {
  carId: string;
  startDate: Date;
  endDate: Date;
  paymentMethod: 'wallet' | 'cash' | 'transfer';
  totalPrice: number;
  currency: string;
}

type QuickDuration = 'today_2h' | 'today_4h' | 'tomorrow_1d' | 'weekend' | 'week';

interface DurationOption {
  id: QuickDuration;
  label: string;
  description: string;
  startDate: Date;
  endDate: Date;
  hours: number;
}

/**
 * Quick Booking Modal Component
 *
 * Optimized for rapid P2P booking without credit card:
 * - Quick date/time selection (today/tomorrow presets)
 * - Clear price summary
 * - Payment methods: Wallet, Cash, Transfer (no credit card)
 * - Minimalist, neutral design
 * - Real-time availability validation
 */
@Component({
  selector: 'app-quick-booking-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, MoneyPipe],
  template: `
    <div
      *ngIf="isOpen"
      class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-surface-overlay/50 backdrop-blur-sm"
      (click)="handleBackdropClick($event)"
    >
      <div
        class="bg-surface-raised rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
        (click)="$event.stopPropagation()"
      >
        <!-- Header -->
        <div class="sticky top-0 bg-surface-raised border-b border-border-default px-6 py-4 flex items-center justify-between z-10">
          <h2 class="h3 text-text-primary">Reserva rápida</h2>
          <button
            type="button"
            (click)="handleCancel()"
            class="text-text-muted hover:text-text-secondary transition-colors"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="px-6 py-5 stack-lg">
          <!-- Car Info -->
          <div class="flex items-center gap-4 p-4 bg-surface-base rounded-xl">
            <img
              *ngIf="carPhotoUrl()"
              [src]="carPhotoUrl()"
              [alt]="carTitle()"
              class="w-20 h-20 rounded-lg object-cover"
            />
            <div class="flex-1 min-w-0">
              <h3 class="h5 text-text-primary truncate">
                {{ carTitle() }}
              </h3>
              <p class="text-sm text-text-secondary">
                {{ car.price_per_day | money: (car.currency || 'ARS') }}/día
              </p>
            </div>
          </div>

          <!-- Duration Selection -->
          <div class="stack-xs">
            <label class="block text-sm font-semibold text-text-primary">
              ¿Cuándo lo necesitas?
            </label>
            <div class="grid grid-cols-1 gap-2">
              <button
                *ngFor="let option of durationOptions()"
                type="button"
                (click)="selectDuration(option.id)"
                [class.ring-2]="selectedDuration() === option.id"
                [class.ring-blue-600]="selectedDuration() === option.id"
                [class.bg-cta-default/10]="selectedDuration() === option.id"
                class="text-left p-3 rounded-lg border border-border-default hover:border-cta-default/50 transition-all"
              >
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-semibold text-text-primary">{{ option.label }}</p>
                    <p class="text-xs text-text-secondary mt-0.5">{{ option.description }}</p>
                  </div>
                  <div class="text-right">
                    <p class="text-sm font-bold text-text-primary">
                      {{ calculatePrice(option.hours) | money: (car.currency || 'ARS') }}
                    </p>
                    <p class="text-xs text-text-secondary">{{ option.hours }}h</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <!-- Wallet Warning -->
          <div
            *ngIf="shouldForceWalletNavigation()"
            class="p-3 bg-warning-bg border border-warning-border rounded-lg text-sm text-warning-strong"
          >
            <div class="flex items-center gap-2">
              <svg class="w-5 h-5 text-warning-strong" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clip-rule="evenodd"
                />
              </svg>
              <span class="font-semibold">Saldo insuficiente</span>
            </div>
            <p class="mt-1 text-xs">
              Necesitas al menos 300 USD en tu wallet para continuar. Serás redirigido para cargar fondos.
            </p>
          </div>

          <!-- Payment Method -->
          <div class="stack-xs">
            <label class="block text-sm font-semibold text-text-primary">
              Método de pago
            </label>
            <div class="stack-sm">
              <!-- Wallet -->
              <button
                type="button"
                (click)="selectPaymentMethod('wallet')"
                [disabled]="!hasWalletBalance()"
                [class.ring-2]="selectedPaymentMethod() === 'wallet'"
                [class.ring-blue-600]="selectedPaymentMethod() === 'wallet'"
                [class.bg-cta-default/10]="selectedPaymentMethod() === 'wallet'"
                [class.opacity-50]="!hasWalletBalance()"
                [class.cursor-not-allowed]="!hasWalletBalance()"
                class="w-full text-left p-3 rounded-lg border border-border-default hover:border-cta-default/50 transition-all"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-success-light/20 flex items-center justify-center">
                      <svg class="w-5 h-5 text-success-light" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"
                        />
                        <path
                          fill-rule="evenodd"
                          d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"
                          clip-rule="evenodd"
                        />
                      </svg>
                    </div>
                  <div class="stack-xs">
                    <p class="text-sm font-semibold text-text-primary">Wallet AutoRenta</p>
                    <p class="text-xs text-text-secondary">
                      Saldo: {{ walletBalance() | money: (car.currency || 'ARS') }}
                      </p>
                    </div>
                  </div>
                  <svg
                    *ngIf="hasWalletBalance()"
                    class="w-5 h-5 text-success-light"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </div>
              </button>

              <!-- Cash -->
              <button
                type="button"
                (click)="selectPaymentMethod('cash')"
                [class.ring-2]="selectedPaymentMethod() === 'cash'"
                [class.ring-blue-600]="selectedPaymentMethod() === 'cash'"
                [class.bg-cta-default/10]="selectedPaymentMethod() === 'cash'"
                class="w-full text-left p-3 rounded-lg border border-border-default hover:border-cta-default/50 transition-all"
              >
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-cta-default/20 flex items-center justify-center">
                    <svg class="w-5 h-5 text-cta-default" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fill-rule="evenodd"
                        d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-text-primary">Efectivo</p>
                    <p class="text-xs text-text-secondary">Paga al retirar el auto</p>
                  </div>
                </div>
              </button>

              <!-- Credit Card -->
              <button
                type="button"
                (click)="selectPaymentMethod('transfer')"
                [class.ring-2]="selectedPaymentMethod() === 'transfer'"
                [class.ring-blue-600]="selectedPaymentMethod() === 'transfer'"
                [class.bg-cta-default/10]="selectedPaymentMethod() === 'transfer'"
                class="w-full text-left p-3 rounded-lg border border-border-default hover:border-cta-default/50 transition-all"
              >
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-cta-default/20 flex items-center justify-center">
                    <svg class="w-5 h-5 text-cta-default" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"
                      />
                      <path
                        fill-rule="evenodd"
                        d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-text-primary">Tarjeta de crédito</p>
                    <p class="text-xs text-text-secondary">Se preautoriza 600 USD</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <!-- Price Summary -->
          <div class="bg-surface-base rounded-xl p-4 stack-xs">
            <div class="flex items-center justify-between text-sm">
              <span class="text-text-secondary">Subtotal</span>
              <span class="font-semibold text-text-primary">
                {{ totalPrice() | money: (car.currency || 'ARS') }}
              </span>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="text-text-secondary">Comisión (10%)</span>
              <span class="font-semibold text-text-primary">
                {{ platformFee() | money: (car.currency || 'ARS') }}
              </span>
            </div>
            <div class="border-t border-border-default pt-2 mt-2">
              <div class="flex items-center justify-between">
                <span class="text-base font-bold text-text-primary">Total</span>
                <span class="h4 text-cta-default">
                  {{ totalWithFees() | money: (car.currency || 'ARS') }}
                </span>
              </div>
            </div>
          </div>

          <!-- No Credit Card Badge -->
          <div class="flex items-center justify-center gap-2 text-sm text-text-secondary py-2 bg-success-light/10 rounded-lg">
            <svg class="w-5 h-5 text-success-light" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clip-rule="evenodd"
              />
            </svg>
            <span class="font-semibold">No necesitas tarjeta de crédito</span>
          </div>

          <!-- Error Message -->
          <div
            *ngIf="errorMessage()"
            class="p-3 bg-error-bg border border-error-border rounded-lg text-sm text-error-strong"
          >
            {{ errorMessage() }}
          </div>
        </div>

        <!-- Footer -->
        <div class="sticky bottom-0 bg-surface-raised border-t border-border-default px-6 py-4 flex gap-3">
          <button
            type="button"
            (click)="handleCancel()"
            class="flex-1 py-3 px-4 rounded-lg border border-border-muted text-text-primary font-semibold hover:bg-surface-base transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            (click)="handleConfirm()"
            [disabled]="!canConfirm() || loading()"
            [class.opacity-50]="!canConfirm() || loading()"
            [class.cursor-not-allowed]="!canConfirm() || loading()"
            class="flex-1 py-3 px-4 rounded-lg bg-cta-default hover:bg-cta-default text-cta-text font-semibold transition-colors shadow-sm hover:shadow-md flex items-center justify-center gap-2"
          >
            <svg
              *ngIf="loading()"
              class="animate-spin h-5 w-5"
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
            <span>{{ loading() ? 'Procesando...' : 'Confirmar reserva' }}</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      /* Smooth modal animation */
      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(100%);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @media (min-width: 640px) {
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      }

      .fixed > div {
        animation: slideUp 0.3s ease-out;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuickBookingModalComponent implements OnInit {
  @Input({ required: true }) car!: Car;
  @Input() userLocation?: { lat: number; lng: number };
  @Input() isOpen = false;

  @Output() readonly confirmBooking = new EventEmitter<QuickBookingData>();
  @Output() readonly cancelBooking = new EventEmitter<void>();

  private readonly walletService = inject(WalletService);
  private readonly router = inject(Router);

  readonly selectedDuration = signal<QuickDuration>('today_2h');
  readonly selectedPaymentMethod = signal<'wallet' | 'cash' | 'transfer'>('wallet');
  readonly walletBalance = signal<number>(0);
  readonly loading = signal(false);
  readonly errorMessage = signal<string>('');

  readonly carTitle = computed(() => {
    return `${this.car.brand_text_backup || ''} ${this.car.model_text_backup || ''}`.trim();
  });

  readonly carPhotoUrl = computed(() => {
    const photos = this.car.photos ?? this.car.car_photos ?? [];
    if (Array.isArray(photos) && photos.length > 0) {
      const firstPhoto = photos[0];
      return typeof firstPhoto === 'string'
        ? firstPhoto
        : (((firstPhoto as unknown as Record<string, unknown>)?.['url'] as string) ?? null);
    }
    return null;
  });

  readonly durationOptions = computed<DurationOption[]>(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const options: DurationOption[] = [
      {
        id: 'today_2h',
        label: 'Hoy - 2 horas',
        description: 'Retira en 30 minutos',
        startDate: new Date(now.getTime() + 30 * 60000),
        endDate: new Date(now.getTime() + 150 * 60000), // 2.5 hours
        hours: 2,
      },
      {
        id: 'today_4h',
        label: 'Hoy - 4 horas',
        description: 'Retira en 30 minutos',
        startDate: new Date(now.getTime() + 30 * 60000),
        endDate: new Date(now.getTime() + 270 * 60000), // 4.5 hours
        hours: 4,
      },
      {
        id: 'tomorrow_1d',
        label: 'Mañana - 1 día',
        description: 'Retira mañana a las 9:00',
        startDate: new Date(tomorrow.getTime() + 9 * 3600000),
        endDate: new Date(tomorrow.getTime() + 33 * 3600000), // +24h
        hours: 24,
      },
      {
        id: 'weekend',
        label: 'Fin de semana',
        description: 'Viernes a domingo',
        startDate: this.getNextFriday(now),
        endDate: this.getNextSunday(now),
        hours: 48,
      },
      {
        id: 'week',
        label: 'Semana completa',
        description: '7 días',
        startDate: new Date(tomorrow.getTime() + 9 * 3600000),
        endDate: new Date(tomorrow.getTime() + (7 * 24 + 9) * 3600000),
        hours: 168,
      },
    ];

    return options;
  });

  readonly totalPrice = computed(() => {
    const option = this.durationOptions().find((o) => o.id === this.selectedDuration());
    if (!option) return 0;
    return this.calculatePrice(option.hours);
  });

  readonly platformFee = computed(() => {
    return Math.round(this.totalPrice() * 0.1);
  });

  readonly totalWithFees = computed(() => {
    return this.totalPrice() + this.platformFee();
  });

  readonly hasWalletBalance = computed(() => {
    return this.walletBalance() >= this.totalWithFees();
  });

  readonly hasMinimumWalletBalance = computed(() => {
    // Verificar si tiene al menos 300 USD (o equivalente en ARS)
    const balance = this.walletBalance();
    const currency = this.car.currency || 'ARS';

    if (currency === 'USD') {
      return balance >= 300;
    } else {
      // Asumir conversión ARS/USD aproximada (1 USD ≈ 1000 ARS)
      return balance >= 300000;
    }
  });

  readonly shouldForceWalletNavigation = computed(() => {
    return !this.hasMinimumWalletBalance();
  });

  readonly canConfirm = computed(() => {
    const hasPaymentMethod = !!this.selectedPaymentMethod();
    const hasDuration = !!this.selectedDuration();
    const hasValidPayment = this.selectedPaymentMethod() !== 'wallet' || this.hasWalletBalance();
    const hasMinimumBalance = this.hasMinimumWalletBalance();

    return hasPaymentMethod && hasDuration && hasValidPayment && hasMinimumBalance;
  });

  async ngOnInit(): Promise<void> {
    // Load wallet balance
    try {
      const balance = await firstValueFrom(this.walletService.getBalance());
      // Use available_balance for checking if user has enough funds
      this.walletBalance.set(balance.available_balance ?? 0);
    } catch (error) {
      console.warn('Could not load wallet balance:', error);
      this.walletBalance.set(0);
    }
  }

  selectDuration(duration: QuickDuration): void {
    this.selectedDuration.set(duration);
    this.errorMessage.set('');
  }

  selectPaymentMethod(method: 'wallet' | 'cash' | 'transfer'): void {
    // Si no tiene el saldo mínimo requerido, forzar navegación a wallet
    if (this.shouldForceWalletNavigation()) {
      void this.router.navigate(['/wallet']);
      return;
    }

    // Si selecciona efectivo, también enviar a wallet para cargar dinero
    if (method === 'cash') {
      void this.router.navigate(['/wallet']);
      return;
    }

    this.selectedPaymentMethod.set(method);
    this.errorMessage.set('');
  }

  calculatePrice(hours: number): number {
    const pricePerDay = this.car.price_per_day;
    const days = hours / 24;
    return Math.ceil(pricePerDay * days);
  }

  handleBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.handleCancel();
    }
  }

  handleCancel(): void {
    this.cancelBooking.emit();
  }

  async handleConfirm(): Promise<void> {
    if (!this.canConfirm() || this.loading()) return;

    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const option = this.durationOptions().find(
        (o: DurationOption) => o.id === this.selectedDuration(),
      );
      if (!option) {
        throw new Error('Duración no seleccionada');
      }

      const bookingData: QuickBookingData = {
        carId: this.car.id,
        startDate: option.startDate,
        endDate: option.endDate,
        paymentMethod: this.selectedPaymentMethod(),
        totalPrice: this.totalWithFees(),
        currency: this.car.currency || 'ARS',
      };

      this.confirmBooking.emit(bookingData);
    } catch (error) {
      console.error('Error confirming booking:', error);
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Error al confirmar la reserva',
      );
      this.loading.set(false);
    }
  }

  private getNextFriday(from: Date): Date {
    const result = new Date(from);
    const day = result.getDay();
    const daysUntilFriday = (5 - day + 7) % 7 || 7;
    result.setDate(result.getDate() + daysUntilFriday);
    result.setHours(9, 0, 0, 0);
    return result;
  }

  private getNextSunday(from: Date): Date {
    const friday = this.getNextFriday(from);
    const sunday = new Date(friday);
    sunday.setDate(sunday.getDate() + 2);
    sunday.setHours(21, 0, 0, 0);
    return sunday;
  }
}
