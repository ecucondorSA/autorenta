import { Injectable } from '@angular/core';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';

export interface BookingContract {
  id: string;
  booking_id: string;
  terms_version: string;
  accepted_by_renter: boolean;
  accepted_at: string | null;
  pdf_url: string | null;
  created_at: string;
  // Extended fields for legal compliance
  contract_version?: string;
  contract_locale?: string;
  renter_ip_address?: string;
  renter_user_agent?: string;
  renter_device_fingerprint?: string;
  pdf_generated_at?: string;
  pdf_storage_path?: string;
  pdf_generation_status?: 'pending' | 'generating' | 'ready' | 'failed';
  pdf_error?: string;
  contract_data?: Record<string, unknown>; // JSONB snapshot
  clauses_accepted?: ClausesAccepted;
}

/**
 * Base contract clauses (required for all bookings)
 */
export interface BaseClausesAccepted {
  culpaGrave: boolean; // Alcohol/drogas - Pérdida total de cobertura
  indemnidad: boolean; // Renter indemnifica owner
  retencion: boolean; // Art. 173 CP - Retención indebida
  mora: boolean; // Art. 886 CCyC - Mora automática
}

/**
 * EV-specific contract clauses (required for EV rentals)
 */
export interface EVClausesAccepted {
  gpsTracking: boolean;         // Consentimiento GPS obligatorio
  geofencing: boolean;          // Aceptar restricciones de zona
  batteryManagement: boolean;   // Responsabilidad de batería
  chargingObligations: boolean; // Obligación de carga mínima
  evDamagePolicy: boolean;      // Política de daños EV específica
}

/**
 * Combined clauses interface for backwards compatibility
 */
export interface ClausesAccepted extends BaseClausesAccepted {
  // EV clauses are optional (only required for EV vehicles)
  gpsTracking?: boolean;
  geofencing?: boolean;
  batteryManagement?: boolean;
  chargingObligations?: boolean;
  evDamagePolicy?: boolean;
}

/**
 * Clause definition for UI rendering
 */
export interface ClauseDefinition {
  id: string;
  title: string;
  description: string;
  legalReference?: string;
  icon: string;
  category: 'base' | 'ev';
}

/**
 * Base clause definitions
 */
export const BASE_CLAUSE_DEFINITIONS: ClauseDefinition[] = [
  {
    id: 'culpaGrave',
    title: 'Culpa Grave',
    description: 'Acepto que el consumo de alcohol o drogas durante el alquiler constituye culpa grave y resulta en la pérdida total de cobertura del seguro.',
    legalReference: 'Art. 70 Ley 17.418',
    icon: 'wine',
    category: 'base',
  },
  {
    id: 'indemnidad',
    title: 'Indemnidad',
    description: 'Acepto indemnizar al propietario por cualquier daño, pérdida o responsabilidad que surja de mi uso del vehículo durante el período de alquiler.',
    icon: 'shield-checkmark',
    category: 'base',
  },
  {
    id: 'retencion',
    title: 'Retención Indebida',
    description: 'Reconozco que la no devolución del vehículo en la fecha acordada puede constituir el delito de retención indebida.',
    legalReference: 'Art. 173 inc. 2 Código Penal',
    icon: 'lock-closed',
    category: 'base',
  },
  {
    id: 'mora',
    title: 'Mora Automática',
    description: 'Acepto que el incumplimiento de pagos en las fechas establecidas genera mora automática sin necesidad de intimación.',
    legalReference: 'Art. 886 Código Civil y Comercial',
    icon: 'timer',
    category: 'base',
  },
];

/**
 * EV-specific clause definitions
 */
export const EV_CLAUSE_DEFINITIONS: ClauseDefinition[] = [
  {
    id: 'gpsTracking',
    title: 'Tracking GPS',
    description: 'Acepto que el vehículo está equipado con GPS y que mi ubicación será monitoreada durante el alquiler por razones de seguridad y recuperación.',
    icon: 'location',
    category: 'ev',
  },
  {
    id: 'geofencing',
    title: 'Restricciones de Zona',
    description: 'Acepto las restricciones geográficas establecidas para el vehículo. Salir de la zona permitida puede resultar en cargos adicionales o terminación del contrato.',
    icon: 'map',
    category: 'ev',
  },
  {
    id: 'batteryManagement',
    title: 'Gestión de Batería',
    description: 'Me comprometo a seguir las prácticas recomendadas de carga y a no dejar la batería por debajo del 10% de carga. Daños por mal uso de batería son mi responsabilidad.',
    icon: 'battery-charging',
    category: 'ev',
  },
  {
    id: 'chargingObligations',
    title: 'Obligaciones de Carga',
    description: 'Acepto devolver el vehículo con al menos el mismo nivel de carga con el que lo recibí, o pagar el costo de recarga según tarifa establecida.',
    icon: 'flash',
    category: 'ev',
  },
  {
    id: 'evDamagePolicy',
    title: 'Política de Daños EV',
    description: 'Entiendo que los daños específicos a componentes EV (batería, sistema de carga, BMS) tienen una política de cobertura especial detallada en las condiciones.',
    icon: 'construct',
    category: 'ev',
  },
];

@Injectable({
  providedIn: 'root',
})
export class ContractsService {
  private readonly supabase = injectSupabase();

