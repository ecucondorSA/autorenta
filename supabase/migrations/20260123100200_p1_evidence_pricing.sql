-- P1: Pipeline de Evidencia Unificado + Matriz de Tarifas
-- 1. Evidence packages para reclamos legales
-- 2. Matriz de tarifas por auto/temporada/riesgo

-- =============================================================================
-- 1. PIPELINE DE EVIDENCIA UNIFICADO
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.evidence_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,

  -- Razón del paquete
  purpose TEXT NOT NULL, -- 'claim', 'dispute', 'legal', 'insurance', 'audit'
  status TEXT NOT NULL DEFAULT 'collecting', -- 'collecting', 'complete', 'sealed', 'submitted'

  -- Hash de integridad (se genera al sellar)
  integrity_hash TEXT,
  sealed_at TIMESTAMPTZ,
  sealed_by UUID REFERENCES auth.users(id),

  -- Metadata
  notes TEXT,
  submitted_to TEXT, -- 'insurance', 'legal', 'police'
  submitted_at TIMESTAMPTZ,
  case_reference TEXT, -- Número de caso externo

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_packages_booking ON evidence_packages(booking_id);

-- Items de evidencia dentro del paquete
CREATE TABLE IF NOT EXISTS public.evidence_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES public.evidence_packages(id) ON DELETE CASCADE,

  -- Tipo de evidencia
  evidence_type TEXT NOT NULL, -- 'kyc', 'contract', 'gps_track', 'photo', 'video', 'geofence_alert', 'speed_alert', 'communication'
  category TEXT, -- Subcategoría: 'document_front', 'checkin_exterior', etc.

  -- Contenido
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT, -- URL en storage
  file_hash TEXT, -- SHA256 del archivo
  file_size INTEGER,
  mime_type TEXT,

  -- Datos estructurados (para evidencia que no es archivo)
  data JSONB,

  -- Timestamp original del evento
  event_at TIMESTAMPTZ NOT NULL,

  -- Verificación
  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_items_package ON evidence_items(package_id);
CREATE INDEX IF NOT EXISTS idx_evidence_items_type ON evidence_items(evidence_type);

ALTER TABLE evidence_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_items ENABLE ROW LEVEL SECURITY;

-- Staff y participantes pueden ver
CREATE POLICY "Evidence access"
  ON evidence_packages FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM bookings b
      JOIN cars c ON c.id = b.car_id
      WHERE b.id = evidence_packages.booking_id
      AND (b.renter_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );

CREATE POLICY "Evidence items access"
  ON evidence_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM evidence_packages ep
      WHERE ep.id = evidence_items.package_id
      AND (
        EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
        OR EXISTS (
          SELECT 1 FROM bookings b
          JOIN cars c ON c.id = b.car_id
          WHERE b.id = ep.booking_id
          AND (b.renter_id = auth.uid() OR c.owner_id = auth.uid())
        )
      )
    )
  );

