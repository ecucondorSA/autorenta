/**
 * Supabase Edge Function: payment-reconciliation
 *
 * Reconcilia pagos entre MercadoPago y nuestra base de datos.
 * Detecta discrepancias y corrige estados inconsistentes.
 *
 * Diseñado para ejecutarse:
 * - Diariamente via pg_cron o n8n
 * - Manualmente por admin cuando sea necesario
 *
 * Checks realizados:
 * 1. Bookings en 'pending_payment' con pagos aprobados en MP
 * 2. Pagos en nuestra DB sin confirmación de MP
 * 3. Preautorizaciones vencidas no procesadas
 * 4. Wallets con balance inconsistente
 * 5. Webhook DLQ backlog
 * 6. Commission percentage audit (migrado de commission-reconciliation.yml — Regla #1)
 *
 * Environment Variables Required:
 * - SUPABASE_URL: URL del proyecto Supabase
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key
 * - MERCADOPAGO_ACCESS_TOKEN: Access token de MercadoPago
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

// Rate limiting constants
const MP_API_DELAY_MS = 200; // Delay entre llamadas a MercadoPago API para evitar rate limits
const MAX_BOOKINGS_PER_CHECK = 20; // Limitar bookings por check para evitar timeouts

/**
 * Delay helper to avoid MercadoPago API rate limits
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface ReconciliationResult {
  check: string;
  status: 'ok' | 'issues_found' | 'error';
  issues_count: number;
  fixed_count: number;
  details: unknown[];
}

interface ReconciliationReport {
  timestamp: string;
  duration_ms: number;
  overall_status: 'healthy' | 'issues_found' | 'critical';
  results: ReconciliationResult[];
  summary: {
    total_checks: number;
    total_issues: number;
    total_fixed: number;
  };
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const MP_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Parse query params
    const url = new URL(req.url);
    const autoFix = url.searchParams.get('autofix') === 'true';
    const daysBack = parseInt(url.searchParams.get('days') || '7', 10);

    const results: ReconciliationResult[] = [];

    // ========================================
    // CHECK 1: Bookings pendientes con pagos aprobados
    // ========================================
    const check1Result = await checkPendingBookingsWithApprovedPayments(
      supabase,
      MP_ACCESS_TOKEN,
      daysBack,
      autoFix
    );
    results.push(check1Result);

    // ========================================
    // CHECK 2: Pagos sin confirmación de MercadoPago
    // ========================================
    const check2Result = await checkUnconfirmedPayments(supabase, MP_ACCESS_TOKEN, daysBack, autoFix);
    results.push(check2Result);

    // ========================================
    // CHECK 3: Preautorizaciones vencidas
    // ========================================
    const check3Result = await checkExpiredPreauthorizations(supabase, MP_ACCESS_TOKEN, autoFix);
    results.push(check3Result);

    // ========================================
    // CHECK 4: Integridad de wallets
    // ========================================
    const check4Result = await checkWalletIntegrity(supabase);
    results.push(check4Result);

    // ========================================
    // CHECK 5: Webhook DLQ backlog
    // ========================================
    const check5Result = await checkDLQBacklog(supabase);
    results.push(check5Result);

    // ========================================
    // CHECK 6: Commission percentage audit
    // ========================================
    const check6Result = await checkCommissionPercentage(supabase, MP_ACCESS_TOKEN, daysBack);
    results.push(check6Result);

    // Calcular resumen
    const totalIssues = results.reduce((sum, r) => sum + r.issues_count, 0);
    const totalFixed = results.reduce((sum, r) => sum + r.fixed_count, 0);
    const hasCritical = results.some(
      (r) => r.status === 'error' || (r.status === 'issues_found' && r.issues_count > 10)
    );

    const report: ReconciliationReport = {
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
      overall_status: hasCritical ? 'critical' : totalIssues > 0 ? 'issues_found' : 'healthy',
      results,
      summary: {
        total_checks: results.length,
        total_issues: totalIssues,
        total_fixed: totalFixed,
      },
    };

    // Guardar reporte en audit_log
    try {
      await supabase.from('audit_log').insert({
        action: 'payment_reconciliation',
        entity_type: 'system',
        entity_id: 'reconciliation',
        new_values: report,
      });
    } catch {
      // Tabla puede no existir
    }

    // Alertar si hay issues críticos
    if (report.overall_status === 'critical') {
      await sendReconciliationAlert(report);
    }

    return new Response(JSON.stringify(report, null, 2), {
      status: report.overall_status === 'critical' ? 500 : 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Reconciliation error:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

/**
 * Check 1: Bookings en pending_payment que tienen pagos aprobados en MP
 */