  async prepareContract(params: {
    bookingId: string;
    termsVersion: string;
    pdfUrl?: string;
  }): Promise<BookingContract> {
    const { data, error } = await this.supabase
      .from('booking_contracts')
      .insert({
        booking_id: params.bookingId,
        terms_version: params.termsVersion,
        pdf_url: params.pdfUrl ?? null,
      })
      .select('*')
      .single();
    if (error) throw error;
    return data as BookingContract;
  }

  async acceptContract(contractId: string): Promise<void> {
    const {
      data: { user },
      error: authError,
    } = await this.supabase.auth.getUser();
    if (authError) throw authError;
    if (!user?.id) throw new Error('Usuario no autenticado');

    const { error } = await this.supabase
      .from('booking_contracts')
      .update({
        accepted_by_renter: true,
        accepted_at: new Date().toISOString(),
      })
      .eq('id', contractId);
    if (error) throw error;
  }

  async getContractByBooking(bookingId: string): Promise<BookingContract | null> {
    const { data, error } = await this.supabase
      .from('booking_contracts')
      .select('*')
      .eq('booking_id', bookingId)
      .maybeSingle();
    if (error) throw error;
    return (data as BookingContract | null) ?? null;
  }

  /**
   * Accept contract with full metadata for legal compliance (Ley 25.506)
   * Validates all 4 priority clauses and captures audit trail
   */
  async acceptContractWithMetadata(params: {
    bookingId: string;
    clausesAccepted: ClausesAccepted;
    ipAddress: string;
    userAgent: string;
    deviceFingerprint: string;
  }): Promise<void> {
    // 1. Get contract record
    const contract = await this.getContractByBooking(params.bookingId);
    if (!contract) {
      throw new Error('Contract not found for this booking');
    }

    // 2. Validate all 4 clauses accepted
    const allAccepted = Object.values(params.clausesAccepted).every((v) => v === true);
    if (!allAccepted) {
      throw new Error('Debes aceptar TODAS las cláusulas para continuar');
    }

    // 3. Validate auth
    const {
      data: { user },
      error: authError,
    } = await this.supabase.auth.getUser();
    if (authError) throw authError;
    if (!user?.id) throw new Error('Usuario no autenticado');

    // 4. Update contract with full metadata
    const { error } = await this.supabase
      .from('booking_contracts')
      .update({
        accepted_by_renter: true,
        accepted_at: new Date().toISOString(),
        clauses_accepted: params.clausesAccepted,
        renter_ip_address: params.ipAddress,
        renter_user_agent: params.userAgent,
        renter_device_fingerprint: params.deviceFingerprint,
      })
      .eq('id', contract.id);

    if (error) throw error;
  }

  /**
   * Accept contract with EV clauses for electric vehicle rentals
   * Validates all base clauses + EV-specific clauses
   */
  async acceptEVContractWithMetadata(params: {
    bookingId: string;
    baseClauses: BaseClausesAccepted;
    evClauses: EVClausesAccepted;
    ipAddress: string;
    userAgent: string;
    deviceFingerprint: string;
  }): Promise<void> {
    // 1. Get contract record
    const contract = await this.getContractByBooking(params.bookingId);
    if (!contract) {
      throw new Error('Contract not found for this booking');
    }

    // 2. Validate all base clauses accepted
    const baseAllAccepted = Object.values(params.baseClauses).every((v) => v === true);
    if (!baseAllAccepted) {
      throw new Error('Debes aceptar TODAS las cláusulas base para continuar');
    }

    // 3. Validate all EV clauses accepted
    const evAllAccepted = Object.values(params.evClauses).every((v) => v === true);
    if (!evAllAccepted) {
      throw new Error('Debes aceptar TODAS las cláusulas EV para continuar');
    }

    // 4. Validate auth
    const {
      data: { user },
      error: authError,
    } = await this.supabase.auth.getUser();
    if (authError) throw authError;
    if (!user?.id) throw new Error('Usuario no autenticado');

    // 5. Update contract with full metadata
    const { error } = await this.supabase
      .from('booking_contracts')
      .update({
        accepted_by_renter: true,
        accepted_at: new Date().toISOString(),
        clauses_accepted: params.baseClauses,
        ev_clauses_accepted: params.evClauses,
        renter_ip_address: params.ipAddress,
        renter_user_agent: params.userAgent,
        renter_device_fingerprint: params.deviceFingerprint,
      })
      .eq('id', contract.id);

    if (error) throw error;
  }

  /**
   * Get all clause definitions for a booking (base + EV if applicable)
   */
  getClauseDefinitions(isEVVehicle: boolean): ClauseDefinition[] {
    if (isEVVehicle) {
      return [...BASE_CLAUSE_DEFINITIONS, ...EV_CLAUSE_DEFINITIONS];
    }
    return BASE_CLAUSE_DEFINITIONS;
  }

  /**
   * Check if all required clauses are accepted
   */
  validateClausesAccepted(
    clauses: Partial<ClausesAccepted>,
    isEVVehicle: boolean,
  ): { valid: boolean; missing: string[] } {
    const missing: string[] = [];

    // Check base clauses
    for (const clause of BASE_CLAUSE_DEFINITIONS) {
      if (!clauses[clause.id as keyof ClausesAccepted]) {
        missing.push(clause.title);
      }
    }

    // Check EV clauses if applicable
    if (isEVVehicle) {
      for (const clause of EV_CLAUSE_DEFINITIONS) {
        if (!clauses[clause.id as keyof ClausesAccepted]) {
          missing.push(clause.title);
        }
      }
    }

    return {
      valid: missing.length === 0,
      missing,
    };
  }
}
