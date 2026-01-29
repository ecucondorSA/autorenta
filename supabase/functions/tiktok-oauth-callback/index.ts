/**
 * TikTok OAuth Callback Handler
 *
 * Maneja el callback de TikTok OAuth:
 * 1. Intercambia código de autorización por access token
 * 2. Obtiene datos del usuario de TikTok
 * 3. Crea/actualiza usuario en Supabase
 * 4. Retorna sesión de Supabase
 *
 * Endpoint: /functions/v1/tiktok-oauth-callback
 * Method: POST
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

const TIKTOK_TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/';
const TIKTOK_USER_INFO_URL = 'https://open.tiktokapis.com/v2/user/info/';

interface TikTokTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

interface TikTokUserInfo {
  data: {
    user: {
      open_id: string;
      display_name: string;
      avatar_url?: string;
    };
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verificar variables de entorno
    const TIKTOK_CLIENT_ID = Deno.env.get('TIKTOK_CLIENT_ID');
    const TIKTOK_CLIENT_SECRET = Deno.env.get('TIKTOK_CLIENT_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!TIKTOK_CLIENT_ID || !TIKTOK_CLIENT_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
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

    // Parse request body
    const { code } = await req.json();

    if (!code) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization code' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('🔐 Procesando TikTok OAuth callback con código:', code.substring(0, 20) + '...');

    // 1. Intercambiar código por access token
    const tokenResponse = await fetch(TIKTOK_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_key: TIKTOK_CLIENT_ID,
        client_secret: TIKTOK_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = (await tokenResponse.json()) as {
      data?: TikTokTokenResponse;
      error?: string;
      error_description?: string;
    };

    if (!tokenResponse.ok || !tokenData.data?.access_token) {
      console.error('❌ Error intercambiando token TikTok:', tokenData);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to exchange authorization code',
          details: tokenData.error || tokenData.error_description,
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const accessToken = tokenData.data.access_token;
    console.log('✅ Token TikTok obtenido exitosamente');

    // 2. Obtener información del usuario de TikTok
    const userInfoResponse = await fetch(
      `${TIKTOK_USER_INFO_URL}?fields=open_id,display_name,avatar_url`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    const userInfoData = (await userInfoResponse.json()) as TikTokUserInfo | { error?: string };

    if (!userInfoResponse.ok || !('data' in userInfoData)) {
      console.error('❌ Error obteniendo información de TikTok:', userInfoData);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to fetch user info from TikTok',
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const tiktokUser = userInfoData.data.user;
    console.log('✅ Información de usuario TikTok obtenida:', {
      open_id: tiktokUser.open_id,
      display_name: tiktokUser.display_name,
    });

    // 3. Inicializar cliente Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 4. Crear o actualizar usuario en Supabase
    // Usar TikTok open_id como identificador único
    const userEmail = `tiktok_${tiktokUser.open_id}@autorenta.local`;

    // Primero, intentar encontrar usuario existente
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('provider_id', tiktokUser.open_id)
      .eq('provider', 'tiktok')
      .single();

    let userId: string;

    if (existingUser) {
      // Usuario existente - actualizar
      userId = existingUser.id;
      console.log('📝 Actualizando usuario TikTok existente:', userId);

      await supabase
        .from('profiles')
        .update({
          display_name: tiktokUser.display_name,
          avatar_url: tiktokUser.avatar_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);
    } else {
      // Nuevo usuario - crear
      console.log('👤 Creando nuevo usuario TikTok');

      // Crear usuario en auth
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: userEmail,
        email_confirm: true,
        user_metadata: {
          full_name: tiktokUser.display_name,
          provider: 'tiktok',
          provider_id: tiktokUser.open_id,
        },
      });

      if (authError) {
        console.error('❌ Error creando usuario en auth:', authError);
        throw new Error(`Failed to create auth user: ${authError.message}`);
      }

      userId = authUser.user.id;

      // Crear perfil
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: userEmail,
          display_name: tiktokUser.display_name,
          avatar_url: tiktokUser.avatar_url,
          provider: 'tiktok',
          provider_id: tiktokUser.open_id,
          role: 'ambos',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (profileError) {
        console.error('❌ Error creando perfil:', profileError);
        throw new Error(`Failed to create profile: ${profileError.message}`);
      }
    }

    // 5. Crear sesión de Supabase con el usuario
    const { data: session, error: sessionError } = await supabase.auth.admin.createSession(userId);

    if (sessionError) {
      console.error('❌ Error creando sesión:', sessionError);
      throw new Error(`Failed to create session: ${sessionError.message}`);
    }

    console.log('✅ Sesión creada exitosamente para usuario:', userId);

    // 6. Retornar datos de sesión
    return new Response(
      JSON.stringify({
        success: true,
        session: session.session,
        user: {
          id: userId,
          email: userEmail,
          display_name: tiktokUser.display_name,
          avatar_url: tiktokUser.avatar_url,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Fatal error en tiktok-oauth-callback:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
