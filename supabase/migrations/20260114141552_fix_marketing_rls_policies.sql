-- ============================================================================
-- Fix Marketing RLS Policies
-- Date: 2026-01-14
-- Description:
--   Add RLS policies to allow authenticated admin users to access
--   marketing_content_queue and marketing_posts_log tables.
-- ============================================================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Service role only - queue" ON marketing_content_queue;
DROP POLICY IF EXISTS "Service role only - posts" ON marketing_posts_log;

-- ===========================================
-- MARKETING CONTENT QUEUE POLICIES
-- ===========================================

-- Allow authenticated users to view all queue items
CREATE POLICY "Authenticated users can view queue"
  ON marketing_content_queue
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert into queue
CREATE POLICY "Authenticated users can insert queue"
  ON marketing_content_queue
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update queue items
CREATE POLICY "Authenticated users can update queue"
  ON marketing_content_queue
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete queue items
CREATE POLICY "Authenticated users can delete queue"
  ON marketing_content_queue
  FOR DELETE
  TO authenticated
  USING (true);

-- Service role has full access
CREATE POLICY "Service role full access - queue"
  ON marketing_content_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ===========================================
-- MARKETING POSTS LOG POLICIES
-- ===========================================

-- Allow authenticated users to view posts log
CREATE POLICY "Authenticated users can view posts log"
  ON marketing_posts_log
  FOR SELECT
  TO authenticated
  USING (true);

-- Service role can insert/update posts log
CREATE POLICY "Service role full access - posts log"
  ON marketing_posts_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ===========================================
-- SOCIAL MEDIA CREDENTIALS POLICIES
-- ===========================================

-- Keep credentials restricted to service role only (sensitive data)
DROP POLICY IF EXISTS "Service role only - credentials" ON social_media_credentials;

CREATE POLICY "Service role full access - credentials"
  ON social_media_credentials
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ===========================================
-- GRANTS
-- ===========================================

-- Grant usage on sequences if any
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant access to tables
GRANT SELECT, INSERT, UPDATE, DELETE ON marketing_content_queue TO authenticated;
GRANT SELECT ON marketing_posts_log TO authenticated;

-- ===========================================
-- MIGRATION COMPLETE
-- ===========================================
DO $$ BEGIN
  RAISE NOTICE 'Marketing RLS policies updated successfully';
END $$;
