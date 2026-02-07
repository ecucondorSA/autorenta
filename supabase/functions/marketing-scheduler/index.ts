import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';
import { getCorsHeaders } from '../_shared/cors.ts';

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const startTime = Date.now();

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 1. PROCESS PENDING POSTS (Standard Logic)
    let query = supabase
      .from('marketing_content_queue')
      .select('*')
      .eq('status', 'pending')
      .lt('attempts', 5)
      .lte('scheduled_for', new Date().toISOString()) // Only if time has passed
      .order('scheduled_for', { ascending: true })
      .limit(10);

    const { data: pendingPosts, error: fetchError } = await query;

    let publishedCount = 0;
    if (pendingPosts && pendingPosts.length > 0) {
        console.log(`[marketing-scheduler] Processing ${pendingPosts.length} posts...`);
        
        for (const post of pendingPosts) {
            // ... (Publishing logic kept minimal for brevity, delegating to publisher)
            try {
                await supabase.from('marketing_content_queue').update({ status: 'processing' }).eq('id', post.id);
                
                const publishResponse = await fetch(`${SUPABASE_URL}/functions/v1/publish-to-social-media`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        platform: post.platform,
                        content: {
                            text: post.text_content,
                            media_url: post.media_url,
                            media_type: post.media_type,
                            hashtags: post.hashtags,
                            alt_text: post.metadata?.alt_text,
                            seo_keywords: post.metadata?.seo_keywords,
                        },
                        queue_id: post.id,
                    }),
                });
                
                const res = await publishResponse.json();
                if (res.success) {
                    await supabase.from('marketing_content_queue').update({ 
                        status: 'published', published_at: new Date().toISOString() 
                    }).eq('id', post.id);
                    publishedCount++;
                } else {
                    // Handle failure
                    await supabase.rpc('mark_marketing_post_failed', { p_queue_id: post.id, p_error_message: res.error });
                }
            } catch (e) {
                console.error(`Error publishing ${post.id}`, e);
                await supabase.rpc('mark_marketing_post_failed', { p_queue_id: post.id, p_error_message: String(e) });
            }
        }
    }

    // 2. AUTO-REFILL (New "Pilot Mode")
    // Check if we are running low on content for tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD

    const { count: pendingCount } = await supabase
        .from('marketing_content_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .gte('scheduled_for', new Date().toISOString()); // Future posts only

    console.log(`[marketing-scheduler] Future pending posts: ${pendingCount}`);

    // If less than 2 posts in queue, generate more!
    if ((pendingCount || 0) < 2) {
        console.log('[marketing-scheduler] Queue low! Triggering Auto-Refill...');
        
        // Trigger marketing-processor to generate new content
        // We trigger it as a background job via DB insert (the new way)
        const themes = ['ahorro inteligente', 'libertad de viaje', 'ingresos extra', 'seguridad y confianza'];
        const randomTheme = themes[Math.floor(Math.random() * themes.length)];
        
        await supabase.from('marketing_generation_jobs').insert({
            request_payload: {
                content_type: 'authority', // High performing content
                platform: 'instagram', // Will generate for FB too due to dual-mode
                theme: randomTheme,
                save_to_db: true,
                generate_image: true // Essential
            },
            status: 'pending'
        });
        
        console.log(`[marketing-scheduler] Auto-Refill triggered: Authority post about "${randomTheme}"`);
    }

    return new Response(JSON.stringify({ 
        success: true, 
        published: publishedCount,
        auto_refill: (pendingCount || 0) < 2 
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('[marketing-scheduler] Error:', error);
    return new Response(JSON.stringify({ error: String(error) }), { status: 500, headers: corsHeaders });
  }
});