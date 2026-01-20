/**
 * Get Bio Links Edge Function (SEO 2026)
 *
 * Returns active bio links for Instagram/TikTok linktree-style pages.
 * Supports UTM tracking and click counting.
 *
 * GET /get-bio-links?platform=instagram
 * POST /get-bio-links { action: 'track', link_id: 'uuid' }
 */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';
import { getCorsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

interface BioLink {
  id: string;
  title: string;
  url: string;
  description: string | null;
  icon: string | null;
  display_order: number;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // POST: Track click
    if (req.method === 'POST') {
      const { action, link_id } = await req.json();

      if (action === 'track' && link_id) {
        await supabase.rpc('track_bio_link_click', { link_id });
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET: Fetch links
    const url = new URL(req.url);
    const platform = url.searchParams.get('platform') || 'all';
    const now = new Date().toISOString();

    const { data: links, error } = await supabase
      .from('marketing_bio_links')
      .select('id, title, url, description, icon, display_order, utm_source, utm_medium, utm_campaign')
      .eq('is_active', true)
      .or(`platform.eq.${platform},platform.eq.all`)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .order('display_order', { ascending: true });

    if (error) {
      throw error;
    }

    // Build URLs with UTM params
    const enrichedLinks = (links as BioLink[]).map(link => {
      const urlObj = new URL(link.url);
      if (link.utm_source) urlObj.searchParams.set('utm_source', link.utm_source);
      if (link.utm_medium) urlObj.searchParams.set('utm_medium', link.utm_medium);
      if (link.utm_campaign) urlObj.searchParams.set('utm_campaign', link.utm_campaign);

      return {
        id: link.id,
        title: link.title,
        url: urlObj.toString(),
        description: link.description,
        icon: link.icon,
      };
    });

    return new Response(
      JSON.stringify({
        success: true,
        platform,
        links: enrichedLinks,
        brand: {
          name: 'AutoRentar',
          tagline: 'Alquiler de autos entre personas',
          logo: 'https://autorentar.com/assets/logo.png',
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[get-bio-links] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
