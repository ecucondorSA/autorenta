import { Injectable, inject, computed, signal } from '@angular/core';
import { BookingFlowStore, BookingWizardStep } from '@core/stores/booking-flow.store';
import { CurrencyService } from '@core/services/payments/currency.service';
import { BookingWizardData, BookingPrice } from '@core/models/booking-wizard.model';
import { CarsService } from '@core/services/cars/cars.service';
import { Car } from '@core/models';
import { differenceInCalendarDays } from 'date-fns';

@Injectable({
  providedIn: 'root',
})
export class BookingFlowFacade {
  private readonly store = inject(BookingFlowStore);
  private readonly currencyService = inject(CurrencyService);
  private readonly carsService = inject(CarsService);

  // State
  readonly currentCar = signal<Car | null>(null);

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
  async init(carId: string) {
    if (this.currentCar()?.id === carId) return;

    this.store.reset();
    this.store.updateData({ carId });

    try {
      const car = await this.carsService.getCarById(carId);
      if (car) {
        this.currentCar.set(car);
        // If car has a region_id, we might want to trigger dynamic pricing fetch here too
      }
    } catch (error) {
      console.error('Error loading car for booking:', error);
    }
  }

  updateWizardData(data: Partial<BookingWizardData>) {
    this.store.updateData(data);
    this.recalculatePricing(); // Trigger recalc on data change
  }

  goToStep(step: BookingWizardStep) {
    this.store.setStep(step);
  }

  reset() {
    this.store.reset();
    this.currentCar.set(null);
  }

  private async recalculatePricing() {
    const data = this.store.wizardData();
    const car = this.currentCar();

    if (!data.startDate || !data.endDate || !car) {
      return;
    }

    const days = Math.max(1, differenceInCalendarDays(data.endDate, data.startDate));

    // Determine base price in USD
    let dailyRateUsd = car.price_per_day;
    const rateUsdArs = await this.currencyService.getRate('USDARS');

    // Simple normalization: if currency is ARS, convert to USD
    if (car.currency === 'ARS') {
      dailyRateUsd = car.price_per_day / rateUsdArs;
    }

    // Extras Calculation
    let extrasUsd = 0;
    data.extras.forEach((extra) => {
      extrasUsd += extra.dailyRate * extra.quantity * days;
    });

    // Insurance Calculation (Placeholder logic)
    let insuranceUsd = 0;
    if (data.insuranceLevel === 'standard') insuranceUsd = 15 * days;
    if (data.insuranceLevel === 'premium') insuranceUsd = 30 * days;

    // Service Fee (e.g., 10%)
    const subtotal = dailyRateUsd * days + extrasUsd + insuranceUsd;
    const serviceFeeUsd = subtotal * 0.1;

    const totalAmountUsd = subtotal + serviceFeeUsd;

    // Calculate local amount (ARS)
    const totalAmountLocal = totalAmountUsd * rateUsdArs;

    const pricing: BookingPrice = {
      totalAmountUsd,
      totalAmountLocal,
      exchangeRate: rateUsdArs,
      currency: 'ARS', // Target local currency
      breakdown: {
        dailyRateUsd,
        insuranceUsd,
        serviceFeeUsd,
        extrasUsd,
        discountUsd: 0,
        totalDays: days,
      },
    };

    this.store.setPricing(pricing);
  }
}
