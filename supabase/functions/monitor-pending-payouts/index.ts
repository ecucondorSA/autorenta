/**
 * Monitor Pending Payouts Edge Function
 *
 * Purpose: Detectar y alertar sobre split payments pendientes > 24 horas
 * Frequency: Cron job cada hora
 * Alerts: Sentry + Console logs (futuro: Slack/Email)
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { sendAlert, AlertSeverity } from '../_shared/alerts.ts';
import { captureError } from '../_shared/sentry.ts';

interface PendingPayout {
  booking_id: string;
  created_at: string;
  total_amount: number;
  payout_status: string;
  payout_retry_count: number;
  payout_error_message: string | null;
  car_id: string;
  car_name: string;
  owner_id: string;
  owner_email: string;
  owner_name: string;
  hours_pending: number;
}

interface PayoutStats {
  total_payouts: number;
  completed_payouts: number;
  pending_payouts: number;
  failed_payouts: number;
  total_platform_fees: number;
  total_owner_payments: number;
  avg_payout_time_hours: number;
}

Deno.serve(async (req) => {
  try {
    // Verificar que es llamada interna (cron o admin)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Crear cliente Supabase con service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    console.log('🔍 Starting pending payouts monitoring...');

    // 1. Obtener payouts pendientes críticos (> 24 horas)
    const { data: criticalPayouts, error: criticalError } = await supabase
      .from('pending_payouts_critical')
      .select('*')
      .order('created_at', { ascending: true });

    if (criticalError) {
      console.error('Error fetching critical payouts:', criticalError);
      captureError(new Error(criticalError.message), {
        tags: { context: 'monitor-pending-payouts' },
        extra: { operation: 'fetch_critical_payouts' },
      });
      throw criticalError;
    }

    // 2. Obtener stats generales de payouts (últimos 7 días)
    const { data: stats, error: statsError } = await supabase
      .rpc('get_payout_stats', {
        p_from_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        p_to_date: new Date().toISOString(),
      })
      .single();

    if (statsError) {
      // No es crítico, continuar
    }

    // Validate stats structure if available
    let payoutStats: PayoutStats | null = null;
    if (stats && typeof stats === 'object' && !Array.isArray(stats)) {
      const statsRecord = stats as Record<string, unknown>;
      if (
        typeof statsRecord.total_payouts === 'number' &&
        typeof statsRecord.completed_payouts === 'number' &&
        typeof statsRecord.pending_payouts === 'number' &&
        typeof statsRecord.failed_payouts === 'number'
      ) {
        payoutStats = stats as PayoutStats;
      }
    }

    // 3. Analizar payouts críticos
    const criticalCount = criticalPayouts?.length || 0;

    if (criticalCount > 0) {
      console.error(`🚨 CRITICAL: ${criticalCount} pending payouts > 24 hours`);

      // Calcular totales
      const totalAmount = criticalPayouts!.reduce((sum, p) => sum + p.total_amount, 0);
      const avgHoursPending = criticalPayouts!.reduce((sum, p) => sum + p.hours_pending, 0) / criticalCount;
      const maxHoursPending = Math.max(...criticalPayouts!.map(p => p.hours_pending));

      // Separar por status
      const pendingPayouts = criticalPayouts!.filter(p => p.payout_status === 'pending');
      const failedPayouts = criticalPayouts!.filter(p => p.payout_status === 'failed');

      // Enviar alerta crítica
      await sendAlert({
        severity: AlertSeverity.CRITICAL,
        title: '🚨 CRITICAL: Pending Payouts Detected',
        message: `Found ${criticalCount} payouts pending > 24 hours (Total: ARS ${totalAmount.toFixed(2)})`,
        metadata: {
          critical_count: criticalCount,
          pending_count: pendingPayouts.length,
          failed_count: failedPayouts.length,
          total_amount: totalAmount,
          total_amount_formatted: `ARS ${totalAmount.toFixed(2)}`,
          avg_hours_pending: Math.round(avgHoursPending * 10) / 10,
          max_hours_pending: Math.round(maxHoursPending * 10) / 10,
          oldest_payout: criticalPayouts![0].created_at,
          affected_owners: [...new Set(criticalPayouts!.map(p => p.owner_email))].length,
          payouts: criticalPayouts!.slice(0, 5).map(p => ({
            booking_id: p.booking_id,
            owner: p.owner_email,
            car: p.car_name,
            amount: `ARS ${p.total_amount.toFixed(2)}`,
            hours_pending: Math.round(p.hours_pending),
            status: p.payout_status,
            retry_count: p.payout_retry_count,
            error: p.payout_error_message,
          })),
          truncated: criticalCount > 5,
        },
      });

      // Si hay fallos, enviar alerta adicional
      if (failedPayouts.length > 0) {
        await sendAlert({
          severity: AlertSeverity.CRITICAL,
          title: '❌ CRITICAL: Failed Payouts Require Manual Review',
          message: `${failedPayouts.length} payouts have FAILED and require manual intervention`,
          metadata: {
            failed_count: failedPayouts.length,
            failed_payouts: failedPayouts.map(p => ({
              booking_id: p.booking_id,
              owner: p.owner_email,
              amount: `ARS ${p.total_amount.toFixed(2)}`,
              retry_count: p.payout_retry_count,
              error: p.payout_error_message,
              hours_since_creation: Math.round(p.hours_pending),
            })),
            action_required: 'Review and process manually via admin panel',
          },
        });
      }
    } else {
      console.log('✅ No critical pending payouts detected');
    }

    // 4. Alertar si hay muchos payouts pendientes normales (< 24h pero > 50)
    if (payoutStats && payoutStats.pending_payouts > 50) {
      await sendAlert({
        severity: AlertSeverity.WARNING,
        title: '⚠️ High Volume: Many Pending Payouts',
        message: `${payoutStats.pending_payouts} payouts currently pending (may become critical)`,
        metadata: {
          pending_count: payoutStats.pending_payouts,
          total_payouts: payoutStats.total_payouts,
          completion_rate: ((payoutStats.completed_payouts / payoutStats.total_payouts) * 100).toFixed(1) + '%',
          avg_payout_time: payoutStats.avg_payout_time_hours?.toFixed(1) + ' hours',
          recommendation: 'Monitor closely - may need to investigate MercadoPago integration',
        },
      });
    }

    // 5. Respuesta exitosa
    const response = {
      success: true,
      checked_at: new Date().toISOString(),
      summary: {
        critical_payouts: criticalCount,
        total_pending: payoutStats?.pending_payouts || 0,
        total_failed: payoutStats?.failed_payouts || 0,
        completion_rate: payoutStats
          ? ((payoutStats.completed_payouts / payoutStats.total_payouts) * 100).toFixed(1) + '%'
          : 'N/A',
      },
      critical_payouts: criticalPayouts || [],
      stats: payoutStats || null,
    };

    return new Response(
      JSON.stringify(response, null, 2),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ Error in monitor-pending-payouts:', error);

    // Capturar en Sentry
    captureError(error instanceof Error ? error : new Error(String(error)), {
      tags: { context: 'monitor-pending-payouts' },
      extra: { operation: 'main' },
    });

    // Enviar alerta de que el monitoring falló
    await sendAlert({
      severity: AlertSeverity.ERROR,
      title: '🚨 Monitor Pending Payouts Function Failed',
      message: 'The payout monitoring function encountered an error',
      metadata: {
        error_message: 'Internal server error',
        error_stack: undefined,
      },
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
