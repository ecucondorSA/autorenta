import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

/**
 * Incident Webhook Handler
 *
 * Receives alerts from various sources (Sentry, custom monitoring) and
 * forwards them to configured notification channels (Slack, Discord, etc.)
 *
 * Supported sources:
 * - Sentry webhooks
 * - Custom application alerts
 * - Supabase monitoring
 *
 * Environment variables required:
 * - SLACK_WEBHOOK_URL: Slack incoming webhook URL
 * - DISCORD_WEBHOOK_URL: Discord webhook URL (optional)
 * - SUPABASE_URL: Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key for logging
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sentry-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface SentryEvent {
  action: string;
  data: {
    event: {
      event_id: string;
      title: string;
      message?: string;
      level: string;
      platform: string;
      tags: Array<{ key: string; value: string }>;
      contexts?: {
        browser?: { name: string; version: string };
        os?: { name: string; version: string };
      };
      user?: {
        id?: string;
        email?: string;
      };
    };
    triggered_rule: string;
  };
  installation?: { uuid: string };
}

interface CustomAlert {
  source: 'custom' | 'monitoring' | 'cron';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  timestamp?: string;
}

interface SlackMessage {
  text: string;
  attachments?: Array<{
    color: string;
    title: string;
    text: string;
    fields?: Array<{ title: string; value: string; short?: boolean }>;
    footer?: string;
    ts?: number;
  }>;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const slackWebhookUrl = Deno.env.get('SLACK_WEBHOOK_URL');
    const discordWebhookUrl = Deno.env.get('DISCORD_WEBHOOK_URL');

    if (!slackWebhookUrl && !discordWebhookUrl) {
      console.warn('No notification webhooks configured');
    }

    // Parse incoming webhook
    const body = await req.json();

    // Detect source and format message
    let slackMessage: SlackMessage;

    if (body.action && body.data?.event) {
      // Sentry webhook
      slackMessage = formatSentryAlert(body as SentryEvent);
    } else if (body.source) {
      // Custom alert
      slackMessage = formatCustomAlert(body as CustomAlert);
    } else {
      // Unknown format, forward as-is
      slackMessage = {
        text: ':warning: Unknown Alert',
        attachments: [
          {
            color: '#ffcc00',
            title: 'Unrecognized Alert Format',
            text: '```' + JSON.stringify(body, null, 2).slice(0, 1000) + '```',
          },
        ],
      };
    }

    // Log incident to database
    await logIncident(body, slackMessage.text);

    // Send to Slack
    if (slackWebhookUrl) {
      await sendToSlack(slackWebhookUrl, slackMessage);
    }

    // Send to Discord
    if (discordWebhookUrl) {
      await sendToDiscord(discordWebhookUrl, slackMessage);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Alert processed' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error processing incident webhook:', error);

    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

function formatSentryAlert(event: SentryEvent): SlackMessage {
  const { data } = event;
  const { event: sentryEvent, triggered_rule } = data;

  const severityColor = getSeverityColor(sentryEvent.level);
  const severityEmoji = getSeverityEmoji(sentryEvent.level);

  const fields: Array<{ title: string; value: string; short?: boolean }> = [
    { title: 'Level', value: sentryEvent.level.toUpperCase(), short: true },
    { title: 'Platform', value: sentryEvent.platform, short: true },
  ];

  if (sentryEvent.user?.email) {
    fields.push({ title: 'User', value: sentryEvent.user.email, short: true });
  }

  if (sentryEvent.contexts?.browser) {
    fields.push({
      title: 'Browser',
      value: `${sentryEvent.contexts.browser.name} ${sentryEvent.contexts.browser.version}`,
      short: true,
    });
  }

  return {
    text: `${severityEmoji} *Sentry Alert*: ${sentryEvent.title}`,
    attachments: [
      {
        color: severityColor,
        title: sentryEvent.title,
        text: sentryEvent.message || 'No message provided',
        fields,
        footer: `Rule: ${triggered_rule} | Event ID: ${sentryEvent.event_id}`,
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };
}

function formatCustomAlert(alert: CustomAlert): SlackMessage {
  const severityColor = getSeverityColor(alert.severity);
  const severityEmoji = getSeverityEmoji(alert.severity);

  const fields: Array<{ title: string; value: string; short?: boolean }> = [
    { title: 'Source', value: alert.source, short: true },
    { title: 'Severity', value: alert.severity.toUpperCase(), short: true },
  ];

  if (alert.metadata) {
    Object.entries(alert.metadata).slice(0, 4).forEach(([key, value]) => {
      fields.push({ title: key, value: String(value), short: true });
    });
  }

  return {
    text: `${severityEmoji} *${alert.title}*`,
    attachments: [
      {
        color: severityColor,
        title: alert.title,
        text: alert.message,
        fields,
        footer: `AutoRenta Monitoring | ${alert.timestamp || new Date().toISOString()}`,
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };
}

function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    critical: '#dc3545',
    fatal: '#dc3545',
    error: '#dc3545',
    high: '#fd7e14',
    warning: '#ffc107',
    medium: '#ffc107',
    info: '#17a2b8',
    low: '#17a2b8',
    debug: '#6c757d',
  };
  return colors[severity.toLowerCase()] || '#6c757d';
}

function getSeverityEmoji(severity: string): string {
  const emojis: Record<string, string> = {
    critical: ':rotating_light:',
    fatal: ':rotating_light:',
    error: ':x:',
    high: ':warning:',
    warning: ':warning:',
    medium: ':large_orange_diamond:',
    info: ':information_source:',
    low: ':large_blue_diamond:',
    debug: ':bug:',
  };
  return emojis[severity.toLowerCase()] || ':bell:';
}

async function sendToSlack(webhookUrl: string, message: SlackMessage): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    throw new Error(`Slack webhook failed: ${response.status}`);
  }
}

async function sendToDiscord(webhookUrl: string, message: SlackMessage): Promise<void> {
  // Convert Slack format to Discord format
  const discordMessage = {
    content: message.text.replace(/\*/g, '**'), // Slack bold to Discord bold
    embeds: message.attachments?.map((att) => ({
      title: att.title,
      description: att.text,
      color: parseInt(att.color.replace('#', ''), 16),
      fields: att.fields?.map((f) => ({
        name: f.title,
        value: f.value,
        inline: f.short,
      })),
      footer: att.footer ? { text: att.footer } : undefined,
      timestamp: att.ts ? new Date(att.ts * 1000).toISOString() : undefined,
    })),
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(discordMessage),
  });

  if (!response.ok) {
    throw new Error(`Discord webhook failed: ${response.status}`);
  }
}

async function logIncident(payload: unknown, summary: string): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      console.warn('Supabase credentials not configured, skipping incident logging');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Log to a generic audit table or create incidents table
    await supabase.from('incident_logs').insert({
      summary,
      payload,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to log incident to database:', error);
    // Don't throw - logging failure shouldn't stop alert delivery
  }
}
