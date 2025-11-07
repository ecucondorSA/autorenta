/**
 * Supabase Edge Function: mercadopago-webhook
 *
 * Maneja las notificaciones IPN (Instant Payment Notification) de Mercado Pago.
 * MIGRADO A SDK OFICIAL DE MERCADOPAGO
 *
 * Flujo del Webhook:
 * 1. Mercado Pago envía notificación POST cuando cambia estado del pago
 * 2. Esta función valida y procesa la notificación
 * 3. Consulta API de MP usando SDK oficial para obtener detalles del pago
 * 4. Actualiza la transacción en DB con wallet_confirm_deposit()
 * 5. Acredita fondos al wallet del usuario
 *
 * Tipos de Notificación MP:
 * - payment: Pago creado/actualizado
 * - plan: Plan de suscripción
 * - subscription: Suscripción
 * - invoice: Factura
 * - point_integration_wh: Integración de puntos
 *
 * Estados de Pago MP:
 * - approved: Aprobado (acreditar fondos)
 * - pending: Pendiente
 * - in_process: En proceso
 * - rejected: Rechazado
 * - cancelled: Cancelado
 * - refunded: Reembolsado
 * - charged_back: Contracargo
 *
 * Environment Variables Required:
 * - MERCADOPAGO_ACCESS_TOKEN: Access token de Mercado Pago
 * - SUPABASE_URL: URL del proyecto Supabase
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key de Supabase
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createChildLogger } from '../_shared/logger.ts';

// Logger con contexto fijo
const log = createChildLogger('MercadoPagoWebhook');

// Tipos de Mercado Pago
interface MPWebhookPayload {
  id: number;
  live_mode: boolean;
  type: string;
  date_created: string;
  user_id: number;
  api_version: string;
  action: string;
  data: {
    id: string;
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// IPs autorizadas de MercadoPago (rangos CIDR)
// Fuente: https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/ipn
const MERCADOPAGO_IP_RANGES = [
  // Rango 1: 209.225.49.0/24
  { start: ipToNumber('209.225.49.0'), end: ipToNumber('209.225.49.255') },
  // Rango 2: 216.33.197.0/24
  { start: ipToNumber('216.33.197.0'), end: ipToNumber('216.33.197.255') },
  // Rango 3: 216.33.196.0/24
  { start: ipToNumber('216.33.196.0'), end: ipToNumber('216.33.196.255') },
];

// Rate limiting: Map<IP, {count: number, resetAt: number}>
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// Configuración de rate limiting
const RATE_LIMIT_MAX_REQUESTS = 100; // Máximo 100 requests
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // Por minuto

/**
 * Convierte una IP a número para comparación
 */
function ipToNumber(ip: string): number {
  const parts = ip.split('.').map(Number);
  return parts[0] * 256 ** 3 + parts[1] * 256 ** 2 + parts[2] * 256 + parts[3];
}

/**
 * Verifica si una IP está en los rangos permitidos de MercadoPago
 */
function isMercadoPagoIP(clientIP: string): boolean {
  // Si no hay IP en headers (proxy), permitir (HMAC validará)
  if (!clientIP) {
    return true; // Dejar que HMAC valide
  }

  // Extraer IP del header (puede venir como "IP, IP, IP" desde proxy)
  const ip = clientIP.split(',')[0].trim();
  const ipNum = ipToNumber(ip);

  // Verificar si está en algún rango
  return MERCADOPAGO_IP_RANGES.some(range => ipNum >= range.start && ipNum <= range.end);
}

/**
 * Verifica rate limiting por IP
 */
