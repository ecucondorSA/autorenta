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
export type ClaimType = 'collision' | 'theft' | 'fire' | 'vandalism' | 'misappropriation' | 'other';
export type InspectionType = 'pre_rental' | 'post_rental';
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

  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
}

/**
 * Daño Detectado en Inspección
 */
export interface VehicleDamage {
  type: 'scratch' | 'dent' | 'crack' | 'missing_part' | 'other';
  location: string; // ej: "puerta delantera izquierda"
  severity: 'minor' | 'moderate' | 'severe';
  photo_url?: string;
  description?: string;
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
  collision: 'Colisión',
  theft: 'Robo',
  fire: 'Incendio',
  vandalism: 'Vandalismo',
  misappropriation: 'Apropiación Indebida',
  other: 'Otro',
};

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
