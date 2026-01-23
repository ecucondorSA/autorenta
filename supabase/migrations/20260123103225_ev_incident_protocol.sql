-- Migration: EV Incident Protocol System
-- Description: Creates tables and functions for step-by-step EV incident documentation
-- Date: 2026-01-23

-- =============================================================================
-- EV INCIDENT PROTOCOL TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS ev_incident_protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  claim_id UUID REFERENCES claims(id) ON DELETE SET NULL,
  car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,

  -- Protocol state
  sections JSONB NOT NULL DEFAULT '[]',
  current_section_index INTEGER DEFAULT 0,

  -- Risk assessment (calculated from sections)
  risk_assessment JSONB DEFAULT NULL,

  -- Timestamps
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Metadata
  initiated_by UUID NOT NULL REFERENCES auth.users(id),
  initiated_by_role TEXT NOT NULL CHECK (initiated_by_role IN ('renter', 'owner')),
  location JSONB, -- {lat, lng, address}
  device_info JSONB, -- {user_agent, platform, app_version}

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for quick lookup by booking
CREATE INDEX IF NOT EXISTS idx_ev_incident_protocols_booking_id
  ON ev_incident_protocols(booking_id);

-- Index for finding incomplete protocols
CREATE INDEX IF NOT EXISTS idx_ev_incident_protocols_incomplete
  ON ev_incident_protocols(completed_at)
  WHERE completed_at IS NULL;

