-- Edison Outreach Tracking Tables
-- Tracks Facebook posts, comments, DMs and prospects

-- =============================================
-- Facebook Posts Log
-- Tracks all posts, comments, and DMs sent
-- =============================================

CREATE TABLE IF NOT EXISTS public.fb_posts_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_type TEXT NOT NULL CHECK (post_type IN ('post', 'comment', 'dm')),
    group_url TEXT,
    post_content TEXT NOT NULL,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    screenshot_url TEXT,
    posted_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for daily stats queries
CREATE INDEX IF NOT EXISTS idx_fb_posts_log_posted_at ON public.fb_posts_log(posted_at);
CREATE INDEX IF NOT EXISTS idx_fb_posts_log_post_type ON public.fb_posts_log(post_type);

-- RLS
ALTER TABLE public.fb_posts_log ENABLE ROW LEVEL SECURITY;

-- Only service role can access (for backend scripts)
CREATE POLICY "Service role can do everything on fb_posts_log"
    ON public.fb_posts_log
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');


-- =============================================
-- Facebook Prospects
-- Car owners found in groups
-- =============================================

CREATE TABLE IF NOT EXISTS public.fb_prospects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facebook_user_id TEXT,
    facebook_name TEXT,
    source_group TEXT,
    source_post_url TEXT UNIQUE,
    car_brand TEXT,
    car_model TEXT,
    car_year INT,
    photos_count INT DEFAULT 0,
    status TEXT DEFAULT 'new' CHECK (status IN (
        'new',
        'commented',
        'dm_sent',
        'responded',
        'interested',
        'converted',
        'not_interested'
    )),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    contacted_at TIMESTAMPTZ,
    responded_at TIMESTAMPTZ,
    converted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fb_prospects_status ON public.fb_prospects(status);
CREATE INDEX IF NOT EXISTS idx_fb_prospects_created_at ON public.fb_prospects(created_at);
CREATE INDEX IF NOT EXISTS idx_fb_prospects_car_brand ON public.fb_prospects(car_brand);

-- RLS
ALTER TABLE public.fb_prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can do everything on fb_prospects"
    ON public.fb_prospects
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');


-- =============================================
-- Views for monitoring
-- =============================================

-- Daily outreach summary
CREATE OR REPLACE VIEW public.v_outreach_daily_summary AS
SELECT
    DATE(posted_at) as date,
    COUNT(*) FILTER (WHERE post_type = 'post') as fb_posts,
    COUNT(*) FILTER (WHERE post_type = 'comment') as fb_comments,
    COUNT(*) FILTER (WHERE post_type = 'dm') as fb_dms,
    COUNT(*) FILTER (WHERE success = true) as successful,
    COUNT(*) FILTER (WHERE success = false) as failed
FROM public.fb_posts_log
WHERE posted_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(posted_at)
ORDER BY date DESC;

-- Prospect funnel
CREATE OR REPLACE VIEW public.v_prospect_funnel AS
SELECT
    status,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / NULLIF(SUM(COUNT(*)) OVER (), 0), 1) as percentage
FROM public.fb_prospects
GROUP BY status
ORDER BY
    CASE status
        WHEN 'new' THEN 1
        WHEN 'commented' THEN 2
        WHEN 'dm_sent' THEN 3
        WHEN 'responded' THEN 4
        WHEN 'interested' THEN 5
        WHEN 'converted' THEN 6
        WHEN 'not_interested' THEN 7
        ELSE 99
    END;

-- Recent prospects
CREATE OR REPLACE VIEW public.v_recent_prospects AS
SELECT
    id,
    facebook_name,
    car_brand,
    car_year,
    source_group,
    status,
    created_at,
    contacted_at
FROM public.fb_prospects
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 50;


-- =============================================
-- Link to outreach_contacts (if exists)
-- =============================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'outreach_contacts') THEN
        -- Add column to link FB prospects to WhatsApp contacts
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'outreach_contacts' AND column_name = 'fb_prospect_id'
        ) THEN
            ALTER TABLE public.outreach_contacts
            ADD COLUMN fb_prospect_id UUID REFERENCES public.fb_prospects(id);
        END IF;
    END IF;
END $$;


-- =============================================
-- Comments
-- =============================================

COMMENT ON TABLE public.fb_posts_log IS 'Tracks all Facebook outreach actions (posts, comments, DMs) by Edison agent';
COMMENT ON TABLE public.fb_prospects IS 'Car owners found in Facebook groups, potential leads for Autorentar';
COMMENT ON VIEW public.v_outreach_daily_summary IS 'Daily summary of outreach activity';
COMMENT ON VIEW public.v_prospect_funnel IS 'Funnel metrics for Facebook prospects';