async function checkPendingBookingsWithApprovedPayments(
  supabase: any,
  mpToken: string | undefined,
  daysBack: number,
  autoFix: boolean
): Promise<ReconciliationResult> {
  const details: unknown[] = [];
  let fixedCount = 0;

  try {
    const cutoffDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

    // Obtener bookings pendientes (limited to avoid rate limits)
    const { data: pendingBookings, error } = await supabase
      .from('bookings')
      .select('id, created_at, renter_id')
      .eq('status', 'pending_payment')
      .gte('created_at', cutoffDate)
      .order('created_at', { ascending: false })
      .limit(MAX_BOOKINGS_PER_CHECK);

    if (error) throw error;

    if (!pendingBookings || pendingBookings.length === 0) {
      return {
        check: 'pending_bookings_with_approved_payments',
        status: 'ok',
        issues_count: 0,
        fixed_count: 0,
        details: [],
      };
    }

    // Para cada booking, verificar en MercadoPago (con rate limiting)
    for (const booking of pendingBookings) {
      if (!mpToken) continue;

      try {
        // Rate limiting: delay between API calls
        await delay(MP_API_DELAY_MS);

        // Buscar pagos con external_reference = booking.id
        const response = await fetch(
          `https://api.mercadopago.com/v1/payments/search?external_reference=${booking.id}&status=approved`,
          {
            headers: { Authorization: `Bearer ${mpToken.trim()}` },
          }
        );

        if (!response.ok) continue;

        const data = await response.json();

        if (data.results && data.results.length > 0) {
          const payment = data.results[0];

          details.push({
            booking_id: booking.id,
            payment_id: payment.id,
            amount: payment.transaction_amount,
            approved_at: payment.date_approved,
          });

          if (autoFix) {
            // Registrar pago y actualizar booking
            await supabase.from('payments').upsert(
              {
                id: payment.id.toString(),
                booking_id: booking.id,
                amount: payment.transaction_amount,
                currency: payment.currency_id,
                status: 'completed',
                provider: 'mercadopago',
                provider_payment_id: payment.id.toString(),
                paid_at: payment.date_approved,
              },
              { onConflict: 'id' }
            );

            await supabase
              .from('bookings')
              .update({
                status: 'pending_owner_approval',
                updated_at: new Date().toISOString(),
              })
              .eq('id', booking.id);

            fixedCount++;
          }
        }
      } catch {
        // Ignorar errores individuales
      }
    }

    return {
      check: 'pending_bookings_with_approved_payments',
      status: details.length > 0 ? 'issues_found' : 'ok',
      issues_count: details.length,
      fixed_count: fixedCount,
      details,
    };
  } catch (e) {
    return {
      check: 'pending_bookings_with_approved_payments',
      status: 'error',
      issues_count: 0,
      fixed_count: 0,
      details: [{ error: e instanceof Error ? e.message : 'Unknown error' }],
    };
  }
}

/**
 * Check 2: Pagos en nuestra DB que no están confirmados en MP
 */