-- =============================================================================
-- PROTOCOL PHOTOS TABLE (separate for storage efficiency)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ev_protocol_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id UUID NOT NULL REFERENCES ev_incident_protocols(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  metadata JSONB DEFAULT '{}', -- EXIF, dimensions, etc.
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  uploaded_by UUID NOT NULL REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_ev_protocol_photos_protocol_id
  ON ev_protocol_photos(protocol_id);

-- =============================================================================
-- EV DEALERSHIP CONTACTS (for emergency contact feature)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ev_dealership_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand TEXT NOT NULL, -- Tesla, BYD, Volkswagen, etc.
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  province TEXT,
  country TEXT DEFAULT 'AR',
  phone TEXT,
  emergency_phone TEXT,
  whatsapp TEXT,
  email TEXT,
  website TEXT,
  location GEOGRAPHY(POINT, 4326), -- PostGIS for geo queries
  service_types TEXT[] DEFAULT ARRAY['sales', 'service', 'emergency'],
  operating_hours JSONB, -- {mon: {open: "09:00", close: "18:00"}, ...}
  is_official BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Spatial index for nearby queries
CREATE INDEX IF NOT EXISTS idx_ev_dealership_location
  ON ev_dealership_contacts USING GIST (location);

-- Brand index for filtering
CREATE INDEX IF NOT EXISTS idx_ev_dealership_brand
  ON ev_dealership_contacts(brand);

-- Insert some initial dealerships (Argentina)
INSERT INTO ev_dealership_contacts (brand, name, address, city, province, phone, emergency_phone, service_types, location)
VALUES
  ('Tesla', 'Tesla Service Buenos Aires', 'Av. del Libertador 7208', 'Buenos Aires', 'CABA', '+54 11 5555-0001', '+54 11 5555-0002', ARRAY['service', 'emergency'], ST_GeographyFromText('POINT(-58.4233 -34.5512)')),
  ('BYD', 'BYD Argentina - Casa Central', 'Av. Leandro N. Alem 1110', 'Buenos Aires', 'CABA', '+54 11 5555-0010', '+54 11 5555-0011', ARRAY['sales', 'service', 'emergency'], ST_GeographyFromText('POINT(-58.3706 -34.5990)')),
  ('Volkswagen', 'VW Centro de Servicio EV', 'Av. Juan B. Justo 2500', 'Buenos Aires', 'CABA', '+54 11 5555-0020', '+54 11 5555-0021', ARRAY['service', 'emergency'], ST_GeographyFromText('POINT(-58.4505 -34.5973)')),
  ('Renault', 'Renault E-Tech Service', 'Av. Corrientes 5000', 'Buenos Aires', 'CABA', '+54 11 5555-0030', '+54 11 5555-0031', ARRAY['service', 'emergency'], ST_GeographyFromText('POINT(-58.4335 -34.6027)')),
  ('Chevrolet', 'Chevrolet EV Center', 'Av. Rivadavia 8800', 'Buenos Aires', 'CABA', '+54 11 5555-0040', '+54 11 5555-0041', ARRAY['service', 'emergency'], ST_GeographyFromText('POINT(-58.4789 -34.6263)'))
ON CONFLICT DO NOTHING;

-- =============================================================================
-- RPC FUNCTIONS
-- =============================================================================

-- Create new protocol
CREATE OR REPLACE FUNCTION create_ev_incident_protocol(
  p_booking_id UUID,
  p_claim_id UUID DEFAULT NULL,
  p_location JSONB DEFAULT NULL,
  p_device_info JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_car_id UUID;
  v_user_id UUID;
  v_user_role TEXT;
  v_protocol_id UUID;
  v_default_sections JSONB;
BEGIN
  v_user_id := auth.uid();

  -- Get car_id and determine role
  SELECT b.car_id,
    CASE
      WHEN b.renter_id = v_user_id THEN 'renter'
      WHEN c.owner_id = v_user_id THEN 'owner'
      ELSE NULL
    END
  INTO v_car_id, v_user_role
  FROM bookings b
  JOIN cars c ON c.id = b.car_id
  WHERE b.id = p_booking_id;

  IF v_car_id IS NULL THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'User is not authorized for this booking';
  END IF;

  -- Default sections structure
  v_default_sections := '[
    {
      "id": "safety",
      "step_number": 1,
      "title": "Seguridad Inmediata",
      "description": "Verificar que el área es segura antes de continuar",
      "icon": "shield-checkmark",
      "checklist": [
        {"id": "safe_parking", "question": "¿El vehículo está estacionado de forma segura?", "answer_type": "yes_no"},
        {"id": "smoke_smell", "question": "¿Hay humo, olor a quemado o chispas?", "answer_type": "yes_no", "risk_if_yes": "critical"},
        {"id": "ventilation", "question": "¿El área está ventilada?", "answer_type": "yes_no"}
      ],
      "photos_required": 1,
      "photos_uploaded": [],
      "risk_level": "green",
      "status": "pending"
    },
    {
      "id": "battery_visual",
      "step_number": 2,
      "title": "Inspección Visual de Batería",
      "description": "Revisar externamente el pack de batería",
      "icon": "battery-full",
      "checklist": [
        {"id": "deformation", "question": "¿Hay deformación visible en la batería?", "answer_type": "yes_no", "risk_if_yes": "high"},
        {"id": "cracks", "question": "¿Hay grietas o daño en la carcasa?", "answer_type": "yes_no", "risk_if_yes": "high"},
        {"id": "leaks", "question": "¿Hay fugas de líquido?", "answer_type": "yes_no", "risk_if_yes": "critical"}
      ],
      "photos_required": 4,
      "photos_uploaded": [],
      "risk_level": "green",
      "status": "pending"
    },
    {
      "id": "temperature",
      "step_number": 3,
      "title": "Control de Temperatura",
      "description": "Verificar temperaturas anómalas",
      "icon": "thermometer",
      "checklist": [
        {"id": "hot_zones", "question": "¿Alguna zona está caliente al tacto?", "answer_type": "yes_no", "risk_if_yes": "high"},
        {"id": "ambient_temp", "question": "Temperatura ambiente aproximada (°C)", "answer_type": "number"}
      ],
      "photos_required": 1,
      "photos_uploaded": [],
      "risk_level": "green",
      "status": "pending"
    },
    {
      "id": "bms",
      "step_number": 4,
      "title": "Sistema BMS",
      "description": "Verificar errores en pantalla del vehículo",
      "icon": "warning",
      "checklist": [
        {"id": "dashboard_alerts", "question": "¿Hay alertas o warnings en el tablero?", "answer_type": "yes_no", "risk_if_yes": "medium"},
        {"id": "error_codes", "question": "Códigos de error (si los hay)", "answer_type": "text"},
        {"id": "battery_level", "question": "Nivel de batería mostrado (%)", "answer_type": "number"}
      ],
      "photos_required": 2,
      "photos_uploaded": [],
      "risk_level": "green",
      "status": "pending"
    },
    {
      "id": "charging_port",
      "step_number": 5,
      "title": "Puerto de Carga",
      "description": "Inspeccionar conector y puerto de carga",
      "icon": "flash",
      "checklist": [
        {"id": "port_damage", "question": "¿Hay daño visible en el puerto de carga?", "answer_type": "yes_no", "risk_if_yes": "medium"},
        {"id": "burned_contacts", "question": "¿Los contactos están quemados o derretidos?", "answer_type": "yes_no", "risk_if_yes": "high"}
      ],
      "photos_required": 2,
      "photos_uploaded": [],
      "risk_level": "green",
      "status": "pending"
    },
    {
      "id": "cooling",
      "step_number": 6,
      "title": "Sistema de Refrigeración",
      "description": "Verificar sistema de enfriamiento de batería",
      "icon": "snow",
      "checklist": [
        {"id": "coolant_leak", "question": "¿Hay fuga de refrigerante?", "answer_type": "yes_no", "risk_if_yes": "high"},
        {"id": "hose_damage", "question": "¿Hay daño en mangueras visibles?", "answer_type": "yes_no", "risk_if_yes": "medium"}
      ],
      "photos_required": 2,
      "photos_uploaded": [],
      "risk_level": "green",
      "status": "pending"
    },
    {
      "id": "startup_test",
      "step_number": 7,
      "title": "Prueba de Encendido",
      "description": "Solo intentar si es seguro encender el vehículo",
      "icon": "power",
      "checklist": [
        {"id": "safe_to_start", "question": "¿Es seguro intentar encender el vehículo?", "answer_type": "yes_no"},
        {"id": "starts_correctly", "question": "¿El vehículo enciende correctamente?", "answer_type": "yes_no"},
        {"id": "abnormal_sounds", "question": "¿Hay sonidos o vibraciones anómalas?", "answer_type": "yes_no", "risk_if_yes": "medium"}
      ],
      "photos_required": 1,
      "photos_uploaded": [],
      "risk_level": "green",
      "status": "pending"
    },
    {
      "id": "summary",
      "step_number": 8,
      "title": "Resumen y Contacto",
      "description": "Documentar incidente y contactar servicio técnico",
      "icon": "document-text",
      "checklist": [
        {"id": "incident_description", "question": "Descripción detallada del incidente", "answer_type": "text"},
        {"id": "contacted_service", "question": "¿Se contactó al servicio técnico oficial?", "answer_type": "yes_no"}
      ],
      "photos_required": 0,
      "photos_uploaded": [],
      "risk_level": "green",
      "status": "pending"
    }
  ]'::JSONB;

  -- Create protocol
  INSERT INTO ev_incident_protocols (
    booking_id,
    claim_id,
    car_id,
    sections,
    initiated_by,
    initiated_by_role,
    location,
    device_info
  ) VALUES (
    p_booking_id,
    p_claim_id,
    v_car_id,
    v_default_sections,
    v_user_id,
    v_user_role,
    p_location,
    p_device_info
  )
  RETURNING id INTO v_protocol_id;

  RETURN v_protocol_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update section checklist answer
CREATE OR REPLACE FUNCTION update_ev_protocol_checklist(
  p_protocol_id UUID,
  p_section_id TEXT,
  p_item_id TEXT,
  p_answer JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_sections JSONB;
  v_section_index INTEGER;
  v_item_index INTEGER;
  v_updated_sections JSONB;
BEGIN
  -- Get current sections
  SELECT sections INTO v_sections
  FROM ev_incident_protocols
  WHERE id = p_protocol_id;

  IF v_sections IS NULL THEN
    RAISE EXCEPTION 'Protocol not found';
  END IF;

  -- Find section index
  SELECT ordinality - 1 INTO v_section_index
  FROM jsonb_array_elements(v_sections) WITH ORDINALITY
  WHERE value->>'id' = p_section_id;

  IF v_section_index IS NULL THEN
    RAISE EXCEPTION 'Section not found: %', p_section_id;
  END IF;

  -- Find item index in checklist
  SELECT ordinality - 1 INTO v_item_index
  FROM jsonb_array_elements(v_sections->v_section_index->'checklist') WITH ORDINALITY
  WHERE value->>'id' = p_item_id;

  IF v_item_index IS NULL THEN
    RAISE EXCEPTION 'Checklist item not found: %', p_item_id;
  END IF;

  -- Update the answer
  v_updated_sections := jsonb_set(
    v_sections,
    ARRAY[v_section_index::TEXT, 'checklist', v_item_index::TEXT, 'answer'],
    p_answer
  );

  -- Mark section as in_progress if it was pending
  IF v_updated_sections->v_section_index->>'status' = 'pending' THEN
    v_updated_sections := jsonb_set(
      v_updated_sections,
      ARRAY[v_section_index::TEXT, 'status'],
      '"in_progress"'::JSONB
    );
  END IF;

  -- Update protocol
  UPDATE ev_incident_protocols SET
    sections = v_updated_sections,
    last_updated_at = now(),
    updated_at = now()
  WHERE id = p_protocol_id;

  RETURN v_updated_sections->v_section_index;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Complete a section
CREATE OR REPLACE FUNCTION complete_ev_protocol_section(
  p_protocol_id UUID,
  p_section_id TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_sections JSONB;
  v_section_index INTEGER;
  v_section JSONB;
  v_risk_level TEXT := 'green';
  v_checklist JSONB;
  v_item JSONB;
BEGIN
  -- Get current sections
  SELECT sections INTO v_sections
  FROM ev_incident_protocols
  WHERE id = p_protocol_id;

  -- Find section index
  SELECT ordinality - 1, value INTO v_section_index, v_section
  FROM jsonb_array_elements(v_sections) WITH ORDINALITY
  WHERE value->>'id' = p_section_id;

  -- Calculate risk level based on answers
  v_checklist := v_section->'checklist';

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_checklist)
  LOOP
    IF v_item ? 'risk_if_yes' AND v_item->>'answer' = 'true' THEN
      CASE v_item->>'risk_if_yes'
        WHEN 'critical' THEN v_risk_level := 'red';
        WHEN 'high' THEN
          IF v_risk_level != 'red' THEN v_risk_level := 'red'; END IF;
        WHEN 'medium' THEN
          IF v_risk_level = 'green' THEN v_risk_level := 'yellow'; END IF;
        ELSE NULL;
      END CASE;
    END IF;
  END LOOP;

  -- Update section
  v_sections := jsonb_set(v_sections, ARRAY[v_section_index::TEXT, 'status'], '"completed"'::JSONB);
  v_sections := jsonb_set(v_sections, ARRAY[v_section_index::TEXT, 'risk_level'], to_jsonb(v_risk_level));
  v_sections := jsonb_set(v_sections, ARRAY[v_section_index::TEXT, 'completed_at'], to_jsonb(now()::TEXT));

  -- Update protocol
  UPDATE ev_incident_protocols SET
    sections = v_sections,
    current_section_index = LEAST(v_section_index + 1, 7),
    last_updated_at = now(),
    updated_at = now()
  WHERE id = p_protocol_id;

  RETURN v_sections->v_section_index;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate overall risk assessment
CREATE OR REPLACE FUNCTION calculate_ev_protocol_risk(
  p_protocol_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_sections JSONB;
  v_section JSONB;
  v_risk_counts RECORD;
  v_overall_risk TEXT;
  v_battery_safe BOOLEAN := TRUE;
  v_recommended_action TEXT;
  v_risk_assessment JSONB;
BEGIN
  SELECT sections INTO v_sections
  FROM ev_incident_protocols
  WHERE id = p_protocol_id;

  -- Count risk levels
  SELECT
    COUNT(*) FILTER (WHERE value->>'risk_level' = 'red') as red_count,
    COUNT(*) FILTER (WHERE value->>'risk_level' = 'yellow') as yellow_count,
    COUNT(*) FILTER (WHERE value->>'risk_level' = 'green') as green_count
  INTO v_risk_counts
  FROM jsonb_array_elements(v_sections);

  -- Determine overall risk
  IF v_risk_counts.red_count > 0 THEN
    v_overall_risk := 'critical';
    v_battery_safe := FALSE;
    v_recommended_action := 'NO mover el vehículo. Contactar servicio de emergencia EV inmediatamente. Mantener distancia de 10 metros.';
  ELSIF v_risk_counts.red_count = 0 AND v_risk_counts.yellow_count >= 2 THEN
    v_overall_risk := 'danger';
    v_battery_safe := FALSE;
    v_recommended_action := 'No intentar conducir. Contactar grúa especializada EV y servicio técnico oficial.';
  ELSIF v_risk_counts.yellow_count > 0 THEN
    v_overall_risk := 'caution';
    v_recommended_action := 'Conducir con precaución al servicio técnico más cercano. Evitar carga rápida.';
  ELSE
    v_overall_risk := 'safe';
    v_recommended_action := 'El vehículo parece seguro. Se recomienda revisión preventiva en próximo servicio.';
  END IF;

  v_risk_assessment := jsonb_build_object(
    'overall_risk', v_overall_risk,
    'battery_safe', v_battery_safe,
    'recommended_action', v_recommended_action,
    'red_sections', v_risk_counts.red_count,
    'yellow_sections', v_risk_counts.yellow_count,
    'green_sections', v_risk_counts.green_count,
    'calculated_at', now()
  );

  -- Update protocol with assessment
  UPDATE ev_incident_protocols SET
    risk_assessment = v_risk_assessment,
    updated_at = now()
  WHERE id = p_protocol_id;

  RETURN v_risk_assessment;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Complete entire protocol
CREATE OR REPLACE FUNCTION complete_ev_incident_protocol(
  p_protocol_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_risk_assessment JSONB;
BEGIN
  -- Calculate final risk assessment
  v_risk_assessment := calculate_ev_protocol_risk(p_protocol_id);

  -- Mark as completed
  UPDATE ev_incident_protocols SET
    completed_at = now(),
    updated_at = now()
  WHERE id = p_protocol_id;

  RETURN v_risk_assessment;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get nearby dealerships
CREATE OR REPLACE FUNCTION get_nearby_ev_dealerships(
  p_brand TEXT,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_radius_km INTEGER DEFAULT 50,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE(
  id UUID,
  brand TEXT,
  name TEXT,
  address TEXT,
  city TEXT,
  phone TEXT,
  emergency_phone TEXT,
  whatsapp TEXT,
  distance_km DOUBLE PRECISION,
  has_emergency_service BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.brand,
    d.name,
    d.address,
    d.city,
    d.phone,
    d.emergency_phone,
    d.whatsapp,
    ST_Distance(
      d.location,
      ST_GeographyFromText('POINT(' || p_lng || ' ' || p_lat || ')')
    ) / 1000 AS distance_km,
    'emergency' = ANY(d.service_types) AS has_emergency_service
  FROM ev_dealership_contacts d
  WHERE d.is_active = TRUE
    AND (p_brand IS NULL OR LOWER(d.brand) = LOWER(p_brand))
    AND ST_DWithin(
      d.location,
      ST_GeographyFromText('POINT(' || p_lng || ' ' || p_lat || ')'),
      p_radius_km * 1000
    )
  ORDER BY distance_km
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE ev_incident_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE ev_protocol_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ev_dealership_contacts ENABLE ROW LEVEL SECURITY;

-- Users can view protocols for their bookings
CREATE POLICY "Users can view own protocols"
  ON ev_incident_protocols FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = ev_incident_protocols.booking_id
      AND (b.renter_id = auth.uid() OR b.car_id IN (
        SELECT id FROM cars WHERE owner_id = auth.uid()
      ))
    )
  );

-- Users can create protocols for their bookings
CREATE POLICY "Users can create protocols for own bookings"
  ON ev_incident_protocols FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_id
      AND (b.renter_id = auth.uid() OR b.car_id IN (
        SELECT id FROM cars WHERE owner_id = auth.uid()
      ))
    )
  );

-- Users can update their own protocols
CREATE POLICY "Users can update own protocols"
  ON ev_incident_protocols FOR UPDATE
  USING (initiated_by = auth.uid());

-- Photos follow same rules as protocols
CREATE POLICY "Users can view photos for own protocols"
  ON ev_protocol_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ev_incident_protocols p
      WHERE p.id = ev_protocol_photos.protocol_id
      AND p.initiated_by = auth.uid()
    )
  );

CREATE POLICY "Users can upload photos to own protocols"
  ON ev_protocol_photos FOR INSERT
  WITH CHECK (uploaded_by = auth.uid());

-- Dealerships are public read
CREATE POLICY "Anyone can view dealerships"
  ON ev_dealership_contacts FOR SELECT
  USING (TRUE);

-- =============================================================================
-- STORAGE BUCKET FOR PROTOCOL PHOTOS
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ev-protocol-photos',
  'ev-protocol-photos',
  FALSE,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload protocol photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'ev-protocol-photos'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can view own protocol photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'ev-protocol-photos'
    AND auth.uid() IS NOT NULL
  );

-- =============================================================================
-- GRANTS
-- =============================================================================

GRANT EXECUTE ON FUNCTION create_ev_incident_protocol(UUID, UUID, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION update_ev_protocol_checklist(UUID, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_ev_protocol_section(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_ev_protocol_risk(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_ev_incident_protocol(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_nearby_ev_dealerships(TEXT, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER, INTEGER) TO authenticated;
