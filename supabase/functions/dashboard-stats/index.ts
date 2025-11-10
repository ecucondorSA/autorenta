// ============================================================================
// DASHBOARD STATS - Supabase Edge Function
// AutoRenta Dashboard Statistics API
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders } from '../_shared/cors.ts';

// ============================================================================
// TYPES
// ============================================================================

interface DashboardStats {
  cars: {
    total: number;
    active: number;
  };
  bookings: {
    upcoming: number;
    active: number;
    completed: number;
  };
  earnings: {
    thisMonth: number;
    lastMonth: number;
    total: number;
  };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create Supabase client with user's JWT
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_ANON_KEY') || '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify user authentication
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Load all stats in parallel (server-side parallelization)
    const [carsResult, bookingsResult, earningsResult] = await Promise.all([
      // Get car statistics
      supabaseClient
        .from('cars')
        .select('id, status')
        .eq('user_id', user.id),

      // Get booking statistics
      supabaseClient
        .from('bookings')
        .select('id, status, start_at, total_amount, updated_at')
        .eq('car_owner_id', user.id),

      // Get completed bookings for earnings calculation
      supabaseClient
        .from('bookings')
        .select('total_amount, updated_at')
        .eq('car_owner_id', user.id)
        .eq('status', 'completed'),
    ]);

    if (carsResult.error) throw carsResult.error;
    if (bookingsResult.error) throw bookingsResult.error;
    if (earningsResult.error) throw earningsResult.error;

    const cars = carsResult.data || [];
    const bookings = bookingsResult.data || [];
    const completedBookings = earningsResult.data || [];

    // Calculate statistics
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const stats: DashboardStats = {
      cars: {
        total: cars.length,
        active: cars.filter(c => c.status === 'active').length,
      },
      bookings: {
        upcoming: bookings.filter(b =>
          b.status === 'confirmed' && new Date(b.start_at) > now
        ).length,
        active: bookings.filter(b => b.status === 'in_progress').length,
        completed: bookings.filter(b => b.status === 'completed').length,
      },
      earnings: {
        thisMonth: completedBookings
          .filter(b => {
            if (!b.updated_at) return false;
            const completedDate = new Date(b.updated_at);
            return completedDate >= thisMonthStart;
          })
          .reduce((sum, b) => sum + (b.total_amount || 0), 0),
        lastMonth: completedBookings
          .filter(b => {
            if (!b.updated_at) return false;
            const completedDate = new Date(b.updated_at);
            return completedDate >= lastMonthStart && completedDate <= lastMonthEnd;
          })
          .reduce((sum, b) => sum + (b.total_amount || 0), 0),
        total: completedBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0),
      },
    };

    return new Response(JSON.stringify(stats), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
