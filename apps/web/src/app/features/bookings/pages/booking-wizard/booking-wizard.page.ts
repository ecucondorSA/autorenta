import { CommonModule } from '@angular/common';
import { Component, computed, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

// Step Components (to be created)
import { BookingDatesStepComponent } from '../../components/booking-dates-step/booking-dates-step.component';
import { BookingDriverStepComponent } from '../../components/booking-driver-step/booking-driver-step.component';
import { BookingExtrasStepComponent } from '../../components/booking-extras-step/booking-extras-step.component';
import { BookingInsuranceStepComponent } from '../../components/booking-insurance-step/booking-insurance-step.component';
import { BookingPaymentStepComponent } from '../../components/booking-payment-step/booking-payment-step.component';
import { BookingReviewStepComponent } from '../../components/booking-review-step/booking-review-step.component';
import { BookingStepIndicatorComponent } from '../../components/booking-step-indicator/booking-step-indicator.component';

// Services
import { Car } from '../../../../core/models';
import { BookingsService } from '../../../../core/services/bookings.service';
import { CarsService } from '../../../../core/services/cars.service';
import { EmailVerificationService } from '../../../../core/services/email-verification.service';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';

export interface BookingWizardData {
  // Step 1: Dates & Location
  carId: string;
  startDate: Date | null;
  endDate: Date | null;
  pickupLocation: {
    address: string;
    lat: number;
    lng: number;
  } | null;
  dropoffLocation: {
    address: string;
    lat: number;
    lng: number;
  } | null;

  // Step 2: Insurance
  insuranceLevel: 'basic' | 'standard' | 'premium' | null;

  // Step 3: Extras
  extras: {
    id: string;
    type: 'gps' | 'child_seat' | 'additional_driver' | 'toll_pass' | 'fuel_prepaid' | 'delivery';
    quantity: number;
    dailyRate: number;
  }[];

  // Step 4: Driver Details
  driverLicense: {
    number: string;
    expirationDate: Date | null;
    frontPhoto: string | null;
    backPhoto: string | null;
  } | null;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  } | null;

  // Step 5: Payment
  paymentMethod: 'wallet' | 'card' | 'bank_transfer' | 'split' | null;
  paymentPlan: 'full' | 'split_50_50' | 'deposit_20' | 'installments' | null;
  promoCode: string | null;

  // Step 6: Review
  termsAccepted: boolean;
  cancellationPolicyAccepted: boolean;
}

/**
 * Tipo específico para los datos de reserva preparados
 * Asegura que todos los campos requeridos estén presentes
 */
interface PreparedBookingData {
  car_id: string;
  start_date: Date;
  end_date: Date;
  pickup_location: {
    address: string;
    lat: number;
    lng: number;
  };
  dropoff_location: {
    address: string;
    lat: number;
    lng: number;
  };
  insurance_level: 'basic' | 'standard' | 'premium' | null;
  extras: {
    id: string;
    type: 'gps' | 'child_seat' | 'additional_driver' | 'toll_pass' | 'fuel_prepaid' | 'delivery';
    quantity: number;
    dailyRate: number;
  }[];
  driver_license: {
    number: string;
    expirationDate: Date | null;
    frontPhoto: string | null;
    backPhoto: string | null;
  } | null;
  emergency_contact: {
    name: string;
    phone: string;
    relationship: string;
  } | null;
  payment_method: 'wallet' | 'card' | 'bank_transfer' | 'split' | null;
  payment_plan: 'full' | 'split_50_50' | 'deposit_20' | 'installments' | null;
  promo_code: string | null;
}

@Component({
  selector: 'app-booking-wizard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    BookingStepIndicatorComponent,
    BookingDatesStepComponent,
    BookingInsuranceStepComponent,
    BookingExtrasStepComponent,
    BookingDriverStepComponent,
    BookingPaymentStepComponent,
    BookingReviewStepComponent,
  ],
  templateUrl: './booking-wizard.page.html',
  styleUrls: ['./booking-wizard.page.scss'],
})
export class BookingWizardPage implements OnInit {
  currentStep = signal(1);
  totalSteps = 6;

  wizardData = signal<BookingWizardData>({
    carId: '',
    startDate: null,
    endDate: null,
    pickupLocation: null,
    dropoffLocation: null,
    insuranceLevel: null,
    extras: [],
    driverLicense: null,
    emergencyContact: null,
    paymentMethod: null,
    paymentPlan: null,
    promoCode: null,
    termsAccepted: false,
    cancellationPolicyAccepted: false,
  });

  car = signal<Car | null>(null);
  isLoading = signal(false);
  isSavingDraft = signal(false);

  // Computed values
  canProceed = computed(() => {
    const step = this.currentStep();
    const data = this.wizardData();

    switch (step) {
      case 1:
        return data.startDate && data.endDate && data.pickupLocation;
      case 2:
        return data.insuranceLevel !== null;
      case 3:
        return true; // Extras are optional
      case 4:
        return data.driverLicense && data.emergencyContact;
      case 5:
        return data.paymentMethod && data.paymentPlan;
      case 6:
        return data.termsAccepted && data.cancellationPolicyAccepted;
      default:
        return false;
    }
  });

