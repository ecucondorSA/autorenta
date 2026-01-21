import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================================
// SMART PUSH NOTIFICATION EDGE FUNCTION
// Autorenta - 2026-01-21
//
// Procesa la cola de notificaciones y envía via Firebase Cloud Messaging
// Soporta:
//   - Procesamiento de cola (cron job)
//   - Envío directo (webhook de DB trigger)
//   - Templates con placeholders dinámicos
// ============================================================================

interface NotificationPayload {
  to: string;
  notification: {
    title: string;
    body: string;
    icon?: string;
    click_action?: string;
  };
  data?: Record<string, string>;
  android?: {
    priority: 'high' | 'normal';
    notification?: {
      sound?: string;
      channel_id?: string;
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

// Render template placeholders
function renderTemplate(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = data[key];
    return value !== undefined ? String(value) : `{{${key}}}`;
  });
}

// Get Firebase priority based on notification priority
function getFirebasePriority(priority: string): 'high' | 'normal' {
  return ['critical', 'high'].includes(priority) ? 'high' : 'normal';
}

// Send push notification via FCM Legacy API
async function sendFCMNotification(
  fcmServerKey: string,
  token: string,
  notification: QueuedNotification,
  platform: string
): Promise<{ success: boolean; error?: string }> {
  const payload: NotificationPayload = {
    to: token,
    notification: {
      title: notification.title,
      body: notification.body,
      icon: '/assets/icons/icon-192x192.png',
      click_action: notification.cta_link || 'FLUTTER_NOTIFICATION_CLICK',
    },
    data: {
      notification_id: notification.id,
      template_code: notification.template_code,
      cta_link: notification.cta_link || '',
      ...Object.fromEntries(
        Object.entries(notification.data || {}).map(([k, v]) => [k, String(v)])
      ),
    },
    android: {
      priority: getFirebasePriority(notification.priority),
      notification: {
        sound: 'default',
        channel_id: notification.priority === 'critical' ? 'urgent' : 'default',
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
  };

  try {
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${fcmServerKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`FCM error for token ${token.substring(0, 20)}...: ${response.status}`, errorBody);
      return { success: false, error: `FCM ${response.status}: ${errorBody}` };
    }

    const result = await response.json();

    // Check for token errors (invalid, unregistered)
    if (result.failure > 0 && result.results?.[0]?.error) {
      const error = result.results[0].error;
      console.warn(`FCM token error: ${error}`);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error('FCM request failed:', error);
    return { success: false, error: error.message };
  }
}

// Process a single notification from the queue
async function processNotification(
  supabase: ReturnType<typeof createClient>,
  fcmServerKey: string,
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
  const sendPromises = notification.tokens.map(async ({ token, platform }) => {
    const sendResult = await sendFCMNotification(fcmServerKey, token, notification, platform);

    if (sendResult.success) {
      result.tokens_sent++;
    } else {
      result.tokens_failed++;

      // Handle invalid tokens - should be cleaned up
      if (sendResult.error?.includes('NotRegistered') ||
          sendResult.error?.includes('InvalidRegistration')) {
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
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get FCM Server Key
    const fcmServerKey = Deno.env.get('FCM_SERVER_KEY');
    if (!fcmServerKey) {
      throw new Error('FCM_SERVER_KEY not configured');
    }

    let results: ProcessResult[] = [];

    // Check if this is a webhook (direct notification) or cron (process queue)
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await req.json();

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

          const result = await processNotification(supabaseAdmin, fcmServerKey, queuedNotification);
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
          const result = await processNotification(supabaseAdmin, fcmServerKey, notification);
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
        const result = await processNotification(supabaseAdmin, fcmServerKey, notification);
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
      error: error.message
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
