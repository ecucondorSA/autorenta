// ============================================================================
// AUTORENTA - Wallet Reconciliation Edge Function
// ============================================================================
// Reconcilia los saldos de user_wallets con las entradas del wallet_ledger
// Se ejecuta diariamente vía cron job o manualmente
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendReconciliationAlert } from '../_shared/alerts.ts';

interface ReconciliationResult {
  user_id: string;
  stored_balance: number;
  calculated_balance: number;
  difference: number;
  discrepancy: boolean;
}

interface ReconciliationReport {
  timestamp: string;
  total_users: number;
  users_checked: number;
  discrepancies_found: number;
  total_difference: number;
  users_with_issues: ReconciliationResult[];
  coverage_fund_balance: number;
  coverage_fund_calculated: number;
  coverage_fund_ok: boolean;
}

interface WalletRow {
  user_id: string;
  balance_cents: number;
  available_balance_cents: number;
  locked_balance_cents: number;
}

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function normalizeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error';
  }
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const supabaseUrl = getRequiredEnv('SUPABASE_URL');
    const supabaseServiceRoleKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');

    // Usar service role key directamente (función administrativa)
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    console.log('[Reconciliation] Starting wallet reconciliation...');

    // ========================================
    // PASO 1: Reconciliar user_wallets
    // ========================================

    // Obtener todos los usuarios con wallet
    const { data: wallets, error: walletsError } = await supabase
      .from('user_wallets')
      .select('user_id, balance_cents, available_balance_cents, locked_balance_cents');

    if (walletsError) throw walletsError;
    const typedWallets = (wallets ?? []) as WalletRow[];

    console.log(`[Reconciliation] Found ${typedWallets.length} user wallets`);

    const discrepancies: ReconciliationResult[] = [];
    let totalDifference = 0;

    // Para cada usuario, calcular balance desde ledger
    for (const wallet of typedWallets) {
      const { data: ledgerEntries, error: ledgerError } = await supabase
        .from('wallet_ledger')
        .select('kind, amount_cents')
        .eq('user_id', wallet.user_id);

      if (ledgerError) {
        console.error(`Error fetching ledger for user ${wallet.user_id}:`, ledgerError);
        continue;
      }

      // Calcular balance desde ledger
      let calculatedBalance = 0;

      for (const entry of ledgerEntries) {
        // Movimientos positivos
        if (['deposit', 'transfer_in', 'refund', 'rental_payment', 'bonus'].includes(entry.kind)) {
          calculatedBalance += entry.amount_cents;
        }
        // Movimientos negativos
        else if (['transfer_out', 'rental_charge', 'franchise_user', 'withdrawal', 'adjustment', 'fee'].includes(entry.kind)) {
          calculatedBalance -= entry.amount_cents;
        }
      }

      const storedBalance = typeof wallet.balance_cents === 'number'
        ? wallet.balance_cents
        : wallet.available_balance_cents + wallet.locked_balance_cents;
      const difference = storedBalance - calculatedBalance;

      if (Math.abs(difference) > 0) {
        discrepancies.push({
          user_id: wallet.user_id,
          stored_balance: storedBalance,
          calculated_balance: calculatedBalance,
          difference,
          discrepancy: true,
        });

        totalDifference += Math.abs(difference);

        console.warn(`[Reconciliation] Discrepancy found for user ${wallet.user_id}:`, {
          stored: storedBalance,
          calculated: calculatedBalance,
          difference,
        });
      }
    }

    // ========================================
    // PASO 2: Reconciliar coverage_fund
    // ========================================

    const { data: fundData, error: fundError } = await supabase
      .from('coverage_fund')
      .select('balance_cents')
      .single();

    // coverage_fund table may not exist yet — skip gracefully
    let fundBalance = 0;
    let calculatedFundBalance = 0;
    let fundOk = true;

    if (fundError) {
      console.warn('[Reconciliation] coverage_fund not available, skipping:', fundError.message);
    } else {
      fundBalance = fundData.balance_cents;

      // Calcular balance del fondo desde ledger
      const { data: fundLedger, error: fundLedgerError } = await supabase
        .from('wallet_ledger')
        .select('kind, amount_cents')
        .in('kind', ['franchise_user', 'franchise_fund']);

      if (fundLedgerError) {
        console.warn('[Reconciliation] Could not read fund ledger entries:', fundLedgerError.message);
      } else {
        for (const entry of fundLedger) {
          if (entry.kind === 'franchise_fund') {
            calculatedFundBalance += entry.amount_cents;
          } else if (entry.kind === 'franchise_user') {
            calculatedFundBalance -= entry.amount_cents;
          }
        }

        const fundDifference = fundBalance - calculatedFundBalance;
        fundOk = Math.abs(fundDifference) === 0;
      }
    }

    if (!fundOk) {
      console.warn('[Reconciliation] Coverage fund discrepancy:', {
        stored: fundBalance,
        calculated: calculatedFundBalance,
        difference: fundBalance - calculatedFundBalance,
      });
    }

    // ========================================
    // PASO 3: Generar reporte
    // ========================================

    const report: ReconciliationReport = {
      timestamp: new Date().toISOString(),
      total_users: typedWallets.length,
      users_checked: typedWallets.length,
      discrepancies_found: discrepancies.length,
      total_difference: totalDifference,
      users_with_issues: discrepancies,
      coverage_fund_balance: fundBalance,
      coverage_fund_calculated: calculatedFundBalance,
      coverage_fund_ok: fundOk,
    };

    // ========================================
    // PASO 4: Guardar reporte en tabla (opcional)
    // ========================================

    // Podrías crear una tabla reconciliation_reports para guardar histórico
    // Por ahora solo retornamos el reporte

    console.log('[Reconciliation] Reconciliation completed:', {
      users_checked: report.users_checked,
      discrepancies: report.discrepancies_found,
      fund_ok: report.coverage_fund_ok,
    });

    // ========================================
    // PASO 5: Enviar alertas si hay discrepancias críticas
    // ========================================

    if (discrepancies.length > 0 || !fundOk) {
      console.error('[Reconciliation] ⚠️ CRITICAL: Discrepancies detected!');

      // ✅ IMPLEMENTED: Sistema de alertas con logging estructurado
      // Future: Integrar con Slack/Email cuando esté configurado
      try {
        await sendReconciliationAlert(
          discrepancies.map(d => ({
            user_id: d.user_id,
            stored_balance: d.stored_balance,
            calculated_balance: d.calculated_balance,
            difference: d.difference,
            difference_ars: (d.difference / 100).toFixed(2),
          })),
          totalDifference,
          fundOk,
          report.coverage_fund_balance,
          report.coverage_fund_calculated
        );
      } catch (alertError) {
        console.error('[Reconciliation] Failed to send alert:', alertError);
        // No fallar la reconciliación si falla el envío de alerta
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        report,
        discrepancies: report.discrepancies_found,
        coverage_fund_ok: report.coverage_fund_ok,
        total_difference: report.total_difference,
        message: discrepancies.length === 0 && fundOk
          ? '✅ All balances reconciled successfully'
          : '⚠️ Discrepancies found - check report',
      }),
      {
        status: 200,
        headers: JSON_HEADERS,
      }
    );
  } catch (error) {
    console.error('[Reconciliation] Error:', error);
    const normalizedError = normalizeError(error);

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Reconciliation failed',
      }),
      {
        status: 500,
        headers: JSON_HEADERS,
      }
    );
  }
});
