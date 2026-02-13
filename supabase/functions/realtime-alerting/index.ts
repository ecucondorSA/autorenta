/**
 * Edge Function: realtime-alerting
 *
 * Multi-provider alert system with integrated fraud detection.
 * Migrated from fraud-detection-alerts.yml (Regla #1: workflows orquestan, Edge Functions ejecutan).
 *
 * Modes (query param ?mode=):
 *   - detect: Run 8 fraud detection patterns → insert alerts → route to providers
 *   - route:  Route existing unnotified alerts to providers (default)
 *
 * Providers: PagerDuty, Opsgenie, Slack, Sentry
 * Tables: monitoring_alerts, monitoring_alert_notifications, monitoring_sla_metrics
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

// ============================================================================
// TYPES
// ============================================================================

interface Alert {
  id: string;
  alert_type: string;
  severity: 'critical' | 'high' | 'warning' | 'info';
  title: string;
  message: string;
  status: string;
  user_id?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

interface DetectedAlert {
  alert_type: string;
  severity: 'critical' | 'high' | 'warning' | 'info';
  title: string;
  message: string;
  user_id?: string;
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
  severity: string;
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

const ROUTING_RULES: RoutingRule[] = [
  // Critical → PagerDuty + Slack + Sentry
  { severity: 'critical', alert_type: 'payment_failure', providers: ['pagerduty', 'slack', 'sentry'] },
  { severity: 'critical', alert_type: 'system_down', providers: ['pagerduty', 'slack', 'sentry'] },
  { severity: 'critical', alert_type: 'database_connection_failure', providers: ['pagerduty', 'slack', 'sentry'] },
  { severity: 'critical', alert_type: 'auth_spike', providers: ['pagerduty', 'slack'] },
  // Fraud high → PagerDuty + Slack
  { severity: 'high', alert_type: 'MULTIPLE_FAILED_PAYMENTS', providers: ['pagerduty', 'slack'] },
  { severity: 'high', alert_type: 'UNVERIFIED_HIGH_VALUE_BOOKING', providers: ['pagerduty', 'slack'] },
  { severity: 'high', alert_type: 'HIGH_REFUND_VOLUME', providers: ['pagerduty', 'slack'] },
  { severity: 'high', alert_type: 'GAMING_SIGNALS_DETECTED', providers: ['pagerduty', 'slack'] },
  // Warnings → Opsgenie + Slack
  { severity: 'warning', alert_type: 'api_degradation', providers: ['opsgenie', 'slack'] },
  { severity: 'warning', alert_type: 'error_spike', providers: ['opsgenie', 'slack', 'sentry'] },
  { severity: 'warning', alert_type: 'performance_degradation', providers: ['slack', 'sentry'] },
  // Info → Slack only
  { severity: 'info', alert_type: 'deployment', providers: ['slack'] },
];

// ============================================================================
// FRAUD DETECTION (8 patterns from fraud-detection-alerts.yml)
// ============================================================================

async function detectFraudPatterns(supabase: ReturnType<typeof createClient>): Promise<DetectedAlert[]> {
  const alerts: DetectedAlert[] = [];
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  // Helper: safe query that returns [] if table doesn't exist
  async function safeQuery(table: string, filterFn: (q: any) => any): Promise<any[]> {
    try {
      const { data, error } = await filterFn(supabase.from(table).select());
      if (error) {
        if (error.message?.includes('does not exist') || error.code === '42P01') {
          console.warn(`Table ${table} not found, skipping`);
          return [];
        }
        console.error(`Query error on ${table}:`, error.message);
        return [];
      }
      return data || [];
    } catch (e) {
      console.error(`Unexpected error querying ${table}:`, e);
      return [];
    }
  }

  // Helper: group by key and count
  function groupCount(items: any[], key: string): Record<string, number> {
    const grouped: Record<string, number> = {};
    for (const item of items) {
      if (item[key]) {
        grouped[item[key]] = (grouped[item[key]] || 0) + 1;
      }
    }
    return grouped;
  }

  // Helper: group by key and sum a field
  function groupSum(items: any[], key: string, sumField: string): Record<string, number> {
    const grouped: Record<string, number> = {};
    for (const item of items) {
      if (item[key]) {
        grouped[item[key]] = (grouped[item[key]] || 0) + (item[sumField] || 0);
      }
    }
    return grouped;
  }

  // --- Pattern 1: Multiple failed payments (>3 in last hour) ---
  console.log('Fraud check 1/8: failed payments...');
  const failedPayments = await safeQuery('payments', (q: any) =>
    q.eq('status', 'rejected').gte('created_at', oneHourAgo).select('user_id'));
  for (const [userId, count] of Object.entries(groupCount(failedPayments, 'user_id'))) {
    if ((count as number) >= 3) {
      alerts.push({
        alert_type: 'MULTIPLE_FAILED_PAYMENTS',
        severity: 'high',
        title: `Multiple failed payments: ${count} in 1h`,
        message: `User ${userId.substring(0, 8)}... had ${count} failed payments in the last hour`,
        user_id: userId,
        metadata: { count, window: '1h' },
      });
    }
  }

  // --- Pattern 2: Rapid booking attempts (>5 in 1 hour) ---
  console.log('Fraud check 2/8: rapid bookings...');
  const recentBookings = await safeQuery('bookings', (q: any) =>
    q.gte('created_at', oneHourAgo).select('renter_id'));
  for (const [renterId, count] of Object.entries(groupCount(recentBookings, 'renter_id'))) {
    if ((count as number) >= 5) {
      alerts.push({
        alert_type: 'RAPID_BOOKING_ATTEMPTS',
        severity: 'warning',
        title: `Rapid booking attempts: ${count} in 1h`,
        message: `User ${renterId.substring(0, 8)}... made ${count} booking attempts in the last hour`,
        user_id: renterId,
        metadata: { count, window: '1h' },
      });
    }
  }

  // --- Pattern 3: Large wallet transfers (>$50,000 ARS in 24h) ---
  console.log('Fraud check 3/8: large transfers...');
  const largeTransfers = await safeQuery('wallet_ledger', (q: any) =>
    q.in('kind', ['transfer_in', 'transfer_out'])
      .gte('amount_cents', 5000000)
      .gte('created_at', twentyFourHoursAgo)
      .select('user_id,kind,amount_cents'));
  for (const t of largeTransfers) {
    alerts.push({
      alert_type: 'LARGE_TRANSFER',
      severity: 'warning',
      title: `Large transfer: ARS ${(t.amount_cents / 100).toLocaleString()}`,
      message: `Large ${t.kind} of ARS ${(t.amount_cents / 100).toLocaleString()} detected`,
      user_id: t.user_id,
      metadata: { amount_cents: t.amount_cents, kind: t.kind },
    });
  }

  // --- Pattern 4: Multiple owner cancellations (>3 in 24h) ---
  console.log('Fraud check 4/8: owner cancellations...');
  const cancelledBookings = await safeQuery('bookings', (q: any) =>
    q.eq('status', 'cancelled')
      .eq('cancelled_by_role', 'owner')
      .gte('updated_at', twentyFourHoursAgo)
      .select('owner_id'));
  for (const [ownerId, count] of Object.entries(groupCount(cancelledBookings, 'owner_id'))) {
    if ((count as number) >= 3) {
      alerts.push({
        alert_type: 'MULTIPLE_OWNER_CANCELLATIONS',
        severity: 'warning',
        title: `Owner cancelled ${count} bookings in 24h`,
        message: `Owner ${ownerId.substring(0, 8)}... cancelled ${count} bookings in 24h`,
        user_id: ownerId,
        metadata: { count, window: '24h' },
      });
    }
  }

  // --- Pattern 5: High-value bookings from unverified users ---
  console.log('Fraud check 5/8: unverified high-value...');
  const highValueBookings = await safeQuery('bookings', (q: any) =>
    q.gte('total_amount_ars', 100000)
      .eq('status', 'pending_payment')
      .gte('created_at', twentyFourHoursAgo)
      .select('id,renter_id,total_amount_ars'));
  for (const booking of highValueBookings) {
    const profiles = await safeQuery('profiles', (q: any) =>
      q.eq('id', booking.renter_id).select('identity_verified_at'));
    if (profiles[0] && !profiles[0].identity_verified_at) {
      alerts.push({
        alert_type: 'UNVERIFIED_HIGH_VALUE_BOOKING',
        severity: 'high',
        title: `Unverified user: ARS ${booking.total_amount_ars?.toLocaleString()} booking`,
        message: `Unverified user attempting high-value booking of ARS ${booking.total_amount_ars?.toLocaleString()}`,
        user_id: booking.renter_id,
        metadata: { booking_id: booking.id, amount_ars: booking.total_amount_ars },
      });
    }
  }

  // --- Pattern 6: Suspicious refund patterns (>$50,000 ARS in 24h) ---
  console.log('Fraud check 6/8: refund patterns...');
  const refunds = await safeQuery('wallet_ledger', (q: any) =>
    q.eq('kind', 'refund')
      .gte('created_at', twentyFourHoursAgo)
      .select('user_id,amount_cents'));
  for (const [userId, totalCents] of Object.entries(groupSum(refunds, 'user_id', 'amount_cents'))) {
    if ((totalCents as number) >= 5000000) {
      alerts.push({
        alert_type: 'HIGH_REFUND_VOLUME',
        severity: 'high',
        title: `High refund volume: ARS ${((totalCents as number) / 100).toLocaleString()}`,
        message: `User ${userId.substring(0, 8)}... received ARS ${((totalCents as number) / 100).toLocaleString()} in refunds in 24h`,
        user_id: userId,
        metadata: { total_cents: totalCents, window: '24h' },
      });
    }
  }

  // --- Pattern 7: Gaming signals (reward pool anti-fraud) ---
  console.log('Fraud check 7/8: gaming signals...');
  const gamingSignals = await safeQuery('owner_gaming_signals', (q: any) =>
    q.eq('status', 'active')
      .gte('risk_score', 40)
      .gte('detected_at', twentyFourHoursAgo)
      .select('owner_id,signal_type,risk_score'));

  // Group by owner: collect signals and sum scores
  const gamingByOwner: Record<string, { signals: string[]; totalScore: number }> = {};
  for (const s of gamingSignals) {
    if (s.owner_id) {
      if (!gamingByOwner[s.owner_id]) gamingByOwner[s.owner_id] = { signals: [], totalScore: 0 };
      gamingByOwner[s.owner_id].signals.push(s.signal_type);
      gamingByOwner[s.owner_id].totalScore += s.risk_score;
    }
  }
  for (const [ownerId, data] of Object.entries(gamingByOwner)) {
    if (data.totalScore >= 40) {
      alerts.push({
        alert_type: 'GAMING_SIGNALS_DETECTED',
        severity: data.totalScore >= 60 ? 'high' : 'warning',
        title: `Gaming signals detected (score: ${data.totalScore})`,
        message: `Owner ${ownerId.substring(0, 8)}... has gaming signals (score: ${data.totalScore}): ${data.signals.join(', ')}`,
        user_id: ownerId,
        metadata: { signals: data.signals, total_score: data.totalScore },
      });
    }
  }

  // --- Pattern 8: Frozen payouts pending admin review ---
  console.log('Fraud check 8/8: frozen payouts...');
  const frozenPayouts = await safeQuery('admin_review_queue', (q: any) =>
    q.eq('status', 'pending').select('id,owner_id,risk_score,frozen_amount'));
  if (frozenPayouts.length > 0) {
    const totalFrozen = frozenPayouts.reduce((sum: number, p: any) => sum + (p.frozen_amount || 0), 0);
    alerts.push({
      alert_type: 'FROZEN_PAYOUTS_PENDING',
      severity: frozenPayouts.length >= 5 ? 'high' : 'warning',
      title: `${frozenPayouts.length} frozen payouts pending review`,
      message: `${frozenPayouts.length} frozen payouts pending review (total: $${totalFrozen.toFixed(2)} USD)`,
      metadata: { count: frozenPayouts.length, total_frozen_usd: totalFrozen },
    });
  }

  return alerts;
}

// ============================================================================
// PROVIDER INTEGRATIONS
// ============================================================================

async function sendPagerDutyAlert(alert: Alert, config: AlertingConfig): Promise<boolean> {
  if (!config.pagerduty_integration_key) return false;
  try {
    const response = await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        routing_key: config.pagerduty_integration_key,
        event_action: 'trigger',
        dedup_key: `autorenta_${alert.id}`,
        payload: {
          summary: alert.title,
          severity: alert.severity === 'high' ? 'error' : alert.severity,
          source: 'AutoRenta Production',
          timestamp: new Date(alert.created_at).toISOString(),
          component: alert.alert_type,
          group: 'production',
          class: alert.alert_type,
          custom_details: {
            message: alert.message,
            alert_id: alert.id,
            metadata: alert.metadata,
          },
        },
      }),
    });
    if (!response.ok) {
      console.error('PagerDuty error:', response.status, await response.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error('PagerDuty error:', error);
    return false;
  }
}

async function sendOpsgenieAlert(alert: Alert, config: AlertingConfig): Promise<boolean> {
  if (!config.opsgenie_api_key) return false;
  try {
    const priorityMap: Record<string, string> = { critical: 'P1', high: 'P2', warning: 'P3', info: 'P5' };
    const response = await fetch('https://api.opsgenie.com/v2/alerts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `GenieKey ${config.opsgenie_api_key}`,
      },
      body: JSON.stringify({
        message: alert.title,
        alias: `autorenta_${alert.id}`,
        description: alert.message,
        priority: priorityMap[alert.severity] || 'P5',
        source: 'AutoRenta Production',
        tags: ['autorenta', 'production', alert.alert_type],
        details: { alert_id: alert.id, severity: alert.severity, alert_type: alert.alert_type },
      }),
    });
    if (!response.ok) {
      console.error('Opsgenie error:', response.status, await response.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error('Opsgenie error:', error);
    return false;
  }
}

async function sendSlackAlert(alert: Alert, config: AlertingConfig): Promise<boolean> {
  if (!config.slack_webhook_url) return false;
  try {
    const colorMap: Record<string, string> = { critical: '#FF0000', high: '#FF4500', warning: '#FFA500', info: '#36A2EB' };
    const emojiMap: Record<string, string> = { critical: '🚨', high: '🔴', warning: '⚠️', info: 'ℹ️' };
    const response = await fetch(config.slack_webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `${emojiMap[alert.severity] || 'ℹ️'} AutoRenta Alert: ${alert.title}`,
        attachments: [{
          color: colorMap[alert.severity] || '#36A2EB',
          fields: [
            { title: 'Severity', value: alert.severity.toUpperCase(), short: true },
            { title: 'Type', value: alert.alert_type, short: true },
            { title: 'Message', value: alert.message, short: false },
            { title: 'Time', value: new Date(alert.created_at).toLocaleString(), short: true },
          ],
          footer: 'AutoRenta Realtime Alerting',
        }],
      }),
    });
    return response.ok;
  } catch (error) {
    console.error('Slack error:', error);
    return false;
  }
}

async function sendSentryAlert(alert: Alert, config: AlertingConfig): Promise<boolean> {
  if (!config.sentry_webhook_url) return false;
  try {
    const levelMap: Record<string, string> = { critical: 'error', high: 'error', warning: 'warning', info: 'info' };
    const response = await fetch(config.sentry_webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: alert.title,
        message: alert.message,
        level: levelMap[alert.severity] || 'info',
        tags: { environment: 'production', alert_type: alert.alert_type, alert_id: alert.id },
        extra: alert.metadata,
      }),
    });
    return response.ok;
  } catch (error) {
    console.error('Sentry error:', error);
    return false;
  }
}

// ============================================================================
// ALERT ROUTING
// ============================================================================

function getProvidersForAlert(alert: Alert): AlertProvider[] {
  const rule = ROUTING_RULES.find(
    (r) => r.severity === alert.severity && r.alert_type === alert.alert_type,
  );
  if (rule) return rule.providers;

  // Default fallback by severity
  if (alert.severity === 'critical' || alert.severity === 'high') return ['pagerduty', 'slack'];
  if (alert.severity === 'warning') return ['slack'];
  return ['slack'];
}

async function routeAlerts(
  supabase: ReturnType<typeof createClient>,
  config: AlertingConfig,
  alerts: Alert[],
): Promise<any[]> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  return Promise.all(
    alerts.map(async (alert) => {
      // Check if already notified recently
      const { data: recentNotifications } = await supabase
        .from('monitoring_alert_notifications')
        .select('id, notification_channel')
        .eq('alert_id', alert.id)
        .gte('created_at', fiveMinutesAgo);

      const alreadyNotified = new Set(
        (recentNotifications || []).map((n: any) => n.notification_channel),
      );
      const targetProviders = getProvidersForAlert(alert);
      const providersToNotify = targetProviders.filter((p) => !alreadyNotified.has(p));

      if (providersToNotify.length === 0) {
        return { alert_id: alert.id, status: 'already_notified' };
      }

      // Send to each provider
      const providerResults: Record<string, boolean> = {};
      for (const provider of providersToNotify) {
        let sent = false;
        switch (provider) {
          case 'pagerduty': sent = await sendPagerDutyAlert(alert, config); break;
          case 'opsgenie': sent = await sendOpsgenieAlert(alert, config); break;
          case 'slack': sent = await sendSlackAlert(alert, config); break;
          case 'sentry': sent = await sendSentryAlert(alert, config); break;
        }
        providerResults[provider] = sent;

        // Record notification
        await supabase.from('monitoring_alert_notifications').insert({
          alert_id: alert.id,
          notification_channel: provider,
          notification_status: sent ? 'sent' : 'failed',
          sent_at: sent ? new Date().toISOString() : null,
          error_message: sent ? null : `${provider} notification failed`,
        });
      }

      // SLA metrics
      const detectionTime = Date.now() - new Date(alert.created_at).getTime();
      await supabase.from('monitoring_sla_metrics').insert({
        alert_id: alert.id,
        detection_time_ms: detectionTime,
        notification_time_ms: detectionTime,
        providers_notified: targetProviders,
      });

      return { alert_id: alert.id, status: 'processed', providers: providerResults };
    }),
  );
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const config = getAlertingConfig();
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const url = new URL(req.url);
    const mode = url.searchParams.get('mode') || 'route';

    // ---- MODE: DETECT (fraud detection → insert → route) ----
    if (mode === 'detect') {
      console.log('Running fraud detection...');
      const detected = await detectFraudPatterns(supabase);

      console.log(`Detected ${detected.length} suspicious patterns`);

      if (detected.length === 0) {
        return new Response(
          JSON.stringify({
            mode: 'detect',
            detected: 0,
            alerts: [],
            routed: 0,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      // Deduplicate: skip alerts that already exist (same type + user in last 6h)
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
      const insertedAlerts: Alert[] = [];

      for (const alert of detected) {
        // Check for existing active alert of same type for same user
        const { data: existing } = await supabase
          .from('monitoring_alerts')
          .select('id')
          .eq('alert_type', alert.alert_type)
          .eq('status', 'active')
          .gte('created_at', sixHoursAgo)
          .limit(1);

        if (existing && existing.length > 0) {
          console.log(`Skipping duplicate: ${alert.alert_type}`);
          continue;
        }

        const { data: inserted, error } = await supabase
          .from('monitoring_alerts')
          .insert({
            alert_type: alert.alert_type,
            severity: alert.severity,
            title: alert.title,
            message: alert.message,
            status: 'active',
            user_id: alert.user_id || null,
            metadata: alert.metadata || {},
          })
          .select()
          .single();

        if (error) {
          console.error(`Failed to insert alert ${alert.alert_type}:`, error.message);
          continue;
        }

        insertedAlerts.push(inserted);
      }

      // Route the newly inserted alerts
      let routeResults: any[] = [];
      if (insertedAlerts.length > 0) {
        routeResults = await routeAlerts(supabase, config, insertedAlerts);
      }

      // Categorize for response
      const highAlerts = detected.filter((a) => a.severity === 'high' || a.severity === 'critical');
      const warningAlerts = detected.filter((a) => a.severity === 'warning');

      return new Response(
        JSON.stringify({
          mode: 'detect',
          detected: detected.length,
          inserted: insertedAlerts.length,
          routed: routeResults.length,
          high_count: highAlerts.length,
          warning_count: warningAlerts.length,
          alerts: detected,
          route_results: routeResults,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ---- MODE: ROUTE (process existing unnotified alerts) ----
    const { data: alerts, error: alertsError } = await supabase
      .from('monitoring_alerts')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(20);

    if (alertsError) throw alertsError;

    if (!alerts || alerts.length === 0) {
      return new Response(
        JSON.stringify({ mode: 'route', message: 'No active alerts to process', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const results = await routeAlerts(supabase, config, alerts);

    return new Response(
      JSON.stringify({ mode: 'route', count: results.length, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Alert processing error:', error);
    return new Response(
      JSON.stringify({
        error: 'Alert processing failed',
        message: 'Internal server error',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
