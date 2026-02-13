// ============================================================================
// AUTORENTA - Get Participation Stats Edge Function
// ============================================================================
// Retorna estadísticas de participación del dueño en tiempo real
// Calcula puntos acumulados, share del pool y estado del FGO
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

interface ParticipationStats {
  owner_id: string;
  period: string;
  total_points: number;
  estimated_share: number;
  estimated_earnings_usd: number;
  fgo_status: string;
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

    // Obtener usuario desde el token
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) throw new Error('Invalid token');

    const userId = user.id;
    const currentMonth = new Date().toISOString().substring(0, 7) + '-01';

    console.log(`[Participation] Fetching stats for user ${userId} for period ${currentMonth}`);

    // 1. Obtener puntos acumulados en el mes actual
    const { data: pointsData, error: pointsError } = await supabase
      .from('daily_car_points')
      .select('total_points')
      .eq('owner_id', userId)
      .gte('date', currentMonth);

    if (pointsError) throw pointsError;

    const totalPoints = pointsData?.reduce((sum, p) => sum + (p.total_points || 0), 0) || 0;

    // 2. Obtener total de puntos de la red para calcular share (estimado)
    const { data: networkData, error: networkError } = await supabase
      .from('v_current_reward_pool')
      .select('total_network_points, distributable_revenue_usd')
      .single();

    // v_current_reward_pool might be empty at start of month
    const totalNetworkPoints = networkData?.total_network_points || 1; // Avoid div by zero
    const distributableRevenue = networkData?.distributable_revenue_usd || 0;

    const share = totalPoints / totalNetworkPoints;
    const earnings = distributableRevenue * share;

    // 3. Obtener estado del FGO
    const { data: fgoData, error: fgoError } = await supabase
      .from('v_fgo_status')
      .select('status')
      .single();

    const stats: ParticipationStats = {
      owner_id: userId,
      period: currentMonth.substring(0, 7),
      total_points: totalPoints,
      estimated_share: share,
      estimated_earnings_usd: earnings,
      fgo_status: fgoData?.status || 'healthy'
    };

    return new Response(JSON.stringify(stats), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Participation] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
