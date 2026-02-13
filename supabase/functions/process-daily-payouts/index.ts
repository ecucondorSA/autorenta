/**
 * @fileoverview Edge Function: process-daily-payouts
 * @version 1.0
 * @created 2026-02-02
 *
 * Cron job diario que procesa payouts pendientes del Reward Pool.
 * Ejecuta transferencias a owners via MercadoPago Money Out.
 *
 * Frecuencia: Daily 06:00 UTC
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { createChildLogger } from '../_shared/logger.ts';

const log = createChildLogger('ProcessDailyPayouts');

interface PendingPayout {
    id: string;
    pool_id: string;
    owner_id: string;
    amount: number;
    share_percentage: number;
    payout_status: string;
    created_at: string;
}

interface OwnerBankInfo {
    id: string;
    bank_account_id: string | null;
    mercadopago_collector_id: string | null;
    email: string;
    first_name: string;
}

interface ProcessResult {
    payout_id: string;
    owner_id: string;
    amount: number;
    status: 'success' | 'failed' | 'skipped';
    error?: string;
}

serve(async (req: Request) => {
    const corsHeaders = getCorsHeaders(req);

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    const startTime = Date.now();
    const results: ProcessResult[] = [];

    try {
        log.info('🚀 Starting daily payout processing...');

        const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
        const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

        // ========================================
        // 1. GET PENDING PAYOUTS
        // ========================================

        const { data: pendingPayouts, error: fetchError } = await supabase
            .from('reward_pool_payouts')
            .select('*')
            .eq('payout_status', 'pending')
            .order('created_at', { ascending: true })
            .limit(100); // Process max 100 per run for safety

        if (fetchError) {
            log.error('Error fetching pending payouts:', fetchError);
            throw fetchError;
        }

        if (!pendingPayouts || pendingPayouts.length === 0) {
            log.info('✅ No pending payouts to process');
            return new Response(
                JSON.stringify({
                    success: true,
                    message: 'No pending payouts',
                    processed: 0,
                    duration_ms: Date.now() - startTime,
                }),
                {
                    status: 200,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                }
            );
        }

        log.info(`Found ${pendingPayouts.length} pending payouts to process`);

        // ========================================
        // 2. PROCESS EACH PAYOUT
        // ========================================

        for (const payout of pendingPayouts as PendingPayout[]) {
            try {
                // Mark as processing
                await supabase
                    .from('reward_pool_payouts')
                    .update({ payout_status: 'processing' })
                    .eq('id', payout.id);

                // Get owner bank info
                const { data: owner, error: ownerError } = await supabase
                    .from('profiles')
                    .select('id, bank_account_id, mercadopago_collector_id, email, first_name')
                    .eq('id', payout.owner_id)
                    .single();

                if (ownerError || !owner) {
                    throw new Error(`Owner not found: ${payout.owner_id}`);
                }

                // Check if owner has payment method configured
                if (!owner.mercadopago_collector_id && !owner.bank_account_id) {
                    log.warn(`Owner ${payout.owner_id} has no payment method configured`);

                    await supabase
                        .from('reward_pool_payouts')
                        .update({
                            payout_status: 'pending', // Keep pending until configured
                            error_message: 'No payment method configured',
                        })
                        .eq('id', payout.id);

                    results.push({
                        payout_id: payout.id,
                        owner_id: payout.owner_id,
                        amount: payout.amount,
                        status: 'skipped',
                        error: 'No payment method configured',
                    });
                    continue;
                }

                // ========================================
                // 3. CALL MONEY OUT API
                // ========================================

                // Create withdrawal request record
                const { data: withdrawal, error: withdrawalError } = await supabase
                    .from('withdrawal_requests')
                    .insert({
                        user_id: payout.owner_id,
                        amount: payout.amount,
                        fee_amount: 0, // No fee for reward pool payouts
                        net_amount: payout.amount,
                        currency: 'ARS',
                        status: 'pending',
                        source: 'reward_pool',
                        source_id: payout.id,
                    })
                    .select()
                    .single();

                if (withdrawalError) {
                    throw new Error(`Failed to create withdrawal: ${withdrawalError.message}`);
                }

                // Call money-out function
                const moneyOutResponse = await fetch(
                    `${SUPABASE_URL}/functions/v1/mercadopago-money-out`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            withdrawal_request_id: withdrawal.id,
                        }),
                    }
                );

                const moneyOutResult = await moneyOutResponse.json();

                if (!moneyOutResponse.ok || !moneyOutResult.success) {
                    throw new Error(moneyOutResult.error || 'Money out failed');
                }

                // ========================================
                // 4. UPDATE PAYOUT STATUS
                // ========================================

                await supabase
                    .from('reward_pool_payouts')
                    .update({
                        payout_status: 'completed',
                        mercadopago_payout_id: moneyOutResult.transfer_id,
                        paid_at: new Date().toISOString(),
                        error_message: null,
                    })
                    .eq('id', payout.id);

                // Send notification to owner
                await supabase.from('notifications').insert({
                    user_id: payout.owner_id,
                    type: 'payout_completed',
                    title: '💰 Pago recibido',
                    description: `Recibiste $${payout.amount.toFixed(2)} ARS del Reward Pool`,
                    is_read: false,
                });

                log.info(`✅ Payout ${payout.id} completed: $${payout.amount} to ${owner.email}`);

                results.push({
                    payout_id: payout.id,
                    owner_id: payout.owner_id,
                    amount: payout.amount,
                    status: 'success',
                });

            } catch (payoutError: any) {
                log.error(`❌ Failed to process payout ${payout.id}:`, payoutError);

                // Mark as failed
                await supabase
                    .from('reward_pool_payouts')
                    .update({
                        payout_status: 'failed',
                        error_message: payoutError.message || 'Unknown error',
                    })
                    .eq('id', payout.id);

                results.push({
                    payout_id: payout.id,
                    owner_id: payout.owner_id,
                    amount: payout.amount,
                    status: 'failed',
                    error: payoutError.message,
                });
            }

            // Rate limit: wait 500ms between payouts
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // ========================================
        // 5. CLOSE DISTRIBUTING POOLS
        // ========================================

        // Mark pools as closed if all payouts are processed
        const { data: distributingPools } = await supabase
            .from('reward_pool_balances')
            .select('id')
            .eq('status', 'distributing');

        for (const pool of distributingPools || []) {
            const { data: pendingInPool } = await supabase
                .from('reward_pool_payouts')
                .select('id')
                .eq('pool_id', pool.id)
                .in('payout_status', ['pending', 'processing'])
                .limit(1);

            if (!pendingInPool || pendingInPool.length === 0) {
                await supabase
                    .from('reward_pool_balances')
                    .update({ status: 'closed' })
                    .eq('id', pool.id);

                log.info(`Pool ${pool.id} closed - all payouts completed`);
            }
        }

        // ========================================
        // 6. RETURN SUMMARY
        // ========================================

        const successful = results.filter(r => r.status === 'success').length;
        const failed = results.filter(r => r.status === 'failed').length;
        const skipped = results.filter(r => r.status === 'skipped').length;

        const summary = {
            success: true,
            processed: results.length,
            successful,
            failed,
            skipped,
            total_amount: results
                .filter(r => r.status === 'success')
                .reduce((sum, r) => sum + r.amount, 0),
            duration_ms: Date.now() - startTime,
            results,
        };

        log.info('📊 Daily payout processing complete:', summary);

        return new Response(JSON.stringify(summary), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        log.error('Fatal error in process-daily-payouts:', error);

        return new Response(
            JSON.stringify({
                success: false,
                error: 'Unknown error',
                duration_ms: Date.now() - startTime,
                partial_results: results,
            }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        );
    }
});
