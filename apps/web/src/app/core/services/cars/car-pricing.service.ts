import { Injectable, inject } from '@angular/core';
import type { Car } from '@core/models';
import { AuthService } from '@core/services/auth/auth.service';
import { DynamicPricingService } from '@core/services/payments/dynamic-pricing.service';
import { CurrencyService } from '@core/services/payments/currency.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';

const ANON_USER_ID = '00000000-0000-0000-0000-000000000000';

export interface CarDailyPriceUsdQuote {
  priceUsd: number;
  surgeActive: boolean;
  surgeIcon: string;
}

/**
 * CarPricingService
 *
 * Single entrypoint for car price display logic (dynamic pricing + FX normalization).
 * Goal: keep money/pricing logic OUT of presentation components.
 */
@Injectable({
  providedIn: 'root',
})
export class CarPricingService {
  private readonly authService = inject(AuthService);
  private readonly dynamicPricingService = inject(DynamicPricingService);
  private readonly currencyService = inject(CurrencyService);
  private readonly logger = inject(LoggerService).createChildLogger('CarPricingService');

  /**
   * Convert a static car daily price to USD using the last known Binance rate.
   * Returns null if conversion is not possible yet (rates not loaded).
   */
  getStaticDailyPriceUsd(car: Pick<Car, 'price_per_day' | 'currency'>): number | null {
    return this.toUsd(car.price_per_day, car.currency);
  }

  /**
   * Compute dynamic daily price in USD for a car.
   * Uses cached auth session (no network call) to get userId when available.
   */
  async getDynamicDailyPriceUsd(
    car: Pick<Car, 'id' | 'region_id' | 'currency'>,
    options?: { rentalStart?: Date; rentalHours?: number },
  ): Promise<CarDailyPriceUsdQuote | null> {
    if (!car.region_id) return null;

    const rentalStart = options?.rentalStart ?? new Date();
    const rentalHours = options?.rentalHours ?? 24;

    const userId = this.authService.getCachedUserIdSync() ?? ANON_USER_ID;

    try {
      const response = await this.dynamicPricingService.calculatePriceRPC(
        car.region_id,
        userId,
        rentalStart.toISOString(),
        rentalHours,
      );

      const total = response.total_price;
      if (!Number.isFinite(total) || total <= 0) return null;

      const currency = (response.currency || car.currency || 'USD').toUpperCase();
      const priceUsd = this.toUsd(total, currency);
      if (priceUsd === null) return null;

      const badge = this.dynamicPricingService.getSurgeBadge(response);
      return {
        priceUsd,
        surgeActive: response.surge_active,
        surgeIcon: badge.show ? badge.icon : '',
      };
    } catch (error: unknown) {
      this.logger.debug('Failed to compute dynamic daily price', 'CarPricingService', {
        carId: car.id,
        regionId: car.region_id,
        error,
      });
      return null;
    }
  }

  /**
   * Fallback hourly pricing heuristic used when express quote fails.
   */
  calculateFallbackHourlyRateUsd(pricePerDayUsd: number): number {
    if (!Number.isFinite(pricePerDayUsd) || pricePerDayUsd <= 0) return 0;
    return (pricePerDayUsd * 0.75) / 24;
  }

  private toUsd(amount: number, currency: string | null | undefined): number | null {
    if (!Number.isFinite(amount) || amount <= 0) return null;

    const normalized = (currency || 'USD').toUpperCase();
    if (normalized === 'USD') return amount;

    // Dollar-first: show ARS prices as USD using raw Binance rate (no margin).
    if (normalized === 'ARS') {
      const rates = this.currencyService.exchangeRates();
      const binanceRate = rates?.binance;
      if (!binanceRate || !Number.isFinite(binanceRate) || binanceRate <= 0) return null;
      return amount / binanceRate;
    }

    // Unknown currency: treat as already normalized to USD to avoid hiding prices.
    return amount;
  }
}
