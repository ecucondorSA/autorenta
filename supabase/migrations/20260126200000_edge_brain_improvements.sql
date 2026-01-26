-- Edge Brain Tier 8 Improvements: Rate Limiting + Merge Tracking
-- Migration: Add columns for PR outcome tracking and rate limiting

-- Add PR outcome tracking columns
ALTER TABLE IF EXISTS public.edge_brain_memory
ADD COLUMN IF NOT EXISTS pr_outcome TEXT CHECK (pr_outcome IN ('merged', 'closed', NULL)),
ADD COLUMN IF NOT EXISTS pr_outcome_at TIMESTAMPTZ;

-- Add index for rate limiting queries
CREATE INDEX IF NOT EXISTS idx_edge_brain_memory_created_at 
ON public.edge_brain_memory(created_at DESC)
WHERE pr_created = true;

-- Add index for file cooldown queries
CREATE INDEX IF NOT EXISTS idx_edge_brain_memory_file_cooldown
ON public.edge_brain_memory(file_path, created_at DESC)
WHERE pr_created = true;

-- Add index for strategy success rate queries
CREATE INDEX IF NOT EXISTS idx_edge_brain_memory_strategy_outcome
ON public.edge_brain_memory(strategy_used, error_type, pr_outcome)
WHERE pr_created = true;

-- Create view for strategy performance with merge tracking
CREATE OR REPLACE VIEW public.edge_brain_strategy_performance AS
SELECT 
    strategy_used,
    error_type,
    COUNT(*) as total_attempts,
    COUNT(*) FILTER (WHERE pr_created = true) as prs_created,
    COUNT(*) FILTER (WHERE pr_outcome = 'merged') as prs_merged,
    COUNT(*) FILTER (WHERE pr_outcome = 'closed') as prs_closed,
    ROUND(
        (COUNT(*) FILTER (WHERE pr_outcome = 'merged')::NUMERIC / 
         NULLIF(COUNT(*) FILTER (WHERE pr_created = true), 0)) * 100, 
        1
    ) as merge_rate_percent,
    ROUND(AVG(execution_time_ms)::NUMERIC, 0) as avg_execution_time_ms,
    ROUND(AVG(fix_confidence)::NUMERIC, 2) as avg_confidence
FROM public.edge_brain_memory
GROUP BY strategy_used, error_type
ORDER BY merge_rate_percent DESC NULLS LAST;

COMMENT ON VIEW public.edge_brain_strategy_performance IS 
'Edge Brain Tier 8: Strategy performance with actual merge tracking';
