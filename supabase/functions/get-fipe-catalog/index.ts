// ============================================================================
// EDGE FUNCTION: get-fipe-catalog (Cached FIPE Brands & Models)
// ============================================================================
//
// Purpose:
// Proxy FIPE API with server-side caching to prevent rate limiting on clients.
// Caches brands (24h) and models by brand (6h) in Supabase database.
//
// Endpoints:
// - GET /brands - List all car brands (cached 24h)
// - GET /brands/:code/models - List models for a brand (cached 6h)
//
// Why this exists:
// FIPE API has aggressive rate limiting (429 errors). By proxying through
// this function with caching, we:
// 1. Reduce direct API calls to FIPE
// 2. Provide faster responses (cached data)
// 3. Prevent client IP from being rate limited
//
// Auth: No authentication required (anon key works)
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { getCorsHeaders } from '../_shared/cors.ts';

// ============================================================================
// CONFIGURATION
// ============================================================================

const FIPE_API_BASE = 'https://parallelum.com.br/fipe/api/v2';

// Cache TTL in seconds
const BRANDS_CACHE_TTL = 24 * 60 * 60; // 24 hours
const MODELS_CACHE_TTL = 6 * 60 * 60;  // 6 hours

// Retry configuration for rate limiting
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

// ============================================================================
// TYPES
// ============================================================================

interface FipeBrand {
  code: string;
  name: string;
}

interface FipeModel {
  code: string;
  name: string;
}

interface CacheEntry {
  id: string;
  cache_key: string;
  data: any;
  expires_at: string;
  created_at: string;
}

// ============================================================================
// CACHE FUNCTIONS
// ============================================================================

/**
 * Get cached data from Supabase
 */
async function getCached(supabase: any, cacheKey: string): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('fipe_cache')
      .select('data, expires_at')
      .eq('cache_key', cacheKey)
      .single();

    if (error || !data) {
      return null;
    }

    // Check if cache is expired
    const expiresAt = new Date(data.expires_at);
    if (expiresAt < new Date()) {
      console.log(`[Cache] Expired: ${cacheKey}`);
      return null;
    }

    console.log(`[Cache] Hit: ${cacheKey}`);
    return data.data;
  } catch (error) {
    console.error('[Cache] Error reading:', error);
    return null;
  }
}

/**
 * Set cached data in Supabase
 */
async function setCache(
  supabase: any,
  cacheKey: string,
  data: any,
  ttlSeconds: number
): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

    await supabase
      .from('fipe_cache')
      .upsert({
        cache_key: cacheKey,
        data,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'cache_key',
      });

    console.log(`[Cache] Set: ${cacheKey} (TTL: ${ttlSeconds}s)`);
  } catch (error) {
    console.error('[Cache] Error writing:', error);
  }
}

// ============================================================================
// FIPE API FUNCTIONS WITH RETRY
// ============================================================================

/**
 * Delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch with retry for rate limiting
 */
async function fetchWithRetry(url: string): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url);

      // If rate limited, wait and retry
      if (response.status === 429) {
        const retryDelay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
        console.warn(`[FIPE] Rate limited (429), retrying in ${retryDelay}ms...`);
        await delay(retryDelay);
        continue;
      }

      return response;
    } catch (error) {
      lastError = error as Error;
      console.error(`[FIPE] Fetch error (attempt ${attempt + 1}):`, error);
      await delay(INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt));
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

/**
 * Get all brands from FIPE API (with caching)
 */
async function getBrands(supabase: any): Promise<FipeBrand[]> {
  const cacheKey = 'fipe:brands';

  // Try cache first
  const cached = await getCached(supabase, cacheKey);
  if (cached) {
    return cached;
  }

  // Fetch from FIPE API
  console.log('[FIPE] Fetching brands...');
  const response = await fetchWithRetry(`${FIPE_API_BASE}/cars/brands`);

  if (!response.ok) {
    throw new Error(`FIPE API error: ${response.status}`);
  }

  const brands: FipeBrand[] = await response.json();
  console.log(`[FIPE] Got ${brands.length} brands`);

  // Cache the result
  await setCache(supabase, cacheKey, brands, BRANDS_CACHE_TTL);

  return brands;
}

/**
 * Get models for a brand from FIPE API (with caching)
 */
async function getModels(supabase: any, brandCode: string): Promise<FipeModel[]> {
  const cacheKey = `fipe:models:${brandCode}`;

  // Try cache first
  const cached = await getCached(supabase, cacheKey);
  if (cached) {
    return cached;
  }

  // Fetch from FIPE API
  console.log(`[FIPE] Fetching models for brand ${brandCode}...`);
  const response = await fetchWithRetry(
    `${FIPE_API_BASE}/cars/brands/${brandCode}/models`
  );

  if (!response.ok) {
    throw new Error(`FIPE API error: ${response.status}`);
  }

  const models: FipeModel[] = await response.json();
  console.log(`[FIPE] Got ${models.length} models for brand ${brandCode}`);

  // Cache the result
  await setCache(supabase, cacheKey, models, MODELS_CACHE_TTL);

  return models;
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

    // Parse URL
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);

    // Remove function name from path if present
    // URL might be /get-fipe-catalog/brands or just /brands
    const funcIndex = pathParts.indexOf('get-fipe-catalog');
    const relevantParts = funcIndex >= 0
      ? pathParts.slice(funcIndex + 1)
      : pathParts;

    // Also support query params for simpler calls
    const brandCode = url.searchParams.get('brandCode');
    const action = url.searchParams.get('action') || (relevantParts[0] || 'brands');

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Route: GET /brands or ?action=brands
    if (action === 'brands' && !brandCode) {
      const brands = await getBrands(supabase);
      return new Response(
        JSON.stringify({
          success: true,
          data: brands,
          count: brands.length,
          cached: true,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Route: GET /brands/:code/models or ?action=models&brandCode=XXX
    if ((action === 'models' && brandCode) ||
        (relevantParts[0] === 'brands' && relevantParts[2] === 'models')) {
      const code = brandCode || relevantParts[1];

      if (!code) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Brand code is required',
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const models = await getModels(supabase, code);
      return new Response(
        JSON.stringify({
          success: true,
          data: models,
          count: models.length,
          brandCode: code,
          cached: true,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Unknown route
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Unknown endpoint. Use ?action=brands or ?action=models&brandCode=XXX',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: unknown) {
    const errorMessage = 'Internal server error';
    console.error('[get-fipe-catalog] Error:', error);

    // Check if it's a rate limiting error
    const isRateLimited = errorMessage.includes('429') || errorMessage.includes('rate');

    return new Response(
      JSON.stringify({
        success: false,
        error: isRateLimited
          ? 'FIPE API temporalmente no disponible. Intente nuevamente en unos minutos.'
          : errorMessage,
        retryAfter: isRateLimited ? 60 : undefined,
      }),
      {
        status: isRateLimited ? 503 : 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          ...(isRateLimited ? { 'Retry-After': '60' } : {}),
        },
      }
    );
  }
});
