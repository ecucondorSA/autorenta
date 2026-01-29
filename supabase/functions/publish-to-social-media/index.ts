/**
 * Publish to Social Media - Campaign Orchestrator
 *
 * Orchestrates publishing a campaign to multiple social media platforms.
 * Internally calls social-media-publisher for each platform.
 *
 * POST /publish-to-social-media
 *   Body: {
 *     campaignId: string,
 *     title: string,
 *     description: string,
 *     imageUrl?: string,
 *     ctaText: string,
 *     ctaUrl: string,
 *     platforms: string[]
 *   }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';
import { getCorsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface PublishRequest {
  campaignId: string;
  title: string;
  description: string;
  imageUrl?: string;
  ctaText: string;
  ctaUrl: string;
  platforms: string[];
}

interface PublishResult {
  platform: string;
  success: boolean;
  postId?: string;
  postUrl?: string;
  error?: string;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: PublishRequest = await req.json();

    console.log('[publish-to-social-media] Publishing campaign:', {
      campaignId: payload.campaignId,
      platforms: payload.platforms,
    });

    // Validate required fields
    if (!payload.title || !payload.description) {
      return new Response(
        JSON.stringify({ error: 'Missing title or description' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!payload.platforms || payload.platforms.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No platforms specified' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Build content text
    const contentText = `${payload.title}\n\n${payload.description}\n\n${payload.ctaText}\n${payload.ctaUrl}`;

    // Determine media type from URL
    let mediaType: 'image' | 'video' | undefined;
    if (payload.imageUrl) {
      const lowerUrl = payload.imageUrl.toLowerCase();
      if (lowerUrl.includes('.mp4') || lowerUrl.includes('.mov') || lowerUrl.includes('.webm')) {
        mediaType = 'video';
      } else {
        mediaType = 'image';
      }
    }

    // Call social-media-publisher for each platform in parallel
    const publishTasks = payload.platforms.map(async (platform): Promise<PublishResult> => {
      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/social-media-publisher`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            platform: platform.toLowerCase(),
            content: {
              text: contentText,
              media_url: payload.imageUrl,
              media_type: mediaType,
            },
          }),
        });

        const result = await response.json();

        if (result.success) {
          return {
            platform,
            success: true,
            postId: result.post_id,
            postUrl: result.post_url,
          };
        } else {
          return {
            platform,
            success: false,
            error: result.error || 'Unknown error',
          };
        }
      } catch (error) {
        console.error(`[publish-to-social-media] Error publishing to ${platform}:`, error);
        return {
          platform,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });

    const results: PublishResult[] = await Promise.all(publishTasks);

    // Save results to database
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    for (const result of results) {
      await supabase.from('social_publishing_log').insert({
        campaign_id: payload.campaignId,
        platform: result.platform,
        post_id: result.postId || null,
        post_url: result.postUrl || null,
        status: result.success ? 'success' : 'failed',
        error_message: result.error || null,
        completed_at: new Date().toISOString(),
      });
    }

    // Update campaign status
    const successCount = results.filter((r) => r.success).length;
    const status =
      successCount === results.length
        ? 'published'
        : successCount > 0
          ? 'partial'
          : 'failed';

    await supabase
      .from('campaign_schedules')
      .update({
        status,
        published_at: new Date().toISOString(),
        post_ids: results.reduce(
          (acc, r) => {
            if (r.success && r.postId) acc[r.platform] = r.postId;
            return acc;
          },
          {} as Record<string, string>
        ),
      })
      .eq('id', payload.campaignId);

    console.log('[publish-to-social-media] Complete:', {
      total: results.length,
      success: successCount,
    });

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[publish-to-social-media] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
