// ============================================================================
// EDGE FUNCTION: sync-fipe-values
// Purpose: Sync vehicle valuations from FIPE Online API
// API: https://fipe.online/docs/api/fipe
// Auth: JWT token via X-Subscription-Token header
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const FIPE_API_BASE = 'https://fipe.parallelum.com.br/api/v2';
const FIPE_TOKEN = Deno.env.get('FIPE_API_TOKEN') || '';

interface FipeVehicleResponse {
  marca: string;
  modelo: string;
  anoModelo: number;
  combustivel: string;
  codigoFipe: string;
  precoAtual: string; // "R$ 125.000,00"
  mesReferencia: string;
  historicoPrecos?: Array<{
    mesReferencia: string;
    preco: string;
  }>;
}

interface SyncResult {
  total_cars: number;
  synced: number;
  skipped: number;
  failed: number;
  errors: string[];
}

/**
 * Parse Brazilian Real price string to USD number
 * Example: "R$ 125.000,00" → 125000 (BRL) → ~25000 (USD at 5.0 rate)
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
 * Convert BRL to USD using latest exchange rate from database
 */
async function convertBRLtoUSD(
  brlAmount: number,
  supabase: any,
): Promise<number> {
  const { data: rate } = await supabase
    .from('exchange_rates')
    .select('platform_rate')
    .eq('from_currency', 'BRL')
    .eq('to_currency', 'USD')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const exchangeRate = rate?.platform_rate || 0.20; // Fallback: 5 BRL = 1 USD
  return Math.round(brlAmount * exchangeRate);
}

/**
 * Search FIPE API for vehicle valuation
 */
async function searchFipeVehicle(
  brand: string,
  model: string,
  year: number,
): Promise<FipeVehicleResponse | null> {
  try {
    // Step 1: Search for brand
    const brandsResponse = await fetch(`${FIPE_API_BASE}/cars/brands`, {
      headers: {
        'X-Subscription-Token': FIPE_TOKEN,
      },
    });

    if (!brandsResponse.ok) {
      console.error('FIPE brands request failed:', brandsResponse.status);
      return null;
    }

    const brands = await brandsResponse.json();
    const matchedBrand = brands.find(
      (b: any) => b.nome.toLowerCase().includes(brand.toLowerCase()),
    );

    if (!matchedBrand) {
      console.log(`Brand not found in FIPE: ${brand}`);
      return null;
    }

    // Step 2: Search for model
    const modelsResponse = await fetch(
      `${FIPE_API_BASE}/cars/brands/${matchedBrand.codigo}/models`,
      {
        headers: {
          'X-Subscription-Token': FIPE_TOKEN,
        },
      },
    );

    if (!modelsResponse.ok) {
      console.error('FIPE models request failed:', modelsResponse.status);
      return null;
    }

    const modelsData = await modelsResponse.json();
    const matchedModel = modelsData.modelos?.find(
      (m: any) => m.nome.toLowerCase().includes(model.toLowerCase()),
    );

    if (!matchedModel) {
      console.log(`Model not found in FIPE: ${model} for brand ${brand}`);
      return null;
    }

    // Step 3: Get years available
    const yearsResponse = await fetch(
      `${FIPE_API_BASE}/cars/brands/${matchedBrand.codigo}/models/${matchedModel.codigo}/years`,
      {
        headers: {
          'X-Subscription-Token': FIPE_TOKEN,
        },
      },
    );

    if (!yearsResponse.ok) {
      console.error('FIPE years request failed:', yearsResponse.status);
      return null;
    }

    const years = await yearsResponse.json();
    const matchedYear = years.find(
      (y: any) =>
        y.nome.includes(year.toString()) || y.codigo.includes(year.toString()),
    );

    if (!matchedYear) {
      console.log(`Year not found in FIPE: ${year}`);
      return null;
    }

    // Step 4: Get vehicle pricing
    const pricingResponse = await fetch(
      `${FIPE_API_BASE}/cars/brands/${matchedBrand.codigo}/models/${matchedModel.codigo}/years/${matchedYear.codigo}`,
      {
        headers: {
          'X-Subscription-Token': FIPE_TOKEN,
        },
      },
    );

    if (!pricingResponse.ok) {
      console.error('FIPE pricing request failed:', pricingResponse.status);
      return null;
    }

    const pricing = await pricingResponse.json();
    return pricing;
  } catch (error) {
    console.error('Error searching FIPE:', error);
    return null;
  }
}

/**
 * Sync FIPE values for all Brazilian vehicles
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

  // Get cars that need FIPE sync
  // Priority: Brazilian vehicles without value_usd or outdated fipe_last_sync
  let query = supabase
    .from('cars')
    .select('id, brand_text_backup, model_text_backup, year, value_usd, fipe_last_sync')
    .eq('location_country', 'BR') // Brazilian vehicles
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

  for (const car of cars || []) {
    try {
      // Search FIPE
      const fipeData = await searchFipeVehicle(
        car.brand_text_backup,
        car.model_text_backup,
        car.year,
      );

      if (!fipeData) {
        result.skipped++;
        continue;
      }

      // Parse price
      const brlPrice = parseBRLPrice(fipeData.precoAtual);
      const usdPrice = await convertBRLtoUSD(brlPrice, supabase);

      // Update car
      const { error: updateError } = await supabase
        .from('cars')
        .update({
          value_usd: usdPrice,
          fipe_code: fipeData.codigoFipe,
          value_usd_source: 'fipe',
          fipe_last_sync: new Date().toISOString(),
          estimated_value_usd: null, // Clear estimate since we have real data
        })
        .eq('id', car.id);

      if (updateError) {
        result.failed++;
        result.errors.push(
          `Failed to update car ${car.id}: ${updateError.message}`,
        );
      } else {
        result.synced++;
        console.log(
          `✓ Synced ${car.brand_text_backup} ${car.model_text_backup} ${car.year}: $${usdPrice} USD (R$ ${brlPrice} BRL)`,
        );
      }

      // Respect rate limits (1000/day free tier = ~1 per 86 seconds)
      // Being conservative: 1 request every 5 seconds = 17,280 per day (way under limit)
      await new Promise((resolve) => setTimeout(resolve, 5000));
    } catch (error: any) {
      result.failed++;
      result.errors.push(`Error processing car ${car.id}: ${error.message}`);
    }
  }

  return result;
}

serve(async (req) => {
  try {
    // CORS headers
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      });
    }

    // Check API token
    if (!FIPE_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'FIPE_API_TOKEN not configured' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    // Parse request
    const { limit = 10 } = await req.json().catch(() => ({}));

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Sync values
    console.log(`Starting FIPE sync (limit: ${limit})...`);
    const result = await syncFipeValues(supabase, limit);

    return new Response(
      JSON.stringify({
        success: true,
        result,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (error: any) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
});
