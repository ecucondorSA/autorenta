-- P1: Trazas Firmadas + Garantía EV
-- 1. Registro de trazas firmadas (defensa legal)
-- 2. Reparaciones solo en red oficial
-- 3. Certificado post-siniestro
-- 4. Regla de peritaje EV

-- =============================================================================
-- 1. TRAZAS FIRMADAS (DEFENSA LEGAL)
-- =============================================================================

-- Tabla de trazas con firma criptográfica
CREATE TABLE IF NOT EXISTS public.signed_event_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id),
  car_id UUID REFERENCES public.cars(id),

  -- Evento
  event_type TEXT NOT NULL, -- 'location', 'telemetry', 'geofence', 'contract', 'checkin', 'checkout', 'alert'
  event_data JSONB NOT NULL,
  event_timestamp TIMESTAMPTZ NOT NULL,

  -- Firma
  signature TEXT NOT NULL, -- Firma HMAC-SHA256 del evento
  signature_version INTEGER NOT NULL DEFAULT 1,
  previous_trace_id UUID REFERENCES public.signed_event_traces(id), -- Cadena de trazas
  previous_signature TEXT, -- Para verificar cadena

  -- Hash acumulativo (tipo Merkle)
  cumulative_hash TEXT NOT NULL,

  -- Servidor
  server_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  server_id TEXT, -- ID del servidor que procesó

  -- Verificación
  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_signed_traces_booking ON signed_event_traces(booking_id, event_timestamp);
CREATE INDEX IF NOT EXISTS idx_signed_traces_chain ON signed_event_traces(previous_trace_id);

