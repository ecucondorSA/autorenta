import { Injectable, computed, inject, signal } from '@angular/core';
import { formatMoney, Currency } from '@shared/utils/money.utils';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { ExchangeRateService } from './exchange-rate.service';

@Injectable({
  providedIn: 'root',
})
export class CurrencyService {
  private readonly logger = inject(LoggerService);
  private readonly exchangeRateService = inject(ExchangeRateService);

  // 1. State: Active Display Currency (User Preference)
  // Default to USD as per "Dollar First" policy
  readonly displayCurrency = signal<Currency>('USD');

  // 2. State: Exchange Rates (Reactive)
  // Expose the raw rates from the underlying service if needed
  readonly exchangeRates = computed(() => this.exchangeRateService.getLastKnownRates());

  constructor() {
    // Eagerly load rates on init
    this.exchangeRateService.getBinanceRate().catch((err) => {
      this.logger.warn(`Could not fetch initial rates: ${err}`, 'CurrencyService');
    });
  }

  /**
   * Set the user's preferred display currency
   */
  setCurrency(currency: Currency) {
    this.displayCurrency.set(currency);
  }

  /**
   * Format a canonical USD amount to the current display currency
   * @param amountUsd Amount in USD (units, not cents)
   */
  async formatUsdToDisplay(amountUsd: number): Promise<string> {
    const target = this.displayCurrency();

    if (target === 'USD') {
      return formatMoney(amountUsd, 'USD');
    }

    // Convert if needed
    let converted = amountUsd;
    if (target === 'ARS') {
      converted = await this.exchangeRateService.convertUsdToArs(amountUsd, false); // Use market rate for display
    }

    return formatMoney(converted, target);
  }

  /**
   * Get the current exchange rate for a pair
   * Delegate to ExchangeRateService
   */
  async getRate(pair: 'USDARS' = 'USDARS'): Promise<number> {
    return this.exchangeRateService.getBinanceRate(pair);
  }

  /**
   * Synchronous helper for templates (requires rates to be loaded)
   * Returns null if rates are not ready
   */
  getInstantRate(_pair: 'USDARS' = 'USDARS'): number | null {
    const rates = this.exchangeRateService.getLastKnownBinanceRate();
    return rates;
  }
}