async function checkUnconfirmedPayments(
  supabase: any,
  mpToken: string | undefined,
  daysBack: number,
  autoFix: boolean
): Promise<ReconciliationResult> {
  const details: unknown[] = [];
  let fixedCount = 0;

  try {
    const cutoffDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

    // Obtener pagos completados recientes (limited to avoid rate limits)
    const { data: payments, error } = await supabase
      .from('payments')
      .select('id, booking_id, amount, provider_payment_id, status')
      .eq('status', 'approved')
      .eq('provider', 'mercadopago')
      .gte('created_at', cutoffDate)
      .limit(MAX_BOOKINGS_PER_CHECK);

    if (error) throw error;

    if (!payments || payments.length === 0 || !mpToken) {
      return {
        check: 'unconfirmed_payments',
        status: 'ok',
        issues_count: 0,
        fixed_count: 0,
        details: [],
      };
    }

    for (const payment of payments) {
      try {
        // Rate limiting: delay between API calls
        await delay(MP_API_DELAY_MS);

        const response = await fetch(
          `https://api.mercadopago.com/v1/payments/${payment.provider_payment_id}`,
          {
            headers: { Authorization: `Bearer ${mpToken.trim()}` },
          }
        );

        if (!response.ok) {
          if (response.status === 404) {
            details.push({
              payment_id: payment.id,
              provider_payment_id: payment.provider_payment_id,
              issue: 'Payment not found in MercadoPago',
            });
          }
          continue;
        }

        const mpPayment = await response.json();

        if (mpPayment.status !== 'approved') {
          details.push({
            payment_id: payment.id,
            provider_payment_id: payment.provider_payment_id,
            our_status: 'completed',
            mp_status: mpPayment.status,
          });

          if (autoFix && (mpPayment.status === 'cancelled' || mpPayment.status === 'rejected')) {
            await supabase.from('payments').update({ status: 'rejected' }).eq('id', payment.id);

            fixedCount++;
          }
        }
      } catch {
        // Ignorar errores individuales
      }
    }

    return {
      check: 'unconfirmed_payments',
      status: details.length > 0 ? 'issues_found' : 'ok',
      issues_count: details.length,
      fixed_count: fixedCount,
      details,
    };
  } catch (e) {
    return {
      check: 'unconfirmed_payments',
      status: 'error',
      issues_count: 0,
      fixed_count: 0,
      details: [{ error: e instanceof Error ? e.message : 'Unknown error' }],
    };
  }
}

/**
 * Check 3: Preautorizaciones que expiraron sin ser procesadas
 */
async function checkExpiredPreauthorizations(
  supabase: any,
  mpToken: string | undefined,
  autoFix: boolean
): Promise<ReconciliationResult> {
  const details: unknown[] = [];
  let fixedCount = 0;

  try {
    const now = new Date().toISOString();

    // Buscar preautorizaciones activas que ya expiraron
    const { data: preauths, error } = await supabase
      .from('preauthorizations')
      .select('id, booking_id, expires_at, provider_preauth_id, status')
      .eq('status', 'active')
      .lt('expires_at', now)
      .limit(50);

    if (error) throw error;

    if (!preauths || preauths.length === 0) {
      return {
        check: 'expired_preauthorizations',
        status: 'ok',
        issues_count: 0,
        fixed_count: 0,
        details: [],
      };
    }

    for (const preauth of preauths) {
      details.push({
        preauth_id: preauth.id,
        booking_id: preauth.booking_id,
        expired_at: preauth.expires_at,
        provider_id: preauth.provider_preauth_id,
      });

      if (autoFix) {
        // Marcar como expirada
        await supabase
          .from('preauthorizations')
          .update({
            status: 'expired',
            updated_at: new Date().toISOString(),
          })
          .eq('id', preauth.id);

        fixedCount++;
      }
    }

    return {
      check: 'expired_preauthorizations',
      status: details.length > 0 ? 'issues_found' : 'ok',
      issues_count: details.length,
      fixed_count: fixedCount,
      details,
    };
  } catch (e) {
    return {
      check: 'expired_preauthorizations',
      status: 'error',
      issues_count: 0,
      fixed_count: 0,
      details: [{ error: e instanceof Error ? e.message : 'Unknown error' }],
    };
  }
}

/**
 * Check 4: Integridad de balances de wallets
 */
