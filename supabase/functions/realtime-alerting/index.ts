// ============================================================================
// REALTIME ALERTING - Enhanced Multi-Provider Alert System
// AutoRenta P0 Production Alerting System
// Issue #119 - Real-time Alerting Setup
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders } from '../_shared/cors.ts';

// ============================================================================
// TYPES
// ============================================================================

interface Alert {
  id: string;
  alert_type: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  status: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

interface AlertingConfig {
  pagerduty_integration_key: string;
  opsgenie_api_key: string;
  slack_webhook_url: string;
  sentry_webhook_url: string;
}

type AlertProvider = 'pagerduty' | 'opsgenie' | 'slack' | 'sentry';

interface RoutingRule {
  severity: 'critical' | 'warning' | 'info';
  alert_type: string;
  providers: AlertProvider[];
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const getAlertingConfig = (): AlertingConfig => ({
  pagerduty_integration_key: Deno.env.get('PAGERDUTY_INTEGRATION_KEY') || '',
  opsgenie_api_key: Deno.env.get('OPSGENIE_API_KEY') || '',
  slack_webhook_url: Deno.env.get('SLACK_WEBHOOK_URL') || '',
  sentry_webhook_url: Deno.env.get('SENTRY_WEBHOOK_URL') || '',
});

// Alert Routing Rules - Determines which providers to use for each alert
const ROUTING_RULES: RoutingRule[] = [
  // P0 Critical Alerts → PagerDuty + Slack + Sentry
  {
    severity: 'critical',
    alert_type: 'payment_failure',
    providers: ['pagerduty', 'slack', 'sentry'],
  },
  {
    severity: 'critical',
    alert_type: 'system_down',
    providers: ['pagerduty', 'slack', 'sentry'],
  },
  {
    severity: 'critical',
    alert_type: 'database_connection_failure',
    providers: ['pagerduty', 'slack', 'sentry'],
  },
  {
    severity: 'critical',
    alert_type: 'auth_spike',
    providers: ['pagerduty', 'slack'],
  },

  // P1 Warnings → Opsgenie + Slack
  {
    severity: 'warning',
    alert_type: 'api_degradation',
    providers: ['opsgenie', 'slack'],
  },
  {
    severity: 'warning',
    alert_type: 'error_spike',
    providers: ['opsgenie', 'slack', 'sentry'],
  },
  {
    severity: 'warning',
    alert_type: 'performance_degradation',
    providers: ['slack', 'sentry'],
  },

  // P2 Info → Slack only
  {
    severity: 'info',
    alert_type: 'deployment',
    providers: ['slack'],
  },
];

// ============================================================================
// PAGERDUTY INTEGRATION
// ============================================================================

async function sendPagerDutyAlert(alert: Alert, config: AlertingConfig): Promise<boolean> {
  if (!config.pagerduty_integration_key) {
    console.warn('PagerDuty integration key not configured');
    return false;
  }

  try {
    const payload = {
      routing_key: config.pagerduty_integration_key,
      event_action: 'trigger',
      dedup_key: `autorenta_${alert.id}`,
      payload: {
        summary: alert.title,
        severity: alert.severity,
        source: 'AutoRenta Production',
        timestamp: new Date(alert.created_at).toISOString(),
        component: alert.alert_type,
        group: 'production',
        class: alert.alert_type,
        custom_details: {
          message: alert.message,
          alert_id: alert.id,
          metadata: alert.metadata,
          dashboard_url: 'https://autorentar.com/admin/monitoring',
        },
      },
      links: [
        {
          href: 'https://autorentar.com/admin/monitoring',
          text: 'Monitoring Dashboard',
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
// OPSGENIE INTEGRATION
// ============================================================================

async function sendOpsgenieAlert(alert: Alert, config: AlertingConfig): Promise<boolean> {
  if (!config.opsgenie_api_key) {
    console.warn('Opsgenie API key not configured');
    return false;
  }

  try {
    const payload = {
      message: alert.title,
      alias: `autorenta_${alert.id}`,
      description: alert.message,
      priority: alert.severity === 'critical' ? 'P1' : alert.severity === 'warning' ? 'P3' : 'P5',
      source: 'AutoRenta Production',
      tags: ['autorenta', 'production', alert.alert_type],
      details: {
        alert_id: alert.id,
        severity: alert.severity,
        alert_type: alert.alert_type,
        created_at: alert.created_at,
        metadata: alert.metadata,
      },
      actions: ['Acknowledge', 'Close', 'View Dashboard'],
    };

    const response = await fetch('https://api.opsgenie.com/v2/alerts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `GenieKey ${config.opsgenie_api_key}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Opsgenie API error:', response.status, errorText);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Opsgenie notification error:', error);
    return false;
  }
}

// ============================================================================
// SLACK INTEGRATION (Enhanced)
// ============================================================================

async function sendSlackAlert(alert: Alert, config: AlertingConfig): Promise<boolean> {
  if (!config.slack_webhook_url) {
    console.warn('Slack webhook not configured');
    return false;
  }

  try {
    const color = alert.severity === 'critical' ? '#FF0000' :
                  alert.severity === 'warning' ? '#FFA500' : '#36A2EB';

    const emoji = alert.severity === 'critical' ? '🚨' :
                  alert.severity === 'warning' ? '⚠️' : 'ℹ️';

    const payload = {
      text: `${emoji} AutoRenta Alert: ${alert.title}`,
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
            {
              title: 'Alert ID',
              value: alert.id,
              short: true,
            },
          ],
          footer: 'AutoRenta Real-time Alerting',
          ts: Math.floor(new Date(alert.created_at).getTime() / 1000),
          actions: [
            {
              type: 'button',
              text: '📊 View Dashboard',
              url: 'https://autorentar.com/admin/monitoring',
            },
            {
              type: 'button',
              text: '✅ Acknowledge',
              url: `https://autorentar.com/admin/alerts/${alert.id}`,
            },
          ],
        },
      ],
    };

    const response = await fetch(config.slack_webhook_url, {
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

// ============================================================================
// SENTRY INTEGRATION
// ============================================================================

async function sendSentryAlert(alert: Alert, config: AlertingConfig): Promise<boolean> {
  if (!config.sentry_webhook_url) {
    console.warn('Sentry webhook not configured');
    return false;
  }

  try {
    // Sentry webhook format
    const payload = {
      title: alert.title,
      message: alert.message,
      level: alert.severity === 'critical' ? 'error' : alert.severity === 'warning' ? 'warning' : 'info',
      tags: {
        environment: 'production',
        alert_type: alert.alert_type,
        alert_id: alert.id,
      },
      extra: alert.metadata,
    };

    const response = await fetch(config.sentry_webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return response.ok;
  } catch (error) {
    console.error('Sentry notification error:', error);
    return false;
  }
}

// ============================================================================
// ALERT ROUTING
// ============================================================================

function getProvidersForAlert(alert: Alert): AlertProvider[] {
  // Find matching routing rule
  const rule = ROUTING_RULES.find(
    (r) => r.severity === alert.severity && r.alert_type === alert.alert_type
  );

  if (rule) {
    return rule.providers;
  }

  // Default fallback routing
  if (alert.severity === 'critical') {
    return ['pagerduty', 'slack'];
  } else if (alert.severity === 'warning') {
    return ['slack'];
  } else {
    return ['slack'];
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
    const config = getAlertingConfig();

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

    // Get active alerts that haven't been notified in the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data: alerts, error: alertsError } = await supabaseAdmin
      .from('monitoring_alerts')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(20);

    if (alertsError) {
      throw alertsError;
    }

    if (!alerts || alerts.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active alerts to process', count: 0 }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Process each alert
    const results = await Promise.all(
      alerts.map(async (alert: Alert) => {
        // Check if already notified recently
        const { data: recentNotifications } = await supabaseAdmin
          .from('monitoring_alert_notifications')
          .select('id, notification_channel')
          .eq('alert_id', alert.id)
          .gte('created_at', fiveMinutesAgo);

        // Determine which providers to use
        const targetProviders = getProvidersForAlert(alert);
        const alreadyNotified = new Set(
          (recentNotifications || []).map((n) => n.notification_channel)
        );

        // Filter out providers that were already notified
        const providersToNotify = targetProviders.filter(
          (p) => !alreadyNotified.has(p)
        );

        if (providersToNotify.length === 0) {
          return { alert_id: alert.id, status: 'already_notified' };
        }

        // Send to each provider
        const providerResults: Record<string, boolean> = {};

        for (const provider of providersToNotify) {
          let sent = false;

          switch (provider) {
            case 'pagerduty':
              sent = await sendPagerDutyAlert(alert, config);
              break;
            case 'opsgenie':
              sent = await sendOpsgenieAlert(alert, config);
              break;
            case 'slack':
              sent = await sendSlackAlert(alert, config);
              break;
            case 'sentry':
              sent = await sendSentryAlert(alert, config);
              break;
          }

          providerResults[provider] = sent;

          // Record notification
          await supabaseAdmin.from('monitoring_alert_notifications').insert({
            alert_id: alert.id,
            notification_channel: provider,
            notification_status: sent ? 'sent' : 'failed',
            sent_at: sent ? new Date().toISOString() : null,
            error_message: sent ? null : `${provider} notification failed`,
          });
        }

        // Update SLA metrics
        const detectionTime = new Date().getTime() - new Date(alert.created_at).getTime();
        await supabaseAdmin.from('monitoring_sla_metrics').insert({
          alert_id: alert.id,
          detection_time_ms: detectionTime,
          notification_time_ms: Date.now() - new Date(alert.created_at).getTime(),
          providers_notified: targetProviders,
        });

        return {
          alert_id: alert.id,
          status: 'processed',
          providers: providerResults,
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
    console.error('Alert processing error:', error);
    return new Response(
      JSON.stringify({
        error: 'Alert processing failed',
        message: error instanceof Error ? error.message : String(error),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