function checkRateLimit(clientIP: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const key = clientIP || 'unknown';

  const limit = rateLimitMap.get(key);

  if (!limit || now > limit.resetAt) {
    // Reset o primera request
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
  }

  if (limit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetAt: limit.resetAt };
  }

  // Incrementar contador
  limit.count++;
  rateLimitMap.set(key, limit);
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - limit.count, resetAt: limit.resetAt };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verificar variables de entorno
    const rawToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!rawToken || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const MP_ACCESS_TOKEN = rawToken.trim().replace(/[\r\n\t\s]/g, '');

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

    // ========================================
    // VALIDACIÓN DE IP DE MERCADOPAGO
    // Verificar que el request viene de IPs autorizadas
    // ========================================
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '';
    const isAuthorizedIP = isMercadoPagoIP(clientIP);

    // En producción, rechazar IPs no autorizadas
    // (en desarrollo, permitir si HMAC es válido)
    const isProduction = Deno.env.get('ENVIRONMENT') === 'production' || !Deno.env.get('ENVIRONMENT');
    
    if (!isAuthorizedIP && isProduction) {
      log.warn('Unauthorized IP attempt', {
        ip: clientIP,
        userAgent: req.headers.get('user-agent'),
      });

      return new Response(
        JSON.stringify({
          error: 'Unauthorized IP address',
          code: 'IP_NOT_ALLOWED',
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ========================================
    // RATE LIMITING
    // Prevenir DDoS limitando requests por IP
    // ========================================
    const rateLimit = checkRateLimit(clientIP);

    if (!rateLimit.allowed) {
      log.warn('Rate limit exceeded', {
        ip: clientIP,
        resetAt: new Date(rateLimit.resetAt).toISOString(),
      });

      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          retry_after: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': String(RATE_LIMIT_MAX_REQUESTS),
            'X-RateLimit-Remaining': String(rateLimit.remaining),
            'X-RateLimit-Reset': String(rateLimit.resetAt),
            'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
          },
        }
      );
    }

    // Agregar headers de rate limit a todas las respuestas
    const rateLimitHeaders = {
      'X-RateLimit-Limit': String(RATE_LIMIT_MAX_REQUESTS),
      'X-RateLimit-Remaining': String(rateLimit.remaining),
      'X-RateLimit-Reset': String(rateLimit.resetAt),
    };

    // ========================================
    // VALIDACIÓN DE FIRMA HMAC (CRÍTICA)
    // Verificar que el webhook proviene realmente de MercadoPago
    // ========================================

    const xSignature = req.headers.get('x-signature');
    const xRequestId = req.headers.get('x-request-id');

    log.info('Webhook validation', {
      ip: clientIP,
      isAuthorizedIP,
      hasSignature: !!xSignature,
      rateLimitRemaining: rateLimit.remaining,
    });

    // Obtener query params para validación
    const url = new URL(req.url);
    const dataId = url.searchParams.get('data.id');
    const webhookType = url.searchParams.get('type');

    // Leer body raw (necesario para HMAC)
    const rawBody = await req.text();
    let webhookPayload: MPWebhookPayload;

    try {
      webhookPayload = JSON.parse(rawBody);
    } catch (e) {
      log.error('Invalid JSON in webhook payload', e);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ✅ SECURITY: Log sin exponer datos sensibles completos
    log.info('MercadoPago Webhook received', {
      type: webhookPayload.type,
      action: webhookPayload.action,
      paymentId: webhookPayload.data?.id,
      live_mode: webhookPayload.live_mode,
    });

    // ========================================
    // VALIDAR FIRMA HMAC (si está presente)
    // ========================================
    if (xSignature && xRequestId) {
      // Extraer ts y v1 de x-signature
      // Formato: "ts=1704900000,v1=abc123def456..."
      const signatureParts: Record<string, string> = {};

      xSignature.split(',').forEach(part => {
        const [key, value] = part.split('=');
        if (key && value) {
          signatureParts[key.trim()] = value.trim();
        }
      });

      const ts = signatureParts['ts'];
      const hash = signatureParts['v1'];

      if (ts && hash) {
        // Construir mensaje para HMAC
        // Formato: data.id + x-request-id + ts
        const paymentId = webhookPayload.data?.id || dataId || '';
        const manifest = `id:${paymentId};request-id:${xRequestId};ts:${ts};`;

        log.info('HMAC validation', {
          manifest,
          ts,
          hash_received: hash.substring(0, 20) + '...',
        });

        // Calcular HMAC-SHA256
        const encoder = new TextEncoder();
        const keyData = encoder.encode(MP_ACCESS_TOKEN);

        try {
          const cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
          );

          const signature = await crypto.subtle.sign(
            'HMAC',
            cryptoKey,
            encoder.encode(manifest)
          );

          // Convertir a hex
          const hashArray = Array.from(new Uint8Array(signature));
          const calculatedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

          log.info('HMAC calculated', { hash: calculatedHash.substring(0, 20) + '...' });

          // Comparar hashes
          if (calculatedHash !== hash) {
            log.error('HMAC validation FAILED', {
              expected: hash.substring(0, 20) + '...',
              calculated: calculatedHash.substring(0, 20) + '...',
            });

            // ✅ ACTIVADO EN PRODUCCIÓN - Rechazar webhook con firma inválida
            return new Response(
              JSON.stringify({
                error: 'Invalid webhook signature',
                code: 'INVALID_HMAC',
              }),
              {
                status: 403,
                headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
              }
            );
          } else {
            log.info('HMAC validation passed');
          }
        } catch (cryptoError) {
          log.error('Error calculating HMAC', cryptoError);
          // No fallar por errores de crypto, solo loggear
        }
      } else {
        log.warn('x-signature present but missing ts or v1 parts');
      }
    } else {
      log.warn('No x-signature header - webhook signature not validated');
      // En producción deberíamos rechazar, por ahora solo loggeamos
    }

    // Solo procesar notificaciones de tipo 'payment'
    if (webhookPayload.type !== 'payment') {
      log.info('Ignoring webhook type', { type: webhookPayload.type });
      return new Response(
        JSON.stringify({ success: true, message: 'Webhook type ignored' }),
        {
          status: 200,
          headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ========================================
    // LLAMADA DIRECTA A MERCADOPAGO REST API
    // FIX: SDK tiene bug con Deno (f.headers.raw is not a function)
    // ========================================

    const paymentId = webhookPayload.data.id;
    log.info('Fetching payment using MercadoPago REST API', { paymentId });

    // Llamar directamente a la REST API (sin SDK)
    let paymentData;
    try {
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });

      if (!mpResponse.ok) {
        const errorText = await mpResponse.text();
        log.error('MercadoPago API Error', {
          status: mpResponse.status,
          statusText: mpResponse.statusText,
          body: errorText,
        });

        // Si MP API está caída (500, 502, 503)
        if (mpResponse.status >= 500) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'MercadoPago API temporarily unavailable',
              retry_after: 300,
              payment_id: paymentId,
            }),
            {
              status: 503,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
                'Retry-After': '300',
              },
            }
          );
        }

        // Payment not found o unauthorized
        throw new Error(`MercadoPago API error: ${mpResponse.status} ${errorText}`);
      }

      paymentData = await mpResponse.json();

      // Validar que la respuesta contiene datos válidos
      if (!paymentData || !paymentData.id) {
        log.error('Invalid payment data received from MercadoPago API', { paymentData });
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Invalid payment data from MercadoPago API',
            payment_id: paymentId,
          }),
          {
            status: 502,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // ✅ SECURITY: Log sin exponer datos sensibles completos
      log.info('Payment Data from REST API', {
        id: paymentData.id,
        status: paymentData.status,
        status_detail: paymentData.status_detail,
        transaction_amount: paymentData.transaction_amount,
        currency_id: paymentData.currency_id,
        payment_method_id: paymentData.payment_method_id,
        operation_type: paymentData.operation_type,
      });

    } catch (apiError) {
      log.error('MercadoPago API error', apiError);

      // Retornar 200 OK para evitar reintentos infinitos
      // El polling backup confirmará el pago de todas formas
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Error fetching payment, will be processed by polling',
            payment_id: paymentId,
            error_details: apiError instanceof Error ? apiError.message : 'Unknown error',
          }),
          {
            status: 200,
            headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
          }
        );
    }

    // ========================================
    // MANEJAR PREAUTORIZACIONES (AUTHORIZED STATUS)
    // ========================================

    // Crear cliente de Supabase (necesario para todas las operaciones)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Check if this is a preauthorization (status: authorized)
    if (paymentData.status === 'authorized') {
      log.info('Processing preauthorization (hold) webhook');

      // Find payment intent by mp_payment_id
      const { data: intent, error: intentError } = await supabase
        .from('payment_intents')
        .select('*')
        .eq('mp_payment_id', paymentId)
        .single();

      if (intentError || !intent) {
        log.info('No payment intent found for authorized payment', { paymentId });
        // This might be a regular authorized payment, not a preauth
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Preauth webhook received but no intent found',
            status: paymentData.status,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Update payment intent with authorized status
      const { error: updateError } = await supabase.rpc('update_payment_intent_status', {
        p_mp_payment_id: paymentId,
        p_mp_status: paymentData.status,
        p_mp_status_detail: paymentData.status_detail,
        p_payment_method_id: paymentData.payment_method_id,
        p_card_last4: paymentData.card?.last_four_digits,
        p_metadata: {
          webhook_received_at: new Date().toISOString(),
          mp_payment_data: paymentData,
        },
      });

      if (updateError) {
        log.error('Error updating preauth intent', updateError);
      } else {
        log.info('Preauthorization updated successfully');
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Preauthorization webhook processed',
          intent_id: intent.id,
          status: 'authorized',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ========================================
    // MANEJAR CAPTURAS DE PREAUTH (APPROVED AFTER AUTHORIZED)
    // ========================================

    // Check if this is a captured preauth (status changed from authorized to approved)
    const { data: capturedIntent, error: capturedIntentError } = await supabase
      .from('payment_intents')
      .select('*')
      .eq('mp_payment_id', paymentId)
      .eq('status', 'authorized')
      .single();

    if (!capturedIntentError && capturedIntent && paymentData.status === 'approved') {
      log.info('Processing preauth capture webhook');

      // Update payment intent to captured
      const { error: updateError } = await supabase.rpc('update_payment_intent_status', {
        p_mp_payment_id: paymentId,
        p_mp_status: 'approved',
        p_mp_status_detail: paymentData.status_detail,
        p_metadata: {
          captured_via_webhook: true,
          webhook_received_at: new Date().toISOString(),
          mp_payment_data: paymentData,
        },
      });

      if (updateError) {
        log.error('Error updating captured preauth', updateError);
      }

      // Call capture_preauth RPC to handle ledger entries
      if (capturedIntent.booking_id) {
        const { error: captureError } = await supabase.rpc('capture_preauth', {
          p_intent_id: capturedIntent.id,
          p_booking_id: capturedIntent.booking_id,
        });

        if (captureError) {
          log.error('Error processing capture ledger', captureError);
        } else {
          log.info('Preauth captured and ledger updated');
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Preauth capture webhook processed',
          intent_id: capturedIntent.id,
          status: 'captured',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ========================================
    // MANEJAR CANCELACIONES DE PREAUTH
    // ========================================

    if (paymentData.status === 'cancelled') {
      log.info('Processing preauth cancellation webhook');

      // Find payment intent by mp_payment_id
      const { data: cancelledIntent, error: cancelledIntentError } = await supabase
        .from('payment_intents')
        .select('*')
        .eq('mp_payment_id', paymentId)
        .single();

      if (!cancelledIntentError && cancelledIntent) {
        // Update payment intent to cancelled
        const { error: updateError } = await supabase.rpc('update_payment_intent_status', {
          p_mp_payment_id: paymentId,
          p_mp_status: 'cancelled',
          p_mp_status_detail: paymentData.status_detail,
          p_metadata: {
            cancelled_via_webhook: true,
            webhook_received_at: new Date().toISOString(),
            mp_payment_data: paymentData,
          },
        });

        if (updateError) {
          log.error('Error updating cancelled preauth', updateError);
        }

        // Call cancel_preauth RPC to release any locked funds
        const { error: cancelError } = await supabase.rpc('cancel_preauth', {
          p_intent_id: cancelledIntent.id,
        });

        if (cancelError) {
          log.error('Error processing cancellation', cancelError);
        } else {
          log.info('Preauth cancelled successfully');
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Preauth cancellation webhook processed',
            intent_id: cancelledIntent.id,
            status: 'cancelled',
          }),
          {
            status: 200,
            headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // ========================================
    // MANEJAR PAGOS REGULARES (NO PREAUTH)
    // ========================================

    // Verificar que el pago esté aprobado
    if (paymentData.status !== 'approved') {
      log.info('Payment not approved', { status: paymentData.status });
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Payment not approved yet',
          status: paymentData.status,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Obtener reference del external_reference (puede ser booking_id o transaction_id)
    const reference_id = paymentData.external_reference;

    if (!reference_id) {
      log.error('Missing external_reference in payment data');
      throw new Error('Missing external_reference');
    }

    // ========================================
    // DETERMINAR TIPO DE PAGO: BOOKING O WALLET DEPOSIT
    // ========================================

    // Primero verificar si es un booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', reference_id)
      .single();

    // Si es un booking, procesar pago de booking
    if (booking && !bookingError) {
      log.info('Processing booking payment', { bookingId: reference_id });

      // Verificar que el booking esté pendiente de pago
      if (booking.status !== 'pending') {
        log.info('Booking is not pending, ignoring webhook', { status: booking.status });
        return new Response(
          JSON.stringify({ success: true, message: 'Booking already processed' }),
          {
            status: 200,
            headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // ========================================
      // MANEJAR MARKETPLACE SPLIT SI APLICA
      // ========================================

      const metadata = paymentData.metadata || {};
      const isMarketplaceSplit = metadata.is_marketplace_split === 'true' || metadata.is_marketplace_split === true;

      // Variables para tracking de validación (scope compartido)
      let validationPassed = true;
      const validationIssues: Array<{type: string; [key: string]: any}> = [];

      if (isMarketplaceSplit) {
        log.info('Processing marketplace split payment');

        // ========================================
        // VALIDACIÓN DE SPLIT (Paso 4)
        // ========================================

        // 1. Obtener collector_id esperado del dueño del auto
        const { data: car, error: carError } = await supabase
          .from('cars')
          .select('owner_id, profiles!cars_owner_id_fkey(mercadopago_collector_id)')
          .eq('id', booking.car_id)
          .single();

        if (carError || !car) {
          log.error('Error fetching car owner info', carError);
        }

        const expectedCollectorId = car?.profiles?.mercadopago_collector_id;
        const receivedCollectorId = paymentData.collector_id?.toString();

        // 2. Validar que el collector_id coincida

        if (expectedCollectorId && receivedCollectorId !== expectedCollectorId) {
          log.error('Split payment error: wrong collector', {
            expected: expectedCollectorId,
            received: receivedCollectorId,
            booking_id: reference_id,
            payment_id: paymentData.id
          });

          validationPassed = false;
          validationIssues.push({
            type: 'split_collector_mismatch',
            expected: expectedCollectorId,
            received: receivedCollectorId
          });

          // Insertar en payment_issues
          await supabase.from('payment_issues').insert({
            booking_id: reference_id,
            payment_id: paymentData.id.toString(),
            issue_type: 'split_collector_mismatch',
            details: {
              expected_collector_id: expectedCollectorId,
              received_collector_id: receivedCollectorId,
              payment_data: {
                amount: paymentData.transaction_amount,
                currency: paymentData.currency_id,
                status: paymentData.status
              }
            }
          });
        }

        // 3. Validar montos del split
        const totalAmount = paymentData.transaction_amount;
        const marketplaceFee = paymentData.marketplace_fee || 0;
        const expectedPlatformFee = parseFloat(metadata.platform_fee_ars || '0');
        const expectedOwnerAmount = parseFloat(metadata.owner_amount_ars || '0');

        // Validar que los montos sumen correctamente
        const calculatedTotal = expectedOwnerAmount + expectedPlatformFee;
        const amountDifference = Math.abs(calculatedTotal - totalAmount);

        if (amountDifference > 0.01) { // Tolerar diferencia de 1 centavo por redondeo
          log.error('Split amount validation failed', {
            total: totalAmount,
            calculated: calculatedTotal,
            difference: amountDifference,
            owner: expectedOwnerAmount,
            platform: expectedPlatformFee
          });

          validationPassed = false;
          validationIssues.push({
            type: 'split_amount_mismatch',
            total: totalAmount,
            calculated: calculatedTotal,
            difference: amountDifference
          });

          // Insertar en payment_issues
          await supabase.from('payment_issues').insert({
            booking_id: reference_id,
            payment_id: paymentData.id.toString(),
            issue_type: 'split_amount_mismatch',
            details: {
              total_amount: totalAmount,
              calculated_total: calculatedTotal,
              difference: amountDifference,
              owner_amount: expectedOwnerAmount,
              platform_fee: expectedPlatformFee,
              marketplace_fee: marketplaceFee
            }
          });
        }

        // 4. Validar que marketplace_fee coincida con expected
        if (marketplaceFee !== expectedPlatformFee) {
          log.warn('Marketplace fee mismatch (non-critical)', {
            expected: expectedPlatformFee,
            received: marketplaceFee
          });
        }

        // 5. Log de validación exitosa o fallida
        if (validationPassed) {
          log.info('Split validation passed', {
            total: totalAmount,
            owner: expectedOwnerAmount,
            platform: expectedPlatformFee,
            collector_id: receivedCollectorId
          });
        } else {
          log.error('Split validation failed', { validationIssues });
        }

        // Registrar split en BD
        const { error: splitError } = await supabase.rpc('register_payment_split', {
          p_booking_id: reference_id,
          p_mp_payment_id: paymentData.id.toString(),
          p_total_amount_cents: Math.round(paymentData.transaction_amount * 100),
          p_currency: paymentData.currency_id
        });

        if (splitError) {
          log.error('Error registering payment split', splitError);
          // No fallar el webhook, solo logear
        } else {
          log.info('Payment split registered successfully');
        }
      }

      // Actualizar booking a confirmado
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          status: 'confirmed',
          paid_at: new Date().toISOString(),
          payment_method: 'credit_card',
          payment_split_completed: isMarketplaceSplit,
          payment_split_validated_at: isMarketplaceSplit
            ? new Date().toISOString()
            : null,
          owner_payment_amount: isMarketplaceSplit
            ? parseFloat(metadata.owner_amount_ars || '0')
            : null,
          platform_fee: isMarketplaceSplit
            ? parseFloat(metadata.platform_fee_ars || '0')
            : null,
          metadata: {
            ...(booking.metadata || {}),
            mercadopago_payment_id: paymentData.id,
            mercadopago_status: paymentData.status,
            mercadopago_payment_method: paymentData.payment_method_id,
            mercadopago_amount: paymentData.transaction_amount,
            mercadopago_currency: paymentData.currency_id,
            mercadopago_approved_at: paymentData.date_approved,
            is_marketplace_split: isMarketplaceSplit,
            collector_id: metadata.collector_id || null,
            split_validation_passed: isMarketplaceSplit ? validationPassed : null,
            split_validation_issues: isMarketplaceSplit && !validationPassed
              ? validationIssues
              : null,
          },
        })
        .eq('id', reference_id);

      if (updateError) {
        log.error('Error updating booking', updateError);
        throw updateError;
      }

      log.info('Booking payment confirmed successfully', { bookingId: reference_id });

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Booking payment processed successfully',
            booking_id: reference_id,
            payment_id: paymentData.id,
            marketplace_split: isMarketplaceSplit,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
          }
        );
    }

    // Si no es un booking, verificar si es un wallet deposit
    const { data: transaction, error: txError } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('id', reference_id)
      .eq('type', 'deposit')
      .single();

    if (txError || !transaction) {
      log.error('Neither booking nor wallet transaction found', { referenceId: reference_id });
      throw new Error('Reference not found - not a booking or wallet deposit');
    }

    log.info('Processing wallet deposit', { transactionId: reference_id });

    // Si la transacción ya fue completada, ignorar (idempotencia)
    if (transaction.status === 'completed') {
      log.info('Transaction already completed, ignoring webhook');
      return new Response(
        JSON.stringify({ success: true, message: 'Transaction already completed' }),
        {
          status: 200,
          headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ========================================
    // MEJORA: Usar función admin que no requiere auth
    // ========================================
    // Confirmar depósito llamando a la función de base de datos (versión admin)
    const { data: confirmResult, error: confirmError } = await supabase.rpc(
      'wallet_confirm_deposit_admin',
      {
        p_user_id: transaction.user_id,
        p_transaction_id: transaction.id,
        p_provider_transaction_id: paymentData.id?.toString() || '',
        p_provider_metadata: {
          id: paymentData.id,
          status: paymentData.status,
          status_detail: paymentData.status_detail,
          payment_method_id: paymentData.payment_method_id,
          payment_type_id: paymentData.payment_type_id,
          transaction_amount: paymentData.transaction_amount,
          net_amount: paymentData.transaction_details?.net_received_amount,
          currency_id: paymentData.currency_id,
          date_approved: paymentData.date_approved,
          date_created: paymentData.date_created,
          external_reference: paymentData.external_reference,
          payer_email: paymentData.payer?.email,
          payer_first_name: paymentData.payer?.first_name,
          payer_last_name: paymentData.payer?.last_name,
        },
      }
    );

    if (confirmError) {
      log.error('Error confirming deposit', confirmError);
      throw confirmError;
    }

    log.info('Deposit confirmed successfully', confirmResult);

    // ========================================
    // REGISTRAR EN WALLET LEDGER (NUEVO SISTEMA)
    // ========================================
    // Convertir a centavos (MercadoPago usa decimales, ledger usa centavos)
    const amountCents = Math.round(paymentData.transaction_amount * 100);
    const refKey = `mp-${paymentData.id}`;

    log.info('Registering deposit in ledger', {
      amountCents,
      userId: transaction.user_id
    });

    const { data: ledgerResult, error: ledgerError } = await supabase.rpc(
      'wallet_deposit_ledger',
      {
        p_user_id: transaction.user_id,
        p_amount_cents: amountCents,
        p_ref: refKey,
        p_provider: 'mercadopago',
        p_meta: {
          transaction_id: transaction.id,
          payment_id: paymentData.id,
          payment_method: paymentData.payment_method_id,
          payment_type: paymentData.payment_type_id,
          status: paymentData.status,
          status_detail: paymentData.status_detail,
          currency: paymentData.currency_id,
          net_amount: paymentData.transaction_details?.net_received_amount,
          date_approved: paymentData.date_approved,
          payer_email: paymentData.payer?.email,
        },
      }
    );

    if (ledgerError) {
      // No fallar el webhook si el ledger falla, solo loggear
      // El sistema viejo (wallet_transactions) ya funcionó
      log.error('Warning: Error registering in ledger (old system still worked)', ledgerError);
    } else {
      log.info('Deposit registered in ledger successfully', ledgerResult);
    }

    // Retornar éxito
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment processed successfully',
        transaction_id: transaction.id,
        payment_id: paymentData.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    log.error('Error processing MercadoPago webhook', error);

    // Retornar 200 incluso en error para evitar reintentos de MP
    // MP reintenta si recibe 4xx/5xx
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        details: error instanceof Error ? error.stack : undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
