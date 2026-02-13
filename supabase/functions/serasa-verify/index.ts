/**
 * Serasa Credit Verification Edge Function
 *
 * Verifies user credit score and financial history using Serasa Experian API (Brazil).
 * Stores results in credit_reports table for risk assessment.
 *
 * Endpoints:
 * POST /serasa-verify
 *   Body: { cpf, user_id }
 *
 * Required ENV vars:
 * - SERASA_API_KEY: Serasa API key
 * - SERASA_CLIENT_ID: Serasa client ID
 * - SERASA_CLIENT_SECRET: Serasa client secret
 *
 * Alternative providers (fallback):
 * - METAMAP_API_KEY: MetaMap API key (provides Serasa data)
 */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';
import { getCorsHeaders } from '../_shared/cors.ts';

// =============================================================================
// TYPES
// =============================================================================

interface SerasaVerifyRequest {
  cpf: string;
  user_id: string;
}

interface SerasaApiResponse {
  success: boolean;
  data?: {
    // Person data
    nome?: string;
    data_nascimento?: string;

    // Serasa Score (0-1000)
    score?: number;
    score_classe?: string; // A, B, C, D, E

    // Restricciones
    restricoes?: number;
    protestos?: number;
    cheques_sem_fundo?: number;
    acoes_judiciais?: number;
    pendencias_financeiras?: number;

    // Deudas
    dividas_vencidas?: number;
    valor_total_dividas?: number;

    // Situación
    situacao_cpf?: 'REGULAR' | 'PENDENTE' | 'SUSPENSO' | 'CANCELADO' | 'NULO';

    // Consultas recientes
    consultas_ultimos_90_dias?: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

interface MetaMapResponse {
  success: boolean;
  resource?: {
    data?: {
      cpfNumber?: string;
      cpfStatus?: string;
      score?: number;
      restrictions?: {
        total?: number;
        protests?: number;
        bouncedChecks?: number;
        lawsuits?: number;
        financialPending?: number;
      };
      debts?: {
        expired?: number;
        totalAmount?: number;
      };
    };
  };
  error?: string;
}

interface CreditReportInsert {
  user_id: string;
  document_type: string;
  document_number: string;
  country: string;
  provider: string;
  raw_response: SerasaApiResponse | MetaMapResponse;
  credit_score: number | null;
  risk_level: string;
  bcra_status: string | null; // Usado para situacion_cpf en Brasil
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

// Serasa direct API (preferred)
const SERASA_API_KEY = Deno.env.get('SERASA_API_KEY');
const SERASA_CLIENT_ID = Deno.env.get('SERASA_CLIENT_ID');
const SERASA_CLIENT_SECRET = Deno.env.get('SERASA_CLIENT_SECRET');
const SERASA_API_URL = 'https://api.serasaexperian.com.br/credit/v1/score';

// MetaMap as fallback (provides Serasa data)
const METAMAP_API_KEY = Deno.env.get('METAMAP_API_KEY');
const METAMAP_WEBHOOK_SECRET = Deno.env.get('METAMAP_WEBHOOK_SECRET');
const METAMAP_API_URL = 'https://api.metamap.com/v1/verifications';

// Report validity period (30 days)
const REPORT_VALIDITY_DAYS = 30;

// =============================================================================
// CPF VALIDATION
// =============================================================================

/**
 * Validate CPF format and checksum (Brazilian tax ID)
 * CPF: 11 digits in format XXX.XXX.XXX-XX
 */
function isValidCPF(cpf: string): boolean {
  // Remove non-digits
  const cleaned = cpf.replace(/\D/g, '');

  // Must be 11 digits
  if (cleaned.length !== 11) return false;

  // Check for known invalid CPFs (all same digit)
  if (/^(\d)\1{10}$/.test(cleaned)) return false;

  // Validate checksum
  let sum = 0;
  let remainder: number;

  // First digit
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleaned.substring(i - 1, i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.substring(9, 10))) return false;

  // Second digit
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleaned.substring(i - 1, i)) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.substring(10, 11))) return false;

  return true;
}

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
    // Check if any provider is configured
    const hasSerasa = SERASA_API_KEY && SERASA_CLIENT_ID && SERASA_CLIENT_SECRET;
    const hasMetaMap = METAMAP_API_KEY;

    if (!hasSerasa && !hasMetaMap) {
      console.error('[serasa-verify] No credit verification provider configured');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'PROVIDER_NOT_CONFIGURED',
          message: 'Servico de verificacao crediticia nao configurado'
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const payload: SerasaVerifyRequest = await req.json();
    const { cpf, user_id } = payload;

    // Validate required fields
    if (!cpf || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: cpf, user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean CPF
    const cleanCPF = cpf.replace(/\D/g, '');

    // Validate CPF
    if (!isValidCPF(cleanCPF)) {
      return new Response(
        JSON.stringify({
          error: 'INVALID_CPF',
          message: 'CPF inválido'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[serasa-verify] Processing CPF ${cleanCPF.substring(0, 3)}.***.***-** for user ${user_id}`);

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Check for existing valid report
    const existingReport = await checkExistingReport(supabase, user_id, cleanCPF);
    if (existingReport) {
      console.log(`[serasa-verify] Found valid existing report for user ${user_id}`);
      return new Response(
        JSON.stringify({
          success: true,
          cached: true,
          credit_score: existingReport.credit_score,
          risk_level: existingReport.risk_level,
          cpf_status: existingReport.bcra_status,
          expires_at: existingReport.expires_at,
          message: 'Reporte crediticio existente válido'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call credit API
    let apiResponse: SerasaApiResponse;
    let provider: string;

    if (hasSerasa) {
      // Try Serasa first
      try {
        apiResponse = await callSerasaApi(cleanCPF);
        provider = 'serasa';
      } catch (serasaError) {
        console.error('[serasa-verify] Serasa API error:', serasaError);
        if (hasMetaMap) {
          // Fallback to MetaMap
          apiResponse = await callMetaMapApi(cleanCPF);
          provider = 'metamap';
        } else {
          throw serasaError;
        }
      }
    } else {
      // Use MetaMap
      apiResponse = await callMetaMapApi(cleanCPF);
      provider = 'metamap';
    }

    // Process and store response
    const report = await processApiResponse(
      supabase,
      user_id,
      cleanCPF,
      apiResponse,
      provider
    );

    // Return result
    return new Response(
      JSON.stringify({
        success: report.status === 'completed',
        cached: false,
        credit_score: report.credit_score,
        risk_level: report.risk_level,
        cpf_status: report.bcra_status,
        has_issues: report.has_bounced_checks || report.has_lawsuits || report.has_bankruptcy,
        total_debt: report.total_debt_amount,
        expires_at: report.expires_at,
        provider: provider,
        error: report.error_message
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[serasa-verify] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Erro interno do servidor',
        details: 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Check for existing valid credit report
 */
async function checkExistingReport(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  cpf: string
): Promise<CreditReportInsert | null> {
  const { data, error } = await supabase
    .from('credit_reports')
    .select('*')
    .eq('user_id', userId)
    .eq('document_number', cpf)
    .eq('country', 'BR')
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
 * Call Serasa API directly
 */
async function callSerasaApi(cpf: string): Promise<SerasaApiResponse> {
  // First, get OAuth token
  const tokenResponse = await fetch('https://api.serasaexperian.com.br/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${btoa(`${SERASA_CLIENT_ID}:${SERASA_CLIENT_SECRET}`)}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!tokenResponse.ok) {
    throw new Error(`Serasa token error: ${tokenResponse.status}`);
  }

  const tokenData = await tokenResponse.json();
  const accessToken = tokenData.access_token;

  // Call Score API
  const scoreResponse = await fetch(`${SERASA_API_URL}?cpf=${cpf}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'x-api-key': SERASA_API_KEY!,
      'Accept': 'application/json',
    },
  });

  if (!scoreResponse.ok) {
    const errorText = await scoreResponse.text();
    console.error('[serasa-verify] Serasa API error:', errorText);
    throw new Error(`Serasa API error: ${scoreResponse.status}`);
  }

  const data = await scoreResponse.json();

  // Transform Serasa response to our format
  return {
    success: true,
    data: {
      nome: data.nome,
      score: data.score,
      score_classe: data.classe,
      restricoes: data.restricoes?.total || 0,
      protestos: data.restricoes?.protestos || 0,
      cheques_sem_fundo: data.restricoes?.cheques || 0,
      acoes_judiciais: data.restricoes?.acoes || 0,
      pendencias_financeiras: data.restricoes?.pendencias || 0,
      dividas_vencidas: data.dividas?.vencidas || 0,
      valor_total_dividas: data.dividas?.valorTotal || 0,
      situacao_cpf: data.situacaoCpf,
      consultas_ultimos_90_dias: data.consultas?.ultimos90Dias || 0,
    },
  };
}

/**
 * Call MetaMap API (Serasa data provider)
 */
async function callMetaMapApi(cpf: string): Promise<SerasaApiResponse> {
  console.log('[serasa-verify] Calling MetaMap API...');

  const response = await fetch(`${METAMAP_API_URL}/credit-check/br`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${METAMAP_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      cpf: cpf,
      webhook_url: null, // Synchronous check
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[serasa-verify] MetaMap API error:', errorText);
    throw new Error(`MetaMap API error: ${response.status}`);
  }

  const mmResponse: MetaMapResponse = await response.json();

  // Transform MetaMap response to our format
  if (mmResponse.success && mmResponse.resource?.data) {
    const data = mmResponse.resource.data;
    return {
      success: true,
      data: {
        score: data.score,
        situacao_cpf: data.cpfStatus as SerasaApiResponse['data']&['situacao_cpf'],
        restricoes: data.restrictions?.total || 0,
        protestos: data.restrictions?.protests || 0,
        cheques_sem_fundo: data.restrictions?.bouncedChecks || 0,
        acoes_judiciais: data.restrictions?.lawsuits || 0,
        pendencias_financeiras: data.restrictions?.financialPending || 0,
        dividas_vencidas: data.debts?.expired || 0,
        valor_total_dividas: data.debts?.totalAmount || 0,
      },
    };
  }

  return {
    success: false,
    error: {
      code: 'METAMAP_ERROR',
      message: mmResponse.error || 'MetaMap verification failed',
    },
  };
}

/**
 * Calculate risk level from Serasa score (0-1000)
 */
function calculateRiskLevel(score: number | null | undefined): string {
  if (score === null || score === undefined) {
    return 'high'; // Unknown = high risk
  }
  // Serasa Score ranges:
  // 801-1000 = Excellent (Low risk)
  // 501-800 = Good (Medium-low risk)
  // 301-500 = Medium (Medium risk)
  // 1-300 = High risk
  if (score >= 801) return 'low';
  if (score >= 501) return 'medium';
  if (score >= 301) return 'high';
  return 'critical';
}

/**
 * Process API response and store in database
 */
async function processApiResponse(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  cpf: string,
  apiResponse: SerasaApiResponse,
  provider: string
): Promise<CreditReportInsert> {
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + REPORT_VALIDITY_DAYS);

  // Build report record
  const report: CreditReportInsert = {
    user_id: userId,
    document_type: 'CPF',
    document_number: cpf,
    country: 'BR',
    provider: provider,
    raw_response: apiResponse,
    credit_score: null,
    risk_level: 'high',
    bcra_status: null, // Will hold situacao_cpf
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

  // Check if API returned data
  if (!apiResponse.success) {
    report.status = 'failed';
    report.error_code = apiResponse.error?.code || 'NO_DATA';
    report.error_message = apiResponse.error?.message || 'Nao foram encontrados dados para este CPF';
  } else if (apiResponse.data) {
    const data = apiResponse.data;

    report.status = 'completed';
    report.verified_at = now.toISOString();
    report.expires_at = expiresAt.toISOString();

    // Extract credit data
    report.credit_score = data.score ?? null;
    report.risk_level = calculateRiskLevel(data.score);
    report.bcra_status = data.situacao_cpf ?? null;

    // Financial flags
    report.has_bounced_checks = (data.cheques_sem_fundo ?? 0) > 0;
    report.bounced_checks_count = data.cheques_sem_fundo ?? 0;
    report.has_lawsuits = (data.acoes_judiciais ?? 0) > 0;
    report.lawsuits_count = data.acoes_judiciais ?? 0;

    // Debt info
    report.total_debt_amount = data.valor_total_dividas ?? null;

    // Check for critical issues (protests, financial pending)
    if ((data.protestos ?? 0) > 0 || (data.pendencias_financeiras ?? 0) > 0) {
      // Increase risk if there are protests or pending issues
      if (report.risk_level === 'low') report.risk_level = 'medium';
      if (report.risk_level === 'medium') report.risk_level = 'high';
    }

    // CPF status check
    if (data.situacao_cpf && data.situacao_cpf !== 'REGULAR') {
      report.risk_level = 'critical'; // Non-regular CPF is critical risk
    }
  } else {
    report.status = 'failed';
    report.error_code = 'INVALID_RESPONSE';
    report.error_message = 'Resposta invalida do servico de verificacao';
  }

  // Store in database
  const { error: insertError } = await supabase
    .from('credit_reports')
    .upsert(report, {
      onConflict: 'user_id,document_number,provider',
    });

  if (insertError) {
    console.error('[serasa-verify] Failed to store credit report:', insertError);
    // Don't throw, return the report anyway
    report.error_message = (report.error_message || '') + ' (Erro ao salvar relatorio)';
  }

  console.log(`[serasa-verify] Report stored. Score: ${report.credit_score}, Risk: ${report.risk_level}`);

  return report;
}
