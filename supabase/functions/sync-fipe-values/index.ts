// ============================================================================
// EDGE FUNCTION: sync-fipe-values (v2 with Binance Integration)
// ============================================================================
//
// Purpose:
// Sync vehicle valuations from FIPE Online API (Brazil) and convert to
// multiple currencies using Binance API for accurate real-time rates.
//
// Flow:
// 1. Fetch vehicles from database (ARG or BR)
// 2. For ARG vehicles: Find Brazil model equivalent
// 3. Query FIPE API for Brazil price (in BRL)
// 4. Convert BRL → USD using Binance API (BRLUSD pair)
// 5. Convert USD → ARS using Binance API (USDTARS pair)
// 6. Save all 3 values (BRL, USD, ARS) in database
//
// APIs Used:
// - FIPE Online: https://fipe.parallelum.com.br/api/v2
// - Binance: https://api.binance.com/api/v3/ticker/price
//
// Example:
// Fiat Strada 2024 (BR) = R$ 125.000 BRL
//   → Binance: 1 BRL = 0.20 USD → $25,000 USD
//   → Binance: 1 USD = 1,100 ARS → $27,500,000 ARS
//
// Auth: No authentication required (free API)
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { getCorsHeaders } from '../_shared/cors.ts';

// ============================================================================
// CONFIGURATION
// ============================================================================

// Free API from Parallelum (no token required, 500 req/day)
const FIPE_API_BASE = 'https://parallelum.com.br/fipe/api/v2';
// Token not needed for free API
const FIPE_TOKEN = '';

// Binance API endpoints (no auth required for public price data)
const BINANCE_API_BASE = 'https://api.binance.com/api/v3';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface FipeVehicleResponse {
  // API v2 fields
  brand?: string;
  model?: string;
  modelYear?: number;
  fuel?: string;
  fuelAcronym?: string;
  codeFipe?: string;
  price?: string; // "R$ 125.000,00"
  referenceMonth?: string;
  // Legacy API v1 fields (fallback)
  marca?: string;
  modelo?: string;
  anoModelo?: number;
  combustivel?: string;
  codigoFipe?: string;
  precoAtual?: string;
  mesReferencia?: string;
}

interface BinancePrice {
  symbol: string;
  price: string; // "0.20000000"
}

interface ConversionRates {
  brl_to_usd: number; // Example: 0.20 (1 BRL = 0.20 USD)
  usd_to_ars: number; // Example: 1100 (1 USD = 1100 ARS)
  timestamp: Date;
}

interface SyncResult {
  total_cars: number;
  synced: number;
  skipped: number;
  failed: number;
  errors: string[];
}

// ============================================================================
// CURRENCY CONVERSION FUNCTIONS
// ============================================================================

/**
 * Fetch BRL → USD conversion rate from Binance
 *
 * Uses BRLBUSD trading pair (BRL to USD direct)
 * Binance API returns real-time market rate
 *
 * @returns Rate (e.g., 0.20 means 1 BRL = 0.20 USD)
 */
async function getBRLtoUSDRate(): Promise<number> {
  try {
    const response = await fetch(`${BINANCE_API_BASE}/ticker/price?symbol=BRLBUSD`);

    if (!response.ok) {
      console.error(`❌ Binance BRL/USD request failed: ${response.status}`);
      // Fallback rate: 1 BRL ≈ 0.20 USD (may be outdated)
      return 0.20;
    }

    const data: BinancePrice = await response.json();
    const rate = parseFloat(data.price);

    console.log(`✅ Binance BRL/USD rate: ${rate}`);
    return rate;
  } catch (error) {
    console.error('❌ Error fetching Binance BRL/USD rate:', error);
    return 0.20; // Fallback
  }
}

/**
 * Fetch USD → ARS conversion rate from Binance
 *
 * Uses USDTARS trading pair (USDT/ARS, proxy for USD/ARS)
 * USDT (Tether) is pegged 1:1 to USD, so USDTARS ≈ USD/ARS
 *
 * Note: Argentina has currency controls, so crypto rates may differ
 * from official rates. Binance reflects real market (parallel) rate.
 *
 * @returns Rate (e.g., 1100 means 1 USD = 1100 ARS)
 */
async function getUSDtoARSRate(): Promise<number> {
  try {
    const response = await fetch(`${BINANCE_API_BASE}/ticker/price?symbol=USDTARS`);

    if (!response.ok) {
      console.error(`❌ Binance USD/ARS request failed: ${response.status}`);
      // Fallback rate: 1 USD ≈ 1000 ARS (approximate, may be outdated)
      return 1000;
    }

    const data: BinancePrice = await response.json();
    const rate = parseFloat(data.price);

    console.log(`✅ Binance USD/ARS rate: ${rate}`);
    return rate;
  } catch (error) {
    console.error('❌ Error fetching Binance USD/ARS rate:', error);
    return 1000; // Fallback
  }
}

