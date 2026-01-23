/**
 * Modelos TypeScript para el Sistema de Seguros P2P
 * Autorentar - Insurance System Models
 */

import type { ClaimStatus } from '@core/types/database.types';
export type { ClaimStatus } from '@core/types/database.types';

export type PolicyType = 'platform_floating' | 'owner_byoi';
export type Insurer = 'rio_uruguay' | 'sancor' | 'federacion_patronal' | 'other';
export type DeductibleType = 'percentage' | 'fixed';
export type PolicyStatus = 'active' | 'expired' | 'cancelled' | 'pending_verification';
// Base claim types
export type BaseClaimType = 'collision' | 'theft' | 'fire' | 'vandalism' | 'misappropriation' | 'other';

// EV-specific claim types
export type EVClaimType =
  | 'ev_battery_damage'      // Daño a batería (colisión, desgaste)
  | 'ev_thermal_event'       // Evento térmico (sobrecalentamiento, thermal runaway)
  | 'ev_charging_incident'   // Incidente de carga
  | 'ev_bms_failure'         // Fallo de Battery Management System
  | 'ev_range_degradation'   // Degradación anómala de autonomía
  | 'ev_cooling_failure';    // Fallo de sistema de refrigeración

// Combined claim type
export type ClaimType = BaseClaimType | EVClaimType;

// EV claim type list for filtering
export const EV_CLAIM_TYPES: EVClaimType[] = [
  'ev_battery_damage',
  'ev_thermal_event',
  'ev_charging_incident',
  'ev_bms_failure',
  'ev_range_degradation',
  'ev_cooling_failure',
];

export type InspectionType = 'pre_rental' | 'post_rental';

// Base damage types
export type BaseDamageType = 'scratch' | 'dent' | 'crack' | 'missing_part' | 'other';

// EV-specific damage types
export type EVDamageType =
  | 'battery_cell_damage'
  | 'battery_module_failure'
  | 'thermal_damage'
  | 'cooling_system_damage'
  | 'charging_port_damage'
  | 'bms_malfunction'
  | 'hv_cable_damage';

// Combined damage type
export type DamageType = BaseDamageType | EVDamageType;

// EV-specific data for claims and damages
export interface EVSpecificData {
  battery_soc_percent?: number;          // State of Charge (0-100)
  battery_temperature_celsius?: number;  // Battery temperature
  bms_error_codes?: string[];            // BMS error codes
  charging_status?: 'idle' | 'charging' | 'fast_charging' | 'error';
  range_km_before?: number;              // Autonomía antes del incidente
  range_km_after?: number;               // Autonomía después del incidente
  charger_type?: 'ac_slow' | 'ac_fast' | 'dc_fast' | 'supercharger';
  charger_brand?: string;
  vehicle_mode?: 'on' | 'off' | 'charging' | 'error';
}
export type AddonType =
  | 'rc_ampliada'
  | 'reduccion_franquicia'
  | 'paises_limitrofes'
  | 'neumaticos'
  | 'equipaje';

/**
 * Póliza de Seguro
 */
export interface InsurancePolicy {
  id: string;
  policy_type: PolicyType;
  insurer: Insurer;

  // Póliza flotante (plataforma)
  platform_policy_number?: string;
  platform_contract_start?: string;
  platform_contract_end?: string;

  // Póliza propia (BYOI)
  owner_id?: string;
  car_id?: string;
  owner_policy_number?: string;
  owner_policy_start?: string;
  owner_policy_end?: string;
  owner_policy_document_url?: string;
  verified_by_admin?: boolean;
  verification_date?: string;

  // Coberturas
  liability_coverage_amount: number;
  own_damage_coverage: boolean;
  theft_coverage: boolean;
  fire_coverage: boolean;
  misappropriation_coverage: boolean;
  misappropriation_limit: number;

  // Franquicia
  deductible_type: DeductibleType;
  deductible_percentage?: number;
  deductible_fixed_amount?: number;
  deductible_min_amount: number;

  // Costos
  daily_premium?: number;
  annual_premium?: number;

  // Estado
  status: PolicyStatus;

  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
}

/**
 * Cobertura Activa por Reserva
 */
export interface BookingInsuranceCoverage {
  id: string;
  booking_id: string;
  policy_id: string;

  coverage_start: string;
  coverage_end: string;

  liability_coverage: number;
  deductible_amount: number;
  daily_premium_charged?: number;

  certificate_number?: string;
  certificate_url?: string;

  status: 'active' | 'completed' | 'cancelled';
  activated_at: string;

  created_at: string;
  updated_at: string;

  // Relaciones
  policy?: InsurancePolicy;
}

/**
 * Add-on de Seguro
 */
export interface InsuranceAddon {
  id: string;
  name: string;
  description?: string;
  addon_type: AddonType;
  daily_cost: number;
  benefit_amount?: number;
  active: boolean;
  created_at: string;
}

/**
 * Add-on Contratado
 */
export interface BookingInsuranceAddon {
  id: string;
  booking_id: string;
  addon_id: string;
  daily_cost: number;
  total_cost: number;
  created_at: string;

