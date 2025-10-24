/**
 * Supabase Edge Function: mercadopago-create-booking-preference
 *
 * Crea una preferencia de pago en Mercado Pago para pagos de bookings.
 *
 * Flujo:
 * 1. Frontend llama a esta función con booking_id
 * 2. Valida que el booking pertenece al usuario autenticado
 * 3. Obtiene la tasa de cambio USD → ARS
 * 4. Convierte el monto del booking a ARS
 * 5. Crea preference en Mercado Pago
 * 6. Retorna init_point (URL de checkout) al frontend
 * 7. Usuario completa pago en Mercado Pago
 * 8. Webhook de MP confirma pago → actualiza booking
 *
 * Environment Variables Required:
 * - MERCADOPAGO_ACCESS_TOKEN: Access token de Mercado Pago
 * - SUPABASE_URL: URL del proyecto Supabase
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key de Supabase
 * - APP_BASE_URL: URL base de la app (para success/failure URLs)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Tipos
interface CreateBookingPreferenceRequest {
  booking_id: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verificar variables de entorno
    const MP_ACCESS_TOKEN_RAW = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');

    if (!MP_ACCESS_TOKEN_RAW) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN environment variable not configured');
    }

    // Limpiar token
    const MP_ACCESS_TOKEN = MP_ACCESS_TOKEN_RAW.trim().replace(/[\r\n\t\s]/g, '');

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const APP_BASE_URL = Deno.env.get('APP_BASE_URL') || 'http://localhost:4200';

    if (!MP_ACCESS_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error('Missing required environment variables');
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
    const body: CreateBookingPreferenceRequest = await req.json();
    const { booking_id } = body;

    if (!booking_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: booking_id' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ========================================
    // VALIDACIÓN DE AUTORIZACIÓN Y OWNERSHIP
    // ========================================

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

    // Crear cliente de Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Obtener usuario autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const authenticated_user_id = user.id;

    // Obtener el booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*, car:cars(id, title, owner_id)')
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: 'Booking not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validar ownership (debe ser el renter)
    if (booking.renter_id !== authenticated_user_id) {
      console.error('SECURITY: User attempting to pay for booking from another user', {
        authenticated_user: authenticated_user_id,
        booking_renter: booking.renter_id,
        booking_id,
      });

      return new Response(
        JSON.stringify({
          error: 'Unauthorized: This booking does not belong to you',
          code: 'OWNERSHIP_VIOLATION',
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validar que el booking esté en estado 'pending' (pendiente de pago)
    if (booking.status !== 'pending') {
      return new Response(
        JSON.stringify({
          error: `Booking is not pending payment (current status: ${booking.status})`,
          code: 'INVALID_BOOKING_STATUS',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ========================================
    // OBTENER TASA DE CAMBIO Y CONVERTIR USD → ARS
    // ========================================

    // ========================================
    // DETERMINAR MONTO EN ARS
    // ========================================

    let amountARS: number;
    let amountUSD: number;
    let platformRate = 0;

    // Si el booking ya está en ARS, usar directamente
    if (booking.currency === 'ARS') {
      amountARS = booking.total_amount;
      // No necesitamos conversión, pero calculamos USD equivalente para metadata
      const { data: exchangeRate } = await supabase
        .from('exchange_rates')
        .select('platform_rate')
        .eq('pair', 'USDTARS')
        .eq('is_active', true)
        .order('last_updated', { ascending: false })
        .limit(1)
        .single();

      platformRate = exchangeRate?.platform_rate || 1015.0;
      amountUSD = Math.round((amountARS / platformRate) * 100) / 100;

      console.log(`💵 Booking ya en ARS: ${amountARS} ARS = ~${amountUSD} USD (rate: ${platformRate})`);
    } else {
      // Booking en USD, convertir a ARS
      amountUSD = booking.total_amount;

      const { data: exchangeRate, error: rateError } = await supabase
        .from('exchange_rates')
        .select('platform_rate')
        .eq('pair', 'USDTARS')
        .eq('is_active', true)
        .order('last_updated', { ascending: false })
        .limit(1)
        .single();

      platformRate = exchangeRate?.platform_rate || 1015.0;

      if (rateError) {
        console.warn('⚠️ No exchange rate found, using fallback:', platformRate);
      }

      amountARS = Math.round(amountUSD * platformRate * 100) / 100;

      console.log(`💱 Conversión: ${amountUSD} USD → ${amountARS} ARS (rate: ${platformRate})`);
    }

    // Validar monto
    if (amountARS < 100 || amountARS > 10000000) {
      return new Response(
        JSON.stringify({
          error: `Amount must be between $100 and $10,000,000 ARS (received: $${amountARS})`,
          code: 'INVALID_AMOUNT',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ========================================
    // IDEMPOTENCIA: Verificar si ya existe preference
    // ========================================
    if (booking.mercadopago_preference_id) {
      console.log('Preference already exists for booking, checking if still valid...');

      // Intentar obtener la preference existente de MercadoPago
      try {
        const existingPrefResponse = await fetch(
          `https://api.mercadopago.com/checkout/preferences/${booking.mercadopago_preference_id}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
            },
          }
        );

        if (existingPrefResponse.ok) {
          const existingPref = await existingPrefResponse.json();

          // Si la preference existe y no expiró, retornarla
          if (existingPref.init_point) {
            console.log('Returning existing valid preference');
            return new Response(
              JSON.stringify({
                success: true,
                preference_id: existingPref.id,
                init_point: existingPref.init_point,
                sandbox_init_point: existingPref.sandbox_init_point,
                message: 'Using existing preference (idempotent)',
              }),
              {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              }
            );
          }
        }
      } catch (err) {
        console.warn('Could not fetch existing preference, creating new one:', err);
      }
    }

    // Obtener información del usuario
    const { data: authUser } = await supabase.auth.admin.getUserById(booking.renter_id);
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email, phone')
      .eq('id', booking.renter_id)
      .single();

    // Dividir nombre en first_name y last_name
    const fullName = profile?.full_name || authUser?.user?.user_metadata?.full_name || 'Usuario AutoRenta';
    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0] || 'Usuario';
    const lastName = nameParts.slice(1).join(' ') || 'AutoRenta';

    // ========================================
    // CREAR PREFERENCE EN MERCADOPAGO
    // ========================================

    console.log('Creating booking preference with MercadoPago REST API...');

    const carTitle = booking.car?.title || 'Vehículo';
    const startDate = new Date(booking.start_date).toLocaleDateString('es-AR');
    const endDate = new Date(booking.end_date).toLocaleDateString('es-AR');

    const preferenceData = {
      items: [
        {
          id: booking_id,
          title: `Alquiler de ${carTitle}`,
          description: `Reserva de ${carTitle} desde ${startDate} hasta ${endDate}`,
          category_id: 'car_rental',
          quantity: 1,
          unit_price: amountARS,
          currency_id: 'ARS',
        },
      ],
      back_urls: {
        success: `${APP_BASE_URL}/bookings/${booking_id}?payment=success`,
        failure: `${APP_BASE_URL}/bookings/${booking_id}?payment=failure`,
        pending: `${APP_BASE_URL}/bookings/${booking_id}?payment=pending`,
      },
      auto_return: 'approved',
      external_reference: booking_id,
      notification_url: `${SUPABASE_URL}/functions/v1/mercadopago-webhook`,

      // Métodos de pago
      payment_methods: {
        excluded_payment_methods: [],
        excluded_payment_types: [],
        installments: 12,
        default_installments: 1,
      },

      statement_descriptor: 'AUTORENTAR',
      binary_mode: false,
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 horas

      payer: {
        email: authUser?.user?.email || profile?.email || `${booking.renter_id}@autorenta.com`,
        first_name: firstName,
        last_name: lastName,
      },

      // Metadata adicional
      metadata: {
        booking_id: booking_id,
        renter_id: booking.renter_id,
        car_id: booking.car_id,
        amount_usd: amountUSD,
        exchange_rate: platformRate,
        payment_type: 'booking',
      },
    };

    console.log('Preference data:', JSON.stringify(preferenceData, null, 2));

    // Llamar a MercadoPago REST API
    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(preferenceData),
    });

    if (!mpResponse.ok) {
      const errorData = await mpResponse.json();
      console.error('MercadoPago API Error:', errorData);
      throw new Error(`MercadoPago API error: ${JSON.stringify(errorData)}`);
    }

    const mpData = await mpResponse.json();

    console.log('MercadoPago API Response:', JSON.stringify(mpData, null, 2));

    // Actualizar booking con preference_id
    await supabase
      .from('bookings')
      .update({
        mercadopago_preference_id: mpData.id,
        mercadopago_init_point: mpData.init_point,
      })
      .eq('id', booking_id);

    // Retornar URL de checkout
    return new Response(
      JSON.stringify({
        success: true,
        preference_id: mpData.id,
        init_point: mpData.init_point,
        sandbox_init_point: mpData.sandbox_init_point,
        amount_ars: amountARS,
        amount_usd: amountUSD,
        exchange_rate: platformRate,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error creating MercadoPago booking preference:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
        details: error instanceof Error ? error.stack : undefined,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
