import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MercadoPagoWebhookData {
  id: string;
  live_mode: boolean;
  type: string;
  date_created: string;
  application_id: number;
  user_id: number;
  version: number;
  api_version: string;
  action: string;
  data: {
    id: string;
  };
}

interface MercadoPagoPaymentData {
  id: string;
  status: string;
  status_detail: string;
  external_reference: string;
  transaction_amount: number;
  currency_id: string;
  date_created: string;
  date_approved?: string;
  date_last_updated: string;
  payment_method_id: string;
  payment_type_id: string;
  payer: {
    id: string;
    email: string;
    identification: {
      type: string;
      number: string;
    };
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get query parameters
    const url = new URL(req.url);
    const topic = url.searchParams.get('topic');
    const id = url.searchParams.get('id');

    console.log(`Webhook received - Topic: ${topic}, ID: ${id}`);

    // Validate required parameters
    if (!topic || !id) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing parameters', 
          message: 'topic and id are required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get MercadoPago access token
    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!accessToken) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN not configured');
    }

    const cleanToken = accessToken.trim();

    // Handle different webhook topics
    if (topic === 'payment') {
      await handlePaymentWebhook(supabase, cleanToken, id);
    } else if (topic === 'money_request') {
      await handleMoneyRequestWebhook(supabase, cleanToken, id);
    } else {
      console.log(`Unhandled webhook topic: ${topic}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook processed successfully' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error processing webhook:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

/**
 * Handle payment webhook (deposits)
 */
async function handlePaymentWebhook(supabase: any, accessToken: string, paymentId: string) {
  try {
    // Get payment details from MercadoPago
    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!paymentResponse.ok) {
      throw new Error(`Failed to fetch payment details: ${paymentResponse.status}`);
    }

    const paymentData: MercadoPagoPaymentData = await paymentResponse.json();
    
    console.log('Payment data received:', {
      id: paymentData.id,
      status: paymentData.status,
      external_reference: paymentData.external_reference,
      amount: paymentData.transaction_amount,
    });

    // Extract transaction ID from external_reference
    const transactionId = paymentData.external_reference;
    if (!transactionId) {
      throw new Error('No external_reference found in payment');
    }

    // Determine if payment was successful
    const isApproved = paymentData.status === 'approved';
    const isPending = paymentData.status === 'pending';
    const isRejected = paymentData.status === 'rejected' || paymentData.status === 'cancelled';

    if (isApproved) {
      // Confirm deposit in database
      const { data, error } = await supabase.rpc('wallet_confirm_deposit', {
        p_transaction_id: transactionId,
        p_provider_transaction_id: paymentData.id,
        p_provider_metadata: {
          payment_method: paymentData.payment_method_id,
          payment_type: paymentData.payment_type_id,
          payer_email: paymentData.payer.email,
          payer_document: paymentData.payer.identification.number,
          currency: paymentData.currency_id,
          amount: paymentData.transaction_amount,
          date_approved: paymentData.date_approved,
        },
      });

      if (error) {
        console.error('Error confirming deposit:', error);
        throw error;
      }

      console.log(`Deposit confirmed for transaction ${transactionId}:`, data);
    } else if (isRejected) {
      // Mark transaction as failed
      const { error } = await supabase
        .from('wallet_transactions')
        .update({
          status: 'failed',
          provider_transaction_id: paymentData.id,
          provider_metadata: {
            payment_method: paymentData.payment_method_id,
            payment_type: paymentData.payment_type_id,
            status_detail: paymentData.status_detail,
            rejection_reason: paymentData.status_detail,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', transactionId);

      if (error) {
        console.error('Error updating failed transaction:', error);
        throw error;
      }

      console.log(`Transaction ${transactionId} marked as failed`);
    } else if (isPending) {
      // Keep transaction as pending
      console.log(`Transaction ${transactionId} is still pending`);
    }

  } catch (error) {
    console.error('Error in handlePaymentWebhook:', error);
    throw error;
  }
}

/**
 * Handle money request webhook (withdrawals)
 */
async function handleMoneyRequestWebhook(supabase: any, accessToken: string, moneyRequestId: string) {
  try {
    // Get money request details from MercadoPago
    const moneyRequestResponse = await fetch(`https://api.mercadopago.com/v1/money_requests/${moneyRequestId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!moneyRequestResponse.ok) {
      throw new Error(`Failed to fetch money request details: ${moneyRequestResponse.status}`);
    }

    const moneyRequestData = await moneyRequestResponse.json();
    
    console.log('Money request data received:', {
      id: moneyRequestData.id,
      status: moneyRequestData.status,
      amount: moneyRequestData.amount,
    });

    // Find withdrawal request by provider_transaction_id
    const { data: withdrawalRequests, error: fetchError } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('provider_transaction_id', moneyRequestId);

    if (fetchError) {
      console.error('Error fetching withdrawal request:', fetchError);
      throw fetchError;
    }

    if (!withdrawalRequests || withdrawalRequests.length === 0) {
      console.log(`No withdrawal request found for money request ${moneyRequestId}`);
      return;
    }

    const withdrawalRequest = withdrawalRequests[0];

    // Update withdrawal request status based on money request status
    let newStatus = 'processing';
    if (moneyRequestData.status === 'completed') {
      newStatus = 'completed';
    } else if (moneyRequestData.status === 'rejected' || moneyRequestData.status === 'cancelled') {
      newStatus = 'failed';
    }

    const { error: updateError } = await supabase
      .from('withdrawal_requests')
      .update({
        status: newStatus,
        provider_metadata: moneyRequestData,
        updated_at: new Date().toISOString(),
        ...(newStatus === 'completed' && { completed_at: new Date().toISOString() }),
        ...(newStatus === 'failed' && { 
          failed_at: new Date().toISOString(),
          failure_reason: moneyRequestData.status_detail || 'Transfer failed',
        }),
      })
      .eq('id', withdrawalRequest.id);

    if (updateError) {
      console.error('Error updating withdrawal request:', updateError);
      throw updateError;
    }

    // If completed, complete the withdrawal in wallet
    if (newStatus === 'completed') {
      const { error: completeError } = await supabase.rpc('wallet_complete_withdrawal', {
        p_request_id: withdrawalRequest.id,
      });

      if (completeError) {
        console.error('Error completing withdrawal:', completeError);
        throw completeError;
      }

      console.log(`Withdrawal ${withdrawalRequest.id} completed successfully`);
    }

  } catch (error) {
    console.error('Error in handleMoneyRequestWebhook:', error);
    throw error;
  }
}