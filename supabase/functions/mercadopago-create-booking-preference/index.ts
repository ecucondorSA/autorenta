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
import { getCorsHeaders } from '../_shared/cors.ts';

// Tipos
interface CreateBookingPreferenceRequest {
  booking_id: string;
  use_split_payment?: boolean;  // Opcional: indica si el usuario eligió pagar con cuenta MP
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
    const MP_ACCESS_TOKEN_RAW = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');

    if (!MP_ACCESS_TOKEN_RAW) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN environment variable not configured');
    }

    // Limpiar token
    const MP_ACCESS_TOKEN = MP_ACCESS_TOKEN_RAW.trim().replace(/[\r\n\t\s]/g, '');

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const APP_BASE_URL = Deno.env.get('APP_BASE_URL') || 'http://localhost:4200';
    const MP_MARKETPLACE_ID = Deno.env.get('MERCADOPAGO_MARKETPLACE_ID');
    const MP_APPLICATION_ID = Deno.env.get('MERCADOPAGO_APPLICATION_ID');

    if (!MP_ACCESS_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error('Missing required environment variables');
    }

    // Validar marketplace configurado si se requiere split payment
    // Nota: Esto se validará después de obtener los datos del booking

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
    const { booking_id, use_split_payment = false } = body;

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

    // Obtener el booking con información del propietario
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *, 
        car:cars(
          id, 
          title, 
          owner_id,
          owner:users!cars_owner_id_fkey(
            id,
            mercadopago_collector_id,
            marketplace_approved
          )
        )
      `)
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
      .select('full_name, email, phone, dni, gov_id_number, gov_id_type, mercadopago_customer_id')
      .eq('id', booking.renter_id)
      .single();

    // ========================================
    // CUSTOMERS API: Crear u obtener customer
    // Mejora calidad de integración +5-10 puntos
    // ========================================
    let customerId: string | null = profile?.mercadopago_customer_id || null;
    
    if (!customerId) {
      // Crear customer si no existe (mismo código que en create-preference)
      const fullName = profile?.full_name || authUser?.user?.user_metadata?.full_name || 'Usuario AutoRenta';
      const nameParts = fullName.trim().split(' ');
      const firstName = nameParts[0] || 'Usuario';
      const lastName = nameParts.slice(1).join(' ') || 'AutoRenta';

      // Formatear phone
      let phoneFormatted: { area_code: string; number: string } | undefined;
      if (profile?.phone) {
        const phoneCleaned = profile.phone.replace(/[^0-9]/g, '');
        const phoneWithoutCountry = phoneCleaned.startsWith('54') 
          ? phoneCleaned.substring(2) 
          : phoneCleaned;
        const areaCode = phoneWithoutCountry.substring(0, 2) || '11';
        const number = phoneWithoutCountry.substring(2) || '';
        if (number.length >= 8) {
          phoneFormatted = { area_code: areaCode, number: number };
        }
      }

      // Obtener DNI
      const dniNumber = profile?.gov_id_number || profile?.dni;
      const dniType = profile?.gov_id_type || 'DNI';
      let identification: { type: string; number: string } | undefined;
      if (dniNumber) {
        const dniCleaned = dniNumber.replace(/[^0-9]/g, '');
        if (dniCleaned.length >= 7) {
          identification = { type: dniType.toUpperCase(), number: dniCleaned };
        }
      }

      // Crear customer en MercadoPago
      const customerData: any = {
        email: authUser?.user?.email || profile?.email || `${booking.renter_id}@autorenta.com`,
        first_name: firstName,
        last_name: lastName,
        ...(phoneFormatted && { phone: phoneFormatted }),
        ...(identification && { identification }),
      };

      try {
        const customerResponse = await fetch('https://api.mercadopago.com/v1/customers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
          },
          body: JSON.stringify(customerData),
        });

        if (customerResponse.ok) {
          const customer = await customerResponse.json();
          customerId = customer.id.toString();
          
          // Guardar customer_id en profile
          await supabase
            .from('profiles')
            .update({ mercadopago_customer_id: customerId })
            .eq('id', booking.renter_id);
          
          console.log('✅ Customer creado en MercadoPago:', customerId);
        } else {
          console.warn('⚠️ No se pudo crear customer, continuando sin customer_id');
        }
      } catch (error) {
        console.warn('⚠️ Error creando customer, continuando sin customer_id:', error);
      }
    }

    // Obtener primera foto del auto para picture_url
    const { data: carPhoto } = await supabase
      .from('car_photos')
      .select('url')
      .eq('car_id', booking.car_id)
      .order('position', { ascending: true })
      .limit(1)
      .single();

    // Dividir nombre en first_name y last_name
    const fullName = profile?.full_name || authUser?.user?.user_metadata?.full_name || 'Usuario AutoRenta';
    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0] || 'Usuario';
    const lastName = nameParts.slice(1).join(' ') || 'AutoRenta';

    // ========================================
    // VERIFICAR MARKETPLACE SPLIT
    // ========================================

    const owner = booking.car?.owner;

    // Split payments config
    const ENABLE_SPLIT_PAYMENTS = Deno.env.get('MERCADOPAGO_ENABLE_SPLIT_PAYMENTS') === 'true';

    // Determinar si aplicar split:
    // 1. Flag global habilitado
    // 2. Usuario eligió pagar con cuenta MP (use_split_payment)
    // 3. Owner tiene collector_id configurado
    const shouldSplit = ENABLE_SPLIT_PAYMENTS &&
                       use_split_payment &&
                       owner?.marketplace_approved &&
                       owner?.mercadopago_collector_id;
    
    let platformFee = 0;
    let ownerAmount = 0;
    
    if (shouldSplit) {
      // Validar que marketplace esté configurado
      if (!MP_MARKETPLACE_ID) {
        console.error('❌ MERCADOPAGO_MARKETPLACE_ID not configured - cannot create split payment');
        return new Response(
          JSON.stringify({
            error: 'MARKETPLACE_NOT_CONFIGURED',
            code: 'MARKETPLACE_NOT_CONFIGURED',
            message:
              'El marketplace de MercadoPago no está configurado. No se pueden procesar pagos divididos.',
            meta: {
              booking_id,
              owner_id: owner?.id ?? booking.car?.owner_id,
            },
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Calcular split 85/15
      const { data: splitData } = await supabase.rpc('calculate_payment_split', {
        p_total_amount_cents: Math.round(amountARS * 100)
      });

      if (splitData) {
        ownerAmount = splitData.owner_amount_cents / 100;
        platformFee = splitData.platform_fee_cents / 100;

        console.log(`💰 Split Payment ENABLED:
          Mode: ACCOUNT_MONEY only (no cards)
          Total: ${amountARS} ARS
          Owner (85%): ${ownerAmount} ARS
          Platform (15%): ${platformFee} ARS
          Collector ID: ${owner.mercadopago_collector_id}
          Marketplace ID: ${MP_MARKETPLACE_ID}
        `);
      }
    } else if (use_split_payment && !ENABLE_SPLIT_PAYMENTS) {
      console.warn('⚠️ User requested split payment but ENABLE_SPLIT_PAYMENTS is false');
    } else if (!use_split_payment) {
      console.log('💳 Traditional Payment: All payment methods accepted (cards, cash, etc.)');
    } else {
      console.warn('⚠️ Blocking preference: owner not marketplace approved or missing collector_id', {
        owner_id: owner?.id ?? booking.car?.owner_id,
        marketplace_approved: owner?.marketplace_approved ?? null,
        collector_id: owner?.mercadopago_collector_id ?? null,
      });

      return new Response(
        JSON.stringify({
          error: 'OWNER_ONBOARDING_REQUIRED',
          code: 'OWNER_ONBOARDING_REQUIRED',
          message:
            'El propietario todavía no completó la vinculación de Mercado Pago. La reserva permanecerá pendiente hasta que se conecte.',
          meta: {
            booking_id,
            owner_id: owner?.id ?? booking.car?.owner_id,
            marketplace_approved: owner?.marketplace_approved ?? false,
            collector_id: owner?.mercadopago_collector_id ?? null,
          },
        }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

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
          ...(carPhoto?.url && { picture_url: carPhoto.url }),  // +3 puntos de calidad
        },
      ],
      back_urls: {
        success: `${APP_BASE_URL}/bookings/success/${booking_id}?from_mp=true&payment=success`,
        failure: `${APP_BASE_URL}/bookings/success/${booking_id}?from_mp=true&payment=failure`,
        pending: `${APP_BASE_URL}/bookings/success/${booking_id}?from_mp=true&payment=pending`,
      },
      auto_return: 'approved',
      external_reference: booking_id,
      notification_url: `${SUPABASE_URL}/functions/v1/mercadopago-webhook`,

      // Métodos de pago
      payment_methods: shouldSplit ? {
        // Si usa split: SOLO saldo de cuenta MercadoPago
        excluded_payment_types: [
          { id: 'credit_card' },
          { id: 'debit_card' },
          { id: 'ticket' },        // Efectivo (Rapipago, Pago Fácil)
          { id: 'bank_transfer' },
          { id: 'atm' },
        ],
        installments: 1,  // Solo 1 cuota con cuenta MP
        default_installments: 1,
      } : {
        // Si NO usa split: todos los métodos de pago
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

      payer: (() => {
        // Formatear phone para MercadoPago (Argentina: +54)
        let phoneFormatted: { area_code: string; number: string } | undefined;
        if (profile?.phone) {
          const phoneCleaned = profile.phone.replace(/[^0-9]/g, '');
          // Si empieza con 54 (código de Argentina), removerlo
          const phoneWithoutCountry = phoneCleaned.startsWith('54') 
            ? phoneCleaned.substring(2) 
            : phoneCleaned;
          // Área code: primeros 2-3 dígitos (ej: 11 para Buenos Aires, 341 para Rosario)
          const areaCode = phoneWithoutCountry.substring(0, 2) || '11';
          const number = phoneWithoutCountry.substring(2) || '';
          if (number.length >= 8) {
            phoneFormatted = {
              area_code: areaCode,
              number: number,
            };
          }
        }

        // Obtener DNI (preferir gov_id_number, fallback a dni)
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

        return {
          email: authUser?.user?.email || profile?.email || `${booking.renter_id}@autorenta.com`,
          first_name: firstName,
          last_name: lastName,
          ...(phoneFormatted && { phone: phoneFormatted }),  // +5 puntos de calidad
          ...(identification && { identification }),  // +10 puntos de calidad
          ...(customerId && { id: customerId }),  // +5-10 puntos (Customers API)
        };
      })(),

      // MARKETPLACE SPLIT (si aplica)
      ...(shouldSplit && {
        marketplace: MP_MARKETPLACE_ID || undefined,
        marketplace_fee: platformFee,
        collector_id: owner.mercadopago_collector_id,
      }),

      // Metadata adicional
      metadata: {
        booking_id: booking_id,
        renter_id: booking.renter_id,
        car_id: booking.car_id,
        owner_id: booking.car?.owner_id,
        amount_usd: amountUSD,
        exchange_rate: platformRate,
        payment_type: 'booking',
        is_marketplace_split: shouldSplit,
        platform_fee_ars: platformFee,
        owner_amount_ars: ownerAmount,
        collector_id: owner?.mercadopago_collector_id || null,
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
