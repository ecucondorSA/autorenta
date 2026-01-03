/**
 * ============================================================================
 * RENTAL TERMS SERVICE
 * ============================================================================
 *
 * Manages configurable rental terms, extras, and penalties.
 * Replaces hardcoded values with database-driven configuration.
 *
 * Features:
 * - Load rental terms templates by owner or default
 * - Get available extras for a car/owner
 * - Calculate late return penalties dynamically
 * - Get platform fees from configuration
 *
 * @see database/migrations/013-create-rental-terms-system.sql
 * ============================================================================
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';

// ============================================================================
// INTERFACES
// ============================================================================

export interface RentalTermsTemplate {
  id: string;
  name: string;
  ownerId: string | null;

  // Fuel & Mileage
  fuelPolicy: 'full_to_full' | 'same_to_same' | 'prepaid';
  mileageLimitKm: number | null;
  extraKmPriceUsd: number;

  // Behavior rules
  allowSmoking: boolean;
  allowPets: boolean;
  smokingPenaltyUsd: number;
  petCleaningFeeUsd: number;
  generalCleaningFeeUsd: number;

  // Late return penalties
  lateReturnPenalties: LateReturnPenalty[];

  // Cancellation
  freeCancellationHours: number;
  cancellationPenaltyPercentage: number;

  // Metadata
  isDefault: boolean;
  active: boolean;
}

export interface LateReturnPenalty {
  hours_from: number;
  hours_to: number | null;
  multiplier: number;
  description: string;
}

export interface BookingExtra {
  id: string;
  ownerId: string | null;
  carId: string | null;

  extraType: 'gps' | 'child_seat' | 'additional_driver' | 'toll_transponder' | 'delivery' | 'insurance_upgrade' | 'other';
  extraName: string;
  description: string | null;

  dailyRateUsd: number;
  oneTimeFeeUsd: number;
  maxQuantity: number;

  requiresAdvanceBooking: boolean;
  advanceHoursRequired: number;

  active: boolean;
}

export interface PlatformFee {
  id: string;
  name: string;
  feeType: 'percentage' | 'fixed';
  feeValue: number;
  appliesTo: 'booking' | 'deposit' | 'extras' | 'all';
  minBookingUsd: number | null;
  maxFeeUsd: number | null;
  active: boolean;
}

export interface CalculatedExtras {
  extras: Array<{
    extra: BookingExtra;
    quantity: number;
    totalCost: number;
  }>;
  totalExtrasUsd: number;
}

// ============================================================================
// SERVICE
// ============================================================================

@Injectable({
  providedIn: 'root',
})
export class RentalTermsService {
  private readonly supabase = injectSupabase();
  private readonly logger = inject(LoggerService);

  // Cache signals
  private readonly defaultTermsCache = signal<RentalTermsTemplate | null>(null);
  private readonly platformFeesCache = signal<PlatformFee[]>([]);
  private readonly defaultExtrasCache = signal<BookingExtra[]>([]);
  private cacheTimestamp = 0;
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  // Computed: default platform fee percentage
  readonly platformFeePercentage = computed(() => {
    const fees = this.platformFeesCache();
    const bookingFee = fees.find(f => f.appliesTo === 'booking' && f.feeType === 'percentage');
    return bookingFee?.feeValue ?? 0.05; // Default 5%
  });

  // ============================================================================
  // RENTAL TERMS
  // ============================================================================

  /**
   * Get rental terms for a specific owner, falls back to default
   */
  async getTermsForOwner(ownerId: string): Promise<RentalTermsTemplate | null> {
    try {
      // Try owner-specific terms first
      const { data: ownerTerms, error: ownerError } = await this.supabase
        .from('rental_terms_templates')
        .select('*')
        .eq('owner_id', ownerId)
        .eq('active', true)
        .maybeSingle();

      if (!ownerError && ownerTerms) {
        return this.mapTermsFromDb(ownerTerms);
      }

      // Fall back to default terms
      return this.getDefaultTerms();
    } catch (err) {
      this.logger.error('Failed to get rental terms', 'RentalTermsService', err);
      return this.getDefaultTerms();
    }
  }

  /**
   * Get default rental terms template
   */
  async getDefaultTerms(): Promise<RentalTermsTemplate | null> {
    // Check cache
    if (this.defaultTermsCache() && Date.now() - this.cacheTimestamp < this.CACHE_TTL) {
      return this.defaultTermsCache();
    }

    try {
      const { data, error } = await this.supabase
        .from('rental_terms_templates')
        .select('*')
        .eq('is_default', true)
        .eq('active', true)
        .maybeSingle();

      if (error) {
        throw error;
      }

      const terms = data ? this.mapTermsFromDb(data) : this.getHardcodedDefault();
      this.defaultTermsCache.set(terms);
      this.cacheTimestamp = Date.now();

      return terms;
    } catch (err) {
      this.logger.error('Failed to get default terms', 'RentalTermsService', err);
      return this.getHardcodedDefault();
    }
  }

  /**
   * Calculate late return penalty
   */
  calculateLateReturnPenalty(
    terms: RentalTermsTemplate,
    hourlyRate: number,
    hoursLate: number
  ): { multiplier: number; penaltyAmount: number; description: string } {
    if (hoursLate <= 0) {
      return { multiplier: 1.0, penaltyAmount: 0, description: 'Sin demora' };
    }

    const penalties = terms.lateReturnPenalties;
    const applicablePenalty = penalties.find(p =>
      hoursLate >= p.hours_from &&
      (p.hours_to === null || hoursLate < p.hours_to)
    );

    if (!applicablePenalty) {
      // Use highest penalty if beyond all ranges
      const maxPenalty = penalties.reduce((max, p) =>
        p.multiplier > max.multiplier ? p : max
      , penalties[0]);

      return {
        multiplier: maxPenalty.multiplier,
        penaltyAmount: hourlyRate * hoursLate * maxPenalty.multiplier,
        description: maxPenalty.description,
      };
    }

    return {
      multiplier: applicablePenalty.multiplier,
      penaltyAmount: hourlyRate * hoursLate * applicablePenalty.multiplier,
      description: applicablePenalty.description,
    };
  }

  // ============================================================================
  // BOOKING EXTRAS
  // ============================================================================

  /**
   * Get available extras for a car/owner
   */
  async getAvailableExtras(ownerId: string, carId?: string): Promise<BookingExtra[]> {
    try {
      // Get owner-specific extras
      let query = this.supabase
        .from('booking_extras_config')
        .select('*')
        .eq('active', true)
        .or(`owner_id.eq.${ownerId},owner_id.is.null`);

      if (carId) {
        query = query.or(`car_id.eq.${carId},car_id.is.null`);
      }

      const { data, error } = await query.order('extra_type');

      if (error) {
        throw error;
      }

      return (data || []).map(this.mapExtraFromDb);
    } catch (err) {
      this.logger.error('Failed to get extras', 'RentalTermsService', err);
      return this.getDefaultExtras();
    }
  }

  /**
   * Get default extras (platform-wide)
   */
  async getDefaultExtras(): Promise<BookingExtra[]> {
    // Check cache
    if (this.defaultExtrasCache().length > 0 && Date.now() - this.cacheTimestamp < this.CACHE_TTL) {
      return this.defaultExtrasCache();
    }

    try {
      const { data, error } = await this.supabase
        .from('booking_extras_config')
        .select('*')
        .is('owner_id', null)
        .eq('active', true)
        .order('extra_type');

      if (error) {
        throw error;
      }

      const extras = (data || []).map(this.mapExtraFromDb);
      this.defaultExtrasCache.set(extras);

      return extras;
    } catch (err) {
      this.logger.error('Failed to get default extras', 'RentalTermsService', err);
      return this.getHardcodedExtras();
    }
  }

  /**
   * Calculate total cost for selected extras
   */
  calculateExtrasCost(
    extras: BookingExtra[],
    selectedExtras: Map<string, number>,
    rentalDays: number
  ): CalculatedExtras {
    const result: CalculatedExtras = {
      extras: [],
      totalExtrasUsd: 0,
    };

    for (const [extraId, quantity] of selectedExtras) {
      if (quantity <= 0) continue;

      const extra = extras.find(e => e.id === extraId);
      if (!extra) continue;

      const effectiveQuantity = Math.min(quantity, extra.maxQuantity);
      const totalCost = (extra.dailyRateUsd * rentalDays * effectiveQuantity) + (extra.oneTimeFeeUsd * effectiveQuantity);

      result.extras.push({
        extra,
        quantity: effectiveQuantity,
        totalCost,
      });

      result.totalExtrasUsd += totalCost;
    }

    return result;
  }

  // ============================================================================
  // PLATFORM FEES
  // ============================================================================

  /**
   * Get active platform fees
   */
  async getPlatformFees(): Promise<PlatformFee[]> {
    // Check cache
    if (this.platformFeesCache().length > 0 && Date.now() - this.cacheTimestamp < this.CACHE_TTL) {
      return this.platformFeesCache();
    }

    try {
      const { data, error } = await this.supabase
        .from('platform_fee_config')
        .select('*')
        .eq('active', true)
        .or('valid_until.is.null,valid_until.gt.now()');

      if (error) {
        throw error;
      }

      const fees = (data || []).map(this.mapFeeFromDb);
      this.platformFeesCache.set(fees);

      return fees;
    } catch (err) {
      this.logger.error('Failed to get platform fees', 'RentalTermsService', err);
      return [{ id: 'default', name: 'Default Fee', feeType: 'percentage', feeValue: 0.05, appliesTo: 'all', minBookingUsd: null, maxFeeUsd: null, active: true }];
    }
  }

  /**
   * Calculate platform fee for a booking
   */
  async calculatePlatformFee(bookingAmountUsd: number, extrasAmountUsd: number = 0): Promise<number> {
    const fees = await this.getPlatformFees();

    let totalFee = 0;

    for (const fee of fees) {
      let applicableAmount = 0;

      switch (fee.appliesTo) {
        case 'booking':
          applicableAmount = bookingAmountUsd;
          break;
        case 'extras':
          applicableAmount = extrasAmountUsd;
          break;
        case 'all':
          applicableAmount = bookingAmountUsd + extrasAmountUsd;
          break;
      }

      if (fee.minBookingUsd && applicableAmount < fee.minBookingUsd) {
        continue;
      }

      let feeAmount = 0;
      if (fee.feeType === 'percentage') {
        feeAmount = applicableAmount * fee.feeValue;
      } else {
        feeAmount = fee.feeValue;
      }

      if (fee.maxFeeUsd && feeAmount > fee.maxFeeUsd) {
        feeAmount = fee.maxFeeUsd;
      }

      totalFee += feeAmount;
    }

    return Math.round(totalFee * 100) / 100; // Round to 2 decimals
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private mapTermsFromDb(data: Record<string, unknown>): RentalTermsTemplate {
    return {
      id: data['id'] as string,
      name: data['name'] as string,
      ownerId: data['owner_id'] as string | null,
      fuelPolicy: data['fuel_policy'] as 'full_to_full' | 'same_to_same' | 'prepaid',
      mileageLimitKm: data['mileage_limit_km'] as number | null,
      extraKmPriceUsd: Number(data['extra_km_price_usd']) || 0.15,
      allowSmoking: Boolean(data['allow_smoking']),
      allowPets: Boolean(data['allow_pets']),
      smokingPenaltyUsd: Number(data['smoking_penalty_usd']) || 100,
      petCleaningFeeUsd: Number(data['pet_cleaning_fee_usd']) || 50,
      generalCleaningFeeUsd: Number(data['general_cleaning_fee_usd']) || 30,
      lateReturnPenalties: (data['late_return_penalties'] as LateReturnPenalty[]) || [],
      freeCancellationHours: Number(data['free_cancellation_hours']) || 24,
      cancellationPenaltyPercentage: Number(data['cancellation_penalty_percentage']) || 10,
      isDefault: Boolean(data['is_default']),
      active: Boolean(data['active']),
    };
  }

  private mapExtraFromDb(data: Record<string, unknown>): BookingExtra {
    return {
      id: data['id'] as string,
      ownerId: data['owner_id'] as string | null,
      carId: data['car_id'] as string | null,
      extraType: data['extra_type'] as BookingExtra['extraType'],
      extraName: data['extra_name'] as string,
      description: data['description'] as string | null,
      dailyRateUsd: Number(data['daily_rate_usd']) || 0,
      oneTimeFeeUsd: Number(data['one_time_fee_usd']) || 0,
      maxQuantity: Number(data['max_quantity']) || 1,
      requiresAdvanceBooking: Boolean(data['requires_advance_booking']),
      advanceHoursRequired: Number(data['advance_hours_required']) || 0,
      active: Boolean(data['active']),
    };
  }

  private mapFeeFromDb(data: Record<string, unknown>): PlatformFee {
    return {
      id: data['id'] as string,
      name: data['name'] as string,
      feeType: data['fee_type'] as 'percentage' | 'fixed',
      feeValue: Number(data['fee_value']) || 0,
      appliesTo: data['applies_to'] as PlatformFee['appliesTo'],
      minBookingUsd: data['min_booking_usd'] as number | null,
      maxFeeUsd: data['max_fee_usd'] as number | null,
      active: Boolean(data['active']),
    };
  }

  private getHardcodedDefault(): RentalTermsTemplate {
    return {
      id: 'hardcoded-default',
      name: 'Términos Estándar',
      ownerId: null,
      fuelPolicy: 'full_to_full',
      mileageLimitKm: null,
      extraKmPriceUsd: 0.15,
      allowSmoking: false,
      allowPets: false,
      smokingPenaltyUsd: 100,
      petCleaningFeeUsd: 50,
      generalCleaningFeeUsd: 30,
      lateReturnPenalties: [
        { hours_from: 0, hours_to: 3, multiplier: 1.5, description: '1-3 horas tarde' },
        { hours_from: 3, hours_to: 6, multiplier: 2.0, description: '3-6 horas tarde' },
        { hours_from: 6, hours_to: 24, multiplier: 2.5, description: '6-24 horas tarde' },
        { hours_from: 24, hours_to: null, multiplier: 3.0, description: 'Más de 24 horas tarde' },
      ],
      freeCancellationHours: 24,
      cancellationPenaltyPercentage: 10,
      isDefault: true,
      active: true,
    };
  }

  private getHardcodedExtras(): BookingExtra[] {
    return [
      { id: 'gps', ownerId: null, carId: null, extraType: 'gps', extraName: 'GPS Navigator', description: 'Navegador GPS', dailyRateUsd: 5, oneTimeFeeUsd: 0, maxQuantity: 1, requiresAdvanceBooking: false, advanceHoursRequired: 0, active: true },
      { id: 'child_seat', ownerId: null, carId: null, extraType: 'child_seat', extraName: 'Silla para niños', description: 'Silla de seguridad', dailyRateUsd: 3, oneTimeFeeUsd: 0, maxQuantity: 2, requiresAdvanceBooking: false, advanceHoursRequired: 0, active: true },
      { id: 'additional_driver', ownerId: null, carId: null, extraType: 'additional_driver', extraName: 'Conductor adicional', description: null, dailyRateUsd: 10, oneTimeFeeUsd: 0, maxQuantity: 2, requiresAdvanceBooking: false, advanceHoursRequired: 0, active: true },
    ];
  }

  /**
   * Clear all caches (useful after admin updates)
   */
  clearCache(): void {
    this.defaultTermsCache.set(null);
    this.platformFeesCache.set([]);
    this.defaultExtrasCache.set([]);
    this.cacheTimestamp = 0;
  }
}
