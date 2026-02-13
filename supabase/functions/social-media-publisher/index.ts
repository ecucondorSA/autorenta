/**
 * Social Media Publisher Edge Function
 *
 * Publishes content to multiple social media platforms:
 * - TikTok (Content Posting API)
 * - Instagram (Graph API)
 * - Facebook (Graph API)
 * - X/Twitter (API v2)
 *
 * POST /social-media-publisher
 *   Body: {
 *     platform: 'tiktok' | 'instagram' | 'facebook' | 'twitter',
 *     content: { text: string, media_url?: string, media_type?: string },
 *     queue_id?: string
 *   }
 */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';
import { getCorsHeaders } from '../_shared/cors.ts';

// ============================================================================
// TYPES
// ============================================================================

type Platform = 'tiktok' | 'instagram' | 'facebook' | 'twitter';

interface PublishRequest {
  platform: Platform;
  content: {
    text: string;
    media_url?: string;
    media_type?: 'image' | 'video' | 'reels';
    hashtags?: string[];
    alt_text?: string; // SEO 2026: Alt text for accessibility and search
    seo_keywords?: string[]; // SEO 2026: Keywords for tracking
  };
  queue_id?: string;
}

interface PublishResult {
  success: boolean;
  platform: Platform;
  post_id?: string;
  post_url?: string;
  error?: string;
}

interface PlatformCredentials {
  access_token: string;
  refresh_token?: string;
  page_id?: string;
  account_id?: string;
  token_expires_at?: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// API Endpoints
const TIKTOK_API_BASE = 'https://open.tiktokapis.com/v2';
const META_GRAPH_API = 'https://graph.facebook.com/v21.0';
const TWITTER_API = 'https://api.twitter.com/2';

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const request: PublishRequest = await req.json();
    const { platform, content, queue_id } = request;

    if (!platform || !content?.text) {
      throw new Error('platform and content.text are required');
    }

    console.log(`[social-media-publisher] Publishing to ${platform}`);

    // Initialize Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Get credentials for the platform
    const credentials = await getCredentials(supabase, platform);

    if (!credentials) {
      throw new Error(`No credentials configured for ${platform}`);
    }

    // Publish to the platform
    let result: PublishResult;

    switch (platform) {
      case 'tiktok':
        result = await publishToTikTok(content, credentials);
        break;
      case 'instagram':
        result = await publishToInstagram(content, credentials);
        break;
      case 'facebook':
        result = await publishToFacebook(content, credentials);
        break;
      case 'twitter':
        result = await publishToTwitter(content, credentials);
        break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }

    // Update queue status if queue_id provided
    if (queue_id && result.success) {
      await supabase.rpc('mark_marketing_post_published', {
        p_queue_id: queue_id,
        p_post_id: result.post_id || '',
        p_post_url: result.post_url || null,
      });
    } else if (queue_id && !result.success) {
      await supabase.rpc('mark_marketing_post_failed', {
        p_queue_id: queue_id,
        p_error_message: result.error || 'Unknown error',
      });
    }

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[social-media-publisher] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Unknown error',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// ============================================================================
// CREDENTIALS MANAGEMENT
// ============================================================================

async function getCredentials(
  supabase: ReturnType<typeof createClient>,
  platform: Platform
): Promise<PlatformCredentials | null> {
  // First try environment variables (simpler setup)
  const envToken = Deno.env.get(`${platform.toUpperCase()}_ACCESS_TOKEN`);
  const envPageId = Deno.env.get(`${platform.toUpperCase()}_PAGE_ID`);

  if (envToken) {
    return {
      access_token: envToken,
      page_id: envPageId,
    };
  }

  // Fall back to database
  const { data, error } = await supabase
    .from('social_media_credentials')
    .select('access_token, refresh_token, page_id, account_id, token_expires_at')
    .eq('platform', platform)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    console.warn(`[social-media-publisher] No credentials for ${platform}`);
    return null;
  }

  // Check if token is expired
  if (data.token_expires_at) {
    const expiresAt = new Date(data.token_expires_at);
    const now = new Date();
    const daysUntilExpiry = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (expiresAt < now) {
      // Token is EXPIRED - cannot proceed
      console.error(`[social-media-publisher] TOKEN EXPIRED for ${platform}. Expired on ${data.token_expires_at}`);

      // Update credential record with error
      await supabase
        .from('social_media_credentials')
        .update({
          last_error: `Token expired on ${data.token_expires_at}. Please renew.`,
          updated_at: new Date().toISOString(),
        })
        .eq('platform', platform);

      // Return null to force controlled failure
      return null;
    }

    if (daysUntilExpiry <= 7) {
      // Token expiring soon - log warning but continue
      console.warn(
        `[social-media-publisher] TOKEN EXPIRING SOON for ${platform}. ` +
        `Expires in ${daysUntilExpiry} days (${data.token_expires_at}). Please renew soon!`
      );

      // Update credential with warning (don't mark as error yet)
      await supabase
        .from('social_media_credentials')
        .update({
          last_error: `Token expires in ${daysUntilExpiry} days. Renew before ${data.token_expires_at}`,
          updated_at: new Date().toISOString(),
        })
        .eq('platform', platform);
    }
  }

