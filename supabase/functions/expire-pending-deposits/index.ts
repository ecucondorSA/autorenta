/**
 * Edge Function: expire-pending-deposits
 *
 * Limpieza general de datos expirados. Maneja 8 tipos de registros.
 * Migrado desde cleanup-expired-data.yml (Regla #1: workflows orquestan, Edge Functions ejecutan).
 *
 * Diseñado para ejecutarse diariamente via cron o manualmente.
 *
 * Query params:
 *   - dry_run=true: Solo contar, no borrar
 *
 * Cleanup operations:
 *   1. OTP verifications >24h
 *   2. Price locks >24h
 *   3. Notification logs >90 days
 *   4. Audit logs >90 days (non-critical)
 *   5. Expired OAuth tokens
 *   6. Failed payments >30 days
 *   7. Pending deposits >7 days
 *   8. Car views & search logs >90 days
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

interface CleanupResult {
  table: string;
  description: string;
  count: number;
  deleted: boolean;
  error?: string;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse query params
    const url = new URL(req.url);
    const dryRun = url.searchParams.get('dry_run') === 'true';

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();

    console.log(`Cleanup started (dry_run: ${dryRun})`);

    const results: CleanupResult[] = [];

    // Helper: count + optional delete
    async function cleanup(
      table: string,
      description: string,
      filterFn: (query: any) => any,
    ): Promise<CleanupResult> {
      try {
        // Count first
        const countQuery = filterFn(supabase.from(table).select('id', { count: 'exact', head: true }));
        const { count, error: countError } = await countQuery;

        if (countError) {
          // Table may not exist — skip gracefully
          if (countError.message?.includes('does not exist') || countError.code === '42P01') {
            return { table, description, count: 0, deleted: false, error: 'table not found' };
          }
          throw countError;
        }

        const recordCount = count || 0;

        if (recordCount === 0 || dryRun) {
          return { table, description, count: recordCount, deleted: !dryRun };
        }

        // Delete (Supabase client handles batching internally)
        const deleteQuery = filterFn(supabase.from(table).delete());
        const { error: deleteError } = await deleteQuery;

        if (deleteError) throw deleteError;

        console.log(`${description}: deleted ${recordCount} records`);
        return { table, description, count: recordCount, deleted: true };
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        console.error(`${description}: ${msg}`);
        return { table, description, count: 0, deleted: false, error: msg };
      }
    }

    // 1. Expired OTP verifications (>24h)
    results.push(await cleanup('otp_verifications', 'Expired OTPs', (q) =>
      q.lt('expires_at', oneDayAgo)));

    // 2. Expired price locks (>24h)
    results.push(await cleanup('price_locks', 'Expired price locks', (q) =>
      q.lt('expires_at', oneDayAgo)));

    // 3. Old notification logs (>90 days)
    results.push(await cleanup('notification_logs', 'Old notification logs', (q) =>
      q.lt('created_at', ninetyDaysAgo)));

    // 4. Old audit logs (>90 days, non-critical only)
    results.push(await cleanup('audit_logs', 'Old audit logs (non-critical)', (q) =>
      q.lt('created_at', ninetyDaysAgo).neq('severity', 'critical')));

    // 5. Expired OAuth tokens
    results.push(await cleanup('oauth_tokens', 'Expired OAuth tokens', (q) =>
      q.lt('expires_at', now.toISOString())));

    // 6. Old failed payments (>30 days)
    results.push(await cleanup('payments', 'Old rejected payments', (q) =>
      q.eq('status', 'rejected').lt('created_at', thirtyDaysAgo)));

    // 7. Expired pending deposits (>7 days)
    results.push(await cleanup('deposits', 'Expired pending deposits', (q) =>
      q.eq('status', 'pending').lt('created_at', sevenDaysAgo)));

    // 8a. Old car views (>90 days)
    results.push(await cleanup('car_views', 'Old car views', (q) =>
      q.lt('created_at', ninetyDaysAgo)));

    // 8b. Old search logs (>90 days)
    results.push(await cleanup('search_logs', 'Old search logs', (q) =>
      q.lt('created_at', ninetyDaysAgo)));

    // Summary
    const totalCleaned = results.reduce((sum, r) => sum + r.count, 0);
    const errors = results.filter((r) => r.error);

    return new Response(
      JSON.stringify({
        success: true,
        dry_run: dryRun,
        total_cleaned: totalCleaned,
        operations: results.length,
        errors: errors.length,
        results,
        executed_at: now.toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Cleanup error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
