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
import { getCorsHeaders } from '../_shared/cors.ts';
import { createChildLogger } from '../_shared/logger.ts';
import {
  createMercadoPagoClient,
  getPaymentClient,
} from '../_shared/mercadopago-sdk.ts';
import { enforceRateLimit, RateLimitError } from '../_shared/rate-limiter.ts';

// Deno globals (silenciar errores de tsc en entorno Node/tsc)
declare const Deno: any;

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

// Tipo parcial del objeto de pago devuelto por el SDK de MercadoPago
interface MPPayment {
  id: string | number;
  status: string;
  status_detail?: string;
  // Asumimos que los pagos tienen transaction_amount cuando están aprobados
  transaction_amount: number;
  currency_id?: string;
  payment_method_id?: string;
  operation_type?: string;
  card?: { last_four_digits?: string } | null;
  external_reference?: string | null;
  metadata?: Record<string, any> | null;
  collector_id?: string | number | null;
  marketplace_fee?: number | null;
  date_approved?: string | null;

  // Campos adicionales utilizados en el flujo
  payment_type_id?: string;
  transaction_details?: { net_received_amount?: number } | null;
  date_created?: string | null;
  payer?: { email?: string; first_name?: string; last_name?: string } | null;
}

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

// OLD: In-memory rate limiting (replaced with database-backed solution)
// const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
// const RATE_LIMIT_MAX_REQUESTS = 100;
// const RATE_LIMIT_WINDOW_MS = 60 * 1000;

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