/**
 * Fetch all conversion rates from Binance
 *
 * Gets both BRL→USD and USD→ARS rates in parallel
 */
async function getConversionRates(): Promise<ConversionRates> {
  const [brlToUsd, usdToArs] = await Promise.all([
    getBRLtoUSDRate(),
    getUSDtoARSRate(),
  ]);

  return {
    brl_to_usd: brlToUsd,
    usd_to_ars: usdToArs,
    timestamp: new Date(),
  };
}

/**
 * Parse Brazilian Real price string to number
 *
 * FIPE returns prices as "R$ 125.000,00"
 * - Remove "R$" prefix
 * - Remove thousand separators (.)
 * - Replace decimal separator (,) with (.)
 *
 * Example: "R$ 125.000,00" → 125000.00
 */
function parseBRLPrice(priceStr: string): number {
  // Remove "R$" and whitespace
  const cleaned = priceStr.replace(/R\$\s*/g, '').trim();
  // Replace thousand separator (.) with nothing
  const withoutThousands = cleaned.replace(/\./g, '');
  // Replace decimal separator (,) with .
  const normalized = withoutThousands.replace(/,/g, '.');
  return parseFloat(normalized);
}

/**
 * Convert BRL amount to USD and ARS
 *
 * Chain conversion: BRL → USD → ARS
 * Example:
 *   Input: 125,000 BRL
 *   Step 1: 125,000 * 0.20 = 25,000 USD
 *   Step 2: 25,000 * 1,100 = 27,500,000 ARS
 */
function convertCurrency(
  brlAmount: number,
  rates: ConversionRates,
): { usd: number; ars: number } {
  const usd = Math.round(brlAmount * rates.brl_to_usd);
  const ars = Math.round(usd * rates.usd_to_ars);

  return { usd, ars };
}

// ============================================================================
// MODEL EQUIVALENCE FUNCTIONS
// ============================================================================

/**
 * Find Brazil model equivalent for Argentina model
 *
 * Example:
 *   findBrazilEquivalent('Volkswagen', 'Fusion') → 'Vento'
 *   findBrazilEquivalent('Fiat', 'Strada') → 'Strada' (same)
 *
 * Uses database table: vehicle_model_equivalents
 */
async function findBrazilEquivalent(
  supabase: any,
  brand: string,
  modelArgentina: string,
): Promise<string> {
  const { data, error } = await supabase.rpc('find_brazil_model_equivalent', {
    p_brand: brand,
    p_model_argentina: modelArgentina,
  });

  if (error || !data || data.length === 0) {
    // If no mapping found, assume same name
    console.log(`ℹ️  No Brazil equivalent found for ${brand} ${modelArgentina}, using same name`);
    return modelArgentina;
  }

  const equivalent = data[0].model_brazil;
  console.log(`✅ Brazil equivalent: ${brand} ${modelArgentina} (ARG) → ${equivalent} (BR)`);
  return equivalent;
}

// ============================================================================
// FIPE API FUNCTIONS
// ============================================================================

/**
 * Search FIPE API for vehicle valuation
 *
 * FIPE API structure:
 *   1. GET /cars/brands → Find brand code
 *   2. GET /cars/brands/{brandCode}/models → Find model code
 *   3. GET /cars/brands/{brandCode}/models/{modelCode}/years → Find year code
 *   4. GET /cars/brands/{brandCode}/models/{modelCode}/years/{yearCode} → Get price
 *
 * @param brand Brand name (e.g., "Fiat")
 * @param model Model name (e.g., "Strada")
 * @param year Model year (e.g., 2024)
 * @returns Price data from FIPE or null if not found
 */
