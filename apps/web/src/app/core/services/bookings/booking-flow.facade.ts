import { Injectable, inject, computed } from '@angular/core';
import { BookingFlowStore, BookingWizardStep } from '@core/stores/booking-flow.store';
import { CurrencyService } from '@core/services/payments/currency.service';
import { BookingWizardData } from '@core/models/booking-wizard.model';

@Injectable({
  providedIn: 'root',
})
export class BookingFlowFacade {
  private readonly store = inject(BookingFlowStore);
  private readonly currencyService = inject(CurrencyService);

  // Expose Signals
  readonly wizardData = this.store.wizardData;
  readonly currentStep = this.store.currentStep;
  readonly pricing = this.store.pricing;
  readonly canProceed = this.store.canProceed;
  readonly isLoading = this.store.isLoading;

  // Computed Pricing in Display Currency
  readonly totalDisplayPrice = computed(async () => {
    const totalUsd = this.store.totalUsd();
    return this.currencyService.formatUsdToDisplay(totalUsd);
  });

  readonly displayCurrency = this.currencyService.displayCurrency;

  // Actions
  updateWizardData(data: Partial<BookingWizardData>) {
    this.store.updateData(data);
    this.recalculatePricing(); // Trigger recalc on data change
  }

  goToStep(step: BookingWizardStep) {
    this.store.setStep(step);
  }

  reset() {
    this.store.reset();
  }

  private recalculatePricing() {
    // TODO: Implement actual pricing logic here or call a PricingService
    // For now, this is a placeholder to show the flow
    const data = this.store.wizardData();
    if (!data.startDate || !data.endDate) return;

    // ... Pricing logic would go here, calculating days, extras, etc.
    // And finally calling:
    // this.store.setPricing({ ...calculatedPrice });
  }
}
