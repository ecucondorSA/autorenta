// Google Calendar OAuth Handler
// Handles OAuth flow for connecting user's Google Calendar

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID')!;
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET')!;
const GOOGLE_REDIRECT_URI = Deno.env.get('GOOGLE_OAUTH_REDIRECT_URI')!;
const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'http://localhost:4200';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get user from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ========================================================================
    // Action: Get OAuth URL
    // ========================================================================
    if (action === 'get-auth-url') {
      const scopes = [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
      ];

      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', GOOGLE_REDIRECT_URI);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', scopes.join(' '));
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');
      authUrl.searchParams.set('state', user.id); // Pass user ID in state

      return new Response(JSON.stringify({ authUrl: authUrl.toString() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ========================================================================
    // Action: Handle OAuth Callback
    // ========================================================================
    if (action === 'handle-callback') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state'); // User ID

      if (!code || !state) {
        return new Response(JSON.stringify({ error: 'Missing code or state' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: GOOGLE_REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        console.error('Token exchange failed:', error);
        return new Response(JSON.stringify({ error: 'Token exchange failed' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const tokens: TokenResponse = await tokenResponse.json();

      // Get user's primary calendar ID (usually their email)
      const calendarResponse = await fetch(
        'https://www.googleapis.com/calendar/v3/users/me/calendarList/primary',
        {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        }
      );

      let primaryCalendarId = null;
      if (calendarResponse.ok) {
        const calendarData = await calendarResponse.json();
        primaryCalendarId = calendarData.id;
      }

      // Store tokens in database
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

      const { error: upsertError } = await supabase.from('google_calendar_tokens').upsert({
        user_id: state,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        token_type: tokens.token_type,
        expires_at: expiresAt.toISOString(),
        scope: tokens.scope,
        primary_calendar_id: primaryCalendarId,
        connected_at: new Date().toISOString(),
        sync_enabled: true,
      });

      if (upsertError) {
        console.error('Database insert error:', upsertError);
        return new Response(JSON.stringify({ error: 'Failed to save tokens' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Log successful connection
      await supabase.from('calendar_sync_log').insert({
        user_id: state,
        operation: 'connect',
        status: 'success',
        sync_direction: 'to_google',
      });

      // Redirect to frontend with success message
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          Location: `${FRONTEND_URL}/profile?calendar_connected=true`,
        },
      });
    }

    // ========================================================================
    // Action: Refresh Access Token
    // ========================================================================
    if (action === 'refresh-token') {
      // Get stored refresh token
      const { data: tokenData, error: tokenError } = await supabase
        .from('google_calendar_tokens')
        .select('refresh_token')
        .eq('user_id', user.id)
        .single();

      if (tokenError || !tokenData?.refresh_token) {
        return new Response(JSON.stringify({ error: 'No refresh token found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Request new access token
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          refresh_token: tokenData.refresh_token,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          grant_type: 'refresh_token',
        }),
      });

      if (!refreshResponse.ok) {
        const error = await refreshResponse.text();
        console.error('Token refresh failed:', error);
        return new Response(JSON.stringify({ error: 'Token refresh failed' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const newTokens: TokenResponse = await refreshResponse.json();
      const expiresAt = new Date(Date.now() + newTokens.expires_in * 1000);

      // Update tokens in database
      const { error: updateError } = await supabase
        .from('google_calendar_tokens')
        .update({
          access_token: newTokens.access_token,
          expires_at: expiresAt.toISOString(),
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Database update error:', updateError);
        return new Response(JSON.stringify({ error: 'Failed to update tokens' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          access_token: newTokens.access_token,
          expires_at: expiresAt.toISOString(),
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ========================================================================
    // Action: Disconnect Calendar
    // ========================================================================
    if (action === 'disconnect') {
      // Delete tokens from database
      const { error: deleteError } = await supabase
        .from('google_calendar_tokens')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('Database delete error:', deleteError);
        return new Response(JSON.stringify({ error: 'Failed to disconnect' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Log disconnection
      await supabase.from('calendar_sync_log').insert({
        user_id: user.id,
        operation: 'disconnect',
        status: 'success',
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ========================================================================
    // Action: Get Connection Status
    // ========================================================================
    if (action === 'status') {
      const { data: tokenData } = await supabase
        .from('google_calendar_tokens')
        .select('*')
        .eq('user_id', user.id)
        .single();

      const isConnected = tokenData && new Date(tokenData.expires_at) > new Date();

      return new Response(
        JSON.stringify({
          connected: isConnected,
          expires_at: tokenData?.expires_at || null,
          primary_calendar_id: tokenData?.primary_calendar_id || null,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Invalid action
    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in google-calendar-oauth:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});
