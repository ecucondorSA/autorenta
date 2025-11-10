/**
 * Alert System for Critical Events
 *
 * Sistema de alertas para eventos críticos de la plataforma.
 * Actualmente implementa logging estructurado.
 *
 * TODO Future: Integrar con Slack/Email/PagerDuty
 */

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export interface Alert {
  severity: AlertSeverity;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  timestamp?: string;
}

export interface DiscrepancyAlert {
  user_id: string;
  stored_balance: number;
  calculated_balance: number;
  difference: number;
  difference_ars: string;
}

/**
 * Send alert (currently logs to console with structured format)
 *
 * Future implementation will send to:
 * - Slack webhook
 * - Email via Resend/SendGrid
 * - PagerDuty for critical alerts
 *
 * @param alert - Alert object
 */
export async function sendAlert(alert: Alert): Promise<void> {
  const formattedAlert = {
    timestamp: alert.timestamp || new Date().toISOString(),
    severity: alert.severity,
    title: alert.title,
    message: alert.message,
    metadata: alert.metadata,
    // Agregar contexto adicional
    environment: Deno.env.get('ENVIRONMENT') || 'production',
    service: 'autorenta-edge-functions',
  };

  // Usar console.error para alerts críticos (aparecen en logs de Supabase)
  if (alert.severity === AlertSeverity.CRITICAL || alert.severity === AlertSeverity.ERROR) {
    console.error('🚨 ALERT:', JSON.stringify(formattedAlert, null, 2));
  } else if (alert.severity === AlertSeverity.WARNING) {
    console.warn('⚠️ ALERT:', JSON.stringify(formattedAlert, null, 2));
  } else {
    console.info('ℹ️ ALERT:', JSON.stringify(formattedAlert, null, 2));
  }

  // TODO: Implementar integración con servicios externos
  // await sendToSlack(formattedAlert);
  // await sendToEmail(formattedAlert);
  // await sendToPagerDuty(formattedAlert);
}

/**
 * Send wallet reconciliation discrepancy alert
 */
export async function sendReconciliationAlert(
  discrepancies: DiscrepancyAlert[],
  totalDifference: number,
  fundOk: boolean,
  fundBalance: number,
  fundCalculated: number
): Promise<void> {
  const severity = discrepancies.length > 10 || !fundOk
    ? AlertSeverity.CRITICAL
    : AlertSeverity.WARNING;

  const title = discrepancies.length > 0 || !fundOk
    ? '🚨 CRITICAL: Wallet Reconciliation Discrepancies Detected'
    : '⚠️ Wallet Reconciliation Issues Detected';

  const message = [
    `Found ${discrepancies.length} wallet discrepancies`,
    `Total difference: ARS ${(totalDifference / 100).toFixed(2)}`,
    fundOk ? '' : '❌ Coverage fund mismatch detected',
  ].filter(Boolean).join('\n');

  await sendAlert({
    severity,
    title,
    message,
    metadata: {
      discrepancies_count: discrepancies.length,
      total_difference_cents: totalDifference,
      total_difference_ars: (totalDifference / 100).toFixed(2),
      coverage_fund_ok: fundOk,
      coverage_fund_balance: fundBalance,
      coverage_fund_calculated: fundCalculated,
      coverage_fund_difference: fundBalance - fundCalculated,
      affected_users: discrepancies.slice(0, 10).map(d => ({
        user_id: d.user_id,
        stored: `ARS ${(d.stored_balance / 100).toFixed(2)}`,
        calculated: `ARS ${(d.calculated_balance / 100).toFixed(2)}`,
        difference: `ARS ${(d.difference / 100).toFixed(2)}`,
      })),
      truncated: discrepancies.length > 10,
    },
  });

  // Si hay muchas discrepancias, enviar alert adicional
  if (discrepancies.length > 10) {
    await sendAlert({
      severity: AlertSeverity.CRITICAL,
      title: '🚨 HIGH VOLUME: Multiple Wallet Discrepancies',
      message: `Detected ${discrepancies.length} discrepancies - This requires immediate investigation`,
      metadata: {
        total_discrepancies: discrepancies.length,
        action_required: 'Run wallet_reconciliation.sql script to investigate',
      },
    });
  }
}

/**
 * Send webhook error alert
 */
export async function sendWebhookErrorAlert(
  webhookType: string,
  error: Error,
  paymentId?: string
): Promise<void> {
  await sendAlert({
    severity: AlertSeverity.ERROR,
    title: `🚨 Webhook Error: ${webhookType}`,
    message: `Error processing ${webhookType} webhook`,
    metadata: {
      webhook_type: webhookType,
      payment_id: paymentId,
      error_message: error.message,
      error_stack: error.stack,
    },
  });
}

/**
 * Send payment failure alert
 */
export async function sendPaymentFailureAlert(
  paymentId: string,
  userId: string,
  amount: number,
  reason: string
): Promise<void> {
  await sendAlert({
    severity: AlertSeverity.ERROR,
    title: '💳 Payment Failure',
    message: `Payment ${paymentId} failed for user ${userId}`,
    metadata: {
      payment_id: paymentId,
      user_id: userId,
      amount_ars: (amount / 100).toFixed(2),
      failure_reason: reason,
    },
  });
}
