import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Find expiring pre-authorizations
    // MP pre-auths expire in ~7 days. We renew at 5 days to be safe.
    const expiryThreshold = new Date();
    expiryThreshold.setDate(expiryThreshold.getDate() - 5);

    const { data: expiringIntents, error: fetchError } = await supabase
      .from('payment_intents')
      .select('*, bookings(*)')
      .eq('type', 'preauth')
      .eq('status', 'authorized')
      .lt('created_at', expiryThreshold.toISOString())
      .limit(50); // Batch size

    if (fetchError) throw fetchError;

    if (!expiringIntents || expiringIntents.length === 0) {
      return new Response(JSON.stringify({ message: 'No expiring pre-auths found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results = [];

    for (const intent of expiringIntents) {
      const booking = intent.bookings;
      if (!booking) continue; // Should not happen

      console.log(`Processing expiring pre-auth for booking ${booking.id}`);

      // 2. Check if we have a saved card for the renter (Future Implementation)
      // Currently, we don't strictly enforce saving cards for all users.
      // If we had 'mercadopago_customer_id' and 'card_id', we would call MP API here.

      /*
      // PRE-AUTH RENEWAL LOGIC (Placeholder for Phase 2)
      // const newPreAuth = await createPreAuth(booking.renter_id, intent.amount);
      // if (newPreAuth.success) {
      //    // Release old one
      //    await releasePreAuth(intent.mp_payment_id);
      //    // Update booking
      //    await updateBookingIntent(booking.id, newPreAuth.id);
      // }
      */

      // 3. For now, since we might not have the card token, we ALERT.
      // We explicitly mark this intent as 'expiring_soon' or create a notification.

      // Create a notification for the admin/system
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: booking.renter_id, // Notify renter? Or Owner?
        // Actually, this is a system risk. Notify internal dashboard or Owner.
        type: 'system_alert',
        title: 'Renovación de Garantía Requerida',
        message: `La garantía del alquiler #${booking.id.slice(0, 8)} vence pronto. Por favor contactar al usuario para renovar.`,
        data: { booking_id: booking.id, intent_id: intent.id }
      });

      // Also log to a risk table if it exists
      // await supabase.from('risk_alerts').insert(...)

      results.push({
        intent_id: intent.id,
        booking_id: booking.id,
        status: 'renewal_needed_alert_sent'
      });
    }

    return new Response(JSON.stringify({ success: true, processed: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in renew-preauthorizations:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
