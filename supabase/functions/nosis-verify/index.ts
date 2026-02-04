/**
 * Nosis Credit Verification Edge Function
 *
 * Verifies user credit score and financial history using Nosis/Veraz API (Argentina).
 * Stores results in credit_reports table for risk assessment.
 *
 * Endpoints:
 * POST /nosis-verify
 *   Body: { document_type, document_number, user_id }
 *
 * Required ENV vars:
 * - NOSIS_TOKEN_SUSC: Nosis subscription token
 * - NOSIS_TOKEN_API: Nosis API token
 */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';
import { getCorsHeaders } from '../_shared/cors.ts';

// =============================================================================
// TYPES
// =============================================================================

type DocumentType = 'DNI' | 'CUIT' | 'CUIL';

interface NosisVerifyRequest {
  document_type: DocumentType;
  document_number: string;
  user_id: string;
}

interface NosisApiResponse {
  state: 0 | 1;
  data?: {
    // Person data
    nombre?: string;
    apellido?: string;
    razon_social?: string;

    // Credit score
    score?: number;
    score_descripcion?: string;

    // BCRA status
    bcra_situacion?: string;
    bcra_monto_total?: number;

    // Financial flags
    cheques_rechazados?: number;
    cheques_sin_fondos?: number;
    juicios_cantidad?: number;
    concursos?: boolean;
    quiebras?: boolean;
    deuda_fiscal?: number;
    deuda_previsional?: number;

    // Income estimation
    ingreso_estimado?: number;
    facturacion_anual?: number;

    // Employment
    empleador?: string;
    situacion_laboral?: string;

    // Debt
    endeudamiento_total?: number;
    compromiso_mensual?: number;

    // Contact
    domicilios?: Array<{ direccion: string; localidad: string; provincia: string }>;
    telefonos?: string[];
  };
  error?: {
    code: string;
    message: string;
  };
}

interface CreditReportInsert {
  user_id: string;
  document_type: DocumentType;
  document_number: string;
  country: string;
  provider: string;
  raw_response: NosisApiResponse;
  credit_score: number | null;
  risk_level: string;
  bcra_status: string | null;
  has_bounced_checks: boolean;
  bounced_checks_count: number;
  has_lawsuits: boolean;
  lawsuits_count: number;
  has_bankruptcy: boolean;
  has_tax_debt: boolean;
  has_social_security_debt: boolean;
  estimated_monthly_income: number | null;
  estimated_annual_revenue: number | null;
  total_debt_amount: number | null;
  monthly_commitment: number | null;
  employer_name: string | null;
  employment_status: string | null;
  status: 'pending' | 'completed' | 'failed' | 'expired';
  verified_at: string | null;
  expires_at: string | null;
  error_code: string | null;
  error_message: string | null;
}

// =============================================================================
// ENVIRONMENT
// =============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const NOSIS_TOKEN_SUSC = Deno.env.get('NOSIS_TOKEN_SUSC');
const NOSIS_TOKEN_API = Deno.env.get('NOSIS_TOKEN_API');

// Nosis API endpoint (via CertiSend)
const NOSIS_API_URL = 'https://cont1-virtual1.certisend.com/web/container/api/v1/database/identity/ar/buro/nosis/report';
const NOSIS_INTERNAL_ID = '76';

