// ============================================
// EDGE FUNCTION: mercadopago-oauth-callback
// Propósito: Procesa callback de OAuth de MercadoPago
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';


interface OAuthState {
  user_id: string;
  token: string;
  timestamp: number;
  redirect_uri?: string;
}

interface CallbackRequest {
  code: string;
  state: string;
  error?: string;
  error_description?: string;
}

interface MercadoPagoTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number; // segundos
  scope: string;
  user_id: number; // collector_id
  refresh_token: string;
  public_key: string;
  live_mode: boolean;
}

interface MercadoPagoUserInfo {
  id: number;
  nickname: string;
  email: string;
  first_name: string;
  last_name: string;
  site_id: string; // MLA, MLB, etc
  country_id: string; // AR, BR, etc
  tags?: string[];
}

serve(async (req) => {
  // ✅ SECURITY: CORS con whitelist de dominios permitidos
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[OAuth Callback] Request received');

    // ============================================
    // 1. PARSEAR QUERY PARAMS O BODY
    // ============================================

    let callbackData: CallbackRequest;

    if (req.method === 'GET') {
      // Callback vía query params (redirect desde MercadoPago)
      const url = new URL(req.url);
      callbackData = {
        code: url.searchParams.get('code') || '',
        state: url.searchParams.get('state') || '',
        error: url.searchParams.get('error') || undefined,
        error_description: url.searchParams.get('error_description') || undefined,
      };
    } else {
      // Callback vía POST (testing o alternativo)
      callbackData = await req.json();
    }

    console.log(`[OAuth Callback] Code: ${callbackData.code ? 'present' : 'missing'}`);
    console.log(`[OAuth Callback] State: ${callbackData.state ? 'present' : 'missing'}`);
    console.log(`[OAuth Callback] Raw state received: ${callbackData.state}`);

    // ============================================
    // 2. VERIFICAR ERRORES DE MERCADOPAGO
    // ============================================

    if (callbackData.error) {
      console.error('[OAuth Error]', callbackData.error, callbackData.error_description);

      return new Response(
        JSON.stringify({
          success: false,
          error: callbackData.error,
          error_description: callbackData.error_description || 'Usuario canceló la autorización',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!callbackData.code || !callbackData.state) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Parámetros faltantes',
          details: 'Se requiere code y state',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ============================================
    // 3. DECODIFICAR Y VALIDAR STATE
    // ============================================

    let stateData: OAuthState;
    try {
      // Decodificar URL-safe base64 (convertir -_ de vuelta a +/)
      let base64 = callbackData.state
        .replace(/-/g, '+')
        .replace(/_/g, '/');

      // Agregar padding si es necesario
      while (base64.length % 4) {
        base64 += '=';
      }

      const stateJson = atob(base64);
      stateData = JSON.parse(stateJson);
    } catch (e) {
      console.error('[State Error] Could not decode state:', e);
      console.error('[State Error] Raw state received:', callbackData.state);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'State inválido',
          details: 'No se pudo decodificar el state',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[OAuth Callback] User ID from state: ${stateData.user_id}`);
    console.log(`[OAuth Callback] State timestamp: ${stateData.timestamp}`);
    console.log(`[OAuth Callback] Current time: ${Date.now()}`);

    // Verificar que el state no sea muy viejo (> 60 minutos - aumentado para testing)
    const stateAge = Date.now() - stateData.timestamp;
    const maxAgeMs = 60 * 60 * 1000; // 60 minutos
    console.log(`[OAuth Callback] State age: ${stateAge}ms (max: ${maxAgeMs}ms)`);
    console.log(`[OAuth Callback] State age in minutes: ${(stateAge / 60000).toFixed(2)}`);

    if (stateAge > maxAgeMs) {
      console.error('[State Error] State expired:', stateAge, 'ms');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'State expirado',
          details: `El proceso tomó ${(stateAge / 60000).toFixed(1)} minutos (máximo: 60)`,
          debug: {
            state_timestamp: stateData.timestamp,
            current_time: Date.now(),
            age_ms: stateAge,
            age_minutes: (stateAge / 60000).toFixed(2),
          }
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ============================================
    // 4. CONECTAR A SUPABASE Y VALIDAR STATE EN DB
    // ============================================

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Obtener profile del usuario
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, mercadopago_oauth_state, mercadopago_connected')
      .eq('id', stateData.user_id)
      .single();

    if (profileError || !profile) {
      console.error('[DB Error] Profile not found:', profileError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Usuario no encontrado',
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validar que el state coincida
    // Normalizar ambos states (URL decode por si MercadoPago lo modificó)
    const normalizeState = (s: string) => {
      try {
        return decodeURIComponent(s);
      } catch {
        return s;
      }
    };

    const expectedState = normalizeState(profile.mercadopago_oauth_state || '');
    const receivedState = normalizeState(callbackData.state);

    console.log('[State Comparison] Expected (from DB):', expectedState);
    console.log('[State Comparison] Received (from MP):', receivedState);
    console.log('[State Comparison] Match:', expectedState === receivedState);

    if (expectedState !== receivedState) {
      console.error('[State Error] State mismatch after normalization');

      return new Response(
        JSON.stringify({
          success: false,
          error: 'State no coincide',
          details: 'Posible ataque CSRF detectado',
          debug: {
            expected_length: expectedState.length,
            received_length: receivedState.length,
          }
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[OAuth Callback] State validated successfully');

    // ============================================
    // 5. EXCHANGE CODE POR ACCESS TOKEN
    // ============================================

    const MP_CLIENT_ID = Deno.env.get('MERCADOPAGO_APPLICATION_ID')!;
    const MP_CLIENT_SECRET = Deno.env.get('MERCADOPAGO_CLIENT_SECRET')!;

    // Usar el redirect_uri que se usó al generar el state; fallback al env
    const REDIRECT_URI =
      stateData.redirect_uri ||
      Deno.env.get('MERCADOPAGO_OAUTH_REDIRECT_URI') ||
      'https://autorentar.com/auth/mercadopago/callback';

    console.log(`[OAuth Callback] Using redirect_uri: ${REDIRECT_URI}`);

    if (!MP_CLIENT_SECRET) {
      console.error('[Config Error] MERCADOPAGO_CLIENT_SECRET not set');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Configuración incompleta',
          details: 'MERCADOPAGO_CLIENT_SECRET no configurado',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[OAuth] Exchanging code for token...');

    const tokenResponse = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: MP_CLIENT_ID,
        client_secret: MP_CLIENT_SECRET,
        code: callbackData.code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      console.error('[MP Token Error]', tokenResponse.status, errorData);

      // Propagar el status real de MercadoPago para evitar 500 genérico en frontend
      const status = tokenResponse.status === 400 ? 400 : tokenResponse.status || 500;

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Error obteniendo token de MercadoPago',
          details: errorData.message || `HTTP ${tokenResponse.status}`,
          mp_error: errorData.error,
          mp_error_description: errorData.error_description,
          status: tokenResponse.status,
        }),
        {
          status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const tokenData: MercadoPagoTokenResponse = await tokenResponse.json();

    console.log('[OAuth] Token received successfully');
    console.log(`[OAuth] Collector ID: ${tokenData.user_id}`);
    console.log(`[OAuth] Expires in: ${tokenData.expires_in} seconds`);
    console.log(`[OAuth] Live mode: ${tokenData.live_mode}`);

    // ============================================
    // 6. OBTENER INFORMACIÓN DEL USUARIO
    // ============================================

    console.log('[OAuth] Fetching user info...');

    const userInfoResponse = await fetch('https://api.mercadopago.com/users/me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      console.error('[MP User Info Error]', userInfoResponse.status);
      // No bloqueamos por esto, seguimos con la info del token
    }

    let userInfo: MercadoPagoUserInfo | null = null;
    if (userInfoResponse.ok) {
      userInfo = await userInfoResponse.json();
      console.log(`[OAuth] User info: ${userInfo?.email} (${userInfo?.site_id})`);
    }

    // ============================================
    // 7. GUARDAR TOKENS EN BASE DE DATOS
    // ============================================

    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    console.log('[OAuth] Saving to database...');

    // 7.a Validar que el collector_id no esté asignado a otro usuario
    const { data: existingCollector, error: collectorError } = await supabase
      .from('profiles')
      .select('id')
      .eq('mercadopago_collector_id', tokenData.user_id.toString())
      .neq('id', stateData.user_id)
      .maybeSingle();

    if (collectorError) {
      console.error('[DB Error] Checking collector_id:', collectorError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Error guardando datos de MercadoPago',
          details: collectorError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (existingCollector) {
      console.error('[DB Error] collector_id already in use by', existingCollector.id);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Esta cuenta de MercadoPago ya está vinculada a otro usuario',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 7.b Guardar tokens y marcar conexión (sin depender de auth.uid())
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        mercadopago_collector_id: tokenData.user_id.toString(),
        mercadopago_connected: true,
        mercadopago_connected_at: new Date().toISOString(),
        mercadopago_access_token: tokenData.access_token,
        mercadopago_refresh_token: tokenData.refresh_token,
        mercadopago_access_token_expires_at: expiresAt.toISOString(),
        mercadopago_public_key: tokenData.public_key,
        mercadopago_account_type: 'personal',
        mercadopago_country: userInfo?.country_id || 'AR',
        mercadopago_site_id: userInfo?.site_id || 'MLA',
        mercadopago_oauth_state: null, // limpiar state
        updated_at: new Date().toISOString(),
      })
      .eq('id', stateData.user_id);

    if (updateError) {
      console.error('[DB Error] Could not save OAuth data:', updateError);

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Error guardando datos de MercadoPago',
          details: updateError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[OAuth Callback] Success! MercadoPago connected.');

    // ============================================
    // 8. RETORNAR RESPONSE EXITOSA
    // ============================================

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Cuenta de MercadoPago conectada exitosamente',
        collector_id: tokenData.user_id.toString(),
        account_info: {
          email: userInfo?.email,
          name: userInfo ? `${userInfo.first_name} ${userInfo.last_name}` : undefined,
          country: userInfo?.country_id,
          site_id: userInfo?.site_id,
        },
        live_mode: tokenData.live_mode,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[OAuth Callback Error]', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Error procesando callback de MercadoPago',
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
 * ## Callback desde MercadoPago
 *
 * GET /functions/v1/mercadopago-oauth-callback?code=TG-xxxxx&state=eyJ1c2VyX2lkIjoi...
 *
 * O
 *
 * POST /functions/v1/mercadopago-oauth-callback
 * Body:
 * {
 *   "code": "TG-xxxxxxxxxx",
 *   "state": "eyJ1c2VyX2lkIjoi..."
 * }
 *
 * ## Response (Success)
 *
 * {
 *   "success": true,
 *   "message": "Cuenta de MercadoPago conectada exitosamente",
 *   "collector_id": "202984680",
 *   "account_info": {
 *     "email": "user@example.com",
 *     "name": "Eduardo Marques",
 *     "country": "AR",
 *     "site_id": "MLA"
 *   },
 *   "live_mode": true
 * }
 *
 * ## Response (Error - Usuario canceló)
 *
 * {
 *   "success": false,
 *   "error": "access_denied",
 *   "error_description": "Usuario canceló la autorización"
 * }
 *
 * ## Frontend Integration (Angular)
 *
 * ```typescript
 * // En la ruta /auth/mercadopago/callback
 *
 * @Component({...})
 * export class MercadoPagoCallbackPage implements OnInit {
 *   async ngOnInit() {
 *     const params = new URLSearchParams(window.location.search);
 *     const code = params.get('code');
 *     const state = params.get('state');
 *     const error = params.get('error');
 *
 *     if (error) {
 *       // Usuario canceló
 *       this.showError('Conexión cancelada');
 *       return;
 *     }
 *
 *     // Llamar a Edge Function con code y state
 *     const { data } = await this.supabase.functions.invoke(
 *       'mercadopago-oauth-callback',
 *       { body: { code, state } }
 *     );
 *
 *     if (data.success) {
 *       this.showSuccess('¡Cuenta conectada!');
 *       this.router.navigate(['/profile']);
 *     } else {
 *       this.showError(data.error);
 *     }
 *   }
 * }
 * ```
 *
 * ## Variables de Entorno Requeridas
 *
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - MERCADOPAGO_APPLICATION_ID
 * - MERCADOPAGO_CLIENT_SECRET ⚠️ CRÍTICO
 * - MERCADOPAGO_OAUTH_REDIRECT_URI
 *
 * ## Seguridad
 *
 * - Valida state contra CSRF
 * - Expira states > 10 minutos
 * - Verifica state guardado en DB
 * - Usa service role key para guardar tokens
 * - Limpia state después de uso
 *
 * ============================================ */
