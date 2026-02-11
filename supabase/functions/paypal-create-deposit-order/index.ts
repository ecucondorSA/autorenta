/**
 * PayPal Create Deposit Order Edge Function
 * Creates a PayPal order for wallet deposits
 *
 * Endpoints:
 * - POST /paypal-create-deposit-order
 *
 * Request Body:
 * {
 *   "amount_usd": number,  // Amount in USD to deposit
 *   "transaction_id": "uuid"  // Wallet transaction ID
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "order_id": "PayPal order ID",
 *   "approval_url": "URL for user to approve payment"
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders } from '../_shared/cors.ts';
import {
  PayPalConfig,
  getPayPalAccessToken,
  createPayPalOrder,
  getApprovalUrl,
  PayPalOrderRequest,
  PayPalAPIError,
} from '../_shared/paypal-api.ts';

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ========================================================================
    // 1. AUTHENTICATION & VALIDATION
    // ========================================================================

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Parse request body
    const { amount_usd, transaction_id } = await req.json();

    if (!amount_usd || !transaction_id) {
      throw new Error('amount_usd and transaction_id are required');
    }

    if (amount_usd <= 0) {
      throw new Error('amount_usd must be greater than 0');
    }

    console.log(`Creating PayPal deposit order for user ${user.id}, amount: ${amount_usd} USD`);

    // ========================================================================
    // 2. GET PAYPAL CONFIGURATION
    // ========================================================================

    const paypalClientId = Deno.env.get('PAYPAL_CLIENT_ID');
    const paypalSecret = Deno.env.get('PAYPAL_SECRET');
    const paypalEnv = (Deno.env.get('PAYPAL_ENV') || 'sandbox') as 'sandbox' | 'live';
    const paypalBnCode = Deno.env.get('PAYPAL_PARTNER_ATTRIBUTION_ID');

    if (!paypalClientId || !paypalSecret) {
      throw new Error('PayPal credentials not configured');
    }

    const paypalConfig: PayPalConfig = {
      clientId: paypalClientId,
      clientSecret: paypalSecret,
      environment: paypalEnv,
      partnerAttributionId: paypalBnCode,
    };

    // ========================================================================
    // 3. VERIFY WALLET TRANSACTION
    // ========================================================================

    const { data: transaction, error: txError } = await supabase
      .from('wallet_transactions')
      .select('id, user_id, amount, status, provider')
      .eq('id', transaction_id)
      .single();

    if (txError || !transaction) {
      throw new Error('Wallet transaction not found');
    }

    if (transaction.user_id !== user.id) {
      throw new Error('Unauthorized: Transaction does not belong to you');
    }

    if (transaction.status !== 'pending') {
      throw new Error(`Transaction is not pending (status: ${transaction.status})`);
    }

    console.log('Transaction verified:', {
      transaction_id: transaction.id,
      amount: transaction.amount,
      status: transaction.status,
    });

    // ========================================================================
    // 4. GET PAYPAL ACCESS TOKEN
    // ========================================================================

    const accessToken = await getPayPalAccessToken(paypalConfig);

    // ========================================================================
    // 5. BUILD PAYPAL ORDER REQUEST
    // ========================================================================

    const returnUrl = Deno.env.get('PAYPAL_RETURN_URL') || `${supabaseUrl}/wallet/deposit/success`;
    const cancelUrl = Deno.env.get('PAYPAL_CANCEL_URL') || `${supabaseUrl}/wallet/deposit/cancel`;

    const amountFormatted = amount_usd.toFixed(2);

    const orderRequest: PayPalOrderRequest = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: transaction_id,
          custom_id: `wallet_deposit_${transaction_id}`,
          description: `AutoRenta wallet deposit - $${amountFormatted} USD`,
          soft_descriptor: 'AutoRenta Wallet',
          amount: {
            currency_code: 'USD',
            value: amountFormatted,
          },
          items: [
            {
              name: 'Wallet Deposit',
              description: 'Add funds to AutoRenta wallet',
              unit_amount: {
                currency_code: 'USD',
                value: amountFormatted,
              },
              quantity: '1',
              category: 'DIGITAL_GOODS',
            },
          ],
        },
      ],
      application_context: {
        brand_name: 'AutoRenta',
        return_url: returnUrl,
        cancel_url: cancelUrl,
        user_action: 'PAY_NOW',
      },
    };

    // ========================================================================
    // 6. CREATE PAYPAL ORDER
    // ========================================================================

    const idempotencyKey = `wallet_deposit_${transaction_id}_${Date.now()}`;
    const order = await createPayPalOrder(paypalConfig, accessToken, orderRequest, idempotencyKey);

    console.log('PayPal order created:', {
      order_id: order.id,
      status: order.status,
    });

    // ========================================================================
    // 7. UPDATE WALLET TRANSACTION WITH PAYPAL ORDER INFO
    // ========================================================================

    const approvalUrl = getApprovalUrl(order);

    const { error: updateError } = await supabase
      .from('wallet_transactions')
      .update({
        provider: 'paypal',
        provider_transaction_id: order.id,
        metadata: {
          paypal_order_id: order.id,
          approval_url: approvalUrl,
          amount_usd: parseFloat(amountFormatted),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', transaction_id);

    if (updateError) {
      console.error('Failed to update wallet transaction:', updateError);
      // Don't throw - order was already created
    }

    // ========================================================================
    // 8. CREATE PAYMENT INTENT RECORD
    // ========================================================================

    const { error: intentError } = await supabase
      .from('payment_intents')
      .insert({
        user_id: user.id,
        intent_type: 'deposit',
        provider: 'paypal',
        paypal_order_id: order.id,
        provider_payment_id: order.id,
        provider_status: order.status,
        amount_usd: parseFloat(amountFormatted),
        status: 'pending',
        metadata: {
          wallet_transaction_id: transaction_id,
          deposit_type: 'wallet',
        },
      });

    if (intentError) {
      console.error('Failed to create payment intent:', intentError);
      // Don't throw - order was already created
    }

    // ========================================================================
    // 9. RETURN SUCCESS RESPONSE
    // ========================================================================

    return new Response(
      JSON.stringify({
        success: true,
        order_id: order.id,
        approval_url: approvalUrl,
        status: order.status,
        amount_usd: amountFormatted,
        transaction_id: transaction_id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error creating PayPal deposit order:', error);

    const statusCode = error instanceof PayPalAPIError ? error.statusCode : 500;

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Deposit order creation failed',
      }),
      {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
