import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { enforceRateLimit, RateLimitError } from '../_shared/rate-limiter.ts';
import { createChildLogger } from '../_shared/logger.ts';
import { getMercadoPagoAccessToken } from '../_shared/mercadopago-sdk.ts';

const log = createChildLogger('ProcessBookingPayment');
const MP_API_BASE = 'https://api.mercadopago.com/v1';

interface ProcessBookingPaymentRequest {
  booking_id: string;
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
  card?: {
    last_four_digits?: string;
    cardholder?: {
      name?: string;
    };
  };
  date_created?: string;
  date_approved?: string;
  transaction_amount?: number;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ========================================
    // RATE LIMITING (P0 Security - DDoS Protection)
    // SECURITY: Fail-closed to prevent DDoS when limiter unavailable
    // ========================================
    try {
      await enforceRateLimit(req, {
        endpoint: 'mercadopago-process-booking-payment',
        windowSeconds: 60, // 1 minute window
      });
    } catch (error) {
      if (error instanceof RateLimitError) {
        return error.toResponse();
      }
      // SECURITY FIX: Fail-closed - reject request if rate limiter has errors
      log.error('[RateLimit] Error enforcing rate limit - failing closed:', error);
      return new Response(
        JSON.stringify({
          error: 'Service temporarily unavailable',
          code: 'RATE_LIMITER_ERROR',
          retry: true,
        }),
        {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' },
        }
      );
    }

    // Obtener y validar token (usando módulo compartido)
    // allowTestTokens: true porque esta función se usa también en desarrollo
    const MP_ACCESS_TOKEN = getMercadoPagoAccessToken('mercadopago-process-booking-payment', true);

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const MP_MARKETPLACE_ID = Deno.env.get('MERCADOPAGO_MARKETPLACE_ID');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validar autorización
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
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request
    const body: ProcessBookingPaymentRequest = await req.json();
    const { booking_id, card_token, issuer_id, installments = 1 } = body;

    // ========================================
    // CONTRACT VALIDATION (Phase 7)
    // ========================================
    log.info('[CONTRACT_VALIDATION] Starting validation for booking:', booking_id);

    // 1. Get contract record
    const { data: contract, error: contractError } = await supabase
      .from('booking_contracts')
      .select('accepted_by_renter, accepted_at, clauses_accepted')
      .eq('booking_id', booking_id)
      .maybeSingle();

