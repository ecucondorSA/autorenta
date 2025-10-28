// ============================================
// EDGE FUNCTION: mercadopago-oauth-callback
// Propósito: Procesa callback de OAuth de MercadoPago
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface OAuthState {
  user_id: string;
  token: string;
  timestamp: number;
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
      const stateJson = atob(callbackData.state);
      stateData = JSON.parse(stateJson);
    } catch (e) {
      console.error('[State Error] Could not decode state:', e);
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

    // Verificar que el state no sea muy viejo (> 10 minutos)
    const stateAge = Date.now() - stateData.timestamp;
    if (stateAge > 10 * 60 * 1000) {
      console.error('[State Error] State expired:', stateAge, 'ms');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'State expirado',
          details: 'El proceso de autorización tomó demasiado tiempo',
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
    if (profile.mercadopago_oauth_state !== callbackData.state) {
      console.error('[State Error] State mismatch');
      console.log('Expected:', profile.mercadopago_oauth_state);
      console.log('Received:', callbackData.state);

      return new Response(
        JSON.stringify({
          success: false,
          error: 'State no coincide',
          details: 'Posible ataque CSRF detectado',
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
    const REDIRECT_URI = Deno.env.get('MERCADOPAGO_OAUTH_REDIRECT_URI') ||
      'https://autorenta.com.ar/auth/mercadopago/callback';

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

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Error obteniendo token de MercadoPago',
          details: errorData.message || `HTTP ${tokenResponse.status}`,
        }),
        {
          status: 500,
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

    const { data: connectResult, error: connectError } = await supabase.rpc(
      'connect_mercadopago',
      {
        p_collector_id: tokenData.user_id.toString(),
        p_access_token: tokenData.access_token,
        p_refresh_token: tokenData.refresh_token,
        p_expires_at: expiresAt.toISOString(),
        p_public_key: tokenData.public_key,
        p_account_type: 'personal', // Podríamos detectar esto con tags
        p_country: userInfo?.country_id || 'AR',
        p_site_id: userInfo?.site_id || 'MLA',
      }
    );

    if (connectError) {
      console.error('[DB Error] Could not save OAuth data:', connectError);

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Error guardando datos de MercadoPago',
          details: connectError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verificar resultado de la RPC
    if (!connectResult || !connectResult.success) {
      console.error('[RPC Error]', connectResult);

      return new Response(
        JSON.stringify({
          success: false,
          error: connectResult?.error || 'Error conectando MercadoPago',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[OAuth Callback] Success! MercadoPago connected.');

    // Limpiar state de profiles (ya no lo necesitamos)
    await supabase
      .from('profiles')
      .update({ mercadopago_oauth_state: null })
      .eq('id', stateData.user_id);

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