  // Relación
  addon?: InsuranceAddon;
}

/**
 * Siniestro (Claim)
 */
export interface InsuranceClaim {
  id: string;
  booking_id: string;
  policy_id: string;

  reported_by: string;
  reporter_role: 'driver' | 'owner';

  claim_type: ClaimType;
  description: string;
  location?: string;
  incident_location?: string;
  incident_date: string;

  photos?: string[];
  evidence_photos?: string[];
  police_report_number?: string;
  police_report_url?: string;

  estimated_damage_amount?: number;
  deductible_charged?: number;
  insurance_payout?: number;

  assigned_adjuster?: string;
  adjuster_contact?: string;

  status: ClaimStatus;

  resolution_notes?: string;
  closed_at?: string;

  // EV-specific claim data
  ev_specific_data?: EVSpecificData;

  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
}

/**
 * Daño Detectado en Inspección
 */
export interface VehicleDamage {
  type: DamageType;
  location: string; // ej: "puerta delantera izquierda"
  severity: 'minor' | 'moderate' | 'severe' | 'critical';
  photo_url?: string;
  description?: string;

  // Campos EV específicos (opcionales)
  ev_data?: EVSpecificData;
}

/**
 * Inspección de Vehículo
 */
export interface VehicleInspection {
  id: string;
  booking_id: string;
  car_id: string;

  inspection_type: InspectionType;

  inspector_id: string;
  inspector_role: 'driver' | 'owner';

  odometer_reading?: number;
  fuel_level?: number; // 0-100

  photos_360?: Array<{
    url: string;
    angle: string; // ej: "front", "rear", "left", "right"
    timestamp: string;
    location?: { lat: number; lng: number };
  }>;

  damages_detected?: VehicleDamage[];

  ai_analysis?: Record<string, unknown>;
  ai_detected_damages?: VehicleDamage[];

  signature_data?: string;
  signed_at?: string;

  inspection_location?: { lat: number; lng: number };

  completed: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Resumen de Seguro para UI
 */
export interface InsuranceSummary {
  has_coverage: boolean;
  policy_type: PolicyType;
  insurer: Insurer;
  insurer_display_name: string;

  liability_coverage: number;
  deductible_amount: number;

  daily_premium?: number;
  total_premium: number;

  addons: Array<{
    name: string;
    daily_cost: number;
    total_cost: number;
  }>;

  security_deposit: number;

  certificate_number?: string;

