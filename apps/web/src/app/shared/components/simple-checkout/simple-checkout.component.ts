import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  inject,
  computed,
  effect,
} from '@angular/core';
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
import { NotificationManagerService } from '../../../core/services/notification-manager.service';
import { TikTokEventsService } from '../../../core/services/tiktok-events.service';

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
  @Output() bookingCreated = new EventEmitter<{ id: string; [key: string]: unknown }>();
  @Output() cancelled = new EventEmitter<void>();

  private readonly router = inject(Router);
  private readonly carsService = inject(CarsService);
  private readonly bookingsService = inject(BookingsService);
  private readonly paymentsService = inject(PaymentsService);
  private readonly walletService = inject(WalletService);
  private readonly notificationsService = inject(NotificationsService);
  private readonly errorHandler = inject(ErrorHandlerService);
  private readonly waitlistService = inject(WaitlistService);
  private readonly toastService = inject(NotificationManagerService);
  private readonly tiktokEvents = inject(TikTokEventsService);

  // Estado del checkout
  readonly currentStep = signal(0);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly canWaitlist = signal(false); // Indica si se puede agregar a waitlist
  readonly addingToWaitlist = signal(false); // Loading state para waitlist

  // Fechas
  readonly startDate = signal<string>('');
  readonly endDate = signal<string>('');
  readonly availabilitySuggestion = signal<{ startDate: string; endDate: string } | null>(null);
  readonly availabilityInfo = signal<string | null>(null);

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
  readonly paymentMethod = signal<'wallet' | 'card' | 'cash'>('wallet');

  // Balance de wallet
  readonly walletBalance = signal(0);

  constructor() {
    this.loadWalletBalance();

    // 🎯 TikTok Events: Track AddPaymentInfo when payment method changes
    effect(() => {
      const method = this.paymentMethod();
      const step = this.currentStep();

      // Only track if we're on the payment step (step 2)
      if (step === 2 && method) {
        void this.tiktokEvents.trackAddPaymentInfo({
          value: this.finalTotal(),
          currency: this.car.currency || 'ARS',
          contentId: this.car.id,
        });
      }
    });
  }

  private async loadWalletBalance() {
    try {
      const balance = await firstValueFrom(this.walletService.getBalance());
      this.walletBalance.set(balance.available_balance);
    } catch (_error) {
      console.warn('Could not load wallet balance:', _error);
    }
  }

  setStep(stepIndex: number) {
    if (stepIndex <= this.currentStep()) {
      this.currentStep.set(stepIndex);
    }
  }

  async nextStep() {
    const previousStep = this.currentStep();
    const currentStepData = this.steps[previousStep];

    // Validar paso actual
    const stepIsValid = await this.runStepValidation();
    if (!stepIsValid) {
      return;
    }

    // Marcar paso como completado
    currentStepData.completed = true;

    // Avanzar al siguiente paso
    if (previousStep < this.steps.length - 1) {
      const newStep = previousStep + 1;
      this.currentStep.update(() => newStep);

      // 🎯 TikTok Events: Track InitiateCheckout when entering payment step
      if (newStep === 2) {
        void this.tiktokEvents.trackInitiateCheckout({
          contentId: this.car.id,
          contentName: this.car.title || `${this.car.brand} ${this.car.model}`,
          value: this.finalTotal(),
          currency: this.car.currency || 'ARS',
        });
      }
    } else {
      // Último paso - procesar reserva
      this.processBooking();
    }
  }

  previousStep() {
    if (this.currentStep() > 0) {
      this.currentStep.update((step) => step - 1);
    }
  }

  validateCurrentStep(): boolean {
    const stepIndex = this.currentStep();

    switch (stepIndex) {
      case 0: {
        // Fechas
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
        return true;
      }

      case 2: // Pago
        if (this.paymentMethod() === 'wallet' && this.finalTotal() > this.walletBalance()) {
          this.error.set('Saldo insuficiente en tu wallet');
          return false;
        }
        // Para pago en efectivo no se requiere validación previa
        if (this.paymentMethod() === 'cash') {
          return true;
        }
        break;
    }

    this.error.set(null);
    return true;
  }

  private async runStepValidation(): Promise<boolean> {
    // ✅ FIX 2025-11-06: Eliminar validación redundante de disponibilidad
    // La validación ahora se hace de forma atómica en request_booking()
    // Esto evita race conditions donde otro usuario reserva entre la validación y la creación
    const baseValid = this.validateCurrentStep();
    if (!baseValid) {
      return false;
    }

    // ❌ REMOVIDO: validateAvailability() - causaba race condition
    // La validación de disponibilidad ahora se hace dentro de createBookingWithValidation()
    // de forma atómica en la función SQL request_booking()

    return true;
  }

  private async validateAvailability(): Promise<boolean> {
    if (!this.startDate() || !this.endDate()) return false;

    this.clearAvailabilityHints();

    try {
      const isAvailable = await this.carsService.isCarAvailable(
        this.car.id,
        this.startDate(),
        this.endDate(),
      );

      if (isAvailable) {
        this.error.set(null);
        this.canWaitlist.set(false);
        return true;
      }

      const nextRanges = await this.carsService.getNextAvailableRange(
        this.car.id,
        this.startDate(),
        this.endDate(),
      );

      if (nextRanges && nextRanges.length > 0) {
        const nextRange = nextRanges[0];
        const formattedStart = this.formatInputDateValue(nextRange.startDate);
        const formattedEnd = this.formatInputDateValue(nextRange.endDate);

        this.startDate.set(formattedStart);
        this.endDate.set(formattedEnd);
        this.availabilitySuggestion.set({
          startDate: formattedStart,
          endDate: formattedEnd,
        });
        this.availabilityInfo.set(
          `Actualizamos tus fechas al primer espacio libre: ${this.formatHumanDate(
            formattedStart,
          )} → ${this.formatHumanDate(formattedEnd)}`,
        );
        this.toastService.info(
          'Fechas sugeridas',
          'Encontramos la próxima ventana disponible y actualizamos tu reserva.',
        );
        this.error.set(null);
        this.canWaitlist.set(false);
        return true;
      }

      this.error.set('El auto no está disponible para esas fechas. Por favor elige otras fechas.');
      this.canWaitlist.set(true);
      return false;
    } catch (_error) {
      console.warn('No se pudo verificar disponibilidad:', _error);
      return true;
    }
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
        this.endDate(),
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
      } else if (this.paymentMethod() === 'cash') {
        await this.processCashPayment(booking.id);
      } else {
        await this.processCardPayment(booking.id);
      }

      // 4. Notificar al usuario
      await this.notificationsService.notifyBookingCreated(booking.id, this.car.title);

      // 5. Emitir evento y redirigir
      this.bookingCreated.emit(booking as unknown as { id: string; [key: string]: unknown });
      this.router.navigate(['/bookings/success', booking.id]);
    } catch (error: unknown) {
      // Use ErrorHandlerService for consistent error handling
      this.errorHandler.handleBookingError(error, 'Processing booking', true);
      this.error.set(
        error instanceof Error
          ? error.message
          : 'Error al procesar la reserva. Inténtalo nuevamente.',
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
        this.endDate(),
      );

      if (result.success) {
        // Mostrar mensaje de éxito
        this.error.set(null);
        this.canWaitlist.set(false);

        // Mostrar toast de éxito
        this.toastService.success(
          'Éxito',
          '✅ Te agregamos a la lista de espera. Te notificaremos cuando el auto esté disponible.',
          5000,
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

  onDateInput(type: 'start' | 'end', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (type === 'start') {
      this.startDate.set(value);
    } else {
      this.endDate.set(value);
    }
    this.clearAvailabilityHints();
    this.error.set(null);
    this.canWaitlist.set(false);
  }

  onRetry(): void {
    this.error.set(null);
    this.canWaitlist.set(false);
    this.clearAvailabilityHints();
  }

  private async processWalletPayment(bookingId: string) {
    // Bloquear fondos en wallet
    await firstValueFrom(
      this.walletService.lockFunds(bookingId, this.finalTotal() * 100, 'Reserva de auto'),
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

  private async processCashPayment(bookingId: string) {
    // Crear payment intent para pago en efectivo
    await this.paymentsService.createPaymentIntent(bookingId, 'cash');

    // Para pagos en efectivo, el pago se realiza al momento de retirar el vehículo
    // La reserva queda confirmada pero el pago pendiente hasta el encuentro
    this.toastService.success(
      'Reserva confirmada',
      'Recuerda llevar el efectivo al momento de retirar el vehículo',
    );
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

  private clearAvailabilityHints(): void {
    this.availabilitySuggestion.set(null);
    this.availabilityInfo.set(null);
  }

  private formatInputDateValue(date: string | Date): string {
    const parsed = typeof date === 'string' ? new Date(date) : date;
    return parsed.toISOString().split('T')[0];
  }

  private formatHumanDate(date: string): string {
    const parsed = new Date(date);
    return new Intl.DateTimeFormat('es-AR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    }).format(parsed);
  }

  cancel() {
    this.cancelled.emit();
  }

  getCarPhotoUrl(): string {
    const photos = this.car.photos || (this.car as { car_photos?: unknown[] }).car_photos;
    return getCarImageUrl(photos as { url: string }[] | undefined, {
      brand: this.car.brand || this.car.brand_name || '',
      model: this.car.model || this.car.model_name || '',
      year: this.car.year,
      id: this.car.id,
    });
  }
}
