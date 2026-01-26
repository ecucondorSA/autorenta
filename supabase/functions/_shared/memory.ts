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
}
