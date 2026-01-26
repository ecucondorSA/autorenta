/**
 * Edge Brain Tier 7: Memory & Learning Module
 * 
 * Handles logging fix attempts to Supabase and querying historical success rates
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

export interface FixAttempt {
    error_type: 'lint' | 'compile' | 'test' | 'runtime';
    error_message: string;
    file_path?: string;
    file_pattern?: string;
    strategy_used: string;
    model_used: string;
    temperature?: number;
    patches_count?: number;
    lines_changed?: number;
    change_percentage?: number;
    pr_number?: number;
    pr_url?: string;
    pr_created: boolean;
    safety_check_passed: boolean;
    safety_rejection_reason?: string;
    fix_confidence?: number;
    execution_time_ms?: number;
    base_branch?: string;
    fix_branch?: string;
    workflow_run_id?: number;
    job_id?: number;
}

export interface StrategyStats {
    strategy_used: string;
    error_type: string;
    total_attempts: number;
    prs_created: number;
    prs_merged: number;
    success_rate_percent: number;
    avg_execution_time_ms: number;
    avg_confidence: number;
}

export class EdgeBrainMemory {
    private supabase;

    constructor(supabaseUrl: string, supabaseKey: string) {
        this.supabase = createClient(supabaseUrl, supabaseKey);
    }

    /**
     * Log a fix attempt to the database
     */
    async logAttempt(attempt: FixAttempt): Promise<void> {
        try {
            // Extract file pattern from file path (e.g. "*.component.ts")
            const filePattern = attempt.file_path ? this.extractFilePattern(attempt.file_path) : null;

            const { error } = await this.supabase
                .from('edge_brain_memory')
                .insert({
                    ...attempt,
                    file_pattern: filePattern
                });

            if (error) {
                console.error('[EdgeBrainMemory] Failed to log attempt:', error);
            } else {
                console.log('[EdgeBrainMemory] ✅ Logged attempt:', {
                    strategy: attempt.strategy_used,
                    error_type: attempt.error_type,
                    pr_created: attempt.pr_created
                });
            }
        } catch (e) {
            console.error('[EdgeBrainMemory] Exception logging attempt:', e);
        }
    }

    /**
     * Get success rate statistics for a specific error type
     */
    async getStrategyStats(errorType: 'lint' | 'compile' | 'test' | 'runtime'): Promise<StrategyStats[]> {
        try {
            const { data, error } = await this.supabase
                .from('edge_brain_strategy_stats')
                .select('*')
                .eq('error_type', errorType)
                .order('success_rate_percent', { ascending: false });

            if (error) {
                console.error('[EdgeBrainMemory] Failed to get stats:', error);
                return [];
            }

            return data || [];
        } catch (e) {
            console.error('[EdgeBrainMemory] Exception getting stats:', e);
            return [];
        }
    }

    /**
     * Get the best strategy for a given error type based on historical success
     */
    async getBestStrategy(errorType: 'lint' | 'compile' | 'test' | 'runtime'): Promise<string | null> {
        const stats = await this.getStrategyStats(errorType);

        if (stats.length === 0) {
            return null; // No historical data, use default
        }

        // Filter strategies with at least 3 attempts (statistical significance)
        const significantStats = stats.filter(s => s.total_attempts >= 3);

        if (significantStats.length === 0) {
            return null;
        }

        // Return strategy with highest success rate
        return significantStats[0].strategy_used;
    }

    /**
     * Extract file pattern from file path
     * Examples:
     * - "apps/web/src/app/foo.component.ts" -> "*.component.ts"
     * - "apps/web/src/app/services/bar.service.ts" -> "*.service.ts"
     */
    private extractFilePattern(filePath: string): string {
        const fileName = filePath.split('/').pop() || '';

        // Match common patterns
        if (fileName.endsWith('.component.ts')) return '*.component.ts';
        if (fileName.endsWith('.service.ts')) return '*.service.ts';
        if (fileName.endsWith('.module.ts')) return '*.module.ts';
        if (fileName.endsWith('.spec.ts')) return '*.spec.ts';
        if (fileName.endsWith('.guard.ts')) return '*.guard.ts';
        if (fileName.endsWith('.interceptor.ts')) return '*.interceptor.ts';

        // Generic extension pattern
        const ext = fileName.split('.').slice(-2).join('.'); // e.g. "component.ts"
        return `*.${ext}`;
    }

    // ============================================================
    // RATE LIMITING
    // ============================================================

    /**
     * Check if we can create a new PR based on rate limits
     * RATE LIMITING: Max 5 PRs/hour, 20 PRs/day
     */
    async canCreatePR(): Promise<{ allowed: boolean; reason?: string; waitMinutes?: number }> {
        try {
            const now = new Date();
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
            const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

            // Count PRs in last hour
            const { count: hourCount } = await this.supabase
                .from('edge_brain_memory')
                .select('*', { count: 'exact', head: true })
                .eq('pr_created', true)
                .gte('created_at', oneHourAgo.toISOString());

            const MAX_PER_HOUR = 5;
            if ((hourCount || 0) >= MAX_PER_HOUR) {
                return {
                    allowed: false,
                    reason: `Rate limit: ${hourCount} PRs created in last hour (max ${MAX_PER_HOUR})`,
                    waitMinutes: 60
                };
            }

            // Count PRs in last day
            const { count: dayCount } = await this.supabase
                .from('edge_brain_memory')
                .select('*', { count: 'exact', head: true })
                .eq('pr_created', true)
                .gte('created_at', oneDayAgo.toISOString());

            const MAX_PER_DAY = 20;
            if ((dayCount || 0) >= MAX_PER_DAY) {
                return {
                    allowed: false,
                    reason: `Rate limit: ${dayCount} PRs created in last 24h (max ${MAX_PER_DAY})`,
                    waitMinutes: 60 * 24
                };
            }

            return { allowed: true };
        } catch (e) {
            console.error('[EdgeBrainMemory] Rate limit check failed:', e);
            return { allowed: true }; // Fail open
        }
    }

    /**
     * Check cooldown for a specific file
     * COOLDOWN: 30 minutes between PRs for the same file
     */
    async hasFileCooldown(filePath: string): Promise<{ onCooldown: boolean; minutesRemaining?: number }> {
        try {
            const cooldownMinutes = 30;
            const cooldownTime = new Date(Date.now() - cooldownMinutes * 60 * 1000);

            const { data } = await this.supabase
                .from('edge_brain_memory')
                .select('created_at')
                .eq('file_path', filePath)
                .eq('pr_created', true)
                .gte('created_at', cooldownTime.toISOString())
                .order('created_at', { ascending: false })
                .limit(1);

            if (data && data.length > 0) {
                const lastPRTime = new Date(data[0].created_at);
                const minutesRemaining = Math.ceil(
                    (cooldownMinutes * 60 * 1000 - (Date.now() - lastPRTime.getTime())) / 60000
                );
                return { onCooldown: true, minutesRemaining };
            }

            return { onCooldown: false };
        } catch (e) {
            console.error('[EdgeBrainMemory] Cooldown check failed:', e);
            return { onCooldown: false };
        }
    }

    // ============================================================
    // MERGE TRACKING
    // ============================================================

    /**
     * Update PR outcome (merged or closed)
     * LEARNING: Track actual outcomes to improve strategy selection
     */
    async updatePROutcome(prNumber: number, outcome: 'merged' | 'closed'): Promise<void> {
        try {
            const { error } = await this.supabase
                .from('edge_brain_memory')
                .update({
                    pr_outcome: outcome,
                    pr_outcome_at: new Date().toISOString()
                })
                .eq('pr_number', prNumber);

            if (error) {
                console.error('[EdgeBrainMemory] Failed to update PR outcome:', error);
            } else {
                console.log(`[EdgeBrainMemory] ✅ Updated PR #${prNumber} outcome: ${outcome}`);
            }
        } catch (e) {
            console.error('[EdgeBrainMemory] Exception updating PR outcome:', e);
        }
    }

    /**
     * Get success rate for a strategy (based on actual merges, not just PR creation)
     * LEARNING: Real success = PR was merged
     */
    async getRealSuccessRate(strategyName: string, errorType: string): Promise<number | null> {
        try {
            const { data } = await this.supabase
                .from('edge_brain_memory')
                .select('pr_outcome')
                .eq('strategy_used', strategyName)
                .eq('error_type', errorType)
                .eq('pr_created', true)
                .not('pr_outcome', 'is', null);

            if (!data || data.length < 3) return null; // Not enough data

            const merged = data.filter(d => d.pr_outcome === 'merged').length;
            return (merged / data.length) * 100;
        } catch (e) {
            console.error('[EdgeBrainMemory] Failed to get real success rate:', e);
            return null;
        }
    }

    /**
     * Check if a strategy has a poor track record and should be avoided
     * LEARNING: Skip strategies with <20% merge rate
     */
    async isStrategyBlacklisted(strategyName: string, errorType: string): Promise<boolean> {
        const successRate = await this.getRealSuccessRate(strategyName, errorType);

        if (successRate === null) return false; // Not enough data

        const MIN_SUCCESS_RATE = 20; // 20% merge rate minimum
        return successRate < MIN_SUCCESS_RATE;
    }
}
