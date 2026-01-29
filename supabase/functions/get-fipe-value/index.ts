// ============================================================================
// EDGE FUNCTION: get-fipe-value (Realtime Single Vehicle Lookup)
// ============================================================================
//
// Purpose:
// Get real-time vehicle valuation from FIPE API for a single vehicle and
// convert to multiple currencies using Binance API.
//
// Flow:
// 1. Receive vehicle data (brand, model, year, country)
// 2. For ARG vehicles: Find Brazil model equivalent
// 3. Query FIPE API for Brazil price (in BRL)
// 4. Convert BRL → USD using Binance API (BRLBUSD pair)
// 5. Convert USD → ARS using Binance API (USDTARS pair)
// 6. Return all 3 values immediately
//
// APIs Used:
// - FIPE Online: https://parallelum.com.br/fipe/api/v2
// - Binance: https://api.binance.com/api/v3/ticker/price
//
// Auth: No authentication required (free APIs)
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { getCorsHeaders } from '../_shared/cors.ts';

// ============================================================================
// CONFIGURATION
// ============================================================================

// Free API from Parallelum (no token required, 500 req/day)
const FIPE_API_BASE = 'https://parallelum.com.br/fipe/api/v2';

// Binance API endpoints (no auth required for public price data)
const BINANCE_API_BASE = 'https://api.binance.com/api/v3';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface FipeVehicleResponse {
  brand?: string;
  model?: string;
  modelYear?: number;
  fuel?: string;
  fuelAcronym?: string;
  codeFipe?: string;
  price?: string; // "R$ 125.000,00"
  referenceMonth?: string;
}

interface BinancePrice {
  symbol: string;
  price: string; // "0.20000000"
}

interface ConversionRates {
  brl_to_usd: number;
  usd_to_ars: number;
  timestamp: Date;
}

interface FipeValueResult {
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
  errorCode?: string; // Added: Machine-readable error code
  suggestions?: string[]; // Added: Actionable suggestions
  availableOptions?: {
    brands?: string[];
    models?: string[];
    years?: number[];
  };
}

interface VehicleParams {
  brand: string;
  model: string;
  year: number;
  country?: string;
}

// ============================================================================
// CURRENCY CONVERSION FUNCTIONS
// ============================================================================

/**
 * Fetch BRL → USD conversion rate from Binance
 */
async function getBRLtoUSDRate(): Promise<number> {
  try {
    // Use USDTBRL (USDT in BRL) because BRLBUSD is deprecated
    // Price format: "5.40" (1 USDT = 5.40 BRL)
    const response = await fetch(`${BINANCE_API_BASE}/ticker/price?symbol=USDTBRL`);

    if (!response.ok) {
      console.error(`❌ Binance USDT/BRL request failed: ${response.status}`);
      return 0.18; // Fallback rate (approx 1/5.5)
    }

    const data: BinancePrice = await response.json();
    const usdtBrlPrice = parseFloat(data.price);

    // Invert to get BRL -> USD rate (1 BRL = 1/5.40 USD)
    const rate = 1 / usdtBrlPrice;

    console.log(`✅ Binance USDT/BRL price: ${usdtBrlPrice} -> Rate: ${rate}`);
    return rate;
  } catch (error) {
    console.error('❌ Error fetching Binance USDT/BRL rate:', error);
    return 0.18; // Fallback
  }
}

/**
 * Fetch USD → ARS conversion rate from Binance
 */
