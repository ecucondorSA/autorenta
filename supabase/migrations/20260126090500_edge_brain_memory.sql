-- Edge Brain Tier 7: Learning Memory
-- Tracks fix attempts, strategies, and outcomes for continuous improvement

CREATE TABLE IF NOT EXISTS public.edge_brain_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Error Context
  error_type TEXT NOT NULL CHECK (error_type IN ('lint', 'compile', 'test', 'runtime')),
  error_message TEXT NOT NULL,
  file_path TEXT,
  file_pattern TEXT, -- e.g. '*.component.ts', '*.service.ts'
  
  -- Fix Attempt
  strategy_used TEXT NOT NULL,
  model_used TEXT NOT NULL,
  temperature REAL,
  
  -- Proposed Changes
  patches_count INTEGER DEFAULT 0,
  lines_changed INTEGER,
  change_percentage REAL,
  
  -- Outcome
  pr_number INTEGER,
  pr_url TEXT,
  pr_created BOOLEAN DEFAULT false,
  pr_merged BOOLEAN DEFAULT false,
  human_approved BOOLEAN, -- Manual tracking: did human merge it?
  
  -- Safety Validation
  safety_check_passed BOOLEAN,
  safety_rejection_reason TEXT,
  
  -- Metrics
  fix_confidence REAL CHECK (fix_confidence >= 0 AND fix_confidence <= 1),
  execution_time_ms INTEGER,
  
  -- Branch Info
  base_branch TEXT,
  fix_branch TEXT,
  
  -- GitHub Run Context
  workflow_run_id BIGINT,
  job_id BIGINT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_edge_brain_error_type ON public.edge_brain_memory(error_type);
CREATE INDEX IF NOT EXISTS idx_edge_brain_strategy ON public.edge_brain_memory(strategy_used);
CREATE INDEX IF NOT EXISTS idx_edge_brain_success ON public.edge_brain_memory(pr_created, pr_merged);
CREATE INDEX IF NOT EXISTS idx_edge_brain_created_at ON public.edge_brain_memory(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_edge_brain_file_pattern ON public.edge_brain_memory(file_pattern);

-- RLS Policies (Public read for analytics, service role write)
ALTER TABLE public.edge_brain_memory ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (Edge Functions use service role)
CREATE POLICY "Allow service role full access" ON public.edge_brain_memory
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow public read access for analytics/dashboards
CREATE POLICY "Allow public read access" ON public.edge_brain_memory
  FOR SELECT
  TO public
  USING (true);

-- Grant permissions
GRANT SELECT ON public.edge_brain_memory TO anon, authenticated, service_role;
GRANT INSERT, UPDATE ON public.edge_brain_memory TO service_role;

-- Helpful view: Success rate by strategy
CREATE OR REPLACE VIEW public.edge_brain_strategy_stats AS
SELECT 
  strategy_used,
  error_type,
  COUNT(*) as total_attempts,
  SUM(CASE WHEN pr_created THEN 1 ELSE 0 END) as prs_created,
  SUM(CASE WHEN pr_merged THEN 1 ELSE 0 END) as prs_merged,
  ROUND(
    (SUM(CASE WHEN pr_merged THEN 1 ELSE 0 END)::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
    2
  ) as success_rate_percent,
  AVG(execution_time_ms) as avg_execution_time_ms,
  AVG(fix_confidence) as avg_confidence
FROM public.edge_brain_memory
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY strategy_used, error_type
ORDER BY success_rate_percent DESC NULLS LAST;

-- Grant view access
GRANT SELECT ON public.edge_brain_strategy_stats TO anon, authenticated, service_role;

COMMENT ON TABLE public.edge_brain_memory IS 'Tracks Edge Brain Tier 7 fix attempts for continuous learning';
COMMENT ON VIEW public.edge_brain_strategy_stats IS 'Success rate statistics by strategy and error type (last 30 days)';
