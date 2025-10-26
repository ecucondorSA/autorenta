-- ============================================
-- SISTEMA DE SEGUROS P2P PARA AUTORENTAR
-- ============================================
-- Crea las tablas y funciones necesarias para gestionar seguros

-- 1. TABLA: Pólizas de Seguros (Flotantes y Propias)
CREATE TABLE IF NOT EXISTS insurance_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Tipo de póliza
  policy_type TEXT NOT NULL CHECK (policy_type IN ('platform_floating', 'owner_byoi')),
  
  -- Aseguradora
  insurer TEXT NOT NULL CHECK (insurer IN ('rio_uruguay', 'sancor', 'federacion_patronal', 'other')),
  
  -- Para pólizas flotantes (plataforma)
  platform_policy_number TEXT,
  platform_contract_start DATE,
  platform_contract_end DATE,
  
  -- Para pólizas propias (BYOI)
  owner_id UUID REFERENCES auth.users(id),
  car_id UUID REFERENCES cars(id),
  owner_policy_number TEXT,
  owner_policy_start DATE,
  owner_policy_end DATE,
  owner_policy_document_url TEXT,
  verified_by_admin BOOLEAN DEFAULT false,
  verification_date TIMESTAMPTZ,
  
  -- Coberturas
  liability_coverage_amount BIGINT DEFAULT 160000000, -- RC en pesos
  own_damage_coverage BOOLEAN DEFAULT true,
  theft_coverage BOOLEAN DEFAULT true,
  fire_coverage BOOLEAN DEFAULT true,
  misappropriation_coverage BOOLEAN DEFAULT true,
  misappropriation_limit BIGINT DEFAULT 25000000,
  
  -- Franquicia
  deductible_type TEXT CHECK (deductible_type IN ('percentage', 'fixed')),
  deductible_percentage NUMERIC(5,2), -- ej: 5.00 para 5%
  deductible_fixed_amount BIGINT,
  deductible_min_amount BIGINT DEFAULT 500000,
  
  -- Costos
  daily_premium BIGINT, -- Costo diario para seguro flotante
  annual_premium BIGINT, -- Costo anual para BYOI
  
  -- Estado
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'pending_verification')),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_insurance_policies_owner ON insurance_policies(owner_id);
CREATE INDEX IF NOT EXISTS idx_insurance_policies_car ON insurance_policies(car_id);
CREATE INDEX IF NOT EXISTS idx_insurance_policies_type ON insurance_policies(policy_type);
CREATE INDEX IF NOT EXISTS idx_insurance_policies_status ON insurance_policies(status);

