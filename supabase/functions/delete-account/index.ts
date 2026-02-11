// ============================================
// EDGE FUNCTION: delete-account
// Propósito: Eliminar cuenta de usuario (GDPR/CCPA compliance)
// Permite al usuario eliminar permanentemente su cuenta y datos
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

interface DeleteRequest {
  confirm: boolean;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[Delete Account] Starting account deletion');

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Client with user's JWT for auth
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Service client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get authenticated user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    let body: DeleteRequest = { confirm: false };
    try {
      body = await req.json();
    } catch {
      // Use defaults
    }

    if (!body.confirm) {
      return new Response(
        JSON.stringify({ error: 'Confirmation required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Delete Account] Deleting account for user ${user.id}`);

    // Check for active bookings
    const { data: activeBookings } = await supabaseAdmin
      .from('bookings')
      .select('id, status')
      .or(`renter_id.eq.${user.id},owner_id.eq.${user.id}`)
      .in('status', ['pending', 'confirmed', 'in_progress']);

    if (activeBookings && activeBookings.length > 0) {
      return new Response(
        JSON.stringify({
          error: 'No se puede eliminar la cuenta con reservas activas',
          active_bookings: activeBookings.length,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for pending wallet balance
    const { data: balance } = await supabaseAdmin
      .rpc('wallet_get_balance', { p_user_id: user.id });

    const walletBalance = balance?.[0]?.available_balance || 0;
    if (walletBalance > 0) {
      return new Response(
        JSON.stringify({
          error: 'Tienes saldo pendiente en tu wallet. Por favor retíralo antes de eliminar tu cuenta.',
          wallet_balance: walletBalance,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Start deletion process
    const deletionLog: string[] = [];

    // 1. Cancel pending bookings (soft cancel)
    const { error: cancelError } = await supabaseAdmin
      .from('bookings')
      .update({
        status: 'cancelled',
        cancellation_reason: 'Cuenta eliminada por el usuario',
        cancelled_at: new Date().toISOString(),
      })
      .or(`renter_id.eq.${user.id},owner_id.eq.${user.id}`)
      .eq('status', 'pending');

    if (!cancelError) deletionLog.push('Pending bookings cancelled');

    // 2. Delete favorites
    const { error: favError } = await supabaseAdmin
      .from('favorites')
      .delete()
      .eq('user_id', user.id);

    if (!favError) deletionLog.push('Favorites deleted');

    // 3. Delete push subscriptions
    const { error: pushError } = await supabaseAdmin
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id);

    if (!pushError) deletionLog.push('Push subscriptions deleted');

    // 4. Anonymize messages (keep for dispute resolution but remove PII)
    const { error: msgError } = await supabaseAdmin
      .from('messages')
      .update({
        content: '[Mensaje eliminado - Cuenta cerrada]',
      })
      .eq('sender_id', user.id);

    if (!msgError) deletionLog.push('Messages anonymized');

    // 5. Deactivate cars (soft delete - keep for historical records)
    const { error: carsError } = await supabaseAdmin
      .from('cars')
      .update({
        status: 'deleted',
        deleted_at: new Date().toISOString(),
      })
      .eq('owner_id', user.id);

    if (!carsError) deletionLog.push('Cars deactivated');

    // 6. Anonymize profile (keep shell for referential integrity)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name: 'Usuario Eliminado',
        phone: null,
        avatar_url: null,
        bio: null,
        document_number: null,
        selfie_url: null,
        document_front_url: null,
        document_back_url: null,
        license_front_url: null,
        license_back_url: null,
        address: null,
        city: null,
        state: null,
        postal_code: null,
        country: null,
        deleted_at: new Date().toISOString(),
        is_deleted: true,
      })
      .eq('id', user.id);

    if (!profileError) deletionLog.push('Profile anonymized');

    // 7. Revoke MercadoPago OAuth (if connected)
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('mercadopago_access_token')
      .eq('id', user.id)
      .single();

    if (profile?.mercadopago_access_token) {
      // Clear MP tokens
      await supabaseAdmin
        .from('profiles')
        .update({
          mercadopago_access_token: null,
          mercadopago_refresh_token: null,
          mercadopago_user_id: null,
          mercadopago_public_key: null,
        })
        .eq('id', user.id);

      deletionLog.push('MercadoPago disconnected');
    }

    // 8. Log deletion for compliance/audit
    await supabaseAdmin.from('audit_logs').insert({
      user_id: user.id,
      action: 'account_deleted',
      details: {
        deletion_log: deletionLog,
        email: user.email,
        requested_at: new Date().toISOString(),
      },
      ip_address: req.headers.get('CF-Connecting-IP') || req.headers.get('X-Forwarded-For'),
    });

    // 9. Delete auth user (this removes the user from auth.users)
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteAuthError) {
      console.error('[Delete Account] Failed to delete auth user:', deleteAuthError);
      // Continue anyway - profile is already anonymized
    } else {
      deletionLog.push('Auth user deleted');
    }

    console.log(`[Delete Account] Account deleted for user ${user.id}`, deletionLog);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Tu cuenta ha sido eliminada correctamente',
        deletion_log: deletionLog,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Delete Account] Error:', errorMessage);

    return new Response(
      JSON.stringify({ error: 'Failed to delete account' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/* ============================================
 * DOCUMENTACION
 * ============================================
 *
 * ## GDPR/CCPA Compliance
 *
 * Esta funcion permite a los usuarios ejercer su derecho
 * de supresion de datos personales (Art. 17 GDPR - "Right to be forgotten").
 *
 * ## Uso
 *
 * POST /functions/v1/delete-account
 * Headers:
 *   Authorization: Bearer <user_jwt>
 * Body:
 * {
 *   "confirm": true
 * }
 *
 * ## Validaciones
 *
 * - No se puede eliminar con reservas activas
 * - No se puede eliminar con saldo pendiente en wallet
 *
 * ## Datos Eliminados
 *
 * - Perfil anonimizado (nombre, teléfono, documentos, selfie)
 * - Favoritos eliminados
 * - Push subscriptions eliminadas
 * - Mensajes anonimizados
 * - Autos desactivados (soft delete)
 * - MercadoPago desconectado
 * - Usuario de auth eliminado
 *
 * ## Datos Retenidos (Obligación Legal)
 *
 * - Historial de transacciones (5 años - requerimiento fiscal)
 * - Registros de reservas (para disputas)
 * - Audit logs
 *
 * ## Auditoría
 *
 * Cada eliminación se registra en audit_logs con IP y timestamp.
 *
 * ============================================ */
