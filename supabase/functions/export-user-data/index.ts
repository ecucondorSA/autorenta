// ============================================
// EDGE FUNCTION: export-user-data
// Propósito: Exportar datos del usuario (GDPR/CCPA compliance)
// Permite al usuario descargar todos sus datos personales
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

interface ExportRequest {
  format?: 'json' | 'csv';
  include_bookings?: boolean;
  include_cars?: boolean;
  include_transactions?: boolean;
  include_messages?: boolean;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[Export User Data] Starting export');

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

    // Service client for full data access
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get authenticated user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Export User Data] Exporting data for user ${user.id}`);

    // Parse options
    let options: ExportRequest = {
      format: 'json',
      include_bookings: true,
      include_cars: true,
      include_transactions: true,
      include_messages: true,
    };

    if (req.method === 'POST') {
      try {
        const body = await req.json();
        options = { ...options, ...body };
      } catch {
        // Use defaults
      }
    }

    // Collect all user data
    const exportData: Record<string, unknown> = {
      export_date: new Date().toISOString(),
      user_id: user.id,
      email: user.email,
    };

    // 1. Profile data
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profile) {
      // Remove sensitive internal fields
      const { mercadopago_oauth_state, ...safeProfile } = profile;
      exportData.profile = safeProfile;
    }

    // 2. Cars (if owner)
    if (options.include_cars) {
      const { data: cars } = await supabaseAdmin
        .from('cars')
        .select('*, car_photos(url, position)')
        .eq('owner_id', user.id);

      exportData.cars = cars || [];
    }

    // 3. Bookings (as renter and owner)
    if (options.include_bookings) {
      const { data: bookingsAsRenter } = await supabaseAdmin
        .from('bookings')
        .select(`
          id, status, start_date, end_date, total_price, currency,
          created_at, confirmed_at, cancelled_at, cancellation_reason,
          car:cars(id, brand_text_backup, model_text_backup)
        `)
        .eq('renter_id', user.id)
        .order('created_at', { ascending: false });

      const { data: bookingsAsOwner } = await supabaseAdmin
        .from('bookings')
        .select(`
          id, status, start_date, end_date, total_price, currency,
          created_at, confirmed_at, cancelled_at, cancellation_reason,
          renter:profiles!bookings_renter_id_fkey(id, full_name)
        `)
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      exportData.bookings_as_renter = bookingsAsRenter || [];
      exportData.bookings_as_owner = bookingsAsOwner || [];
    }

    // 4. Wallet transactions
    if (options.include_transactions) {
      const { data: transactions } = await supabaseAdmin
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      exportData.wallet_transactions = transactions || [];

      // Wallet balance
      const { data: balance } = await supabaseAdmin
        .rpc('wallet_get_balance', { p_user_id: user.id });

      exportData.wallet_balance = balance?.[0] || null;
    }

    // 5. Messages
    if (options.include_messages) {
      const { data: sentMessages } = await supabaseAdmin
        .from('messages')
        .select('id, content, created_at, booking_id, recipient_id')
        .eq('sender_id', user.id)
        .order('created_at', { ascending: false })
        .limit(500);

      const { data: receivedMessages } = await supabaseAdmin
        .from('messages')
        .select('id, content, created_at, booking_id, sender_id')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(500);

      exportData.messages_sent = sentMessages || [];
      exportData.messages_received = receivedMessages || [];
    }

    // 6. Reviews given and received
    const { data: reviewsGiven } = await supabaseAdmin
      .from('reviews')
      .select('*')
      .eq('reviewer_id', user.id);

    const { data: reviewsReceived } = await supabaseAdmin
      .from('reviews')
      .select('*')
      .eq('reviewee_id', user.id);

    exportData.reviews_given = reviewsGiven || [];
    exportData.reviews_received = reviewsReceived || [];

    // 7. Favorites
    const { data: favorites } = await supabaseAdmin
      .from('favorites')
      .select('car_id, created_at')
      .eq('user_id', user.id);

    exportData.favorites = favorites || [];

    // 8. Push notification subscriptions
    const { data: pushSubscriptions } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id, created_at, device_type')
      .eq('user_id', user.id);

    exportData.push_subscriptions = pushSubscriptions || [];

    // Log export for audit
    await supabaseAdmin.from('audit_logs').insert({
      user_id: user.id,
      action: 'data_export',
      details: {
        format: options.format,
        include_bookings: options.include_bookings,
        include_cars: options.include_cars,
        include_transactions: options.include_transactions,
        include_messages: options.include_messages,
      },
      ip_address: req.headers.get('CF-Connecting-IP') || req.headers.get('X-Forwarded-For'),
    });

    console.log(`[Export User Data] Export complete for user ${user.id}`);

    // Return data
    if (options.format === 'json') {
      return new Response(
        JSON.stringify(exportData, null, 2),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="autorenta-data-${user.id.slice(0, 8)}.json"`,
          },
        }
      );
    }

    // CSV format (simplified - profile only)
    const csvRows = [
      'Field,Value',
      `User ID,${user.id}`,
      `Email,${user.email}`,
      `Full Name,${profile?.full_name || ''}`,
      `Phone,${profile?.phone || ''}`,
      `Created At,${profile?.created_at || ''}`,
      `Cars Count,${(exportData.cars as unknown[])?.length || 0}`,
      `Bookings as Renter,${(exportData.bookings_as_renter as unknown[])?.length || 0}`,
      `Bookings as Owner,${(exportData.bookings_as_owner as unknown[])?.length || 0}`,
      `Transactions Count,${(exportData.wallet_transactions as unknown[])?.length || 0}`,
    ];

    return new Response(csvRows.join('\n'), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="autorenta-data-${user.id.slice(0, 8)}.csv"`,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Export User Data] Error:', errorMessage);

    return new Response(
      JSON.stringify({ error: 'Failed to export data' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/* ============================================
 * DOCUMENTACIÓN
 * ============================================
 *
 * ## GDPR/CCPA Compliance
 *
 * Esta función permite a los usuarios ejercer su derecho
 * de acceso a sus datos personales (Art. 15 GDPR).
 *
 * ## Uso
 *
 * POST /functions/v1/export-user-data
 * Headers:
 *   Authorization: Bearer <user_jwt>
 * Body (opcional):
 * {
 *   "format": "json",           // o "csv"
 *   "include_bookings": true,
 *   "include_cars": true,
 *   "include_transactions": true,
 *   "include_messages": true
 * }
 *
 * ## Response
 *
 * Archivo JSON o CSV descargable con todos los datos del usuario.
 *
 * ## Datos Incluidos
 *
 * - Perfil del usuario
 * - Autos publicados (si es propietario)
 * - Historial de reservas (como locatario y locador)
 * - Transacciones de wallet
 * - Mensajes enviados/recibidos (últimos 500)
 * - Reviews dados y recibidos
 * - Favoritos
 * - Suscripciones push
 *
 * ## Auditoría
 *
 * Cada exportación se registra en audit_logs.
 *
 * ============================================ */