    if (contractError) {
      log.error('[CONTRACT_VALIDATION] Error fetching contract:', contractError);
      return new Response(
        JSON.stringify({
          error: 'CONTRACT_FETCH_ERROR',
          message: 'Error al verificar el contrato. Intenta nuevamente.',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!contract) {
      log.warn('[CONTRACT_VALIDATION] Contract not found for booking:', booking_id);
      return new Response(
        JSON.stringify({
          error: 'CONTRACT_NOT_FOUND',
          message: 'Contrato no encontrado para esta reserva. Por favor, vuelve a la página de pago.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 2. Validate contract accepted
    if (!contract.accepted_by_renter) {
      log.warn('[CONTRACT_VALIDATION] Contract not accepted for booking:', booking_id);
      return new Response(
        JSON.stringify({
          error: 'CONTRACT_NOT_ACCEPTED',
          message: 'Debes aceptar el contrato antes de proceder con el pago.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 3. Validate acceptance within 24 hours (security measure)
    if (!contract.accepted_at) {
      log.error('[CONTRACT_VALIDATION] Missing accepted_at timestamp for booking:', booking_id);
      return new Response(
        JSON.stringify({
          error: 'CONTRACT_INVALID_STATE',
          message: 'Estado del contrato inválido. Por favor, acepta el contrato nuevamente.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const acceptedAt = new Date(contract.accepted_at);
    const hoursSinceAcceptance = (Date.now() - acceptedAt.getTime()) / (1000 * 60 * 60);

    if (hoursSinceAcceptance > 24) {
      log.warn('[CONTRACT_VALIDATION] Contract acceptance expired for booking:', {
        booking_id,
        accepted_at: contract.accepted_at,
        hours_elapsed: hoursSinceAcceptance.toFixed(2),
      });
      return new Response(
        JSON.stringify({
          error: 'CONTRACT_ACCEPTANCE_EXPIRED',
          message: 'La aceptación del contrato ha expirado (máximo 24 horas). Por favor, acepta el contrato nuevamente.',
          expired_at: contract.accepted_at,
          hours_elapsed: Math.floor(hoursSinceAcceptance),
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 4. Validate all 4 priority clauses accepted
    const clauses = contract.clauses_accepted;

    if (
      !clauses ||
      typeof clauses !== 'object' ||
      Array.isArray(clauses)
    ) {
      log.error('[CONTRACT_VALIDATION] Invalid clauses_accepted format for booking:', booking_id);
      return new Response(
        JSON.stringify({
          error: 'CONTRACT_CLAUSES_MISSING',
          message: 'Faltan las cláusulas del contrato. Por favor, acepta el contrato nuevamente.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const requiredClauses = ['culpaGrave', 'indemnidad', 'retencion', 'mora'];
    const missingClauses = requiredClauses.filter(
      (clause) => (clauses as Record<string, unknown>)[clause] !== true
    );

    if (missingClauses.length > 0) {
      log.warn('[CONTRACT_VALIDATION] Incomplete clause acceptance for booking:', {
        booking_id,
        missing_clauses: missingClauses,
        clauses_state: clauses,
      });
      return new Response(
        JSON.stringify({
          error: 'INCOMPLETE_CLAUSE_ACCEPTANCE',
          message: 'Debes aceptar TODAS las cláusulas del contrato para proceder con el pago.',
          missing_clauses: missingClauses,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    log.info('[CONTRACT_VALIDATION] ✅ Contract validated successfully', {
      booking_id,
      accepted_at: contract.accepted_at,
      hours_since_acceptance: hoursSinceAcceptance.toFixed(2),
    });

    if (!booking_id || !card_token) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: booking_id, card_token' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Obtener booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        car:cars(*, owner:profiles!cars_owner_id_fkey(
          id,
          mercadopago_collector_id,
          mp_onboarding_completed
        ))
      `)
      .eq('id', booking_id)
      .eq('renter_id', user.id)
      .single();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: 'Booking not found or unauthorized' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validar estado del booking
    if (booking.status !== 'pending' && booking.status !== 'pending_payment') {
      return new Response(
        JSON.stringify({ error: `Booking is not in a valid state for payment. Current status: ${booking.status}` }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ========================================
    // IDEMPOTENCY CHECK: Return cached result if payment already exists
    // SECURITY FIX 2025-12-27: Prevent duplicate payment processing
    // ========================================
    if (booking.provider_split_payment_id && booking.metadata?.mp_status === 'approved') {
      log.info('[IDEMPOTENCY] Payment already processed for booking:', {
        booking_id,
        payment_id: booking.provider_split_payment_id,
        status: booking.metadata.mp_status,
      });
      return new Response(
        JSON.stringify({
          success: true,
          payment_id: parseInt(booking.provider_split_payment_id),
          status: 'approved',
          status_detail: booking.metadata.mp_status_detail || 'accredited',
          booking_id: booking_id,
          booking_status: booking.status,
          idempotent: true,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // If payment exists but not approved, check with MercadoPago for current status
    if (booking.provider_split_payment_id) {
      log.info('[IDEMPOTENCY] Checking existing payment status with MercadoPago:', {
        booking_id,
        payment_id: booking.provider_split_payment_id,
      });

      try {
        const existingPaymentResponse = await fetch(
          `${MP_API_BASE}/payments/${booking.provider_split_payment_id}`,
          {
            headers: {
              'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
            },
          }
        );

        if (existingPaymentResponse.ok) {
          const existingPayment = await existingPaymentResponse.json();

          // If payment is now approved, update booking and return success
          if (existingPayment.status === 'approved') {
            await supabase
              .from('bookings')
              .update({
                status: 'confirmed',
                paid_at: new Date().toISOString(),
                metadata: {
                  ...booking.metadata,
                  mp_status: existingPayment.status,
                  mp_status_detail: existingPayment.status_detail,
                },
              })
              .eq('id', booking_id);

            return new Response(
              JSON.stringify({
                success: true,
                payment_id: existingPayment.id,
                status: existingPayment.status,
                status_detail: existingPayment.status_detail,
                booking_id: booking_id,
                booking_status: 'confirmed',
                idempotent: true,
              }),
              {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              }
            );
          }

          // If payment failed/rejected, allow retry with new token
          if (['rejected', 'cancelled'].includes(existingPayment.status)) {
            log.info('[IDEMPOTENCY] Previous payment failed, allowing retry:', {
              booking_id,
              previous_status: existingPayment.status,
            });
            // Continue with new payment attempt below
          } else {
            // Payment is pending or in_process, return current status
            return new Response(
              JSON.stringify({
                success: false,
                payment_id: existingPayment.id,
                status: existingPayment.status,
                status_detail: existingPayment.status_detail,
                message: 'Payment is still being processed. Please wait.',
                code: 'PAYMENT_IN_PROGRESS',
              }),
              {
                status: 409,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              }
            );
          }
        }
      } catch (checkError) {
        log.warn('[IDEMPOTENCY] Error checking existing payment, proceeding with new payment:', checkError);
        // Continue with new payment attempt if check fails
      }
    }

    // ========================================
    // SECURITY: Validate price lock hasn't expired
    // SECURITY FIX 2025-12-27: Use explicit timestamp comparison with getTime()
    // ========================================
    if (booking.price_locked_until) {
      const lockExpiry = new Date(booking.price_locked_until);
      const now = new Date();

      // Use getTime() for explicit numeric comparison (milliseconds since epoch)
      const lockExpiryMs = lockExpiry.getTime();
      const nowMs = now.getTime();

      if (lockExpiryMs < nowMs) {
        const expiredBySeconds = Math.floor((nowMs - lockExpiryMs) / 1000);
        log.warn('[PRICE_LOCK] Expired for booking:', {
          booking_id,
          locked_until: booking.price_locked_until,
          locked_until_ms: lockExpiryMs,
          now: now.toISOString(),
          now_ms: nowMs,
          expired_by_seconds: expiredBySeconds,
        });
        return new Response(
          JSON.stringify({
            error: 'El precio de la reserva ha expirado. Por favor, inicie el proceso de pago nuevamente.',
            code: 'PRICE_LOCK_EXPIRED',
            expired_at: booking.price_locked_until,
            expired_by_seconds: expiredBySeconds,
            server_time: now.toISOString(),
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Log remaining time for debugging
      const remainingSeconds = Math.floor((lockExpiryMs - nowMs) / 1000);
      log.info('[PRICE_LOCK] Valid, remaining time:', {
        booking_id,
        remaining_seconds: remainingSeconds,
      });
    }

    // ========================================
    // SECURITY: Validate amount matches stored booking amount
    // Prevents tampering with payment amounts
    // ========================================
    const storedAmount = Number(booking.total_amount || 0);
    const metadataAmount = booking.metadata?.total_ars_at_lock;

    if (metadataAmount && Math.abs(storedAmount - metadataAmount) > 0.01) {
      log.error('Amount mismatch detected:', {
        booking_id,
        stored_amount: storedAmount,
        metadata_amount: metadataAmount,
      });
      return new Response(
        JSON.stringify({
          error: 'Inconsistencia en el monto de la reserva. Por favor, contacte soporte.',
          code: 'AMOUNT_MISMATCH',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Obtener perfil del usuario
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, first_name, last_name, phone, gov_id_number, gov_id_type, dni')
      .eq('id', user.id)
      .single();

    // Obtener owner para split payment
    const owner = booking.car?.owner;

    // ========================================
    // AUTORENTA: Solo modelo COMODATO
    // 15% platform, 75% reward pool, 10% FGO, 0% owner directo
    // Owner recibe rewards mensuales basados en puntos
    // ========================================
    const isComodato = true; // AutoRenta es exclusivamente comodato
    const shouldSplit = false; // No hay split payment en comodato

    // Calcular montos
    const totalAmount = Number(booking.total_amount || 0);

    // ✅ MEJORA: Validar monto (según mejores prácticas)
    if (totalAmount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid amount: must be greater than 0' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Opcional: Límite máximo para prevenir errores (ej: $1,000,000 ARS)
    const MAX_AMOUNT = 1000000;
    if (totalAmount > MAX_AMOUNT) {
      return new Response(
        JSON.stringify({ error: 'Amount exceeds maximum allowed' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ========================================
    // PAYMENT DISTRIBUTION based on agreement_type
    // ========================================
    let platformFee: number;
    let ownerAmount: number;
    let rewardPoolAmount: number;
    let fgoAmount: number;

    // AUTORENTA (Solo Comodato): 15% platform, 75% reward pool, 10% FGO, 0% owner
    platformFee = Math.round(totalAmount * 0.15 * 100) / 100;
    rewardPoolAmount = Math.round(totalAmount * 0.75 * 100) / 100;
    fgoAmount = Math.round((totalAmount - platformFee - rewardPoolAmount) * 100) / 100; // ~10%
    ownerAmount = 0; // Owner recibe rewards mensuales, no pago directo

    log.info('[COMODATO] Payment distribution:', {
      booking_id,
      total: totalAmount,
      platform_fee: platformFee,
      reward_pool: rewardPoolAmount,
      fgo: fgoAmount,
      owner: ownerAmount,
    });

    // Formatear phone para MercadoPago
    let phoneFormatted: { area_code: string; number: string } | undefined;
    if (profile?.phone) {
      const phoneCleaned = profile.phone.replace(/[^0-9]/g, '');
      const phoneWithoutCountry = phoneCleaned.startsWith('54')
        ? phoneCleaned.substring(2)
        : phoneCleaned;
      const areaCode = phoneWithoutCountry.substring(0, 2) || '11';
      const number = phoneWithoutCountry.substring(2) || '';
      if (number.length >= 8) {
        phoneFormatted = {
          area_code: areaCode,
          number: number,
        };
      }
    }

    // Obtener DNI
    const dniNumber = profile?.gov_id_number || profile?.dni;
    const dniType = profile?.gov_id_type || 'DNI';
    let identification: { type: string; number: string } | undefined;
    if (dniNumber) {
      const dniCleaned = dniNumber.replace(/[^0-9]/g, '');
      if (dniCleaned.length >= 7) {
        identification = {
          type: dniType.toUpperCase(),
          number: dniCleaned,
        };
      }
    }

    // Obtener nombres
    const firstName = profile?.first_name || user.user_metadata?.first_name || 'Usuario';
    const lastName = profile?.last_name || user.user_metadata?.last_name || 'AutoRenta';

    // Use platform access token (split payment is handled via collector_id)
    const accessTokenToUse = MP_ACCESS_TOKEN;

    // Crear pago en MercadoPago
    const mpPayload: Record<string, unknown> = {
      transaction_amount: Number(totalAmount.toFixed(2)),
      token: card_token,
      description: `Alquiler de vehículo - Booking ${booking_id.slice(0, 8)}`,
      installments: installments || 1,
      payer: {
        email: user.email || profile?.email || `${user.id}@autorenta.com`,
        first_name: firstName,
        last_name: lastName,
        ...(phoneFormatted && { phone: phoneFormatted }),
        ...(identification && { identification }),
      },
      external_reference: booking_id,
      statement_descriptor: 'AUTORENTAR',
      metadata: {
        booking_id: booking_id,
        renter_id: user.id,
        car_id: booking.car_id,
        owner_id: owner?.id || null,
        payment_type: 'booking',
        agreement_type: 'comodato', // AutoRenta es solo comodato
        is_marketplace_split: false,
        is_comodato: true,
        reward_pool_cents: Math.round(rewardPoolAmount * 100),
        fgo_cents: Math.round(fgoAmount * 100),
      },
    };

    // Agregar issuer_id si está presente
    if (issuer_id) {
      mpPayload.issuer_id = issuer_id;
    }

    // Agregar split payment si aplica
    if (shouldSplit && owner?.mercadopago_collector_id) {
      mpPayload.marketplace = MP_MARKETPLACE_ID;
      mpPayload.marketplace_fee = platformFee;
      mpPayload.collector_id = owner.mercadopago_collector_id;
    }

    log.info('Processing booking payment with MercadoPago:', {
      booking_id,
      amount: totalAmount,
      split: shouldSplit,
    });

    const mpResponse = await fetch(`${MP_API_BASE}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessTokenToUse}`,
        'X-Idempotency-Key': booking_id, // Usar booking_id como idempotency key
      },
      body: JSON.stringify(mpPayload),
    });

    if (!mpResponse.ok) {
      const errorData = await mpResponse.json();
      log.error('MercadoPago API Error:', errorData);

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Payment processing failed',
          details: errorData,
        }),
        {
          status: mpResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const mpData: MercadoPagoPaymentResponse = await mpResponse.json();
    log.info('MercadoPago Payment Response:', mpData);

    // Actualizar booking con información del pago
    // Using correct column names from bookings table schema
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        provider_split_payment_id: mpData.id.toString(),
        payment_preference_id: null, // Ya no necesitamos preference
        status: mpData.status === 'approved' ? 'confirmed' : 'pending_payment',
        payment_method: mpData.payment_method_id,
        paid_at: mpData.status === 'approved' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
        metadata: {
          ...booking.metadata,
          mp_payment_id: mpData.id,
          mp_status: mpData.status,
          mp_status_detail: mpData.status_detail,
          mp_payment_method_id: mpData.payment_method_id,
          mp_payment_type_id: mpData.payment_type_id,
          mp_card_last4: mpData.card?.last_four_digits,
          // mp_card_holder_name removed - PII should not be stored in metadata
          mp_date_created: mpData.date_created,
          mp_date_approved: mpData.date_approved,
        },
      })
      .eq('id', booking_id);

    if (updateError) {
      log.error('Error updating booking:', updateError);
      // No fallar el pago si la actualización falla, el webhook lo hará
    }

    // ========================================
    // COMODATO: Process reward pool and FGO contributions
    // Only when payment is approved and booking is comodato type
    // ========================================
    if (isComodato && mpData.status === 'approved') {
      log.info('[COMODATO] Processing comodato payment contributions:', {
        booking_id,
        reward_pool_cents: Math.round(rewardPoolAmount * 100),
        fgo_cents: Math.round(fgoAmount * 100),
      });

      try {
        const { data: comodatoResult, error: comodatoError } = await supabase
          .rpc('process_comodato_booking_payment', {
            p_booking_id: booking_id,
          });

        if (comodatoError) {
          log.error('[COMODATO] Error processing comodato contributions:', comodatoError);
          // Don't fail the payment - contributions can be processed later via webhook
        } else {
          log.info('[COMODATO] Successfully processed contributions:', comodatoResult);
        }
      } catch (comodatoErr) {
        log.error('[COMODATO] Exception processing comodato:', comodatoErr);
        // Don't fail the payment
      }
    }

    // Retornar respuesta
    return new Response(
      JSON.stringify({
        success: true,
        payment_id: mpData.id,
        status: mpData.status,
        status_detail: mpData.status_detail,
        booking_id: booking_id,
        booking_status: mpData.status === 'approved' ? 'confirmed' : 'pending_payment',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    log.error('Fatal error in mercadopago-process-booking-payment:', error);
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
