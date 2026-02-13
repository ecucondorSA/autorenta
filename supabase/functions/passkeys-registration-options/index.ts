/**
 * Passkeys Registration Options
 *
 * Genera las opciones para registrar una nueva passkey para el usuario autenticado.
 * Requiere usuario autenticado.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import {
  generateRegistrationOptions,
  type PublicKeyCredentialCreationOptionsJSON,
} from '../_shared/webauthn.ts';

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    // Obtener token del usuario
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Crear cliente con el token del usuario para verificar autenticación
    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY') || '', {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cliente admin para operaciones de base de datos
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Obtener perfil del usuario
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('display_name, email')
      .eq('id', user.id)
      .single();

    const userName = profile?.email || user.email || user.id;
    const userDisplayName = profile?.display_name || userName;

    // Obtener passkeys existentes para excluirlas
    const { data: existingPasskeys } = await supabaseAdmin
      .from('passkeys')
      .select('credential_id')
      .eq('user_id', user.id);

    const excludeCredentialIds = existingPasskeys?.map((p) => p.credential_id) || [];

    // Obtener origin para determinar rpId correcto
    const origin = req.headers.get('Origin');

    // Generar opciones de registro
    const options: PublicKeyCredentialCreationOptionsJSON = generateRegistrationOptions({
      userId: user.id,
      userName,
      userDisplayName,
      excludeCredentialIds,
      origin,
    });

    // Guardar challenge para verificación posterior
    // Primero limpiar challenges expirados del usuario
    await supabaseAdmin
      .from('passkey_challenges')
      .delete()
      .eq('user_id', user.id)
      .lt('expires_at', new Date().toISOString());

    // Guardar nuevo challenge
    const { error: challengeError } = await supabaseAdmin
      .from('passkey_challenges')
      .insert({
        user_id: user.id,
        challenge: options.challenge,
        type: 'registration',
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutos
      });

    if (challengeError) {
      console.error('Error saving challenge:', challengeError);
      throw new Error('Failed to save challenge');
    }

    console.log(`✅ Registration options generated for user ${user.id}`);

    return new Response(JSON.stringify(options), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in passkeys-registration-options:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
