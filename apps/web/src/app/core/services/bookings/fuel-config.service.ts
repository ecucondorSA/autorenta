import { Injectable, inject } from '@angular/core';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';

export interface FuelConfig {
  tankLiters: number;
  pricePerLiterUsd: number;
  serviceMargin: number;
  fuelType: 'gasoline' | 'diesel' | 'premium' | 'electric';
}

/**
 * Service to provide dynamic fuel configuration for penalty calculations.
 * Replaces hardcoded constants with configurable values from the database.
 */
@Injectable({ providedIn: 'root' })
export class FuelConfigService {
  private readonly logger = inject(LoggerService);
  private readonly supabaseService = inject(SupabaseClientService);

  // Default values (fallback if DB config not available)
  private readonly DEFAULT_TANK_LITERS = 50;
  private readonly DEFAULT_PRICE_PER_LITER_USD = 1.5;
  private readonly DEFAULT_SERVICE_MARGIN = 1.2;

  // Regional fuel prices (USD per liter) - Updated periodically
  private readonly FUEL_PRICES: Record<string, number> = {
    gasoline: 1.35,
    diesel: 1.25,
    premium: 1.55,
    electric: 0, // No fuel penalty for electric vehicles
  };

  /**
   * Get fuel configuration for a specific car
   */
  async getConfig(carId: string): Promise<FuelConfig> {
    try {
      const supabase = this.supabaseService.getClient();
      const { data, error } = await supabase
        .from('cars')
        .select('fuel_tank_liters, fuel_type')
        .eq('id', carId)
        .single();

      if (error || !data) {
        this.logger.warn('Could not load car fuel config, using defaults:', 'FuelConfigService', error);
        return this.getDefaultConfig();
      }

      const fuelType = (data.fuel_type as FuelConfig['fuelType']) || 'gasoline';

      return {
        tankLiters: data.fuel_tank_liters ?? this.DEFAULT_TANK_LITERS,
        pricePerLiterUsd: this.FUEL_PRICES[fuelType] ?? this.DEFAULT_PRICE_PER_LITER_USD,
        serviceMargin: this.DEFAULT_SERVICE_MARGIN,
        fuelType,
      };
    } catch (error) {
      console.error('Error fetching fuel config:', error);
      return this.getDefaultConfig();
    }
  }

  /**
   * Calculate fuel penalty for a given level difference
   * @param config Fuel configuration
   * @param checkInLevel Fuel level at check-in (0-100)
   * @param checkOutLevel Fuel level at check-out (0-100)
   * @returns Penalty amount in USD
   */
  calculatePenalty(config: FuelConfig, checkInLevel: number, checkOutLevel: number): number {
    // Electric vehicles don't have fuel penalties
    if (config.fuelType === 'electric') {
      return 0;
    }

    // No penalty if returned with same or more fuel
    if (checkOutLevel >= checkInLevel) {
      return 0;
    }

    // Calculate missing fuel
    const levelDifference = checkInLevel - checkOutLevel; // e.g., 80 - 50 = 30%
    const litersPerPercent = config.tankLiters / 100;
    const missingLiters = levelDifference * litersPerPercent;

    // Calculate penalty with service margin
    const baseCost = missingLiters * config.pricePerLiterUsd;
    const penalty = baseCost * config.serviceMargin;

    // Round to 2 decimal places
    return Math.round(penalty * 100) / 100;
  }

  /**
   * Get default fuel configuration
   */
  private getDefaultConfig(): FuelConfig {
    return {
      tankLiters: this.DEFAULT_TANK_LITERS,
      pricePerLiterUsd: this.DEFAULT_PRICE_PER_LITER_USD,
      serviceMargin: this.DEFAULT_SERVICE_MARGIN,
      fuelType: 'gasoline',
    };
  }

  /**
   * Format penalty for display with explanation
   */
  formatPenaltyExplanation(
    config: FuelConfig,
    checkInLevel: number,
    checkOutLevel: number,
  ): string {
    const penalty = this.calculatePenalty(config, checkInLevel, checkOutLevel);

    if (penalty === 0) {
      return 'Sin penalización por combustible';
    }

    const levelDiff = checkInLevel - checkOutLevel;
    const litersPerPercent = config.tankLiters / 100;
    const missingLiters = Math.round(levelDiff * litersPerPercent * 10) / 10;

    return `${missingLiters}L faltantes × $${config.pricePerLiterUsd}/L × ${config.serviceMargin} (servicio) = $${penalty.toFixed(2)}`;
  }
}
