/**
 * Passkeys Registration Verify
 *
 * Verifica y guarda una nueva passkey registrada.
 * Requiere usuario autenticado.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import {
  parseClientDataJSON,
  verifyClientData,
  parseAttestationObject,
  parseAuthData,
  base64UrlEncode,
  getDeviceType,
  generateDeviceName,
  type RegistrationCredentialJSON,
} from '../_shared/webauthn.ts';

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
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

    // Verificar usuario autenticado
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

    // Parsear body
    const body = await req.json();
    const credential: RegistrationCredentialJSON = body.credential;

    if (!credential || !credential.response) {
      return new Response(
        JSON.stringify({ error: 'Missing credential data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Obtener challenge guardado
    const { data: challengeRecord, error: challengeError } = await supabaseAdmin
      .from('passkey_challenges')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'registration')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (challengeError || !challengeRecord) {
      return new Response(
        JSON.stringify({ error: 'Challenge expired or not found. Please try again.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar clientDataJSON
    const clientData = parseClientDataJSON(credential.response.clientDataJSON);
    const clientDataVerification = verifyClientData(
      clientData,
      challengeRecord.challenge,
      'webauthn.create'
    );

    if (!clientDataVerification.verified) {
      return new Response(
        JSON.stringify({ error: clientDataVerification.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parsear attestation object
    const attestation = parseAttestationObject(credential.response.attestationObject);
    const authData = parseAuthData(attestation.authData);

    if (!authData.attestedCredentialData) {
      return new Response(
        JSON.stringify({ error: 'Missing attested credential data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extraer datos de la credencial
    const credentialId = base64UrlEncode(authData.attestedCredentialData.credentialId);
    const publicKey = base64UrlEncode(authData.attestedCredentialData.credentialPublicKey);
    const counter = authData.counter;

    // Determinar tipo de dispositivo
    const deviceType = getDeviceType(credential.authenticatorAttachment);
    const transports = credential.response.transports || [];
    const deviceName = generateDeviceName(req.headers.get('User-Agent') || undefined);

    // Verificar que el credential_id no existe ya
    const { data: existingCredential } = await supabaseAdmin
      .from('passkeys')
      .select('id')
      .eq('credential_id', credentialId)
      .single();

    if (existingCredential) {
      return new Response(
        JSON.stringify({ error: 'This passkey is already registered' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Guardar passkey
    const { error: insertError } = await supabaseAdmin.from('passkeys').insert({
      user_id: user.id,
      credential_id: credentialId,
      public_key: publicKey,
      counter,
      device_type: deviceType,
      transports,
      device_name: deviceName,
      last_used_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error('Error inserting passkey:', insertError);
      throw new Error('Failed to save passkey');
    }

    // Eliminar challenge usado
    await supabaseAdmin
      .from('passkey_challenges')
      .delete()
      .eq('id', challengeRecord.id);

    console.log(`✅ Passkey registered for user ${user.id}: ${credentialId.substring(0, 20)}...`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in passkeys-registration-verify:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
