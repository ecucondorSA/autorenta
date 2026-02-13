// ============================================================================
// AUTORENTAR - Wallet Transfer Edge Function
// ============================================================================
// Endpoint para realizar transferencias internas entre usuarios
// Incluye idempotencia, rate limiting y validaciones completas
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Rate limiting: max 10 transferencias por hora por usuario
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hora
const RATE_LIMIT_MAX = 10;

interface TransferRequest {
  to_user_id: string;
  amount_cents: number;
  description?: string;
  meta?: Record<string, unknown>;
}

interface WalletTransferRpcResponse {
  success: boolean;
  transaction_id?: string;
  error?: string;
  message?: string;
}

serve(async (req: Request) => {
  // ✅ SECURITY: CORS con whitelist de dominios permitidos
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Solo permitir POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // 1. AUTENTICACIÓN
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: 'Server misconfigured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role only for privileged reads (auth verification, recipient lookup, rate limit).
    const supabaseAdmin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Use user JWT context for RPCs that enforce auth.uid() inside Postgres.
    const supabaseUser: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verificar el token del usuario
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. VALIDAR PAYLOAD
    const body: TransferRequest = await req.json();

    if (!body.to_user_id || body.amount_cents == null) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to_user_id, amount_cents' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (body.amount_cents <= 0) {
      return new Response(
        JSON.stringify({ error: 'Amount must be positive' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (body.amount_cents < 100) {
      // Mínimo ARS 1.00
      return new Response(
        JSON.stringify({ error: 'Minimum transfer amount is 100 cents (ARS 1.00)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (user.id === body.to_user_id) {
      return new Response(
        JSON.stringify({ error: 'Cannot transfer to yourself' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. IDEMPOTENCY KEY
    const idempotencyKey =
      req.headers.get('Idempotency-Key') ||
      `transfer-${user.id}-${body.to_user_id}-${body.amount_cents}-${Date.now()}`;

    // 4. RATE LIMITING
    const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    const { count: transferCount, error: rateLimitError } = await supabaseAdmin
      .from('wallet_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('category', 'transfer_out')
      .eq('status', 'completed')
      .gte('created_at', since);

    if (rateLimitError) {
      console.error('Rate limit query error:', rateLimitError);
      return new Response(
        JSON.stringify({ error: 'Rate limit check failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if ((transferCount ?? 0) >= RATE_LIMIT_MAX) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: `Maximum ${RATE_LIMIT_MAX} transfers per hour`,
          retry_after: RATE_LIMIT_WINDOW_MS / 1000,
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. VALIDAR QUE EL DESTINATARIO EXISTE
    const { data: toUser, error: toUserError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name')
      .eq('id', body.to_user_id)
      .single();

    if (toUserError || !toUser) {
      return new Response(
        JSON.stringify({ error: 'Recipient user not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. EJECUTAR TRANSFERENCIA VÍA RPC
    const { data, error: transferError } = await supabaseUser.rpc('wallet_transfer', {
      p_from_user: user.id,
      p_to_user: body.to_user_id,
      p_amount_cents: body.amount_cents,
      p_ref: idempotencyKey,
      p_meta: {
        description: body.description || `Transfer to ${toUser.full_name}`,
        ...body.meta,
        initiated_at: new Date().toISOString(),
        ip: req.headers.get('CF-Connecting-IP') || req.headers.get('X-Forwarded-For'),
      },
    });

    if (transferError) {
      console.error('Transfer error:', transferError);

      // Detectar tipo de error
      if (
        transferError.message?.includes('Insufficient balance') ||
        transferError.message?.includes('Insufficient funds')
      ) {
        return new Response(
          JSON.stringify({
            error: 'Insufficient balance',
            message: 'Your wallet balance is insufficient for this transfer',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          error: 'Transfer failed',
          message: transferError.message || 'Unknown error occurred',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Explicitly cast the RPC result
    const result = data as WalletTransferRpcResponse;

    // RPC returns a JSON object even on business errors (success=false).
    if (!result || result.success !== true) {
      const errCode = result?.error || 'TRANSFER_FAILED';
      const message = result?.message || 'Transfer failed';

      const status = errCode === 'UNAUTHORIZED' ? 403 : 400;
      return new Response(
        JSON.stringify({ error: errCode, message }),
        { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. RESPUESTA EXITOSA
    return new Response(
      JSON.stringify({
        ok: true,
        transfer: result,
        from_user: {
          id: user.id,
          email: user.email,
        },
        to_user: {
          id: toUser.id,
          name: toUser.full_name,
        },
        amount_cents: body.amount_cents,
        idempotency_key: idempotencyKey,
      }),
      {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
