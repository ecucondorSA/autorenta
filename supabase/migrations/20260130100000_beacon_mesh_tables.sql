-- ============================================================================
-- AutoRenta Mesh (Project Beacon) - Database Schema
-- 2026-01-30
--
-- Tables for the BLE-based emergency beacon system:
--   - security_events: Active emergency alerts
--   - beacon_relays: Records of scouts detecting beacons
-- ============================================================================

-- ============================================================================
-- 1. ENUMS
-- ============================================================================

-- Alert types for security events
CREATE TYPE public.beacon_alert_type AS ENUM (
  'SOS',      -- General emergency / panic button
  'THEFT',    -- Vehicle theft reported
  'CRASH',    -- Crash/accident detected
  'SILENT'    -- Suspicious silence (vehicle not responding)
);

-- Status of security events
CREATE TYPE public.security_event_status AS ENUM (
  'ACTIVE',       -- Event is active and being monitored
  'RESOLVED',     -- Event has been resolved
  'FALSE_ALARM'   -- Event was a false alarm
);

-- ============================================================================
-- 2. SECURITY EVENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Relationships (at least one should be set)
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  car_id UUID REFERENCES public.cars(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Event details
  alert_type public.beacon_alert_type NOT NULL,
  source_location GEOGRAPHY(POINT, 4326), -- Where the beacon was emitted from
  booking_id_hash TEXT, -- 8-byte hash from the beacon payload for matching

  -- Detection tracking
  detected_by UUID[] DEFAULT '{}', -- Array of scout user_ids who detected this event
  relay_count INTEGER DEFAULT 0, -- How many times this was relayed
  first_detected_at TIMESTAMPTZ, -- When first scout detected it

  -- Status
  status public.security_event_status DEFAULT 'ACTIVE',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT,

  -- Constraints
  CONSTRAINT at_least_one_reference CHECK (
    booking_id IS NOT NULL OR car_id IS NOT NULL OR user_id IS NOT NULL
  )
);

-- Indexes for security_events
CREATE INDEX idx_security_events_user ON public.security_events(user_id);
CREATE INDEX idx_security_events_booking ON public.security_events(booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX idx_security_events_car ON public.security_events(car_id) WHERE car_id IS NOT NULL;
CREATE INDEX idx_security_events_status ON public.security_events(status) WHERE status = 'ACTIVE';
CREATE INDEX idx_security_events_hash ON public.security_events(booking_id_hash) WHERE booking_id_hash IS NOT NULL;
CREATE INDEX idx_security_events_location ON public.security_events USING GIST (source_location);
CREATE INDEX idx_security_events_created ON public.security_events(created_at DESC);

-- ============================================================================
-- 3. BEACON RELAYS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.beacon_relays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Relationships
  security_event_id UUID NOT NULL REFERENCES public.security_events(id) ON DELETE CASCADE,
  scout_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Scout's position when they detected the beacon
  scout_location GEOGRAPHY(POINT, 4326),

  -- Signal strength (RSSI) - useful for triangulation
  rssi INTEGER, -- Typically negative, e.g., -70 dBm

  -- Device info
  device_id TEXT, -- Scout's device ID for deduplication

  -- Timestamps
  relayed_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate relays from same device
  UNIQUE(security_event_id, device_id)
);

-- Indexes for beacon_relays
CREATE INDEX idx_beacon_relays_event ON public.beacon_relays(security_event_id);
CREATE INDEX idx_beacon_relays_scout ON public.beacon_relays(scout_id);
CREATE INDEX idx_beacon_relays_time ON public.beacon_relays(relayed_at DESC);

-- ============================================================================
-- 4. RLS POLICIES
-- ============================================================================

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beacon_relays ENABLE ROW LEVEL SECURITY;

-- Security Events Policies

-- Users can view their own security events (as victim)
CREATE POLICY "Users can view own security events"
  ON public.security_events FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view events where they were a scout
CREATE POLICY "Scouts can view events they helped detect"
  ON public.security_events FOR SELECT
  USING (auth.uid() = ANY(detected_by));

-- Car owners can view events for their cars
CREATE POLICY "Owners can view security events for their cars"
  ON public.security_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cars
      WHERE cars.id = security_events.car_id
      AND cars.owner_id = auth.uid()
    )
  );

-- Users can create security events for themselves
CREATE POLICY "Users can create own security events"
  ON public.security_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own events (e.g., resolve)
CREATE POLICY "Users can update own security events"
  ON public.security_events FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can do anything (for Edge Functions)
CREATE POLICY "Service role full access to security_events"
  ON public.security_events FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Beacon Relays Policies

-- Users can view relays they created
CREATE POLICY "Scouts can view own relays"
  ON public.beacon_relays FOR SELECT
  USING (auth.uid() = scout_id);

-- Users can view relays for events they're involved in
CREATE POLICY "Users can view relays for their events"
  ON public.beacon_relays FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.security_events
      WHERE security_events.id = beacon_relays.security_event_id
      AND (security_events.user_id = auth.uid() OR auth.uid() = ANY(security_events.detected_by))
    )
  );

-- Anyone can create relays (scouts reporting)
CREATE POLICY "Anyone can create beacon relays"
  ON public.beacon_relays FOR INSERT
  WITH CHECK (auth.uid() = scout_id);

-- Service role can do anything
CREATE POLICY "Service role full access to beacon_relays"
  ON public.beacon_relays FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- 5. HELPER FUNCTIONS
