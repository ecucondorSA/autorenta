-- Live Location Tracking for Delivery/Pickup
-- Allows locatario and locador to see each other's real-time location during delivery

-- ============================================================================
-- 1. CREATE TRACKING SESSIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS booking_location_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_role TEXT NOT NULL CHECK (user_role IN ('locador', 'locatario')),

  -- Location data
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  accuracy DECIMAL(8, 2), -- GPS accuracy in meters
  heading DECIMAL(5, 2), -- Compass heading (0-360)
  speed DECIMAL(6, 2), -- Speed in m/s

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'arrived', 'inactive')),
  tracking_type TEXT NOT NULL CHECK (tracking_type IN ('check_in', 'check_out')),

  -- ETA (estimated time of arrival)
  estimated_arrival_time TIMESTAMPTZ,
  distance_to_destination DECIMAL(10, 2), -- meters

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Indexes
  CONSTRAINT unique_active_tracking UNIQUE NULLS NOT DISTINCT (booking_id, user_id, tracking_type, status)
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_location_tracking_booking
  ON booking_location_tracking(booking_id, status);

CREATE INDEX IF NOT EXISTS idx_location_tracking_user
  ON booking_location_tracking(user_id, status);

CREATE INDEX IF NOT EXISTS idx_location_tracking_updated
  ON booking_location_tracking(updated_at DESC)
  WHERE status = 'active';

-- ============================================================================
-- 2. AUTO-UPDATE TIMESTAMP
-- ============================================================================

CREATE OR REPLACE FUNCTION update_location_tracking_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_location_tracking_timestamp
  BEFORE UPDATE ON booking_location_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_location_tracking_timestamp();

-- ============================================================================
-- 3. RLS POLICIES
-- ============================================================================

ALTER TABLE booking_location_tracking ENABLE ROW LEVEL SECURITY;

-- Users can insert their own location
CREATE POLICY "Users can create their own location tracking"
  ON booking_location_tracking
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own location
CREATE POLICY "Users can update their own location tracking"
  ON booking_location_tracking
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can view locations for their bookings
CREATE POLICY "Users can view tracking for their bookings"
  ON booking_location_tracking
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN cars c ON c.id = b.car_id
      WHERE b.id = booking_location_tracking.booking_id
        AND (b.renter_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );

-- ============================================================================
-- 4. HELPER FUNCTIONS
-- ============================================================================

-- Function to start tracking session
CREATE OR REPLACE FUNCTION start_location_tracking(
  p_booking_id UUID,
  p_tracking_type TEXT
)
RETURNS UUID AS $$
DECLARE
  v_user_role TEXT;
  v_tracking_id UUID;
BEGIN
  -- Determine user role in this booking
  SELECT
    CASE
      WHEN c.owner_id = auth.uid() THEN 'locador'
      WHEN b.renter_id = auth.uid() THEN 'locatario'
    END INTO v_user_role
  FROM bookings b
  JOIN cars c ON c.id = b.car_id
  WHERE b.id = p_booking_id;

  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'User is not part of this booking';
  END IF;

  -- Deactivate any existing tracking sessions
  UPDATE booking_location_tracking
  SET status = 'inactive'
  WHERE booking_id = p_booking_id
    AND user_id = auth.uid()
    AND tracking_type = p_tracking_type
    AND status = 'active';

  -- Create new tracking session
  INSERT INTO booking_location_tracking (
    booking_id,
    user_id,
    user_role,
    tracking_type,
    latitude,
    longitude,
    status
  ) VALUES (
    p_booking_id,
    auth.uid(),
    v_user_role,
    p_tracking_type,
    0, -- Will be updated immediately by client
    0,
    'active'
  )
  RETURNING id INTO v_tracking_id;

  RETURN v_tracking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update location
CREATE OR REPLACE FUNCTION update_location(
  p_tracking_id UUID,
  p_latitude DECIMAL(10, 7),
  p_longitude DECIMAL(10, 7),
  p_accuracy DECIMAL(8, 2) DEFAULT NULL,
  p_heading DECIMAL(5, 2) DEFAULT NULL,
  p_speed DECIMAL(6, 2) DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE booking_location_tracking
  SET
    latitude = p_latitude,
    longitude = p_longitude,
    accuracy = COALESCE(p_accuracy, accuracy),
    heading = COALESCE(p_heading, heading),
    speed = COALESCE(p_speed, speed),
    updated_at = NOW()
  WHERE id = p_tracking_id
    AND user_id = auth.uid()
    AND status = 'active';

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to end tracking session
CREATE OR REPLACE FUNCTION end_location_tracking(
  p_tracking_id UUID,
  p_status TEXT DEFAULT 'inactive'
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE booking_location_tracking
  SET status = p_status
  WHERE id = p_tracking_id
    AND user_id = auth.uid();

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active tracking for a booking
CREATE OR REPLACE FUNCTION get_active_tracking_for_booking(
  p_booking_id UUID
)
RETURNS TABLE (
  tracking_id UUID,
  user_id UUID,
  user_role TEXT,
  user_name TEXT,
  user_photo TEXT,
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  accuracy DECIMAL(8, 2),
  heading DECIMAL(5, 2),
  speed DECIMAL(6, 2),
  last_updated TIMESTAMPTZ,
  estimated_arrival TIMESTAMPTZ,
  distance_remaining DECIMAL(10, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    blt.id,
    blt.user_id,
    blt.user_role,
    p.full_name,
    p.avatar_url,
    blt.latitude,
    blt.longitude,
    blt.accuracy,
    blt.heading,
    blt.speed,
    blt.updated_at,
    blt.estimated_arrival_time,
    blt.distance_to_destination
  FROM booking_location_tracking blt
  JOIN profiles p ON p.id = blt.user_id
  WHERE blt.booking_id = p_booking_id
    AND blt.status = 'active'
    AND blt.updated_at > NOW() - INTERVAL '5 minutes'; -- Only recent locations
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. COMMENTS
-- ============================================================================

COMMENT ON TABLE booking_location_tracking IS
'Real-time location tracking for delivery/pickup. Allows locatario and locador to see each other during check-in/check-out.';

COMMENT ON COLUMN booking_location_tracking.user_role IS
'Role of the person being tracked (locador or locatario)';

COMMENT ON COLUMN booking_location_tracking.tracking_type IS
'Type of tracking: check_in (delivery) or check_out (return)';

COMMENT ON COLUMN booking_location_tracking.status IS
'Status: active (tracking), arrived (at destination), inactive (stopped)';
