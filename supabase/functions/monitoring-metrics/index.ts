// ============================================================================
// MONITORING METRICS - Supabase Edge Function
// AutoRenta Metrics API Endpoint
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders } from '../_shared/cors.ts';

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'summary';

    switch (action) {
      case 'summary': {
        // Get health check summary for last 24 hours
        const { data: healthSummary, error: healthError } = await supabaseAdmin
          .rpc('monitoring_get_health_summary', { p_hours: 24 });

        if (healthError) throw healthError;

        // Get active alerts
        const { data: activeAlerts, error: alertsError } = await supabaseAdmin
          .rpc('monitoring_get_active_alerts');

        if (alertsError) throw alertsError;

        // Get recent performance metrics (last hour)
        const { data: recentMetrics, error: metricsError } = await supabaseAdmin
          .from('monitoring_performance_metrics')
          .select('*')
          .gte('recorded_at', new Date(Date.now() - 3600000).toISOString())
          .order('recorded_at', { ascending: false })
          .limit(100);

        if (metricsError) throw metricsError;

        return new Response(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            health_summary: healthSummary || [],
            active_alerts: activeAlerts || [],
            recent_metrics: recentMetrics || [],
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      case 'health_history': {
        const hours = parseInt(url.searchParams.get('hours') || '24');
        const checkName = url.searchParams.get('check_name');

        let query = supabaseAdmin
          .from('monitoring_health_checks')
          .select('*')
          .gte('checked_at', new Date(Date.now() - hours * 3600000).toISOString())
          .order('checked_at', { ascending: false })
          .limit(500);

        if (checkName) {
          query = query.eq('check_name', checkName);
        }

        const { data, error } = await query;

        if (error) throw error;

        return new Response(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            hours,
            check_name: checkName || 'all',
            count: data?.length || 0,
            checks: data || [],
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      case 'performance_metrics': {
        const hours = parseInt(url.searchParams.get('hours') || '24');
        const metricName = url.searchParams.get('metric_name');

        let query = supabaseAdmin
          .from('monitoring_performance_metrics')
          .select('*')
          .gte('recorded_at', new Date(Date.now() - hours * 3600000).toISOString())
          .order('recorded_at', { ascending: false })
          .limit(500);

        if (metricName) {
          query = query.eq('metric_name', metricName);
        }

        const { data, error } = await query;

        if (error) throw error;

        return new Response(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            hours,
            metric_name: metricName || 'all',
            count: data?.length || 0,
            metrics: data || [],
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      case 'active_alerts': {
        const { data, error } = await supabaseAdmin
          .rpc('monitoring_get_active_alerts');

        if (error) throw error;

        return new Response(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            count: data?.length || 0,
            alerts: data || [],
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action', available_actions: ['summary', 'health_history', 'performance_metrics', 'active_alerts'] }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
    }
  } catch (error) {
    console.error('Metrics API error:', error);
    return new Response(
      JSON.stringify({
        error: 'Metrics API failed',
        message: error instanceof Error ? error.message : String(error),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});







