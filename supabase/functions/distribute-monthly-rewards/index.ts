/**
 * @fileoverview Edge Function: distribute-monthly-rewards
 * @version 2.0
 * @created 2026-02-02
 * @updated 2026-02-10
 *
 * Cron job mensual para distribuir el Reward Pool a owners.
 * Se ejecuta el 1ro de cada mes a las 00:00 UTC.
 *
 * v2.0: Uses distribute_monthly_rewards_with_eligibility() which gates
 * payouts on anti-fraud eligibility. Ineligible owners are skipped
 * (share redistributed) or frozen (high risk → admin review queue).
 *
 * Flujo:
 * 1. Cierra el pool del mes anterior
 * 2. Calcula shares con eligibility gate (anti-fraude)
 * 3. Crea registros de payout (pending/frozen) en reward_pool_payouts
 * 4. Abre nuevo pool para el mes actual
 * 5. Notifica owners (solo elegibles con payout > 0)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { createChildLogger } from '../_shared/logger.ts';

const log = createChildLogger('DistributeMonthlyRewards');

interface PoolPayout {
    owner_id: string;
    amount: number;
    share_percentage: number;
    was_frozen: boolean;
    freeze_reason: string | null;
}

serve(async (req: Request) => {
    const corsHeaders = getCorsHeaders(req);

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        log.info('🚀 Starting monthly reward distribution...');

        const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
        const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

        // ========================================
        // 1. FIND POOL TO DISTRIBUTE (previous month)
        // ========================================

        const previousMonth = new Date();
        previousMonth.setMonth(previousMonth.getMonth() - 1);
        const periodStart = new Date(previousMonth.getFullYear(), previousMonth.getMonth(), 1);

        const { data: poolToClose, error: findError } = await supabase
            .from('reward_pool_balances')
            .select('*')
            .eq('status', 'collecting')
            .lte('period_start', periodStart.toISOString().split('T')[0])
            .order('period_start', { ascending: false })
            .limit(1)
            .single();

        if (findError || !poolToClose) {
            log.info('No pool found to distribute for previous month');

            // Still ensure current month pool exists
            await supabase.rpc('get_or_create_current_pool');

            return new Response(
                JSON.stringify({
                    success: true,
                    message: 'No pool to distribute',
                    current_pool_ensured: true,
                }),
                {
                    status: 200,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                }
            );
        }

        log.info('Found pool to distribute:', {
            pool_id: poolToClose.id,
            period: `${poolToClose.period_start} to ${poolToClose.period_end}`,
            total_collected: poolToClose.total_collected,
        });

        // ========================================
        // 2. DISTRIBUTE TO OWNERS (with eligibility gate)
        // ========================================

        const { data: payouts, error: distributeError } = await supabase
            .rpc('distribute_monthly_rewards_with_eligibility', { p_pool_id: poolToClose.id });

        if (distributeError) {
            log.error('Error distributing rewards:', distributeError);
            throw distributeError;
        }

        const payoutList = payouts as PoolPayout[] || [];
        const eligiblePayouts = payoutList.filter(p => !p.was_frozen && p.amount > 0);
        const frozenPayouts = payoutList.filter(p => p.was_frozen);
        const skippedPayouts = payoutList.filter(p => !p.was_frozen && p.amount === 0);

        log.info('Distribution calculated (with eligibility):', {
            pool_id: poolToClose.id,
            total_owners: payoutList.length,
            eligible_owners: eligiblePayouts.length,
            frozen_owners: frozenPayouts.length,
            skipped_ineligible: skippedPayouts.length,
            total_collected: poolToClose.total_collected,
        });

        if (frozenPayouts.length > 0) {
            log.warn('Frozen payouts requiring admin review:', {
                count: frozenPayouts.length,
                owners: frozenPayouts.map(p => ({
                    owner_id: p.owner_id,
                    amount: p.amount,
                    reason: p.freeze_reason,
                })),
            });
        }

        // ========================================
        // 3. ENSURE CURRENT MONTH POOL EXISTS
        // ========================================

        const { data: currentPoolId, error: poolError } = await supabase
            .rpc('get_or_create_current_pool');

        if (poolError) {
            log.error('Error creating current pool:', poolError);
        } else {
            log.info('Current month pool ready:', currentPoolId);
        }

        // ========================================
        // 4. SEND NOTIFICATIONS TO OWNERS
        // ========================================

        // Notify eligible owners with payouts
        for (const payout of eligiblePayouts) {
            try {
                await supabase.from('notifications').insert({
                    user_id: payout.owner_id,
                    type: 'reward_payout',
                    title: 'Pago de Reward Pool',
                    description: `Recibiste $${payout.amount.toFixed(2)} del Reward Pool de ${poolToClose.period_start}`,
                    metadata: {
                        pool_id: poolToClose.id,
                        amount: payout.amount,
                        share_percentage: payout.share_percentage,
                        period: `${poolToClose.period_start} - ${poolToClose.period_end}`,
                    },
                    is_read: false,
                    created_at: new Date().toISOString(),
                });
            } catch (notifyErr) {
                log.warn('Failed to notify owner:', { owner_id: payout.owner_id, error: notifyErr });
            }
        }

        // Notify frozen owners (transparent — they know payout is under review)
        for (const payout of frozenPayouts) {
            try {
                await supabase.from('notifications').insert({
                    user_id: payout.owner_id,
                    type: 'reward_payout_review',
                    title: 'Pago en revisión',
                    description: `Tu pago de $${payout.amount.toFixed(2)} del Reward Pool está en revisión. Te notificaremos cuando se resuelva.`,
                    metadata: {
                        pool_id: poolToClose.id,
                        amount: payout.amount,
                        reason: payout.freeze_reason,
                        period: `${poolToClose.period_start} - ${poolToClose.period_end}`,
                    },
                    is_read: false,
                    created_at: new Date().toISOString(),
                });
            } catch (notifyErr) {
                log.warn('Failed to notify frozen owner:', { owner_id: payout.owner_id, error: notifyErr });
            }
        }

        // ========================================
        // 5. RETURN SUMMARY
        // ========================================

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Monthly rewards distributed with eligibility gate',
                distributed_pool: {
                    id: poolToClose.id,
                    period: `${poolToClose.period_start} to ${poolToClose.period_end}`,
                    total_collected: poolToClose.total_collected,
                },
                payouts: {
                    total: payoutList.length,
                    eligible: eligiblePayouts.length,
                    frozen: frozenPayouts.length,
                    skipped: skippedPayouts.length,
                    owners: eligiblePayouts.map(p => ({
                        owner_id: p.owner_id,
                        amount: p.amount,
                        share: `${(p.share_percentage).toFixed(2)}%`,
                    })),
                    frozen_owners: frozenPayouts.map(p => ({
                        owner_id: p.owner_id,
                        amount: p.amount,
                        reason: p.freeze_reason,
                    })),
                },
                current_pool_id: currentPoolId,
            }),
            {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        );

    } catch (error: any) {
        log.error('Error in monthly distribution:', error);

        return new Response(
            JSON.stringify({
                success: false,
                error: error.message || 'Unknown error',
            }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        );
    }
});
