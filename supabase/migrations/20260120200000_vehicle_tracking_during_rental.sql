-- Vehicle Tracking During Active Rental Migration
-- Enables continuous GPS tracking of vehicles during active bookings for LATAM security

-- =============================================================================
-- 1. Vehicle Location History Table (for continuous tracking)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.vehicle_location_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  car_id UUID NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,

  -- GPS Data
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  accuracy DECIMAL(8, 2),          -- Accuracy in meters
  altitude DECIMAL(8, 2),          -- Altitude in meters
  heading DECIMAL(5, 2),           -- Compass heading 0-360
  speed DECIMAL(6, 2),             -- Speed in m/s

  -- Source
  source TEXT NOT NULL DEFAULT 'app',  -- 'app', 'iot_device', 'background'
  device_id TEXT,                       -- For IoT devices

  -- Metadata
  battery_level INTEGER,               -- Phone battery %
  is_charging BOOLEAN,
  network_type TEXT,                   -- 'wifi', '4g', '3g', etc.

  -- Timestamps
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vehicle_location_booking
  ON vehicle_location_history(booking_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_vehicle_location_car
  ON vehicle_location_history(car_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_vehicle_location_recorded
  ON vehicle_location_history(recorded_at DESC);

-- Partitioning hint: Consider partitioning by month for high-volume data
COMMENT ON TABLE vehicle_location_history IS
  'Continuous GPS tracking data for vehicles during active rentals. Partition by month if >1M rows/month.';

-- =============================================================================
-- 2. Geofencing Zones Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.geofence_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,

  -- Zone Definition
  zone_type TEXT NOT NULL DEFAULT 'allowed',  -- 'allowed', 'restricted', 'alert'
  name TEXT,                                   -- e.g., "City Limits", "Pickup Location"

  -- Center point (for circular geofence)
  center_latitude DECIMAL(10, 7) NOT NULL,
  center_longitude DECIMAL(10, 7) NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 50000,  -- Default 50km

  -- Polygon (for complex shapes - future use)
  polygon_geojson JSONB,

  -- Settings
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  alert_on_exit BOOLEAN NOT NULL DEFAULT TRUE,  -- Alert when leaving zone
  alert_on_enter BOOLEAN NOT NULL DEFAULT FALSE, -- Alert when entering zone

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_geofence_booking
  ON geofence_zones(booking_id) WHERE is_active = TRUE;

-- =============================================================================
-- 3. Geofence Alerts Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.geofence_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  geofence_id UUID NOT NULL REFERENCES public.geofence_zones(id) ON DELETE CASCADE,

  -- Alert Details
  alert_type TEXT NOT NULL,  -- 'exit', 'enter', 'speed_limit'
  severity TEXT NOT NULL DEFAULT 'warning',  -- 'info', 'warning', 'critical'

  -- Location at time of alert
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  distance_from_center DECIMAL(10, 2),  -- Distance from geofence center in meters
  speed_at_alert DECIMAL(6, 2),

  -- Status
  acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_geofence_alerts_booking
  ON geofence_alerts(booking_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_geofence_alerts_unack
  ON geofence_alerts(booking_id) WHERE acknowledged = FALSE;

-- =============================================================================
-- 4. Tracking Settings per Booking
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.booking_tracking_settings (
  booking_id UUID PRIMARY KEY REFERENCES public.bookings(id) ON DELETE CASCADE,

  -- Tracking Configuration
  tracking_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  tracking_interval_seconds INTEGER NOT NULL DEFAULT 300,  -- Every 5 minutes default
  background_tracking_enabled BOOLEAN NOT NULL DEFAULT TRUE,

  -- Geofencing
  geofencing_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  default_geofence_radius_km INTEGER NOT NULL DEFAULT 50,  -- 50km default radius

  -- Speed Alerts
  speed_alert_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  speed_limit_kmh INTEGER NOT NULL DEFAULT 120,  -- Alert above 120 km/h

  -- Owner Visibility
  owner_can_view_location BOOLEAN NOT NULL DEFAULT TRUE,
  owner_can_view_history BOOLEAN NOT NULL DEFAULT FALSE,  -- Respect privacy by default

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 5. RLS Policies
-- =============================================================================

ALTER TABLE vehicle_location_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofence_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofence_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_tracking_settings ENABLE ROW LEVEL SECURITY;

-- Vehicle Location History: Booking participants can view
CREATE POLICY "Booking participants can view location history"
  ON vehicle_location_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN cars c ON c.id = b.car_id
      WHERE b.id = vehicle_location_history.booking_id
      AND (b.renter_id = (SELECT auth.uid()) OR c.owner_id = (SELECT auth.uid()))
    )
  );

-- Only the renter (driver) can insert location data
CREATE POLICY "Renter can insert location data"
  ON vehicle_location_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = vehicle_location_history.booking_id
      AND b.renter_id = (SELECT auth.uid())
      AND b.status = 'in_progress'
    )
  );

