// ============================================================================
// ESTIMATE PRICING SECURE - Supabase Edge Function
// Server-side pricing calculation with HMAC signature for integrity
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { getCorsHeaders } from '../_shared/cors.ts';

// ============================================================================
// TYPES
// ============================================================================

interface PricingRequest {
  brand: string;
  model: string;
  year: number;
  category_id?: string;
  mileage?: number;
  fuel_type?: string;
}

interface PricingResponse {
  estimated_value_usd: number;
  suggested_daily_rate: number;
  suggested_weekly_rate: number;
  suggested_monthly_rate: number;
  confidence: 'high' | 'medium' | 'low';
  pricing_factors: {
    base_rate_pct: number;
    depreciation_factor: number;
    category_multiplier: number;
    demand_factor: number;
  };
  valid_until: string;
  signature: string;
}

// ============================================================================
// PRICING CONSTANTS
// ============================================================================

const BASE_DAILY_RATE_PCT = 0.003; // 0.3% of vehicle value per day
const WEEKLY_DISCOUNT = 0.85; // 15% off for weekly
const MONTHLY_DISCOUNT = 0.70; // 30% off for monthly

const CATEGORY_MULTIPLIERS: Record<string, number> = {
  'economico': 0.9,
  'compacto': 1.0,
  'sedan': 1.1,
  'suv': 1.25,
  'pickup': 1.3,
  'premium': 1.5,
  'lujo': 2.0,
};

const DEPRECIATION_BY_AGE: Record<number, number> = {
  0: 1.0,   // New
  1: 0.90,  // 1 year
  2: 0.82,
  3: 0.75,
  4: 0.68,
  5: 0.62,
  6: 0.56,
  7: 0.51,
  8: 0.46,
  9: 0.42,
  10: 0.38,
};

// ============================================================================
// HELPERS
// ============================================================================

async function generateSignature(data: object, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(JSON.stringify(data))
  );

  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function getDepreciationFactor(year: number): number {
  const currentYear = new Date().getFullYear();
  const age = Math.max(0, currentYear - year);

  if (age >= 10) return DEPRECIATION_BY_AGE[10];
  return DEPRECIATION_BY_AGE[age] ?? 0.38;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const body: PricingRequest = await req.json();
    const { brand, model, year, category_id, mileage } = body;

    if (!brand || !model || !year) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: brand, model, year' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try to get FIPE value first
    let estimatedValue = 0;
    let confidence: 'high' | 'medium' | 'low' = 'low';

    const { data: fipeData } = await supabase
      .from('fipe_prices')
      .select('price_brl, updated_at')
      .ilike('brand', `%${brand}%`)
      .ilike('model', `%${model}%`)
      .eq('year', year)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (fipeData?.price_brl) {
      // Convert BRL to USD (approximate rate)
      const { data: rateData } = await supabase
        .from('exchange_rates')
        .select('rate')
        .eq('from_currency', 'BRL')
        .eq('to_currency', 'USD')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      const exchangeRate = rateData?.rate ?? 0.20; // Default fallback
      estimatedValue = Math.round(fipeData.price_brl * exchangeRate);
      confidence = 'high';
    } else {
      // Fallback: estimate based on category
      const categoryEstimates: Record<string, number> = {
        'economico': 8000,
        'compacto': 12000,
        'sedan': 18000,
        'suv': 25000,
        'pickup': 30000,
        'premium': 45000,
        'lujo': 80000,
      };

      estimatedValue = categoryEstimates[category_id ?? 'compacto'] ?? 15000;
      confidence = 'low';
    }

    // Apply depreciation
    const depreciationFactor = getDepreciationFactor(year);
    estimatedValue = Math.round(estimatedValue * depreciationFactor);

    // Apply mileage penalty if provided (5% per 50k km over 100k)
    if (mileage && mileage > 100000) {
      const excessKm = mileage - 100000;
      const mileagePenalty = Math.min(0.30, (excessKm / 50000) * 0.05);
      estimatedValue = Math.round(estimatedValue * (1 - mileagePenalty));
    }

    // Calculate pricing
    const categoryMultiplier = CATEGORY_MULTIPLIERS[category_id ?? 'compacto'] ?? 1.0;
    const demandFactor = 1.0; // Could be dynamic based on season/location

    const baseDailyRate = estimatedValue * BASE_DAILY_RATE_PCT;
    const suggestedDailyRate = Math.round(baseDailyRate * categoryMultiplier * demandFactor);
    const suggestedWeeklyRate = Math.round(suggestedDailyRate * 7 * WEEKLY_DISCOUNT);
    const suggestedMonthlyRate = Math.round(suggestedDailyRate * 30 * MONTHLY_DISCOUNT);

    // Minimum rates
    const minDailyRate = 15;
    const finalDailyRate = Math.max(minDailyRate, suggestedDailyRate);

    // Generate signature for integrity
    const validUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h
    const signatureData = {
      estimated_value_usd: estimatedValue,
      suggested_daily_rate: finalDailyRate,
      valid_until: validUntil,
      user_id: user.id,
    };

    const secret = Deno.env.get('PRICING_SIGNATURE_SECRET') ?? 'default-secret-change-me';
    const signature = await generateSignature(signatureData, secret);

    const response: PricingResponse = {
      estimated_value_usd: estimatedValue,
      suggested_daily_rate: finalDailyRate,
      suggested_weekly_rate: Math.max(minDailyRate * 6, suggestedWeeklyRate),
      suggested_monthly_rate: Math.max(minDailyRate * 20, suggestedMonthlyRate),
      confidence,
      pricing_factors: {
        base_rate_pct: BASE_DAILY_RATE_PCT,
        depreciation_factor: depreciationFactor,
        category_multiplier: categoryMultiplier,
        demand_factor: demandFactor,
      },
      valid_until: validUntil,
      signature,
    };

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'private, max-age=3600', // 1h cache
        }
      }
    );

  } catch (error) {
    console.error('Pricing error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
