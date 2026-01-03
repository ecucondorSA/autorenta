-- ============================================================================
-- Migration: Create damage_analysis_logs table
-- Date: 2025-12-30
-- Purpose: Store AI damage analysis results from Gemini Vision
-- ============================================================================

-- Create table for storing damage analysis results
CREATE TABLE IF NOT EXISTS damage_analysis_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  pair_index INTEGER NOT NULL DEFAULT 1,
  check_in_image_url TEXT NOT NULL,
  check_out_image_url TEXT NOT NULL,
  damages_detected JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary TEXT,
  confidence_average NUMERIC(5,2),
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  model_used TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure unique analysis per booking/pair combination
  CONSTRAINT unique_booking_pair UNIQUE (booking_id, pair_index)
);

-- Create index for fast lookups by booking
CREATE INDEX IF NOT EXISTS idx_damage_analysis_logs_booking_id
  ON damage_analysis_logs(booking_id);

-- Enable RLS
ALTER TABLE damage_analysis_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Service role can insert (edge function uses service key)
CREATE POLICY "Service role can insert damage analysis"
  ON damage_analysis_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- RLS Policy: Users can view damage analysis for their bookings
CREATE POLICY "Users can view damage analysis of their bookings"
  ON damage_analysis_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = damage_analysis_logs.booking_id
      AND (
        b.renter_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM cars c
          WHERE c.id = b.car_id AND c.owner_id = auth.uid()
        )
      )
    )
  );

-- RLS Policy: Admins can view all
CREATE POLICY "Admins can view all damage analysis"
  ON damage_analysis_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Add comment
COMMENT ON TABLE damage_analysis_logs IS 'Stores AI-powered damage detection results comparing check-in vs check-out vehicle photos';
COMMENT ON COLUMN damage_analysis_logs.damages_detected IS 'JSON array of detected damages with type, description, severity, confidence, location';
COMMENT ON COLUMN damage_analysis_logs.pair_index IS 'Index of the photo pair being analyzed (e.g., front=1, rear=2, left=3, right=4)';
