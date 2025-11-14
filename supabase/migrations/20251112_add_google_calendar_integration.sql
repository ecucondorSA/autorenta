-- Migration: Add Google Calendar Integration
-- Description: Tables and functions for Google Calendar sync
-- Date: 2025-11-12

-- ============================================================================
-- 1. Google Calendar Tokens Table
-- ============================================================================
-- Stores OAuth tokens for users who connected their Google Calendar
CREATE TABLE IF NOT EXISTS google_calendar_tokens (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_type text DEFAULT 'Bearer',
  expires_at timestamptz NOT NULL,
  scope text NOT NULL, -- Scopes granted (e.g., calendar.events)

  -- Calendar IDs
  primary_calendar_id text, -- User's primary Google Calendar ID (usually their email)

  -- Metadata
  connected_at timestamptz DEFAULT now(),
  last_synced_at timestamptz,
  sync_enabled boolean DEFAULT true,

  -- Audit
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS Policies for google_calendar_tokens
ALTER TABLE google_calendar_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage their own tokens
CREATE POLICY "Users can view their own calendar tokens"
  ON google_calendar_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own calendar tokens"
  ON google_calendar_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendar tokens"
  ON google_calendar_tokens
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendar tokens"
  ON google_calendar_tokens
  FOR DELETE
  USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX idx_google_calendar_tokens_user_id ON google_calendar_tokens(user_id);
CREATE INDEX idx_google_calendar_tokens_expires_at ON google_calendar_tokens(expires_at);

-- ============================================================================
-- 2. Car Calendars Table
-- ============================================================================
-- Maps each car to a Google Calendar (one calendar per car)
CREATE TABLE IF NOT EXISTS car_google_calendars (
  car_id uuid PRIMARY KEY REFERENCES cars(id) ON DELETE CASCADE,
  google_calendar_id text NOT NULL UNIQUE, -- The ID of the Google Calendar created for this car
  calendar_name text NOT NULL, -- Display name in Google Calendar
  calendar_description text,

  -- Owner info
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Sync settings
  sync_enabled boolean DEFAULT true,
  last_synced_at timestamptz,

  -- Audit
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS Policies for car_google_calendars
ALTER TABLE car_google_calendars ENABLE ROW LEVEL SECURITY;

-- Car owners can see their calendars
CREATE POLICY "Car owners can view their car calendars"
  ON car_google_calendars
  FOR SELECT
  USING (
    owner_id = auth.uid() OR
    car_id IN (SELECT id FROM cars WHERE user_id = auth.uid())
  );

-- Car owners can create calendars for their cars
CREATE POLICY "Car owners can create car calendars"
  ON car_google_calendars
  FOR INSERT
  WITH CHECK (
    owner_id = auth.uid() AND
    car_id IN (SELECT id FROM cars WHERE user_id = auth.uid())
  );

-- Car owners can update their car calendars
CREATE POLICY "Car owners can update their car calendars"
  ON car_google_calendars
  FOR UPDATE
  USING (
    owner_id = auth.uid() OR
    car_id IN (SELECT id FROM cars WHERE user_id = auth.uid())
  );

-- Car owners can delete their car calendars
CREATE POLICY "Car owners can delete their car calendars"
  ON car_google_calendars
  FOR DELETE
  USING (
    owner_id = auth.uid() OR
    car_id IN (SELECT id FROM cars WHERE user_id = auth.uid())
  );

-- Indexes
CREATE INDEX idx_car_google_calendars_car_id ON car_google_calendars(car_id);
CREATE INDEX idx_car_google_calendars_owner_id ON car_google_calendars(owner_id);
CREATE INDEX idx_car_google_calendars_google_calendar_id ON car_google_calendars(google_calendar_id);

-- ============================================================================
-- 3. Update Bookings Table
-- ============================================================================
-- Add Google Calendar event IDs to track synced events
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS google_calendar_event_id text,
ADD COLUMN IF NOT EXISTS calendar_synced_at timestamptz,
ADD COLUMN IF NOT EXISTS calendar_sync_enabled boolean DEFAULT true;

-- Index for calendar event lookups
CREATE INDEX IF NOT EXISTS idx_bookings_google_calendar_event_id
  ON bookings(google_calendar_event_id)
  WHERE google_calendar_event_id IS NOT NULL;

-- ============================================================================
-- 4. Calendar Sync Log Table
-- ============================================================================
-- Track sync operations for debugging and audit
CREATE TABLE IF NOT EXISTS calendar_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What was synced
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  car_id uuid REFERENCES cars(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Sync details
  operation text NOT NULL, -- 'create', 'update', 'delete', 'refresh_token'
  status text NOT NULL, -- 'success', 'failed', 'pending'
  google_calendar_event_id text,

  -- Error handling
  error_message text,
  error_code text,
  retry_count int DEFAULT 0,

  -- Metadata
  sync_direction text, -- 'to_google', 'from_google'
  request_payload jsonb,
  response_payload jsonb,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- RLS for calendar_sync_log
ALTER TABLE calendar_sync_log ENABLE ROW LEVEL SECURITY;

-- Users can see their own sync logs
CREATE POLICY "Users can view their own sync logs"
  ON calendar_sync_log
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    car_id IN (SELECT id FROM cars WHERE user_id = auth.uid()) OR
    booking_id IN (
      SELECT id FROM bookings
      WHERE locatario_id = auth.uid() OR car_id IN (
        SELECT id FROM cars WHERE user_id = auth.uid()
      )
    )
  );

-- Indexes
CREATE INDEX idx_calendar_sync_log_booking_id ON calendar_sync_log(booking_id);
CREATE INDEX idx_calendar_sync_log_user_id ON calendar_sync_log(user_id);
CREATE INDEX idx_calendar_sync_log_status ON calendar_sync_log(status);
CREATE INDEX idx_calendar_sync_log_created_at ON calendar_sync_log(created_at DESC);

-- ============================================================================
-- 5. Helper Functions
-- ============================================================================

-- Function to check if user has connected Google Calendar
CREATE OR REPLACE FUNCTION is_google_calendar_connected(user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM google_calendar_tokens
    WHERE user_id = user_uuid
      AND sync_enabled = true
      AND expires_at > now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active calendar token for user
CREATE OR REPLACE FUNCTION get_active_calendar_token(user_uuid uuid)
RETURNS TABLE (
  access_token text,
  refresh_token text,
  expires_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    gct.access_token,
    gct.refresh_token,
    gct.expires_at
  FROM google_calendar_tokens gct
  WHERE gct.user_id = user_uuid
    AND gct.sync_enabled = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update last_synced_at timestamp
CREATE OR REPLACE FUNCTION update_calendar_sync_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_google_calendar_tokens_timestamp
  BEFORE UPDATE ON google_calendar_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_sync_timestamp();

CREATE TRIGGER update_car_google_calendars_timestamp
  BEFORE UPDATE ON car_google_calendars
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_sync_timestamp();

-- ============================================================================
-- 6. Comments
-- ============================================================================

COMMENT ON TABLE google_calendar_tokens IS
  'Stores OAuth tokens for users who connected their Google Calendar';

COMMENT ON TABLE car_google_calendars IS
  'Maps each car to a dedicated Google Calendar for booking management';

COMMENT ON TABLE calendar_sync_log IS
  'Audit log for all calendar synchronization operations';

COMMENT ON COLUMN bookings.google_calendar_event_id IS
  'Google Calendar Event ID for this booking (if synced)';

COMMENT ON COLUMN bookings.calendar_synced_at IS
  'Last time this booking was synced to Google Calendar';

COMMENT ON COLUMN bookings.calendar_sync_enabled IS
  'Whether calendar sync is enabled for this booking';
