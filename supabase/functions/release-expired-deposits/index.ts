import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // 1. Find bookings ready for auto-release
  // Status must be compatible with release (e.g. 'inspected_good' or 'returned' + time passed)
  // We rely on auto_release_at timestamp being passed
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, wallet_status, auto_release_at, status')
    .lt('auto_release_at', new Date().toISOString())
    .neq('wallet_status', 'refunded') // Already refunded
    .neq('wallet_status', 'charged')  // Already fully charged
    .limit(50); // Batch size

  if (error) {
    return new Response(JSON.stringify({ error }), { status: 500 });
  }

  if (!bookings || bookings.length === 0) {
    return new Response(JSON.stringify({ message: 'No bookings to release' }), { status: 200 });
  }

  const results = [];

  for (const booking of bookings) {
    try {
      console.log(`Auto-releasing security deposit for booking ${booking.id}`);

      // Call database RPC to release the funds (logic must be atomic in DB)
      // Note: BookingWalletService.releaseSecurityDeposit calls 'wallet_release_lock' RPC
      // We can call that RPC directly here.

      const { data: result, error: rpcError } = await supabase.rpc('wallet_release_lock', {
        p_booking_id: booking.id,
        p_description: 'Liberación automática por sistema (sin daños reportados)'
      });

      if (rpcError) throw rpcError;

      // Update booking to clear the flag
      await supabase
        .from('bookings')
        .update({
          auto_release_at: null, // Clear timer
          funds_released_at: new Date().toISOString(),
          status: 'completed' // Ensure it's closed
        })
        .eq('id', booking.id);

      results.push({ id: booking.id, status: 'released' });

    } catch (err) {
      console.error(`Error releasing booking ${booking.id}:`, err);
      results.push({ id: booking.id, error: err });
    }
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  });
});
