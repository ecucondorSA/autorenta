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
import { NotificationsService } from '../../../core/services/user-notifications.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { WaitlistService } from '../../../core/services/waitlist.service';
import { ToastService } from '../../../core/services/toast.service';

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
  private readonly errorHandler = inject(ErrorHandlerService);
  private readonly waitlistService = inject(WaitlistService);
  private readonly toastService = inject(ToastService);

  // Estado del checkout
  readonly currentStep = signal(0);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly canWaitlist = signal(false); // Indica si se puede agregar a waitlist
  readonly addingToWaitlist = signal(false); // Loading state para waitlist

  // Fechas
  readonly startDate = signal<string>('');
  readonly endDate = signal<string>('');

  // Alternativas de fechas disponibles
  readonly availableAlternatives = signal<
    Array<{
      startDate: string;
      endDate: string;
      daysCount: number;
    }>
  >([]);

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
        if (start < new Date()) {
          this.error.set('La fecha de inicio no puede ser en el pasado');
          return false;
        }
        // Validar disponibilidad del auto (async, pero bloqueamos el paso hasta que se valide)
        void this.validateAvailability();
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

  private async validateAvailability(): Promise<void> {
    if (!this.startDate() || !this.endDate()) return;

    try {
      const isAvailable = await this.carsService.isCarAvailable(
        this.car.id,
        this.startDate(),
        this.endDate()
      );

      if (!isAvailable) {
        // ✅ NUEVO: Obtener próximas fechas disponibles
        const alternatives = await this.carsService.getNextAvailableRange(
          this.car.id,
          this.startDate(),
          this.endDate(),
          3 // Máximo 3 opciones
        );

        this.availableAlternatives.set(alternatives);

        // Mostrar mensaje con alternativas si las hay
        if (alternatives.length > 0) {
          const firstAlt = alternatives[0];
          this.error.set(
            `El auto no está disponible para esas fechas. Próxima ventana disponible: ${this.formatDate(firstAlt.startDate)} → ${this.formatDate(firstAlt.endDate)}`
          );
        } else {
          this.error.set('El auto no está disponible para esas fechas. Por favor elige otras fechas.');
        }
      } else {
        // Limpiar alternativas si está disponible
        this.availableAlternatives.set([]);
      }
    } catch (error) {
      // Si falla la validación, permitir continuar pero mostrar warning
      console.warn('No se pudo verificar disponibilidad:', error);
    }
  }

  /**
   * Aplica una fecha alternativa seleccionada por el usuario
   */
  selectAlternative(alternative: { startDate: string; endDate: string; daysCount: number }): void {
    this.startDate.set(alternative.startDate);
    this.endDate.set(alternative.endDate);
    this.availableAlternatives.set([]);
    this.error.set(null);
    this.canWaitlist.set(false);

    // Mostrar mensaje de éxito
    this.toastService.success(
      `✅ Fechas actualizadas: ${this.formatDate(alternative.startDate)} → ${this.formatDate(alternative.endDate)}`,
      3000
    );
  }

  /**
   * Formatea una fecha ISO a formato legible dd/mm/yyyy
   */
  private formatDate(isoDate: string): string {
    const date = new Date(isoDate);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private async processBooking() {
    this.loading.set(true);
    this.error.set(null);
    this.canWaitlist.set(false); // Reset waitlist flag

    try {
      // ✅ FIX: Intentar crear el booking directamente
      // Esto permite que el error de constraint se capture y active canWaitlist
      // La validación de disponibilidad se hace dentro de createBookingWithValidation
      const bookingResult = await this.bookingsService.createBookingWithValidation(
        this.car.id,
        this.startDate(),
        this.endDate()
      );

      if (!bookingResult.success) {
        const errorMsg = bookingResult.error || 'Error al crear la reserva';
        const shouldShowWaitlist = bookingResult.canWaitlist ?? false;
        
        // Log para debugging
        console.log('Booking failed:', {
          error: errorMsg,
          canWaitlist: shouldShowWaitlist,
          bookingResult,
        });
        
        this.error.set(errorMsg);
        this.canWaitlist.set(shouldShowWaitlist); // Mostrar opción de waitlist si está disponible
        this.loading.set(false);
        return;
      }

      const booking = bookingResult.booking!;

      // 3. Procesar pago
      if (this.paymentMethod() === 'wallet') {
        await this.processWalletPayment(booking.id);
      } else {
        await this.processCardPayment(booking.id);
      }

      // 4. Notificar al usuario
      await this.notificationsService.notifyBookingCreated(booking.id, this.car.title);

      // 5. Emitir evento y redirigir
      this.bookingCreated.emit(booking);
      this.router.navigate(['/bookings/success', booking.id]);

    } catch (error: unknown) {
      // Use ErrorHandlerService for consistent error handling
      this.errorHandler.handleBookingError(error, 'Processing booking', true);
      this.error.set(
        error instanceof Error ? error.message : 'Error al procesar la reserva. Inténtalo nuevamente.'
      );
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Agrega el usuario a la lista de espera cuando el auto no está disponible
   */
  async addToWaitlist(): Promise<void> {
    this.addingToWaitlist.set(true);
    try {
      const result = await this.waitlistService.addToWaitlist(
        this.car.id,
        this.startDate(),
        this.endDate()
      );

      if (result.success) {
        // Mostrar mensaje de éxito
        this.error.set(null);
        this.canWaitlist.set(false);
        
        // Mostrar toast de éxito
        this.toastService.success(
          '✅ Te agregamos a la lista de espera. Te notificaremos cuando el auto esté disponible.',
          5000
        );
      } else {
        this.error.set(result.error || 'Error al agregar a la lista de espera');
      }
    } catch (error: unknown) {
      this.errorHandler.handleError(error, 'Adding to waitlist', true);
      this.error.set('Error al agregar a la lista de espera. Inténtalo nuevamente.');
    } finally {
      this.addingToWaitlist.set(false);
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
