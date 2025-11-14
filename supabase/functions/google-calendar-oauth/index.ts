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
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    // Debug: Log all relevant information
    console.log('=== Google Calendar OAuth Request ===');
    console.log('Full URL:', req.url);
    console.log('Path:', url.pathname);
    console.log('Raw query string:', url.search);
    console.log('Query params extracted:', {
      action: action || 'null',
      code: code ? `${code.substring(0, 20)}...` : 'null',
      state: state || 'null',
      hasCode: !!code,
      hasState: !!state,
      codeLength: code?.length || 0,
      stateLength: state?.length || 0,
    });
    console.log('Method:', req.method);
    console.log('Headers:', {
      authorization: req.headers.get('Authorization') ? 'present' : 'missing',
      origin: req.headers.get('Origin'),
      referer: req.headers.get('Referer'),
    });

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // CRITICAL: Check if this is the OAuth callback FIRST (before any auth checks)
    // Google OAuth callback ALWAYS includes 'code' parameter, so if it's present, it's a callback
    // IMPORTANT: Google may redirect without preserving the 'action' parameter, so we rely on 'code'
    // Use explicit checks to avoid any falsy value issues
    const hasCode = code !== null && code !== undefined && String(code).length > 0;
    const hasState = state !== null && state !== undefined && String(state).length > 0;
    const isCallbackAction = action === 'handle-callback';
    const isCallbackByCode = hasCode; // Google always sends code in OAuth callback
    // If code is present, it's DEFINITELY a callback from Google (no auth needed)
    const isCallback = Boolean(isCallbackByCode || isCallbackAction);
    
    console.log('🔍 Callback detection result:', {
      action: action || 'null',
      codeValue: code ? `${code.substring(0, 30)}...` : 'null',
      stateValue: state ? `${state.substring(0, 20)}...` : 'null',
      hasCode,
      hasState,
      isCallbackAction,
      isCallbackByCode,
      isCallback,
      willRequireAuth: !isCallback,
    });
    
    // ========================================================================
    // CRITICAL: Handle OAuth Callback FIRST (before any other actions)
    // This must be checked before auth checks to avoid 401 errors
    // EARLY RETURN - if callback, process and return immediately
    // ========================================================================
    if (isCallback) {
      console.log('✅ OAuth callback confirmed! Processing without auth...');
      console.log('🚀 Processing OAuth callback - no auth required');
      
      if (!code || !state) {
        console.error('❌ Callback missing code or state:', { hasCode: !!code, hasState: !!state });
        return new Response(JSON.stringify({ error: 'Missing code or state' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Validate state corresponds to an existing user
      const { data: adminUser, error: adminError } = await supabase.auth.admin.getUserById(state);
      if (adminError || !adminUser?.user) {
        console.error('❌ Invalid state - user not found:', state);
        return new Response(JSON.stringify({ error: 'Invalid state' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const callbackUserId = adminUser.user.id;
      console.log('✅ Valid user found for callback:', callbackUserId);

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
        console.error('❌ Token exchange failed:', error);
        return new Response(JSON.stringify({ error: 'Token exchange failed' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const tokens: TokenResponse = await tokenResponse.json();
      console.log('✅ Tokens received successfully');

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
        console.log('✅ Primary calendar ID:', primaryCalendarId);
      }

      // Store tokens in database
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

      const { error: upsertError } = await supabase.from('google_calendar_tokens').upsert({
        user_id: callbackUserId,
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
        console.error('❌ Database insert error:', upsertError);
        return new Response(JSON.stringify({ error: 'Failed to save tokens' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('✅ Tokens saved to database');

      // Log successful connection
      await supabase.from('calendar_sync_log').insert({
        user_id: callbackUserId,
        operation: 'connect',
        status: 'success',
        sync_direction: 'to_google',
      });

      // Return HTML page that closes popup and redirects parent window
      const successHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Conectando Google Calendar...</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
              }
              .container {
                text-align: center;
                padding: 40px;
              }
              .spinner {
                border: 4px solid rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                border-top: 4px solid white;
                width: 50px;
                height: 50px;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
              }
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
              h1 { margin: 0 0 10px; font-size: 24px; }
              p { margin: 0; opacity: 0.9; font-size: 16px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="spinner"></div>
              <h1>✅ Google Calendar Conectado</h1>
              <p>Cerrando ventana...</p>
            </div>
            <script>
              // Close popup and redirect parent window
              if (window.opener) {
                window.opener.location.href = '${FRONTEND_URL}/profile?calendar_connected=true';
                window.close();
              } else {
                // Fallback: direct redirect if not in popup
                window.location.href = '${FRONTEND_URL}/profile?calendar_connected=true';
              }
            </script>
          </body>
        </html>
      `;

      return new Response(successHtml, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html; charset=UTF-8',
        },
      });
    }

    // ========================================================================
    // All other actions require authentication
    // ========================================================================
    // Initialize userId variable (will be set from auth token)
    let userId: string | null = null;
    
    // Only enforce Authorization header for actions initiated from the frontend
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ Missing authorization header for non-callback action:', action);
      console.error('This request requires authentication but none was provided.');
      return new Response(JSON.stringify({ code: 401, message: 'Missing authorization header' }), {
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

    userId = user.id;

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
      authUrl.searchParams.set('state', userId!); // Pass user ID in state

      return new Response(JSON.stringify({ authUrl: authUrl.toString() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        .eq('user_id', userId!)
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
        .eq('user_id', userId!);

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
        .eq('user_id', userId!);

      if (deleteError) {
        console.error('Database delete error:', deleteError);
        return new Response(JSON.stringify({ error: 'Failed to disconnect' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Log disconnection
      await supabase.from('calendar_sync_log').insert({
        user_id: userId!,
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
        .eq('user_id', userId!)
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
