// ============================================================================
// MONITORING ALERTS - Supabase Edge Function
// AutoRenta Alert Notification System
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders } from '../_shared/cors.ts';

interface Alert {
  id: string;
  alert_type: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  status: string;
  created_at: string;
}

// ============================================================================
// NOTIFICATION CONFIGURATION
// ============================================================================

const NOTIFICATION_CONFIG = {
  slack_webhook: Deno.env.get('SLACK_WEBHOOK_URL') || '',
  email_enabled: Deno.env.get('EMAIL_ALERTS_ENABLED') === 'true',
  pagerduty_integration_key: Deno.env.get('PAGERDUTY_INTEGRATION_KEY') || '',
  pagerduty_enabled: Deno.env.get('PAGERDUTY_ENABLED') === 'true',
};

// ============================================================================
// NOTIFICATION FUNCTIONS
// ============================================================================

async function sendSlackAlert(alert: Alert): Promise<boolean> {
  if (!NOTIFICATION_CONFIG.slack_webhook) {
    console.warn('Slack webhook not configured');
    return false;
  }

  try {
    const color = alert.severity === 'critical' ? '#FF0000' :
                  alert.severity === 'warning' ? '#FFA500' : '#36A2EB';

    const payload = {
      text: `🚨 AutoRenta Alert: ${alert.title}`,
      attachments: [
        {
          color,
          fields: [
            {
              title: 'Severity',
              value: alert.severity.toUpperCase(),
              short: true,
            },
            {
              title: 'Type',
              value: alert.alert_type,
              short: true,
            },
            {
              title: 'Message',
              value: alert.message,
              short: false,
            },
            {
              title: 'Time',
              value: new Date(alert.created_at).toLocaleString(),
              short: true,
            },
          ],
          footer: 'AutoRenta Monitoring',
          ts: Math.floor(new Date(alert.created_at).getTime() / 1000),
        },
      ],
    };

    const response = await fetch(NOTIFICATION_CONFIG.slack_webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return response.ok;
  } catch (error) {
    console.error('Slack notification error:', error);
    return false;
  }
}

async function sendPagerDutyAlert(alert: Alert): Promise<boolean> {
  if (!NOTIFICATION_CONFIG.pagerduty_enabled || !NOTIFICATION_CONFIG.pagerduty_integration_key) {
    console.warn('PagerDuty not configured or disabled');
    return false;
  }

  // Only send critical alerts to PagerDuty to avoid alert fatigue
  if (alert.severity !== 'critical') {
    return true; // Return true to indicate it was handled (by design)
  }

  try {
    const payload = {
      routing_key: NOTIFICATION_CONFIG.pagerduty_integration_key,
      event_action: 'trigger',
      dedup_key: `autorenta-${alert.id}`,
      payload: {
        summary: `${alert.title}: ${alert.message}`,
        severity: alert.severity,
        source: 'AutoRenta Monitoring',
        timestamp: alert.created_at,
        component: alert.alert_type,
        custom_details: {
          alert_id: alert.id,
          alert_type: alert.alert_type,
          message: alert.message,
          created_at: alert.created_at,
        },
      },
      links: [
        {
          href: 'https://autorenta-web.pages.dev/admin/monitoring',
          text: 'View AutoRenta Monitoring Dashboard',
        },
      ],
    };

    const response = await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('PagerDuty API error:', response.status, errorText);
      return false;
    }

    return true;
  } catch (error) {
    console.error('PagerDuty notification error:', error);
    return false;
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get active alerts that haven't been notified
    const { data: alerts, error: alertsError } = await supabaseAdmin
      .from('monitoring_alerts')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(10);

    if (alertsError) {
      throw alertsError;
    }

    if (!alerts || alerts.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active alerts to notify', count: 0 }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Process each alert
    const results = await Promise.all(
      alerts.map(async (alert) => {
        // Check if already notified
        const { data: existingNotifications } = await supabaseAdmin
          .from('monitoring_alert_notifications')
          .select('id')
          .eq('alert_id', alert.id)
          .eq('notification_status', 'sent')
          .limit(1);

        if (existingNotifications && existingNotifications.length > 0) {
          return { alert_id: alert.id, status: 'already_notified' };
        }

        // Send notifications
        const slackSent = await sendSlackAlert(alert);
        const pagerDutySent = await sendPagerDutyAlert(alert);

        // Record Slack notification
        const { error: notifyError } = await supabaseAdmin
          .from('monitoring_alert_notifications')
          .insert({
            alert_id: alert.id,
            notification_channel: 'slack',
            notification_status: slackSent ? 'sent' : 'failed',
            sent_at: slackSent ? new Date().toISOString() : null,
            error_message: slackSent ? null : 'Slack webhook failed',
          });

        if (notifyError) {
          console.error('Error recording Slack notification:', notifyError);
        }

        // Record PagerDuty notification (only if it was attempted for critical alerts)
        if (alert.severity === 'critical' && NOTIFICATION_CONFIG.pagerduty_enabled) {
          const { error: pdNotifyError } = await supabaseAdmin
            .from('monitoring_alert_notifications')
            .insert({
              alert_id: alert.id,
              notification_channel: 'pagerduty',
              notification_status: pagerDutySent ? 'sent' : 'failed',
              sent_at: pagerDutySent ? new Date().toISOString() : null,
              error_message: pagerDutySent ? null : 'PagerDuty API call failed',
            });

          if (pdNotifyError) {
            console.error('Error recording PagerDuty notification:', pdNotifyError);
          }
        }

        return {
          alert_id: alert.id,
          status: (slackSent || pagerDutySent) ? 'sent' : 'failed',
          channels: {
            slack: slackSent,
            pagerduty: pagerDutySent,
          },
        };
      })
    );

    return new Response(
      JSON.stringify({
        message: 'Alerts processed',
        count: results.length,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Alert notification error:', error);
    return new Response(
      JSON.stringify({
        error: 'Alert notification failed',
        message: error instanceof Error ? error.message : String(error),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});