-- Función para crear traza firmada
CREATE OR REPLACE FUNCTION public.create_signed_trace(
  p_booking_id UUID,
  p_car_id UUID,
  p_event_type TEXT,
  p_event_data JSONB,
  p_event_timestamp TIMESTAMPTZ DEFAULT NOW()
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_trace_id UUID := gen_random_uuid();
  v_previous RECORD;
  v_payload TEXT;
  v_signature TEXT;
  v_cumulative_hash TEXT;
  v_signing_key TEXT := current_setting('app.signing_key', TRUE); -- Clave de firma del servidor
BEGIN
  -- Obtener última traza de este booking
  SELECT id, signature, cumulative_hash INTO v_previous
  FROM signed_event_traces
  WHERE booking_id = p_booking_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- Construir payload para firma
  v_payload := jsonb_build_object(
    'id', v_trace_id,
    'booking_id', p_booking_id,
    'car_id', p_car_id,
    'event_type', p_event_type,
    'event_data', p_event_data,
    'event_timestamp', p_event_timestamp,
    'previous_trace_id', v_previous.id,
    'previous_signature', v_previous.signature
  )::TEXT;

  -- Generar firma HMAC-SHA256
  v_signature := encode(
    hmac(v_payload::bytea, COALESCE(v_signing_key, 'default-key')::bytea, 'sha256'),
    'hex'
  );

  -- Calcular hash acumulativo
  v_cumulative_hash := encode(
    sha256((COALESCE(v_previous.cumulative_hash, '') || v_signature)::bytea),
    'hex'
  );

  -- Insertar traza
  INSERT INTO signed_event_traces (
    id, booking_id, car_id, event_type, event_data, event_timestamp,
    signature, previous_trace_id, previous_signature, cumulative_hash, server_id
  ) VALUES (
    v_trace_id, p_booking_id, p_car_id, p_event_type, p_event_data, p_event_timestamp,
    v_signature, v_previous.id, v_previous.signature, v_cumulative_hash,
    current_setting('app.server_id', TRUE)
  );

  RETURN v_trace_id;
END;
$$;

-- Función para verificar integridad de cadena de trazas
CREATE OR REPLACE FUNCTION public.verify_trace_chain(p_booking_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_trace RECORD;
  v_previous_hash TEXT := '';
  v_expected_hash TEXT;
  v_valid BOOLEAN := TRUE;
  v_errors JSONB := '[]';
  v_count INTEGER := 0;
BEGIN
  FOR v_trace IN
    SELECT * FROM signed_event_traces
    WHERE booking_id = p_booking_id
    ORDER BY created_at
  LOOP
    v_count := v_count + 1;

    -- Verificar que el hash acumulativo es correcto
    v_expected_hash := encode(
      sha256((v_previous_hash || v_trace.signature)::bytea),
      'hex'
    );

    IF v_expected_hash != v_trace.cumulative_hash THEN
      v_valid := FALSE;
      v_errors := v_errors || jsonb_build_object(
        'trace_id', v_trace.id,
        'error', 'Hash mismatch',
        'expected', v_expected_hash,
        'actual', v_trace.cumulative_hash
      );
    END IF;

    v_previous_hash := v_trace.cumulative_hash;
  END LOOP;

  RETURN jsonb_build_object(
    'valid', v_valid,
    'total_traces', v_count,
    'errors', v_errors,
    'final_hash', v_previous_hash,
    'verified_at', NOW()
  );
END;
$$;

-- Trigger para auto-firmar ubicaciones
CREATE OR REPLACE FUNCTION public.auto_sign_location_trace()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  PERFORM create_signed_trace(
    NEW.booking_id,
    NEW.car_id,
    'location',
    jsonb_build_object(
      'lat', NEW.latitude,
      'lng', NEW.longitude,
      'speed', NEW.speed,
      'accuracy', NEW.accuracy,
      'source', NEW.source,
      'device_id', NEW.device_id
    ),
    NEW.recorded_at
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_sign_location ON vehicle_location_history;
CREATE TRIGGER trg_auto_sign_location
  AFTER INSERT ON vehicle_location_history
  FOR EACH ROW
  EXECUTE FUNCTION auto_sign_location_trace();

-- =============================================================================
-- 2. RED OFICIAL DE REPARACIONES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.authorized_repair_shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'official_dealer', 'authorized_service', 'certified_body_shop'

  -- Marcas que atiende
  supported_brands TEXT[] NOT NULL,
  supports_ev BOOLEAN DEFAULT FALSE,

  -- Ubicación
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT,
  country TEXT NOT NULL DEFAULT 'AR',
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),

  -- Contacto
  phone TEXT,
  email TEXT,
  whatsapp TEXT,

  -- Horarios
  business_hours JSONB, -- {"mon": {"open": "08:00", "close": "18:00"}, ...}

  -- Servicios
  services TEXT[], -- 'mechanical', 'body', 'electrical', 'battery', 'glass'
  emergency_service BOOLEAN DEFAULT FALSE,
  pickup_available BOOLEAN DEFAULT FALSE,

  -- Verificación
  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  contract_number TEXT,

  -- Estado
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_repair_shops_brands ON authorized_repair_shops USING GIN(supported_brands);
CREATE INDEX IF NOT EXISTS idx_repair_shops_location ON authorized_repair_shops(city, country);
CREATE INDEX IF NOT EXISTS idx_repair_shops_ev ON authorized_repair_shops(supports_ev) WHERE supports_ev = TRUE;

-- Órdenes de reparación
CREATE TABLE IF NOT EXISTS public.repair_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,

  -- Relaciones
  booking_id UUID REFERENCES public.bookings(id),
  car_id UUID NOT NULL REFERENCES public.cars(id),
  claim_id UUID, -- Si viene de un reclamo
  shop_id UUID NOT NULL REFERENCES public.authorized_repair_shops(id),

  -- Estado
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'in_progress', 'completed', 'cancelled'

  -- Descripción
  damage_description TEXT NOT NULL,
  repair_type TEXT NOT NULL, -- 'mechanical', 'body', 'electrical', 'battery'
  is_ev_specific BOOLEAN DEFAULT FALSE,

  -- Costos
  estimated_cost DECIMAL(12, 2),
  final_cost DECIMAL(12, 2),
  covered_by_insurance BOOLEAN DEFAULT FALSE,
  insurance_claim_number TEXT,

  -- Pago
  paid_by TEXT, -- 'renter', 'owner', 'insurance', 'platform'
  payment_status TEXT DEFAULT 'pending',

  -- Tiempos
  estimated_days INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Documentos
  photos_before JSONB DEFAULT '[]',
  photos_after JSONB DEFAULT '[]',
  invoice_url TEXT,
  report_url TEXT,

  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Generar número de orden
CREATE OR REPLACE FUNCTION generate_repair_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := 'REP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
    LPAD(CAST(nextval('repair_order_seq') AS TEXT), 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS repair_order_seq START 1;

DROP TRIGGER IF EXISTS trg_repair_order_number ON repair_orders;
CREATE TRIGGER trg_repair_order_number
  BEFORE INSERT ON repair_orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_repair_order_number();

-- Función para buscar talleres cercanos
CREATE OR REPLACE FUNCTION public.find_nearby_repair_shops(
  p_latitude DECIMAL,
  p_longitude DECIMAL,
  p_brand TEXT DEFAULT NULL,
  p_ev_only BOOLEAN DEFAULT FALSE,
  p_limit INTEGER DEFAULT 10
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_agg(shop ORDER BY distance)
  INTO v_result
  FROM (
    SELECT
      jsonb_build_object(
        'id', id,
        'name', name,
        'type', type,
        'address', address,
        'city', city,
        'phone', phone,
        'supports_ev', supports_ev,
        'services', services,
        'distance_km', ROUND(
          calculate_distance_meters(p_latitude, p_longitude, latitude, longitude) / 1000,
          2
        )
      ) as shop,
      calculate_distance_meters(p_latitude, p_longitude, latitude, longitude) as distance
    FROM authorized_repair_shops
    WHERE is_active = TRUE
    AND (p_brand IS NULL OR p_brand = ANY(supported_brands))
    AND (NOT p_ev_only OR supports_ev = TRUE)
    AND latitude IS NOT NULL AND longitude IS NOT NULL
    ORDER BY calculate_distance_meters(p_latitude, p_longitude, latitude, longitude)
    LIMIT p_limit
  ) sub;

  RETURN jsonb_build_object('success', true, 'shops', COALESCE(v_result, '[]'::jsonb));
END;
$$;

-- =============================================================================
-- 3. CERTIFICADO POST-SINIESTRO
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.post_incident_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_number TEXT UNIQUE NOT NULL,

  -- Relaciones
  booking_id UUID REFERENCES public.bookings(id),
  car_id UUID NOT NULL REFERENCES public.cars(id),
  repair_order_id UUID REFERENCES public.repair_orders(id),
  claim_id UUID,

  -- Tipo de certificado
  certificate_type TEXT NOT NULL, -- 'repair_completion', 'battery_health', 'structural_integrity', 'full_inspection'

  -- Estado del vehículo post-reparación
  overall_status TEXT NOT NULL, -- 'excellent', 'good', 'acceptable', 'requires_attention'

  -- Datos específicos según tipo
  inspection_data JSONB NOT NULL,
  /*
    Para battery_health:
    {
      "soc": 95,
      "soh": 98,
      "cell_balance": "ok",
      "thermal_condition": "normal",
      "charging_capability": "full",
      "estimated_range_km": 450
    }

    Para structural_integrity:
    {
      "frame": "no_damage",
      "suspension": "ok",
      "airbags": "functional",
      "safety_systems": "operational"
    }
  */

  -- Inspector
  inspector_name TEXT NOT NULL,
  inspector_license TEXT, -- Número de matrícula del perito
  inspector_company TEXT,

  -- Documentos
  pdf_url TEXT,
  photos JSONB DEFAULT '[]',

  -- Validez
  valid_until DATE,
  is_valid BOOLEAN DEFAULT TRUE,

  -- Firma del perito
  inspector_signature_url TEXT,
  signed_at TIMESTAMPTZ,

  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Generar número de certificado
CREATE OR REPLACE FUNCTION generate_certificate_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.certificate_number := 'CERT-' ||
    CASE NEW.certificate_type
      WHEN 'battery_health' THEN 'BAT'
      WHEN 'structural_integrity' THEN 'STR'
      WHEN 'repair_completion' THEN 'REP'
      ELSE 'INS'
    END || '-' ||
    TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
    LPAD(CAST(nextval('certificate_seq') AS TEXT), 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS certificate_seq START 1;

DROP TRIGGER IF EXISTS trg_certificate_number ON post_incident_certificates;
CREATE TRIGGER trg_certificate_number
  BEFORE INSERT ON post_incident_certificates
  FOR EACH ROW
  EXECUTE FUNCTION generate_certificate_number();

-- =============================================================================
-- 4. REGLAS DE PERITAJE EV
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ev_appraisal_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,

  -- Aplica a
  vehicle_types TEXT[], -- 'bev', 'phev', 'hev'
  brands TEXT[], -- NULL = todas

  -- Componentes a inspeccionar
  inspection_points JSONB NOT NULL,
  /*
    [
      {
        "component": "battery_pack",
        "checks": ["visual", "capacity_test", "cell_balance"],
        "critical": true,
        "estimated_cost_if_damaged": 15000000
      },
      {
        "component": "charging_port",
        "checks": ["visual", "connectivity_test"],
        "critical": false,
        "estimated_cost_if_damaged": 500000
      }
    ]
  */

  -- Matriz de daños
  damage_matrix JSONB NOT NULL,
  /*
    {
      "battery_pack": {
        "minor": {"cost_pct": 5, "description": "Rayaduras superficiales"},
        "moderate": {"cost_pct": 25, "description": "Daño a celdas individuales"},
        "severe": {"cost_pct": 100, "description": "Reemplazo completo"}
      }
    }
  */

  -- Peritos autorizados
  requires_certified_appraiser BOOLEAN DEFAULT TRUE,
  appraiser_certifications TEXT[], -- 'EV_CERTIFIED', 'MANUFACTURER_TRAINED'

  -- Talleres permitidos
  requires_official_service BOOLEAN DEFAULT TRUE,

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insertar reglas default para EV
INSERT INTO ev_appraisal_rules (name, description, vehicle_types, inspection_points, damage_matrix) VALUES
(
  'Standard EV Appraisal',
  'Reglas estándar de peritaje para vehículos eléctricos',
  ARRAY['bev', 'phev'],
  '[
    {"component": "battery_pack", "checks": ["visual", "soh_test", "thermal_scan"], "critical": true, "estimated_cost_usd": 15000},
    {"component": "electric_motor", "checks": ["noise_test", "performance_test"], "critical": true, "estimated_cost_usd": 8000},
    {"component": "charging_system", "checks": ["port_inspection", "onboard_charger_test"], "critical": false, "estimated_cost_usd": 2000},
    {"component": "cooling_system", "checks": ["leak_test", "pump_function"], "critical": true, "estimated_cost_usd": 3000},
    {"component": "power_electronics", "checks": ["inverter_test", "dc_dc_converter"], "critical": true, "estimated_cost_usd": 5000},
    {"component": "12v_battery", "checks": ["voltage_test", "capacity_test"], "critical": false, "estimated_cost_usd": 500}
  ]'::JSONB,
  '{
    "battery_pack": {
      "none": {"cost_pct": 0, "action": "none"},
      "minor": {"cost_pct": 5, "action": "monitor", "description": "Daño cosmético, monitorear SOH"},
      "moderate": {"cost_pct": 30, "action": "repair", "description": "Reemplazo de módulos afectados"},
      "severe": {"cost_pct": 100, "action": "replace", "description": "Reemplazo completo del pack"}
    },
    "electric_motor": {
      "none": {"cost_pct": 0, "action": "none"},
      "minor": {"cost_pct": 10, "action": "service", "description": "Ruido anormal, revisar rodamientos"},
      "severe": {"cost_pct": 100, "action": "replace", "description": "Reemplazo de motor"}
    }
  }'::JSONB
)
ON CONFLICT (name) DO NOTHING;

-- Tabla de peritajes realizados
CREATE TABLE IF NOT EXISTS public.ev_appraisals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appraisal_number TEXT UNIQUE NOT NULL,

  -- Relaciones
  car_id UUID NOT NULL REFERENCES public.cars(id),
  booking_id UUID REFERENCES public.bookings(id),
  claim_id UUID,
  rule_id UUID REFERENCES public.ev_appraisal_rules(id),

  -- Perito
  appraiser_name TEXT NOT NULL,
  appraiser_license TEXT,
  appraiser_certifications TEXT[],
  appraiser_company TEXT,

  -- Ubicación del peritaje
  performed_at_shop_id UUID REFERENCES public.authorized_repair_shops(id),
  performed_at_address TEXT,
  performed_at TIMESTAMPTZ NOT NULL,

  -- Resultados
  status TEXT NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'completed', 'disputed'
  overall_condition TEXT, -- 'excellent', 'good', 'fair', 'poor', 'damaged'

  -- Inspección detallada
  inspection_results JSONB NOT NULL DEFAULT '{}',
  /*
    {
      "battery_pack": {
        "condition": "good",
        "soh": 96,
        "damage_level": "none",
        "notes": "Sin daños visibles, SOH dentro de parámetros",
        "photos": ["url1", "url2"]
      }
    }
  */

  -- Valoración
  total_damage_cost DECIMAL(12, 2),
  repair_recommended BOOLEAN,
  repair_cost_estimate DECIMAL(12, 2),

  -- Documentos
  full_report_url TEXT,
  photos JSONB DEFAULT '[]',

  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Generar número de peritaje
CREATE OR REPLACE FUNCTION generate_appraisal_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.appraisal_number := 'PER-EV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
    LPAD(CAST(nextval('appraisal_seq') AS TEXT), 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS appraisal_seq START 1;

DROP TRIGGER IF EXISTS trg_appraisal_number ON ev_appraisals;
CREATE TRIGGER trg_appraisal_number
  BEFORE INSERT ON ev_appraisals
  FOR EACH ROW
  EXECUTE FUNCTION generate_appraisal_number();

-- =============================================================================
-- 5. FUNCIÓN PARA GENERAR REPORTE COMPLETO POST-SINIESTRO
-- =============================================================================

CREATE OR REPLACE FUNCTION public.generate_post_incident_report(
  p_booking_id UUID,
  p_include_appraisal BOOLEAN DEFAULT TRUE
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_booking RECORD;
  v_car RECORD;
  v_evidence RECORD;
  v_certificate RECORD;
  v_appraisal RECORD;
  v_repair RECORD;
  v_trace_verification JSONB;
BEGIN
  -- Obtener booking
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id;
  IF v_booking IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;

  -- Obtener auto
  SELECT * INTO v_car FROM cars WHERE id = v_booking.car_id;

  -- Verificar trazas
  v_trace_verification := verify_trace_chain(p_booking_id);

  -- Obtener evidencia
  SELECT * INTO v_evidence FROM evidence_packages
  WHERE booking_id = p_booking_id AND status = 'sealed'
  ORDER BY created_at DESC LIMIT 1;

  -- Obtener certificados
  SELECT * INTO v_certificate FROM post_incident_certificates
  WHERE booking_id = p_booking_id
  ORDER BY created_at DESC LIMIT 1;

  -- Obtener peritaje
  SELECT * INTO v_appraisal FROM ev_appraisals
  WHERE booking_id = p_booking_id
  ORDER BY created_at DESC LIMIT 1;

  -- Obtener reparación
  SELECT * INTO v_repair FROM repair_orders
  WHERE booking_id = p_booking_id
  ORDER BY created_at DESC LIMIT 1;

  RETURN jsonb_build_object(
    'success', true,
    'report_generated_at', NOW(),
    'booking', jsonb_build_object(
      'id', v_booking.id,
      'start_at', v_booking.start_at,
      'end_at', v_booking.end_at,
      'status', v_booking.status
    ),
    'vehicle', jsonb_build_object(
      'id', v_car.id,
      'brand', v_car.brand,
      'model', v_car.model,
      'plate', v_car.plate,
      'is_ev', v_car.fuel_type IN ('electric', 'hybrid')
    ),
    'trace_verification', v_trace_verification,
    'evidence_package', CASE WHEN v_evidence IS NOT NULL THEN jsonb_build_object(
      'id', v_evidence.id,
      'status', v_evidence.status,
      'integrity_hash', v_evidence.integrity_hash,
      'sealed_at', v_evidence.sealed_at
    ) ELSE NULL END,
    'certificate', CASE WHEN v_certificate IS NOT NULL THEN jsonb_build_object(
      'number', v_certificate.certificate_number,
      'type', v_certificate.certificate_type,
      'status', v_certificate.overall_status,
      'inspector', v_certificate.inspector_name
    ) ELSE NULL END,
    'appraisal', CASE WHEN v_appraisal IS NOT NULL THEN jsonb_build_object(
      'number', v_appraisal.appraisal_number,
      'condition', v_appraisal.overall_condition,
      'damage_cost', v_appraisal.total_damage_cost,
      'appraiser', v_appraisal.appraiser_name
    ) ELSE NULL END,
    'repair', CASE WHEN v_repair IS NOT NULL THEN jsonb_build_object(
      'number', v_repair.order_number,
      'status', v_repair.status,
      'cost', v_repair.final_cost
    ) ELSE NULL END
  );
END;
$$;
