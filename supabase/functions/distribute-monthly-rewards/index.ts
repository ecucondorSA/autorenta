/**
 * @fileoverview Edge Function: distribute-monthly-rewards
 * @version 1.0
 * @created 2026-02-02
 *
 * Cron job mensual para distribuir el Reward Pool a owners.
 * Se ejecuta el 1ro de cada mes a las 00:00 UTC.
 *
 * Flujo:
 * 1. Cierra el pool del mes anterior
 * 2. Calcula shares para cada owner basado en sus contribuciones
 * 3. Crea registros de payout en reward_pool_payouts
 * 4. Abre nuevo pool para el mes actual
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
        // 2. DISTRIBUTE TO OWNERS
        // ========================================

        const { data: payouts, error: distributeError } = await supabase
            .rpc('distribute_monthly_rewards', { p_pool_id: poolToClose.id });

        if (distributeError) {
            log.error('Error distributing rewards:', distributeError);
            throw distributeError;
        }

        const payoutList = payouts as PoolPayout[] || [];

        log.info('Distribution calculated:', {
            pool_id: poolToClose.id,
            total_owners: payoutList.length,
            total_distributed: poolToClose.total_collected,
        });

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

        for (const payout of payoutList) {
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

        // ========================================
        // 5. RETURN SUMMARY
        // ========================================

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Monthly rewards distributed successfully',
                distributed_pool: {
                    id: poolToClose.id,
                    period: `${poolToClose.period_start} to ${poolToClose.period_end}`,
                    total_collected: poolToClose.total_collected,
                },
                payouts: {
                    count: payoutList.length,
                    owners: payoutList.map(p => ({
                        owner_id: p.owner_id,
                        amount: p.amount,
                        share: `${(p.share_percentage * 100).toFixed(2)}%`,
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
