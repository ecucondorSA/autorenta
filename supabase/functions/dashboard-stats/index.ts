// ============================================================================
// DASHBOARD STATS - Supabase Edge Function
// AutoRenta Owner Dashboard Statistics API
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders } from '../_shared/cors.ts';

// ============================================================================
// TYPES
// ============================================================================

interface DashboardStats {
  wallet: {
    availableBalance: number;
    lockedBalance: number;
    totalBalance: number;
    withdrawableBalance: number;
  };
  cars: {
    total: number;
    active: number;
    pending: number;
    suspended: number;
  };
  bookings: {
    upcoming: number;
    active: number;
    completed: number;
    total: number;
  };
  earnings: {
    thisMonth: number;
    lastMonth: number;
    total: number;
    currency: string;
  };
  timestamp: string;
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
    // Verify JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    const supabase = createClient(
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

    // Verify user from JWT
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    // Execute all queries in parallel for maximum performance
    const [walletResult, carsResult, bookingsResult] = await Promise.all([
      // 1. Get wallet balance
      supabase.rpc('wallet_get_balance'),

      // 2. Get cars with status counts
      supabase
        .from('cars')
        .select('id, status')
        .eq('owner_id', user.id),

      // 3. Get all bookings for earnings calculation
      supabase
        .from('bookings')
        .select('id, status, start_at, total_amount, updated_at, created_at')
        .eq('owner_id', user.id),
    ]);

    // Handle errors
    if (walletResult.error) {
      console.error('Wallet query error:', walletResult.error);
      throw new Error('Failed to fetch wallet balance');
    }

    if (carsResult.error) {
      console.error('Cars query error:', carsResult.error);
      throw new Error('Failed to fetch cars');
    }

    if (bookingsResult.error) {
      console.error('Bookings query error:', bookingsResult.error);
      throw new Error('Failed to fetch bookings');
    }

    // Process wallet data
    const walletData = walletResult.data?.[0] || {
      available_balance: 0,
      locked_balance: 0,
      total_balance: 0,
      withdrawable_balance: 0,
    };

    // Process cars data
    const cars = carsResult.data || [];
    const carStats = {
      total: cars.length,
      active: cars.filter((c) => c.status === 'active').length,
      pending: cars.filter((c) => c.status === 'pending').length,
      suspended: cars.filter((c) => c.status === 'suspended').length,
    };

    // Process bookings data
    const bookings = bookingsResult.data || [];
    const now = new Date();

    const bookingStats = {
      upcoming: bookings.filter(
        (b) => b.status === 'confirmed' && new Date(b.start_at) > now
      ).length,
      active: bookings.filter((b) => b.status === 'in_progress').length,
      completed: bookings.filter((b) => b.status === 'completed').length,
      total: bookings.length,
    };

    // Calculate earnings by period
    const completedBookings = bookings.filter((b) => b.status === 'completed');

    const thisMonth = completedBookings
      .filter((b) => {
        if (!b.updated_at) return false;
        const completedDate = new Date(b.updated_at);
        return (
          completedDate.getMonth() === now.getMonth() &&
          completedDate.getFullYear() === now.getFullYear()
        );
      })
      .reduce((sum, b) => sum + (b.total_amount || 0), 0);

    const lastMonth = completedBookings
      .filter((b) => {
        if (!b.updated_at) return false;
        const completedDate = new Date(b.updated_at);
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1);
        return (
          completedDate.getMonth() === lastMonthDate.getMonth() &&
          completedDate.getFullYear() === lastMonthDate.getFullYear()
        );
      })
      .reduce((sum, b) => sum + (b.total_amount || 0), 0);

    const total = completedBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);

    // Build response
    const stats: DashboardStats = {
      wallet: {
        availableBalance: walletData.available_balance || 0,
        lockedBalance: walletData.locked_balance || 0,
        totalBalance: walletData.total_balance || 0,
        withdrawableBalance: walletData.withdrawable_balance || 0,
      },
      cars: carStats,
      bookings: bookingStats,
      earnings: {
        thisMonth,
        lastMonth,
        total,
        currency: 'ARS',
      },
      timestamp: new Date().toISOString(),
    };

    return new Response(
      JSON.stringify(stats),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch dashboard stats',
        message: error instanceof Error ? error.message : String(error),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
