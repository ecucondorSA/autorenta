import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { WizardComponent, WizardStep } from '../../../../shared/components/wizard/wizard.component';
import { BookingDatesLocationStepComponent, BookingDatesLocation } from '../../components/booking-dates-location-step/booking-dates-location-step.component';
import { BookingPaymentCoverageStepComponent, BookingPaymentCoverage } from '../../components/booking-payment-coverage-step/booking-payment-coverage-step.component';
import { BookingConfirmationStepComponent } from '../../components/booking-confirmation-step/booking-confirmation-step.component';
import { BookingsService } from '../../../../core/services/bookings.service';
import { PaymentGatewayFactory } from '../../../../core/services/payment-gateway.factory';
import { LoadingStateComponent } from '../../../../shared/components/loading-state/loading-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';

/**
 * BookingCheckoutWizardPage - Multi-step booking checkout
 *
 * Refactored checkout flow using wizard pattern:
 * - Step 1: Dates and Location
 * - Step 2: Payment and Coverage
 * - Step 3: Confirmation and Summary
 *
 * Features:
 * - Step-by-step validation
 * - Progress indicator
 * - Data persistence between steps
 * - Improved UX with clear flow
 *
 * @example
 * Route: /bookings/:bookingId/checkout-wizard
 */
@Component({
  selector: 'app-booking-checkout-wizard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    WizardComponent,
    BookingDatesLocationStepComponent,
    BookingPaymentCoverageStepComponent,
    BookingConfirmationStepComponent,
    LoadingStateComponent,
    ErrorStateComponent
  ],
  template: `
    <div class="checkout-wizard-container">
      <!-- Header -->
      <div class="page-header">
        <h1 class="page-title">Completar Reserva</h1>
        <p class="page-subtitle">
          Sigue los pasos para confirmar tu reserva de forma segura
        </p>
      </div>

      <!-- Loading State -->
      @if (isLoading()) {
        <app-loading-state type="spinner" size="lg">
          Cargando información de la reserva...
        </app-loading-state>
      }

      <!-- Error State -->
      @if (error() && !isLoading()) {
        <app-error-state
          variant="banner"
          [retryable]="true"
          [dismissible]="false"
          (retry)="loadBooking()">
          {{ error() }}
        </app-error-state>
      }

      <!-- Wizard -->
      @if (!isLoading() && !error()) {
        <app-wizard
          [steps]="wizardSteps"
          [currentStepIndex]="currentStep()"
          [isProcessing]="isProcessing()"
          [showCancelButton]="true"
          cancelLabel="Cancelar"
          completeLabel="Confirmar y Pagar"
          (stepChange)="handleStepChange($event)"
          (cancel)="handleCancel()"
          (complete)="handleComplete()">

          <!-- Step 1: Dates & Location -->
          @if (currentStep() === 0) {
            <app-booking-dates-location-step
              [data]="datesLocationData()"
              (dataChange)="handleDatesLocationChange($event)"
              (validChange)="handleStep1ValidChange($event)"
            />
          }

          <!-- Step 2: Payment & Coverage -->
          @if (currentStep() === 1) {
            <app-booking-payment-coverage-step
              [data]="paymentCoverageData()"
              (dataChange)="handlePaymentCoverageChange($event)"
              (validChange)="handleStep2ValidChange($event)"
            />
          }

          <!-- Step 3: Confirmation -->
          @if (currentStep() === 2) {
            <app-booking-confirmation-step
              [datesLocation]="datesLocationData()"
              [paymentCoverage]="paymentCoverageData()"
              [bookingData]="booking()"
            />
          }
        </app-wizard>
      }
    </div>
  `,
  styles: [`
    .checkout-wizard-container {
      min-height: 100vh;
      background: var(--surface-base);
      padding: 2rem;
    }

    .page-header {
      max-width: 1200px;
      margin: 0 auto 2rem;
      text-align: center;
    }

    .page-title {
      font-size: 2rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 0.5rem 0;
    }

    .page-subtitle {
      font-size: 1.125rem;
      color: var(--text-secondary);
      margin: 0;
    }

    /* Mobile */
    @media (max-width: 768px) {
      .checkout-wizard-container {
        padding: 1rem;
      }

      .page-title {
        font-size: 1.5rem;
      }

      .page-subtitle {
        font-size: 1rem;
      }
    }
  `]
})
export class BookingCheckoutWizardPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly bookingsService = inject(BookingsService);
  private readonly gatewayFactory = inject(PaymentGatewayFactory);

  // ==================== SIGNALS ====================

  /**
   * Booking ID
   */
  bookingId = signal<string>('');

  /**
   * Booking data
   */
  booking = signal<any>(null);

  /**
   * Current wizard step (0-based)
   */
  currentStep = signal<number>(0);

  /**
   * Loading state
   */
  isLoading = signal<boolean>(true);

  /**
   * Error message
   */
  error = signal<string>('');

  /**
   * Is processing payment
   */
  isProcessing = signal<boolean>(false);

  /**
   * Step 1 data
   */
  datesLocationData = signal<BookingDatesLocation>({
    startDate: '',
    endDate: '',
    pickupLocation: '',
    dropoffLocation: '',
    pickupTime: '10:00',
    dropoffTime: '10:00'
  });

  /**
   * Step 2 data
   */
  paymentCoverageData = signal<BookingPaymentCoverage>({
    paymentProvider: 'mercadopago',
    coverageLevel: 'standard',
    addDriverProtection: false,
    acceptTerms: false
  });

  /**
   * Step 1 validation state
   */
  step1Valid = signal<boolean>(false);

  /**
   * Step 2 validation state
   */
  step2Valid = signal<boolean>(false);

  // ==================== WIZARD STEPS ====================

  /**
   * Wizard step definitions
   */
  wizardSteps: WizardStep[] = [
    {
      id: 'dates-location',
      label: 'Fechas y Ubicación',
      description: 'Confirma las fechas y lugares',
      isValid: () => this.step1Valid()
    },
    {
      id: 'payment-coverage',
      label: 'Pago y Cobertura',
      description: 'Elige tu método de pago y cobertura',
      isValid: () => this.step2Valid()
    },
    {
      id: 'confirmation',
      label: 'Confirmación',
      description: 'Revisa y confirma',
      isValid: () => true
    }
  ];

  // ==================== LIFECYCLE ====================

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('bookingId');
    if (!id) {
      this.error.set('ID de booking no encontrado');
      this.isLoading.set(false);
      return;
    }

    this.bookingId.set(id);
    await this.loadBooking();
  }

  // ==================== METHODS ====================

  /**
   * Load booking data
   */
  async loadBooking(): Promise<void> {
    this.isLoading.set(true);
    this.error.set('');

    try {
      const bookingData = await this.bookingsService.getBookingById(this.bookingId());

      if (!bookingData) {
        throw new Error('Booking no encontrado');
      }

      if (bookingData.status !== 'pending') {
        throw new Error(`Este booking está en estado "${bookingData.status}" y no se puede pagar`);
      }

      this.booking.set(bookingData);

      // Initialize dates/location from booking data
      this.datesLocationData.set({
        startDate: bookingData.start_at?.split('T')[0] || '',
        endDate: bookingData.end_at?.split('T')[0] || '',
        pickupLocation: bookingData.pickup_location_lat?.toString() || '',
        dropoffLocation: bookingData.dropoff_location_lat?.toString() || '',
        pickupTime: '10:00',
        dropoffTime: '10:00'
      });
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Error cargando el booking');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Handle step change
   */
  handleStepChange(newStep: number): void {
    this.currentStep.set(newStep);
  }

  /**
   * Handle cancel
   */
  handleCancel(): void {
    this.router.navigate(['/bookings', this.bookingId()]);
  }

  /**
   * Handle wizard completion (final payment)
   */
  async handleComplete(): Promise<void> {
    this.isProcessing.set(true);
    this.error.set('');

    try {
      const provider = this.paymentCoverageData().paymentProvider;
      const gateway = this.gatewayFactory.createBookingGateway(provider);

      if (provider === 'mercadopago') {
        // Create preference and redirect to MercadoPago
        const preference = await gateway.createBookingPreference(this.bookingId(), true).toPromise();

        if (!preference || !preference.success || !preference.init_point) {
          throw new Error('Error creando preferencia de pago');
        }

        gateway.redirectToCheckout(preference.init_point, false);
      } else if (provider === 'paypal') {
        // PayPal flow would be handled here
        console.log('PayPal payment flow');
      }
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Error procesando pago');
      this.isProcessing.set(false);
    }
  }

  /**
   * Handle dates/location data change
   */
  handleDatesLocationChange(data: BookingDatesLocation): void {
    this.datesLocationData.set(data);
  }

  /**
   * Handle payment/coverage data change
   */
  handlePaymentCoverageChange(data: BookingPaymentCoverage): void {
    this.paymentCoverageData.set(data);
  }

  /**
   * Handle step 1 validation change
   */
  handleStep1ValidChange(valid: boolean): void {
    this.step1Valid.set(valid);
  }

  /**
   * Handle step 2 validation change
   */
  handleStep2ValidChange(valid: boolean): void {
    this.step2Valid.set(valid);
  }
}
