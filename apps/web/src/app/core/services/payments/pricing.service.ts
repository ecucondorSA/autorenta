import { Injectable, inject } from '@angular/core';
import { environment } from '@environment';
import type { VehicleCategory } from '@core/models';
import type { LocationCoords } from '@core/models/marketplace.model';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { DistanceCalculatorService } from '@core/services/geo/distance-calculator.service';

export interface QuoteBreakdown {
  price_subtotal: number;
  discount: number;
  service_fee: number;
  total: number;
  // Distance-based pricing fields
  delivery_fee?: number;
  delivery_distance_km?: number;
  distance_risk_tier?: 'local' | 'regional' | 'long_distance';
  // ✅ NEW: Dynamic pricing flags (Sprint 2)
  pricing_strategy?: 'dynamic' | 'custom';
  dynamic_pricing_applied?: boolean;
}

// ✅ VehicleCategory imported from ../models (uses base_daily_rate_pct)

export interface VehicleValueEstimation {
  estimated_value_usd: number;
  confidence: 'high' | 'medium' | 'low' | 'none';
  source: 'pricing_model' | 'category_fallback';
  category_id?: string;
  category_name?: string;
  suggested_daily_rate_usd?: number;
}

export interface FipeValueResult {
  success: boolean;
  data?: {
    value_brl: number;
    value_usd: number;
    value_ars: number;
    fipe_code: string;
    source: string;
    confidence: string;
    reference_month: string;
    brand_found: string;
    model_found: string;
  };
  error?: string;
  errorCode?: string; // ✅ NEW: Machine-readable error code
  suggestions?: string[]; // ✅ NEW: Actionable suggestions
  availableOptions?: {
    brands?: string[];
    models?: string[];
    years?: number[];
  };
  timestamp?: string;
}

export interface FipeBrand {
  code: string;
  name: string;
}

export interface FipeModel {
  code: string;
  name: string;
}

export interface FipeBaseModel {
  baseName: string;
  variants: FipeModel[];
}

/** Average vehicle values by category (USD) for rate estimation fallback */
const CATEGORY_AVERAGE_VALUES_USD: Record<string, number> = {
  economy: 8_000,
  standard: 15_000,
  premium: 35_000,
  luxury: 80_000,
} as const;

/** Default fallback value when category is unknown */
const DEFAULT_VEHICLE_VALUE_USD = 15_000;

/** Default daily rate percentage (0.3% of vehicle value) */
const DEFAULT_DAILY_RATE_PCT = 0.003;

@Injectable({
  providedIn: 'root',
})
export class PricingService {
  private readonly supabase = injectSupabase();
  private readonly distanceCalculator = inject(DistanceCalculatorService);

  /** Cache for vehicle categories to avoid N+1 queries */
  private categoriesCache: Map<string, string> | null = null;

  async quoteBooking(params: {
    carId: string;
    start: string;
    end: string;
    promoCode?: string;
    userLocation?: LocationCoords;
  }): Promise<QuoteBreakdown> {
    // Get base quote from RPC
    const { data, error } = await this.supabase.rpc('quote_booking', {
      p_car_id: params.carId,
      p_start: params.start,
      p_end: params.end,
      p_promo: params.promoCode ?? null,
    });
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error(`No se pudo calcular la cotización para el vehículo ${params.carId}`);
    }

    const baseQuote = data[0] as QuoteBreakdown;

    // If user location provided, calculate delivery fee
    if (params.userLocation) {
      const distanceData = await this.calculateDeliveryFee(params.carId, params.userLocation);

      if (distanceData) {
        baseQuote.delivery_fee = distanceData.deliveryFeeCents / 100; // Convert to USD
        baseQuote.delivery_distance_km = distanceData.distanceKm;
        baseQuote.distance_risk_tier = distanceData.tier;
        baseQuote.total += baseQuote.delivery_fee;
      }
    }

