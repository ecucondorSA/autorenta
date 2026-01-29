// ============================================
// EDGE FUNCTION: mercadopago-oauth-connect
// Propósito: Inicia flujo OAuth con MercadoPago
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';


interface ConnectRequest {
  redirect_uri?: string; // Override del redirect URI (para desarrollo)
}

serve(async (req) => {
  // ✅ SECURITY: CORS con whitelist de dominios permitidos
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ============================================
    // 1. VALIDAR AUTENTICACIÓN
    // ============================================

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Crear cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Verificar usuario
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[Auth Error]', authError);
      return new Response(
        JSON.stringify({ error: 'Usuario no autenticado' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[OAuth Connect] User: ${user.id}`);

    // ============================================
    // 2. OBTENER CREDENCIALES DE MERCADOPAGO
    // ============================================

    const MP_CLIENT_ID = Deno.env.get('MERCADOPAGO_APPLICATION_ID')!;
    const MP_CLIENT_SECRET = Deno.env.get('MERCADOPAGO_CLIENT_SECRET');

    if (!MP_CLIENT_ID) {
      console.error('[Config Error] MERCADOPAGO_APPLICATION_ID not set');
      return new Response(
        JSON.stringify({
          error: 'Configuración de MercadoPago incompleta',
          details: 'MERCADOPAGO_APPLICATION_ID no configurado',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[MP Config] Client ID: ${MP_CLIENT_ID}`);

    // ============================================
    // 3. PARSEAR REQUEST BODY (OPCIONAL)
    // ============================================

    let requestData: ConnectRequest = {};
    if (req.method === 'POST') {
      try {
        requestData = await req.json();
      } catch (e) {
        // No body, usar defaults
        console.log('[OAuth Connect] No request body, using defaults');
      }
    }

    // ============================================
    // 4. DETERMINAR REDIRECT URI
    // ============================================

    // Redirect URIs permitidos
    const PRODUCTION_REDIRECT = Deno.env.get('MERCADOPAGO_OAUTH_REDIRECT_URI') ||
      'https://autorentar.com/auth/mercadopago/callback';
    const DEV_REDIRECT = Deno.env.get('MERCADOPAGO_OAUTH_REDIRECT_URI_DEV') ||
      'http://localhost:4200/auth/mercadopago/callback';

    // Determinar environment
    const isProduction = Deno.env.get('NODE_ENV') === 'production' ||
      Deno.env.get('DENO_ENV') === 'production';

    // Usar redirect proporcionado o default según environment
    const redirectUri = requestData.redirect_uri ||
      (isProduction ? PRODUCTION_REDIRECT : DEV_REDIRECT);

    console.log(`[OAuth] Redirect URI: ${redirectUri}`);
    console.log(`[OAuth] Environment: ${isProduction ? 'production' : 'development'}`);

    // ============================================
    // 5. GENERAR STATE (SEGURIDAD)
    // ============================================

  // State = user_id + random token (para verificar en callback)
  // Usar URL-safe base64 para evitar corrupción por MercadoPago
  const randomToken = crypto.randomUUID();
  const stateJson = JSON.stringify({
    user_id: user.id,
    token: randomToken,
    timestamp: Date.now(),
    // Guardamos el redirect_uri usado para que el callback lo re-utilice
    redirect_uri: redirectUri,
  });

    // Convertir a base64 URL-safe (reemplazar +/= por -_)
    const state = btoa(stateJson)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    console.log(`[OAuth] Generated state for user: ${user.id}`);
    console.log(`[OAuth] State value: ${state}`);
    console.log(`[OAuth] State length: ${state.length}`);

    // Guardar state en profiles (temporal, para validar en callback)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        // Guardamos el state temporalmente
        // Lo verificaremos en el callback
        mercadopago_oauth_state: state,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[DB Error] Could not save state:', updateError);
      // DEBUG: Retornar error detallado para diagnóstico
      return new Response(
        JSON.stringify({
          error: 'Error guardando state en DB',
          details: updateError.message,
          code: updateError.code,
          hint: updateError.hint,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ============================================
    // 6. CONSTRUIR URL DE AUTORIZACIÓN
    // ============================================

    const authUrl = new URL('https://auth.mercadopago.com.ar/authorization');
    authUrl.searchParams.set('client_id', MP_CLIENT_ID);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('platform_id', 'mp');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);

    const authorizationUrl = authUrl.toString();

    console.log(`[OAuth] Authorization URL generated`);
    console.log(`[OAuth] URL length: ${authorizationUrl.length} chars`);

    // ============================================
    // 7. RETORNAR RESPONSE
    // ============================================

    return new Response(
      JSON.stringify({
        success: true,
        authorization_url: authorizationUrl,
        redirect_uri: redirectUri,
        state,
        message: 'Redirige al usuario a authorization_url para conectar MercadoPago',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[OAuth Connect Error]', error);

    return new Response(
      JSON.stringify({
        error: 'Error al iniciar conexión con MercadoPago',
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

/* ============================================
 * DOCUMENTACIÓN DE USO
 * ============================================
 *
 * ## Request
 *
 * POST /functions/v1/mercadopago-oauth-connect
 * Headers:
 *   Authorization: Bearer <USER_JWT_TOKEN>
 *   Content-Type: application/json
 *
 * Body (opcional):
 * {
 *   "redirect_uri": "http://localhost:4200/auth/mercadopago/callback" // Override para dev
 * }
 *
 * ## Response (Success)
 *
 * {
 *   "success": true,
 *   "authorization_url": "https://auth.mercadopago.com.ar/authorization?client_id=...",
 *   "redirect_uri": "http://localhost:4200/auth/mercadopago/callback",
 *   "state": "eyJ1c2VyX2lkIjoi...",
 *   "message": "Redirige al usuario a authorization_url para conectar MercadoPago"
 * }
 *
 * ## Frontend Integration
 *
 * ```typescript
 * async function connectMercadoPago() {
 *   const { data } = await supabase.functions.invoke('mercadopago-oauth-connect', {
 *     body: { redirect_uri: window.location.origin + '/auth/mercadopago/callback' }
 *   });
 *
 *   if (data.success) {
 *     // Redirigir a MercadoPago para autorización
 *     window.location.href = data.authorization_url;
 *   }
 * }
 * ```
 *
 * ## Variables de Entorno Requeridas
 *
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - MERCADOPAGO_APPLICATION_ID
 * - MERCADOPAGO_CLIENT_SECRET (opcional en connect, requerido en callback)
 * - MERCADOPAGO_OAUTH_REDIRECT_URI (producción)
 * - MERCADOPAGO_OAUTH_REDIRECT_URI_DEV (desarrollo)
 *
 * ============================================ */
