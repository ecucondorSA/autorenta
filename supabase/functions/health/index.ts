/**
 * Supabase Edge Function: health
 *
 * Health check endpoint for monitoring systems.
 * Checks:
 * - Database connectivity
 * - MercadoPago API reachability
 * - Critical table access
 * - System metrics
 *
 * Usage:
 *   GET /functions/v1/health
 *   GET /functions/v1/health?verbose=true (detailed checks)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

interface HealthCheck {
  component: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency_ms: number;
  details?: Record<string, unknown>;
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  checks: HealthCheck[];
  metrics?: {
    uptime_seconds: number;
    memory_usage_mb: number;
  };
}

const startTime = Date.now();

async function checkDatabase(supabase: any): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
      .single();

    const latency = Date.now() - start;

    if (error && !error.message.includes('0 rows')) {
      return {
        component: 'database',
        status: latency > 1000 ? 'degraded' : 'unhealthy',
        latency_ms: latency,
        details: { error: error.message },
      };
    }

    return {
      component: 'database',
      status: latency > 500 ? 'degraded' : 'healthy',
      latency_ms: latency,
    };
  } catch (e) {
    return {
      component: 'database',
      status: 'unhealthy',
      latency_ms: Date.now() - start,
      details: { error: e instanceof Error ? e.message : 'Unknown error' },
    };
  }
}

async function checkMercadoPago(): Promise<HealthCheck> {
  const start = Date.now();
  const token = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');

  if (!token) {
    return {
      component: 'mercadopago',
      status: 'unhealthy',
      latency_ms: 0,
      details: { error: 'MERCADOPAGO_ACCESS_TOKEN not configured' },
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch('https://api.mercadopago.com/users/me', {
      headers: {
        Authorization: `Bearer ${token.trim()}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const latency = Date.now() - start;

    if (response.ok) {
      return {
        component: 'mercadopago',
        status: latency > 2000 ? 'degraded' : 'healthy',
        latency_ms: latency,
      };
    }

    return {
      component: 'mercadopago',
      status: response.status === 401 ? 'unhealthy' : 'degraded',
      latency_ms: latency,
      details: { status: response.status },
    };
  } catch (e) {
    return {
      component: 'mercadopago',
      status: 'unhealthy',
      latency_ms: Date.now() - start,
      details: { error: e instanceof Error ? e.message : 'Timeout or network error' },
    };
  }
}

async function checkCriticalTables(supabase: any): Promise<HealthCheck> {
  const start = Date.now();
  const tables = ['bookings', 'payments', 'wallets', 'cars'];
  const issues: string[] = [];

  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('id').limit(1);
      if (error) {
        issues.push(`${table}: ${error.message}`);
      }
    } catch (e) {
      issues.push(`${table}: ${e instanceof Error ? e.message : 'error'}`);
    }
  }

  const latency = Date.now() - start;

  if (issues.length === 0) {
    return {
      component: 'critical_tables',
      status: 'healthy',
      latency_ms: latency,
    };
  }

  return {
    component: 'critical_tables',
    status: issues.length >= tables.length / 2 ? 'unhealthy' : 'degraded',
    latency_ms: latency,
    details: { issues },
  };
}

async function checkPendingPayments(supabase: any): Promise<HealthCheck> {
  const start = Date.now();
  try {
    // Check for stuck pending payments (older than 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('bookings')
      .select('id', { count: 'exact' })
      .eq('status', 'pending_payment')
      .lt('created_at', oneHourAgo);

    const latency = Date.now() - start;
    const stuckCount = data?.length || 0;

    if (error) {
      return {
        component: 'pending_payments',
        status: 'degraded',
        latency_ms: latency,
        details: { error: error.message },
      };
    }

    return {
      component: 'pending_payments',
      status: stuckCount > 10 ? 'degraded' : 'healthy',
      latency_ms: latency,
      details: { stuck_count: stuckCount },
    };
  } catch (e) {
    return {
      component: 'pending_payments',
      status: 'degraded',
      latency_ms: Date.now() - start,
      details: { error: e instanceof Error ? e.message : 'Unknown error' },
    };
  }
}

async function checkDLQSize(supabase: any): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const { data, error } = await supabase
      .from('webhook_dead_letter')
      .select('id', { count: 'exact' })
      .in('status', ['pending', 'retrying']);

    const latency = Date.now() - start;
    const dlqSize = data?.length || 0;

    if (error) {
      // Table might not exist yet
      if (error.message.includes('does not exist')) {
        return {
          component: 'dead_letter_queue',
          status: 'healthy',
          latency_ms: latency,
          details: { message: 'DLQ table not yet created' },
        };
      }
      return {
        component: 'dead_letter_queue',
        status: 'degraded',
        latency_ms: latency,
        details: { error: error.message },
      };
    }

    return {
      component: 'dead_letter_queue',
      status: dlqSize > 50 ? 'degraded' : 'healthy',
      latency_ms: latency,
      details: { pending_items: dlqSize },
    };
  } catch (e) {
    return {
      component: 'dead_letter_queue',
      status: 'degraded',
      latency_ms: Date.now() - start,
      details: { error: e instanceof Error ? e.message : 'Unknown error' },
    };
  }
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const verbose = url.searchParams.get('verbose') === 'true';

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return new Response(
      JSON.stringify({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        checks: [
          {
            component: 'configuration',
            status: 'unhealthy',
            latency_ms: 0,
            details: { error: 'Missing environment variables' },
          },
        ],
      }),
      {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Run all checks in parallel
  const checks = await Promise.all([
    checkDatabase(supabase),
    checkMercadoPago(),
    checkCriticalTables(supabase),
    ...(verbose
      ? [checkPendingPayments(supabase), checkDLQSize(supabase)]
      : []),
  ]);

  // Determine overall status
  const hasUnhealthy = checks.some((c) => c.status === 'unhealthy');
  const hasDegraded = checks.some((c) => c.status === 'degraded');

  const overallStatus: 'healthy' | 'degraded' | 'unhealthy' = hasUnhealthy
    ? 'unhealthy'
    : hasDegraded
    ? 'degraded'
    : 'healthy';

  // Record health check in database (best effort)
  try {
    await supabase.rpc('record_health_check', {
      p_component: 'system',
      p_status: overallStatus,
      p_latency_ms: checks.reduce((sum, c) => sum + c.latency_ms, 0),
      p_details: { checks: checks.map((c) => ({ component: c.component, status: c.status })) },
    });
  } catch (e) {
    // Ignore - table might not exist
  }

  const response: HealthResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    checks,
  };

  if (verbose) {
    response.metrics = {
      uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
      memory_usage_mb: Math.round((performance as any)?.memory?.usedJSHeapSize / 1024 / 1024) || 0,
    };
  }

  const httpStatus = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;

  return new Response(JSON.stringify(response, null, 2), {
    status: httpStatus,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
