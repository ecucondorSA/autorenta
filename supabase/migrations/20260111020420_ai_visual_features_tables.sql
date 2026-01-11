-- ============================================================================
-- AI Visual Features Tables
-- Sprint 1: Photo Quality, Plate Detection, Vehicle Recognition
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Vehicle Recognition Logs
-- Stores AI recognition results for vehicle photos
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vehicle_recognition_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id UUID REFERENCES public.cars(id) ON DELETE SET NULL,
  image_url TEXT,
  recognized_brand TEXT,
  recognized_model TEXT,
  recognized_year_range INT4RANGE,
  recognized_color TEXT,
  recognized_body_type TEXT,
  confidence SMALLINT CHECK (confidence BETWEEN 0 AND 100),
  validation_result JSONB,
  suggestions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for lookups by car
CREATE INDEX IF NOT EXISTS idx_vehicle_recognition_car
ON public.vehicle_recognition_logs(car_id)
WHERE car_id IS NOT NULL;

-- Index for analytics by date
CREATE INDEX IF NOT EXISTS idx_vehicle_recognition_date
ON public.vehicle_recognition_logs(created_at);

-- RLS
ALTER TABLE public.vehicle_recognition_logs ENABLE ROW LEVEL SECURITY;

-- Users can view recognition logs for their own cars
CREATE POLICY "Users can view own car recognition logs"
ON public.vehicle_recognition_logs FOR SELECT
USING (
  car_id IN (SELECT id FROM public.cars WHERE owner_id = (SELECT auth.uid()))
);

-- Service role can insert (edge functions)
CREATE POLICY "Service role can insert recognition logs"
ON public.vehicle_recognition_logs FOR INSERT
WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- Photo Quality Logs
-- Stores quality validation results for photos
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.photo_quality_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id UUID REFERENCES public.cars(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  image_url TEXT NOT NULL,
  expected_subject TEXT NOT NULL,
  expected_position TEXT,
  quality_score SMALLINT CHECK (quality_score BETWEEN 0 AND 100),
  is_acceptable BOOLEAN DEFAULT false,
  issues JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  detected_subject TEXT,
  area_coverage SMALLINT,
  position_detected TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for lookups by car
CREATE INDEX IF NOT EXISTS idx_photo_quality_car
ON public.photo_quality_logs(car_id)
WHERE car_id IS NOT NULL;

-- Index for lookups by user
CREATE INDEX IF NOT EXISTS idx_photo_quality_user
ON public.photo_quality_logs(user_id)
WHERE user_id IS NOT NULL;

-- RLS
ALTER TABLE public.photo_quality_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own quality logs
CREATE POLICY "Users can view own photo quality logs"
ON public.photo_quality_logs FOR SELECT
USING (user_id = (SELECT auth.uid()));

-- Service role can insert
CREATE POLICY "Service role can insert photo quality logs"
ON public.photo_quality_logs FOR INSERT
WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- Plate Detection Logs
-- Stores plate detection results (for audit and privacy compliance)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.plate_detection_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id UUID REFERENCES public.cars(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  image_url TEXT NOT NULL,
  plates_detected SMALLINT DEFAULT 0,
  plates_masked JSONB DEFAULT '[]'::jsonb, -- Stores masked plate texts and bounding boxes
  was_blurred BOOLEAN DEFAULT false,
  blurred_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for lookups by car
CREATE INDEX IF NOT EXISTS idx_plate_detection_car
ON public.plate_detection_logs(car_id)
WHERE car_id IS NOT NULL;

-- RLS
ALTER TABLE public.plate_detection_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own detection logs
CREATE POLICY "Users can view own plate detection logs"
ON public.plate_detection_logs FOR SELECT
USING (user_id = (SELECT auth.uid()));

-- Service role can insert
CREATE POLICY "Service role can insert plate detection logs"
ON public.plate_detection_logs FOR INSERT
WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- Add AI fields to cars table
-- For storing recognition results and condition scores
-- ----------------------------------------------------------------------------
ALTER TABLE public.cars
ADD COLUMN IF NOT EXISTS ai_recognized_brand TEXT,
ADD COLUMN IF NOT EXISTS ai_recognized_model TEXT,
ADD COLUMN IF NOT EXISTS ai_recognition_confidence SMALLINT,
ADD COLUMN IF NOT EXISTS ai_recognition_validated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_recognition_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ai_condition_score DECIMAL(3,1),
ADD COLUMN IF NOT EXISTS ai_condition_category TEXT,
ADD COLUMN IF NOT EXISTS ai_condition_analysis JSONB,
ADD COLUMN IF NOT EXISTS ai_condition_analyzed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS photos_quality_checked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS photos_quality_score SMALLINT,
ADD COLUMN IF NOT EXISTS plates_auto_blurred BOOLEAN DEFAULT false;

-- Index for cars with AI recognition
CREATE INDEX IF NOT EXISTS idx_cars_ai_recognition
ON public.cars(ai_recognition_validated)
WHERE ai_recognition_validated = true;

-- Index for cars by condition score
CREATE INDEX IF NOT EXISTS idx_cars_condition_score
ON public.cars(ai_condition_score DESC NULLS LAST)
WHERE ai_condition_score IS NOT NULL;

-- ----------------------------------------------------------------------------
-- Function to get cars needing quality check
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_cars_needing_quality_check(limit_count INT DEFAULT 100)
RETURNS SETOF public.cars
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT c.*
  FROM public.cars c
  WHERE c.photos_quality_checked = false
    AND c.status = 'active'
  ORDER BY c.created_at DESC
  LIMIT limit_count;
$$;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION public.get_cars_needing_quality_check TO service_role;

-- ----------------------------------------------------------------------------
-- Comments
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public.vehicle_recognition_logs IS 'Logs of AI vehicle recognition attempts';
COMMENT ON TABLE public.photo_quality_logs IS 'Logs of photo quality validation results';
COMMENT ON TABLE public.plate_detection_logs IS 'Logs of license plate detection for privacy compliance';
COMMENT ON COLUMN public.cars.ai_recognized_brand IS 'Brand detected by AI from photos';
COMMENT ON COLUMN public.cars.ai_condition_score IS 'Vehicle condition score from AI analysis (1.0-5.0)';
