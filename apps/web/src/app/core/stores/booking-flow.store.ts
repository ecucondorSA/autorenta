import { Injectable, computed, signal } from '@angular/core';
import { BookingWizardData, BookingPrice } from '@core/models/booking-wizard.model';

export type BookingWizardStep = 
  | 'dates' 
  | 'extras' 
  | 'insurance' 
  | 'driver' 
  | 'payment' 
  | 'review';

const INITIAL_WIZARD_DATA: BookingWizardData = {
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
};

@Injectable({
  providedIn: 'root',
})
export class BookingFlowStore {
  // State
  readonly wizardData = signal<BookingWizardData>(INITIAL_WIZARD_DATA);
  readonly currentStep = signal<BookingWizardStep>('dates');
  readonly validationErrors = signal<string[]>([]);
  readonly isLoading = signal<boolean>(false);

  // Computed
  readonly pricing = computed(() => this.wizardData().pricing);
  
  readonly totalUsd = computed(() => this.pricing()?.totalAmountUsd ?? 0);
  
  readonly canProceed = computed(() => {
    const step = this.currentStep();
    const data = this.wizardData();
    
    switch (step) {
      case 'dates':
        return !!data.startDate && !!data.endDate;
      case 'insurance':
        return !!data.insuranceLevel;
      case 'driver':
        return !!data.driverLicense?.number; // Minimal check, real validation elsewhere
      case 'review':
        return data.termsAccepted && data.cancellationPolicyAccepted;
      default:
        return true;
    }
  });

  // Actions
  updateData(partial: Partial<BookingWizardData>) {
    this.wizardData.update(current => ({ ...current, ...partial }));
  }

  setStep(step: BookingWizardStep) {
    this.currentStep.set(step);
  }

  setPricing(pricing: BookingPrice) {
    this.updateData({ pricing });
  }

  reset() {
    this.wizardData.set(INITIAL_WIZARD_DATA);
    this.currentStep.set('dates');
    this.validationErrors.set([]);
  }
}