// Report validity period (30 days)
const REPORT_VALIDITY_DAYS = 30;

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
    // Check Nosis credentials
    if (!NOSIS_TOKEN_SUSC || !NOSIS_TOKEN_API) {
      console.error('[nosis-verify] Missing Nosis credentials');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'NOSIS_NOT_CONFIGURED',
          message: 'Servicio de verificacion crediticia no configurado'
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const payload: NosisVerifyRequest = await req.json();
    const { document_type, document_number, user_id } = payload;

    // Validate required fields
    if (!document_type || !document_number || !user_id) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: document_type, document_number, user_id'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate document type
    if (!['DNI', 'CUIT', 'CUIL'].includes(document_type)) {
      return new Response(
        JSON.stringify({ error: 'document_type must be "DNI", "CUIT", or "CUIL"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean document number (remove dots, dashes, spaces)
    const cleanDocNumber = document_number.replace(/[\.\-\s]/g, '');

    // Validate document number format
    if (!isValidDocumentNumber(document_type, cleanDocNumber)) {
      return new Response(
        JSON.stringify({
          error: 'INVALID_DOCUMENT',
          message: `Numero de ${document_type} invalido`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[nosis-verify] Processing ${document_type} ${cleanDocNumber} for user ${user_id}`);

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Check for existing valid report
    const existingReport = await checkExistingReport(supabase, user_id, cleanDocNumber);
    if (existingReport) {
      console.log(`[nosis-verify] Found valid existing report for user ${user_id}`);
      return new Response(
        JSON.stringify({
          success: true,
          cached: true,
          credit_score: existingReport.credit_score,
          risk_level: existingReport.risk_level,
          bcra_status: existingReport.bcra_status,
          expires_at: existingReport.expires_at,
          message: 'Reporte crediticio existente valido'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Nosis API
    const nosisResponse = await callNosisApi(cleanDocNumber);

    // Process and store response
    const report = await processNosisResponse(
      supabase,
      user_id,
      document_type,
      cleanDocNumber,
      nosisResponse
    );

    // Return result
    return new Response(
      JSON.stringify({
        success: report.status === 'completed',
        cached: false,
        credit_score: report.credit_score,
        risk_level: report.risk_level,
        bcra_status: report.bcra_status,
        has_issues: report.has_bounced_checks || report.has_lawsuits || report.has_bankruptcy,
        expires_at: report.expires_at,
        error: report.error_message
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[nosis-verify] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Validate document number format
 */
function isValidDocumentNumber(type: DocumentType, number: string): boolean {
  if (type === 'DNI') {
    // DNI: 7-8 digits
    return /^\d{7,8}$/.test(number);
  } else {
    // CUIT/CUIL: 11 digits (XX-XXXXXXXX-X format without dashes)
    return /^\d{11}$/.test(number);
  }
}

/**
 * Check for existing valid credit report
 */
async function checkExistingReport(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  documentNumber: string
): Promise<CreditReportInsert | null> {
  const { data, error } = await supabase
    .from('credit_reports')
    .select('*')
    .eq('user_id', userId)
    .eq('document_number', documentNumber)
    .eq('status', 'completed')
    .gt('expires_at', new Date().toISOString())
    .order('verified_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return data as CreditReportInsert;
}

/**
 * Call Nosis API
 */
async function callNosisApi(documentNumber: string): Promise<NosisApiResponse> {
  const url = new URL(NOSIS_API_URL);
  url.searchParams.set('token-susc', NOSIS_TOKEN_SUSC!);
  url.searchParams.set('token-api', NOSIS_TOKEN_API!);
  url.searchParams.set('doc', documentNumber);
  url.searchParams.set('internalid', NOSIS_INTERNAL_ID);

  console.log(`[nosis-verify] Calling Nosis API for document ${documentNumber.substring(0, 4)}****`);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Nosis API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  console.log(`[nosis-verify] Nosis API response state: ${data.state}`);

  return data as NosisApiResponse;
}

/**
 * Calculate risk level from Nosis score
 */
function calculateRiskLevel(score: number | null | undefined): string {
  if (score === null || score === undefined) {
    return 'high'; // Unknown = high risk
  }
  if (score >= 700) return 'low';
  if (score >= 500) return 'medium';
  if (score >= 300) return 'high';
  return 'critical';
}

/**
 * Process Nosis response and store in database
 */
async function processNosisResponse(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  documentType: DocumentType,
  documentNumber: string,
  nosisResponse: NosisApiResponse
): Promise<CreditReportInsert> {
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + REPORT_VALIDITY_DAYS);

  // Build report record
  const report: CreditReportInsert = {
    user_id: userId,
    document_type: documentType,
    document_number: documentNumber,
    country: 'AR',
    provider: 'nosis',
    raw_response: nosisResponse,
    credit_score: null,
    risk_level: 'high',
    bcra_status: null,
    has_bounced_checks: false,
    bounced_checks_count: 0,
    has_lawsuits: false,
    lawsuits_count: 0,
    has_bankruptcy: false,
    has_tax_debt: false,
    has_social_security_debt: false,
    estimated_monthly_income: null,
    estimated_annual_revenue: null,
    total_debt_amount: null,
    monthly_commitment: null,
    employer_name: null,
    employment_status: null,
    status: 'pending',
    verified_at: null,
    expires_at: null,
    error_code: null,
    error_message: null,
  };

  // Check if Nosis returned data
  if (nosisResponse.state === 0) {
    report.status = 'failed';
    report.error_code = nosisResponse.error?.code || 'NO_DATA';
    report.error_message = nosisResponse.error?.message || 'No se encontraron datos para este documento';
  } else if (nosisResponse.state === 1 && nosisResponse.data) {
    const data = nosisResponse.data;

    report.status = 'completed';
    report.verified_at = now.toISOString();
    report.expires_at = expiresAt.toISOString();

    // Extract credit data
    report.credit_score = data.score ?? null;
    report.risk_level = calculateRiskLevel(data.score);
    report.bcra_status = data.bcra_situacion ?? null;

    // Financial flags
    report.has_bounced_checks = (data.cheques_rechazados ?? 0) > 0 || (data.cheques_sin_fondos ?? 0) > 0;
    report.bounced_checks_count = (data.cheques_rechazados ?? 0) + (data.cheques_sin_fondos ?? 0);
    report.has_lawsuits = (data.juicios_cantidad ?? 0) > 0;
    report.lawsuits_count = data.juicios_cantidad ?? 0;
    report.has_bankruptcy = data.quiebras === true || data.concursos === true;
    report.has_tax_debt = (data.deuda_fiscal ?? 0) > 0;
    report.has_social_security_debt = (data.deuda_previsional ?? 0) > 0;

    // Financial estimates
    report.estimated_monthly_income = data.ingreso_estimado ?? null;
    report.estimated_annual_revenue = data.facturacion_anual ?? null;
    report.total_debt_amount = data.endeudamiento_total ?? null;
    report.monthly_commitment = data.compromiso_mensual ?? null;

    // Employment
    report.employer_name = data.empleador ?? null;
    report.employment_status = data.situacion_laboral ?? null;
  } else {
    report.status = 'failed';
    report.error_code = 'INVALID_RESPONSE';
    report.error_message = 'Respuesta inválida del servicio de verificación';
  }

  // Store in database
  const { error: insertError } = await supabase
    .from('credit_reports')
    .upsert(report, {
      onConflict: 'user_id,document_number,provider',
    });

  if (insertError) {
    console.error('[nosis-verify] Failed to store credit report:', insertError);
    // Don't throw, return the report anyway
    report.error_message = (report.error_message || '') + ' (Error guardando reporte)';
  }

  console.log(`[nosis-verify] Report stored. Score: ${report.credit_score}, Risk: ${report.risk_level}`);

  return report;
}
