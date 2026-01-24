-- P1: Geocercas Configurables + Alertas Automáticas
-- Extiende el sistema de tracking existente con:
-- 1. Geocercas múltiples por reserva (no solo default)
-- 2. Alertas de salida de zona con notificación
-- 3. Alertas de exceso de velocidad con notificación
-- 4. Alertas de retorno tardío

-- =============================================================================
-- 1. Extender geofence_zones para soportar múltiples zonas personalizadas
-- =============================================================================

-- Añadir campos para geocercas más flexibles
ALTER TABLE public.geofence_zones
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#FF0000',
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS max_speed_kmh INTEGER,
ADD COLUMN IF NOT EXISTS time_restrictions JSONB; -- {"start": "08:00", "end": "20:00", "days": [1,2,3,4,5]}

COMMENT ON COLUMN geofence_zones.max_speed_kmh IS 'Límite de velocidad específico para esta zona';
COMMENT ON COLUMN geofence_zones.time_restrictions IS 'Restricciones horarias: zona solo activa en ciertos horarios';

-- =============================================================================
-- 2. Tabla de configuración de alertas por booking
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.booking_alert_config (
  booking_id UUID PRIMARY KEY REFERENCES public.bookings(id) ON DELETE CASCADE,

  -- Alertas de geocerca
  geofence_exit_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  geofence_exit_notify_owner BOOLEAN NOT NULL DEFAULT TRUE,
  geofence_exit_notify_renter BOOLEAN NOT NULL DEFAULT TRUE,
  geofence_exit_notify_support BOOLEAN NOT NULL DEFAULT FALSE,
  geofence_grace_minutes INTEGER NOT NULL DEFAULT 5, -- Tiempo antes de alertar

  -- Alertas de velocidad
  speed_alert_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  speed_limit_kmh INTEGER NOT NULL DEFAULT 120,
  speed_alert_threshold_seconds INTEGER NOT NULL DEFAULT 30, -- Debe exceder por X segundos
  speed_notify_owner BOOLEAN NOT NULL DEFAULT TRUE,
  speed_notify_renter BOOLEAN NOT NULL DEFAULT TRUE,

  -- Alertas de retorno tardío
  late_return_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  late_return_grace_minutes INTEGER NOT NULL DEFAULT 30,
  late_return_notify_owner BOOLEAN NOT NULL DEFAULT TRUE,
  late_return_escalate_support_minutes INTEGER NOT NULL DEFAULT 60, -- Escalar a soporte después de X min

  -- Alertas de conexión perdida
  connection_lost_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  connection_lost_threshold_minutes INTEGER NOT NULL DEFAULT 15,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE booking_alert_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view alert config"
  ON booking_alert_config FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN cars c ON c.id = b.car_id
      WHERE b.id = booking_alert_config.booking_id
      AND (b.renter_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );

CREATE POLICY "Owner can manage alert config"
  ON booking_alert_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN cars c ON c.id = b.car_id
      WHERE b.id = booking_alert_config.booking_id
      AND c.owner_id = auth.uid()
    )
  );

-- =============================================================================
-- 3. Extender geofence_alerts para más tipos de alertas
-- =============================================================================

