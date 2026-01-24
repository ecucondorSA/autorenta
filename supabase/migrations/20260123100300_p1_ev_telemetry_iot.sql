-- P1: Política EV + Telemetría Real + IoT + Kill Switch
-- 1. Política EV (mínimo carga, multas por descarga profunda)
-- 2. Telemetría real del vehículo (SOC batería, no del teléfono)
-- 3. Integración dispositivo IoT
-- 4. Kill switch seguro
-- 5. Verificación de conexión (alertas si tracker cae)

-- =============================================================================
-- 1. POLÍTICA EV
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ev_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id UUID NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,

  -- Requisitos de batería
  min_return_soc INTEGER NOT NULL DEFAULT 20, -- % mínimo al devolver
  critical_soc INTEGER NOT NULL DEFAULT 10, -- % crítico (alerta)
  deep_discharge_soc INTEGER NOT NULL DEFAULT 5, -- % que causa daño

  -- Multas
  low_return_fee_per_pct DECIMAL(10, 2) DEFAULT 500, -- Multa por cada % bajo el mínimo
  deep_discharge_fee DECIMAL(10, 2) DEFAULT 50000, -- Multa fija por descarga profunda

  -- Carga
  require_return_charged BOOLEAN DEFAULT FALSE, -- Exigir que vuelva cargado
  charger_usage_included BOOLEAN DEFAULT TRUE, -- Si incluye uso de cargadores

  -- Información educativa
  charging_instructions TEXT,
  compatible_chargers TEXT[], -- Tipos compatibles: 'Type2', 'CCS', 'CHAdeMO'
  average_range_km INTEGER,

  -- Estado
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(car_id)
);