async function getUSDtoARSRate(): Promise<number> {
  try {
    const response = await fetch(`${BINANCE_API_BASE}/ticker/price?symbol=USDTARS`);

    if (!response.ok) {
      console.error(`❌ Binance USD/ARS request failed: ${response.status}`);
      return 1000; // Fallback rate
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
 * Fetch all conversion rates from Binance in parallel
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
 * Example: "R$ 125.000,00" → 125000.00
 */
function parseBRLPrice(priceStr: string): number {
  const cleaned = priceStr.replace(/R\$\s*/g, '').trim();
  const withoutThousands = cleaned.replace(/\./g, '');
  const normalized = withoutThousands.replace(/,/g, '.');
  return parseFloat(normalized);
}

/**
 * Convert BRL amount to USD and ARS
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
 * Returns vehicle data or throws with specific error information
 */
async function searchFipeVehicle(
  brand: string,
  model: string,
  year: number,
): Promise<{
  data?: FipeVehicleResponse;
  error?: {
    code: string;
    message: string;
    suggestions: string[];
    availableOptions?: any;
  };
}> {
  try {
    // Step 1: Find brand code
    const brandsResponse = await fetch(`${FIPE_API_BASE}/cars/brands`);

    if (!brandsResponse.ok) {
      console.error(`❌ FIPE brands request failed: ${brandsResponse.status}`);
      return {
        error: {
          code: 'FIPE_API_ERROR',
          message: 'Error al conectar con la base de datos FIPE. Intentá nuevamente en unos momentos.',
          suggestions: ['Verifica tu conexión a internet', 'Reintenta en unos minutos']
        }
      };
    }

    const brands = await brandsResponse.json();
    const matchedBrand = brands.find(
      (b: any) => (b.name || '').toLowerCase().includes(brand.toLowerCase()),
    );

    if (!matchedBrand) {
      console.log(`❌ Brand not found in FIPE: ${brand}`);
      // Get top 10 brands as suggestions
      const topBrands = brands.slice(0, 10).map((b: any) => b.name);
      return {
        error: {
          code: 'BRAND_NOT_FOUND',
          message: `La marca "${brand}" no está disponible en nuestro sistema de valoración.`,
          suggestions: [
            'Verifica que el nombre de la marca esté correcto',
            'Prueba con el nombre completo (ej: "Volkswagen" en vez de "VW")',
            'Selecciona una marca de la lista de autocompletado'
          ],
          availableOptions: { brands: topBrands }
        }
      };
    }

    const brandCode = matchedBrand.code;
    console.log(`✅ Found brand: ${matchedBrand.name} (code: ${brandCode})`);

    // Step 2: Find model code
    const modelsResponse = await fetch(
      `${FIPE_API_BASE}/cars/brands/${brandCode}/models`
    );

    if (!modelsResponse.ok) {
      console.error(`❌ FIPE models request failed: ${modelsResponse.status}`);
      return {
        error: {
          code: 'FIPE_API_ERROR',
          message: `Error al buscar modelos de ${brand}. Intentá nuevamente.`,
          suggestions: ['Verifica tu conexión', 'Reintenta en unos momentos']
        }
      };
    }

    const modelsData = await modelsResponse.json();
    const modelsList = Array.isArray(modelsData) ? modelsData : [];
    const matchedModel = modelsList.find(
      (m: any) => (m.name || '').toLowerCase().includes(model.toLowerCase()),
    );

    if (!matchedModel) {
      console.log(`❌ Model not found in FIPE: ${model} for brand ${brand}`);
      // Get first 15 models as suggestions
      const topModels = modelsList.slice(0, 15).map((m: any) => m.name);
      return {
        error: {
          code: 'MODEL_NOT_FOUND',
          message: `El modelo "${model}" no está disponible para ${brand} en nuestro sistema.`,
          suggestions: [
            'Verifica que el nombre del modelo esté correcto',
            'Intenta con el nombre completo (ej: "Gol 1.6" en vez de "Gol")',
            'Busca el modelo en el autocompletado para ver opciones disponibles',
            `Modelos disponibles para ${brand}: ${topModels.slice(0, 5).join(', ')}${topModels.length > 5 ? '...' : ''}`
          ],
          availableOptions: { models: topModels }
        }
      };
    }

    const modelCode = matchedModel.code;
    console.log(`✅ Found model: ${matchedModel.name} (code: ${modelCode})`);

    // Step 3: Find year code
    const yearsResponse = await fetch(
      `${FIPE_API_BASE}/cars/brands/${brandCode}/models/${modelCode}/years`
    );

    if (!yearsResponse.ok) {
      console.error(`❌ FIPE years request failed: ${yearsResponse.status}`);
      return {
        error: {
          code: 'FIPE_API_ERROR',
          message: `Error al buscar años disponibles para ${brand} ${model}. Intentá nuevamente.`,
          suggestions: ['Verifica tu conexión', 'Reintenta en unos momentos']
        }
      };
    }

    const years = await yearsResponse.json();
    const matchedYear = years.find(
      (y: any) => {
        const yearName = y.name || '';
        return yearName.includes(year.toString());
      }
    );

    if (!matchedYear) {
      console.log(`❌ Year not found in FIPE: ${year}`);
      // Extract year numbers from FIPE years
      const availableYears = years
        .map((y: any) => {
          const match = (y.name || '').match(/\d{4}/);
          return match ? parseInt(match[0]) : null;
        })
        .filter((y: number | null) => y !== null)
        .sort((a: number, b: number) => b - a);

      return {
        error: {
          code: 'YEAR_NOT_FOUND',
          message: `El año ${year} no está disponible para ${brand} ${model}.`,
          suggestions: [
            'Verifica que el año sea correcto',
            `Este modelo está disponible para los años: ${availableYears.slice(0, 10).join(', ')}${availableYears.length > 10 ? '...' : ''}`,
            'Selecciona un año de la lista anterior',
            'Si el modelo es muy nuevo o muy antiguo, puede no estar disponible aún'
          ],
          availableOptions: { years: availableYears }
        }
      };
    }

    const yearCode = matchedYear.code;
    console.log(`✅ Found year: ${matchedYear.name} (code: ${yearCode})`);

    // Step 4: Get vehicle pricing
    const pricingResponse = await fetch(
      `${FIPE_API_BASE}/cars/brands/${brandCode}/models/${modelCode}/years/${yearCode}`
    );

    if (!pricingResponse.ok) {
      console.error(`❌ FIPE pricing request failed: ${pricingResponse.status}`);
      return {
        error: {
          code: 'FIPE_API_ERROR',
          message: `Error al obtener el precio de ${brand} ${model} ${year}. Intentá nuevamente.`,
          suggestions: ['Verifica tu conexión', 'Reintenta en unos momentos']
        }
      };
    }

    const pricing = await pricingResponse.json();

    // Check if pricing data is valid
    if (!pricing || !pricing.price) {
      return {
        error: {
          code: 'NO_PRICE_DATA',
          message: `No hay información de precio disponible para ${brand} ${model} ${year} en FIPE.`,
          suggestions: [
            'Este vehículo existe en FIPE pero no tiene precio registrado',
            'Intenta con otro año del mismo modelo',
            'Contacta a soporte si necesitas publicar este vehículo específicamente'
          ]
        }
      };
    }

    return { data: pricing };
  } catch (error) {
    console.error('❌ Error searching FIPE:', error);
    return {
      error: {
        code: 'UNEXPECTED_ERROR',
        message: `Error inesperado al buscar en FIPE: ${(error as Error).message}`,
        suggestions: [
          'Verifica tu conexión a internet',
          'Reintenta en unos momentos',
          'Si el problema persiste, contacta a soporte'
        ]
      }
    };
  }
}

// ============================================================================
// MAIN LOOKUP FUNCTION
// ============================================================================

/**
 * Get FIPE value for a single vehicle in realtime
 */
async function getFipeValueRealtime(
  supabase: any,
  params: VehicleParams,
): Promise<FipeValueResult> {
  console.log(`\n🚗 Getting FIPE value for: ${params.brand} ${params.model} ${params.year}`);

  try {
    // Get conversion rates from Binance (parallel fetch)
    console.log('📊 Fetching conversion rates from Binance...');
    const rates = await getConversionRates();
    console.log(`✅ Rates: 1 BRL = ${rates.brl_to_usd} USD, 1 USD = ${rates.usd_to_ars} ARS`);

    // For ARG vehicles, find Brazil equivalent
    let brazilModel = params.model;
    if (params.country === 'AR') {
      brazilModel = await findBrazilEquivalent(
        supabase,
        params.brand,
        params.model,
      );
    }

    // Search FIPE for Brazil price
    const fipeResult = await searchFipeVehicle(
      params.brand,
      brazilModel,
      params.year,
    );

    // Handle FIPE search errors
    if (fipeResult.error) {
      return {
        success: false,
        error: fipeResult.error.message,
        errorCode: fipeResult.error.code,
        suggestions: fipeResult.error.suggestions,
        availableOptions: fipeResult.error.availableOptions,
      };
    }

    // Validate FIPE data
    if (!fipeResult.data) {
      return {
        success: false,
        error: 'No se encontró el vehículo en FIPE.',
        errorCode: 'NO_DATA',
        suggestions: [
          'Verifica que marca, modelo y año sean correctos',
          'Intenta con otra combinación',
          'Contacta a soporte si el problema persiste'
        ],
      };
    }

    // Parse BRL price
    const priceString = fipeResult.data.price;
    if (!priceString) {
      return {
        success: false,
        error: 'FIPE no devolvió precio para este vehículo.',
        errorCode: 'NO_PRICE',
        suggestions: [
          'Este vehículo existe en FIPE pero sin precio',
          'Intenta con otro año del mismo modelo'
        ],
      };
    }

    const brlPrice = parseBRLPrice(priceString);
    console.log(`💰 FIPE price: R$ ${brlPrice.toLocaleString('pt-BR')} BRL`);

    // Convert to USD and ARS
    const converted = convertCurrency(brlPrice, rates);
    console.log(`💵 Converted: $${converted.usd.toLocaleString('en-US')} USD`);
    console.log(`💵 Converted: $${converted.ars.toLocaleString('es-AR')} ARS`);

    return {
      success: true,
      data: {
        value_brl: Math.round(brlPrice),
        value_usd: converted.usd,
        value_ars: converted.ars,
        fipe_code: fipeResult.data.codeFipe || '',
        source: 'fipe',
        confidence: 'high',
        reference_month: fipeResult.data.referenceMonth || '',
        brand_found: fipeResult.data.brand || params.brand,
        model_found: fipeResult.data.model || brazilModel,
      },
    };
  } catch (error: any) {
    console.error('❌ Error in getFipeValueRealtime:', error);
    return {
      success: false,
      error: `Error consultando FIPE: ${error.message}`,
      errorCode: 'UNEXPECTED_ERROR',
      suggestions: [
        'Verifica tu conexión a internet',
        'Reintenta en unos momentos',
        'Si el problema persiste, contacta a soporte'
      ],
    };
  }
}

// ============================================================================
// HTTP SERVER
// ============================================================================

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  try {
    // CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Parse request
    const body = await req.json().catch(() => ({}));
    const { brand, model, year, country = 'BR' } = body as VehicleParams;

    // Validate input
    if (!brand || !model || !year) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Parámetros requeridos: brand, model, year',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Create Supabase client (for model equivalence lookup)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get FIPE value
    console.log(`\n🚀 Starting FIPE lookup for ${brand} ${model} ${year}...`);
    const result = await getFipeValueRealtime(supabase, { brand, model, year, country });

    return new Response(
      JSON.stringify({
        ...result,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200, // Always 200 - use success field to indicate errors
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
    console.error('💥 Edge function error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
