// ============================================================================
// MONITORING HEALTH CHECK - Supabase Edge Function
// AutoRenta Production Monitoring System
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders } from '../_shared/cors.ts';

interface HealthCheckResult {
  check_name: string;
  check_type: 'endpoint' | 'database' | 'worker' | 'edge_function';
  status: 'healthy' | 'degraded' | 'down';
  response_time_ms: number;
  http_status?: number;
  error_message?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// HEALTH CHECK CONFIGURATION
// ============================================================================

const HEALTH_CHECK_CONFIG = {
  production_url: Deno.env.get('PRODUCTION_URL') || 'https://autorenta.com',
  supabase_url: Deno.env.get('SUPABASE_URL') || 'https://obxvffplochgeiclibng.supabase.co',
  supabase_anon_key: Deno.env.get('SUPABASE_ANON_KEY') || '',
  
  // Thresholds
  response_time_healthy: 1000, // 1 second
  response_time_degraded: 3000, // 3 seconds
  
  // Timeouts
  timeout_ms: 5000, // 5 seconds
};

// ============================================================================
// HEALTH CHECK FUNCTIONS
// ============================================================================

async function checkEndpoint(
  url: string,
  name: string,
  options: RequestInit = {}
): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_CONFIG.timeout_ms);
    
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'AutoRenta-Monitoring/1.0',
        ...options.headers,
      },
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    const status = response.ok 
      ? (responseTime < HEALTH_CHECK_CONFIG.response_time_healthy ? 'healthy' : 'degraded')
      : 'down';
    
    return {
      check_name: name,
      check_type: 'endpoint',
      status,
      response_time_ms: responseTime,
      http_status: response.status,
      error_message: response.ok ? undefined : `HTTP ${response.status}`,
      metadata: {
        url,
        method: options.method || 'GET',
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      check_name: name,
      check_type: 'endpoint',
      status: 'down',
      response_time_ms: responseTime,
      error_message: error instanceof Error ? error.message : String(error),
      metadata: {
        url,
        method: options.method || 'GET',
      },
    };
  }
}

async function checkSupabaseDatabase(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    const supabase = createClient(
      HEALTH_CHECK_CONFIG.supabase_url,
      HEALTH_CHECK_CONFIG.supabase_anon_key
    );
    
    // Simple query to check database connectivity
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    const responseTime = Date.now() - startTime;
    
    if (error) {
      return {
        check_name: 'supabase_database',
        check_type: 'database',
        status: 'down',
        response_time_ms: responseTime,
        error_message: error.message,
        metadata: {
          error_code: error.code,
        },
      };
    }
    
    const status = responseTime < HEALTH_CHECK_CONFIG.response_time_healthy ? 'healthy' : 'degraded';
    
    return {
      check_name: 'supabase_database',
      check_type: 'database',
      status,
      response_time_ms: responseTime,
      metadata: {
        query_result: data ? 'success' : 'empty',
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      check_name: 'supabase_database',
      check_type: 'database',
      status: 'down',
      response_time_ms: responseTime,
      error_message: error instanceof Error ? error.message : String(error),
    };
  }
}

async function checkEdgeFunction(
  functionName: string,
  url?: string
): Promise<HealthCheckResult> {
  const functionUrl = url || `${HEALTH_CHECK_CONFIG.supabase_url}/functions/v1/${functionName}`;
  
  return checkEndpoint(functionUrl, `edge_function_${functionName}`, {
    method: 'GET',
    headers: {
      'apikey': HEALTH_CHECK_CONFIG.supabase_anon_key,
    },
  });
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
    const supabaseAdmin = createClient(
      HEALTH_CHECK_CONFIG.supabase_url,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Run all health checks
    const checks: Promise<HealthCheckResult>[] = [
      // Production website
      checkEndpoint(HEALTH_CHECK_CONFIG.production_url, 'production_website'),
      
      // Critical endpoints
      checkEndpoint(`${HEALTH_CHECK_CONFIG.production_url}/auth/login`, 'endpoint_auth_login'),
      checkEndpoint(`${HEALTH_CHECK_CONFIG.production_url}/cars`, 'endpoint_cars_list'),
      
      // Database
      checkSupabaseDatabase(),
      
      // Critical Edge Functions
      checkEdgeFunction('mercadopago-webhook'),
      checkEdgeFunction('mercadopago-create-preference'),
    ];

    const results = await Promise.all(checks);

    // Store results in database
    const { error: insertError } = await supabaseAdmin
      .from('monitoring_health_checks')
      .insert(results.map(result => ({
        check_name: result.check_name,
        check_type: result.check_type,
        status: result.status,
        response_time_ms: result.response_time_ms,
        http_status: result.http_status,
        error_message: result.error_message,
        metadata: result.metadata || {},
      })));

    if (insertError) {
      console.error('Error storing health checks:', insertError);
    }

    // Check for failures and create alerts
    const failures = results.filter(r => r.status === 'down');
    const degraded = results.filter(r => r.status === 'degraded');

    if (failures.length > 0) {
      for (const failure of failures) {
        await supabaseAdmin.rpc('monitoring_create_alert', {
          p_alert_type: 'health_check_failed',
          p_severity: 'critical',
          p_title: `Health Check Failed: ${failure.check_name}`,
          p_message: failure.error_message || 'Service is down',
          p_metadata: {
            check_name: failure.check_name,
            check_type: failure.check_type,
            response_time_ms: failure.response_time_ms,
          },
        });
      }
    }

    if (degraded.length > 0) {
      await supabaseAdmin.rpc('monitoring_create_alert', {
        p_alert_type: 'performance_degradation',
        p_severity: 'warning',
        p_title: `Performance Degradation Detected`,
        p_message: `${degraded.length} service(s) are experiencing degraded performance`,
        p_metadata: {
          degraded_checks: degraded.map(d => ({
            name: d.check_name,
            response_time_ms: d.response_time_ms,
          })),
        },
      });
    }

    // Return summary
    const summary = {
      timestamp: new Date().toISOString(),
      total_checks: results.length,
      healthy: results.filter(r => r.status === 'healthy').length,
      degraded: degraded.length,
      down: failures.length,
      checks: results.map(r => ({
        name: r.check_name,
        status: r.status,
        response_time_ms: r.response_time_ms,
      })),
    };

    return new Response(
      JSON.stringify(summary, null, 2),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: failures.length > 0 ? 503 : degraded.length > 0 ? 200 : 200,
      }
    );
  } catch (error) {
    console.error('Health check error:', error);
    return new Response(
      JSON.stringify({
        error: 'Health check failed',
        message: error instanceof Error ? error.message : String(error),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});







