/**
 * Unified Credit Verification Edge Function
 *
 * Automatically routes to the appropriate credit bureau based on country:
 * - Argentina (AR): Nosis/Veraz
 * - Brazil (BR): Serasa Experian
 * - Ecuador (EC): Placeholder (Datacrédito coming soon)
 * - Chile (CL): Placeholder (DICOM coming soon)
 * - Colombia (CO): Placeholder (Datacrédito coming soon)
 *
 * This function provides a unified interface for credit verification
 * across all LATAM countries supported by AutoRenta.
 *
 * Endpoints:
 * POST /credit-verify
 *   Body: { country, document_type, document_number, user_id }
 */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';
import { getCorsHeaders } from '../_shared/cors.ts';

// =============================================================================
// TYPES
// =============================================================================

type SupportedCountry = 'AR' | 'BR' | 'EC' | 'CL' | 'CO';

interface CreditVerifyRequest {
  country: SupportedCountry;
  document_type: string; // DNI, CPF, CEDULA, RUT, etc.
  document_number: string;
  user_id: string;
}

interface CreditVerifyResponse {
  success: boolean;
  cached?: boolean;
  credit_score: number | null;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  status?: string; // BCRA status (AR) or CPF status (BR)
  has_issues: boolean;
  total_debt?: number | null;
  expires_at?: string | null;
  provider?: string;
  country: string;
  error?: string;
  message?: string;
}

// =============================================================================
// ENVIRONMENT
// =============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Country-specific endpoints (internal Edge Functions)
const EDGE_FUNCTION_BASE = Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.functions.supabase.co') || '';

// =============================================================================
// MAIN HANDLER
// =============================================================================

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only POST allowed
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Parse request
    const payload: CreditVerifyRequest = await req.json();
    const { country, document_type, document_number, user_id } = payload;

    // Validate required fields
    if (!country || !document_type || !document_number || !user_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: country, document_type, document_number, user_id'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate country
    const validCountries: SupportedCountry[] = ['AR', 'BR', 'EC', 'CL', 'CO'];
    if (!validCountries.includes(country as SupportedCountry)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Pais no soportado: ${country}. Soportados: ${validCountries.join(', ')}`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[credit-verify] Processing ${country} ${document_type} for user ${user_id}`);

    // Route to country-specific handler
    let response: CreditVerifyResponse;

    switch (country) {
      case 'AR':
        response = await verifyArgentina(document_type, document_number, user_id, req);
        break;

      case 'BR':
        response = await verifyBrazil(document_number, user_id, req);
        break;

      case 'EC':
      case 'CL':
      case 'CO':
        // These countries are not yet fully implemented
        response = await verifyPlaceholder(country, document_number, user_id);
        break;

      default:
        response = {
          success: false,
          credit_score: null,
          risk_level: 'high',
          has_issues: false,
          country,
          error: 'Pais no soportado',
        };
    }

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[credit-verify] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        credit_score: null,
        risk_level: 'high',
        has_issues: false,
        country: 'unknown',
        error: 'Error interno del servidor',
        message: 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// =============================================================================
// COUNTRY-SPECIFIC HANDLERS
// =============================================================================

/**
 * Argentina: Call Nosis verification
 */
async function verifyArgentina(
  documentType: string,
  documentNumber: string,
  userId: string,
  originalReq: Request
): Promise<CreditVerifyResponse> {
  try {
    // Get auth header from original request
    const authHeader = originalReq.headers.get('Authorization') || '';

    // Call nosis-verify Edge Function
    const response = await fetch(`${EDGE_FUNCTION_BASE}/nosis-verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        document_type: documentType.toUpperCase(),
        document_number: documentNumber,
        user_id: userId,
      }),
    });

    const result = await response.json();

    return {
      success: result.success || false,
      cached: result.cached,
      credit_score: result.credit_score ?? null,
      risk_level: result.risk_level || 'high',
      status: result.bcra_status,
      has_issues: result.has_issues || false,
      expires_at: result.expires_at,
      provider: 'nosis',
      country: 'AR',
      error: result.error,
      message: result.message,
    };
  } catch (error) {
    console.error('[credit-verify] Argentina verification error:', error);
    return {
      success: false,
      credit_score: null,
      risk_level: 'high',
      has_issues: false,
      country: 'AR',
      error: 'Error al verificar con Nosis/Veraz',
    };
  }
}

/**
 * Brazil: Call Serasa verification
 */
async function verifyBrazil(
  cpf: string,
  userId: string,
  originalReq: Request
): Promise<CreditVerifyResponse> {
  try {
    // Get auth header from original request
    const authHeader = originalReq.headers.get('Authorization') || '';

    // Call serasa-verify Edge Function
    const response = await fetch(`${EDGE_FUNCTION_BASE}/serasa-verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        cpf: cpf,
        user_id: userId,
      }),
    });

    const result = await response.json();

    return {
      success: result.success || false,
      cached: result.cached,
      credit_score: result.credit_score ?? null,
      risk_level: result.risk_level || 'high',
      status: result.cpf_status,
      has_issues: result.has_issues || false,
      total_debt: result.total_debt,
      expires_at: result.expires_at,
      provider: result.provider || 'serasa',
      country: 'BR',
      error: result.error,
      message: result.message,
    };
  } catch (error) {
    console.error('[credit-verify] Brazil verification error:', error);
    return {
      success: false,
      credit_score: null,
      risk_level: 'high',
      has_issues: false,
      country: 'BR',
      error: 'Error al verificar con Serasa',
    };
  }
}

/**
 * Placeholder for countries not yet implemented
 * Returns a warning but allows basic verification to pass
 */
async function verifyPlaceholder(
  country: SupportedCountry,
  documentNumber: string,
  userId: string
): Promise<CreditVerifyResponse> {
  console.log(`[credit-verify] ${country} verification not yet implemented, using placeholder`);

  // Store a placeholder record in credit_reports
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + 30);

  await supabase.from('credit_reports').upsert({
    user_id: userId,
    document_type: getDocumentTypeForCountry(country),
    document_number: documentNumber.replace(/\D/g, ''),
    country: country,
    provider: 'placeholder',
    raw_response: { message: 'Credit verification not yet available for this country' },
    credit_score: null,
    risk_level: 'medium', // Default to medium when we can't verify
    status: 'completed',
    verified_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    error_code: 'NOT_IMPLEMENTED',
    error_message: `Verificación crediticia para ${country} en desarrollo`,
  }, {
    onConflict: 'user_id,document_number,provider',
  });

  const countryMessages: Record<string, string> = {
    EC: 'Verificación crediticia para Ecuador próximamente (Datacrédito)',
    CL: 'Verificación crediticia para Chile próximamente (DICOM/Equifax)',
    CO: 'Verificación crediticia para Colombia próximamente (Datacrédito)',
  };

  return {
    success: true, // Allow to pass but with warning
    credit_score: null,
    risk_level: 'medium',
    has_issues: false,
    country,
    provider: 'placeholder',
    message: countryMessages[country] || `Verificación crediticia para ${country} no disponible`,
  };
}

/**
 * Get default document type for a country
 */
function getDocumentTypeForCountry(country: SupportedCountry): string {
  const docTypes: Record<SupportedCountry, string> = {
    AR: 'DNI',
    BR: 'CPF',
    EC: 'CEDULA',
    CL: 'RUT',
    CO: 'CEDULA',
  };
  return docTypes[country] || 'ID';
}
