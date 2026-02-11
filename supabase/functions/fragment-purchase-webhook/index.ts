/**
 * @fileoverview Edge Function: fragment-purchase-webhook
 *
 * Handles MercadoPago IPN notifications for fragment purchases.
 * Separated from the frozen mercadopago-webhook to avoid contamination.
 *
 * Flow:
 * 1. MercadoPago sends POST when payment status changes
 * 2. Validate HMAC signature (x-signature header)
 * 3. Fetch payment details from MP API
 * 4. Verify external_reference starts with "fragment_"
 * 5. On approved: call confirm_fragment_purchase() RPC
 * 6. On rejected: call fail_fragment_purchase() RPC
 *
 * Environment Variables:
 * - MERCADOPAGO_ACCESS_TOKEN
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { createChildLogger } from '../_shared/logger.ts';

const log = createChildLogger('FragmentPurchaseWebhook');

declare const Deno: any;

const MP_API_BASE = 'https://api.mercadopago.com/v1';

interface MPWebhookPayload {
  id: number;
  live_mode: boolean;
  type: string;
  date_created: string;
  action: string;
  data: { id: string };
}

/**
 * Constant-time hex comparison to prevent timing attacks.
 */
function timingSafeEqualHex(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a.length % 2 !== 0 || b.length % 2 !== 0) return false;
  if (a.length !== b.length) return false;

  const len = a.length / 2;
  const aBuf = new Uint8Array(len);
  const bBuf = new Uint8Array(len);

  for (let i = 0; i < len; i++) {
    aBuf[i] = parseInt(a.substr(i * 2, 2), 16) || 0;
    bBuf[i] = parseInt(b.substr(i * 2, 2), 16) || 0;
  }

  let result = 0;
  for (let i = 0; i < len; i++) {
    result |= aBuf[i] ^ bBuf[i];
  }
  return result === 0;
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ========================================
    // ENV SETUP
    // ========================================
    const rawToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!rawToken || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const MP_ACCESS_TOKEN = rawToken.trim().replace(/[\r\n\t\s]/g, '');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================
    // HMAC SIGNATURE VALIDATION
    // ========================================
    const xSignature = req.headers.get('x-signature');
    const xRequestId = req.headers.get('x-request-id');

    const rawBody = await req.text();
    let webhookPayload: MPWebhookPayload;

    try {
      webhookPayload = JSON.parse(rawBody);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log.info('Fragment webhook received', {
      type: webhookPayload.type,
      action: webhookPayload.action,
      paymentId: webhookPayload.data?.id,
      live_mode: webhookPayload.live_mode,
    });

    // Validate HMAC if present (required in production)
    if (xSignature && xRequestId) {
      const signatureParts: Record<string, string> = {};
      xSignature.split(',').forEach((part: string) => {
        const [key, value] = (part || '').split('=');
        if (key && value) {
          signatureParts[key.trim()] = value.trim();
        }
      });

      const ts = signatureParts['ts'];
      const hash = signatureParts['v1'];

      if (ts && hash) {
        const paymentId = webhookPayload.data?.id || '';
        const manifest = `id:${paymentId};request-id:${xRequestId};ts:${ts};`;

        const encoder = new TextEncoder();
        const keyData = encoder.encode(MP_ACCESS_TOKEN);

        try {
          const cryptoKey = await crypto.subtle.importKey(
            'raw', keyData,
            { name: 'HMAC', hash: 'SHA-256' },
            false, ['sign']
          );

          const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(manifest));
          const hashArray = Array.from(new Uint8Array(signature));
          const calculatedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toLowerCase();

          if (!timingSafeEqualHex(calculatedHash, (hash || '').toLowerCase())) {
            log.error('HMAC validation FAILED');
            return new Response(
              JSON.stringify({ error: 'Invalid webhook signature', code: 'INVALID_HMAC' }),
              { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          log.info('HMAC validation passed');
        } catch (cryptoError) {
          log.error('HMAC calculation error', cryptoError);
          return new Response(
            JSON.stringify({ error: 'Signature validation failed' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        log.error('Invalid x-signature format');
        return new Response(
          JSON.stringify({ error: 'Invalid signature format' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // In production, reject without HMAC
      const isProduction = Deno.env.get('ENVIRONMENT') === 'production' || !Deno.env.get('ENVIRONMENT');
      const allowTest = Deno.env.get('ALLOW_TEST_WEBHOOKS') === 'true';

      if (isProduction && !allowTest) {
        log.error('Missing HMAC headers');
        return new Response(
          JSON.stringify({ error: 'Missing x-signature or x-request-id' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      log.info('Test mode: allowing unsigned webhook');
    }

    // ========================================
    // ONLY PROCESS PAYMENT NOTIFICATIONS
    // ========================================
    if (webhookPayload.type !== 'payment') {
      log.info(`Ignoring webhook type: ${webhookPayload.type}`);
      return new Response(
        JSON.stringify({ success: true, message: 'Webhook type ignored' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================
    // FETCH PAYMENT FROM MP API
    // ========================================
    const paymentId = webhookPayload.data.id;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const mpResponse = await fetch(`${MP_API_BASE}/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!mpResponse.ok) {
      const errorData = await mpResponse.json().catch(() => ({}));
      log.error('MP API error fetching payment', { status: mpResponse.status, error: errorData });
      // Return 500 so MP retries
      return new Response(
        JSON.stringify({ error: 'Failed to fetch payment', retry: true }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paymentData = await mpResponse.json();

    log.info('Payment data fetched', {
      id: paymentData.id,
      status: paymentData.status,
      status_detail: paymentData.status_detail,
      amount: paymentData.transaction_amount,
      external_reference: paymentData.external_reference,
    });

    // ========================================
    // VERIFY THIS IS A FRAGMENT PURCHASE
    // ========================================
    const externalRef = paymentData.external_reference || '';
    if (!externalRef.startsWith('fragment_')) {
      log.info('Not a fragment purchase, ignoring', { external_reference: externalRef });
      return new Response(
        JSON.stringify({ success: true, message: 'Not a fragment purchase' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const purchaseId = externalRef.replace('fragment_', '');

    // ========================================
    // HANDLE APPROVED PAYMENT
    // ========================================
    if (paymentData.status === 'approved') {
      log.info('Processing approved fragment payment', { purchaseId, paymentId });

      const { data: result, error: confirmError } = await supabase.rpc(
        'confirm_fragment_purchase',
        {
          p_purchase_id: purchaseId,
          p_mp_payment_id: String(paymentData.id),
        }
      );

      if (confirmError) {
        log.error('confirm_fragment_purchase RPC failed', confirmError);
        // Return 500 so MP retries
        return new Response(
          JSON.stringify({ error: 'Confirmation failed', retry: true }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      log.info('Fragment purchase confirmed', result);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Fragment purchase confirmed',
          purchase_id: purchaseId,
          result,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================
    // HANDLE REJECTED PAYMENT
    // ========================================
    if (paymentData.status === 'rejected') {
      log.info('Processing rejected fragment payment', { purchaseId, paymentId });

      const { error: failError } = await supabase.rpc(
        'fail_fragment_purchase',
        {
          p_purchase_id: purchaseId,
          p_reason: paymentData.status_detail || 'payment_rejected',
        }
      );

      if (failError) {
        log.error('fail_fragment_purchase RPC failed', failError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Fragment payment rejection processed',
          purchase_id: purchaseId,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================
    // HANDLE OTHER STATUSES (pending, in_process, etc.)
    // ========================================
    log.info(`Fragment payment status: ${paymentData.status}`, { purchaseId });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Payment status: ${paymentData.status}`,
        purchase_id: purchaseId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    log.error('Critical error in fragment webhook', error);

    // Return 500 so MercadoPago retries
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        retry: true,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
