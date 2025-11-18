import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { enforceRateLimit, RateLimitError } from '../_shared/rate-limiter.ts';

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
      // Don't block on rate limiter errors - fail open for availability
      console.error('[RateLimit] Error enforcing rate limit:', error);
    }

    // Verificar variables de entorno
    const MP_ACCESS_TOKEN_RAW = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!MP_ACCESS_TOKEN_RAW) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN environment variable not configured');
    }

    const MP_ACCESS_TOKEN = MP_ACCESS_TOKEN_RAW.trim().replace(/[\r\n\t\s]/g, '');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const MP_MARKETPLACE_ID = Deno.env.get('MERCADOPAGO_MARKETPLACE_ID');

    if (!MP_ACCESS_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error('Missing required environment variables');
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
        car:cars(*, owner:users!cars_owner_id_fkey(
          id,
          mercadopago_collector_id,
          mercadopago_access_token,
          mercadopago_connected,
          marketplace_approved
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

    // Obtener perfil del usuario
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, first_name, last_name, phone, gov_id_number, gov_id_type, dni')
      .eq('id', user.id)
      .single();

    // Obtener owner para split payment
    const owner = booking.car?.owner;
    const shouldSplit = owner?.mercadopago_collector_id && owner?.marketplace_approved;

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

    const platformFee = shouldSplit ? Math.round(totalAmount * 0.15 * 100) / 100 : 0;
    const ownerAmount = shouldSplit ? totalAmount - platformFee : 0;

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

    // ✅ MEJORA: Usar OAuth token del vendedor para split payments
    const accessTokenToUse = shouldSplit && owner?.mercadopago_access_token && owner?.mercadopago_connected
      ? owner.mercadopago_access_token.trim().replace(/[\r\n\t\s]/g, '')
      : MP_ACCESS_TOKEN;

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
        is_marketplace_split: shouldSplit,
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

    console.log('Processing booking payment with MercadoPago:', {
      booking_id,
      amount: totalAmount,
      split: shouldSplit,
      using_oauth: shouldSplit && owner?.mercadopago_access_token ? true : false,
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
      console.error('MercadoPago API Error:', errorData);

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
    console.log('MercadoPago Payment Response:', mpData);

    // Actualizar booking con información del pago
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        mercadopago_payment_id: mpData.id.toString(),
        mercadopago_preference_id: null, // Ya no necesitamos preference
        status: mpData.status === 'approved' ? 'confirmed' : 'pending_payment',
        payment_status: mpData.status,
        payment_status_detail: mpData.status_detail,
        payment_method_id: mpData.payment_method_id,
        card_last4: mpData.card?.last_four_digits,
        card_holder_name: mpData.card?.cardholder?.name,
        updated_at: new Date().toISOString(),
      })
      .eq('id', booking_id);

    if (updateError) {
      console.error('Error updating booking:', updateError);
      // No fallar el pago si la actualización falla, el webhook lo hará
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
    console.error('Fatal error in mercadopago-process-booking-payment:', error);
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

