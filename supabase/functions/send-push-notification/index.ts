import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encode as base64Encode } from 'https://deno.land/std@0.168.0/encoding/base64.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

// ============================================================================
// SMART PUSH NOTIFICATION EDGE FUNCTION
// Autorenta - 2026-01-21
//
// Procesa la cola de notificaciones y envía via Firebase Cloud Messaging
// Soporta:
//   - FCM HTTP v1 API (nueva, requiere Service Account)
//   - FCM Legacy API (fallback, requiere Server Key)
//   - Procesamiento de cola (cron job)
//   - Envío directo (webhook de DB trigger)
//   - Templates con placeholders dinámicos
// ============================================================================

interface ServiceAccount {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
}

interface FCMv1Message {
  message: {
    token: string;
    notification: {
      title: string;
      body: string;
    };
    data?: Record<string, string>;
    android?: {
      priority: 'HIGH' | 'NORMAL';
      notification?: {
        sound?: string;
        channel_id?: string;
        click_action?: string;
      };
    };
    apns?: {
      payload?: {
        aps?: {
          sound?: string;
          badge?: number;
        };
      };
    };
  };
}

interface QueuedNotification {
  id: string;
  user_id: string;
  template_code: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  channels: string[];
  priority: 'critical' | 'high' | 'normal' | 'low';
  cta_link?: string;
  tokens: Array<{
    token: string;
    platform: 'web' | 'android' | 'ios';
  }>;
}

interface ProcessResult {
  notification_id: string;
  user_id: string;
  success: boolean;
  tokens_sent: number;
  tokens_failed: number;
  error?: string;
}

// Cache for access token
let cachedAccessToken: { token: string; expiry: number } | null = null;

/**
 * Create a JWT for Google OAuth2 authentication
 */
async function createJWT(serviceAccount: ServiceAccount): Promise<string> {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600, // 1 hour
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  };

  // Base64url encode header and payload
  const encoder = new TextEncoder();
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signatureInput = `${headerB64}.${payloadB64}`;

  // Import the private key and sign
  const privateKey = await importPrivateKey(serviceAccount.private_key);
  const signature = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    privateKey,
    encoder.encode(signatureInput)
  );

  const signatureB64 = base64UrlEncode(new Uint8Array(signature));
  return `${signatureInput}.${signatureB64}`;
}

/**
 * Base64url encode (no padding, URL-safe)
 */
function base64UrlEncode(input: string | Uint8Array): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  const base64 = base64Encode(bytes);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Import RSA private key from PEM format
 */
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  // Remove PEM headers and decode
  const pemContents = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');

  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  return await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

/**
 * Get OAuth2 access token using Service Account
 */
async function getAccessToken(serviceAccount: ServiceAccount): Promise<string> {
  // Check cache
  if (cachedAccessToken && Date.now() < cachedAccessToken.expiry - 60000) {
    return cachedAccessToken.token;
  }

  const jwt = await createJWT(serviceAccount);

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data = await response.json();

  // Cache the token
  cachedAccessToken = {
    token: data.access_token,
    expiry: Date.now() + (data.expires_in * 1000),
  };

  return data.access_token;
}

/**
 * Get Firebase priority based on notification priority
 */
function getFirebasePriority(priority: string): 'HIGH' | 'NORMAL' {
  return ['critical', 'high'].includes(priority) ? 'HIGH' : 'NORMAL';
}

/**
 * Send push notification via FCM HTTP v1 API
 */
