/**
 * Passkeys Authentication Options
 *
 * Genera las opciones para autenticar con una passkey existente.
 * Puede usarse sin usuario autenticado (login con passkey).
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import {
  generateAuthenticationOptions,
  type PublicKeyCredentialRequestOptionsJSON,
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

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parsear body (opcional - puede incluir email o userId para filtrar credenciales)
    let email: string | undefined;
    let conditional = false;

    if (req.method === 'POST') {
      try {
        const body = await req.json();
        email = body.email;
        conditional = body.conditional === true;
      } catch {
        // Body vacío o inválido - está bien
      }
    }

    let allowCredentialIds: string[] = [];

    if (email) {
      // Si se proporciona email, buscar passkeys de ese usuario
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (profile) {
        const { data: passkeys } = await supabaseAdmin
          .from('passkeys')
          .select('credential_id')
          .eq('user_id', profile.id);

        allowCredentialIds = passkeys?.map((p) => p.credential_id) || [];
      }
    }

    // Generar opciones de autenticación
    // Si es condicional (autofill), no limitamos las credenciales
    const options: PublicKeyCredentialRequestOptionsJSON = generateAuthenticationOptions({
      allowCredentialIds: conditional ? [] : allowCredentialIds,
      userVerification: 'preferred',
    });

    // Guardar challenge para verificación posterior
    // Para autenticación sin usuario, guardamos con user_id null
    const { error: challengeError } = await supabaseAdmin
      .from('passkey_challenges')
      .insert({
        user_id: null, // Se verificará contra cualquier usuario
        challenge: options.challenge,
        type: 'authentication',
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutos
      });

    if (challengeError) {
      console.error('Error saving challenge:', challengeError);
      throw new Error('Failed to save challenge');
    }

    console.log(`✅ Authentication options generated${email ? ` for ${email}` : ' (discovery)'}`);

    return new Response(JSON.stringify(options), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in passkeys-authentication-options:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
