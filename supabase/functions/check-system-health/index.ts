import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

console.log("Health Check Function Initialized");

serve(async (req) => {
  const start = performance.now();
  const checks: Record<string, string> = {
    db: 'unknown',
    auth: 'unknown',
    storage: 'unknown'
  };
  let status = 'healthy';

  try {
    // 1. Initialize Client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 2. Check Database (Simple Query)
    const dbStart = performance.now();
    const { error: dbError } = await supabase.from('cars').select('count', { count: 'exact', head: true }).limit(1);
    const dbLatency = performance.now() - dbStart;
    
    if (dbError) {
      checks.db = 'down';
      status = 'degraded';
      console.error('DB Check Failed:', dbError);
    } else {
      checks.db = dbLatency > 200 ? 'slow' : 'up';
    }

    // 3. Check Auth (Config)
    const { data: authConfig, error: authError } = await supabase.auth.getSession();
    // Getting session with anon key usually returns null session but no error if service is up
    if (authError) {
      checks.auth = 'down';
      status = 'degraded';
    } else {
      checks.auth = 'up';
    }

    // 4. Check Storage (List Buckets)
    const { data: buckets, error: storageError } = await supabase.storage.listBuckets();
    if (storageError) {
      checks.storage = 'down';
      status = 'degraded';
    } else {
      checks.storage = 'up';
    }

    const totalLatency = performance.now() - start;

    return new Response(JSON.stringify({
      status,
      timestamp: new Date().toISOString(),
      latency_ms: Math.round(totalLatency),
      checks
    }), {
      headers: { "Content-Type": "application/json" },
      status: status === 'healthy' ? 200 : 503
    });

  } catch (err) {
    return new Response(JSON.stringify({
      status: 'critical_failure',
      error: String(err)
    }), {
      headers: { "Content-Type": "application/json" },
      status: 500
    });
  }
});
