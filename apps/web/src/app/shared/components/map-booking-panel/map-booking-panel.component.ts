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
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MoneyPipe } from '../../pipes/money.pipe';
import type { CarMapLocation } from '../../../core/services/car-locations.service';
import { CarAvailabilityService } from '../../../core/services/car-availability.service';
import { BookingsService } from '../../../core/services/bookings.service';
import { PricingService } from '../../../core/services/pricing.service';
import { Router } from '@angular/router';

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
  imports: [CommonModule, FormsModule, MoneyPipe],
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
        <div *ngIf="car" class="flex items-center gap-3">
          <img
            *ngIf="car.photoUrl"
            [src]="car.photoUrl"
            [alt]="car.title"
            class="w-16 h-16 rounded-lg object-cover"
          />
          <div class="flex-1 min-w-0">
            <h3 class="text-base font-semibold text-text-primary truncate">{{ car.title }}</h3>
            <p class="text-sm text-text-secondary">{{ car.locationLabel }}</p>
            <div class="flex items-baseline gap-1 mt-1">
              <span class="text-lg font-bold text-cta-default">
                {{ car.pricePerDay | money: (car.currency || 'ARS') }}
              </span>
              <span class="text-xs text-text-secondary">/día</span>
            </div>
          </div>
        </div>
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
          <div *ngIf="isCheckingAvailability()" class="mt-2 text-sm text-text-secondary">
            Verificando disponibilidad...
          </div>
          <div
            *ngIf="!isCheckingAvailability() && startDate() && endDate() && availabilityStatus() !== null"
            class="mt-2"
          >
            <div
              *ngIf="availabilityStatus() === true"
              class="flex items-center gap-2 text-sm text-success-light"
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
            <div
              *ngIf="availabilityStatus() === false"
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
          </div>
        </div>

        <!-- Price Breakdown -->
        <div *ngIf="priceBreakdown()" class="bg-surface-secondary rounded-lg p-4 space-y-2">
          <h4 class="text-sm font-semibold text-text-primary">Resumen de precio</h4>
          <div class="flex justify-between text-sm">
            <span class="text-text-secondary">
              {{ priceBreakdown()!.days }} día{{ priceBreakdown()!.days !== 1 ? 's' : '' }}
            </span>
            <span class="text-text-primary font-medium">
              {{ priceBreakdown()!.subtotal | money: (car?.currency || 'ARS') }}
            </span>
          </div>
          <div *ngIf="priceBreakdown()!.fees > 0" class="flex justify-between text-sm">
            <span class="text-text-secondary">Comisión</span>
            <span class="text-text-primary font-medium">
              {{ priceBreakdown()!.fees | money: (car?.currency || 'ARS') }}
            </span>
          </div>
          <div class="border-t border-border-default pt-2 flex justify-between">
            <span class="font-semibold text-text-primary">Total</span>
            <span class="text-xl font-bold text-cta-default">
              {{ priceBreakdown()!.total | money: (car?.currency || 'ARS') }}
            </span>
          </div>
        </div>

        <!-- Payment Method -->
        <div>
          <label class="block text-sm font-medium text-text-primary mb-2">Método de pago</label>
          <div class="space-y-2">
            <label class="flex items-center gap-3 p-3 border border-border-default rounded-lg cursor-pointer hover:bg-surface-secondary transition-colors">
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
            <label class="flex items-center gap-3 p-3 border border-border-default rounded-lg cursor-pointer hover:bg-surface-secondary transition-colors">
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

        <!-- Error Message -->
        <div *ngIf="error()" class="bg-error/10 border border-error rounded-lg p-3">
          <p class="text-sm text-error">{{ error() }}</p>
        </div>

        <!-- CTA Button -->
        <button
          type="button"
          (click)="onConfirmBooking()"
          [disabled]="!canBook() || isProcessing()"
          class="w-full py-3 px-4 rounded-lg bg-cta-default hover:bg-cta-hover text-cta-text font-semibold transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <svg
            *ngIf="isProcessing()"
            class="animate-spin w-5 h-5"
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
          <span>{{ isProcessing() ? 'Procesando...' : 'Confirmar reserva' }}</span>
        </button>
      </div>
    </div>

    <!-- Backdrop -->
    <div
      *ngIf="isOpen()"
      class="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
      (click)="onClose()"
    ></div>
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
  @Input() car: CarMapLocation | null = null;
  @Input() isOpen = signal(false);
  @Input() userLocation?: { lat: number; lng: number };

  @Output() readonly bookingConfirmed = new EventEmitter<BookingFormData>();
  @Output() readonly close = new EventEmitter<void>();

  private readonly availabilityService = inject(CarAvailabilityService);
  private readonly bookingsService = inject(BookingsService);
  private readonly pricingService = inject(PricingService);
  private readonly router = inject(Router);

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
          driverAge: 30,
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
    this.close.emit();
  }
}

