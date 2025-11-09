/**
 * Supabase Edge Function: mercadopago-create-preference
 *
 * Crea una preferencia de pago en Mercado Pago para depósitos al wallet.
 * MIGRADO A SDK OFICIAL DE MERCADOPAGO
 *
 * Flujo:
 * 1. Frontend inicia depósito → llama a wallet_initiate_deposit() en Supabase
 * 2. wallet_initiate_deposit() crea transaction en DB con status 'pending'
 * 3. Frontend llama a esta Edge Function con transaction_id
 * 4. Edge Function crea preference en Mercado Pago usando SDK oficial
 * 5. Retorna init_point (URL de checkout) al frontend
 * 6. Usuario completa pago en Mercado Pago
 * 7. Webhook de MP confirma pago → llama a wallet_confirm_deposit()
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
interface CreatePreferenceRequest {
  transaction_id: string;
  amount: number;
  description?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verificar variables de entorno - PRODUCTION TOKEN (NO FALLBACK)
    const MP_ACCESS_TOKEN_RAW = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');

    if (!MP_ACCESS_TOKEN_RAW) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN environment variable not configured');
    }

    // Limpiar token: remover espacios, saltos de línea, tabs
    const MP_ACCESS_TOKEN = MP_ACCESS_TOKEN_RAW.trim().replace(/[\r\n\t\s]/g, '');

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const APP_BASE_URL = Deno.env.get('APP_BASE_URL') || 'http://localhost:4200';

    // Debug: Log token info
    console.log('MP_ACCESS_TOKEN from env:', !!Deno.env.get('MERCADOPAGO_ACCESS_TOKEN'));
    console.log('MP_ACCESS_TOKEN after cleaning:', !!MP_ACCESS_TOKEN);
    console.log('MP_ACCESS_TOKEN length:', MP_ACCESS_TOKEN?.length);
    console.log('MP_ACCESS_TOKEN prefix:', MP_ACCESS_TOKEN?.substring(0, 15) + '...');
    console.log('MP_ACCESS_TOKEN suffix:', '...' + MP_ACCESS_TOKEN?.substring(MP_ACCESS_TOKEN.length - 10));

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
    const body: CreatePreferenceRequest = await req.json();
    const { transaction_id, amount, description } = body;

    if (!transaction_id || !amount) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: transaction_id, amount' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ========================================
    // VALIDACIÓN DE AUTORIZACIÓN Y OWNERSHIP (CRÍTICA)
    // ========================================

    // Verificar autorización del usuario
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

    // Obtener usuario autenticado desde Supabase
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

    // Verificar que la transacción existe, está pending, y PERTENECE al usuario autenticado
    const { data: transaction, error: txError } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('id', transaction_id)
      .eq('type', 'deposit')
      .eq('status', 'pending')
      .single();

    if (txError || !transaction) {
      return new Response(
        JSON.stringify({ error: 'Transaction not found or invalid' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ========================================
    // VALIDACIÓN CRÍTICA: Ownership
    // ========================================
    if (transaction.user_id !== authenticated_user_id) {
      console.error('SECURITY: User attempting to use transaction from another user', {
        authenticated_user: authenticated_user_id,
        transaction_owner: transaction.user_id,
        transaction_id,
      });

      return new Response(
        JSON.stringify({
          error: 'Unauthorized: This transaction does not belong to you',
          code: 'OWNERSHIP_VIOLATION',
        }),
        {
          status: 403, // Forbidden
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ========================================
    // VALIDACIÓN: Montos dentro de límites
    // ========================================
    if (amount < 10 || amount > 5000) {
      return new Response(
        JSON.stringify({
          error: `Amount must be between $10 and $5,000 (received: $${amount})`,
          code: 'INVALID_AMOUNT',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ========================================
    // VALIDACIÓN: Idempotencia (evitar doble-creación de preference)
    // ========================================
    if (transaction.provider_metadata?.preference_id) {
      // Ya existe una preference para esta transacción
      const existingInitPoint = transaction.provider_metadata.init_point ||
                                 transaction.provider_metadata.sandbox_init_point;

      if (existingInitPoint) {
        console.log('Preference already exists for transaction, returning existing init_point');
        return new Response(
          JSON.stringify({
            success: true,
            preference_id: transaction.provider_metadata.preference_id,
            init_point: existingInitPoint,
            message: 'Using existing preference (idempotent)',
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Obtener información del usuario (email desde auth.users, nombre desde profiles con PII desencriptado)
    const { data: authUser } = await supabase.auth.admin.getUserById(transaction.user_id);
    const { data: profile } = await supabase
      .from('profiles_decrypted')
      .select('full_name, email, phone, dni, gov_id_number, gov_id_type, mercadopago_customer_id')
      .eq('id', transaction.user_id)
      .single();

    // ========================================
    // CUSTOMERS API: Crear u obtener customer
    // Mejora calidad de integración +5-10 puntos
    // ========================================
    let customerId: string | null = profile?.mercadopago_customer_id || null;
    
    if (!customerId) {
      // Crear customer si no existe
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
        email: authUser?.user?.email || profile?.email || `${transaction.user_id}@autorenta.com`,
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
            .eq('id', transaction.user_id);
          
          console.log('✅ Customer creado en MercadoPago:', customerId);
        } else {
          console.warn('⚠️ No se pudo crear customer, continuando sin customer_id');
        }
      } catch (error) {
        console.warn('⚠️ Error creando customer, continuando sin customer_id:', error);
      }
    }

    // ========================================
    // DIVIDIR NOMBRE EN FIRST_NAME Y LAST_NAME
    // Mejora de calidad de integración MercadoPago
    // ========================================
    const fullName = profile?.full_name || authUser?.user?.user_metadata?.full_name || 'Usuario AutoRenta';
    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0] || 'Usuario';
    const lastName = nameParts.slice(1).join(' ') || 'AutoRenta';

    // ========================================
    // LLAMADA DIRECTA A MERCADOPAGO REST API
    // ========================================

    console.log('Creating preference with MercadoPago REST API...');

    const preferenceData = {
      items: [
        {
          // ========================================
          // MEJORAS DE CALIDAD DE INTEGRACIÓN
          // +11 puntos: id, description, category_id
          // ========================================
          id: transaction_id,  // +4 puntos
          title: description || 'Depósito a Wallet - AutoRenta',
          description: `Depósito de ARS ${amount} a tu wallet de AutoRenta para alquileres de vehículos`,  // +3 puntos
          category_id: 'services',  // +4 puntos (servicios financieros)
          quantity: 1,
          unit_price: amount,
          currency_id: 'ARS', // MercadoPago Argentina requiere ARS
        },
      ],
      back_urls: {
        success: `${APP_BASE_URL}/wallet?payment=success&transaction_id=${transaction_id}`,
        failure: `${APP_BASE_URL}/wallet?payment=failure&transaction_id=${transaction_id}`,
        pending: `${APP_BASE_URL}/wallet?payment=pending&transaction_id=${transaction_id}`,
      },
      auto_return: 'approved', // Redirección automática solo cuando el pago es aprobado
      external_reference: transaction_id,
      notification_url: `${SUPABASE_URL}/functions/v1/mercadopago-webhook`,

      // ========================================
      // MÉTODOS DE PAGO - Configuración Completa
      // ========================================
      payment_methods: {
        // Habilitar todos los métodos de pago disponibles
        excluded_payment_methods: [], // No excluir ningún método
        excluded_payment_types: [],   // No excluir ningún tipo

        // Configurar cuotas
        installments: 12,              // Permitir hasta 12 cuotas
        default_installments: 1,       // Por defecto sin cuotas
      },

      // ========================================
      // OPCIONES DE EXPERIENCIA DE USUARIO
      // ========================================
      statement_descriptor: 'AUTORENTAR',  // Aparece en el resumen de tarjeta

      // Configuración adicional
      binary_mode: false,  // Permitir pagos pendientes (efectivo, transferencia)
      expires: true,       // La preference expira después de 30 días
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 días
    };

    // ========================================
    // PAYER INFO MEJORADO
    // +10 puntos: first_name, last_name
    // +5 puntos: phone
    // +10 puntos: identification (DNI)
    // ========================================
    
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

    preferenceData.payer = {
      email: authUser?.user?.email || profile?.email || `${transaction.user_id}@autorenta.com`,
      first_name: firstName,  // +5 puntos
      last_name: lastName,    // +5 puntos
      ...(phoneFormatted && { phone: phoneFormatted }),  // +5 puntos
      ...(identification && { identification }),  // +10 puntos
      ...(customerId && { id: customerId }),  // +5-10 puntos (Customers API)
    };

    console.log('Preference data:', JSON.stringify(preferenceData, null, 2));

    // Llamar a MercadoPago REST API directamente
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

    // Actualizar transacción con preference_id
    await supabase
      .from('wallet_transactions')
      .update({
        provider_metadata: {
          ...(transaction.provider_metadata || {}),
          preference_id: mpData.id,
          init_point: mpData.init_point,
          sandbox_init_point: mpData.sandbox_init_point,
          created_at: new Date().toISOString(),
        },
      })
      .eq('id', transaction_id);

    // Retornar URL de checkout (init_point funciona en web y móvil)
    return new Response(
      JSON.stringify({
        success: true,
        preference_id: mpData.id,
        init_point: mpData.init_point,
        sandbox_init_point: mpData.sandbox_init_point,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error creating MercadoPago preference:', error);

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
