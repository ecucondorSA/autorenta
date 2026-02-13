/**
 * Marketing Dashboard Edge Function (SEO 2026)
 *
 * Returns comprehensive marketing analytics and SEO metrics.
 *
 * GET /marketing-dashboard
 *   Query params:
 *     - days: number (default: 30) - days to look back
 *     - report: 'summary' | 'ab_testing' | 'seo_health' | 'full' (default: 'full')
 */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';
import { getCorsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

type ReportType = 'summary' | 'ab_testing' | 'seo_health' | 'full';

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get('days') || '30', 10);
    const reportType = (url.searchParams.get('report') || 'full') as ReportType;
    const contentType = url.searchParams.get('content_type') || null;

    console.log(`[marketing-dashboard] Generating ${reportType} report for ${days} days`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const result: Record<string, unknown> = {
      generated_at: new Date().toISOString(),
      days_back: days,
      report_type: reportType,
    };

    // Main dashboard
    if (reportType === 'full' || reportType === 'summary') {
      const { data: dashboard, error: dashboardError } = await supabase
        .rpc('get_marketing_dashboard', { p_days_back: days });

      if (dashboardError) {
        console.error('[marketing-dashboard] Dashboard error:', dashboardError);
      } else {
        result.dashboard = dashboard;
      }
    }

    // A/B Testing report
    if (reportType === 'full' || reportType === 'ab_testing') {
      const { data: abTesting, error: abError } = await supabase
        .rpc('get_ab_testing_report', { p_content_type: contentType });

      if (abError) {
        console.error('[marketing-dashboard] A/B Testing error:', abError);
      } else {
        result.ab_testing = {
          variants: abTesting,
          winner: abTesting?.[0] || null,
          total_variants: abTesting?.length || 0,
        };
      }
    }

    // SEO Health score
    if (reportType === 'full' || reportType === 'seo_health') {
      const { data: seoHealth, error: seoError } = await supabase
        .rpc('get_seo_health_score');

      if (seoError) {
        console.error('[marketing-dashboard] SEO Health error:', seoError);
      } else {
        result.seo_health = seoHealth;
      }
    }

    // Quick stats (always included)
    const { data: quickStats, error: quickError } = await supabase
      .from('marketing_content_queue')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .lte('scheduled_for', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());

    if (!quickError) {
      result.upcoming_24h = quickStats?.length || 0;
    }

    return new Response(
      JSON.stringify({
        success: true,
        ...result,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[marketing-dashboard] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
