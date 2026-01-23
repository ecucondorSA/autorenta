-- Migration: EV Claim Types and Damage Categories
-- Description: Extends claim types and damage categories for Electric Vehicles
-- Date: 2026-01-23

-- =============================================================================
-- EV CLAIM TYPES
-- =============================================================================

-- Add ev_specific_data column to claims table
ALTER TABLE claims ADD COLUMN IF NOT EXISTS
  ev_specific_data JSONB DEFAULT NULL;

COMMENT ON COLUMN claims.ev_specific_data IS
  'EV-specific claim data: battery_soc, temperature, bms_codes, charging_status, etc.';

-- Add ev_damage_data to vehicle_damages if exists, or create it
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vehicle_damages') THEN
    ALTER TABLE vehicle_damages ADD COLUMN IF NOT EXISTS
      ev_damage_data JSONB DEFAULT NULL;

    COMMENT ON COLUMN vehicle_damages.ev_damage_data IS
      'EV-specific damage data: battery_soc_percent, battery_temperature_celsius, bms_error_codes, charging_status';
  END IF;
END $$;

-- Create EV claim types reference table for UI/validation
CREATE TABLE IF NOT EXISTS claim_type_definitions (
  type_code TEXT PRIMARY KEY,
  category TEXT NOT NULL, -- 'general' or 'ev'
  label_es TEXT NOT NULL,
  label_en TEXT NOT NULL,
  description_es TEXT,
  description_en TEXT,
  severity_default TEXT DEFAULT 'moderate', -- minor, moderate, severe, critical
  requires_ev_data BOOLEAN DEFAULT FALSE,
  icon TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert claim type definitions
INSERT INTO claim_type_definitions (type_code, category, label_es, label_en, description_es, severity_default, requires_ev_data, icon, display_order)
VALUES
  -- General claim types
  ('collision', 'general', 'Colisión', 'Collision', 'Impacto con otro vehículo u objeto', 'moderate', FALSE, 'car-sport', 1),
  ('theft', 'general', 'Robo', 'Theft', 'Robo total o parcial del vehículo', 'critical', FALSE, 'shield-off', 2),
  ('fire', 'general', 'Incendio', 'Fire', 'Daño por fuego no relacionado a EV', 'critical', FALSE, 'flame', 3),
  ('vandalism', 'general', 'Vandalismo', 'Vandalism', 'Daño intencional por terceros', 'moderate', FALSE, 'skull', 4),
  ('misappropriation', 'general', 'Apropiación Indebida', 'Misappropriation', 'Retención indebida del vehículo', 'critical', FALSE, 'warning', 5),

  -- EV-specific claim types
  ('ev_battery_damage', 'ev', 'Daño a Batería EV', 'EV Battery Damage', 'Daño físico al pack de batería por colisión o impacto', 'critical', TRUE, 'battery-dead', 10),
  ('ev_thermal_event', 'ev', 'Evento Térmico EV', 'EV Thermal Event', 'Sobrecalentamiento, thermal runaway o riesgo de incendio de batería', 'critical', TRUE, 'thermometer', 11),
  ('ev_charging_incident', 'ev', 'Incidente de Carga EV', 'EV Charging Incident', 'Daño durante proceso de carga (puerto, conector, sobrecarga)', 'severe', TRUE, 'flash', 12),
  ('ev_bms_failure', 'ev', 'Fallo de Sistema BMS', 'BMS System Failure', 'Fallo del Battery Management System o errores críticos', 'severe', TRUE, 'hardware-chip', 13),
  ('ev_range_degradation', 'ev', 'Degradación de Autonomía', 'Range Degradation', 'Pérdida anómala de autonomía (>20% en período de alquiler)', 'moderate', TRUE, 'speedometer', 14),
  ('ev_cooling_failure', 'ev', 'Fallo de Refrigeración EV', 'EV Cooling Failure', 'Fallo del sistema de refrigeración de batería', 'severe', TRUE, 'snow', 15),

  -- General catch-all
  ('other', 'general', 'Otro', 'Other', 'Otro tipo de siniestro no listado', 'moderate', FALSE, 'help-circle', 99)
ON CONFLICT (type_code) DO UPDATE SET
  label_es = EXCLUDED.label_es,
  label_en = EXCLUDED.label_en,
  description_es = EXCLUDED.description_es,
  severity_default = EXCLUDED.severity_default,
  requires_ev_data = EXCLUDED.requires_ev_data,
  icon = EXCLUDED.icon,
  display_order = EXCLUDED.display_order;

-- =============================================================================
-- EV DAMAGE TYPES
-- =============================================================================

-- Create damage type definitions table
CREATE TABLE IF NOT EXISTS damage_type_definitions (
  type_code TEXT PRIMARY KEY,
  category TEXT NOT NULL, -- 'general' or 'ev'
  label_es TEXT NOT NULL,
  label_en TEXT NOT NULL,
  description_es TEXT,
  requires_ev_inspection BOOLEAN DEFAULT FALSE,
  icon TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert damage type definitions
INSERT INTO damage_type_definitions (type_code, category, label_es, label_en, description_es, requires_ev_inspection, icon, display_order)
VALUES
  -- General damage types
  ('scratch', 'general', 'Rayón', 'Scratch', 'Rayón superficial en pintura o carrocería', FALSE, 'remove', 1),
  ('dent', 'general', 'Abolladura', 'Dent', 'Deformación del panel sin rotura', FALSE, 'ellipse', 2),
  ('crack', 'general', 'Grieta', 'Crack', 'Grieta en vidrio, parachoques u otra pieza', FALSE, 'git-branch', 3),
  ('missing_part', 'general', 'Pieza Faltante', 'Missing Part', 'Componente faltante o desprendido', FALSE, 'help-circle', 4),

  -- EV-specific damage types
  ('battery_cell_damage', 'ev', 'Daño a Celda de Batería', 'Battery Cell Damage', 'Daño a celda individual del pack de batería', TRUE, 'battery-charging', 10),
  ('battery_module_failure', 'ev', 'Fallo de Módulo de Batería', 'Battery Module Failure', 'Fallo de módulo completo del pack', TRUE, 'battery-dead', 11),
  ('thermal_damage', 'ev', 'Daño Térmico', 'Thermal Damage', 'Daño por sobrecalentamiento o thermal event', TRUE, 'flame', 12),
  ('cooling_system_damage', 'ev', 'Daño a Sistema de Refrigeración', 'Cooling System Damage', 'Daño a radiador, mangueras o bomba de refrigeración EV', TRUE, 'snow', 13),
  ('charging_port_damage', 'ev', 'Daño a Puerto de Carga', 'Charging Port Damage', 'Daño al conector, puerto o sistema de carga', TRUE, 'flash', 14),
  ('bms_malfunction', 'ev', 'Mal funcionamiento BMS', 'BMS Malfunction', 'Fallo del sistema de gestión de batería', TRUE, 'hardware-chip', 15),
  ('hv_cable_damage', 'ev', 'Daño a Cableado HV', 'HV Cable Damage', 'Daño a cables de alto voltaje', TRUE, 'flash-off', 16),

  -- General catch-all
  ('other', 'general', 'Otro', 'Other', 'Otro tipo de daño no listado', FALSE, 'help-circle', 99)
ON CONFLICT (type_code) DO UPDATE SET
  label_es = EXCLUDED.label_es,
  label_en = EXCLUDED.label_en,
  description_es = EXCLUDED.description_es,
  requires_ev_inspection = EXCLUDED.requires_ev_inspection,
  icon = EXCLUDED.icon,
  display_order = EXCLUDED.display_order;

-- =============================================================================
-- RPC FUNCTIONS
-- =============================================================================

-- Get claim types for a specific vehicle type
CREATE OR REPLACE FUNCTION get_claim_types_for_vehicle(
  p_is_ev BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
  type_code TEXT,
  category TEXT,
  label TEXT,
  description TEXT,
  severity_default TEXT,
  requires_ev_data BOOLEAN,
  icon TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ctd.type_code,
    ctd.category,
    ctd.label_es AS label,
    ctd.description_es AS description,
    ctd.severity_default,
    ctd.requires_ev_data,
    ctd.icon
  FROM claim_type_definitions ctd
  WHERE ctd.is_active = TRUE
    AND (
      ctd.category = 'general'
      OR (p_is_ev = TRUE AND ctd.category = 'ev')
    )
  ORDER BY ctd.display_order;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get damage types for a specific vehicle type
CREATE OR REPLACE FUNCTION get_damage_types_for_vehicle(
  p_is_ev BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
  type_code TEXT,
  category TEXT,
  label TEXT,
  description TEXT,
  requires_ev_inspection BOOLEAN,
  icon TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dtd.type_code,
    dtd.category,
    dtd.label_es AS label,
    dtd.description_es AS description,
    dtd.requires_ev_inspection,
    dtd.icon
  FROM damage_type_definitions dtd
  WHERE dtd.is_active = TRUE
    AND (
      dtd.category = 'general'
      OR (p_is_ev = TRUE AND dtd.category = 'ev')
    )
  ORDER BY dtd.display_order;
END;
$$ LANGUAGE plpgsql STABLE;

-- Validate EV claim data
CREATE OR REPLACE FUNCTION validate_ev_claim_data(
  p_claim_type TEXT,
  p_ev_data JSONB
)
RETURNS TABLE(
  is_valid BOOLEAN,
  validation_message TEXT
) AS $$
DECLARE
  v_requires_ev BOOLEAN;
BEGIN
  -- Check if claim type requires EV data
  SELECT requires_ev_data INTO v_requires_ev
  FROM claim_type_definitions
  WHERE type_code = p_claim_type;

  -- If EV data is required but not provided
  IF v_requires_ev AND (p_ev_data IS NULL OR p_ev_data = '{}'::JSONB) THEN
    RETURN QUERY SELECT FALSE, 'Este tipo de siniestro EV requiere datos específicos de batería';
    RETURN;
  END IF;

  -- If EV data is provided, validate required fields
  IF p_ev_data IS NOT NULL AND p_ev_data != '{}'::JSONB THEN
    -- battery_soc_percent should be 0-100 if present
    IF p_ev_data ? 'battery_soc_percent' THEN
      IF (p_ev_data->>'battery_soc_percent')::NUMERIC < 0
        OR (p_ev_data->>'battery_soc_percent')::NUMERIC > 100 THEN
        RETURN QUERY SELECT FALSE, 'El porcentaje de batería debe estar entre 0 y 100';
        RETURN;
      END IF;
    END IF;

    -- battery_temperature should be reasonable (-40 to 100 Celsius)
    IF p_ev_data ? 'battery_temperature_celsius' THEN
      IF (p_ev_data->>'battery_temperature_celsius')::NUMERIC < -40
        OR (p_ev_data->>'battery_temperature_celsius')::NUMERIC > 100 THEN
        RETURN QUERY SELECT FALSE, 'La temperatura de batería parece fuera de rango (-40 a 100°C)';
        RETURN;
      END IF;
    END IF;
  END IF;

  RETURN QUERY SELECT TRUE, 'Datos válidos';
END;
$$ LANGUAGE plpgsql STABLE;

-- Enable RLS on reference tables (read-only for all authenticated)
ALTER TABLE claim_type_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE damage_type_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read claim types"
  ON claim_type_definitions FOR SELECT
  USING (TRUE);

CREATE POLICY "Anyone can read damage types"
  ON damage_type_definitions FOR SELECT
  USING (TRUE);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_claim_types_for_vehicle(BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_damage_types_for_vehicle(BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_ev_claim_data(TEXT, JSONB) TO authenticated;