-- =============================================================================
-- 2. Función para crear paquete de evidencia completo
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_evidence_package(
  p_booking_id UUID,
  p_purpose TEXT DEFAULT 'claim'
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_package_id UUID;
  v_booking RECORD;
  v_contract RECORD;
  v_doc RECORD;
  v_location RECORD;
  v_alert RECORD;
  v_inspection RECORD;
BEGIN
  -- Crear paquete
  INSERT INTO evidence_packages (booking_id, purpose)
  VALUES (p_booking_id, p_purpose)
  RETURNING id INTO v_package_id;

  -- Obtener booking
  SELECT b.*, c.owner_id, c.brand, c.model, c.plate,
         pr.full_name as renter_name, pr.document_number as renter_doc
  INTO v_booking
  FROM bookings b
  JOIN cars c ON c.id = b.car_id
  JOIN profiles pr ON pr.id = b.renter_id
  WHERE b.id = p_booking_id;

  -- 1. KYC del renter
  FOR v_doc IN
    SELECT * FROM user_documents
    WHERE user_id = v_booking.renter_id
    AND status = 'approved'
  LOOP
    INSERT INTO evidence_items (package_id, evidence_type, category, title, file_url, event_at, data)
    VALUES (
      v_package_id, 'kyc', v_doc.document_kind,
      'Documento: ' || v_doc.document_kind,
      v_doc.file_url,
      v_doc.verified_at,
      jsonb_build_object(
        'document_kind', v_doc.document_kind,
        'verified_at', v_doc.verified_at,
        'verified_by', v_doc.verified_by
      )
    );
  END LOOP;

  -- 2. Contrato firmado
  SELECT * INTO v_contract FROM booking_contracts WHERE booking_id = p_booking_id ORDER BY signed_at DESC LIMIT 1;
  IF v_contract IS NOT NULL THEN
    INSERT INTO evidence_items (package_id, evidence_type, title, file_url, event_at, data)
    VALUES (
      v_package_id, 'contract', 'Contrato de alquiler firmado',
      v_contract.pdf_url,
      v_contract.signed_at,
      jsonb_build_object(
        'renter_ip', v_contract.renter_ip_address,
        'device_fingerprint', v_contract.renter_device_fingerprint,
        'accepted_clauses', v_contract.accepted_clauses
      )
    );
  END IF;

  -- 3. Track GPS completo
  INSERT INTO evidence_items (package_id, evidence_type, title, event_at, data)
  SELECT
    v_package_id, 'gps_track', 'Historial de ubicaciones GPS',
    MIN(recorded_at),
    jsonb_build_object(
      'total_points', COUNT(*),
      'first_location', jsonb_build_object('lat', MIN(latitude), 'lng', MIN(longitude), 'at', MIN(recorded_at)),
      'last_location', jsonb_build_object('lat', MAX(latitude), 'lng', MAX(longitude), 'at', MAX(recorded_at)),
      'max_speed_kmh', MAX(speed * 3.6),
      'locations', (
        SELECT jsonb_agg(jsonb_build_object(
          'lat', latitude, 'lng', longitude, 'speed', speed, 'at', recorded_at
        ) ORDER BY recorded_at)
        FROM vehicle_location_history
        WHERE booking_id = p_booking_id
      )
    )
  FROM vehicle_location_history
  WHERE booking_id = p_booking_id
  GROUP BY booking_id;

  -- 4. Alertas de geocerca
  FOR v_alert IN
    SELECT ta.*, gz.name as zone_name
    FROM tracking_alerts ta
    LEFT JOIN geofence_zones gz ON gz.id = ta.geofence_id
    WHERE ta.booking_id = p_booking_id
    AND ta.category IN ('geofence_exit', 'geofence_enter', 'speed_exceeded')
  LOOP
    INSERT INTO evidence_items (package_id, evidence_type, category, title, event_at, data)
    VALUES (
      v_package_id, 'geofence_alert', v_alert.category,
      v_alert.title,
      v_alert.created_at,
      jsonb_build_object(
        'category', v_alert.category,
        'severity', v_alert.severity,
        'latitude', v_alert.latitude,
        'longitude', v_alert.longitude,
        'speed_kmh', v_alert.speed_kmh,
        'zone_name', v_alert.zone_name,
        'metadata', v_alert.metadata
      )
    );
  END LOOP;

  -- 5. Fotos de check-in/out (si existen en inspections)
  FOR v_inspection IN
    SELECT * FROM booking_inspections
    WHERE booking_id = p_booking_id
  LOOP
    INSERT INTO evidence_items (package_id, evidence_type, category, title, file_url, event_at, data)
    SELECT
      v_package_id, 'photo', v_inspection.inspection_type || '_' || (photo->>'position'),
      'Foto ' || v_inspection.inspection_type || ': ' || (photo->>'position'),
      photo->>'url',
      v_inspection.created_at,
      photo
    FROM jsonb_array_elements(v_inspection.photos) AS photo;
  END LOOP;

  RETURN v_package_id;
END;
$$;

-- =============================================================================
-- 3. Función para sellar paquete (inmutable)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.seal_evidence_package(p_package_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_hash TEXT;
  v_items_json TEXT;
BEGIN
  -- Verificar que no está sellado
  IF EXISTS (SELECT 1 FROM evidence_packages WHERE id = p_package_id AND sealed_at IS NOT NULL) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Package already sealed');
  END IF;

  -- Generar hash de todos los items
  SELECT string_agg(
    COALESCE(file_hash, '') || COALESCE(data::text, '') || event_at::text,
    '|' ORDER BY created_at
  ) INTO v_items_json
  FROM evidence_items
  WHERE package_id = p_package_id;

  v_hash := encode(sha256(v_items_json::bytea), 'hex');

  -- Sellar paquete
  UPDATE evidence_packages SET
    status = 'sealed',
    integrity_hash = v_hash,
    sealed_at = NOW(),
    sealed_by = auth.uid(),
    updated_at = NOW()
  WHERE id = p_package_id;

  RETURN jsonb_build_object(
    'success', true,
    'integrity_hash', v_hash,
    'sealed_at', NOW()
  );
END;
$$;

-- =============================================================================
-- 4. MATRIZ DE TARIFAS POR AUTO/TEMPORADA/RIESGO
-- =============================================================================

-- Temporadas
CREATE TABLE IF NOT EXISTS public.pricing_seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- 'alta', 'media', 'baja', 'feriados'
  multiplier DECIMAL(4, 2) NOT NULL DEFAULT 1.0,
  start_date DATE,
  end_date DATE,
  recurring_yearly BOOLEAN DEFAULT FALSE, -- Si se repite cada año (ej: verano)
  country TEXT DEFAULT 'AR',
  region TEXT, -- NULL = todo el país
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insertar temporadas default
INSERT INTO pricing_seasons (name, multiplier, start_date, end_date, recurring_yearly, country) VALUES
  ('Temporada Alta Verano', 1.35, '2026-12-15', '2027-02-28', TRUE, 'AR'),
  ('Temporada Alta Invierno', 1.25, '2026-07-01', '2026-07-31', TRUE, 'AR'),
  ('Semana Santa', 1.40, '2026-04-01', '2026-04-15', TRUE, 'AR'),
  ('Feriados Largos', 1.30, NULL, NULL, FALSE, 'AR'), -- Se define por fechas específicas
  ('Temporada Baja', 0.85, '2026-03-01', '2026-06-30', TRUE, 'AR')
ON CONFLICT DO NOTHING;

-- Categorías de riesgo de vehículo
CREATE TABLE IF NOT EXISTS public.vehicle_risk_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  base_multiplier DECIMAL(4, 2) NOT NULL DEFAULT 1.0,
  deposit_multiplier DECIMAL(4, 2) NOT NULL DEFAULT 1.0, -- Para calcular depósito
  min_driver_age INTEGER DEFAULT 18,
  min_driver_experience_years INTEGER DEFAULT 0,
  requires_premium_insurance BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO vehicle_risk_categories (name, description, base_multiplier, deposit_multiplier, min_driver_age, min_driver_experience_years) VALUES
  ('standard', 'Vehículos económicos y compactos', 1.0, 1.0, 18, 1),
  ('premium', 'Vehículos de gama media-alta', 1.15, 1.5, 21, 2),
  ('luxury', 'Vehículos de lujo', 1.35, 2.0, 25, 3),
  ('ev_standard', 'Vehículos eléctricos estándar', 1.10, 1.3, 21, 2),
  ('ev_premium', 'Vehículos eléctricos premium (Tesla, etc)', 1.40, 2.5, 25, 3),
  ('sport', 'Vehículos deportivos', 1.50, 3.0, 25, 5)
ON CONFLICT (name) DO NOTHING;

-- Score de riesgo del conductor
CREATE TABLE IF NOT EXISTS public.driver_risk_scores (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),

  -- Score calculado (0-100, mayor = más riesgo)
  risk_score INTEGER NOT NULL DEFAULT 50,
  risk_tier TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'blocked'

  -- Factores
  total_bookings INTEGER DEFAULT 0,
  completed_bookings INTEGER DEFAULT 0,
  late_returns INTEGER DEFAULT 0,
  speed_violations INTEGER DEFAULT 0,
  geofence_violations INTEGER DEFAULT 0,
  incidents INTEGER DEFAULT 0,
  claims_against INTEGER DEFAULT 0,
  average_rating DECIMAL(3, 2),

  -- Verificaciones
  kyc_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  payment_verified BOOLEAN DEFAULT FALSE,

  -- Multiplicador de precio resultante
  price_multiplier DECIMAL(4, 2) NOT NULL DEFAULT 1.0,
  deposit_multiplier DECIMAL(4, 2) NOT NULL DEFAULT 1.0,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Matriz de precios por auto
CREATE TABLE IF NOT EXISTS public.car_pricing_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id UUID NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,

  -- Precio base
  base_daily_price DECIMAL(10, 2) NOT NULL,
  base_weekly_price DECIMAL(10, 2),
  base_monthly_price DECIMAL(10, 2),

  -- Categoría de riesgo
  risk_category TEXT REFERENCES vehicle_risk_categories(name),

  -- Ajustes manuales del owner
  owner_season_adjustment DECIMAL(4, 2) DEFAULT 1.0, -- Multiplicador adicional
  min_price DECIMAL(10, 2), -- Precio mínimo (no bajar de esto)
  max_price DECIMAL(10, 2), -- Precio máximo

  -- Descuentos por duración
  weekly_discount_pct DECIMAL(4, 2) DEFAULT 10.0, -- 10% descuento semanal
  monthly_discount_pct DECIMAL(4, 2) DEFAULT 25.0, -- 25% descuento mensual

  -- Depósito
  base_deposit DECIMAL(10, 2) NOT NULL,

  -- Configuración
  use_dynamic_pricing BOOLEAN DEFAULT TRUE,
  use_season_pricing BOOLEAN DEFAULT TRUE,
  use_driver_risk_pricing BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(car_id)
);

-- =============================================================================
-- 5. Función para calcular precio con todos los factores
-- =============================================================================

CREATE OR REPLACE FUNCTION public.calculate_full_price(
  p_car_id UUID,
  p_renter_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_matrix RECORD;
  v_risk_cat RECORD;
  v_driver_risk RECORD;
  v_season RECORD;
  v_days INTEGER;
  v_base_price DECIMAL;
  v_final_price DECIMAL;
  v_deposit DECIMAL;
  v_multipliers JSONB := '{}';
  v_total_multiplier DECIMAL := 1.0;
BEGIN
  v_days := p_end_date - p_start_date;
  IF v_days < 1 THEN v_days := 1; END IF;

  -- Obtener matriz del auto
  SELECT * INTO v_matrix FROM car_pricing_matrix WHERE car_id = p_car_id;

  IF v_matrix IS NULL THEN
    -- Fallback a precio del auto directamente
    SELECT daily_rate, daily_rate * 0.3 INTO v_base_price, v_deposit
    FROM cars WHERE id = p_car_id;

    IF v_base_price IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Car not found');
    END IF;

    v_matrix.base_daily_price := v_base_price;
    v_matrix.base_deposit := v_deposit;
    v_matrix.use_dynamic_pricing := FALSE;
    v_matrix.use_season_pricing := FALSE;
    v_matrix.use_driver_risk_pricing := FALSE;
  END IF;

  v_base_price := v_matrix.base_daily_price;
  v_deposit := v_matrix.base_deposit;

  -- 1. Multiplicador por categoría de vehículo
  IF v_matrix.risk_category IS NOT NULL THEN
    SELECT * INTO v_risk_cat FROM vehicle_risk_categories WHERE name = v_matrix.risk_category;
    IF v_risk_cat IS NOT NULL THEN
      v_total_multiplier := v_total_multiplier * v_risk_cat.base_multiplier;
      v_deposit := v_deposit * v_risk_cat.deposit_multiplier;
      v_multipliers := v_multipliers || jsonb_build_object('vehicle_category', v_risk_cat.base_multiplier);
    END IF;
  END IF;

  -- 2. Multiplicador por temporada
  IF v_matrix.use_season_pricing THEN
    SELECT * INTO v_season
    FROM pricing_seasons
    WHERE is_active = TRUE
    AND (
      (recurring_yearly = FALSE AND p_start_date BETWEEN start_date AND end_date)
      OR (recurring_yearly = TRUE AND
          EXTRACT(MONTH FROM p_start_date) BETWEEN EXTRACT(MONTH FROM start_date) AND EXTRACT(MONTH FROM end_date))
    )
    ORDER BY multiplier DESC
    LIMIT 1;

    IF v_season IS NOT NULL THEN
      v_total_multiplier := v_total_multiplier * v_season.multiplier;
      v_multipliers := v_multipliers || jsonb_build_object('season', v_season.multiplier, 'season_name', v_season.name);
    END IF;
  END IF;

  -- 3. Multiplicador por riesgo del conductor
  IF v_matrix.use_driver_risk_pricing AND p_renter_id IS NOT NULL THEN
    SELECT * INTO v_driver_risk FROM driver_risk_scores WHERE user_id = p_renter_id;
    IF v_driver_risk IS NOT NULL THEN
      v_total_multiplier := v_total_multiplier * v_driver_risk.price_multiplier;
      v_deposit := v_deposit * v_driver_risk.deposit_multiplier;
      v_multipliers := v_multipliers || jsonb_build_object(
        'driver_risk', v_driver_risk.price_multiplier,
        'driver_tier', v_driver_risk.risk_tier
      );
    END IF;
  END IF;

  -- 4. Ajuste del owner
  IF v_matrix.owner_season_adjustment IS NOT NULL AND v_matrix.owner_season_adjustment != 1.0 THEN
    v_total_multiplier := v_total_multiplier * v_matrix.owner_season_adjustment;
    v_multipliers := v_multipliers || jsonb_build_object('owner_adjustment', v_matrix.owner_season_adjustment);
  END IF;

  -- Calcular precio final
  v_final_price := v_base_price * v_total_multiplier * v_days;

  -- Aplicar descuentos por duración
  IF v_days >= 30 AND v_matrix.monthly_discount_pct > 0 THEN
    v_final_price := v_final_price * (1 - v_matrix.monthly_discount_pct / 100);
    v_multipliers := v_multipliers || jsonb_build_object('monthly_discount', v_matrix.monthly_discount_pct);
  ELSIF v_days >= 7 AND v_matrix.weekly_discount_pct > 0 THEN
    v_final_price := v_final_price * (1 - v_matrix.weekly_discount_pct / 100);
    v_multipliers := v_multipliers || jsonb_build_object('weekly_discount', v_matrix.weekly_discount_pct);
  END IF;

  -- Aplicar límites
  IF v_matrix.min_price IS NOT NULL AND v_final_price < v_matrix.min_price * v_days THEN
    v_final_price := v_matrix.min_price * v_days;
  END IF;
  IF v_matrix.max_price IS NOT NULL AND v_final_price > v_matrix.max_price * v_days THEN
    v_final_price := v_matrix.max_price * v_days;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'base_daily_price', v_base_price,
    'days', v_days,
    'total_multiplier', ROUND(v_total_multiplier, 4),
    'multipliers', v_multipliers,
    'subtotal', ROUND(v_base_price * v_days, 2),
    'final_price', ROUND(v_final_price, 2),
    'daily_effective_price', ROUND(v_final_price / v_days, 2),
    'deposit', ROUND(v_deposit, 2)
  );
END;
$$;

-- =============================================================================
-- 6. Función para actualizar score de riesgo del conductor
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_driver_risk_score(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_score INTEGER := 50;
  v_tier TEXT := 'medium';
  v_price_mult DECIMAL := 1.0;
  v_deposit_mult DECIMAL := 1.0;
  v_stats RECORD;
BEGIN
  -- Obtener estadísticas
  SELECT
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'completed') as completed,
    COUNT(*) FILTER (WHERE status = 'completed' AND actual_end_at > end_at + INTERVAL '30 minutes') as late,
    COALESCE(AVG(owner_rating), 0) as avg_rating
  INTO v_stats
  FROM bookings
  WHERE renter_id = p_user_id;

  -- Obtener violaciones
  SELECT
    COUNT(*) FILTER (WHERE category = 'speed_exceeded') as speed_violations,
    COUNT(*) FILTER (WHERE category IN ('geofence_exit', 'geofence_enter')) as geo_violations
  INTO v_stats
  FROM tracking_alerts ta
  JOIN bookings b ON b.id = ta.booking_id
  WHERE b.renter_id = p_user_id;

  -- Calcular score (menor = mejor)
  v_score := 50;

  -- Bonificaciones (reducen score)
  IF v_stats.completed > 5 THEN v_score := v_score - 10; END IF;
  IF v_stats.completed > 20 THEN v_score := v_score - 10; END IF;
  IF v_stats.avg_rating > 4.5 THEN v_score := v_score - 15; END IF;
  IF v_stats.avg_rating > 4.0 THEN v_score := v_score - 5; END IF;

  -- Penalizaciones (aumentan score)
  v_score := v_score + (v_stats.late * 5);
  v_score := v_score + (v_stats.speed_violations * 3);
  v_score := v_score + (v_stats.geo_violations * 8);

  -- Limitar
  IF v_score < 0 THEN v_score := 0; END IF;
  IF v_score > 100 THEN v_score := 100; END IF;

  -- Determinar tier y multiplicadores
  IF v_score <= 25 THEN
    v_tier := 'low';
    v_price_mult := 0.95;
    v_deposit_mult := 0.8;
  ELSIF v_score <= 50 THEN
    v_tier := 'medium';
    v_price_mult := 1.0;
    v_deposit_mult := 1.0;
  ELSIF v_score <= 75 THEN
    v_tier := 'high';
    v_price_mult := 1.15;
    v_deposit_mult := 1.5;
  ELSE
    v_tier := 'blocked';
    v_price_mult := 999; -- Efectivamente bloquea
    v_deposit_mult := 999;
  END IF;

  -- Upsert
  INSERT INTO driver_risk_scores (
    user_id, risk_score, risk_tier, price_multiplier, deposit_multiplier,
    total_bookings, completed_bookings, late_returns,
    speed_violations, geofence_violations, average_rating,
    updated_at
  ) VALUES (
    p_user_id, v_score, v_tier, v_price_mult, v_deposit_mult,
    v_stats.total, v_stats.completed, v_stats.late,
    v_stats.speed_violations, v_stats.geo_violations, v_stats.avg_rating,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    risk_score = EXCLUDED.risk_score,
    risk_tier = EXCLUDED.risk_tier,
    price_multiplier = EXCLUDED.price_multiplier,
    deposit_multiplier = EXCLUDED.deposit_multiplier,
    total_bookings = EXCLUDED.total_bookings,
    completed_bookings = EXCLUDED.completed_bookings,
    late_returns = EXCLUDED.late_returns,
    speed_violations = EXCLUDED.speed_violations,
    geofence_violations = EXCLUDED.geofence_violations,
    average_rating = EXCLUDED.average_rating,
    updated_at = NOW();
END;
$$;
