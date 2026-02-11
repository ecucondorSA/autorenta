/**
 * Supabase Edge Function: mercadopago-money-out
 *
 * Procesa transferencias bancarias (Money Out) usando Mercado Pago.
 * Permite a los locadores retirar sus ganancias a sus cuentas bancarias.
 *
 * Flujo:
 * 1. Usuario solicita retiro → llama a wallet_request_withdrawal() en Supabase
 * 2. Admin aprueba retiro → llama a wallet_approve_withdrawal()
 * 3. Backend/Admin llama a esta Edge Function con request_id
 * 4. Edge Function procesa transferencia con Mercado Pago Money Out API
 * 5. Si exitosa: llama a wallet_complete_withdrawal() para debitar fondos
 * 6. Si falla: llama a wallet_fail_withdrawal() para marcar como fallida
 *
 * Mercado Pago Money Out API:
 * - Endpoint: POST https://api.mercadopago.com/v1/money_requests
 * - Docs: https://www.mercadopago.com.ar/developers/es/docs/money-out/integration
 *
 * Environment Variables Required:
 * - MERCADOPAGO_ACCESS_TOKEN: Access token de Mercado Pago
 * - SUPABASE_URL: URL del proyecto Supabase
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key de Supabase
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

// Tipos
interface MoneyOutRequest {
  withdrawal_request_id: string;
}

interface WithdrawalRequest {
  id: string;
  user_id: string;
  bank_account_id: string;
  amount: number;
  fee_amount: number;
  net_amount: number;
  currency: string;
  status: string;
}

interface BankAccount {
  id: string;
  account_type: 'cbu' | 'cvu' | 'alias';
  account_number: string;
  account_holder_name: string;
  account_holder_document: string;
}


serve(async (req) => {
  // ✅ SECURITY: CORS con whitelist de dominios permitidos
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verificar variables de entorno
    const MP_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!MP_ACCESS_TOKEN) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN environment variable not configured');
    }
    const cleanToken = MP_ACCESS_TOKEN.trim().replace(/[\r\n\t\s]/g, '');

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    // Validar método HTTP
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Obtener datos del request
    const body: MoneyOutRequest = await req.json();
    const { withdrawal_request_id } = body;

    if (!withdrawal_request_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: withdrawal_request_id' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verificar autorización (debe ser admin)
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

    // Crear cliente de Supabase con service key para operaciones
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Crear cliente con token del usuario para verificar auth
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || SUPABASE_SERVICE_KEY;
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verificar que el usuario está autenticado y es admin
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verificar que es admin
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('id, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (adminError || !adminUser) {
      console.error(`[mercadopago-money-out] Unauthorized access attempt by user ${user.id}`);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: admin access required' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[mercadopago-money-out] Admin ${user.id} processing withdrawal ${withdrawal_request_id}`);

    // Obtener la solicitud de retiro
    const { data: withdrawalRequest, error: wrError } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('id', withdrawal_request_id)
      .eq('status', 'approved') // Solo procesar aprobadas
      .single();

    if (wrError || !withdrawalRequest) {
      return new Response(
        JSON.stringify({ error: 'Withdrawal request not found or not approved' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate withdrawal request structure
    if (
      !withdrawalRequest ||
      typeof withdrawalRequest !== 'object' ||
      !('id' in withdrawalRequest) ||
      !('bank_account_id' in withdrawalRequest) ||
      !('net_amount' in withdrawalRequest)
    ) {
      return new Response(
        JSON.stringify({ error: 'Invalid withdrawal request data' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const request = withdrawalRequest as WithdrawalRequest;

    // Obtener datos de la cuenta bancaria
    const { data: bankAccount, error: baError } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('id', request.bank_account_id)
      .single();

    if (baError || !bankAccount) {
      // Marcar retiro como fallido
      await supabase.rpc('wallet_fail_withdrawal', {
        p_request_id: withdrawal_request_id,
        p_failure_reason: 'Cuenta bancaria no encontrada',
      });

      return new Response(
        JSON.stringify({ error: 'Bank account not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate bank account structure
    if (
      !bankAccount ||
      typeof bankAccount !== 'object' ||
      !('account_type' in bankAccount) ||
      !('account_number' in bankAccount)
    ) {
      return new Response(
        JSON.stringify({ error: 'Invalid bank account data' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const account = bankAccount as BankAccount;

    // Actualizar estado a "processing"
    await supabase
      .from('withdrawal_requests')
      .update({
        status: 'processing',
        processed_at: new Date().toISOString(),
      })
      .eq('id', withdrawal_request_id);

    // ========================================
    // LLAMADA A MERCADOPAGO MONEY OUT API
    // ========================================

    // Preparar datos para MercadoPago Money Out
    // Docs: https://www.mercadopago.com.ar/developers/es/reference/money_out/_money-requests/post
    const moneyOutPayload = {
      // Monto a transferir (sin comisión, ya fue descontada)
      amount: request.net_amount,
      currency_id: 'ARS', // MercadoPago Argentina solo soporta ARS

      // Descripción de la transferencia
      description: `Retiro AutoRenta - Solicitud ${withdrawal_request_id.substring(0, 8)}`,

      // Información del destinatario
      receiver: {
        // Tipo de identificación (DNI, CUIT, CUIL)
        identification: {
          type: account.account_holder_document.length > 8 ? 'CUIT' : 'DNI',
          number: account.account_holder_document,
        },

        // Nombre del titular
        first_name: account.account_holder_name.split(' ')[0],
        last_name: account.account_holder_name.split(' ').slice(1).join(' ') || account.account_holder_name,

        // Información bancaria
        account: {
          type: account.account_type.toUpperCase(), // CBU, CVU, ALIAS
          number: account.account_number,
        },
      },

      // Referencia externa (nuestro withdrawal_request_id)
      external_reference: withdrawal_request_id,

      // Notificación webhook (para confirmar transferencia)
      notification_url: `${SUPABASE_URL}/functions/v1/mercadopago-money-out-webhook`,
    };

    // Realizar llamada a MercadoPago Money Out API
    const mpResponse = await fetch('https://api.mercadopago.com/v1/money_requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cleanToken}`,
      },
      body: JSON.stringify(moneyOutPayload),
    });

    const mpData = await mpResponse.json();

    // VALIDACIÓN CRÍTICA: Rechazar transacciones simuladas/test
    if (mpData.test === true || mpData.simulated === true) {
      const errorMessage = 'Transfer rejected: This is a simulated/test transaction, not a real transfer';

      // Marcar retiro como fallido
      await supabase.rpc('wallet_fail_withdrawal', {
        p_request_id: withdrawal_request_id,
        p_failure_reason: errorMessage,
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage,
          details: 'MercadoPago returned a test/simulated transaction. This should not happen in production.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!mpResponse.ok) {
      // Error en la transferencia
      const errorMessage = mpData.message || mpData.error || 'Error al procesar transferencia con MercadoPago';

      console.error('MercadoPago Money Out error:', errorMessage);

      // Marcar retiro como fallido
      await supabase.rpc('wallet_fail_withdrawal', {
        p_request_id: withdrawal_request_id,
        p_failure_reason: `MercadoPago error: ${errorMessage}`,
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage,
          details: mpData,
        }),
        {
          status: mpResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ========================================
    // TRANSFERENCIA EXITOSA
    // ========================================

    // Completar retiro en la base de datos
    const { data: completeData, error: completeError } = await supabase.rpc('wallet_complete_withdrawal', {
      p_request_id: withdrawal_request_id,
      p_provider_transaction_id: mpData.id || mpData.transaction_id,
      p_provider_metadata: mpData,
    });

    if (completeError) {
      console.error('Error completing withdrawal:', completeError);

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Transfer successful but failed to update database',
          details: completeError,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const result = completeData[0];

    console.log('Withdrawal completed successfully:', result);

    // ========================================
    // NOTIFY N8N OF SUCCESSFUL TRANSFER
    // ========================================
    try {
      const n8nWebhookUrl = Deno.env.get('N8N_TRANSFER_WEBHOOK_URL') || 'http://host.docker.internal:5678/webhook/transfer-completed';

      // Get owner profile for notification
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone, notification_preferences')
        .eq('id', request.user_id)
        .single();

      const n8nPayload = {
        event_type: 'transfer_completed',
        timestamp: new Date().toISOString(),
        transfer: {
          id: result.wallet_transaction_id,
          provider_id: mpData.id || mpData.transaction_id,
          amount: request.net_amount,
          fee_amount: request.fee_amount,
          gross_amount: request.amount,
          currency: request.currency || 'ARS',
          status: 'completed',
        },
        owner: ownerProfile ? {
          id: ownerProfile.id,
          email: ownerProfile.email,
          full_name: ownerProfile.full_name,
          phone: ownerProfile.phone,
          notification_preferences: ownerProfile.notification_preferences,
        } : null,
        bank_account: {
          type: account.account_type,
          last_digits: account.account_number.slice(-4),
          holder_name: account.account_holder_name,
        },
        template_code: 'transfer_completed',
        channels: ['push', 'email'],
      };

      await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(n8nPayload),
      });

      console.log('[Money Out] n8n notified of successful transfer');
    } catch (n8nError) {
      // Log but don't fail the request - transfer was already successful
      console.warn('[Money Out] Failed to notify n8n:', n8nError);
    }

    // Retornar éxito
    return new Response(
      JSON.stringify({
        success: true,
        message: result.message,
        transaction_id: result.wallet_transaction_id,
        provider_transaction_id: mpData.id || mpData.transaction_id,
        amount_transferred: request.net_amount,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error processing Money Out:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