-- Crear enum para tipos de alerta
DO $$ BEGIN
  CREATE TYPE alert_category AS ENUM (
    'geofence_exit',
    'geofence_enter',
    'speed_exceeded',
    'late_return',
    'connection_lost',
    'battery_low',
    'device_tamper'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tabla unificada de alertas de tracking
CREATE TABLE IF NOT EXISTS public.tracking_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,

  -- Tipo de alerta
  category TEXT NOT NULL, -- Usamos TEXT para flexibilidad
  severity TEXT NOT NULL DEFAULT 'warning', -- 'info', 'warning', 'critical', 'emergency'

  -- Contexto
  title TEXT NOT NULL,
  message TEXT,

  -- Datos del evento
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  speed_kmh DECIMAL(6, 2),
  geofence_id UUID REFERENCES public.geofence_zones(id),
  metadata JSONB DEFAULT '{}',

  -- Estado
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'acknowledged', 'resolved', 'escalated'
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT,

  -- Escalamiento
  escalated_at TIMESTAMPTZ,
  escalated_to TEXT, -- 'support', 'operations', 'legal'
  escalation_ticket_id TEXT,

  -- Notificaciones enviadas
  notifications_sent JSONB DEFAULT '[]', -- [{channel: 'push', sent_at: '...', recipient: '...'}]

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tracking_alerts_booking ON tracking_alerts(booking_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracking_alerts_active ON tracking_alerts(booking_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_tracking_alerts_category ON tracking_alerts(category, created_at DESC);

ALTER TABLE tracking_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view tracking alerts"
  ON tracking_alerts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN cars c ON c.id = b.car_id
      WHERE b.id = tracking_alerts.booking_id
      AND (b.renter_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );

-- =============================================================================
-- 4. Función para crear alertas y encolar notificaciones
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_tracking_alert(
  p_booking_id UUID,
  p_category TEXT,
  p_severity TEXT,
  p_title TEXT,
  p_message TEXT DEFAULT NULL,
  p_latitude DECIMAL DEFAULT NULL,
  p_longitude DECIMAL DEFAULT NULL,
  p_speed_kmh DECIMAL DEFAULT NULL,
  p_geofence_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_alert_id UUID;
  v_booking RECORD;
  v_config RECORD;
  v_notify_owner BOOLEAN := FALSE;
  v_notify_renter BOOLEAN := FALSE;
  v_notify_support BOOLEAN := FALSE;
BEGIN
  -- Obtener booking info
  SELECT b.*, c.owner_id, p_renter.fcm_token as renter_fcm, p_owner.fcm_token as owner_fcm
  INTO v_booking
  FROM bookings b
  JOIN cars c ON c.id = b.car_id
  LEFT JOIN profiles p_renter ON p_renter.id = b.renter_id
  LEFT JOIN profiles p_owner ON p_owner.id = c.owner_id
  WHERE b.id = p_booking_id;

  IF v_booking IS NULL THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  -- Obtener config de alertas
  SELECT * INTO v_config FROM booking_alert_config WHERE booking_id = p_booking_id;

  -- Determinar destinatarios según categoría
  CASE p_category
    WHEN 'geofence_exit' THEN
      v_notify_owner := COALESCE(v_config.geofence_exit_notify_owner, TRUE);
      v_notify_renter := COALESCE(v_config.geofence_exit_notify_renter, TRUE);
      v_notify_support := COALESCE(v_config.geofence_exit_notify_support, FALSE);
    WHEN 'speed_exceeded' THEN
      v_notify_owner := COALESCE(v_config.speed_notify_owner, TRUE);
      v_notify_renter := COALESCE(v_config.speed_notify_renter, TRUE);
    WHEN 'late_return' THEN
      v_notify_owner := COALESCE(v_config.late_return_notify_owner, TRUE);
      v_notify_renter := TRUE;
      -- Escalar a soporte si es crítico
      IF p_severity IN ('critical', 'emergency') THEN
        v_notify_support := TRUE;
      END IF;
    WHEN 'connection_lost' THEN
      v_notify_owner := TRUE;
      v_notify_support := TRUE;
    ELSE
      v_notify_owner := TRUE;
  END CASE;

  -- Crear alerta
  INSERT INTO tracking_alerts (
    booking_id, category, severity, title, message,
    latitude, longitude, speed_kmh, geofence_id, metadata
  ) VALUES (
    p_booking_id, p_category, p_severity, p_title, p_message,
    p_latitude, p_longitude, p_speed_kmh, p_geofence_id, p_metadata
  )
  RETURNING id INTO v_alert_id;

  -- Encolar notificaciones
  IF v_notify_owner THEN
    INSERT INTO notification_queue (
      user_id, type, title, body, data, priority
    ) VALUES (
      v_booking.owner_id,
      'tracking_alert',
      p_title,
      p_message,
      jsonb_build_object(
        'alert_id', v_alert_id,
        'booking_id', p_booking_id,
        'category', p_category,
        'severity', p_severity
      ),
      CASE WHEN p_severity IN ('critical', 'emergency') THEN 'high' ELSE 'normal' END
    );
  END IF;

  IF v_notify_renter THEN
    INSERT INTO notification_queue (
      user_id, type, title, body, data, priority
    ) VALUES (
      v_booking.renter_id,
      'tracking_alert',
      p_title,
      p_message,
      jsonb_build_object(
        'alert_id', v_alert_id,
        'booking_id', p_booking_id,
        'category', p_category,
        'severity', p_severity
      ),
      CASE WHEN p_severity IN ('critical', 'emergency') THEN 'high' ELSE 'normal' END
    );
  END IF;

  RETURN v_alert_id;
END;
$$;

-- =============================================================================
-- 5. Trigger para detectar retorno tardío
-- =============================================================================

CREATE OR REPLACE FUNCTION public.check_late_return()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_config RECORD;
  v_minutes_late INTEGER;
  v_severity TEXT;
BEGIN
  -- Solo para bookings in_progress que deberían haber terminado
  IF NEW.status = 'in_progress' AND NEW.end_at < NOW() THEN
    SELECT * INTO v_config FROM booking_alert_config WHERE booking_id = NEW.id;

    -- Calcular minutos de retraso
    v_minutes_late := EXTRACT(EPOCH FROM (NOW() - NEW.end_at)) / 60;

    -- Verificar si pasó el período de gracia
    IF v_minutes_late > COALESCE(v_config.late_return_grace_minutes, 30) THEN
      -- Determinar severidad según retraso
      IF v_minutes_late > 240 THEN -- 4+ horas
        v_severity := 'emergency';
      ELSIF v_minutes_late > 120 THEN -- 2+ horas
        v_severity := 'critical';
      ELSIF v_minutes_late > 60 THEN -- 1+ hora
        v_severity := 'warning';
      ELSE
        v_severity := 'info';
      END IF;

      -- Crear alerta si no existe una reciente (última hora)
      IF NOT EXISTS (
        SELECT 1 FROM tracking_alerts
        WHERE booking_id = NEW.id
        AND category = 'late_return'
        AND created_at > NOW() - INTERVAL '1 hour'
      ) THEN
        PERFORM create_tracking_alert(
          NEW.id,
          'late_return',
          v_severity,
          'Retorno tardío detectado',
          format('El vehículo debía devolverse hace %s minutos', v_minutes_late),
          NULL, NULL, NULL, NULL,
          jsonb_build_object('minutes_late', v_minutes_late)
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- =============================================================================
-- 6. Mejorar record_vehicle_location para crear alertas automáticas
-- =============================================================================

CREATE OR REPLACE FUNCTION public.record_vehicle_location_v2(
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
  p_network_type TEXT DEFAULT NULL,
  p_device_id TEXT DEFAULT NULL
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
  v_config RECORD;
  v_last_location RECORD;
  v_was_within BOOLEAN;
BEGIN
  -- Obtener booking info
  SELECT b.*, c.id AS car_id INTO v_booking
  FROM bookings b
  JOIN cars c ON c.id = b.car_id
  WHERE b.id = p_booking_id
  AND b.status = 'in_progress';

  IF v_booking IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found or not active');
  END IF;

  v_car_id := v_booking.car_id;

  -- Obtener config de alertas
  SELECT * INTO v_config FROM booking_alert_config WHERE booking_id = p_booking_id;

  -- Obtener última ubicación para comparar
  SELECT * INTO v_last_location
  FROM vehicle_location_history
  WHERE booking_id = p_booking_id
  ORDER BY recorded_at DESC
  LIMIT 1;

  -- Insertar ubicación
  INSERT INTO vehicle_location_history (
    booking_id, car_id, latitude, longitude, accuracy, altitude,
    heading, speed, source, device_id, battery_level, is_charging, network_type, recorded_at
  ) VALUES (
    p_booking_id, v_car_id, p_latitude, p_longitude, p_accuracy, p_altitude,
    p_heading, p_speed, p_source, p_device_id, p_battery_level, p_is_charging, p_network_type, NOW()
  )
  RETURNING id INTO v_location_id;

  -- Verificar geocercas
  FOR v_geofence IN
    SELECT * FROM geofence_zones
    WHERE booking_id = p_booking_id AND is_active = TRUE
  LOOP
    v_distance := calculate_distance_meters(
      p_latitude, p_longitude,
      v_geofence.center_latitude, v_geofence.center_longitude
    );

    v_is_within := v_distance <= v_geofence.radius_meters;

    -- Verificar si estaba dentro antes
    IF v_last_location IS NOT NULL THEN
      v_was_within := calculate_distance_meters(
        v_last_location.latitude, v_last_location.longitude,
        v_geofence.center_latitude, v_geofence.center_longitude
      ) <= v_geofence.radius_meters;
    ELSE
      v_was_within := TRUE; -- Asumir que empezó dentro
    END IF;

    -- Detectar SALIDA de zona permitida
    IF v_was_within AND NOT v_is_within AND v_geofence.zone_type = 'allowed' THEN
      PERFORM create_tracking_alert(
        p_booking_id,
        'geofence_exit',
        'warning',
        'Vehículo fuera de zona permitida',
        format('El vehículo salió de la zona "%s". Distancia: %.1f km',
          COALESCE(v_geofence.name, 'Zona permitida'), v_distance / 1000),
        p_latitude, p_longitude, NULL, v_geofence.id,
        jsonb_build_object('distance_meters', v_distance, 'zone_name', v_geofence.name)
      );

      v_alerts := v_alerts || jsonb_build_object(
        'type', 'geofence_exit',
        'geofence_name', v_geofence.name,
        'distance_km', ROUND(v_distance / 1000, 2)
      );
    END IF;

    -- Detectar ENTRADA a zona restringida
    IF NOT v_was_within AND v_is_within AND v_geofence.zone_type = 'restricted' THEN
      PERFORM create_tracking_alert(
        p_booking_id,
        'geofence_enter',
        'critical',
        'Vehículo en zona restringida',
        format('El vehículo entró a zona restringida "%s"', COALESCE(v_geofence.name, 'Zona restringida')),
        p_latitude, p_longitude, NULL, v_geofence.id,
        jsonb_build_object('zone_name', v_geofence.name)
      );

      v_alerts := v_alerts || jsonb_build_object(
        'type', 'geofence_enter_restricted',
        'geofence_name', v_geofence.name
      );
    END IF;
  END LOOP;

  -- Verificar velocidad
  IF p_speed IS NOT NULL THEN
    v_speed_kmh := p_speed * 3.6; -- m/s a km/h

    IF v_speed_kmh > COALESCE(v_config.speed_limit_kmh, 120) THEN
      -- Solo alertar si no hay alerta de velocidad reciente (últimos 5 min)
      IF NOT EXISTS (
        SELECT 1 FROM tracking_alerts
        WHERE booking_id = p_booking_id
        AND category = 'speed_exceeded'
        AND created_at > NOW() - INTERVAL '5 minutes'
      ) THEN
        PERFORM create_tracking_alert(
          p_booking_id,
          'speed_exceeded',
          CASE WHEN v_speed_kmh > 150 THEN 'critical' ELSE 'warning' END,
          'Exceso de velocidad detectado',
          format('Velocidad: %.0f km/h (límite: %s km/h)',
            v_speed_kmh, COALESCE(v_config.speed_limit_kmh, 120)),
          p_latitude, p_longitude, v_speed_kmh, NULL,
          jsonb_build_object('speed_kmh', v_speed_kmh, 'limit_kmh', COALESCE(v_config.speed_limit_kmh, 120))
        );
      END IF;

      v_alerts := v_alerts || jsonb_build_object(
        'type', 'speed_exceeded',
        'speed_kmh', ROUND(v_speed_kmh, 1),
        'limit_kmh', COALESCE(v_config.speed_limit_kmh, 120)
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

-- =============================================================================
-- 7. API para gestionar geocercas
-- =============================================================================

-- Crear geocerca personalizada
CREATE OR REPLACE FUNCTION public.create_custom_geofence(
  p_booking_id UUID,
  p_name TEXT,
  p_zone_type TEXT, -- 'allowed', 'restricted', 'alert'
  p_center_lat DECIMAL,
  p_center_lng DECIMAL,
  p_radius_meters INTEGER,
  p_description TEXT DEFAULT NULL,
  p_color TEXT DEFAULT '#FF0000',
  p_max_speed_kmh INTEGER DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_geofence_id UUID;
  v_owner_id UUID;
BEGIN
  -- Verificar que el usuario es el owner
  SELECT c.owner_id INTO v_owner_id
  FROM bookings b
  JOIN cars c ON c.id = b.car_id
  WHERE b.id = p_booking_id;

  IF v_owner_id != auth.uid() THEN
    RAISE EXCEPTION 'Only owner can create geofences';
  END IF;

  INSERT INTO geofence_zones (
    booking_id, name, zone_type, description, color,
    center_latitude, center_longitude, radius_meters,
    max_speed_kmh, created_by,
    alert_on_exit, alert_on_enter
  ) VALUES (
    p_booking_id, p_name, p_zone_type, p_description, p_color,
    p_center_lat, p_center_lng, p_radius_meters,
    p_max_speed_kmh, auth.uid(),
    p_zone_type = 'allowed', -- alert on exit for allowed zones
    p_zone_type = 'restricted' -- alert on enter for restricted zones
  )
  RETURNING id INTO v_geofence_id;

  RETURN v_geofence_id;
END;
$$;

-- Listar geocercas de un booking
CREATE OR REPLACE FUNCTION public.get_booking_geofences(p_booking_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Verificar acceso
  IF NOT EXISTS (
    SELECT 1 FROM bookings b
    JOIN cars c ON c.id = b.car_id
    WHERE b.id = p_booking_id
    AND (b.renter_id = auth.uid() OR c.owner_id = auth.uid())
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  SELECT jsonb_agg(jsonb_build_object(
    'id', id,
    'name', name,
    'zone_type', zone_type,
    'description', description,
    'color', color,
    'center_latitude', center_latitude,
    'center_longitude', center_longitude,
    'radius_meters', radius_meters,
    'max_speed_kmh', max_speed_kmh,
    'is_active', is_active,
    'created_at', created_at
  ))
  INTO v_result
  FROM geofence_zones
  WHERE booking_id = p_booking_id;

  RETURN jsonb_build_object('success', true, 'geofences', COALESCE(v_result, '[]'::jsonb));
END;
$$;

-- Actualizar geocerca
CREATE OR REPLACE FUNCTION public.update_geofence(
  p_geofence_id UUID,
  p_name TEXT DEFAULT NULL,
  p_radius_meters INTEGER DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL,
  p_max_speed_kmh INTEGER DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_owner_id UUID;
BEGIN
  -- Verificar que el usuario es el owner
  SELECT c.owner_id INTO v_owner_id
  FROM geofence_zones gz
  JOIN bookings b ON b.id = gz.booking_id
  JOIN cars c ON c.id = b.car_id
  WHERE gz.id = p_geofence_id;

  IF v_owner_id != auth.uid() THEN
    RETURN FALSE;
  END IF;

  UPDATE geofence_zones SET
    name = COALESCE(p_name, name),
    radius_meters = COALESCE(p_radius_meters, radius_meters),
    is_active = COALESCE(p_is_active, is_active),
    max_speed_kmh = COALESCE(p_max_speed_kmh, max_speed_kmh),
    updated_at = NOW()
  WHERE id = p_geofence_id;

  RETURN TRUE;
END;
$$;

-- =============================================================================
-- 8. Trigger para crear config por defecto
-- =============================================================================

CREATE OR REPLACE FUNCTION public.setup_booking_alert_config()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'in_progress' AND (OLD.status IS NULL OR OLD.status != 'in_progress') THEN
    INSERT INTO booking_alert_config (booking_id)
    VALUES (NEW.id)
    ON CONFLICT (booking_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_setup_booking_alert_config ON bookings;
CREATE TRIGGER trg_setup_booking_alert_config
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION setup_booking_alert_config();
