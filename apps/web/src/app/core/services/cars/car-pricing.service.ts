import { Injectable, inject } from '@angular/core';
import type { Car } from '@core/models';
import { AuthService } from '@core/services/auth/auth.service';
import { DynamicPricingService, type DynamicPricingResponse } from '@core/services/payments/dynamic-pricing.service';
import { CurrencyService } from '@core/services/payments/currency.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { CoalescingRequestBatcher } from '@core/utils/coalescing-request-batcher';
import {
  calculateFallbackHourlyRateUsd,
  normalizeToHourIso,
  toUsdDollarFirst,
} from '@core/utils/car-pricing.utils';

const ANON_USER_ID = '00000000-0000-0000-0000-000000000000';
const QUICK_QUOTE_CACHE_TTL_MS = 15000;

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

  private readonly dynamicQuoteBatcher = new CoalescingRequestBatcher<
    { userId: string; rentalStartIso: string; rentalHours: number },
    string,
    DynamicPricingResponse
  >(
    async (ctx, regionIds) =>
      this.dynamicPricingService.calculateBatchPricesRPC(
        regionIds,
        ctx.userId,
        ctx.rentalStartIso,
        ctx.rentalHours,
      ),
    { cacheTtlMs: QUICK_QUOTE_CACHE_TTL_MS },
  );

  /**
   * Convert a static car daily price to USD using the last known Binance rate.
   * Returns null if conversion is not possible yet (rates not loaded).
   */
  getStaticDailyPriceUsd(car: Pick<Car, 'price_per_day' | 'currency'>): number | null {
    return toUsdDollarFirst(car.price_per_day, car.currency, this.currencyService.exchangeRates());
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

    const userId = (await this.authService.getCachedUserId()) ?? ANON_USER_ID;
    const rentalStartIso = normalizeToHourIso(rentalStart);
    const contextId = `${userId}|${rentalStartIso}|${rentalHours}`;

    try {
      const response = await this.dynamicQuoteBatcher.request(
        { id: contextId, ctx: { userId, rentalStartIso, rentalHours } },
        car.region_id,
      );
      if (!response) return null;

      const total = response.total_price;
      if (!Number.isFinite(total) || total <= 0) return null;

      // Prefer server-provided USD quote when available.
      let priceUsd: number | null =
        typeof response.price_in_usd === 'number' && Number.isFinite(response.price_in_usd)
          ? response.price_in_usd
          : null;

      if (priceUsd === null) {
        const currency = response.currency || car.currency || 'USD';
        priceUsd = toUsdDollarFirst(total, currency, this.currencyService.exchangeRates());
      }
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
    return calculateFallbackHourlyRateUsd(pricePerDayUsd);
  }
}