async function checkWalletIntegrity(supabase: any): Promise<ReconciliationResult> {
  const details: unknown[] = [];

  try {
    // Obtener wallets
    const { data: wallets, error } = await supabase
      .from('wallets')
      .select('id, user_id, balance, locked_balance')
      .limit(100);

    if (error) throw error;

    if (!wallets || wallets.length === 0) {
      return {
        check: 'wallet_integrity',
        status: 'ok',
        issues_count: 0,
        fixed_count: 0,
        details: [],
      };
    }

    for (const wallet of wallets) {
      // Calcular balance esperado desde wallet_ledger (amount_cents, kind)
      const { data: ledgerEntries, error: ledgerError } = await supabase
        .from('wallet_ledger')
        .select('amount_cents, kind')
        .eq('user_id', wallet.user_id);

      if (ledgerError) {
        // Table might not exist or have different schema — skip gracefully
        if (ledgerError.message?.includes('does not exist') || ledgerError.code === '42P01') break;
        continue;
      }

      if (ledgerEntries) {
        // Credit kinds (add to balance)
        const creditKinds = ['deposit', 'refund', 'bonus', 'transfer_in', 'reward', 'release'];
        // Debit kinds (subtract from balance)
        const debitKinds = ['charge', 'withdrawal', 'transfer_out', 'lock', 'fee'];

        const calculatedCents = ledgerEntries.reduce((sum: number, entry: any) => {
          const cents = Number(entry.amount_cents) || 0;
          if (creditKinds.some((k) => entry.kind?.includes(k))) {
            return sum + cents;
          } else if (debitKinds.some((k) => entry.kind?.includes(k))) {
            return sum - cents;
          }
          return sum + cents; // Default: treat as credit
        }, 0);

        // wallet.balance is in major units (numeric), ledger is in cents
        const calculatedBalance = calculatedCents / 100;
        const diff = Math.abs(calculatedBalance - Number(wallet.balance));

        if (diff > 0.01) {
          details.push({
            wallet_id: wallet.id,
            user_id: wallet.user_id,
            stored_balance: wallet.balance,
            calculated_balance: calculatedBalance,
            difference: diff,
          });
        }
      }
    }

    return {
      check: 'wallet_integrity',
      status: details.length > 0 ? 'issues_found' : 'ok',
      issues_count: details.length,
      fixed_count: 0, // No auto-fix para balances - requiere revisión manual
      details,
    };
  } catch (e) {
    return {
      check: 'wallet_integrity',
      status: 'error',
      issues_count: 0,
      fixed_count: 0,
      details: [{ error: e instanceof Error ? e.message : 'Unknown error' }],
    };
  }
}

/**
 * Check 5: Backlog del Dead Letter Queue
 */
async function checkDLQBacklog(supabase: any): Promise<ReconciliationResult> {
  try {
    const { data, error } = await supabase
      .from('pending_webhook_events')
      .select('status', { count: 'exact' })
      .in('status', ['pending', 'retrying']);

    if (error) {
      if (error.message.includes('does not exist')) {
        return {
          check: 'dlq_backlog',
          status: 'ok',
          issues_count: 0,
          fixed_count: 0,
          details: [{ message: 'Webhook events table not found' }],
        };
      }
      throw error;
    }

    const backlogSize = data?.length || 0;

    // También obtener failed count
    const { data: failedData } = await supabase
      .from('pending_webhook_events')
      .select('id', { count: 'exact' })
      .eq('status', 'failed');

    const failedCount = failedData?.length || 0;

    return {
      check: 'dlq_backlog',
      status: backlogSize > 50 || failedCount > 10 ? 'issues_found' : 'ok',
      issues_count: backlogSize + failedCount,
      fixed_count: 0,
      details: [
        {
          pending_items: backlogSize,
          permanently_failed: failedCount,
        },
      ],
    };
  } catch (e) {
    return {
      check: 'dlq_backlog',
      status: 'error',
      issues_count: 0,
      fixed_count: 0,
      details: [{ error: e instanceof Error ? e.message : 'Unknown error' }],
    };
  }
}

/**
 * Check 6: Auditoría de comisiones — verifica que platform_fee ≈ PLATFORM_FEE_RATE
 * Migrado desde commission-reconciliation.yml (Regla #1)
 */
