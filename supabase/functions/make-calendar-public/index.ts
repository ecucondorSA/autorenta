// Edge Function: make-calendar-public
// Makes an existing Google Calendar public by adding ACL rules

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/**
 * Edge Function: make-calendar-public
 * 
 * Hace público un calendario de Google que ya fue creado
 * 
 * Body params:
 * - car_id: ID del auto cuyo calendario quieres hacer público
 */
serve(async (req) => {
  const corsHeaders = {
    ...corsHeaders,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Get auth token from header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get request body
    const { car_id } = await req.json();
    
    if (!car_id) {
      return new Response(JSON.stringify({ error: 'car_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get car's calendar
    const { data: carCalendar, error: calendarError } = await supabase
      .from('car_google_calendars')
      .select('google_calendar_id, owner_id')
      .eq('car_id', car_id)
      .single();

    if (calendarError || !carCalendar) {
      return new Response(JSON.stringify({ error: 'Calendar not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user is the owner
    if (carCalendar.owner_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user's Google Calendar token
    const { data: tokenData, error: tokenError } = await supabase
      .from('google_calendar_tokens')
      .select('access_token, expires_at, refresh_token')
      .eq('user_id', user.id)
      .single();

    if (tokenError || !tokenData) {
      return new Response(JSON.stringify({ error: 'Google Calendar not connected' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if token is expired and refresh if needed
    let accessToken = tokenData.access_token;
    if (new Date(tokenData.expires_at) < new Date()) {
      // Token expired, refresh it
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          refresh_token: tokenData.refresh_token,
          client_id: Deno.env.get('GOOGLE_OAUTH_CLIENT_ID')!,
          client_secret: Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET')!,
          grant_type: 'refresh_token',
        }),
      });

      if (!refreshResponse.ok) {
        return new Response(JSON.stringify({ error: 'Failed to refresh token' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const newTokens = await refreshResponse.json();
      accessToken = newTokens.access_token;

      // Update token in database
      await supabase
        .from('google_calendar_tokens')
        .update({
          access_token: newTokens.access_token,
          expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
        })
        .eq('user_id', user.id);
    }

    // Make calendar public via ACL
    const aclResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(carCalendar.google_calendar_id)}/acl`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'reader',
          scope: { type: 'default' },
        }),
      }
    );

    if (!aclResponse.ok) {
      const error = await aclResponse.text();
      console.error('ACL error:', error);
      
      // Check if it's because the rule already exists
      if (error.includes('duplicate')) {
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Calendar is already public',
          calendar_id: carCalendar.google_calendar_id
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ error: 'Failed to make calendar public', details: error }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Calendar is now public',
      calendar_id: carCalendar.google_calendar_id
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
});
