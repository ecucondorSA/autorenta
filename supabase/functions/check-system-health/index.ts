import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { getCorsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const start = performance.now()
  const checks: Record<string, string> = {}
  let status = 'healthy'

  try {
    // 1. Initialize Supabase Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 2. Check Database (Simple Query)
    const dbStart = performance.now()
    const { error: dbError } = await supabase.from('profiles').select('count', { count: 'exact', head: true }).limit(1)
    
    if (dbError) {
      checks.database = 'down'
      status = 'critical'
      console.error('Database Check Failed:', dbError)
    } else {
      const dbLatency = Math.round(performance.now() - dbStart)
      checks.database = `up (${dbLatency}ms)`
    }

    // 3. Check Storage (Public Bucket Access)
    // Checking if 'vehicles' bucket exists/is accessible
    const { data: buckets, error: storageError } = await supabase.storage.listBuckets()
    
    if (storageError) {
      checks.storage = 'down'
      status = (status === 'healthy') ? 'degraded' : status
    } else {
      const vehicleBucket = buckets?.find(b => b.name === 'vehicles')
      checks.storage = vehicleBucket ? 'up' : 'warning (bucket missing)'
    }

    // 4. External Integrations (Simulated for speed, could ping real endpoints)
    // MercadoPago Public Key presence check
    const mpKey = Deno.env.get('MERCADOPAGO_PUBLIC_KEY')
    checks.mercadopago_config = mpKey ? 'configured' : 'missing'

    const totalLatency = Math.round(performance.now() - start)

    return new Response(
      JSON.stringify({
        status,
        timestamp: new Date().toISOString(),
        latency_ms: totalLatency,
        environment: Deno.env.get('ENVIRONMENT') || 'development',
        checks,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: status === 'healthy' ? 200 : 503,
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({
        status: 'critical',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})