import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { enforceRateLimit, RateLimitError } from '../_shared/rate-limiter.ts';

const MP_API_BASE = 'https://api.mercadopago.com/v1';

interface ProcessDepositPaymentRequest {
  transaction_id: string;
  card_token: string;
  issuer_id?: string;
  installments?: number;
}

interface MercadoPagoPaymentResponse {
  id: number;
  status: string;
  status_detail: string;
  payment_method_id?: string;
  payment_type_id?: string;
  transaction_amount?: number;
  currency_id?: string;
  card?: {
    last_four_digits?: string;
    cardholder?: {
      name?: string;
    };
  };
  date_created?: string;
  date_approved?: string;
  transaction_details?: {
    net_received_amount?: number;
  };
  payer?: {
    email?: string;
    first_name?: string;
    last_name?: string;
  };
  metadata?: Record<string, unknown>;
}

const FAILURE_STATUSES = new Set([
  'rejected',
  'cancelled',
  'refunded',
  'charged_back',
  'in_mediation',
]);

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    try {
      await enforceRateLimit(req, {
        endpoint: 'mercadopago-process-deposit-payment',
        windowSeconds: 60,
      });
    } catch (error) {
      if (error instanceof RateLimitError) {
        return error.toResponse();
      }
      console.error('[RateLimit] Error enforcing rate limit:', error);
    }

    const MP_ACCESS_TOKEN_RAW = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!MP_ACCESS_TOKEN_RAW || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const MP_ACCESS_TOKEN = MP_ACCESS_TOKEN_RAW.trim().replace(/[\r\n\t\s]/g, '');

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const token = authHeader.replace('Bearer ', '').trim();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const body: ProcessDepositPaymentRequest = await req.json();
    const { transaction_id, card_token, issuer_id, installments = 1 } = body;

    if (!transaction_id || !card_token) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: transaction_id, card_token' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: transaction, error: transactionError } = await supabase
      .from('wallet_transactions')
      .select(
        'id, user_id, amount, status, provider, currency, description, is_withdrawable, provider_metadata'
      )
      .eq('id', transaction_id)
      .eq('user_id', user.id)
      .eq('type', 'deposit')
      .single();

    if (transactionError || !transaction) {
      return new Response(
        JSON.stringify({ error: 'Transaction not found or unauthorized' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (transaction.provider !== 'mercadopago') {
      return new Response(
        JSON.stringify({ error: 'Transaction provider is not MercadoPago' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (transaction.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: `Transaction is not pending (current: ${transaction.status})` }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const amount = Number(transaction.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid transaction amount' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('email, first_name, last_name, phone, gov_id_number, gov_id_type, dni')
      .eq('id', user.id)
      .single();

    let phoneFormatted: { area_code: string; number: string } | undefined;
    if (profile?.phone) {
      const digits = profile.phone.replace(/[^0-9]/g, '');
      const withoutCountry = digits.startsWith('54') ? digits.slice(2) : digits;
      const areaCode = withoutCountry.slice(0, 2) || '11';
      const number = withoutCountry.slice(2);
      if (number.length >= 6) {
        phoneFormatted = { area_code: areaCode, number };
      }
    }

    const dniNumber = profile?.gov_id_number || profile?.dni;
    const dniType = profile?.gov_id_type || 'DNI';
    let identification: { type: string; number: string } | undefined;
    if (dniNumber) {
      const dniDigits = dniNumber.replace(/[^0-9]/g, '');
      if (dniDigits.length >= 7) {
        identification = {
          type: dniType.toUpperCase(),
          number: dniDigits,
        };
      }
    }

    const firstName = profile?.first_name || user.user_metadata?.first_name || 'Usuario';
    const lastName = profile?.last_name || user.user_metadata?.last_name || 'AutoRenta';
    const payerEmail = profile?.email || user.email || `${user.id}@autorenta.com`;

    const mpPayload: Record<string, unknown> = {
      transaction_amount: Number(amount.toFixed(2)),
      token: card_token,
      description:
        transaction.description ||
        `Depósito Wallet ${transaction_id.slice(0, 8).toUpperCase()} - AutoRenta`,
      installments: installments > 0 ? installments : 1,
      payer: {
        email: payerEmail,
        first_name: firstName,
        last_name: lastName,
        ...(phoneFormatted && { phone: phoneFormatted }),
        ...(identification && { identification }),
      },
      external_reference: transaction_id,
      statement_descriptor: 'AUTORENTAR',
      metadata: {
        transaction_id,
        user_id: transaction.user_id,
        payment_type: 'wallet_deposit',
        allow_withdrawal: transaction.is_withdrawable,
      },
    };

    if (issuer_id) {
      mpPayload.issuer_id = issuer_id;
    }

    console.log('Processing wallet deposit via MercadoPago:', {
      transaction_id,
      amount,
      installments,
    });

    const mpResponse = await fetch(`${MP_API_BASE}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        'X-Idempotency-Key': transaction_id,
      },
      body: JSON.stringify(mpPayload),
    });

    const mpData: MercadoPagoPaymentResponse = await mpResponse.json().catch(() => ({} as MercadoPagoPaymentResponse));

    if (!mpResponse.ok) {
      console.error('MercadoPago API Error:', mpData);

      await supabase
        .from('wallet_transactions')
        .update({
          provider_metadata: {
            ...(transaction.provider_metadata ?? {}),
            last_error: {
              timestamp: new Date().toISOString(),
              status: mpResponse.status,
              response: mpData,
            },
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', transaction_id);

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Payment processing failed',
          details: mpData,
        }),
        {
          status: mpResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const updatedMetadata = {
      ...(transaction.provider_metadata ?? {}),
      payment_id: mpData.id,
      status: mpData.status,
      status_detail: mpData.status_detail,
      payment_method_id: mpData.payment_method_id,
      payment_type_id: mpData.payment_type_id,
      transaction_amount: mpData.transaction_amount,
      currency_id: mpData.currency_id,
      date_created: mpData.date_created,
      date_approved: mpData.date_approved,
      installments,
      issuer_id,
      card_last4: mpData.card?.last_four_digits,
    };

    await supabase
      .from('wallet_transactions')
      .update({
        provider_transaction_id: mpData.id?.toString() ?? null,
        provider_metadata: updatedMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', transaction_id);

    if (FAILURE_STATUSES.has(mpData.status)) {
      await supabase
        .from('wallet_transactions')
        .update({
          status: 'failed',
          provider_metadata: {
            ...updatedMetadata,
            failed_at: new Date().toISOString(),
          },
        })
        .eq('id', transaction_id);

      return new Response(
        JSON.stringify({
          success: false,
          transaction_id,
          payment_id: mpData.id,
          status: mpData.status,
          message: mpData.status_detail || 'El pago fue rechazado por Mercado Pago',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (mpData.status === 'approved') {
      const providerMetadata = {
        id: mpData.id,
        status: mpData.status,
        status_detail: mpData.status_detail,
        payment_method_id: mpData.payment_method_id,
        payment_type_id: mpData.payment_type_id,
        transaction_amount: mpData.transaction_amount,
        net_amount: mpData.transaction_details?.net_received_amount,
        currency_id: mpData.currency_id,
        date_approved: mpData.date_approved,
        date_created: mpData.date_created,
        external_reference: transaction_id,
        payer_email: mpData.payer?.email,
        payer_first_name: mpData.payer?.first_name,
        payer_last_name: mpData.payer?.last_name,
      };

      const { error: confirmError } = await supabase.rpc('wallet_confirm_deposit_admin', {
        p_user_id: transaction.user_id,
        p_transaction_id: transaction.id,
        p_provider_transaction_id: mpData.id?.toString() || '',
        p_provider_metadata: providerMetadata,
      });

      if (confirmError) {
        console.error('Error confirming deposit:', confirmError);
        throw confirmError;
      }

      const amountCents = Math.round(
        Number((mpData.transaction_amount ?? amount).toFixed(2)) * 100
      );
      if (Number.isFinite(amountCents) && amountCents > 0) {
        const { error: ledgerError } = await supabase.rpc('wallet_deposit_ledger', {
          p_user_id: transaction.user_id,
          p_amount_cents: amountCents,
          p_ref: `mp-${mpData.id}`,
          p_provider: 'mercadopago',
          p_meta: {
            transaction_id,
            payment_id: mpData.id,
            payment_method: mpData.payment_method_id,
            payment_type: mpData.payment_type_id,
            status: mpData.status,
            status_detail: mpData.status_detail,
            currency: mpData.currency_id,
            net_amount: mpData.transaction_details?.net_received_amount,
            date_approved: mpData.date_approved,
            payer_email: mpData.payer?.email,
          },
        });

        if (ledgerError) {
          console.error('Warning: Error registering deposit in ledger:', ledgerError);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          transaction_id,
          payment_id: mpData.id,
          status: mpData.status,
          message: 'Depósito confirmado exitosamente',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        transaction_id,
        payment_id: mpData.id,
        status: mpData.status,
        message: 'Pago iniciado. Esperando confirmación de Mercado Pago.',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Fatal error in mercadopago-process-deposit-payment:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});


