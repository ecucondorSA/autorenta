/**
 * Marketing Scheduler Edge Function
 *
 * Processes the marketing_content_queue table and publishes
 * posts that are scheduled for the current time.
 *
 * Can be triggered by:
 * - GitHub Actions cron job
 * - Supabase pg_cron
 * - Manual invocation
 *
 * POST /marketing-scheduler
 *   Body: { max_posts?: number }
 */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';
import { getCorsHeaders } from '../_shared/cors.ts';

// ============================================================================
// TYPES
// ============================================================================

interface SchedulerRequest {
  max_posts?: number;
  dry_run?: boolean;
}

interface QueueItem {
  id: string;
  content_type: string;
  platform: string;
  text_content: string;
  media_url: string | null;
  media_type: string | null;
  hashtags: string[] | null;
  scheduled_for: string;
  status: string;
  attempts: number;
}

interface SchedulerResult {
  success: boolean;
  processed: number;
  published: number;
  failed: number;
  skipped: number;
  results: Array<{
    queue_id: string;
    platform: string;
    success: boolean;
    post_id?: string;
    error?: string;
  }>;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    let request: SchedulerRequest = {};
    try {
      request = await req.json();
    } catch {
      // Empty body is OK, use defaults
    }

    const maxPosts = request.max_posts || 10;
    const dryRun = request.dry_run || false;

    console.log(`[marketing-scheduler] Starting scheduler run (max: ${maxPosts}, dry_run: ${dryRun})`);

    // Initialize Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Get pending posts that are due
    const { data: pendingPosts, error: fetchError } = await supabase
      .from('marketing_content_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .lt('attempts', 3)
      .order('scheduled_for', { ascending: true })
      .limit(maxPosts);

    if (fetchError) {
      throw new Error(`Failed to fetch pending posts: ${fetchError.message}`);
    }

    if (!pendingPosts || pendingPosts.length === 0) {
      console.log('[marketing-scheduler] No pending posts to process');
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          published: 0,
          failed: 0,
          skipped: 0,
          results: [],
          message: 'No pending posts',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[marketing-scheduler] Found ${pendingPosts.length} pending posts`);

    const result: SchedulerResult = {
      success: true,
      processed: pendingPosts.length,
      published: 0,
      failed: 0,
      skipped: 0,
      results: [],
    };

    // Process each pending post
    for (const post of pendingPosts as QueueItem[]) {
      console.log(`[marketing-scheduler] Processing ${post.id} for ${post.platform}`);

      // Mark as processing
      if (!dryRun) {
        await supabase
          .from('marketing_content_queue')
          .update({ status: 'processing' })
          .eq('id', post.id);
      }

      try {
        if (dryRun) {
          // Dry run - just simulate
          result.results.push({
            queue_id: post.id,
            platform: post.platform,
            success: true,
            post_id: 'dry_run_' + post.id,
          });
          result.published++;
          continue;
        }

        // Call social-media-publisher
        const publishResponse = await fetch(`${SUPABASE_URL}/functions/v1/social-media-publisher`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            platform: post.platform,
            content: {
              text: post.text_content,
              media_url: post.media_url,
              media_type: post.media_type,
              hashtags: post.hashtags,
            },
            queue_id: post.id,
          }),
        });

        const publishResult = await publishResponse.json();

        if (publishResult.success) {
          result.published++;
          result.results.push({
            queue_id: post.id,
            platform: post.platform,
            success: true,
            post_id: publishResult.post_id,
          });
        } else {
          result.failed++;
          result.results.push({
            queue_id: post.id,
            platform: post.platform,
            success: false,
            error: publishResult.error,
          });
        }
      } catch (error) {
        console.error(`[marketing-scheduler] Error processing ${post.id}:`, error);
        result.failed++;
        result.results.push({
          queue_id: post.id,
          platform: post.platform,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        // Mark as failed in DB
        if (!dryRun) {
          await supabase.rpc('mark_marketing_post_failed', {
            p_queue_id: post.id,
            p_error_message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    const duration = Date.now() - startTime;
    console.log(
      `[marketing-scheduler] Completed in ${duration}ms. Published: ${result.published}, Failed: ${result.failed}`
    );

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[marketing-scheduler] Error:', error);
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