-- Service role can insert (for IoT devices)
CREATE POLICY "Service role can insert location data"
  ON vehicle_location_history FOR INSERT
  TO service_role
  WITH CHECK (TRUE);

-- Geofence Zones: Owner and renter can view
CREATE POLICY "Booking participants can view geofences"
  ON geofence_zones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN cars c ON c.id = b.car_id
      WHERE b.id = geofence_zones.booking_id
      AND (b.renter_id = (SELECT auth.uid()) OR c.owner_id = (SELECT auth.uid()))
    )
  );

-- Only owner can create geofences
CREATE POLICY "Owner can create geofences"
  ON geofence_zones FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN cars c ON c.id = b.car_id
      WHERE b.id = geofence_zones.booking_id
      AND c.owner_id = (SELECT auth.uid())
    )
  );

-- Alerts: Participants can view
CREATE POLICY "Booking participants can view alerts"
  ON geofence_alerts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN cars c ON c.id = b.car_id
      WHERE b.id = geofence_alerts.booking_id
      AND (b.renter_id = (SELECT auth.uid()) OR c.owner_id = (SELECT auth.uid()))
    )
  );

-- Tracking Settings: Participants can view
CREATE POLICY "Booking participants can view tracking settings"
  ON booking_tracking_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN cars c ON c.id = b.car_id
      WHERE b.id = booking_tracking_settings.booking_id
      AND (b.renter_id = (SELECT auth.uid()) OR c.owner_id = (SELECT auth.uid()))
    )
  );

-- Owner can manage tracking settings
CREATE POLICY "Owner can manage tracking settings"
  ON booking_tracking_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN cars c ON c.id = b.car_id
      WHERE b.id = booking_tracking_settings.booking_id
      AND c.owner_id = (SELECT auth.uid())
    )
  );

-- =============================================================================
-- 6. Helper Functions
-- =============================================================================

