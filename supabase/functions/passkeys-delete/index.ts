/**
 * Passkeys Delete
 *
 * Elimina una passkey registrada del usuario autenticado.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

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
    const { passkeyId } = body;

    if (!passkeyId) {
      return new Response(
        JSON.stringify({ error: 'Missing passkeyId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verificar que la passkey pertenece al usuario
    const { data: passkey, error: findError } = await supabaseAdmin
      .from('passkeys')
      .select('id, user_id')
      .eq('id', passkeyId)
      .single();

    if (findError || !passkey) {
      return new Response(
        JSON.stringify({ error: 'Passkey not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (passkey.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Not authorized to delete this passkey' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar que el usuario no se quede sin métodos de autenticación
    const { count: passkeyCount } = await supabaseAdmin
      .from('passkeys')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (passkeyCount === 1) {
      // Verificar si tiene contraseña (cuenta con email/password)
      // El usuario podría haberse registrado solo con passkey
      // Por ahora permitimos eliminar la última passkey si tiene email
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(user.id);
      const hasEmailProvider = authUser?.user?.identities?.some(
        (i) => i.provider === 'email'
      );

      if (!hasEmailProvider) {
        return new Response(
          JSON.stringify({
            error: 'Cannot delete last passkey. You would lose access to your account.',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Eliminar passkey
    const { error: deleteError } = await supabaseAdmin
      .from('passkeys')
      .delete()
      .eq('id', passkeyId);

    if (deleteError) {
      console.error('Error deleting passkey:', deleteError);
      throw new Error('Failed to delete passkey');
    }

    console.log(`✅ Passkey ${passkeyId} deleted for user ${user.id}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in passkeys-delete:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