async function checkCommissionPercentage(
  supabase: any,
  mpToken: string | undefined,
  daysBack: number
): Promise<ReconciliationResult> {
  const details: unknown[] = [];

  try {
    // Leer tasa de comisión desde remote_config (single source of truth)
    let expectedRate = 0.15; // default 15%
    try {
      const { data: configRow } = await supabase
        .from('remote_config')
        .select('value')
        .eq('key', 'PLATFORM_FEE_RATE')
        .single();
      if (configRow?.value) {
        expectedRate = parseFloat(configRow.value);
      }
    } catch {
      // Usar default si remote_config no tiene la key
    }

    const cutoffDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

    // Bookings completados/confirmados en el período
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('id, total_price, service_fee, status')
      .in('status', ['confirmed', 'in_progress', 'completed'])
      .gte('created_at', cutoffDate)
      .limit(100);

    if (error) throw error;
    if (!bookings || bookings.length === 0) {
      return {
        check: 'commission_percentage_audit',
        status: 'ok',
        issues_count: 0,
        fixed_count: 0,
        details: [{ message: 'No bookings in period', expected_rate: expectedRate }],
      };
    }

    let expectedTotal = 0;
    let actualTotal = 0;
    let missingCount = 0;
    let wrongRateCount = 0;

    for (const booking of bookings) {
      const totalAmount = Number(booking.total_price) || 0;
      const actualFee = Number(booking.service_fee) || 0;
      const expectedFee = totalAmount * expectedRate;

      expectedTotal += expectedFee;
      actualTotal += actualFee;

      // Missing commission
      if (actualFee === 0 && totalAmount > 0) {
        missingCount++;
        details.push({
          type: 'MISSING_COMMISSION',
          booking_id: booking.id,
          total_amount: totalAmount,
          expected_fee: expectedFee,
        });
        continue;
      }

      // Wrong percentage (±1% tolerance, only for bookings > 1000)
      if (totalAmount > 1000) {
        const actualRate = actualFee / totalAmount;
        const rateDiff = Math.abs(actualRate - expectedRate);
        if (rateDiff > 0.01) {
          wrongRateCount++;
          details.push({
            type: 'WRONG_COMMISSION_RATE',
            booking_id: booking.id,
            total_amount: totalAmount,
            expected_fee: expectedFee,
            actual_fee: actualFee,
            expected_rate: `${(expectedRate * 100).toFixed(1)}%`,
            actual_rate: `${(actualRate * 100).toFixed(1)}%`,
          });
        }
      }
    }

    // Note: payments table only has 'amount', no 'marketplace_fee' column.
    // Cross-check with MercadoPago API would require live API calls (out of scope for reconciliation).

    const totalDiff = Math.abs(expectedTotal - actualTotal);
    const issueCount = details.length;

    // Add summary to details
    details.unshift({
      type: 'SUMMARY',
      bookings_checked: bookings.length,
      expected_rate: `${(expectedRate * 100).toFixed(1)}%`,
      expected_total: expectedTotal,
      actual_total: actualTotal,
      difference: totalDiff,
      missing_commissions: missingCount,
      wrong_rate: wrongRateCount,
    });

    return {
      check: 'commission_percentage_audit',
      status: issueCount > 0 ? 'issues_found' : 'ok',
      issues_count: issueCount,
      fixed_count: 0, // Audit only — no auto-fix for commission discrepancies
      details,
    };
  } catch (e) {
    return {
      check: 'commission_percentage_audit',
      status: 'error',
      issues_count: 0,
      fixed_count: 0,
      details: [{ error: e instanceof Error ? e.message : 'Unknown error' }],
    };
  }
}

/**
 * Envía alerta cuando hay issues críticos
 */
async function sendReconciliationAlert(report: ReconciliationReport): Promise<void> {
  const alertUrl = Deno.env.get('ALERT_WEBHOOK_URL');
  const n8nUrl = Deno.env.get('N8N_ALERT_WEBHOOK_URL');

  const alertPayload = {
    severity: 'critical',
    source: 'payment-reconciliation',
    event_type: 'reconciliation_issues',
    timestamp: report.timestamp,
    message: `Payment reconciliation found ${report.summary.total_issues} issues`,
    details: {
      total_checks: report.summary.total_checks,
      total_issues: report.summary.total_issues,
      total_fixed: report.summary.total_fixed,
      checks: report.results.map((r) => ({
        check: r.check,
        status: r.status,
        issues: r.issues_count,
      })),
    },
  };

  const urls = [alertUrl, n8nUrl].filter(Boolean);

  for (const url of urls) {
    try {
      await fetch(url!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertPayload),
      });
    } catch (e) {
      console.error(`Failed to send alert to ${url}:`, e);
    }
  }
}