-- ============================================================================

-- Function to find or create a security event from a beacon relay
CREATE OR REPLACE FUNCTION public.process_beacon_relay(
  p_booking_id_hash TEXT,
  p_alert_type public.beacon_alert_type,
  p_source_lat DOUBLE PRECISION,
  p_source_lng DOUBLE PRECISION,
  p_source_timestamp BIGINT,
  p_scout_id UUID,
  p_scout_lat DOUBLE PRECISION,
  p_scout_lng DOUBLE PRECISION,
  p_rssi INTEGER,
  p_device_id TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id UUID;
  v_booking_id UUID;
  v_car_id UUID;
  v_user_id UUID;
  v_is_new BOOLEAN := FALSE;
  v_points_earned INTEGER := 0;
BEGIN
  -- Try to find the booking by hash (first 8 bytes of UUID)
  SELECT id, car_id, renter_id INTO v_booking_id, v_car_id, v_user_id
  FROM public.bookings
  WHERE SUBSTRING(id::TEXT, 1, 16) = p_booking_id_hash
  LIMIT 1;

  -- If no booking found, try to find by user
  IF v_booking_id IS NULL THEN
    -- Check if this hash matches any active user session
    -- For now, we'll create an event without booking reference
    v_user_id := p_scout_id; -- Fallback to scout as user
  END IF;

  -- Check for existing active event with same hash (deduplication)
  SELECT id INTO v_event_id
  FROM public.security_events
  WHERE booking_id_hash = p_booking_id_hash
    AND status = 'ACTIVE'
    AND created_at > NOW() - INTERVAL '24 hours'
  LIMIT 1;

  -- Create new event if not exists
  IF v_event_id IS NULL THEN
    INSERT INTO public.security_events (
      booking_id,
      car_id,
      user_id,
      alert_type,
      source_location,
      booking_id_hash,
      detected_by,
      relay_count,
      first_detected_at
    ) VALUES (
      v_booking_id,
      v_car_id,
      COALESCE(v_user_id, p_scout_id),
      p_alert_type,
      ST_SetSRID(ST_MakePoint(p_source_lng, p_source_lat), 4326)::GEOGRAPHY,
      p_booking_id_hash,
      ARRAY[p_scout_id],
      1,
      NOW()
    )
    RETURNING id INTO v_event_id;

    v_is_new := TRUE;
    v_points_earned := 50; -- First detection bonus
  ELSE
    -- Update existing event
    UPDATE public.security_events
    SET
      detected_by = ARRAY(SELECT DISTINCT unnest(detected_by || ARRAY[p_scout_id])),
      relay_count = relay_count + 1,
      updated_at = NOW()
    WHERE id = v_event_id
      AND NOT (p_scout_id = ANY(detected_by)); -- Only if scout not already recorded

    v_points_earned := 10; -- Additional relay points
  END IF;

  -- Record the relay (with deduplication by device_id)
  INSERT INTO public.beacon_relays (
    security_event_id,
    scout_id,
    scout_location,
    rssi,
    device_id
  ) VALUES (
    v_event_id,
    p_scout_id,
    ST_SetSRID(ST_MakePoint(p_scout_lng, p_scout_lat), 4326)::GEOGRAPHY,
    p_rssi,
    p_device_id
  )
  ON CONFLICT (security_event_id, device_id) DO UPDATE
  SET
    rssi = EXCLUDED.rssi,
    relayed_at = NOW();

  -- TODO: Award points to scout's gamification profile
  -- UPDATE public.scout_profiles SET points = points + v_points_earned WHERE user_id = p_scout_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'event_id', v_event_id,
    'is_new_event', v_is_new,
    'points_earned', v_points_earned
  );
END;
$$;

-- Function to get nearby active security events (for map display)
CREATE OR REPLACE FUNCTION public.get_nearby_security_events(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_radius_meters INTEGER DEFAULT 5000
) RETURNS TABLE (
  id UUID,
  alert_type public.beacon_alert_type,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  relay_count INTEGER,
  created_at TIMESTAMPTZ,
  distance_meters DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    se.id,
    se.alert_type,
    ST_Y(se.source_location::GEOMETRY) AS latitude,
    ST_X(se.source_location::GEOMETRY) AS longitude,
    se.relay_count,
    se.created_at,
    ST_Distance(
      se.source_location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::GEOGRAPHY
    ) AS distance_meters
  FROM public.security_events se
  WHERE se.status = 'ACTIVE'
    AND se.created_at > NOW() - INTERVAL '24 hours'
    AND ST_DWithin(
      se.source_location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::GEOGRAPHY,
      p_radius_meters
    )
  ORDER BY distance_meters ASC
  LIMIT 20;
END;
$$;

-- ============================================================================
-- 6. TRIGGERS
-- ============================================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_security_event_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER security_events_updated_at
  BEFORE UPDATE ON public.security_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_security_event_timestamp();

-- ============================================================================
-- 7. GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON public.security_events TO authenticated;
GRANT SELECT, INSERT ON public.beacon_relays TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_beacon_relay TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_nearby_security_events TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMENT ON TABLE public.security_events IS 'AutoRenta Mesh: Emergency security events detected via BLE beacons';
COMMENT ON TABLE public.beacon_relays IS 'AutoRenta Mesh: Records of scouts detecting and relaying beacon signals';
