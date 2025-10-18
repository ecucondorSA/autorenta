/**
 * Supabase Edge Function: process-withdrawal
 *
 * Procesa retiros aprobados usando MercadoPago Money Out API
 *
 * Flujo:
 * 1. Recibe withdrawal_request_id
 * 2. Obtiene datos de la solicitud y cuenta bancaria
 * 3. Crea Money Request en MercadoPago
 * 4. Actualiza el estado según respuesta
 * 5. Llama a wallet_complete_withdrawal o wallet_fail_withdrawal
 *
 * Documentación Money Out:
 * https://www.mercadopago.com.ar/developers/es/docs/money-out/landing
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WithdrawalRequest {
  id: string;
  user_id: string;
  bank_account_id: string;
  amount: number;
  fee_amount: number;
  net_amount: number;
  currency: string;
  status: string;
  provider: string;
}

interface BankAccount {
  id: string;
  account_type: string; // 'cbu' | 'cvu' | 'alias'
  account_number: string;
  account_holder_name: string;
  account_holder_document: string;
  bank_name?: string;
}

interface MercadoPagoMoneyOutPayload {
  amount: number;
  currency_id: string;
  description: string;
  receiver: {
    identification: {
      type: string; // 'DNI' | 'CUIT' | 'CUIL'
      number: string;
    };
    first_name: string;
    last_name: string;
    account: {
      type: string; // 'CBU' | 'CVU' | 'ALIAS'
      number: string;
    };
  };
  external_reference: string;
  notification_url?: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse request body
    const { withdrawal_request_id } = await req.json();

    if (!withdrawal_request_id) {
      throw new Error('withdrawal_request_id is required');
    }

    console.log(`[process-withdrawal] Processing withdrawal: ${withdrawal_request_id}`);

    // 1. Get withdrawal request
    const { data: withdrawalRequest, error: requestError } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('id', withdrawal_request_id)
      .eq('status', 'approved')
      .single();

    if (requestError || !withdrawalRequest) {
      throw new Error(`Withdrawal request not found or not approved: ${requestError?.message}`);
    }

    console.log(`[process-withdrawal] Request found: $${withdrawalRequest.net_amount} ARS`);

    // 2. Get bank account details
    const { data: bankAccount, error: accountError } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('id', withdrawalRequest.bank_account_id)
      .single();

    if (accountError || !bankAccount) {
      throw new Error(`Bank account not found: ${accountError?.message}`);
    }

    console.log(`[process-withdrawal] Bank account: ${bankAccount.account_type.toUpperCase()} ${maskAccountNumber(bankAccount.account_number)}`);

    // 3. Update status to 'processing'
    await supabase
      .from('withdrawal_requests')
      .update({ status: 'processing', processed_at: new Date().toISOString() })
      .eq('id', withdrawal_request_id);

    // 4. Prepare MercadoPago Money Out payload
    const moneyOutPayload: MercadoPagoMoneyOutPayload = {
      amount: withdrawalRequest.net_amount,
      currency_id: 'ARS',
      description: `Retiro AutoRenta - ${withdrawal_request_id.substring(0, 8)}`,
      receiver: {
        identification: {
          type: getIdentificationType(bankAccount.account_holder_document),
          number: bankAccount.account_holder_document,
        },
        first_name: getFirstName(bankAccount.account_holder_name),
        last_name: getLastName(bankAccount.account_holder_name),
        account: {
          type: bankAccount.account_type.toUpperCase(),
          number: bankAccount.account_number,
        },
      },
      external_reference: withdrawal_request_id,
      // notification_url: `${SUPABASE_URL}/functions/v1/withdrawal-webhook`,
    };

    console.log('[process-withdrawal] Calling MercadoPago Money Out API...');

    // 5. Call MercadoPago Money Out API
    const mpResponse = await fetch('https://api.mercadopago.com/v1/money_requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
        'X-Idempotency-Key': withdrawal_request_id, // Prevent duplicates
      },
      body: JSON.stringify(moneyOutPayload),
    });

    const mpData = await mpResponse.json();

    console.log(`[process-withdrawal] MercadoPago response: ${mpResponse.status}`, mpData);

    // 6. Handle response
    if (mpResponse.ok && mpData.id) {
      // Success - Complete withdrawal
      console.log(`[process-withdrawal] SUCCESS - MP Transaction ID: ${mpData.id}`);

      const { data: completeResult, error: completeError } = await supabase.rpc(
        'wallet_complete_withdrawal',
        {
          p_request_id: withdrawal_request_id,
          p_provider_transaction_id: mpData.id.toString(),
          p_provider_metadata: mpData,
        }
      );

      if (completeError) {
        console.error('[process-withdrawal] Error completing withdrawal:', completeError);
        throw completeError;
      }

      console.log('[process-withdrawal] Withdrawal completed successfully');

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Withdrawal processed successfully',
          mercadopago_id: mpData.id,
          amount: withdrawalRequest.net_amount,
          result: completeResult,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } else {
      // Error - Mark as failed
      const errorMessage = mpData.message || mpData.error || JSON.stringify(mpData);
      console.error('[process-withdrawal] FAILED - MercadoPago error:', errorMessage);

      const { error: failError } = await supabase.rpc('wallet_fail_withdrawal', {
        p_request_id: withdrawal_request_id,
        p_failure_reason: `MercadoPago error: ${errorMessage}`,
      });

      if (failError) {
        console.error('[process-withdrawal] Error marking as failed:', failError);
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage,
          details: mpData,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }
  } catch (error: any) {
    console.error('[process-withdrawal] Unexpected error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

/**
 * Helper: Get identification type based on document length
 */
function getIdentificationType(document: string): string {
  const cleanDoc = document.replace(/\D/g, '');
  return cleanDoc.length === 11 ? 'CUIT' : 'DNI';
}

/**
 * Helper: Extract first name
 */
function getFirstName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts[0] || 'Usuario';
}

/**
 * Helper: Extract last name
 */
function getLastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts.slice(1).join(' ') || 'AutoRenta';
}

/**
 * Helper: Mask account number for logging
 */
function maskAccountNumber(accountNumber: string): string {
  if (accountNumber.length <= 4) return accountNumber;
  return '•••• ' + accountNumber.slice(-4);
}