// Comparación en tiempo constante para evitar ataques por timing
// Comparación en tiempo constante para evitar ataques por timing.
// Esta versión asume que las entradas son hex strings (lowercase)
// y las compara a nivel de bytes para evitar efectos de encoding/charCode.
function timingSafeEqualHex(a: string, b: string): boolean {
  if (!a || !b) return false;
  // Longitud debe ser par (cada byte == 2 hex chars)
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

// Envuelve una promesa con timeout y opcionalmente aborta un AbortController
// si se pasa por parámetro. No todos los clientes/SDKs aceptan AbortSignal,
// pero cuando sea posible el caller puede crear un controller y pasarlo.
function withTimeout<T>(p: Promise<T>, ms: number, controller?: AbortController): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      try {
        if (controller) controller.abort();
      } catch (e) {
        // ignore
      }
      reject(new Error('Timeout after ' + ms + 'ms'));
    }, ms);

    p.then((v) => {
      clearTimeout(timer);
      resolve(v);
    }).catch((err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}


/**
 * OLD: In-memory rate limiting function (replaced with database-backed solution)
 * Using enforceRateLimit() from _shared/rate-limiter.ts instead
 */
/* function checkRateLimit(clientIP: string): { allowed: boolean; remaining: number; resetAt: number } {
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
} */

serve(async (req: Request) => {
  // ✅ SECURITY: CORS con whitelist de dominios permitidos
  const corsHeaders = getCorsHeaders(req);

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

    // Crear cliente Supabase al inicio del request para operaciones de logging
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

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
      log.warn('⚠️ Unauthorized IP attempt:', {
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
    // RATE LIMITING (P0 Security - Database-backed)
    // Prevenir DDoS limitando requests por IP
    // SECURITY: Fail-closed - reject requests if rate limiter fails
    // ========================================
    try {
      await enforceRateLimit(req, {
        endpoint: 'mercadopago-webhook',
        windowSeconds: 60, // 1 minute window
        identifier: clientIP || undefined, // Use IP-based rate limiting for webhooks
      });
    } catch (error) {
      if (error instanceof RateLimitError) {
        log.warn('⚠️ Rate limit exceeded:', {
          ip: clientIP,
          resetAt: error.resetAt,
        });
        return error.toResponse();
      }
      // SECURITY FIX: Fail-closed - reject request if rate limiter has errors
      // This prevents potential DDoS attacks when rate limiter is unavailable
      log.error('[RateLimit] Error enforcing rate limit - failing closed:', error);
      return new Response(
        JSON.stringify({
          error: 'Service temporarily unavailable',
          code: 'RATE_LIMITER_ERROR',
          retry: true,
        }),
        {
          status: 503,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': '60',
          },
        }
      );
    }

    // OLD: Rate limit headers (now handled by RateLimitError.toResponse())
    const rateLimitHeaders = {};

    // ========================================
    // VALIDACIÓN DE FIRMA HMAC (CRÍTICA)
    // Verificar que el webhook proviene realmente de MercadoPago
    // ========================================

    const xSignature = req.headers.get('x-signature');
    const xRequestId = req.headers.get('x-request-id');

    log.info('Webhook validation:', {
      ip: clientIP,
      isAuthorizedIP,
      hasSignature: !!xSignature,
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
      log.error('Invalid JSON in webhook payload:', e);
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

      xSignature.split(',').forEach((part: string) => {
        const [key, value] = (part || '').split('=');
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

        log.info('HMAC validation:', {
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
          // Convertir a hex (hex lowercase)
          const hashArray = Array.from(new Uint8Array(signature));
          const calculatedHash = hashArray
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')
            .toLowerCase();
          log.info('HMAC calculated:', calculatedHash.substring(0, 20) + '...');
          // Comparar hashes en tiempo constante (hex-safe)
          if (!timingSafeEqualHex(calculatedHash, (hash || '').toLowerCase())) {
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
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              }
            );
          } else {
            log.info('✅ HMAC validation passed');
            // ==============================
            // IDEMPOTENCIA / DEDUPLICACIÓN (atómica)
            // Insertamos un log con event_id (x-request-id). Con índice UNIQUE sobre event_id,
            // cualquier reintento/duplicado se detecta por violación de unicidad.
            // ==============================
            try {
              const normalizedIp = (clientIP || '').split(',')[0]?.trim() || null;
              const paymentIdForLog = (webhookPayload.data?.id || dataId || '')?.toString() || null;

              const insertPayload = {
                event_id: xRequestId,
                webhook_type: webhookPayload.type,
                resource_type: webhookType || webhookPayload.type,
                resource_id: paymentIdForLog,
                payment_id: paymentIdForLog,
                payload: webhookPayload,
                ip_address: normalizedIp,
                user_agent: req.headers.get('user-agent') || null,
                received_at: new Date().toISOString(),
              };

              const { error: insertError } = await supabase
                .from('mp_webhook_logs')
                .insert(insertPayload, { returning: 'minimal' });

              if (insertError) {
                const msg = String(insertError.message || '').toLowerCase();
                if (insertError.code === '23505' || msg.includes('duplicate') || msg.includes('unique')) {
                  log.info('Duplicate webhook detected via insert conflict, ignoring', { event_id: xRequestId });
                  return new Response(
                    JSON.stringify({ success: true, message: 'Duplicate webhook ignored' }),
                    {
                      status: 200,
                      headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
                    }
                  );
                }

                // Otro error: loguear y continuar (no bloquear procesamiento)
                log.warn('Warning: failed to insert mp_webhook_logs entry', { err: insertError });
              }
            } catch (dedupErr) {
              // Si falla inesperadamente la verificación/inserción, continuar el procesamiento
              log.error('Error inserting mp_webhook_logs for deduplication', dedupErr);
            }
          }
        } catch (cryptoError) {
          // ✅ SECURITY: Si falla la validación HMAC, rechazar
          log.error('❌ Webhook rejected: HMAC calculation error', {
            error: cryptoError,
            ip: clientIP,
            timestamp: new Date().toISOString(),
          });

          return new Response(
            JSON.stringify({
              error: 'Webhook signature validation failed',
              code: 'SIGNATURE_VALIDATION_ERROR',
            }),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
      } else {
        // ✅ SECURITY: Rechazar firma malformada
        log.error('❌ Webhook rejected: Invalid x-signature format (missing ts or v1)', {
          ip: clientIP,
          signatureFormat: xSignature,
          timestamp: new Date().toISOString(),
        });

        return new Response(
          JSON.stringify({
            error: 'Invalid webhook signature format',
            code: 'INVALID_SIGNATURE_FORMAT',
          }),
          {
            status: 401,
            headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    } else {
      // ✅ SECURITY: Rechazar webhooks sin firma HMAC o sin request ID
      const missingHeaders = [];
      if (!xSignature) missingHeaders.push('x-signature');
      if (!xRequestId) missingHeaders.push('x-request-id');

      log.error('❌ Webhook rejected: Missing required headers', {
        ip: clientIP,
        missingHeaders,
        type: webhookPayload.type,
        paymentId: webhookPayload.data?.id,
        timestamp: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({
          error: `Missing required headers: ${missingHeaders.join(', ')}`,
          code: 'MISSING_REQUIRED_HEADERS',
        }),
        {
          status: 401,
          headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Solo procesar notificaciones de tipo 'payment'
    if (webhookPayload.type !== 'payment') {
      log.info(`Ignoring webhook type: ${webhookPayload.type}`);
      return new Response(
        JSON.stringify({ success: true, message: 'Webhook type ignored' }),
        {
          status: 200,
          headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ========================================
    // OBTENER DATOS DEL PAGO USANDO SDK
    // ========================================

    const paymentId = webhookPayload.data.id;
    log.info(`Fetching payment ${paymentId} using MercadoPago SDK...`);

    // Obtener datos del pago usando SDK
    let paymentData: MPPayment | null = null;
    try {
      const mpConfig = createMercadoPagoClient(MP_ACCESS_TOKEN);
      const paymentClient = getPaymentClient(mpConfig);

      // Enforce a 3s timeout when fetching payment data from MercadoPago.
      // The SDK is configured with a global timeout, but we add an extra layer of safety.
      try {
        paymentData = await withTimeout(paymentClient.get({ id: paymentId }), 3000);
      } catch (timeoutErr) {
        log.warn('Timeout fetching payment data, retrying might be needed', timeoutErr);
        throw timeoutErr;
      }

      // Validar que la respuesta contiene datos válidos
      if (!paymentData || !paymentData.id) {
        log.error('Invalid payment data received from MercadoPago SDK:', paymentData);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Invalid payment data from MercadoPago SDK',
            payment_id: paymentId,
          }),
          {
            status: 502,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // ✅ SECURITY: Log sin exponer datos sensibles completos
      log.info('Payment Data from SDK', {
        id: paymentData.id,
        status: paymentData.status,
        status_detail: paymentData.status_detail,
        transaction_amount: paymentData.transaction_amount,
        currency_id: paymentData.currency_id,
        payment_method_id: paymentData.payment_method_id,
        operation_type: paymentData.operation_type,
      });

    } catch (apiError: any) {
      // ✅ CRITICAL FIX: Retornar 500 para que MercadoPago reintente
      log.error('❌ MercadoPago SDK error - webhook will be retried', {
        error: apiError?.message || apiError,
        payment_id: paymentId,
        timestamp: new Date().toISOString(),
      });

      // Si es un error 5xx, retornar 503 para retry
      if (apiError?.status >= 500 || apiError?.statusCode >= 500) {
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

      // MercadoPago reintenta automáticamente con 500/502/503
      // Reintentos: inmediato, +1h, +2h, +4h, +8h (máx 12 en 24h)
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch payment data from MercadoPago',
          retry: true,
          payment_id: paymentId,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ========================================
    // MANEJAR PREAUTORIZACIONES (AUTHORIZED STATUS)
    // ========================================

    // El cliente Supabase ya fue creado al inicio del request

    // Check if this is a preauthorization (status: authorized)
    if (paymentData.status === 'authorized') {
      log.info('Processing preauthorization (hold) webhook...');

      // Find payment intent by mp_payment_id
      const { data: intent, error: intentError } = await supabase
        .from('payment_intents')
        .select('*')
        .eq('mp_payment_id', paymentId)
        .single();

      if (intentError || !intent) {
        log.info('No payment intent found for authorized payment:', paymentId);
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
        log.error('Error updating preauth intent:', updateError);
      } else {
        log.info('✅ Preauthorization updated successfully');
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
      log.info('Processing preauth capture webhook...');

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
        log.error('Error updating captured preauth:', updateError);
      }

      // Call capture_preauth RPC to handle ledger entries
      if (capturedIntent.booking_id) {
        const { error: captureError } = await supabase.rpc('capture_preauth', {
          p_intent_id: capturedIntent.id,
          p_booking_id: capturedIntent.booking_id,
        });

        if (captureError) {
          log.error('Error processing capture ledger:', captureError);
        } else {
          log.info('✅ Preauth captured and ledger updated');
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
      log.info('Processing preauth cancellation webhook...');

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
          log.error('Error updating cancelled preauth:', updateError);
        }

        // Call cancel_preauth RPC to release any locked funds
        const { error: cancelError } = await supabase.rpc('cancel_preauth', {
          p_intent_id: cancelledIntent.id,
        });

        if (cancelError) {
          log.error('Error processing cancellation:', cancelError);
        } else {
          log.info('✅ Preauth cancelled successfully');
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
      log.info(`Payment not approved. Status: ${paymentData.status}`);
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
    // DETERMINAR TIPO DE PAGO: SUBSCRIPTION, BOOKING O WALLET DEPOSIT
    // ========================================

    // Check if this is a subscription payment (external_reference starts with "subscription_")
    if (reference_id.startsWith('subscription_')) {
      log.info('Processing subscription payment:', reference_id);

      // Parse external_reference: subscription_{user_id}_{tier}_{timestamp}
      const parts = reference_id.split('_');
      if (parts.length < 4) {
        log.error('Invalid subscription external_reference format:', reference_id);
        throw new Error('Invalid subscription external_reference');
      }

      const userId = parts[1];
      const tier = parts[2] as 'club_standard' | 'club_black';

      // Validate tier
      const validTiers = ['club_standard', 'club_black'];
      if (!validTiers.includes(tier)) {
        log.error('Invalid subscription tier:', tier);
        throw new Error(`Invalid subscription tier: ${tier}`);
      }

      // Get tier config
      const tierConfig = {
        club_standard: { price_cents: 30000, coverage_cents: 50000 },
        club_black: { price_cents: 60000, coverage_cents: 100000 },
      }[tier];

      // Check if user already has active subscription (idempotency)
      const { data: existingSub } = await supabase.rpc('get_active_subscription_for_user', {
        p_user_id: userId,
      });

      if (existingSub) {
        log.info('User already has active subscription, ignoring webhook');
        return new Response(
          JSON.stringify({ success: true, message: 'Subscription already active' }),
          {
            status: 200,
            headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Create subscription via RPC
      const { data: subscriptionId, error: createError } = await supabase.rpc('create_subscription', {
        p_user_id: userId,
        p_tier: tier,
        p_amount_cents: tierConfig.price_cents,
        p_payment_provider: 'mercadopago',
        p_payment_external_id: paymentData.id.toString(),
      });

      if (createError) {
        log.error('Error creating subscription:', createError);
        throw createError;
      }

      log.info('✅ Subscription created successfully:', {
        subscriptionId,
        userId,
        tier,
        paymentId: paymentData.id,
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Subscription created successfully',
          subscription_id: subscriptionId,
          user_id: userId,
          tier: tier,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Primero verificar si es un booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', reference_id)
      .single();

    // Si es un booking, procesar pago de booking
    if (booking && !bookingError) {
      log.info('Processing booking payment:', reference_id);

      // Verificar que el booking esté pendiente de pago
      if (booking.status !== 'pending') {
        log.info(`Booking is not pending (status: ${booking.status}), ignoring webhook`);
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

      if (isMarketplaceSplit) {
        log.info('💰 Processing marketplace split payment with ATOMIC validation...');

        // ========================================
        // P0-3 FIX: ATOMIC SPLIT PAYMENT VALIDATION
        // All validations and booking update happen in a single transaction
        // If validation fails, booking is NOT confirmed
        // ========================================

        const { data: splitResult, error: splitError } = await supabase.rpc(
          'validate_and_confirm_split_payment',
          {
            p_booking_id: reference_id,
            p_mp_payment_id: paymentData.id.toString(),
            p_mp_status: paymentData.status,
            p_mp_status_detail: paymentData.status_detail || '',
            p_transaction_amount: paymentData.transaction_amount,
            p_currency_id: paymentData.currency_id || 'ARS',
            p_payment_method_id: paymentData.payment_method_id || '',
            p_date_approved: paymentData.date_approved || new Date().toISOString(),
            p_collector_id: paymentData.collector_id?.toString() || '',
            p_marketplace_fee: paymentData.marketplace_fee || 0,
            p_metadata: metadata,
          }
        );

        if (splitError) {
          log.error('Error in atomic split validation:', splitError);
          throw splitError;
        }

        // Check result of atomic validation
        if (splitResult.already_processed) {
          log.info('Booking already processed:', splitResult.message);
          return new Response(
            JSON.stringify({
              success: true,
              message: splitResult.message,
              booking_id: reference_id,
            }),
            {
              status: 200,
              headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        if (!splitResult.validation_passed) {
          // P0-3: Validation failed - booking NOT confirmed
          log.error('❌ Split payment validation FAILED (atomic):', {
            booking_id: reference_id,
            payment_id: paymentData.id,
            issues: splitResult.validation_issues,
            status: splitResult.status,
          });

          // Return success to MP (we received the webhook) but booking is NOT confirmed
          return new Response(
            JSON.stringify({
              success: true,
              message: 'Payment received but validation failed - requires manual review',
              booking_id: reference_id,
              payment_id: paymentData.id,
              validation_passed: false,
              booking_status: 'payment_validation_failed',
              requires_manual_review: true,
            }),
            {
              status: 200,
              headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        log.info('✅ Split payment validated and booking confirmed (atomic):', {
          booking_id: reference_id,
          payment_id: paymentData.id,
        });

        // ========================================
        // AUTORENTA: Siempre comodato - procesar reward pool y FGO
        // ========================================
        // AutoRenta es exclusivamente comodato, siempre procesamos contribuciones
        {
          log.info('[COMODATO] Processing comodato contributions via webhook:', {
            booking_id: reference_id,
            reward_pool_cents: metadata.reward_pool_cents,
            fgo_cents: metadata.fgo_cents,
          });

          try {
            const { data: comodatoResult, error: comodatoError } = await supabase
              .rpc('process_comodato_booking_payment', {
                p_booking_id: reference_id,
              });

            if (comodatoError) {
              log.error('[COMODATO] Error processing comodato contributions:', comodatoError);
              // Don't fail the webhook - contributions can be processed manually
            } else {
              log.info('[COMODATO] Successfully processed contributions:', comodatoResult);
            }
          } catch (comodatoErr) {
            log.error('[COMODATO] Exception processing comodato:', comodatoErr);
          }
        }

        // Marcar webhook como procesado (best-effort)
        try {
          await supabase
            .from('mp_webhook_logs')
            .update({
              processed: true,
              processed_at: new Date().toISOString(),
              booking_id: reference_id,
              payment_id: paymentData.id?.toString?.() ?? String(paymentData.id),
              resource_id: paymentData.id?.toString?.() ?? String(paymentData.id),
              processing_error: null,
            })
            .eq('event_id', xRequestId);
        } catch (e) {
          log.warn('Warning: failed to mark mp_webhook_logs processed (split booking)', e);
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Split payment validated and booking confirmed',
            booking_id: reference_id,
            payment_id: paymentData.id,
            marketplace_split: true,
            validation_passed: true,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // ========================================
      // NON-SPLIT PAYMENTS: Regular booking confirmation
      // ========================================
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          status: 'confirmed',
          paid_at: new Date().toISOString(),
          payment_method: 'credit_card',
          payment_split_completed: false,
          metadata: {
            ...(booking.metadata || {}),
            mercadopago_payment_id: paymentData.id,
            mercadopago_status: paymentData.status,
            mercadopago_payment_method: paymentData.payment_method_id,
            mercadopago_amount: paymentData.transaction_amount,
            mercadopago_currency: paymentData.currency_id,
            mercadopago_approved_at: paymentData.date_approved,
            is_marketplace_split: false,
          },
        })
        .eq('id', reference_id);

      if (updateError) {
        log.error('Error updating booking:', updateError);
        throw updateError;
      }

      // ========================================
      // AUTORENTA: Siempre comodato - procesar contribuciones
      // ========================================
      // AutoRenta es exclusivamente comodato, siempre procesamos contribuciones
      {
        log.info('[COMODATO] Processing comodato contributions (non-split):', {
          booking_id: reference_id,
        });

        try {
          const { data: comodatoResult, error: comodatoError } = await supabase
            .rpc('process_comodato_booking_payment', {
              p_booking_id: reference_id,
            });

          if (comodatoError) {
            log.error('[COMODATO] Error processing comodato contributions:', comodatoError);
          } else {
            log.info('[COMODATO] Successfully processed contributions:', comodatoResult);
          }
        } catch (comodatoErr) {
          log.error('[COMODATO] Exception processing comodato:', comodatoErr);
        }
      }

      // Marcar webhook como procesado (best-effort)
      try {
        await supabase
          .from('mp_webhook_logs')
          .update({
            processed: true,
            processed_at: new Date().toISOString(),
            booking_id: reference_id,
            payment_id: paymentData.id?.toString?.() ?? String(paymentData.id),
            resource_id: paymentData.id?.toString?.() ?? String(paymentData.id),
            processing_error: null,
          })
          .eq('event_id', xRequestId);
      } catch (e) {
        log.warn('Warning: failed to mark mp_webhook_logs processed (booking)', e);
      }

      log.info('✅ Booking payment confirmed successfully:', reference_id);

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
      log.error('Neither booking nor wallet transaction found:', reference_id);
      throw new Error('Reference not found - not a booking or wallet deposit');
    }

    log.info('Processing wallet deposit:', reference_id);

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
    // P1-5: VALIDAR MONTO RECIBIDO
    // ========================================
    // Comparar el monto recibido de MercadoPago con el monto esperado
    // para prevenir ataques man-in-the-middle
    const expectedAmountCents = transaction.amount; // Monto original en centavos
    const receivedAmountCents = Math.round(paymentData.transaction_amount * 100);
    const amountDifferenceCents = Math.abs(expectedAmountCents - receivedAmountCents);

    // Tolerancia de 1 centavo por redondeo
    if (amountDifferenceCents > 1) {
      log.error(
        `[P1-5] Amount mismatch detected! Expected: ${expectedAmountCents}, Received: ${receivedAmountCents}, Diff: ${amountDifferenceCents}`
      );

      // Log the issue for investigation
      await supabase.from('payment_issues').insert({
        booking_id: null,
        transaction_id: transaction.id,
        issue_type: 'deposit_amount_mismatch',
        severity: 'high',
        description: `Deposit amount mismatch: expected ${expectedAmountCents} cents, received ${receivedAmountCents} cents`,
        metadata: {
          expected_amount_cents: expectedAmountCents,
          received_amount_cents: receivedAmountCents,
          difference_cents: amountDifferenceCents,
          payment_id: paymentData.id,
          user_id: transaction.user_id,
        },
        detected_at: new Date().toISOString(),
      }).catch(e => log.error('Failed to log payment issue:', e));

      throw new Error(
        `AMOUNT_MISMATCH: Expected ${expectedAmountCents} cents, received ${receivedAmountCents} cents`
      );
    }

    log.info(`Amount validation passed: ${receivedAmountCents} cents (diff: ${amountDifferenceCents})`);

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
      log.error('Error confirming deposit:', confirmError);
      throw confirmError;
    }

    // Marcar webhook como procesado (best-effort)
    try {
      await supabase
        .from('mp_webhook_logs')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          payment_id: paymentData.id?.toString?.() ?? String(paymentData.id),
          resource_id: paymentData.id?.toString?.() ?? String(paymentData.id),
          processing_error: null,
        })
        .eq('event_id', xRequestId);
    } catch (e) {
      log.warn('Warning: failed to mark mp_webhook_logs processed (deposit)', e);
    }

    log.info('Deposit confirmed successfully:', confirmResult);

    // ========================================
    // REGISTRAR EN WALLET LEDGER (NUEVO SISTEMA)
    // ========================================
    // Convertir a centavos (MercadoPago usa decimales, ledger usa centavos)
    const amountCents = Math.round(paymentData.transaction_amount * 100);
    const refKey = `mp-${paymentData.id}`;

    log.info(`Registering deposit in ledger: ${amountCents} cents for user ${transaction.user_id}`);

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
      log.error('Warning: Error registering in ledger (old system still worked):', ledgerError);
    } else {
      log.info('✅ Deposit registered in ledger successfully:', ledgerResult);
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
    // Best-effort: registrar el error para debugging
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await supabase
          .from('mp_webhook_logs')
          .update({
            processed: false,
            processed_at: null,
            processing_error: error instanceof Error ? error.message : String(error),
          })
          .eq('event_id', req.headers.get('x-request-id') || '');
      }
    } catch (_) {
      // ignore
    }

    // ✅ CRITICAL FIX: Retornar 500 para que MercadoPago reintente
    log.error('❌ Critical error processing webhook - will be retried', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    // MercadoPago reintenta automáticamente con 500/502/503
    // Esto previene pérdida de pagos por errores transitorios (DB timeout, etc.)
    return new Response(
      JSON.stringify({
        error: 'Internal server error processing webhook',
        retry: true,
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
