-- ============================================================================
-- Marketing Automation Tables
-- Date: 2026-01-12
-- Description:
--   Tables for automated social media marketing system.
--   - marketing_content_queue: Queue of pending/scheduled posts
--   - marketing_posts_log: Log of published posts with engagement
--   - social_media_credentials: OAuth tokens for each platform
-- ============================================================================

-- ===========================================
-- 1. MARKETING CONTENT QUEUE
-- ===========================================
-- Queue for scheduled social media posts
CREATE TABLE IF NOT EXISTS public.marketing_content_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Content details
  content_type VARCHAR(50) NOT NULL, -- 'tip', 'promo', 'car_spotlight', 'testimonial', 'seasonal'
  platform VARCHAR(20) NOT NULL,     -- 'tiktok', 'instagram', 'facebook', 'twitter'
  text_content TEXT NOT NULL,
  media_url TEXT,                    -- URL of generated/uploaded image
  media_type VARCHAR(20),            -- 'image', 'video'
  hashtags TEXT[],
  call_to_action TEXT,

  -- Scheduling
  scheduled_for TIMESTAMPTZ NOT NULL,

  -- Status tracking
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'published', 'failed', 'cancelled'
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,

  -- Error handling
  error_message TEXT,
  last_error_at TIMESTAMPTZ,

  -- Metadata (car_id, campaign_id, etc.)
  metadata JSONB DEFAULT '{}'
);

-- Indexes for queue processing
CREATE INDEX IF NOT EXISTS idx_marketing_queue_status_scheduled
  ON marketing_content_queue(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_marketing_queue_platform
  ON marketing_content_queue(platform);
CREATE INDEX IF NOT EXISTS idx_marketing_queue_created
  ON marketing_content_queue(created_at DESC);

-- ===========================================
-- 2. MARKETING POSTS LOG
-- ===========================================
-- Log of all published posts with engagement metrics
CREATE TABLE IF NOT EXISTS public.marketing_posts_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID REFERENCES marketing_content_queue(id),

  -- Platform details
  platform VARCHAR(20) NOT NULL,
  post_id VARCHAR(255),              -- ID returned by the platform
  post_url TEXT,                     -- Direct URL to the post

  -- Content snapshot
  content_type VARCHAR(50),
  text_content TEXT,
  media_url TEXT,
  hashtags TEXT[],

  -- Engagement metrics (updated periodically)
  engagement JSONB DEFAULT '{}',     -- {likes, shares, comments, views, saves, reach}
  engagement_updated_at TIMESTAMPTZ,

  -- Timestamps
  published_at TIMESTAMPTZ DEFAULT NOW(),

  -- Metadata
  metadata JSONB DEFAULT '{}'
);

-- Indexes for analytics
CREATE INDEX IF NOT EXISTS idx_marketing_posts_platform_date
  ON marketing_posts_log(platform, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_posts_content_type
  ON marketing_posts_log(content_type);
CREATE INDEX IF NOT EXISTS idx_marketing_posts_engagement
  ON marketing_posts_log USING GIN (engagement);

-- ===========================================
-- 3. SOCIAL MEDIA CREDENTIALS
-- ===========================================
-- OAuth tokens and credentials for each platform
CREATE TABLE IF NOT EXISTS public.social_media_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Platform identification
  platform VARCHAR(20) NOT NULL UNIQUE, -- 'tiktok', 'instagram', 'facebook', 'twitter'
  account_name VARCHAR(255),            -- Display name (e.g., @autorentar)
  account_id VARCHAR(255),              -- Platform-specific account ID

  -- OAuth tokens (encrypted in production via Vault)
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type VARCHAR(50) DEFAULT 'Bearer',
  token_expires_at TIMESTAMPTZ,

  -- Platform-specific IDs
  page_id VARCHAR(255),                 -- Facebook/Instagram Page ID
  business_id VARCHAR(255),             -- Business account ID

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  last_error TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Additional config
  metadata JSONB DEFAULT '{}'
);

-- Unique constraint on platform
CREATE UNIQUE INDEX IF NOT EXISTS idx_social_media_credentials_platform
  ON social_media_credentials(platform);

-- ===========================================
-- 4. ROW LEVEL SECURITY
-- ===========================================

-- Enable RLS on all tables
ALTER TABLE marketing_content_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_posts_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_media_credentials ENABLE ROW LEVEL SECURITY;

-- Marketing queue: Only service role can access (backend only)
CREATE POLICY "Service role only - queue" ON marketing_content_queue
  FOR ALL TO service_role USING (true);

-- Posts log: Only service role can access
CREATE POLICY "Service role only - posts" ON marketing_posts_log
  FOR ALL TO service_role USING (true);

-- Credentials: Only service role can access (highly sensitive)
CREATE POLICY "Service role only - credentials" ON social_media_credentials
  FOR ALL TO service_role USING (true);

-- ===========================================
-- 5. HELPER FUNCTIONS
-- ===========================================

-- Function to get next pending posts to publish
CREATE OR REPLACE FUNCTION get_pending_marketing_posts(max_posts INT DEFAULT 10)
RETURNS SETOF marketing_content_queue
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM marketing_content_queue
  WHERE status = 'pending'
    AND scheduled_for <= NOW()
    AND attempts < max_attempts
  ORDER BY scheduled_for ASC
  LIMIT max_posts
  FOR UPDATE SKIP LOCKED;
END;
$$;

-- Function to update post status after publishing
CREATE OR REPLACE FUNCTION mark_marketing_post_published(
  p_queue_id UUID,
  p_post_id VARCHAR(255),
  p_post_url TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_queue_record marketing_content_queue;
BEGIN
  -- Update queue status
  UPDATE marketing_content_queue
  SET
    status = 'published',
    published_at = NOW()
  WHERE id = p_queue_id
  RETURNING * INTO v_queue_record;

  -- Insert into posts log
  INSERT INTO marketing_posts_log (
    queue_id,
    platform,
    post_id,
    post_url,
    content_type,
    text_content,
    media_url,
    hashtags,
    metadata
  )
  VALUES (
    p_queue_id,
    v_queue_record.platform,
    p_post_id,
    p_post_url,
    v_queue_record.content_type,
    v_queue_record.text_content,
    v_queue_record.media_url,
    v_queue_record.hashtags,
    v_queue_record.metadata
  );
END;
$$;

-- Function to mark post as failed
CREATE OR REPLACE FUNCTION mark_marketing_post_failed(
  p_queue_id UUID,
  p_error_message TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE marketing_content_queue
  SET
    attempts = attempts + 1,
    last_error_at = NOW(),
    error_message = p_error_message,
    status = CASE
      WHEN attempts + 1 >= max_attempts THEN 'failed'
      ELSE 'pending'
    END
  WHERE id = p_queue_id;
END;
$$;

-- ===========================================
-- MIGRATION COMPLETE
-- ===========================================
DO $$ BEGIN RAISE NOTICE 'Marketing automation tables created successfully'; END $$;