-- 2. TABLA: Coberturas Activas por Reserva
CREATE TABLE IF NOT EXISTS booking_insurance_coverage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  policy_id UUID NOT NULL REFERENCES insurance_policies(id),
  
  -- Fechas de cobertura
  coverage_start TIMESTAMPTZ NOT NULL,
  coverage_end TIMESTAMPTZ NOT NULL,
  
  -- Detalles de la cobertura activa
  liability_coverage BIGINT NOT NULL,
  deductible_amount BIGINT NOT NULL,
  daily_premium_charged BIGINT, -- Solo si es flotante
  
  -- Certificado digital
  certificate_number TEXT,
  certificate_url TEXT,
  
  -- Estado
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  activated_at TIMESTAMPTZ DEFAULT now(),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_insurance_booking ON booking_insurance_coverage(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_insurance_policy ON booking_insurance_coverage(policy_id);

-- 3. TABLA: Add-ons de Seguro (opcionales)
CREATE TABLE IF NOT EXISTS insurance_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  addon_type TEXT NOT NULL CHECK (addon_type IN (
    'rc_ampliada', 
    'reduccion_franquicia', 
    'paises_limitrofes', 
    'neumaticos', 
    'equipaje'
  )),
  daily_cost BIGINT NOT NULL,
  benefit_amount BIGINT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seedear add-ons básicos
INSERT INTO insurance_addons (name, description, addon_type, daily_cost, benefit_amount) VALUES
('RC Ampliada 300M', 'Aumenta Responsabilidad Civil hasta $300M', 'rc_ampliada', 2000, 300000000),
('Protección Premium', 'Reduce franquicia a $100.000 fijos', 'reduccion_franquicia', 4000, 100000),
('Cobertura Países Limítrofes', 'Uruguay, Chile, Brasil', 'paises_limitrofes', 5000, NULL),
('Protección Neumáticos', 'Cubre pinchazos y reventones', 'neumaticos', 1500, NULL),
('Seguro Equipaje', 'Hasta $500.000', 'equipaje', 1000, 500000)
ON CONFLICT DO NOTHING;

-- 4. TABLA: Add-ons contratados por reserva
CREATE TABLE IF NOT EXISTS booking_insurance_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  addon_id UUID NOT NULL REFERENCES insurance_addons(id),
  daily_cost BIGINT NOT NULL,
  total_cost BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_addons_booking ON booking_insurance_addons(booking_id);

-- 5. TABLA: Siniestros (Claims)
CREATE TABLE IF NOT EXISTS insurance_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  policy_id UUID NOT NULL REFERENCES insurance_policies(id),
  
  -- Reportado por
  reported_by UUID NOT NULL REFERENCES auth.users(id),
  reporter_role TEXT CHECK (reporter_role IN ('driver', 'owner')),
  
  -- Tipo de siniestro
  claim_type TEXT NOT NULL CHECK (claim_type IN (
    'collision', 'theft', 'fire', 'vandalism', 'misappropriation', 'other'
  )),
  
  -- Descripción
  description TEXT NOT NULL,
  location TEXT,
  incident_date TIMESTAMPTZ NOT NULL,
  
  -- Evidencia
  photos JSONB DEFAULT '[]'::jsonb,
  police_report_number TEXT,
  police_report_url TEXT,
  
  -- Montos
  estimated_damage_amount BIGINT,
  deductible_charged BIGINT,
  insurance_payout BIGINT,
  
  -- Gestión
  assigned_adjuster TEXT, -- Gestor asignado
  adjuster_contact TEXT,
  
  -- Estado
  status TEXT DEFAULT 'reported' CHECK (status IN (
    'reported', 'under_review', 'approved', 'rejected', 'paid', 'closed'
  )),
  
  -- Resolución
  resolution_notes TEXT,
  closed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_claims_booking ON insurance_claims(booking_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON insurance_claims(status);
CREATE INDEX IF NOT EXISTS idx_claims_reported_by ON insurance_claims(reported_by);

-- 6. TABLA: Inspecciones Pre/Post Alquiler
CREATE TABLE IF NOT EXISTS vehicle_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  car_id UUID NOT NULL REFERENCES cars(id),
  
  -- Tipo de inspección
  inspection_type TEXT NOT NULL CHECK (inspection_type IN ('pre_rental', 'post_rental')),
  
  -- Quién inspecciona
  inspector_id UUID NOT NULL REFERENCES auth.users(id),
  inspector_role TEXT CHECK (inspector_role IN ('driver', 'owner')),
  
  -- Datos de la inspección
  odometer_reading INTEGER,
  fuel_level INTEGER CHECK (fuel_level >= 0 AND fuel_level <= 100),
  
  -- Fotos 360
  photos_360 JSONB DEFAULT '[]'::jsonb, -- URLs de fotos con metadata
  
  -- Daños detectados
  damages_detected JSONB DEFAULT '[]'::jsonb, -- [{type, location, severity, photo_url}]
  
  -- IA de detección (futuro)
  ai_analysis JSONB DEFAULT '{}'::jsonb,
  ai_detected_damages JSONB DEFAULT '[]'::jsonb,
  
  -- Firma digital
  signature_data TEXT,
  signed_at TIMESTAMPTZ,
  
  -- GPS
  inspection_location GEOGRAPHY(POINT),
  
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inspections_booking ON vehicle_inspections(booking_id);
CREATE INDEX IF NOT EXISTS idx_inspections_type ON vehicle_inspections(inspection_type);

-- 7. EXTENDER TABLA CARS: Agregar columna de seguro propio
ALTER TABLE cars 
ADD COLUMN IF NOT EXISTS has_owner_insurance BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS owner_insurance_policy_id UUID REFERENCES insurance_policies(id);

-- 8. EXTENDER TABLA BOOKINGS: Agregar campos de seguro
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS insurance_coverage_id UUID REFERENCES booking_insurance_coverage(id),
ADD COLUMN IF NOT EXISTS insurance_premium_total BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS security_deposit_amount BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS deposit_held BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS deposit_released_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS has_active_claim BOOLEAN DEFAULT false;

-- ============================================
-- FUNCIONES RPC
-- ============================================

-- FUNCIÓN: Calcular franquicia según valor del auto
CREATE OR REPLACE FUNCTION calculate_deductible(
  p_car_id UUID,
  p_policy_id UUID
) RETURNS BIGINT AS $$
DECLARE
  v_car_value BIGINT;
  v_deductible_type TEXT;
  v_deductible_percentage NUMERIC;
  v_deductible_fixed BIGINT;
  v_deductible_min BIGINT;
  v_calculated BIGINT;
BEGIN
  -- Obtener valor del auto
  SELECT price_per_day * 30 INTO v_car_value FROM cars WHERE id = p_car_id;
  
  -- Obtener configuración de franquicia
  SELECT 
    deductible_type, 
    deductible_percentage, 
    deductible_fixed_amount,
    deductible_min_amount
  INTO 
    v_deductible_type, 
    v_deductible_percentage, 
    v_deductible_fixed,
    v_deductible_min
  FROM insurance_policies WHERE id = p_policy_id;
  
  -- Calcular
  IF v_deductible_type = 'percentage' THEN
    v_calculated := (v_car_value * v_deductible_percentage / 100)::BIGINT;
    IF v_calculated < v_deductible_min THEN
      v_calculated := v_deductible_min;
    END IF;
  ELSE
    v_calculated := v_deductible_fixed;
  END IF;
  
  RETURN v_calculated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FUNCIÓN: Activar cobertura de seguro para una reserva
CREATE OR REPLACE FUNCTION activate_insurance_coverage(
  p_booking_id UUID,
  p_addon_ids UUID[] DEFAULT ARRAY[]::UUID[]
) RETURNS UUID AS $$
DECLARE
  v_car_id UUID;
  v_policy_id UUID;
  v_policy_type TEXT;
  v_start_date TIMESTAMPTZ;
  v_end_date TIMESTAMPTZ;
  v_rental_days INTEGER;
  v_daily_premium BIGINT;
  v_deductible BIGINT;
  v_liability BIGINT;
  v_coverage_id UUID;
  v_addons_total BIGINT := 0;
  v_addon_id UUID;
BEGIN
  -- Obtener datos de la reserva
  SELECT car_id, start_date, end_date INTO v_car_id, v_start_date, v_end_date
  FROM bookings WHERE id = p_booking_id;
  
  v_rental_days := EXTRACT(DAY FROM v_end_date - v_start_date)::INTEGER;
  IF v_rental_days < 1 THEN v_rental_days := 1; END IF;
  
  -- Determinar qué póliza usar (owner o platform)
  SELECT has_owner_insurance, owner_insurance_policy_id 
  INTO v_policy_type, v_policy_id
  FROM cars WHERE id = v_car_id;
  
  IF v_policy_type IS NULL OR v_policy_id IS NULL THEN
    -- Usar póliza flotante de la plataforma (default)
    SELECT id INTO v_policy_id 
    FROM insurance_policies 
    WHERE policy_type = 'platform_floating' 
      AND status = 'active'
      AND insurer = 'rio_uruguay' -- Priorizar RUS
    LIMIT 1;
  END IF;
  
  -- Obtener datos de la póliza
  SELECT 
    daily_premium, 
    liability_coverage_amount
  INTO v_daily_premium, v_liability
  FROM insurance_policies WHERE id = v_policy_id;
  
  -- Calcular franquicia
  v_deductible := calculate_deductible(v_car_id, v_policy_id);
  
  -- Crear cobertura
  INSERT INTO booking_insurance_coverage (
    booking_id,
    policy_id,
    coverage_start,
    coverage_end,
    liability_coverage,
    deductible_amount,
    daily_premium_charged,
    certificate_number,
    status
  ) VALUES (
    p_booking_id,
    v_policy_id,
    v_start_date,
    v_end_date,
    v_liability,
    v_deductible,
    v_daily_premium * v_rental_days,
    'CERT-' || upper(substring(gen_random_uuid()::text, 1, 8)),
    'active'
  ) RETURNING id INTO v_coverage_id;
  
  -- Agregar add-ons si los hay
  IF array_length(p_addon_ids, 1) > 0 THEN
    FOREACH v_addon_id IN ARRAY p_addon_ids LOOP
      INSERT INTO booking_insurance_addons (booking_id, addon_id, daily_cost, total_cost)
      SELECT 
        p_booking_id, 
        v_addon_id, 
        daily_cost,
        daily_cost * v_rental_days
      FROM insurance_addons WHERE id = v_addon_id;
      
      v_addons_total := v_addons_total + (SELECT daily_cost * v_rental_days FROM insurance_addons WHERE id = v_addon_id);
    END LOOP;
  END IF;
  
  -- Actualizar booking
  UPDATE bookings SET
    insurance_coverage_id = v_coverage_id,
    insurance_premium_total = (v_daily_premium * v_rental_days) + v_addons_total,
    security_deposit_amount = v_deductible
  WHERE id = p_booking_id;
  
  RETURN v_coverage_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FUNCIÓN: Reportar siniestro
CREATE OR REPLACE FUNCTION report_insurance_claim(
  p_booking_id UUID,
  p_claim_type TEXT,
  p_description TEXT,
  p_incident_date TIMESTAMPTZ,
  p_location TEXT DEFAULT NULL,
  p_photos JSONB DEFAULT '[]'::jsonb
) RETURNS UUID AS $$
DECLARE
  v_claim_id UUID;
  v_policy_id UUID;
  v_reporter_id UUID;
  v_car_owner_id UUID;
  v_driver_id UUID;
  v_reporter_role TEXT;
BEGIN
  -- Obtener IDs relevantes
  SELECT 
    b.user_id,
    c.owner_id,
    bic.policy_id
  INTO 
    v_driver_id,
    v_car_owner_id,
    v_policy_id
  FROM bookings b
  JOIN cars c ON b.car_id = c.id
  LEFT JOIN booking_insurance_coverage bic ON b.id = bic.booking_id
  WHERE b.id = p_booking_id;
  
  -- Determinar quién reporta
  v_reporter_id := auth.uid();
  IF v_reporter_id = v_driver_id THEN
    v_reporter_role := 'driver';
  ELSIF v_reporter_id = v_car_owner_id THEN
    v_reporter_role := 'owner';
  ELSE
    RAISE EXCEPTION 'Usuario no autorizado para reportar siniestro';
  END IF;
  
  -- Crear siniestro
  INSERT INTO insurance_claims (
    booking_id,
    policy_id,
    reported_by,
    reporter_role,
    claim_type,
    description,
    location,
    incident_date,
    photos,
    status
  ) VALUES (
    p_booking_id,
    v_policy_id,
    v_reporter_id,
    v_reporter_role,
    p_claim_type,
    p_description,
    p_location,
    p_incident_date,
    p_photos,
    'reported'
  ) RETURNING id INTO v_claim_id;
  
  -- Marcar booking con claim activo
  UPDATE bookings SET has_active_claim = true WHERE id = p_booking_id;
  
  -- TODO: Enviar notificación a aseguradora (webhook/email)
  
  RETURN v_claim_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE insurance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_insurance_coverage ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_insurance_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_inspections ENABLE ROW LEVEL SECURITY;

-- Políticas: Todos pueden leer add-ons
CREATE POLICY "Anyone can view insurance add-ons"
ON insurance_addons FOR SELECT
USING (active = true);

-- Políticas: Usuarios ven sus propias pólizas
CREATE POLICY "Users can view their own policies"
ON insurance_policies FOR SELECT
USING (owner_id = auth.uid() OR policy_type = 'platform_floating');

-- Políticas: Usuarios ven cobertura de sus bookings
CREATE POLICY "Users can view coverage of their bookings"
ON booking_insurance_coverage FOR SELECT
USING (
  booking_id IN (
    SELECT id FROM bookings WHERE user_id = auth.uid()
    UNION
    SELECT b.id FROM bookings b JOIN cars c ON b.car_id = c.id WHERE c.owner_id = auth.uid()
  )
);

-- Políticas: Solo involucrados ven siniestros
CREATE POLICY "Users can view claims they're involved in"
ON insurance_claims FOR SELECT
USING (
  reported_by = auth.uid() OR
  booking_id IN (
    SELECT id FROM bookings WHERE user_id = auth.uid()
    UNION
    SELECT b.id FROM bookings b JOIN cars c ON b.car_id = c.id WHERE c.owner_id = auth.uid()
  )
);

-- Políticas: Involucrados pueden reportar siniestros
CREATE POLICY "Users can report claims for their bookings"
ON insurance_claims FOR INSERT
WITH CHECK (
  reported_by = auth.uid() AND
  booking_id IN (
    SELECT id FROM bookings WHERE user_id = auth.uid()
    UNION
    SELECT b.id FROM bookings b JOIN cars c ON b.car_id = c.id WHERE c.owner_id = auth.uid()
  )
);

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger: Auto-activar seguro al confirmar reserva
CREATE OR REPLACE FUNCTION auto_activate_insurance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    PERFORM activate_insurance_coverage(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_activate_insurance
AFTER UPDATE ON bookings
FOR EACH ROW
WHEN (NEW.status = 'confirmed' AND OLD.status != 'confirmed')
EXECUTE FUNCTION auto_activate_insurance();

-- Trigger: Actualizar updated_at
CREATE OR REPLACE FUNCTION update_insurance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_insurance_policies_timestamp
BEFORE UPDATE ON insurance_policies
FOR EACH ROW EXECUTE FUNCTION update_insurance_updated_at();

CREATE TRIGGER trigger_update_claims_timestamp
BEFORE UPDATE ON insurance_claims
FOR EACH ROW EXECUTE FUNCTION update_insurance_updated_at();

-- ============================================
-- COMENTARIOS
-- ============================================

COMMENT ON TABLE insurance_policies IS 'Pólizas de seguro: flotantes (plataforma) o propias (BYOI)';
COMMENT ON TABLE booking_insurance_coverage IS 'Cobertura activa por cada reserva';
COMMENT ON TABLE insurance_addons IS 'Add-ons opcionales de seguro';
COMMENT ON TABLE insurance_claims IS 'Siniestros reportados';
COMMENT ON TABLE vehicle_inspections IS 'Inspecciones pre/post alquiler con fotos 360';

-- ============================================
-- SEED DATA: Póliza flotante de plataforma
-- ============================================

INSERT INTO insurance_policies (
  policy_type,
  insurer,
  platform_policy_number,
  platform_contract_start,
  platform_contract_end,
  liability_coverage_amount,
  deductible_type,
  deductible_percentage,
  deductible_min_amount,
  daily_premium,
  status
) VALUES (
  'platform_floating',
  'rio_uruguay',
  'RUS-AUTORENTAR-2025-001',
  '2025-01-01',
  '2025-12-31',
  180000000, -- $180M
  'percentage',
  5.00, -- 5%
  500000, -- $500k mínimo
  13500, -- $13.5k por día
  'active'
)
ON CONFLICT DO NOTHING;

COMMIT;