  return data as PlatformCredentials;
}

// ============================================================================
// TIKTOK PUBLISHING
// ============================================================================

async function publishToTikTok(
  content: PublishRequest['content'],
  credentials: PlatformCredentials
): Promise<PublishResult> {
  try {
    // TikTok Content Posting API requires video
    // For images, we'd need to create a slideshow video or use photo post (limited)

    if (!content.media_url) {
      // Text-only posts not supported on TikTok
      console.log('[TikTok] Skipping - no media provided (TikTok requires video)');
      return {
        success: false,
        platform: 'tiktok',
        error: 'TikTok requires video content',
      };
    }

    // Initialize video upload
    const initResponse = await fetch(`${TIKTOK_API_BASE}/post/publish/video/init/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${credentials.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        post_info: {
          title: content.text.substring(0, 150),
          privacy_level: 'PUBLIC_TO_EVERYONE',
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
        },
        source_info: {
          source: 'PULL_FROM_URL',
          video_url: content.media_url,
        },
      }),
    });

    const initData = await initResponse.json();

    if (!initResponse.ok || initData.error?.code) {
      return {
        success: false,
        platform: 'tiktok',
        error: initData.error?.message || `TikTok API error: ${initResponse.status}`,
      };
    }

    // TikTok returns a publish_id that can be used to check status
    const publishId = initData.data?.publish_id;

    return {
      success: true,
      platform: 'tiktok',
      post_id: publishId,
      post_url: undefined, // TikTok doesn't return URL immediately
    };
  } catch (error) {
    console.error('[TikTok] Publishing error:', error);
    return {
      success: false,
      platform: 'tiktok',
      error: 'Unknown error',
    };
  }
}

// ============================================================================
// INSTAGRAM PUBLISHING
// ============================================================================

async function publishToInstagram(
  content: PublishRequest['content'],
  credentials: PlatformCredentials
): Promise<PublishResult> {
  try {
    if (!credentials.page_id) {
      return {
        success: false,
        platform: 'instagram',
        error: 'Instagram Business Account ID not configured',
      };
    }

    const igUserId = credentials.page_id;
    const accessToken = credentials.access_token;

    // Build caption with hashtags
    let caption = content.text;
    if (content.hashtags && content.hashtags.length > 0) {
      caption += '\n\n' + content.hashtags.map(h => `#${h.replace('#', '')}`).join(' ');
    }

    // Step 1: Create media container
    const createMediaParams: Record<string, string> = {
      caption,
      access_token: accessToken,
    };

    // SEO 2026: Add alt text for accessibility and search indexing
    if (content.alt_text) {
      createMediaParams.alt_text = content.alt_text;
      console.log('[Instagram] Adding alt_text for SEO:', content.alt_text.substring(0, 50) + '...');
    }

    if (content.media_url) {
      if (content.media_type === 'reels') {
        // SEO 2026: Reels have priority in Instagram algorithm
        createMediaParams.media_type = 'REELS';
        createMediaParams.video_url = content.media_url;
        createMediaParams.share_to_feed = 'true'; // Also show in feed
        console.log('[Instagram] Publishing as REELS (algorithm priority)');
      } else if (content.media_type === 'video') {
        createMediaParams.media_type = 'VIDEO';
        createMediaParams.video_url = content.media_url;
      } else {
        createMediaParams.image_url = content.media_url;
      }
    } else {
      // Instagram requires media
      return {
        success: false,
        platform: 'instagram',
        error: 'Instagram requires image or video',
      };
    }

    const containerResponse = await fetch(`${META_GRAPH_API}/${igUserId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(createMediaParams),
    });

    const containerData = await containerResponse.json();

    if (!containerResponse.ok || containerData.error) {
      return {
        success: false,
        platform: 'instagram',
        error: containerData.error?.message || `Instagram API error: ${containerResponse.status}`,
      };
    }

    const creationId = containerData.id;

    // Step 2: Wait for container to be ready (for videos)
    if (content.media_type === 'video') {
      await waitForMediaReady(igUserId, creationId, accessToken);
    }

    // Step 3: Publish the container
    const publishResponse = await fetch(`${META_GRAPH_API}/${igUserId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        creation_id: creationId,
        access_token: accessToken,
      }),
    });

    const publishData = await publishResponse.json();

    if (!publishResponse.ok || publishData.error) {
      return {
        success: false,
        platform: 'instagram',
        error: publishData.error?.message || `Instagram publish error: ${publishResponse.status}`,
      };
    }

    return {
      success: true,
      platform: 'instagram',
      post_id: publishData.id,
      post_url: `https://www.instagram.com/p/${publishData.id}/`,
    };
  } catch (error) {
    console.error('[Instagram] Publishing error:', error);
    return {
      success: false,
      platform: 'instagram',
      error: 'Unknown error',
    };
  }
}