-- Multas por violación de política EV
CREATE TABLE IF NOT EXISTS public.ev_policy_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id),
  policy_id UUID NOT NULL REFERENCES public.ev_policies(id),

  violation_type TEXT NOT NULL, -- 'low_return_soc', 'deep_discharge', 'no_charge'
  recorded_soc INTEGER, -- SOC al momento de la violación
  required_soc INTEGER,

  -- Multa
  fee_amount DECIMAL(10, 2) NOT NULL,
  fee_status TEXT DEFAULT 'pending', -- 'pending', 'charged', 'waived', 'disputed'
  charged_at TIMESTAMPTZ,

  -- Evidencia
  evidence_data JSONB, -- Telemetría, fotos, etc.

  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 2. TELEMETRÍA REAL DEL VEHÍCULO (no del teléfono)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.vehicle_telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id),
  car_id UUID NOT NULL REFERENCES public.cars(id),
  device_id TEXT NOT NULL, -- ID del dispositivo IoT

  -- Batería EV
  battery_soc INTEGER, -- State of Charge (0-100%)
  battery_soh INTEGER, -- State of Health (0-100%)
  battery_temp_celsius DECIMAL(5, 2),
  estimated_range_km INTEGER,
  is_charging BOOLEAN,
  charging_power_kw DECIMAL(6, 2),
  time_to_full_minutes INTEGER,

  -- Motor/Sistema
  odometer_km INTEGER,
  is_running BOOLEAN,
  is_locked BOOLEAN,

  -- Ubicación (redundante con vehicle_location_history pero del dispositivo)
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  speed_kmh DECIMAL(6, 2),
  heading DECIMAL(5, 2),

  -- Diagnóstico
  dtc_codes TEXT[], -- Códigos de diagnóstico
  warnings JSONB, -- Alertas del vehículo

  -- Conexión
  signal_strength INTEGER, -- -100 a 0 dBm
  connection_type TEXT, -- '4g', '3g', 'lte-m', 'nb-iot'

  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_telemetry_booking ON vehicle_telemetry(booking_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_telemetry_car ON vehicle_telemetry(car_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_telemetry_device ON vehicle_telemetry(device_id, recorded_at DESC);

-- =============================================================================
-- 3. DISPOSITIVOS IoT
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.iot_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT UNIQUE NOT NULL, -- IMEI o ID único
  device_type TEXT NOT NULL, -- 'obd2', 'can_adapter', 'gps_tracker', 'hardwired'
  manufacturer TEXT,
  model TEXT,
  firmware_version TEXT,

  -- Asignación
  car_id UUID REFERENCES public.cars(id),
  installed_at TIMESTAMPTZ,
  installed_by UUID REFERENCES auth.users(id),

  -- Estado
  status TEXT NOT NULL DEFAULT 'inactive', -- 'inactive', 'active', 'offline', 'error', 'tampered'
  last_seen_at TIMESTAMPTZ,
  last_location_at TIMESTAMPTZ,
  last_telemetry_at TIMESTAMPTZ,

  -- Configuración
  config JSONB DEFAULT '{}', -- Intervalo de reporte, etc.
  capabilities TEXT[], -- 'gps', 'telemetry', 'immobilizer', 'remote_lock'

  -- Autenticación
  api_key_hash TEXT, -- Hash del API key para autenticar datos
  certificate_fingerprint TEXT, -- Para mTLS

  -- Alertas
  offline_threshold_minutes INTEGER DEFAULT 15,
  alert_on_tamper BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_iot_devices_car ON iot_devices(car_id) WHERE car_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_iot_devices_status ON iot_devices(status);

-- Heartbeats de dispositivos
CREATE TABLE IF NOT EXISTS public.iot_device_heartbeats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  signal_strength INTEGER,
  battery_level INTEGER, -- Batería del dispositivo (si tiene)
  temperature DECIMAL(5, 2),
  status TEXT,
  metadata JSONB,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_device_heartbeats ON iot_device_heartbeats(device_id, received_at DESC);

-- Partición por tiempo (para alto volumen)
-- CREATE TABLE iot_device_heartbeats_y2026m01 PARTITION OF iot_device_heartbeats FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- =============================================================================
-- 4. KILL SWITCH / INMOVILIZADOR
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.immobilizer_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  car_id UUID NOT NULL REFERENCES public.cars(id),
  booking_id UUID REFERENCES public.bookings(id),

  -- Comando
  command_type TEXT NOT NULL, -- 'arm', 'disarm', 'status'
  reason TEXT NOT NULL, -- 'late_return', 'theft_suspected', 'payment_failed', 'manual'

  -- Estado
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'acknowledged', 'executed', 'failed', 'cancelled'
  sent_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  error_message TEXT,

  -- Validaciones de seguridad
  vehicle_speed_at_command DECIMAL(6, 2), -- Velocidad al enviar comando
  vehicle_stationary_confirmed BOOLEAN DEFAULT FALSE, -- Confirmación de que está detenido
  location_at_command JSONB, -- {lat, lng}

  -- Auditoría
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id), -- Para comandos que requieren aprobación
  approval_required BOOLEAN DEFAULT FALSE,

  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_immobilizer_device ON immobilizer_commands(device_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_immobilizer_pending ON immobilizer_commands(status) WHERE status = 'pending';

-- RLS
ALTER TABLE immobilizer_commands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only staff can manage immobilizer"
  ON immobilizer_commands FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- =============================================================================
-- 5. FUNCIÓN PARA ENVIAR COMANDO DE KILL SWITCH (con validaciones)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.request_immobilizer_command(
  p_car_id UUID,
  p_command_type TEXT,
  p_reason TEXT,
  p_booking_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_device RECORD;
  v_last_telemetry RECORD;
  v_command_id UUID;
  v_requires_approval BOOLEAN := FALSE;
BEGIN
  -- Verificar que el usuario es staff
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Obtener dispositivo
  SELECT * INTO v_device FROM iot_devices
  WHERE car_id = p_car_id AND status = 'active' AND 'immobilizer' = ANY(capabilities);

  IF v_device IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active immobilizer device for this car');
  END IF;

  -- Para ARM, verificar que el vehículo está detenido
  IF p_command_type = 'arm' THEN
    SELECT * INTO v_last_telemetry
    FROM vehicle_telemetry
    WHERE car_id = p_car_id
    ORDER BY recorded_at DESC
    LIMIT 1;

    IF v_last_telemetry IS NOT NULL AND v_last_telemetry.speed_kmh > 5 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Cannot arm immobilizer while vehicle is moving',
        'current_speed', v_last_telemetry.speed_kmh
      );
    END IF;

    -- Comandos de arm requieren aprobación si no es por robo
    IF p_reason != 'theft_suspected' THEN
      v_requires_approval := TRUE;
    END IF;
  END IF;

  -- Crear comando
  INSERT INTO immobilizer_commands (
    device_id, car_id, booking_id,
    command_type, reason, status,
    vehicle_speed_at_command,
    vehicle_stationary_confirmed,
    location_at_command,
    requested_by,
    approval_required
  ) VALUES (
    v_device.device_id, p_car_id, p_booking_id,
    p_command_type, p_reason,
    CASE WHEN v_requires_approval THEN 'pending_approval' ELSE 'pending' END,
    v_last_telemetry.speed_kmh,
    COALESCE(v_last_telemetry.speed_kmh, 0) < 5,
    jsonb_build_object('lat', v_last_telemetry.latitude, 'lng', v_last_telemetry.longitude),
    auth.uid(),
    v_requires_approval
  )
  RETURNING id INTO v_command_id;

  RETURN jsonb_build_object(
    'success', true,
    'command_id', v_command_id,
    'status', CASE WHEN v_requires_approval THEN 'pending_approval' ELSE 'pending' END,
    'requires_approval', v_requires_approval
  );
END;
$$;

-- =============================================================================
-- 6. VERIFICACIÓN DE CONEXIÓN (alertas si tracker cae)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.check_device_connections()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_device RECORD;
  v_booking RECORD;
  v_minutes_offline INTEGER;
BEGIN
  FOR v_device IN
    SELECT d.*, c.id as car_id
    FROM iot_devices d
    JOIN cars c ON c.id = d.car_id
    WHERE d.status = 'active'
    AND d.last_seen_at < NOW() - (d.offline_threshold_minutes || ' minutes')::INTERVAL
  LOOP
    v_minutes_offline := EXTRACT(EPOCH FROM (NOW() - v_device.last_seen_at)) / 60;

    -- Marcar como offline
    UPDATE iot_devices SET status = 'offline', updated_at = NOW() WHERE id = v_device.id;

    -- Buscar booking activo
    SELECT * INTO v_booking
    FROM bookings
    WHERE car_id = v_device.car_id AND status = 'in_progress'
    LIMIT 1;

    IF v_booking IS NOT NULL THEN
      -- Crear alerta
      PERFORM create_tracking_alert(
        v_booking.id,
        'connection_lost',
        CASE WHEN v_minutes_offline > 60 THEN 'critical' ELSE 'warning' END,
        'Conexión con dispositivo perdida',
        format('Sin señal desde hace %s minutos', v_minutes_offline),
        NULL, NULL, NULL, NULL,
        jsonb_build_object(
          'device_id', v_device.device_id,
          'last_seen_at', v_device.last_seen_at,
          'minutes_offline', v_minutes_offline
        )
      );
    END IF;
  END LOOP;
END;
$$;

-- =============================================================================
-- 7. ENDPOINT PARA RECIBIR DATOS DE IoT
-- =============================================================================

CREATE OR REPLACE FUNCTION public.ingest_iot_data(
  p_device_id TEXT,
  p_api_key TEXT,
  p_telemetry JSONB,
  p_location JSONB DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_device RECORD;
  v_car_id UUID;
  v_booking_id UUID;
  v_policy RECORD;
  v_soc INTEGER;
BEGIN
  -- Verificar dispositivo y API key
  SELECT * INTO v_device FROM iot_devices
  WHERE device_id = p_device_id
  AND api_key_hash = encode(sha256(p_api_key::bytea), 'hex');

  IF v_device IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid device or API key');
  END IF;

  v_car_id := v_device.car_id;

  -- Actualizar last_seen
  UPDATE iot_devices SET
    last_seen_at = NOW(),
    status = 'active',
    updated_at = NOW()
  WHERE id = v_device.id;

  -- Registrar heartbeat
  INSERT INTO iot_device_heartbeats (device_id, signal_strength, metadata, received_at)
  VALUES (p_device_id, (p_telemetry->>'signal_strength')::INTEGER, p_telemetry, NOW());

  -- Buscar booking activo
  SELECT id INTO v_booking_id FROM bookings
  WHERE car_id = v_car_id AND status = 'in_progress'
  LIMIT 1;

  -- Insertar telemetría
  INSERT INTO vehicle_telemetry (
    booking_id, car_id, device_id,
    battery_soc, battery_soh, battery_temp_celsius, estimated_range_km,
    is_charging, charging_power_kw, time_to_full_minutes,
    odometer_km, is_running, is_locked,
    latitude, longitude, speed_kmh, heading,
    signal_strength, connection_type,
    recorded_at
  ) VALUES (
    v_booking_id, v_car_id, p_device_id,
    (p_telemetry->>'battery_soc')::INTEGER,
    (p_telemetry->>'battery_soh')::INTEGER,
    (p_telemetry->>'battery_temp')::DECIMAL,
    (p_telemetry->>'range_km')::INTEGER,
    (p_telemetry->>'is_charging')::BOOLEAN,
    (p_telemetry->>'charging_power')::DECIMAL,
    (p_telemetry->>'time_to_full')::INTEGER,
    (p_telemetry->>'odometer')::INTEGER,
    (p_telemetry->>'is_running')::BOOLEAN,
    (p_telemetry->>'is_locked')::BOOLEAN,
    (p_location->>'lat')::DECIMAL,
    (p_location->>'lng')::DECIMAL,
    (p_location->>'speed')::DECIMAL,
    (p_location->>'heading')::DECIMAL,
    (p_telemetry->>'signal_strength')::INTEGER,
    p_telemetry->>'connection_type',
    COALESCE((p_telemetry->>'timestamp')::TIMESTAMPTZ, NOW())
  );

  -- Verificar política EV
  v_soc := (p_telemetry->>'battery_soc')::INTEGER;
  IF v_soc IS NOT NULL AND v_booking_id IS NOT NULL THEN
    SELECT * INTO v_policy FROM ev_policies WHERE car_id = v_car_id AND is_active = TRUE;

    IF v_policy IS NOT NULL THEN
      -- Alerta de batería crítica
      IF v_soc <= v_policy.critical_soc THEN
        -- Solo alertar si no hay alerta reciente
        IF NOT EXISTS (
          SELECT 1 FROM tracking_alerts
          WHERE booking_id = v_booking_id
          AND category = 'battery_low'
          AND created_at > NOW() - INTERVAL '30 minutes'
        ) THEN
          PERFORM create_tracking_alert(
            v_booking_id,
            'battery_low',
            CASE WHEN v_soc <= v_policy.deep_discharge_soc THEN 'emergency' ELSE 'critical' END,
            'Batería en nivel crítico',
            format('SOC: %s%%. Cargue el vehículo inmediatamente.', v_soc),
            (p_location->>'lat')::DECIMAL, (p_location->>'lng')::DECIMAL, NULL, NULL,
            jsonb_build_object('soc', v_soc, 'critical_soc', v_policy.critical_soc)
          );
        END IF;
      END IF;

      -- Registrar violación de descarga profunda
      IF v_soc <= v_policy.deep_discharge_soc THEN
        INSERT INTO ev_policy_violations (
          booking_id, policy_id, violation_type,
          recorded_soc, required_soc, fee_amount, evidence_data
        ) VALUES (
          v_booking_id, v_policy.id, 'deep_discharge',
          v_soc, v_policy.deep_discharge_soc, v_policy.deep_discharge_fee,
          jsonb_build_object('telemetry', p_telemetry, 'location', p_location)
        )
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'received_at', NOW());
END;
$$;

-- Permitir acceso anónimo al endpoint de IoT (autenticación por API key)
GRANT EXECUTE ON FUNCTION ingest_iot_data TO anon;
