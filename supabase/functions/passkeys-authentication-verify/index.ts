/**
 * Passkeys Authentication Verify
 *
 * Verifica una autenticación con passkey y genera una sesión de Supabase.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import {
  parseClientDataJSON,
  verifyClientData,
  parseAuthData,
  verifySignature,
  base64UrlDecode,
  type AuthenticationCredentialJSON,
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

    // Parsear body
    const body = await req.json();
    const credential: AuthenticationCredentialJSON = body.credential;

    if (!credential || !credential.response) {
      return new Response(
        JSON.stringify({ error: 'Missing credential data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Buscar passkey por credential_id
    const { data: passkey, error: passkeyError } = await supabaseAdmin
      .from('passkeys')
      .select('*')
      .eq('credential_id', credential.id)
      .single();

    if (passkeyError || !passkey) {
      console.error('Passkey lookup failed:', passkeyError, 'credential.id:', credential.id);
      return new Response(
        JSON.stringify({ error: 'Passkey not found', credentialId: credential.id, dbError: passkeyError }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log('Passkey found for user:', passkey.user_id);

    // Obtener challenge guardado (cualquier challenge de autenticación no expirado)
    const { data: challengeRecord, error: challengeError } = await supabaseAdmin
      .from('passkey_challenges')
      .select('*')
      .eq('type', 'authentication')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (challengeError || !challengeRecord) {
      console.error('Challenge lookup failed:', challengeError);
      return new Response(
        JSON.stringify({ error: 'Challenge expired or not found', dbError: challengeError }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log('Challenge found:', challengeRecord.challenge.substring(0, 20) + '...');

    // Verificar clientDataJSON
    const clientData = parseClientDataJSON(credential.response.clientDataJSON);
    const clientDataVerification = verifyClientData(
      clientData,
      challengeRecord.challenge,
      'webauthn.get'
    );

    if (!clientDataVerification.verified) {
      console.error('Client data verification failed:', clientDataVerification.error);
      console.error('ClientData:', JSON.stringify(clientData));
      console.error('Expected challenge:', challengeRecord.challenge);
      return new Response(
        JSON.stringify({
          error: clientDataVerification.error,
          step: 'clientDataVerification',
          clientDataOrigin: clientData.origin,
          clientDataChallenge: clientData.challenge?.substring(0, 20) + '...',
          expectedChallenge: challengeRecord.challenge.substring(0, 20) + '...',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log('Client data verified OK');

    // Parsear authenticatorData
    const authenticatorDataBytes = base64UrlDecode(credential.response.authenticatorData);
    const authData = parseAuthData(authenticatorDataBytes);

    // Verificar userPresent flag
    if (!authData.flags.userPresent) {
      return new Response(
        JSON.stringify({ error: 'User presence flag not set' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar counter (previene replay attacks)
    if (authData.counter <= passkey.counter) {
      // Counter no incrementó - posible ataque de replay
      console.warn(`⚠️ Possible replay attack for credential ${credential.id}`);
      // En producción podríamos rechazar, pero algunos autenticadores
      // tienen counter=0 siempre (ej: algunos passkeys de software)
      if (passkey.counter > 0) {
        return new Response(
          JSON.stringify({ error: 'Security check failed: counter not incremented' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Crear datos para verificar firma
    // signedData = authenticatorData || SHA-256(clientDataJSON)
    const clientDataHash = await crypto.subtle.digest(
      'SHA-256',
      base64UrlDecode(credential.response.clientDataJSON)
    );
    const signedData = new Uint8Array(authenticatorDataBytes.length + 32);
    signedData.set(authenticatorDataBytes);
    signedData.set(new Uint8Array(clientDataHash), authenticatorDataBytes.length);

    // Verificar firma
    const signatureValid = await verifySignature(
      passkey.public_key,
      credential.response.signature,
      signedData
    );

    if (!signatureValid) {
      console.error('Signature verification failed for credential:', credential.id);
      return new Response(
        JSON.stringify({
          error: 'Signature verification failed',
          step: 'signatureVerification',
          credentialId: credential.id,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log('Signature verified OK');

    // Actualizar contador y last_used_at
    await supabaseAdmin
      .from('passkeys')
      .update({
        counter: authData.counter,
        last_used_at: new Date().toISOString(),
      })
      .eq('id', passkey.id);

    // Eliminar challenge usado
    await supabaseAdmin
      .from('passkey_challenges')
      .delete()
      .eq('id', challengeRecord.id);

    // Obtener email del usuario para generar sesión
    console.log('Step 1: Getting user data for:', passkey.user_id);
    const { data: userData, error: userDataError } = await supabaseAdmin.auth.admin.getUserById(passkey.user_id);

    if (userDataError || !userData.user?.email) {
      console.error('Error getting user:', userDataError);
      throw new Error(`Failed to get user data: ${JSON.stringify(userDataError)}`);
    }
    console.log('Step 1 OK: User email:', userData.user.email);

    // Generar magic link para crear sesión (sin enviar email)
    console.log('Step 2: Generating magiclink');
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: userData.user.email,
    });

    if (linkError) {
      console.error('Error generating link:', linkError);
      throw new Error(`Failed to generate link: ${JSON.stringify(linkError)}`);
    }
    if (!linkData.properties?.hashed_token) {
      console.error('No hashed_token in response:', linkData);
      throw new Error(`No hashed_token in link response`);
    }
    console.log('Step 2 OK: Got hashed_token');

    // Verificar el token para obtener la sesión
    // Nota: Usar 'email' en lugar de 'magiclink' según documentación oficial
    // https://github.com/orgs/supabase/discussions/12627
    console.log('Step 3: Verifying OTP with email type');
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: 'email',
    });

    if (sessionError) {
      console.error('Error verifying OTP:', JSON.stringify(sessionError, null, 2));
      // Retornar error detallado para debugging
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Session creation failed',
          step: 'verifyOtp',
          details: sessionError,
          tokenHashPreview: linkData.properties.hashed_token.substring(0, 20) + '...',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!sessionData.session) {
      console.error('No session in response:', JSON.stringify(sessionData, null, 2));
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No session returned',
          step: 'verifyOtp',
          sessionData: sessionData,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log('Step 3 OK: Session created');

    console.log(`✅ Passkey authentication successful for user ${passkey.user_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        session: sessionData.session,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('❌ Error in passkeys-authentication-verify:', errorMessage, errorStack);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        debug: errorStack?.substring(0, 500),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
