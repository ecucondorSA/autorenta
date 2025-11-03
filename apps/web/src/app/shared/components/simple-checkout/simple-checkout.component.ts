import { Component, Input, Output, EventEmitter, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';

// Services
import { CarsService } from '../../../core/services/cars.service';
import { BookingsService } from '../../../core/services/bookings.service';
import { PaymentsService } from '../../../core/services/payments.service';
import { WalletService } from '../../../core/services/wallet.service';
import { NotificationsService } from '../../../core/services/notifications/notifications.service';

// Models
import type { Car } from '../../../core/models';

// Utils
import { getCarImageUrl } from '../../utils/car-placeholder.util';

interface CheckoutStep {
  id: string;
  title: string;
  completed: boolean;
}

@Component({
  standalone: true,
  selector: 'app-simple-checkout',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, DatePipe],
  templateUrl: './simple-checkout.component.html',
  styleUrls: ['./simple-checkout.component.css'],
})
export class SimpleCheckoutComponent {
  @Input() car!: Car;
  @Output() bookingCreated = new EventEmitter<any>();
  @Output() cancelled = new EventEmitter<void>();

  private readonly router = inject(Router);
  private readonly carsService = inject(CarsService);
  private readonly bookingsService = inject(BookingsService);
  private readonly paymentsService = inject(PaymentsService);
  private readonly walletService = inject(WalletService);
  private readonly notificationsService = inject(NotificationsService);

  // Estado del checkout
  readonly currentStep = signal(0);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  // Fechas
  readonly startDate = signal<string>('');
  readonly endDate = signal<string>('');

  // Cálculos automáticos
  readonly totalDays = computed(() => {
    if (!this.startDate() || !this.endDate()) return 0;
    const start = new Date(this.startDate());
    const end = new Date(this.endDate());
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  });

  readonly totalPrice = computed(() => {
    return this.totalDays() * (this.car.price_per_day || 0);
  });

  readonly depositAmount = computed(() => {
    // Depósito de garantía: 250 USD fijos
    return 250;
  });

  readonly finalTotal = computed(() => {
    return this.totalPrice() + this.depositAmount();
  });

  // Pasos del proceso
  readonly steps: CheckoutStep[] = [
    { id: 'dates', title: 'Seleccionar Fechas', completed: false },
    { id: 'review', title: 'Revisar Reserva', completed: false },
    { id: 'payment', title: 'Pago Seguro', completed: false },
    { id: 'confirm', title: 'Confirmación', completed: false },
  ];

  // Métodos de pago
  readonly paymentMethod = signal<'wallet' | 'card'>('wallet');

  // Balance de wallet
  readonly walletBalance = signal(0);

  constructor() {
    this.loadWalletBalance();
  }

  private async loadWalletBalance() {
    try {
      const balance = await firstValueFrom(this.walletService.getBalance());
      this.walletBalance.set(balance.available_balance);
    } catch (error) {
      console.warn('Could not load wallet balance:', error);
    }
  }

  setStep(stepIndex: number) {
    if (stepIndex <= this.currentStep()) {
      this.currentStep.set(stepIndex);
    }
  }

  nextStep() {
    const currentStepData = this.steps[this.currentStep()];

    // Validar paso actual
    if (!this.validateCurrentStep()) {
      return;
    }

    // Marcar paso como completado
    currentStepData.completed = true;

    // Avanzar al siguiente paso
    if (this.currentStep() < this.steps.length - 1) {
      this.currentStep.update(step => step + 1);
    } else {
      // Último paso - procesar reserva
      this.processBooking();
    }
  }

  previousStep() {
    if (this.currentStep() > 0) {
      this.currentStep.update(step => step - 1);
    }
  }

  validateCurrentStep(): boolean {
    const stepIndex = this.currentStep();

    switch (stepIndex) {
      case 0: // Fechas
        if (!this.startDate() || !this.endDate()) {
          this.error.set('Por favor selecciona las fechas de alquiler');
          return false;
        }
        const start = new Date(this.startDate());
        const end = new Date(this.endDate());
        if (start >= end) {
          this.error.set('La fecha de fin debe ser posterior a la fecha de inicio');
          return false;
        }
        break;

      case 2: // Pago
        if (this.paymentMethod() === 'wallet' && this.finalTotal() > this.walletBalance()) {
          this.error.set('Saldo insuficiente en tu wallet');
          return false;
        }
        break;
    }

    this.error.set(null);
    return true;
  }

  private async processBooking() {
    this.loading.set(true);
    this.error.set(null);

    try {
      // 1. Crear la reserva
      const booking = await this.bookingsService.requestBooking(
        this.car.id,
        this.startDate(),
        this.endDate()
      );

      // 2. Procesar pago
      if (this.paymentMethod() === 'wallet') {
        await this.processWalletPayment(booking.id);
      } else {
        await this.processCardPayment(booking.id);
      }

      // 3. Notificar al usuario
      await this.notificationsService.notifyBookingCreated(booking.id, this.car.title);

      // 4. Emitir evento y redirigir
      this.bookingCreated.emit(booking);
      this.router.navigate(['/bookings/success', booking.id]);

    } catch (error: any) {
      console.error('Error creating booking:', error);
      this.error.set(error.message || 'Error al procesar la reserva. Inténtalo nuevamente.');
    } finally {
      this.loading.set(false);
    }
  }

  private async processWalletPayment(bookingId: string) {
    // Bloquear fondos en wallet
    await firstValueFrom(
      this.walletService.lockFunds(bookingId, this.finalTotal() * 100, 'Reserva de auto')
    );

    // Crear payment intent
    await this.paymentsService.createPaymentIntent(bookingId, 'wallet');
  }

  private async processCardPayment(bookingId: string) {
    // Crear payment intent para tarjeta
    await this.paymentsService.createPaymentIntent(bookingId, 'mercadopago');

    // Aquí se integraría MercadoPago para autorizar la tarjeta
    // Por ahora, marcamos como pendiente de aprobación manual
  }

  getMinDate(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  getMaxDate(): string {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 90); // Máximo 90 días adelante
    return maxDate.toISOString().split('T')[0];
  }

  cancel() {
    this.cancelled.emit();
  }

  getCarPhotoUrl(): string {
    const photos = this.car.photos || (this.car as any).car_photos;
    return getCarImageUrl(photos, {
      brand: this.car.brand || this.car.brand_name || '',
      model: this.car.model || this.car.model_name || '',
      year: this.car.year,
      id: this.car.id,
    });
  }
}