async function sendFCMv1Notification(
  accessToken: string,
  projectId: string,
  token: string,
  notification: QueuedNotification
): Promise<{ success: boolean; error?: string }> {
  const message: FCMv1Message = {
    message: {
      token: token,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: {
        notification_id: notification.id,
        template_code: notification.template_code,
        cta_link: notification.cta_link || '',
        route: notification.cta_link || '',
        ...Object.fromEntries(
          Object.entries(notification.data || {}).map(([k, v]) => [k, String(v)])
        ),
      },
      android: {
        priority: getFirebasePriority(notification.priority),
        notification: {
          sound: 'default',
          channel_id: notification.priority === 'critical' ? 'urgent' : 'default',
          click_action: 'FCM_PLUGIN_ACTIVITY',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    },
  };

  try {
    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(message),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`FCM v1 error for token ${token.substring(0, 20)}...: ${response.status}`, errorBody);

      // Check for specific error types
      if (errorBody.includes('UNREGISTERED') || errorBody.includes('INVALID_ARGUMENT')) {
        return { success: false, error: 'InvalidRegistration' };
      }

      return { success: false, error: `FCM ${response.status}: ${errorBody}` };
    }

    const result = await response.json();
    console.log(`FCM v1 success: ${result.name}`);
    return { success: true };
  } catch (error) {
    console.error('FCM v1 request failed:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Process a single notification from the queue
 */
async function processNotification(
  supabase: ReturnType<typeof createClient>,
  accessToken: string,
  projectId: string,
  notification: QueuedNotification
): Promise<ProcessResult> {
  const result: ProcessResult = {
    notification_id: notification.id,
    user_id: notification.user_id,
    success: false,
    tokens_sent: 0,
    tokens_failed: 0,
  };

  if (!notification.tokens || notification.tokens.length === 0) {
    result.error = 'No tokens available';

    // Mark as sent anyway to clear the queue (user has no devices)
    await supabase.rpc('mark_notification_sent', {
      p_notification_id: notification.id,
      p_channel: 'push',
      p_success: false,
      p_metadata: { error: 'no_tokens' },
    });

    return result;
  }

  // Send to all tokens
  const sendPromises = notification.tokens.map(async ({ token }) => {
    const sendResult = await sendFCMv1Notification(accessToken, projectId, token, notification);

    if (sendResult.success) {
      result.tokens_sent++;
    } else {
      result.tokens_failed++;

      // Handle invalid tokens - should be cleaned up
      if (sendResult.error?.includes('InvalidRegistration') ||
          sendResult.error?.includes('UNREGISTERED')) {
        console.log(`Removing invalid token: ${token.substring(0, 20)}...`);
        await supabase
          .from('push_tokens')
          .delete()
          .eq('token', token);
      }
    }

    return sendResult;
  });

  await Promise.all(sendPromises);

  // Mark notification as processed
  result.success = result.tokens_sent > 0;

  await supabase.rpc('mark_notification_sent', {
    p_notification_id: notification.id,
    p_channel: 'push',
    p_success: result.success,
    p_metadata: {
      tokens_sent: result.tokens_sent,
      tokens_failed: result.tokens_failed,
    },
  });

  return result;
}

// Main handler
serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get Google Service Account (base64 encoded or plain JSON)
    const b64Value = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_B64');
    const plainValue = Deno.env.get('GOOGLE_SERVICE_ACCOUNT');

    console.log('[Config] B64 env present:', !!b64Value, 'Plain env present:', !!plainValue);

    let serviceAccountJson: string;

    if (b64Value) {
      // Decode from base64
      try {
        serviceAccountJson = atob(b64Value);
        console.log('[Config] Decoded from base64, length:', serviceAccountJson.length);
      } catch (e) {
        console.error('Failed to decode base64:', e);
        throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT_B64 encoding');
      }
    } else if (plainValue) {
      serviceAccountJson = plainValue;
      console.log('[Config] Using plain JSON, length:', serviceAccountJson.length);
    } else {
      throw new Error('GOOGLE_SERVICE_ACCOUNT not configured (neither B64 nor plain)');
    }

    let serviceAccount: ServiceAccount;
    try {
      serviceAccount = JSON.parse(serviceAccountJson);
      console.log('[Config] Parsed OK, project_id:', serviceAccount.project_id);
    } catch (parseError) {
      console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT:', parseError);
      console.error('JSON starts with:', serviceAccountJson.substring(0, 100));
      console.error('Character at position 230-240:', serviceAccountJson.substring(230, 240));
      console.error('JSON length:', serviceAccountJson.length);
      throw new Error(`Invalid GOOGLE_SERVICE_ACCOUNT JSON: ${parseError.message}`);
    }
    const projectId = serviceAccount.project_id;

    // Get access token
    const accessToken = await getAccessToken(serviceAccount);
    console.log(`[FCM v1] Using project: ${projectId}`);

    let results: ProcessResult[] = [];

    // Check if this is a webhook (direct notification) or cron (process queue)
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await req.json();

      // Direct send to specific token (for testing)
      if (body.action === 'send_direct' && body.token) {
        console.log(`[Direct] Sending to token: ${body.token.substring(0, 20)}...`);

        const notification: QueuedNotification = {
          id: 'direct-' + Date.now(),
          user_id: body.user_id || 'test',
          template_code: 'direct',
          title: body.title || '🚗 AutoRenta',
          body: body.body || 'Notificación de prueba',
          data: body.data || {},
          channels: ['push'],
          priority: body.priority || 'high',
          cta_link: body.route || '/bookings',
          tokens: [{ token: body.token, platform: 'android' }],
        };

        const sendResult = await sendFCMv1Notification(accessToken, projectId, body.token, notification);

        return new Response(JSON.stringify({
          success: sendResult.success,
          error: sendResult.error,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: sendResult.success ? 200 : 500,
        });
      }

      // Direct webhook from database trigger
      if (body.record) {
        const notification = body.record;
        console.log(`[Webhook] Processing notification ${notification.id} for user ${notification.user_id}`);

        // Fetch user tokens
        const { data: tokens } = await supabaseAdmin
          .from('push_tokens')
          .select('token, platform')
          .eq('user_id', notification.user_id)
          .eq('is_active', true);

        if (tokens && tokens.length > 0) {
          const queuedNotification: QueuedNotification = {
            id: notification.id,
            user_id: notification.user_id,
            template_code: notification.template_code || 'custom',
            title: notification.title,
            body: notification.body,
            data: notification.data || {},
            channels: ['push'],
            priority: notification.priority || 'normal',
            cta_link: notification.cta_link,
            tokens: tokens.map(t => ({ token: t.token, platform: t.platform })),
          };

          const result = await processNotification(supabaseAdmin, accessToken, projectId, queuedNotification);
          results.push(result);
        } else {
          console.log(`[Webhook] No active tokens for user ${notification.user_id}`);
        }
      }

      // Manual invocation to process queue
      else if (body.action === 'process_queue') {
        const limit = body.limit || 100;
        console.log(`[Manual] Processing up to ${limit} queued notifications`);

        // Get pending notifications
        const { data: pending, error: fetchError } = await supabaseAdmin.rpc(
          'get_pending_notifications',
          { p_limit: limit }
        );

        if (fetchError) {
          throw new Error(`Failed to fetch queue: ${fetchError.message}`);
        }

        console.log(`[Manual] Found ${pending?.length || 0} pending notifications`);

        // Process each notification
        for (const notification of pending || []) {
          const result = await processNotification(supabaseAdmin, accessToken, projectId, notification);
          results.push(result);
        }
      }
    }

    // Cron job invocation (GET or empty POST)
    else {
      console.log('[Cron] Processing notification queue');

      // Get pending notifications
      const { data: pending, error: fetchError } = await supabaseAdmin.rpc(
        'get_pending_notifications',
        { p_limit: 100 }
      );

      if (fetchError) {
        throw new Error(`Failed to fetch queue: ${fetchError.message}`);
      }

      console.log(`[Cron] Found ${pending?.length || 0} pending notifications`);

      // Process each notification
      for (const notification of pending || []) {
        const result = await processNotification(supabaseAdmin, accessToken, projectId, notification);
        results.push(result);
      }
    }

    // Summary
    const summary = {
      processed: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      total_tokens_sent: results.reduce((sum, r) => sum + r.tokens_sent, 0),
      total_tokens_failed: results.reduce((sum, r) => sum + r.tokens_failed, 0),
    };

    console.log('[Summary]', summary);

    return new Response(JSON.stringify({
      success: true,
      summary,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