async function searchFipeVehicle(
  brand: string,
  model: string,
  year: number,
): Promise<FipeVehicleResponse | null> {
  try {
    // ========================================================================
    // Step 1: Find brand code
    // ========================================================================
    const brandsResponse = await fetch(`${FIPE_API_BASE}/cars/brands`);

    if (!brandsResponse.ok) {
      console.error(`❌ FIPE brands request failed: ${brandsResponse.status}`);
      return null;
    }

    const brands = await brandsResponse.json();
    const matchedBrand = brands.find(
      (b: any) => (b.name || b.nome || '').toLowerCase().includes(brand.toLowerCase()),
    );

    if (!matchedBrand) {
      console.log(`❌ Brand not found in FIPE: ${brand}`);
      return null;
    }

    const brandCode = matchedBrand.code || matchedBrand.codigo;
    console.log(`✅ Found brand: ${matchedBrand.name || matchedBrand.nome} (code: ${brandCode})`);

    // ========================================================================
    // Step 2: Find model code
    // ========================================================================
    const modelsResponse = await fetch(
      `${FIPE_API_BASE}/cars/brands/${brandCode}/models`
    );

    if (!modelsResponse.ok) {
      console.error(`❌ FIPE models request failed: ${modelsResponse.status}`);
      return null;
    }

    const modelsData = await modelsResponse.json();
    // API v2 returns array directly, not nested in 'modelos'
    const modelsList = Array.isArray(modelsData) ? modelsData : (modelsData.modelos || []);
    const matchedModel = modelsList.find(
      (m: any) => (m.name || m.nome || '').toLowerCase().includes(model.toLowerCase()),
    );

    if (!matchedModel) {
      console.log(`❌ Model not found in FIPE: ${model} for brand ${brand}`);
      console.log(`Available models (first 5): ${modelsList.slice(0, 5).map((m: any) => m.name || m.nome).join(', ')}...`);
      return null;
    }

    const modelCode = matchedModel.code || matchedModel.codigo;
    console.log(`✅ Found model: ${matchedModel.name || matchedModel.nome} (code: ${modelCode})`);

    // ========================================================================
    // Step 3: Find year code
    // ========================================================================
    const yearsResponse = await fetch(
      `${FIPE_API_BASE}/cars/brands/${brandCode}/models/${modelCode}/years`
    );

    if (!yearsResponse.ok) {
      console.error(`❌ FIPE years request failed: ${yearsResponse.status}`);
      return null;
    }

    const years = await yearsResponse.json();
    const matchedYear = years.find(
      (y: any) => {
        const yearName = y.name || y.nome || '';
        const yearCode = y.code || y.codigo || '';
        return yearName.includes(year.toString()) || yearCode.includes(year.toString());
      }
    );

    if (!matchedYear) {
      console.log(`❌ Year not found in FIPE: ${year}`);
      console.log(`Available years (first 5): ${years.slice(0, 5).map((y: any) => y.name || y.nome).join(', ')}...`);
      return null;
    }

    const yearCode = matchedYear.code || matchedYear.codigo;
    console.log(`✅ Found year: ${matchedYear.name || matchedYear.nome} (code: ${yearCode})`);

    // ========================================================================
    // Step 4: Get vehicle pricing
    // ========================================================================
    const pricingResponse = await fetch(
      `${FIPE_API_BASE}/cars/brands/${brandCode}/models/${modelCode}/years/${yearCode}`
    );

    if (!pricingResponse.ok) {
      console.error(`❌ FIPE pricing request failed: ${pricingResponse.status}`);
      return null;
    }

    const pricing = await pricingResponse.json();
    return pricing;
  } catch (error) {
    console.error('❌ Error searching FIPE:', error);
    return null;
  }
}

// ============================================================================
// MAIN SYNC FUNCTION
// ============================================================================

/**
 * Sync FIPE values for vehicles
 *
 * Process:
 * 1. Fetch vehicles needing sync (ARG or BR, no value or outdated)
 * 2. Get conversion rates from Binance
 * 3. For each vehicle:
 *    a. If ARG: Find Brazil equivalent model
 *    b. Query FIPE for Brazil price (BRL)
 *    c. Convert BRL → USD → ARS
 *    d. Save all values to database
 *
 * Rate Limiting:
 *   - FIPE Free Tier: 1,000 requests/day
 *   - Safe rate: 1 request every 5 seconds = 17,280/day (well under limit)
 *
 * @param supabase Supabase client
 * @param limit Maximum number of vehicles to sync (default 10)
 */
