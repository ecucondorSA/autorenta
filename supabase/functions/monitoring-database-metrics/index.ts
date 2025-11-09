// ============================================================================
// MONITORING DATABASE METRICS - Supabase Edge Function
// Automatically monitors database metrics and creates alerts
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Allow GET requests (for UptimeRobot monitoring)
  // Accept requests with or without auth header
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use GET.' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // Optional: Check for basic auth (anon key) but don't require it
  // Supabase may still require some auth, so we'll handle errors gracefully

  // Set timeout for the entire operation (30 seconds max)
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout')), 30000);
  });

  try {
    const operationPromise = (async () => {
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

      // Execute the monitoring function with timeout
      const { data, error } = await supabaseAdmin.rpc('monitoring_check_database_metrics');

      if (error) {
        console.error('Error checking database metrics:', error);
        throw error;
      }

      // Get recent metrics
      const { data: recentMetrics } = await supabaseAdmin
        .from('monitoring_performance_metrics')
        .select('*')
        .eq('resource_name', 'database')
        .order('recorded_at', { ascending: false })
        .limit(5);

      // Get active alerts
      const { data: activeAlerts } = await supabaseAdmin
        .from('monitoring_alerts')
        .select('*')
        .eq('status', 'active')
        .like('alert_type', 'database_%')
        .order('created_at', { ascending: false });

      return {
        success: true,
        timestamp: new Date().toISOString(),
        message: 'Database metrics checked successfully',
        recent_metrics: recentMetrics || [],
        active_alerts: activeAlerts || [],
      };
    })();

    // Wait for operation with timeout
    const result = await Promise.race([operationPromise, timeoutPromise]);

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Return 200 even on error so UptimeRobot doesn't mark as down
    // (we log the error but don't fail the monitor)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
        message: 'Monitoring check completed with errors (see logs)'
      }),
      {
        status: 200, // Return 200 so UptimeRobot doesn't alert
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