-- Function to check if point is within geofence
CREATE OR REPLACE FUNCTION public.is_within_geofence(
  p_lat DECIMAL,
  p_lng DECIMAL,
  p_center_lat DECIMAL,
  p_center_lng DECIMAL,
  p_radius_meters INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  v_distance DECIMAL;
BEGIN
  -- Haversine formula for distance in meters
  v_distance := 6371000 * 2 * ASIN(
    SQRT(
      POWER(SIN(RADIANS(p_lat - p_center_lat) / 2), 2) +
      COS(RADIANS(p_center_lat)) * COS(RADIANS(p_lat)) *
      POWER(SIN(RADIANS(p_lng - p_center_lng) / 2), 2)
    )
  );

  RETURN v_distance <= p_radius_meters;
END;
$$;

-- Function to calculate distance between two points (in meters)
CREATE OR REPLACE FUNCTION public.calculate_distance_meters(
  p_lat1 DECIMAL,
  p_lng1 DECIMAL,
  p_lat2 DECIMAL,
  p_lng2 DECIMAL
) RETURNS DECIMAL
LANGUAGE plpgsql IMMUTABLE
AS $$
BEGIN
  RETURN 6371000 * 2 * ASIN(
    SQRT(
      POWER(SIN(RADIANS(p_lat2 - p_lat1) / 2), 2) +
      COS(RADIANS(p_lat1)) * COS(RADIANS(p_lat2)) *
      POWER(SIN(RADIANS(p_lng2 - p_lng1) / 2), 2)
    )
  );
END;
$$;

-- Function to record vehicle location and check geofences
CREATE OR REPLACE FUNCTION public.record_vehicle_location(
  p_booking_id UUID,
  p_latitude DECIMAL,
  p_longitude DECIMAL,
  p_accuracy DECIMAL DEFAULT NULL,
  p_altitude DECIMAL DEFAULT NULL,
  p_heading DECIMAL DEFAULT NULL,
  p_speed DECIMAL DEFAULT NULL,
  p_source TEXT DEFAULT 'app',
  p_battery_level INTEGER DEFAULT NULL,
  p_is_charging BOOLEAN DEFAULT NULL,
  p_network_type TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_booking RECORD;
  v_car_id UUID;
  v_location_id UUID;
  v_geofence RECORD;
  v_is_within BOOLEAN;
  v_distance DECIMAL;
  v_alerts JSONB := '[]'::JSONB;
  v_speed_kmh DECIMAL;
  v_settings RECORD;
BEGIN
  -- Get booking info
  SELECT b.*, c.id AS car_id INTO v_booking
  FROM bookings b
  JOIN cars c ON c.id = b.car_id
  WHERE b.id = p_booking_id
  AND b.status = 'in_progress';

  IF v_booking IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found or not active');
  END IF;

  v_car_id := v_booking.car_id;

  -- Get tracking settings (use defaults if not set)
  SELECT * INTO v_settings
  FROM booking_tracking_settings
  WHERE booking_id = p_booking_id;

  -- Insert location record
  INSERT INTO vehicle_location_history (
    booking_id, car_id, latitude, longitude, accuracy, altitude,
    heading, speed, source, battery_level, is_charging, network_type, recorded_at
  ) VALUES (
    p_booking_id, v_car_id, p_latitude, p_longitude, p_accuracy, p_altitude,
    p_heading, p_speed, p_source, p_battery_level, p_is_charging, p_network_type, NOW()
  )
  RETURNING id INTO v_location_id;

  -- Check geofences
  FOR v_geofence IN
    SELECT * FROM geofence_zones
    WHERE booking_id = p_booking_id AND is_active = TRUE
  LOOP
    v_distance := calculate_distance_meters(
      p_latitude, p_longitude,
      v_geofence.center_latitude, v_geofence.center_longitude
    );

    v_is_within := v_distance <= v_geofence.radius_meters;

    -- Check for zone exit alert
    IF NOT v_is_within AND v_geofence.alert_on_exit AND v_geofence.zone_type = 'allowed' THEN
      INSERT INTO geofence_alerts (
        booking_id, geofence_id, alert_type, severity,
        latitude, longitude, distance_from_center, speed_at_alert
      ) VALUES (
        p_booking_id, v_geofence.id, 'exit', 'warning',
        p_latitude, p_longitude, v_distance, p_speed
      );

      v_alerts := v_alerts || jsonb_build_object(
        'type', 'geofence_exit',
        'geofence_name', v_geofence.name,
        'distance_km', ROUND(v_distance / 1000, 2)
      );
    END IF;
  END LOOP;

  -- Check speed limit
  IF p_speed IS NOT NULL AND v_settings.speed_alert_enabled THEN
    v_speed_kmh := p_speed * 3.6;  -- Convert m/s to km/h

    IF v_speed_kmh > COALESCE(v_settings.speed_limit_kmh, 120) THEN
      v_alerts := v_alerts || jsonb_build_object(
        'type', 'speed_limit',
        'speed_kmh', ROUND(v_speed_kmh, 1),
        'limit_kmh', COALESCE(v_settings.speed_limit_kmh, 120)
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'location_id', v_location_id,
    'alerts', v_alerts
  );
END;
$$;

-- Function to get latest vehicle location
CREATE OR REPLACE FUNCTION public.get_vehicle_latest_location(
  p_booking_id UUID
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_location RECORD;
BEGIN
  SELECT * INTO v_location
  FROM vehicle_location_history
  WHERE booking_id = p_booking_id
  ORDER BY recorded_at DESC
  LIMIT 1;

  IF v_location IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No location data');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'latitude', v_location.latitude,
    'longitude', v_location.longitude,
    'accuracy', v_location.accuracy,
    'speed', v_location.speed,
    'heading', v_location.heading,
    'battery_level', v_location.battery_level,
    'recorded_at', v_location.recorded_at
  );
END;
$$;

-- Function to get location history for a booking
CREATE OR REPLACE FUNCTION public.get_vehicle_location_history(
  p_booking_id UUID,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_locations JSONB;
  v_total INTEGER;
BEGIN
  -- Check if user has access to this booking
  IF NOT EXISTS (
    SELECT 1 FROM bookings b
    JOIN cars c ON c.id = b.car_id
    WHERE b.id = p_booking_id
    AND (b.renter_id = auth.uid() OR c.owner_id = auth.uid())
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  SELECT COUNT(*) INTO v_total
  FROM vehicle_location_history
  WHERE booking_id = p_booking_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'latitude', latitude,
    'longitude', longitude,
    'speed', speed,
    'heading', heading,
    'recorded_at', recorded_at
  ) ORDER BY recorded_at DESC), '[]'::jsonb)
  INTO v_locations
  FROM vehicle_location_history
  WHERE booking_id = p_booking_id
  ORDER BY recorded_at DESC
  LIMIT p_limit OFFSET p_offset;

  RETURN jsonb_build_object(
    'success', true,
    'total', v_total,
    'locations', v_locations
  );
END;
$$;

-- Function to create default geofence for a booking
CREATE OR REPLACE FUNCTION public.create_default_geofence(
  p_booking_id UUID
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_booking RECORD;
  v_car RECORD;
  v_geofence_id UUID;
  v_radius INTEGER := 50000;  -- 50km default
BEGIN
  -- Get booking and car info
  SELECT b.*, c.latitude, c.longitude INTO v_booking
  FROM bookings b
  JOIN cars c ON c.id = b.car_id
  WHERE b.id = p_booking_id;

  IF v_booking IS NULL OR v_booking.latitude IS NULL THEN
    RETURN NULL;
  END IF;

  -- Get settings if exists
  SELECT default_geofence_radius_km * 1000 INTO v_radius
  FROM booking_tracking_settings
  WHERE booking_id = p_booking_id;

  -- Create geofence centered on pickup location
  INSERT INTO geofence_zones (
    booking_id, zone_type, name,
    center_latitude, center_longitude, radius_meters,
    alert_on_exit, alert_on_enter
  ) VALUES (
    p_booking_id, 'allowed', 'Zona permitida',
    v_booking.latitude, v_booking.longitude, COALESCE(v_radius, 50000),
    TRUE, FALSE
  )
  RETURNING id INTO v_geofence_id;

  RETURN v_geofence_id;
END;
$$;

-- =============================================================================
-- 7. Trigger to create default tracking settings on booking start
-- =============================================================================

CREATE OR REPLACE FUNCTION public.setup_booking_tracking()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Only setup when booking transitions to 'in_progress'
  IF NEW.status = 'in_progress' AND (OLD.status IS NULL OR OLD.status != 'in_progress') THEN
    -- Create default tracking settings
    INSERT INTO booking_tracking_settings (booking_id)
    VALUES (NEW.id)
    ON CONFLICT (booking_id) DO NOTHING;

    -- Create default geofence
    PERFORM create_default_geofence(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trg_setup_booking_tracking ON bookings;
CREATE TRIGGER trg_setup_booking_tracking
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION setup_booking_tracking();

-- =============================================================================
-- 8. Views
-- =============================================================================

-- View for active tracking sessions
CREATE OR REPLACE VIEW public.v_active_vehicle_tracking AS
SELECT
  b.id AS booking_id,
  b.car_id,
  b.renter_id,
  c.owner_id,
  b.start_at,
  b.end_at,
  c.make,
  c.model,
  c.license_plate,
  vlh.latitude,
  vlh.longitude,
  vlh.speed,
  vlh.battery_level,
  vlh.recorded_at AS last_update,
  bts.tracking_enabled,
  bts.geofencing_enabled,
  (
    SELECT COUNT(*) FROM geofence_alerts ga
    WHERE ga.booking_id = b.id AND ga.acknowledged = FALSE
  ) AS unacknowledged_alerts
FROM bookings b
JOIN cars c ON c.id = b.car_id
LEFT JOIN booking_tracking_settings bts ON bts.booking_id = b.id
LEFT JOIN LATERAL (
  SELECT * FROM vehicle_location_history
  WHERE booking_id = b.id
  ORDER BY recorded_at DESC
  LIMIT 1
) vlh ON TRUE
WHERE b.status = 'in_progress';

-- Grant access
GRANT SELECT ON v_active_vehicle_tracking TO authenticated;

COMMENT ON VIEW v_active_vehicle_tracking IS
  'Active vehicle tracking sessions with latest location for in-progress bookings';
