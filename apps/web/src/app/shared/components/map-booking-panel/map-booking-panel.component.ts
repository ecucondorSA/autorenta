import { LoggerService } from '@core/services/infrastructure/logger.service';
import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  computed,
  signal,
  inject,
  OnInit,
  OnDestroy,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import type { CarMapLocation } from '@core/services/cars/car-locations.service';
import { CarAvailabilityService } from '@core/services/cars/car-availability.service';
import { BookingsService } from '@core/services/bookings/bookings.service';
import { PricingService } from '@core/services/payments/pricing.service';
import { ProfileService } from '@core/services/auth/profile.service';
import { NavigationService } from '@core/services/ui/navigation.service';
import { MoneyPipe } from '../../pipes/money.pipe';
import { getAgeFromProfile } from '../../utils/age-calculator';
import { BirthDateModalComponent } from '../birth-date-modal/birth-date-modal.component';
import { DynamicPricingBadgeComponent } from '../dynamic-pricing-badge/dynamic-pricing-badge.component';

export interface BookingFormData {
  startDate: string;
  endDate: string;
  totalDays: number;
  totalPrice: number;
  currency: string;
}

@Component({
  selector: 'app-map-booking-panel',
  standalone: true,
  imports: [
    FormsModule,
    MoneyPipe,
    BirthDateModalComponent,
    DynamicPricingBadgeComponent
],
  template: `
    <div
      class="map-booking-panel fixed inset-y-0 right-0 w-full max-w-md bg-surface-raised shadow-2xl z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto"
      [class.translate-x-0]="isOpen()"
      [class.translate-x-full]="!isOpen()"
      >
      <!-- Header -->
      <div class="sticky top-0 bg-surface-raised border-b border-border-default p-4 z-10">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-bold text-text-primary">Reservar auto</h2>
          <button
            type="button"
            (click)="onClose()"
            class="p-2 rounded-lg hover:bg-surface-secondary transition-colors"
            aria-label="Cerrar panel"
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
    
        <!-- Car Info Summary -->
        @if (car) {
          <div class="flex items-center gap-3">
            @if (car.photoUrl) {
              <img
                [src]="car.photoUrl"
                [alt]="car.title"
                class="w-16 h-16 rounded-lg object-cover"
                />
            }
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <h3 class="text-base font-semibold text-text-primary truncate">{{ car.title }}</h3>
                <!-- ✅ NEW: Dynamic pricing badge -->
                @if (car.usesDynamicPricing) {
                  <app-dynamic-pricing-badge />
                }
              </div>
              <p class="text-sm text-text-secondary">{{ car.locationLabel }}</p>
              <div class="flex items-baseline gap-1 mt-1">
                <span class="text-lg font-bold text-cta-default">
                  {{ car.pricePerDay | money: car.currency || 'ARS' }}
                </span>
                <span class="text-xs text-text-secondary">/día</span>
              </div>
            </div>
          </div>
        }
      </div>
    
      <!-- Content -->
      <div class="p-4 space-y-6">
        <!-- Date Range Picker -->
        <div>
          <label class="block text-sm font-medium text-text-primary mb-2">
            Fechas de alquiler
          </label>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-text-secondary mb-1">Desde</label>
              <input
                type="date"
                [min]="minDate"
                [max]="endDate() || maxDate"
                [value]="startDate()"
                (change)="onStartDateChange($any($event.target).value)"
                class="w-full px-3 py-2 border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-cta-default"
                [class.border-error]="availabilityError()"
                />
            </div>
            <div>
              <label class="block text-xs text-text-secondary mb-1">Hasta</label>
              <input
                type="date"
                [min]="startDate() || minDate"
                [max]="maxDate"
                [value]="endDate()"
                (change)="onEndDateChange($any($event.target).value)"
                class="w-full px-3 py-2 border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-cta-default"
                [class.border-error]="availabilityError()"
                />
            </div>
          </div>
    
          <!-- Availability Status -->
          @if (isCheckingAvailability()) {
            <div class="mt-2 text-sm text-text-secondary">
              Verificando disponibilidad...
            </div>
          }
          @if (
            !isCheckingAvailability() && startDate() && endDate() && availabilityStatus() !== null
            ) {
            <div
              class="mt-2"
              >
              @if (availabilityStatus() === true) {
                <div
                  class="flex items-center gap-2 text-sm text-success-strong"
                  >
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clip-rule="evenodd"
                      />
                  </svg>
                  <span>Disponible</span>
                </div>
              }
              @if (availabilityStatus() === false) {
                <div
                  class="flex items-center gap-2 text-sm text-error"
                  >
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clip-rule="evenodd"
                      />
                  </svg>
                  <span>No disponible en estas fechas</span>
                </div>
              }
            </div>
          }
        </div>
    
        <!-- Price Breakdown -->
        @if (priceBreakdown()) {
          <div class="bg-surface-secondary rounded-lg p-4 space-y-2">
            <h4 class="text-sm font-semibold text-text-primary">Resumen de precio</h4>
            <div class="flex justify-between text-sm">
              <span class="text-text-secondary">
                {{ priceBreakdown()!.days }} día{{ priceBreakdown()!.days !== 1 ? 's' : '' }}
              </span>
              <span class="text-text-primary font-medium">
                {{ priceBreakdown()!.subtotal | money: car?.currency || 'ARS' }}
              </span>
            </div>
            @if (priceBreakdown()!.fees > 0) {
              <div class="flex justify-between text-sm">
                <span class="text-text-secondary">Comisión</span>
                <span class="text-text-primary font-medium">
                  {{ priceBreakdown()!.fees | money: car?.currency || 'ARS' }}
                </span>
              </div>
            }
            <div class="border-t border-border-default pt-2 flex justify-between">
              <span class="font-semibold text-text-primary">Total</span>
              <span class="text-xl font-bold text-cta-default">
                {{ priceBreakdown()!.total | money: car?.currency || 'ARS' }}
              </span>
            </div>
          </div>
        }
    
        <!-- Payment Method -->
        <div>
          <label class="block text-sm font-medium text-text-primary mb-2">Método de pago</label>
          <div class="space-y-2">
            <label
              class="flex items-center gap-3 p-3 border border-border-default rounded-lg cursor-pointer hover:bg-surface-secondary transition-colors"
              >
              <input
                type="radio"
                name="paymentMethod"
                value="wallet"
                [(ngModel)]="paymentMethod"
                class="w-4 h-4 text-cta-default"
                />
              <div class="flex-1">
                <div class="font-medium text-text-primary">Wallet AutoRenta</div>
                <div class="text-xs text-text-secondary">Pago rápido sin tarjeta</div>
              </div>
            </label>
            <label
              class="flex items-center gap-3 p-3 border border-border-default rounded-lg cursor-pointer hover:bg-surface-secondary transition-colors"
              >
              <input
                type="radio"
                name="paymentMethod"
                value="card"
                [(ngModel)]="paymentMethod"
                class="w-4 h-4 text-cta-default"
                />
              <div class="flex-1">
                <div class="font-medium text-text-primary">Tarjeta de crédito</div>
                <div class="text-xs text-text-secondary">MercadoPago</div>
              </div>
            </label>
          </div>
        </div>
    
        <!-- Navigate Buttons -->
        @if (car) {
          <div>
            <label class="block text-sm font-medium text-text-primary mb-2">¿Cómo llegar?</label>
            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                (click)="navigateWithWaze(); $event.stopPropagation()"
                class="flex items-center justify-center gap-1.5 bg-[var(--brand-waze-default,#33CCFF)] hover:bg-[var(--brand-waze-hover,#2BB8EA)] text-text-primary font-semibold py-2.5 px-3 rounded-lg transition-colors duration-200 text-sm"
                title="Navegar con Waze"
                >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8z"
                    />
                  <path
                    d="M12 6c-3.3 0-6 2.7-6 6s2.7 6 6 6 6-2.7 6-6-2.7-6-6-6zm0 10c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z"
                    />
                </svg>
                <span>Waze</span>
              </button>
              <button
                type="button"
                (click)="navigateWithGoogleMaps(); $event.stopPropagation()"
                class="flex items-center justify-center gap-1.5 bg-[var(--brand-google-maps-default,#2B55C7)] hover:bg-[var(--brand-google-maps-hover,#2447AD)] text-white font-semibold py-2.5 px-3 rounded-lg transition-colors duration-200 text-sm"
                title="Navegar con Google Maps"
                >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                    />
                </svg>
                <span>Maps</span>
              </button>
            </div>
          </div>
        }
    
        <!-- Error Message -->
        @if (error()) {
          <div class="bg-error/10 border border-error rounded-lg p-3">
            <p class="text-sm text-error">{{ error() }}</p>
          </div>
        }
    
        <!-- CTA Button -->
        <button
          type="button"
          (click)="onConfirmBooking()"
          [disabled]="!canBook() || isProcessing()"
          class="w-full py-3 px-4 rounded-lg bg-cta-default hover:bg-cta-hover text-cta-text font-semibold transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
          @if (isProcessing()) {
            <svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
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
          }
          <span>{{ isProcessing() ? 'Procesando...' : 'Confirmar reserva' }}</span>
        </button>
      </div>
    </div>
    
    <!-- ✅ NUEVO: Modal para solicitar fecha de nacimiento -->
    @if (showBirthDateModal()) {
      <app-birth-date-modal
        (completed)="onBirthDateCompleted($event)"
        (cancelled)="onBirthDateCancelled()"
        />
    }
    
    <!-- Backdrop -->
    @if (isOpen()) {
      <div
        class="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
        (click)="onClose()"
      ></div>
    }
    `,
  styles: [
    `
      .map-booking-panel {
        scrollbar-width: thin;
        scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
      }

      .map-booking-panel::-webkit-scrollbar {
        width: 6px;
      }

      .map-booking-panel::-webkit-scrollbar-track {
        background: transparent;
      }

      .map-booking-panel::-webkit-scrollbar-thumb {
        background-color: rgba(0, 0, 0, 0.2);
        border-radius: 3px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapBookingPanelComponent implements OnInit, OnDestroy {
  private readonly logger = inject(LoggerService);
  @Input() car: CarMapLocation | null = null;
  @Input() isOpen = signal(false);
  @Input() userLocation?: { lat: number; lng: number };

  @Output() readonly bookingConfirmed = new EventEmitter<BookingFormData>();
  @Output() readonly closePanel = new EventEmitter<void>();

  private readonly availabilityService = inject(CarAvailabilityService);
  private readonly bookingsService = inject(BookingsService);
  private readonly pricingService = inject(PricingService);
  private readonly profileService = inject(ProfileService);
  private readonly router = inject(Router);
  private readonly navigationService = inject(NavigationService);

  readonly startDate = signal<string>('');
  readonly endDate = signal<string>('');
  readonly availabilityStatus = signal<boolean | null>(null);
  readonly isCheckingAvailability = signal(false);
  readonly availabilityError = signal(false);
  readonly priceBreakdown = signal<{
    days: number;
    subtotal: number;
    fees: number;
    total: number;
  } | null>(null);
  readonly error = signal<string | null>(null);
  readonly isProcessing = signal(false);
  readonly paymentMethod = signal<'wallet' | 'card'>('wallet');
  readonly showBirthDateModal = signal(false);

  readonly minDate = new Date().toISOString().split('T')[0];
  readonly maxDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  readonly canBook = computed(() => {
    return (
      this.startDate() &&
      this.endDate() &&
      this.availabilityStatus() === true &&
      !this.isProcessing() &&
      this.car !== null
    );
  });

  private availabilityCheckTimeout?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    // Set default dates (today + 1 day, today + 3 days)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const in3Days = new Date();
    in3Days.setDate(in3Days.getDate() + 3);

    this.startDate.set(tomorrow.toISOString().split('T')[0]);
    this.endDate.set(in3Days.toISOString().split('T')[0]);

    // Initial availability check
    if (this.car) {
      void this.checkAvailability();
      this.calculatePrice();
    }
  }

  ngOnDestroy(): void {
    if (this.availabilityCheckTimeout) {
      clearTimeout(this.availabilityCheckTimeout);
    }
  }

  onStartDateChange(date: string): void {
    this.startDate.set(date);
    if (this.endDate() && date >= this.endDate()) {
      // Auto-adjust end date if it's before start date
      const newEndDate = new Date(date);
      newEndDate.setDate(newEndDate.getDate() + 1);
      this.endDate.set(newEndDate.toISOString().split('T')[0]);
    }
    this.checkAvailabilityDebounced();
    this.calculatePrice();
  }

  onEndDateChange(date: string): void {
    this.endDate.set(date);
    this.checkAvailabilityDebounced();
    this.calculatePrice();
  }

  private checkAvailabilityDebounced(): void {
    if (this.availabilityCheckTimeout) {
      clearTimeout(this.availabilityCheckTimeout);
    }

    this.availabilityCheckTimeout = setTimeout(() => {
      void this.checkAvailability();
    }, 500);
  }

  private async checkAvailability(): Promise<void> {
    if (!this.car || !this.startDate() || !this.endDate()) {
      this.availabilityStatus.set(null);
      return;
    }

    this.isCheckingAvailability.set(true);
    this.availabilityError.set(false);

    try {
      const available = await this.availabilityService.checkAvailability(
        this.car.carId,
        this.startDate()!,
        this.endDate()!,
      );
      this.availabilityStatus.set(available);
      if (!available) {
        this.availabilityError.set(true);
        setTimeout(() => this.availabilityError.set(false), 600);
      }
    } catch (err) {
      console.error('Error checking availability:', err);
      this.availabilityStatus.set(null);
    } finally {
      this.isCheckingAvailability.set(false);
    }
  }

  private calculatePrice(): void {
    if (!this.car || !this.startDate() || !this.endDate()) {
      this.priceBreakdown.set(null);
      return;
    }

    const start = new Date(this.startDate()!);
    const end = new Date(this.endDate()!);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (days <= 0) {
      this.priceBreakdown.set(null);
      return;
    }

    const subtotal = this.car.pricePerDay * days;
    const fees = subtotal * 0.15; // 15% platform fee
    const total = subtotal + fees;

    this.priceBreakdown.set({
      days,
      subtotal,
      fees,
      total,
    });
  }

  async onConfirmBooking(): Promise<void> {
    if (!this.canBook() || !this.car) {
      return;
    }

    // ✅ NUEVO: Verificar si el usuario tiene date_of_birth antes de continuar
    const needsBirthDate = await this.checkAndRequestBirthDate();
    if (needsBirthDate) {
      // Modal se mostrará, esperamos que el usuario complete
      return;
    }

    this.isProcessing.set(true);
    this.error.set(null);

    try {
      // Create booking
      const result = await this.bookingsService.createBookingAtomic({
        carId: this.car.carId,
        startDate: new Date(this.startDate()!).toISOString(),
        endDate: new Date(this.endDate()!).toISOString(),
        totalAmount: this.priceBreakdown()!.total * 100, // Convert to cents
        currency: this.car.currency || 'ARS',
        paymentMode: this.paymentMethod(),
        riskSnapshot: {
          dailyPriceUsd: this.car.pricePerDay / 1000, // Approximate USD conversion
          securityDepositUsd: 0,
          vehicleValueUsd: 0,
          // ✅ IMPLEMENTADO: Cálculo real de edad desde profile
          // Fallback a 30 si date_of_birth no está configurado
          driverAge: await this.getDriverAge(),
          coverageType: 'standard',
          paymentMode: this.paymentMethod(),
          totalUsd: this.priceBreakdown()!.total / 1000,
          totalArs: this.priceBreakdown()!.total,
          exchangeRate: 1000,
        },
      });

      if (!result.success || !result.bookingId) {
        throw new Error(result.error || 'Error al crear la reserva');
      }

      // Emit booking confirmed event
      this.bookingConfirmed.emit({
        startDate: this.startDate()!,
        endDate: this.endDate()!,
        totalDays: this.priceBreakdown()!.days,
        totalPrice: this.priceBreakdown()!.total,
        currency: this.car.currency || 'ARS',
      });

      // Navigate to booking detail page
      await this.router.navigate(['/bookings', result.bookingId, 'payment']);
    } catch (err) {
      console.error('Error creating booking:', err);
      this.error.set(err instanceof Error ? err.message : 'Error al crear la reserva');
    } finally {
      this.isProcessing.set(false);
    }
  }

  onClose(): void {
    this.isOpen.set(false);
    this.closePanel.emit();
  }

  /**
   * ✅ NUEVO: Verifica si el usuario tiene date_of_birth y muestra modal si no la tiene
   * Retorna true si se necesita mostrar el modal (bloqueando el flujo)
   * Retorna false si el usuario ya tiene date_of_birth (continuar con booking)
   */
  private async checkAndRequestBirthDate(): Promise<boolean> {
    try {
      const profile = await this.profileService.getCurrentProfile();

      // Si ya tiene date_of_birth, no mostrar modal
      if (profile?.date_of_birth) {
        return false;
      }

      // No tiene date_of_birth, mostrar modal
      this.showBirthDateModal.set(true);
      return true;
    } catch (error) {
      console.error('[MapBookingPanel] Error checking date_of_birth:', error);
      // En caso de error, asumir que no tiene y mostrar modal
      this.showBirthDateModal.set(true);
      return true;
    }
  }

  /**
   * ✅ NUEVO: Handler cuando el usuario completa el modal de fecha de nacimiento
   * Cierra el modal y reintenta la confirmación del booking
   */
  onBirthDateCompleted(birthDate: string): void {
    this.logger.debug('[MapBookingPanel] Birth date completed:', birthDate);
    this.showBirthDateModal.set(false);

    // Reintentar confirmación automáticamente
    setTimeout(() => {
      this.onConfirmBooking();
    }, 100);
  }

  /**
   * ✅ NUEVO: Handler cuando el usuario cancela el modal de fecha de nacimiento
   * Solo cierra el modal, no procede con el booking
   */
  onBirthDateCancelled(): void {
    this.logger.debug('[MapBookingPanel] Birth date cancelled');
    this.showBirthDateModal.set(false);
    // No hacer nada más, el usuario puede decidir si quiere intentar nuevamente
  }

  /**
   * ✅ DRIVER AGE: Obtiene edad real del conductor desde su perfil
   * Usa fecha de nacimiento si está configurada, caso contrario fallback a 30
   */
  private async getDriverAge(): Promise<number> {
    try {
      const profile = await this.profileService.getCurrentProfile();
      return getAgeFromProfile(profile, 30);
    } catch (error) {
      console.warn('[MapBookingPanel] Error getting driver age, using fallback:', error);
      return 30;
    }
  }

  /**
   * Navigate to car location using Waze
   */
  navigateWithWaze(): void {
    if (!this.car) {
      return;
    }

    this.navigationService.navigateWithWaze({
      lat: this.car.lat,
      lng: this.car.lng,
      destinationName: this.car.title || 'Auto en ' + (this.car.locationLabel || 'AutoRenta'),
    });
  }

  /**
   * Navigate to car location using Google Maps
   */
  navigateWithGoogleMaps(): void {
    if (!this.car) {
      return;
    }

    this.navigationService.navigateWithGoogleMaps({
      lat: this.car.lat,
      lng: this.car.lng,
      destinationName: this.car.title || 'Auto en ' + (this.car.locationLabel || 'AutoRenta'),
    });
  }
}