async function syncFipeValues(
  supabase: any,
  limit?: number,
): Promise<SyncResult> {
  const result: SyncResult = {
    total_cars: 0,
    synced: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  // ========================================================================
  // Get conversion rates from Binance (parallel fetch)
  // ========================================================================
  console.log('📊 Fetching conversion rates from Binance...');
  const rates = await getConversionRates();
  console.log(`✅ Rates fetched: 1 BRL = ${rates.brl_to_usd} USD, 1 USD = ${rates.usd_to_ars} ARS`);

  // ========================================================================
  // Get vehicles needing sync
  // ========================================================================
  // Priority:
  //   1. Vehicles with no value_usd (never valued)
  //   2. Vehicles with fipe_last_sync > 30 days (outdated)
  //   3. Both ARG and BR vehicles are included now
  let query = supabase
    .from('cars')
    .select('id, brand_text_backup, model_text_backup, year, value_usd, fipe_last_sync, location_country')
    .in('location_country', ['AR', 'BR']) // Support both Argentina and Brazil
    .or(
      'value_usd.is.null,fipe_last_sync.is.null,fipe_last_sync.lt.' +
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    ) // No value OR no sync OR sync older than 30 days
    .order('created_at', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data: cars, error: fetchError } = await query;

  if (fetchError) {
    result.errors.push(`Failed to fetch cars: ${fetchError.message}`);
    return result;
  }

  result.total_cars = cars?.length || 0;
  console.log(`📋 Found ${result.total_cars} vehicles needing FIPE sync`);

  // ========================================================================
  // Process each vehicle
  // ========================================================================
  for (const car of cars || []) {
    try {
      console.log(`\n🚗 Processing: ${car.brand_text_backup} ${car.model_text_backup} ${car.year} (${car.location_country})`);

      // Step 1: Get Brazil model name (for ARG vehicles, find equivalent)
      let brazilModel = car.model_text_backup;
      if (car.location_country === 'AR') {
        brazilModel = await findBrazilEquivalent(
          supabase,
          car.brand_text_backup,
          car.model_text_backup,
        );
      }

      // Step 2: Search FIPE for Brazil price
      const fipeData = await searchFipeVehicle(
        car.brand_text_backup,
        brazilModel,
        car.year,
      );

      if (!fipeData) {
        console.log(`⏭️  Skipping: No FIPE data found`);
        result.skipped++;
        continue;
      }

      // Step 3: Parse BRL price
      const priceString = fipeData.price || fipeData.precoAtual;
      if (!priceString) {
        console.log(`⏭️  Skipping: No price in FIPE data`);
        result.skipped++;
        continue;
      }

      const brlPrice = parseBRLPrice(priceString);
      console.log(`💰 FIPE price: R$ ${brlPrice.toLocaleString('pt-BR')} BRL`);

      // Step 4: Convert to USD and ARS
      const converted = convertCurrency(brlPrice, rates);
      console.log(`💵 Converted: $${converted.usd.toLocaleString('en-US')} USD`);
      console.log(`💵 Converted: $${converted.ars.toLocaleString('es-AR')} ARS`);

      // Step 5: Update car in database
      const fipeCode = fipeData.codeFipe || fipeData.codigoFipe;
      const oldValue = car.value_usd ?? null;
      const isChanged = oldValue !== null && oldValue !== converted.usd;
      const referenceMonth = fipeData.referenceMonth || fipeData.mesReferencia || null;
      const { error: updateError } = await supabase
        .from('cars')
        .update({
          value_usd: converted.usd,
          value_ars: converted.ars, // Store ARS value too
          value_brl: Math.round(brlPrice), // Store original BRL value
          fipe_code: fipeCode,
          value_usd_source: 'fipe',
          fipe_last_sync: new Date().toISOString(),
          estimated_value_usd: converted.usd, // Keep in sync for auto price update
        })
        .eq('id', car.id);

      if (updateError) {
        result.failed++;
        result.errors.push(
          `Failed to update car ${car.id}: ${updateError.message}`,
        );
        console.error(`❌ Update failed: ${updateError.message}`);
      } else {
        result.synced++;
        console.log(`✅ Synced successfully!`);
        const { error: historyError } = await supabase
          .from('cars_fipe_history')
          .insert({
            car_id: car.id,
            synced_at: new Date().toISOString(),
            value_usd: converted.usd,
            value_brl: Math.round(brlPrice),
            value_ars: converted.ars,
            fipe_code: fipeCode || null,
            reference_month: referenceMonth,
            source: 'fipe',
            is_changed: isChanged,
            previous_value_usd: oldValue,
          });
        if (historyError) {
          console.error(`❌ History insert failed for car ${car.id}: ${historyError.message}`);
        }
      }

      // Step 6: Rate limiting (respect FIPE API limits)
      // Wait 5 seconds between requests (conservative)
      await new Promise((resolve) => setTimeout(resolve, 5000));
    } catch (error: any) {
      result.failed++;
      result.errors.push(`Error processing car ${car.id}: ${error.message}`);
      console.error(`❌ Processing error: ${error.message}`);
    }
  }

  console.log(`\n📊 Sync complete: ${result.synced} synced, ${result.skipped} skipped, ${result.failed} failed`);
  return result;
}

// ============================================================================
// HTTP SERVER
// ============================================================================

Deno.serve(async (req) => {
  // Get CORS headers from shared config
  const corsHeaders = getCorsHeaders(req);

  try {
    // CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Parse request
    const { limit = 10 } = await req.json().catch(() => ({}));

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Sync values
    console.log(`\n🚀 Starting FIPE sync (limit: ${limit})...`);
    const result = await syncFipeValues(supabase, limit);

    return new Response(
      JSON.stringify({
        success: true,
        result,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error: unknown) {
    console.error('💥 Edge function error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
