// ============================================================================
// AUTORENTA - Wallet Reconciliation Edge Function
// ============================================================================
// Reconcilia los saldos de user_wallets con las entradas del wallet_ledger
// Se ejecuta diariamente vía cron job o manualmente
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendReconciliationAlert } from '../_shared/alerts.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

serve(async (req) => {
  // Usar service role key directamente (función administrativa)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    console.log('[Reconciliation] Starting wallet reconciliation...');

    // ========================================
    // PASO 1: Reconciliar user_wallets
    // ========================================

    // Obtener todos los usuarios con wallet
    const { data: wallets, error: walletsError } = await supabase
      .from('user_wallets')
      .select('user_id, available_balance, locked_balance');

    if (walletsError) throw walletsError;

    console.log(`[Reconciliation] Found ${wallets.length} user wallets`);

    const discrepancies: ReconciliationResult[] = [];
    let totalDifference = 0;

    // Para cada usuario, calcular balance desde ledger
    for (const wallet of wallets) {
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

      const storedBalance = wallet.available_balance + wallet.locked_balance;
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

    if (fundError) throw fundError;

    const fundBalance = fundData.balance_cents;

    // Calcular balance del fondo desde ledger
    const { data: fundLedger, error: fundLedgerError } = await supabase
      .from('wallet_ledger')
      .select('kind, amount_cents')
      .in('kind', ['franchise_user', 'franchise_fund']);

    if (fundLedgerError) throw fundLedgerError;

    let calculatedFundBalance = 0;

    for (const entry of fundLedger) {
      if (entry.kind === 'franchise_fund') {
        calculatedFundBalance += entry.amount_cents;
      } else if (entry.kind === 'franchise_user') {
        calculatedFundBalance -= entry.amount_cents;
      }
    }

    const fundDifference = fundBalance - calculatedFundBalance;
    const fundOk = Math.abs(fundDifference) === 0;

    if (!fundOk) {
      console.warn('[Reconciliation] Coverage fund discrepancy:', {
        stored: fundBalance,
        calculated: calculatedFundBalance,
        difference: fundDifference,
      });
    }

    // ========================================
    // PASO 3: Generar reporte
    // ========================================

    const report: ReconciliationReport = {
      timestamp: new Date().toISOString(),
      total_users: wallets.length,
      users_checked: wallets.length,
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
        message: discrepancies.length === 0 && fundOk
          ? '✅ All balances reconciled successfully'
          : '⚠️ Discrepancies found - check report',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Reconciliation] Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        details: error instanceof Error ? error.stack : undefined,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
