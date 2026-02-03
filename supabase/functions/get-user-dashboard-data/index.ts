// ============================================================================
// GET USER DASHBOARD DATA - Supabase Edge Function
// Consolidated dashboard data (5+ queries → 1 call with parallel execution)
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { getCorsHeaders } from '../_shared/cors.ts';

// ============================================================================
// TYPES
// ============================================================================

interface DashboardData {
  earnings: {
    total: number;
    this_month: number;
    last_month: number;
    pending: number;
    currency: string;
  };
  bookings: {
    active: number;
    pending_approval: number;
    upcoming: number;
    completed_total: number;
    in_dispute: number;
  };
  cars: {
    total: number;
    active: number;
    inactive: number;
    needs_attention: number;
  };
  wallet: {
    available_balance: number;
    locked_balance: number;
    withdrawable: number;
  };
  ratings: {
    average: number;
    count: number;
  };
  alerts: Alert[];
  cached_at: string;
}

interface Alert {
  type: 'info' | 'warning' | 'error';
  title: string;
  message: string;
  action_url?: string;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Execute all queries in parallel for maximum performance
    const [
      walletResult,
      carsResult,
      activeBookingsResult,
      pendingBookingsResult,
      upcomingBookingsResult,
      completedBookingsResult,
      disputeBookingsResult,
      earningsThisMonthResult,
      earningsLastMonthResult,
      pendingEarningsResult,
      totalEarningsResult,
      ratingsResult,
    ] = await Promise.all([
      // Wallet balance
      supabase.rpc('wallet_get_balance'),

      // Cars summary
      supabase
        .from('cars')
        .select('id, status, deleted_at')
        .eq('owner_id', userId)
        .is('deleted_at', null),

      // Active bookings (in_progress)
      supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', userId)
        .eq('status', 'in_progress'),

      // Pending approval
      supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', userId)
        .eq('status', 'pending_owner_approval'),

      // Upcoming (confirmed, not started)
      supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', userId)
        .eq('status', 'confirmed')
        .gt('start_date', now.toISOString()),

      // Completed total
      supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', userId)
        .eq('status', 'completed'),

      // In dispute
      supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', userId)
        .in('status', ['dispute', 'in_dispute']),

      // Earnings this month
      supabase
        .from('wallet_ledger')
        .select('amount')
        .eq('user_id', userId)
        .eq('type', 'credit')
        .in('category', ['booking_payment', 'rental_income'])
        .gte('created_at', startOfMonth.toISOString()),

      // Earnings last month
      supabase
        .from('wallet_ledger')
        .select('amount')
        .eq('user_id', userId)
        .eq('type', 'credit')
        .in('category', ['booking_payment', 'rental_income'])
        .gte('created_at', startOfLastMonth.toISOString())
        .lte('created_at', endOfLastMonth.toISOString()),

      // Pending earnings (locked funds)
      supabase
        .from('wallet_ledger')
        .select('amount')
        .eq('user_id', userId)
        .eq('type', 'credit')
        .eq('status', 'pending'),

      // Total earnings all time
      supabase
        .from('wallet_ledger')
        .select('amount')
        .eq('user_id', userId)
        .eq('type', 'credit')
        .in('category', ['booking_payment', 'rental_income']),

      // Ratings
      supabase
        .from('reviews')
        .select('rating')
        .eq('reviewee_id', userId),
    ]);

    // Process wallet
    const walletData = walletResult.data?.[0] ?? {};

    // Process cars
    const cars = carsResult.data ?? [];
    const activeCars = cars.filter((c: any) => c.status === 'active').length;
    const inactiveCars = cars.filter((c: any) => c.status !== 'active').length;

    // Process earnings
    const sumAmounts = (data: any[] | null) =>
      (data ?? []).reduce((sum, item) => sum + (item.amount ?? 0), 0);

    // Process ratings
    const reviews = ratingsResult.data ?? [];
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length
      : 0;

    // Build alerts
    const alerts: Alert[] = [];

    if ((pendingBookingsResult.count ?? 0) > 0) {
      alerts.push({
        type: 'warning',
        title: 'Reservas pendientes',
        message: `Tienes ${pendingBookingsResult.count} reservas esperando tu aprobacion`,
        action_url: '/bookings?status=pending',
      });
    }

    if (inactiveCars > 0) {
      alerts.push({
        type: 'info',
        title: 'Autos inactivos',
        message: `${inactiveCars} de tus autos no estan disponibles para alquilar`,
        action_url: '/cars/my',
      });
    }

    const response: DashboardData = {
      earnings: {
        total: sumAmounts(totalEarningsResult.data) / 100,
        this_month: sumAmounts(earningsThisMonthResult.data) / 100,
        last_month: sumAmounts(earningsLastMonthResult.data) / 100,
        pending: sumAmounts(pendingEarningsResult.data) / 100,
        currency: 'USD',
      },
      bookings: {
        active: activeBookingsResult.count ?? 0,
        pending_approval: pendingBookingsResult.count ?? 0,
        upcoming: upcomingBookingsResult.count ?? 0,
        completed_total: completedBookingsResult.count ?? 0,
        in_dispute: disputeBookingsResult.count ?? 0,
      },
      cars: {
        total: cars.length,
        active: activeCars,
        inactive: inactiveCars,
        needs_attention: 0, // Could be populated by check-missing-documents-batch
      },
      wallet: {
        available_balance: (walletData.available_balance ?? 0) / 100,
        locked_balance: (walletData.locked_balance ?? 0) / 100,
        withdrawable: (walletData.withdrawable_balance ?? 0) / 100,
      },
      ratings: {
        average: Math.round(avgRating * 10) / 10,
        count: reviews.length,
      },
      alerts,
      cached_at: now.toISOString(),
    };

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'private, max-age=60', // 1 min cache
        }
      }
    );

  } catch (error) {
    console.error('Dashboard error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
