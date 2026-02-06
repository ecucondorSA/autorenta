-- Migration: Add Marketing Leads (TikTok Instant Forms)
-- Created: 2026-02-06

CREATE TABLE IF NOT EXISTS public.marketing_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'facebook', 'instagram', 'unknown')),
  lead_id TEXT,
  lead_type TEXT DEFAULT 'instant_form',
  form_id TEXT,
  ad_id TEXT,
  adgroup_id TEXT,
  campaign_id TEXT,
  advertiser_id TEXT,
  full_name TEXT,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  city TEXT,
  region TEXT,
  country TEXT,
  car_brand TEXT,
  car_model TEXT,
  car_year INT,
  has_car BOOLEAN,
  submitted_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'disqualified')),
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_marketing_leads_platform_lead_id
  ON public.marketing_leads(platform, lead_id)
  WHERE lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_marketing_leads_platform ON public.marketing_leads(platform);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_status ON public.marketing_leads(status);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_submitted_at ON public.marketing_leads(submitted_at);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_received_at ON public.marketing_leads(received_at);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_marketing_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_marketing_leads_updated_at ON public.marketing_leads;
CREATE TRIGGER update_marketing_leads_updated_at
  BEFORE UPDATE ON public.marketing_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_marketing_leads_updated_at();

-- RLS
ALTER TABLE public.marketing_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to marketing_leads"
  ON public.marketing_leads
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admin full access to marketing_leads"
  ON public.marketing_leads
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Link to outreach_contacts (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'outreach_contacts') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'outreach_contacts' AND column_name = 'tiktok_lead_id'
    ) THEN
      ALTER TABLE public.outreach_contacts
      ADD COLUMN tiktok_lead_id UUID REFERENCES public.marketing_leads(id);
    END IF;
  END IF;
END $$;

COMMENT ON TABLE public.marketing_leads IS 'Inbound marketing leads (TikTok Instant Forms, etc.)';