  canGoBack = computed(() => this.currentStep() > 1);
  canGoForward = computed(() => this.currentStep() < this.totalSteps && this.canProceed());
  isLastStep = computed(() => this.currentStep() === this.totalSteps);

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private carsService: CarsService,
    private bookingsService: BookingsService,
    private errorHandler: ErrorHandlerService,
    private emailVerificationService: EmailVerificationService,
  ) { }

  async ngOnInit() {
    // Get car ID from route params
    const carId = this.route.snapshot.queryParamMap.get('carId');
    if (!carId) {
      console.error('No car ID provided');
      this.router.navigate(['/marketplace']);
      return;
    }

    this.wizardData.update((data) => ({ ...data, carId }));

    // Load car details
    await this.loadCar(carId);

    // Try to load saved draft
    await this.loadDraft();
  }

  async loadCar(carId: string) {
    this.isLoading.set(true);
    try {
      const car = await this.carsService.getCarById(carId);
      this.car.set(car);
    } catch (error) {
      console.error('Error loading car:', error);
      this.router.navigate(['/marketplace']);
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadDraft() {
    try {
      const carId = this.wizardData().carId;
      const draftKey = `booking_draft_${carId}`;
      const savedDraft = localStorage.getItem(draftKey);

      if (savedDraft) {
        const draft = JSON.parse(savedDraft);
        this.wizardData.set(draft);
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  }

  async saveDraft() {
    this.isSavingDraft.set(true);
    try {
      const carId = this.wizardData().carId;
      const draftKey = `booking_draft_${carId}`;
      localStorage.setItem(draftKey, JSON.stringify(this.wizardData()));
    } catch (error) {
      console.error('Error saving draft:', error);
    } finally {
      this.isSavingDraft.set(false);
    }
  }

  nextStep() {
    if (this.canGoForward()) {
      this.currentStep.update((step) => step + 1);
      this.saveDraft();
      window.scrollTo(0, 0);
    }
  }

  previousStep() {
    if (this.canGoBack()) {
      this.currentStep.update((step) => step - 1);
      window.scrollTo(0, 0);
    }
  }

  goToStep(step: number) {
    if (step >= 1 && step <= this.totalSteps) {
      this.currentStep.set(step);
      window.scrollTo(0, 0);
    }
  }

  onStepDataChange(stepData: Partial<BookingWizardData>) {
    this.wizardData.update((data) => ({ ...data, ...stepData }));
    this.saveDraft();
  }

  async submitBooking() {
    if (!this.canProceed()) {
      return;
    }

    // P0-013: Check email verification before allowing booking
    const emailStatus = await this.emailVerificationService.checkStatus();
    if (!emailStatus.isVerified) {
      this.errorHandler.handleError(
        new Error('Please verify your email before booking'),
        'Email Verification Required',
        true,
      );
      return;
    }

    this.isLoading.set(true);
    try {
      const bookingData = this.prepareBookingData();

      const result = await this.bookingsService.createBookingWithValidation(
        bookingData.car_id,
        bookingData.start_date.toISOString(),
        bookingData.end_date.toISOString(),
        {
          pickupLat: bookingData.pickup_location.lat,
          pickupLng: bookingData.pickup_location.lng,
          dropoffLat: bookingData.dropoff_location.lat,
          dropoffLng: bookingData.dropoff_location.lng,
          deliveryRequired: false, // FIXME: Calculate from distance based on car location
          distanceKm: 0, // FIXME: Calculate actual distance
          deliveryFeeCents: 0, // FIXME: Calculate fee based on distance
          distanceTier: 'local',
        },
      );

      if (!result.success || !result.booking) {
        throw new Error(result.error || 'Error creating booking');
      }

      const booking = result.booking;

      // Clear draft
      const carId = this.wizardData().carId;
      localStorage.removeItem(`booking_draft_${carId}`);

      // Navigate to payment page
      this.router.navigate(['/bookings', booking.id, 'payment']);
    } catch (error) {
      this.errorHandler.handleError(error, 'Crear reserva', true);
    } finally {
      this.isLoading.set(false);
    }
  }

  private prepareBookingData(): PreparedBookingData {
    const data = this.wizardData();

    return {
      car_id: data.carId,
      start_date: data.startDate!,
      end_date: data.endDate!,
      pickup_location: data.pickupLocation!,
      dropoff_location: data.dropoffLocation || data.pickupLocation!,
      insurance_level: data.insuranceLevel,
      extras: data.extras,
      driver_license: data.driverLicense,
      emergency_contact: data.emergencyContact,
      payment_method: data.paymentMethod,
      payment_plan: data.paymentPlan,
      promo_code: data.promoCode,
    };
  }

  cancel() {
    if (confirm('¿Estás seguro de que quieres cancelar? Se perderá tu progreso.')) {
      const carId = this.wizardData().carId;
      localStorage.removeItem(`booking_draft_${carId}`);
      this.router.navigate(['/cars', carId]);
    }
  }
}