  coverage_details: {
    rc: boolean;
    own_damage: boolean;
    theft: boolean;
    fire: boolean;
    misappropriation: boolean;
    countries: string[];
  };
}

/**
 * Request para activar cobertura
 */
export interface ActivateInsuranceCoverageRequest {
  booking_id: string;
  addon_ids?: string[];
}

/**
 * Request para reportar siniestro
 */
export interface ReportClaimRequest {
  booking_id: string;
  claim_type: ClaimType;
  description: string;
  incident_date: string;
  location?: string;
  photos?: string[];
  police_report_number?: string;
  // EV-specific data (required for EV claim types)
  ev_specific_data?: EVSpecificData;
}

/**
 * Request para inspección
 */
export interface CreateInspectionRequest {
  booking_id: string;
  inspection_type: InspectionType;
  odometer_reading?: number;
  fuel_level?: number;
  photos_360: Array<{
    url: string;
    angle: string;
  }>;
  damages_detected?: VehicleDamage[];
  signature_data?: string;
}

/**
 * Helpers para nombres de aseguradoras
 */
export const INSURER_DISPLAY_NAMES: Record<Insurer, string> = {
  rio_uruguay: 'Río Uruguay Seguros',
  sancor: 'Sancor Seguros',
  federacion_patronal: 'Federación Patronal',
  other: 'Otra Aseguradora',
};

/**
 * Helpers para tipos de siniestros
 */
export const CLAIM_TYPE_LABELS: Record<ClaimType, string> = {
  // Base types
  collision: 'Colisión',
  theft: 'Robo',
  fire: 'Incendio',
  vandalism: 'Vandalismo',
  misappropriation: 'Apropiación Indebida',
  other: 'Otro',
  // EV types
  ev_battery_damage: 'Daño a Batería EV',
  ev_thermal_event: 'Evento Térmico EV',
  ev_charging_incident: 'Incidente de Carga EV',
  ev_bms_failure: 'Fallo de Sistema BMS',
  ev_range_degradation: 'Degradación de Autonomía',
  ev_cooling_failure: 'Fallo de Refrigeración EV',
};

/**
 * Descripción de tipos de siniestro
 */
export const CLAIM_TYPE_DESCRIPTIONS: Record<ClaimType, string> = {
  // Base types
  collision: 'Impacto con otro vehículo u objeto',
  theft: 'Robo total o parcial del vehículo',
  fire: 'Daño por fuego no relacionado a EV',
  vandalism: 'Daño intencional por terceros',
  misappropriation: 'Retención indebida del vehículo',
  other: 'Otro tipo de siniestro no listado',
  // EV types
  ev_battery_damage: 'Daño físico al pack de batería por colisión o impacto',
  ev_thermal_event: 'Sobrecalentamiento, thermal runaway o riesgo de incendio de batería',
  ev_charging_incident: 'Daño durante proceso de carga (puerto, conector, sobrecarga)',
  ev_bms_failure: 'Fallo del Battery Management System o errores críticos',
  ev_range_degradation: 'Pérdida anómala de autonomía (>20% en período de alquiler)',
  ev_cooling_failure: 'Fallo del sistema de refrigeración de batería',
};

/**
 * Iconos para tipos de siniestro
 */
export const CLAIM_TYPE_ICONS: Record<ClaimType, string> = {
  collision: 'car-sport',
  theft: 'shield-off',
  fire: 'flame',
  vandalism: 'skull',
  misappropriation: 'warning',
  other: 'help-circle',
  ev_battery_damage: 'battery-dead',
  ev_thermal_event: 'thermometer',
  ev_charging_incident: 'flash',
  ev_bms_failure: 'hardware-chip',
  ev_range_degradation: 'speedometer',
  ev_cooling_failure: 'snow',
};

/**
 * Severidad por defecto de tipos de siniestro
 */
export const CLAIM_TYPE_DEFAULT_SEVERITY: Record<ClaimType, 'minor' | 'moderate' | 'severe' | 'critical'> = {
  collision: 'moderate',
  theft: 'critical',
  fire: 'critical',
  vandalism: 'moderate',
  misappropriation: 'critical',
  other: 'moderate',
  ev_battery_damage: 'critical',
  ev_thermal_event: 'critical',
  ev_charging_incident: 'severe',
  ev_bms_failure: 'severe',
  ev_range_degradation: 'moderate',
  ev_cooling_failure: 'severe',
};

/**
 * Helpers para tipos de daño
 */
export const DAMAGE_TYPE_LABELS: Record<DamageType, string> = {
  // Base types
  scratch: 'Rayón',
  dent: 'Abolladura',
  crack: 'Grieta',
  missing_part: 'Pieza Faltante',
  other: 'Otro',
  // EV types
  battery_cell_damage: 'Daño a Celda de Batería',
  battery_module_failure: 'Fallo de Módulo de Batería',
  thermal_damage: 'Daño Térmico',
  cooling_system_damage: 'Daño a Sistema de Refrigeración',
  charging_port_damage: 'Daño a Puerto de Carga',
  bms_malfunction: 'Mal funcionamiento BMS',
  hv_cable_damage: 'Daño a Cableado HV',
};

/**
 * Indica si un tipo de daño requiere inspección EV especializada
 */
export const DAMAGE_TYPE_REQUIRES_EV_INSPECTION: Record<DamageType, boolean> = {
  scratch: false,
  dent: false,
  crack: false,
  missing_part: false,
  other: false,
  battery_cell_damage: true,
  battery_module_failure: true,
  thermal_damage: true,
  cooling_system_damage: true,
  charging_port_damage: true,
  bms_malfunction: true,
  hv_cable_damage: true,
};

/**
 * Lista de tipos de daño EV
 */
export const EV_DAMAGE_TYPES: EVDamageType[] = [
  'battery_cell_damage',
  'battery_module_failure',
  'thermal_damage',
  'cooling_system_damage',
  'charging_port_damage',
  'bms_malfunction',
  'hv_cable_damage',
];

/**
 * Verifica si un tipo de claim es específico de EV
 */
export function isEVClaimType(type: ClaimType): type is EVClaimType {
  return EV_CLAIM_TYPES.includes(type as EVClaimType);
}

/**
 * Verifica si un tipo de daño es específico de EV
 */
export function isEVDamageType(type: DamageType): type is EVDamageType {
  return EV_DAMAGE_TYPES.includes(type as EVDamageType);
}

/**
 * Obtiene los tipos de claim aplicables según si es EV o no
 */
export function getClaimTypesForVehicle(isEV: boolean): ClaimType[] {
  const baseTypes: BaseClaimType[] = ['collision', 'theft', 'fire', 'vandalism', 'misappropriation', 'other'];
  return isEV ? [...baseTypes, ...EV_CLAIM_TYPES] : baseTypes;
}

/**
 * Obtiene los tipos de daño aplicables según si es EV o no
 */
export function getDamageTypesForVehicle(isEV: boolean): DamageType[] {
  const baseTypes: BaseDamageType[] = ['scratch', 'dent', 'crack', 'missing_part', 'other'];
  return isEV ? [...baseTypes, ...EV_DAMAGE_TYPES] : baseTypes;
}

/**
 * Helpers para estados de siniestro
 */
export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  draft: 'Borrador',
  submitted: 'Enviado',
  under_review: 'En Revisión',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  paid: 'Pagado',
  processing: 'En proceso',
};

/**
 * Colores para estados de claim
 */
export const CLAIM_STATUS_COLORS: Record<ClaimStatus, string> = {
  draft: 'medium',
  submitted: 'info',
  under_review: 'info',
  approved: 'success',
  rejected: 'danger',
  paid: 'success',
  processing: 'warning',
};