    return baseQuote;
  }

  /**
   * Calculate delivery fee based on distance between user and car
   * @param carId Car ID
   * @param userLocation User location coordinates
   * @returns Delivery fee data or null if car location not available
   */
  async calculateDeliveryFee(
    carId: string,
    userLocation: LocationCoords,
  ): Promise<{
    distanceKm: number;
    deliveryFeeCents: number;
    tier: 'local' | 'regional' | 'long_distance';
  } | null> {
    // Get car location
    const { data: car, error } = await this.supabase
      .from('cars')
      .select('location_lat, location_lng')
      .eq('id', carId)
      .single();

    if (error || !car || !car.location_lat || !car.location_lng) {
      return null;
    }

    // Calculate distance
    const distanceKm = this.distanceCalculator.calculateDistance(
      userLocation.lat,
      userLocation.lng,
      car.location_lat,
      car.location_lng,
    );

    // Calculate delivery fee
    const deliveryFeeCents = this.distanceCalculator.calculateDeliveryFee(distanceKm);

    // Get tier
    const tier = this.distanceCalculator.getDistanceTier(distanceKm);

    return {
      distanceKm,
      deliveryFeeCents,
      tier,
    };
  }

  async cancelWithFee(bookingId: string): Promise<number> {
    const { data, error } = await this.supabase.rpc('cancel_with_fee', {
      p_booking_id: bookingId,
    });
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error('No se pudo cancelar la reserva');
    }
    return Number(data[0].cancel_fee ?? 0);
  }

  /**
   * Get all vehicle categories from database
   */
  async getVehicleCategories(): Promise<VehicleCategory[]> {
    const { data, error } = await this.supabase
      .from('vehicle_categories')
      .select(
        'id, code, name, name_es, base_daily_rate_pct, depreciation_rate_annual, surge_sensitivity, description, display_order, active',
      )
      .eq('active', true)
      .order('display_order');

    if (error) {
      console.error('[PricingService] Error fetching vehicle categories:', error);
      return [];
    }
    return data || [];
  }

  /**
   * Get category name by ID using cached data to avoid N+1 queries
   */
  private async getCategoryNameById(categoryId: string): Promise<string | undefined> {
    // Initialize cache if needed
    if (!this.categoriesCache) {
      const categories = await this.getVehicleCategories();
      this.categoriesCache = new Map(categories.map((c) => [c.id, c.name_es ?? c.name]));
    }
    return this.categoriesCache.get(categoryId);
  }

  /**
   * Estimate vehicle value using SQL function
   * Calls estimate_vehicle_value_usd(brand, model, year, country)
   */
  async estimateVehicleValue(params: {
    brand: string;
    model: string;
    year: number;
    country?: string;
  }): Promise<VehicleValueEstimation | null> {
    // Call estimate function (note: p_country not used by SQL function)
    const { data, error } = await this.supabase.rpc('estimate_vehicle_value_usd', {
      p_brand: params.brand,
      p_model: params.model,
      p_year: params.year,
    });

    if (error) {
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    const result = data[0];

    // Map SQL column names to frontend interface
    // SQL returns: estimated_value, confidence_level, data_source, category_id
    const estimatedValue = result.estimated_value ?? 0;

    // Calculate suggested daily rate based on vehicle value
    const suggestedRate = estimatedValue > 0 ? estimatedValue * DEFAULT_DAILY_RATE_PCT : undefined;

    // Get category name from cache (avoids N+1 query)
    const categoryName = result.category_id
      ? await this.getCategoryNameById(result.category_id)
      : undefined;

    return {
      estimated_value_usd: estimatedValue,
      confidence: result.confidence_level,
      source: result.data_source,
      category_id: result.category_id,
      category_name: categoryName,
      suggested_daily_rate_usd: suggestedRate,
    };
  }

  /**
   * Get vehicle value in realtime via Edge Function
   * Calls get-fipe-value Edge Function for fresh market data
   *
   * Note: This method requires exact brand/model names from vehicle database
   * Use brand_text_backup and model_text_backup from database which store exact names
   */
  async getFipeValueRealtime(params: {
    brand: string;
    model: string;
    year: number;
    country?: string;
  }): Promise<FipeValueResult | null> {
    try {
      const url = `${environment.supabaseUrl}/functions/v1/get-fipe-value`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${environment.supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brand: params.brand,
          model: params.model,
          year: params.year,
          country: params.country || 'AR',
        }),
      });

      if (!response.ok) {
        return null;
      }

      const result: FipeValueResult = await response.json();
      return result;
    } catch (error) {
      console.error('[PricingService] getFipeValueRealtime failed:', error);
      return null;
    }
  }

  /**
   * Calculate suggested daily rate for a category
   * Uses base_rate_multiplier from category
   */
  async calculateSuggestedRate(params: {
    categoryId: string;
    estimatedValueUsd?: number;
  }): Promise<number | null> {
    const { data } = await this.supabase
      .from('vehicle_categories')
      .select('base_daily_rate_pct, code')
      .eq('id', params.categoryId)
      .single();

    if (!data) {
      return null;
    }

    const ratePct = data.base_daily_rate_pct ?? DEFAULT_DAILY_RATE_PCT;

    // If we have estimated value, use it with the category's rate percentage
    if (params.estimatedValueUsd) {
      return params.estimatedValueUsd * ratePct;
    }

    // Otherwise use category default with average values
    const categoryCode = data.code?.toLowerCase() || '';
    const matchedCategory = Object.keys(CATEGORY_AVERAGE_VALUES_USD).find((name) =>
      categoryCode.includes(name),
    );
    const avgValue = matchedCategory
      ? CATEGORY_AVERAGE_VALUES_USD[matchedCategory]
      : DEFAULT_VEHICLE_VALUE_USD;

    return avgValue * ratePct;
  }

  /**
   * Get all vehicle brands from FIPE API via Edge Function (with server-side caching)
   *
   * ✅ FIX (2026-01-30): Uses Edge Function proxy to prevent client rate limiting
   * - Brands are cached for 24 hours on server
   * - Falls back to direct API if Edge Function fails
   */
  async getFipeBrands(): Promise<FipeBrand[]> {
    try {
      // Try Edge Function first (cached)
      const edgeFunctionUrl = `${environment.supabaseUrl}/functions/v1/get-fipe-catalog?action=brands`;
      const response = await fetch(edgeFunctionUrl, {
        headers: {
          Authorization: `Bearer ${environment.supabaseAnonKey}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          console.log(`[PricingService] Got ${result.data.length} brands from Edge Function (cached)`);
          return result.data;
        }
      }

      // Fallback to direct API (may hit rate limit)
      console.warn('[PricingService] Edge Function failed, falling back to direct FIPE API');
      const directResponse = await fetch('https://parallelum.com.br/fipe/api/v2/cars/brands');
      if (!directResponse.ok) {
        return [];
      }
      return await directResponse.json();
    } catch (error) {
      console.error('[PricingService] getFipeBrands failed:', error);
      return [];
    }
  }

  /**
   * Get all vehicle models for a specific brand via Edge Function (with server-side caching)
   *
   * ✅ FIX (2026-01-30): Uses Edge Function proxy to prevent client rate limiting
   * - Models are cached for 6 hours on server per brand
   * - Falls back to direct API if Edge Function fails
   *
   * @param brandCode FIPE brand code (e.g., "59" for VW)
   */
  async getFipeModels(brandCode: string): Promise<FipeModel[]> {
    try {
      // Try Edge Function first (cached)
      const edgeFunctionUrl = `${environment.supabaseUrl}/functions/v1/get-fipe-catalog?action=models&brandCode=${brandCode}`;
      const response = await fetch(edgeFunctionUrl, {
        headers: {
          Authorization: `Bearer ${environment.supabaseAnonKey}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          console.log(`[PricingService] Got ${result.data.length} models for brand ${brandCode} from Edge Function (cached)`);
          return result.data;
        }
      }

      // Fallback to direct API (may hit rate limit)
      console.warn(`[PricingService] Edge Function failed for brand ${brandCode}, falling back to direct FIPE API`);
      const directResponse = await fetch(
        `https://parallelum.com.br/fipe/api/v2/cars/brands/${brandCode}/models`,
      );
      if (!directResponse.ok) {
        return [];
      }
      return await directResponse.json();
    } catch (error) {
      console.error(`[PricingService] getFipeModels failed for brand ${brandCode}:`, error);
      return [];
    }
  }

  /**
   * Cache for model year availability to avoid repeated API calls
   * Key format: "brandCode-modelCode" -> array of year codes
   */
  private readonly modelYearsCache = new Map<string, string[]>();

  /**
   * Get FIPE models filtered by year availability
   * Only returns models that were available in the specified year
   *
   * ⚠️ RATE LIMITING FIX (2026-01-30):
   * - Reduced batch size from 10 to 3 to avoid 429 errors
   * - Added 500ms delay between batches
   * - Added caching to avoid repeated requests
   *
   * @param brandCode FIPE brand code
   * @param year Year to filter by (e.g., 2016)
   */
  async getFipeModelsByYear(brandCode: string, year: number): Promise<FipeModel[]> {
    try {
      const allModels = await this.getFipeModels(brandCode);
      if (allModels.length === 0) return [];

      // ✅ FIX: Reduced batch size to avoid rate limiting (429 errors)
      const BATCH_SIZE = 3;
      const DELAY_BETWEEN_BATCHES_MS = 500;
      const availableModels: FipeModel[] = [];

      for (let i = 0; i < allModels.length; i += BATCH_SIZE) {
        const batch = allModels.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(
          batch.map(async (model) => {
            const hasYear = await this.checkModelYearAvailability(brandCode, model.code, year);
            return hasYear ? model : null;
          }),
        );
        availableModels.push(...results.filter((m): m is FipeModel => m !== null));

        // ✅ FIX: Add delay between batches to respect rate limits
        if (i + BATCH_SIZE < allModels.length) {
          await this.delay(DELAY_BETWEEN_BATCHES_MS);
        }
      }

      return availableModels;
    } catch (error) {
      console.error(`[PricingService] getFipeModelsByYear failed:`, error);
      return [];
    }
  }

  /**
   * Helper to add delay between API calls
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if a specific year is available for a model
   * Uses caching and retry with exponential backoff for 429 errors
   */
  private async checkModelYearAvailability(
    brandCode: string,
    modelCode: string,
    year: number,
  ): Promise<boolean> {
    const cacheKey = `${brandCode}-${modelCode}`;

    // ✅ FIX: Check cache first
    if (this.modelYearsCache.has(cacheKey)) {
      const cachedYears = this.modelYearsCache.get(cacheKey)!;
      return cachedYears.some((y) => y.startsWith(`${year}-`) || y.includes(String(year)));
    }

    // Fetch with retry for rate limiting
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(
          `https://parallelum.com.br/fipe/api/v2/cars/brands/${brandCode}/models/${modelCode}/years`,
        );

        // ✅ FIX: Handle rate limiting with exponential backoff
        if (response.status === 429) {
          const backoffMs = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
          console.warn(`[PricingService] Rate limited (429), retrying in ${backoffMs}ms...`);
          await this.delay(backoffMs);
          continue;
        }

        if (!response.ok) return false;

        const years: Array<{ code: string; name: string }> = await response.json();
        const yearCodes = years.map(y => y.code);

        // ✅ FIX: Cache the result
        this.modelYearsCache.set(cacheKey, yearCodes);

        return yearCodes.some((y) => y.startsWith(`${year}-`) || y.includes(String(year)));
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        // Wait before retry on network errors
        if (attempt < maxRetries - 1) {
          await this.delay(500);
        }
      }
    }

    if (lastError) {
      console.warn(`[PricingService] checkModelYearAvailability failed after ${maxRetries} attempts:`, lastError.message);
    }
    return false;
  }

  /**
   * Extract base model name from full model name
   * e.g., "Gol 1.0 Flex 12V 5p" -> "Gol"
   * e.g., "Corolla XEi 2.0" -> "Corolla"
   */
  extractBaseModelName(fullModelName: string): string {
    // Remove engine specs (numbers with dots)
    let baseName = fullModelName.replace(/\s+\d+\.\d+.*$/i, '');

    // Remove version info in parentheses
    baseName = baseName.replace(/\s*\(.*?\)\s*/g, ' ');

    // Remove common version suffixes
    baseName = baseName.replace(/\s+(Flex|Turbo|TDI|TSI|GTI|Sport|Plus|Life|Comfort).*$/i, '');

    // Clean up extra spaces
    baseName = baseName.trim().replace(/\s+/g, ' ');

    return baseName;
  }

  /**
   * Group models by base name
   * Returns grouped models with first variant as representative
   */
  groupModelsByBaseName(models: FipeModel[]): FipeBaseModel[] {
    const grouped = new Map<string, FipeModel[]>();

    for (const model of models) {
      const baseName = this.extractBaseModelName(model.name);

      if (!grouped.has(baseName)) {
        grouped.set(baseName, []);
      }

      grouped.get(baseName)!.push(model);
    }

    // Convert to array and return
    return Array.from(grouped.entries()).map(([baseName, variants]) => ({
      baseName,
      variants,
    }));
  }

  /**
   * Get FIPE models grouped by base name
   * Returns simplified list with one entry per model type
   */
  async getFipeBaseModels(brandCode: string): Promise<FipeBaseModel[]> {
    const allModels = await this.getFipeModels(brandCode);
    return this.groupModelsByBaseName(allModels);
  }

  /**
   * Search FIPE value using base model name + year
   * Automatically finds best matching variant for the year
   */
  async getFipeValueByBaseModel(params: {
    brand: string;
    baseModel: string;
    year: number;
    brandCode: string;
    country?: string;
  }): Promise<FipeValueResult | null> {
    try {
      // Get all variants for this base model
      const allModels = await this.getFipeModels(params.brandCode);
      const baseName = params.baseModel;

      // Find variants matching base name
      const matchingVariants = allModels.filter((model) => {
        const modelBaseName = this.extractBaseModelName(model.name);
        return modelBaseName.toLowerCase() === baseName.toLowerCase();
      });

      if (matchingVariants.length === 0) {
        return {
          success: false,
          error: `No se encontraron variantes para el modelo ${baseName}`,
        };
      }

      // Try variants in parallel batches of 3 for better performance
      const BATCH_SIZE = 3;
      for (let i = 0; i < matchingVariants.length; i += BATCH_SIZE) {
        const batch = matchingVariants.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(
          batch.map((variant) =>
            this.getFipeValueRealtime({
              brand: params.brand,
              model: variant.name,
              year: params.year,
              country: params.country || 'AR',
            }),
          ),
        );

        // Return first successful result from this batch
        const successResult = results.find((r) => r?.success);
        if (successResult) {
          return successResult;
        }
      }

      // No variant had data for this year
      return {
        success: false,
        error: `No se encontró información de precio para ${baseName} ${params.year}`,
      };
    } catch (error) {
      console.error(
        `[PricingService] getFipeValueByBaseModel failed for ${params.brand} ${params.baseModel}:`,
        error,
      );
      return null;
    }
  }
}