async function waitForMediaReady(
  igUserId: string,
  containerId: string,
  accessToken: string,
  maxAttempts = 30
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    const statusResponse = await fetch(
      `${META_GRAPH_API}/${containerId}?fields=status_code&access_token=${accessToken}`
    );
    const statusData = await statusResponse.json();

    if (statusData.status_code === 'FINISHED') {
      return;
    }

    if (statusData.status_code === 'ERROR') {
      throw new Error('Media processing failed');
    }

    // Wait 2 seconds before checking again
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  throw new Error('Media processing timeout');
}

// ============================================================================
// FACEBOOK PUBLISHING
// ============================================================================

async function publishToFacebook(
  content: PublishRequest['content'],
  credentials: PlatformCredentials
): Promise<PublishResult> {
  try {
    if (!credentials.page_id) {
      return {
        success: false,
        platform: 'facebook',
        error: 'Facebook Page ID not configured',
      };
    }

    const pageId = credentials.page_id;
    const accessToken = credentials.access_token;

    // Build message with hashtags
    let message = content.text;
    if (content.hashtags && content.hashtags.length > 0) {
      message += '\n\n' + content.hashtags.map(h => `#${h.replace('#', '')}`).join(' ');
    }

    // Determine endpoint and params based on content type
    let endpoint: string;
    const params: Record<string, string> = {
      access_token: accessToken,
    };

    if (content.media_url && (content.media_type === 'video' || content.media_type === 'reels')) {
      // Video post (Reels also publish as video on Facebook)
      endpoint = `${META_GRAPH_API}/${pageId}/videos`;
      params.file_url = content.media_url;
      params.description = message;
      // SEO 2026: Alt text for video accessibility
      if (content.alt_text) {
        params.alt_text = content.alt_text;
        console.log('[Facebook] Adding alt_text for video SEO');
      }
    } else if (content.media_url) {
      // Photo post
      endpoint = `${META_GRAPH_API}/${pageId}/photos`;
      params.url = content.media_url;
      params.caption = message;
      // SEO 2026: Alt text for image accessibility and search
      if (content.alt_text) {
        params.alt_text = content.alt_text;
        console.log('[Facebook] Adding alt_text for image SEO');
      }
    } else {
      // Text-only post
      endpoint = `${META_GRAPH_API}/${pageId}/feed`;
      params.message = message;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      return {
        success: false,
        platform: 'facebook',
        error: data.error?.message || `Facebook API error: ${response.status}`,
      };
    }

    const postId = data.id || data.post_id;

    return {
      success: true,
      platform: 'facebook',
      post_id: postId,
      post_url: `https://www.facebook.com/${postId}`,
    };
  } catch (error) {
    console.error('[Facebook] Publishing error:', error);
    return {
      success: false,
      platform: 'facebook',
      error: 'Unknown error',
    };
  }
}

// ============================================================================
// TWITTER/X PUBLISHING
// ============================================================================

async function publishToTwitter(
  content: PublishRequest['content'],
  credentials: PlatformCredentials
): Promise<PublishResult> {
  try {
    // Build tweet text with hashtags
    let tweetText = content.text;
    if (content.hashtags && content.hashtags.length > 0) {
      const hashtagText = content.hashtags
        .slice(0, 3) // Twitter limit: keep it short
        .map(h => `#${h.replace('#', '')}`)
        .join(' ');
      tweetText += '\n\n' + hashtagText;
    }

    // Ensure tweet is within character limit
    if (tweetText.length > 280) {
      tweetText = tweetText.substring(0, 277) + '...';
    }

    // Twitter API v2 - Create tweet
    const response = await fetch(`${TWITTER_API}/tweets`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${credentials.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: tweetText,
        // Note: Media upload requires separate endpoint and OAuth 1.0a
        // For simplicity, text-only tweets for now
      }),
    });

    const data = await response.json();

    if (!response.ok || data.errors) {
      const errorMessage = data.errors?.[0]?.message || data.detail || `Twitter API error: ${response.status}`;
      return {
        success: false,
        platform: 'twitter',
        error: errorMessage,
      };
    }

    const tweetId = data.data?.id;

    return {
      success: true,
      platform: 'twitter',
      post_id: tweetId,
      post_url: tweetId ? `https://twitter.com/autorentar/status/${tweetId}` : undefined,
    };
  } catch (error) {
    console.error('[Twitter] Publishing error:', error);
    return {
      success: false,
      platform: 'twitter',
      error: 'Unknown error',
    };
  }
}
