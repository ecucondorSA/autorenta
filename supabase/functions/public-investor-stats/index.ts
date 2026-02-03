import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Ejecutar queries en paralelo
    const [carsRes, bookingsRes, usersRes, gmvRes] = await Promise.all([
      supabase.from('cars').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.rpc('calculate_total_gmv') // RPC optimizado si existe, o query manual
    ]);

    // Calcular GMV manualmente si no hay RPC (fallback seguro)
    let totalGmv = 0;
    if (gmvRes.error) {
      // Fallback: Sumar bookings completados (limitado a últimos 1000 para performance)
      const { data: bookings } = await supabase
        .from('bookings')
        .select('total_amount')
        .in('status', ['completed', 'confirmed'])
        .order('created_at', { ascending: false })
        .limit(1000);
      
      totalGmv = bookings?.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0) || 0;
    } else {
      totalGmv = gmvRes.data || 0;
    }

    const stats = {
      active_cars: carsRes.count || 0,
      completed_trips: bookingsRes.count || 0,
      total_users: usersRes.count || 0,
      total_gmv_ars: Math.round(totalGmv),
      total_gmv_usd: Math.round(totalGmv / 1200), // Estimado USD
      generated_at: new Date().toISOString()
    };

    return new Response(JSON.stringify(stats), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600' // Cache 1 hora
      },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
