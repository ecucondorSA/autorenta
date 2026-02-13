/**
 * Edge Function: return-protocol-scheduler
 *
 * Executes the automatic return protocol for overdue bookings.
 * This function should be called periodically (every 30 minutes recommended)
 * via an external scheduler (cron-job.org, Supabase Cron, etc.)
 *
 * Actions performed:
 * 1. Detect overdue bookings and start return protocols (cron_check_overdue_bookings)
 * 2. Execute scheduled protocol events (cron_execute_scheduled_events)
 *
 * Protocol Timeline:
 * - T+2h:  Yellow alert (push + email to renter)
 * - T+6h:  Orange alert (automated call attempt)
 * - T+12h: User suspension
 * - T+24h: Police report generation + Insurance notification
 * - T+48h: Legal escalation
 *
 * Security: This function uses service role key and should only be called
 * by authorized schedulers with a valid API key or secret.
 *
 * Date: 2025-12-31
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { getCorsHeaders } from '../_shared/cors.ts';

interface ProtocolStats {
  new_protocols_started: number;
  events_executed: number;
  events_by_type: Record<string, number>;
  errors: string[];
}

interface ExecutionResult {
  success: boolean;
  timestamp: string;
  duration_ms: number;
  stats: ProtocolStats;
  error?: string;
}

serve(async (req) => {
  const startTime = Date.now();
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Optional: Validate scheduler secret for additional security
  const schedulerSecret = req.headers.get('x-scheduler-secret');
  const expectedSecret = Deno.env.get('SCHEDULER_SECRET');

  if (expectedSecret && schedulerSecret !== expectedSecret) {
    console.warn('[return-protocol-scheduler] Invalid or missing scheduler secret');
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const stats: ProtocolStats = {
    new_protocols_started: 0,
    events_executed: 0,
    events_by_type: {},
    errors: [],
  };

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[return-protocol-scheduler] Starting protocol check...');

    // ============================================================
    // STEP 1: Check for overdue bookings and start new protocols
    // ============================================================
    console.log('[return-protocol-scheduler] Step 1: Checking for overdue bookings...');

    const { data: newProtocolsCount, error: checkError } = await supabase.rpc(
      'cron_check_overdue_bookings'
    );

    if (checkError) {
      console.error('[return-protocol-scheduler] Error checking overdue bookings:', checkError);
      stats.errors.push(`cron_check_overdue_bookings: ${checkError.message}`);
    } else {
      stats.new_protocols_started = newProtocolsCount ?? 0;
      console.log(`[return-protocol-scheduler] Started ${stats.new_protocols_started} new protocols`);
    }

    // ============================================================
    // STEP 2: Execute scheduled protocol events
    // ============================================================
    console.log('[return-protocol-scheduler] Step 2: Executing scheduled events...');

    const { data: eventsExecuted, error: executeError } = await supabase.rpc(
      'cron_execute_scheduled_events'
    );

    if (executeError) {
      console.error('[return-protocol-scheduler] Error executing events:', executeError);
      stats.errors.push(`cron_execute_scheduled_events: ${executeError.message}`);
    } else {
      stats.events_executed = eventsExecuted ?? 0;
      console.log(`[return-protocol-scheduler] Executed ${stats.events_executed} events`);
    }

    // ============================================================
    // STEP 3: Get breakdown of executed events by type
    // ============================================================
    if (stats.events_executed > 0) {
      const { data: eventBreakdown, error: breakdownError } = await supabase
        .from('return_protocol_events')
        .select('event_type')
        .eq('status', 'executed')
        .gte('executed_at', new Date(startTime - 60000).toISOString()); // Last minute

      if (!breakdownError && eventBreakdown) {
        for (const event of eventBreakdown) {
          stats.events_by_type[event.event_type] = (stats.events_by_type[event.event_type] || 0) + 1;
        }
      }
    }

    // ============================================================
    // STEP 4: Log execution to cron_execution_logs if table exists
    // ============================================================
    try {
      await supabase.from('cron_execution_logs').insert({
        job_name: 'return_protocol_scheduler',
        success: stats.errors.length === 0,
        result: {
          new_protocols_started: stats.new_protocols_started,
          events_executed: stats.events_executed,
          events_by_type: stats.events_by_type,
        },
        error_message: stats.errors.length > 0 ? stats.errors.join('; ') : null,
        duration_ms: Date.now() - startTime,
      });
    } catch (logError) {
      // Table might not exist, ignore
      console.log('[return-protocol-scheduler] Could not log to cron_execution_logs (table may not exist)');
    }

    // ============================================================
    // Prepare response
    // ============================================================
    const duration = Date.now() - startTime;
    const result: ExecutionResult = {
      success: stats.errors.length === 0,
      timestamp: new Date().toISOString(),
      duration_ms: duration,
      stats,
    };

    console.log(`[return-protocol-scheduler] Completed in ${duration}ms. ` +
      `New protocols: ${stats.new_protocols_started}, Events: ${stats.events_executed}, Errors: ${stats.errors.length}`);

    return new Response(JSON.stringify(result), {
      status: stats.errors.length === 0 ? 200 : 207, // 207 = Multi-Status (partial success)
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[return-protocol-scheduler] Fatal error:', error);

    const duration = Date.now() - startTime;
    const result: ExecutionResult = {
      success: false,
      timestamp: new Date().toISOString(),
      duration_ms: duration,
      stats,
      error: 'Unknown error',
    };

    return new Response(JSON.stringify(result), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
