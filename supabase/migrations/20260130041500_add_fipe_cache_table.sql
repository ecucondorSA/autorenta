-- ============================================================================
-- Migration: Add FIPE cache table
-- Purpose: Cache FIPE API responses to prevent rate limiting
-- ============================================================================

-- Create cache table
CREATE TABLE IF NOT EXISTS public.fipe_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT UNIQUE NOT NULL,
  data JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_fipe_cache_key ON public.fipe_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_fipe_cache_expires ON public.fipe_cache(expires_at);

-- Enable RLS
ALTER TABLE public.fipe_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role full access
CREATE POLICY "Service role full access on fipe_cache"
ON public.fipe_cache
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Allow anon to read (for edge function calls with anon key)
CREATE POLICY "Anon read access on fipe_cache"
ON public.fipe_cache
FOR SELECT
TO anon
USING (true);

-- Comment
COMMENT ON TABLE public.fipe_cache IS 'Cache for FIPE API responses to prevent rate limiting';

-- Function to cleanup expired cache entries (can be called by cron)
CREATE OR REPLACE FUNCTION public.cleanup_fipe_cache()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.fipe_cache WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_fipe_cache IS 'Removes expired cache entries from fipe_cache table';
