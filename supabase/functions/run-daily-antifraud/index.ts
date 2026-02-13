/**
 * @fileoverview Edge Function: run-daily-antifraud
 * @version 1.0
 * @created 2026-02-10
 *
 * Daily cron job (02:00 UTC) that activates the anti-fraud pipeline:
 * 1. Calculate daily points for all active cars (populate daily_car_points)
 * 2. Detect gaming signals for all owners (populate owner_gaming_signals)
 * 3. Update monthly summaries with eligibility (populate owner_monthly_summary)
 * 4. Expire old gaming signals (housekeeping)
 *
 * Each step calls a database function via RPC (service_role).
 * Failure in one step does NOT block subsequent steps — all are logged.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getCorsHeaders } from '../_shared/cors.ts';

interface StepResult {
  step: string;
  success: boolean;
  count?: number;
  error?: string;
  duration_ms: number;
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();
  const results: StepResult[] = [];
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  console.log(`[antifraud] Starting daily anti-fraud pipeline for ${today}`);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // ========================================
  // STEP 1: Calculate daily points
  // ========================================
  {
    const stepStart = Date.now();
    try {
      const { data, error } = await supabase.rpc('run_daily_points_calculation', {
        p_date: today,
      });

      if (error) throw error;

      const count = typeof data === 'number' ? data : 0;
      console.log(`[antifraud] Step 1: Calculated points for ${count} cars`);
      results.push({
        step: 'calculate_daily_points',
        success: true,
        count,
        duration_ms: Date.now() - stepStart,
      });
    } catch (err: unknown) {
      const message = 'Internal server error';
      console.error(`[antifraud] Step 1 FAILED:`, message);
      results.push({
        step: 'calculate_daily_points',
        success: false,
        error: message,
        duration_ms: Date.now() - stepStart,
      });
    }
  }

  // ========================================
  // STEP 2: Detect gaming signals
  // ========================================
  {
    const stepStart = Date.now();
    try {
      const { data, error } = await supabase.rpc('detect_owner_gaming_signals', {
        p_date: today,
      });

      if (error) throw error;

      const signals = Array.isArray(data) ? data : [];
      const totalSignals = signals.reduce(
        (sum: number, r: { signals_detected: number }) => sum + r.signals_detected,
        0
      );
      const ownersAffected = signals.length;

      console.log(
        `[antifraud] Step 2: Detected ${totalSignals} signals across ${ownersAffected} owners`
      );
      results.push({
        step: 'detect_gaming_signals',
        success: true,
        count: totalSignals,
        duration_ms: Date.now() - stepStart,
      });
    } catch (err: unknown) {
      const message = 'Internal server error';
      console.error(`[antifraud] Step 2 FAILED:`, message);
      results.push({
        step: 'detect_gaming_signals',
        success: false,
        error: message,
        duration_ms: Date.now() - stepStart,
      });
    }
  }

  // ========================================
  // STEP 3: Update monthly summaries
  // ========================================
  {
    const stepStart = Date.now();
    try {
      // Current month start date
      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

      const { data, error } = await supabase.rpc('update_monthly_summaries', {
        p_month: monthStart,
      });

      if (error) throw error;

      const count = typeof data === 'number' ? data : 0;
      console.log(`[antifraud] Step 3: Updated ${count} monthly summaries`);
      results.push({
        step: 'update_monthly_summaries',
        success: true,
        count,
        duration_ms: Date.now() - stepStart,
      });
    } catch (err: unknown) {
      const message = 'Internal server error';
      console.error(`[antifraud] Step 3 FAILED:`, message);
      results.push({
        step: 'update_monthly_summaries',
        success: false,
        error: message,
        duration_ms: Date.now() - stepStart,
      });
    }
  }

  // ========================================
  // STEP 4: Expire old signals (housekeeping)
  // ========================================
  {
    const stepStart = Date.now();
    try {
      const { data, error } = await supabase.rpc('expire_old_gaming_signals');

      if (error) throw error;

      const count = typeof data === 'number' ? data : 0;
      if (count > 0) {
        console.log(`[antifraud] Step 4: Expired ${count} old signals`);
      }
      results.push({
        step: 'expire_old_signals',
        success: true,
        count,
        duration_ms: Date.now() - stepStart,
      });
    } catch (err: unknown) {
      const message = 'Internal server error';
      console.error(`[antifraud] Step 4 FAILED:`, message);
      results.push({
        step: 'expire_old_signals',
        success: false,
        error: message,
        duration_ms: Date.now() - stepStart,
      });
    }
  }

  // ========================================
  // SUMMARY
  // ========================================
  const totalDuration = Date.now() - startTime;
  const allSuccess = results.every((r) => r.success);
  const failedSteps = results.filter((r) => !r.success);

  console.log(
    `[antifraud] Pipeline ${allSuccess ? 'COMPLETED' : 'PARTIAL'} in ${totalDuration}ms ` +
      `(${results.length - failedSteps.length}/${results.length} steps OK)`
  );

  return new Response(
    JSON.stringify({
      success: allSuccess,
      date: today,
      duration_ms: totalDuration,
      steps: results,
      failed_steps: failedSteps.length > 0 ? failedSteps.map((s) => s.step) : undefined,
    }),
    {
      status: allSuccess ? 200 : 207, // 207 Multi-Status for partial success
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
});
