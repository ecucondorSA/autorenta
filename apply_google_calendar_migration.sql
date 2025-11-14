-- Apply Google Calendar Integration Migration Directly
-- Bypasses migration order issues

\echo '==== Starting Google Calendar Integration ===='

-- 1. Create google_calendar_tokens table
CREATE TABLE IF NOT EXISTS google_calendar_tokens (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_type text DEFAULT 'Bearer',
  expires_at timestamptz NOT NULL,
  scope text NOT NULL,
  primary_calendar_id text,
  connected_at timestamptz DEFAULT now(),
  last_synced_at timestamptz,
  sync_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

\echo '✓ Created google_calendar_tokens table'

-- Enable RLS
ALTER TABLE google_calendar_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own calendar tokens" ON google_calendar_tokens;
CREATE POLICY "Users can view their own calendar tokens"
  ON google_calendar_tokens FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own calendar tokens" ON google_calendar_tokens;
CREATE POLICY "Users can insert their own calendar tokens"
  ON google_calendar_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own calendar tokens" ON google_calendar_tokens;
CREATE POLICY "Users can update their own calendar tokens"
  ON google_calendar_tokens FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own calendar tokens" ON google_calendar_tokens;
CREATE POLICY "Users can delete their own calendar tokens"
  ON google_calendar_tokens FOR DELETE
  USING (auth.uid() = user_id);

\echo '✓ Configured RLS for google_calendar_tokens'

-- Indexes
CREATE INDEX IF NOT EXISTS idx_google_calendar_tokens_user_id ON google_calendar_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_google_calendar_tokens_expires_at ON google_calendar_tokens(expires_at);

-- 2. Create car_google_calendars table
CREATE TABLE IF NOT EXISTS car_google_calendars (
  car_id uuid PRIMARY KEY REFERENCES cars(id) ON DELETE CASCADE,
  google_calendar_id text NOT NULL UNIQUE,
  calendar_name text NOT NULL,
  calendar_description text,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  sync_enabled boolean DEFAULT true,
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

\echo '✓ Created car_google_calendars table'

-- Enable RLS
ALTER TABLE car_google_calendars ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Car owners can view their car calendars" ON car_google_calendars;
CREATE POLICY "Car owners can view their car calendars"
  ON car_google_calendars FOR SELECT
  USING (
    owner_id = auth.uid() OR
    car_id IN (SELECT id FROM cars WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Car owners can create car calendars" ON car_google_calendars;
CREATE POLICY "Car owners can create car calendars"
  ON car_google_calendars FOR INSERT
  WITH CHECK (
    owner_id = auth.uid() AND
    car_id IN (SELECT id FROM cars WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Car owners can update their car calendars" ON car_google_calendars;
CREATE POLICY "Car owners can update their car calendars"
  ON car_google_calendars FOR UPDATE
  USING (
    owner_id = auth.uid() OR
    car_id IN (SELECT id FROM cars WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Car owners can delete their car calendars" ON car_google_calendars;
CREATE POLICY "Car owners can delete their car calendars"
  ON car_google_calendars FOR DELETE
  USING (
    owner_id = auth.uid() OR
    car_id IN (SELECT id FROM cars WHERE user_id = auth.uid())
  );

\echo '✓ Configured RLS for car_google_calendars'

-- Indexes
CREATE INDEX IF NOT EXISTS idx_car_google_calendars_car_id ON car_google_calendars(car_id);
CREATE INDEX IF NOT EXISTS idx_car_google_calendars_owner_id ON car_google_calendars(owner_id);
CREATE INDEX IF NOT EXISTS idx_car_google_calendars_google_calendar_id ON car_google_calendars(google_calendar_id);

-- 3. Add columns to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS google_calendar_event_id text,
ADD COLUMN IF NOT EXISTS calendar_synced_at timestamptz,
ADD COLUMN IF NOT EXISTS calendar_sync_enabled boolean DEFAULT true;

\echo '✓ Added Google Calendar columns to bookings'

-- Index
CREATE INDEX IF NOT EXISTS idx_bookings_google_calendar_event_id
  ON bookings(google_calendar_event_id)
  WHERE google_calendar_event_id IS NOT NULL;

-- 4. Create calendar_sync_log table
CREATE TABLE IF NOT EXISTS calendar_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  car_id uuid REFERENCES cars(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  operation text NOT NULL,
  status text NOT NULL,
  google_calendar_event_id text,
  error_message text,
  error_code text,
  retry_count int DEFAULT 0,
  sync_direction text,
  request_payload jsonb,
  response_payload jsonb,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

\echo '✓ Created calendar_sync_log table'

-- Enable RLS
ALTER TABLE calendar_sync_log ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "Users can view their own sync logs" ON calendar_sync_log;
CREATE POLICY "Users can view their own sync logs"
  ON calendar_sync_log FOR SELECT
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

\echo '✓ Configured RLS for calendar_sync_log'

-- Indexes
CREATE INDEX IF NOT EXISTS idx_calendar_sync_log_booking_id ON calendar_sync_log(booking_id);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_log_user_id ON calendar_sync_log(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_log_status ON calendar_sync_log(status);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_log_created_at ON calendar_sync_log(created_at DESC);

-- 5. Helper Functions
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

\echo '✓ Created is_google_calendar_connected function'

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

\echo '✓ Created get_active_calendar_token function'

CREATE OR REPLACE FUNCTION update_calendar_sync_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS update_google_calendar_tokens_timestamp ON google_calendar_tokens;
CREATE TRIGGER update_google_calendar_tokens_timestamp
  BEFORE UPDATE ON google_calendar_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_sync_timestamp();

DROP TRIGGER IF EXISTS update_car_google_calendars_timestamp ON car_google_calendars;
CREATE TRIGGER update_car_google_calendars_timestamp
  BEFORE UPDATE ON car_google_calendars
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_sync_timestamp();

\echo '✓ Created update triggers'
\echo '==== Google Calendar Integration Complete! ===='
