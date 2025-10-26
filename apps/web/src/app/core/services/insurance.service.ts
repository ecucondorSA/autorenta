import { Injectable, inject } from '@angular/core';
import { Observable, from, map, catchError, of } from 'rxjs';
import { injectSupabase } from './supabase-client.service';
import {
  InsurancePolicy,
  BookingInsuranceCoverage,
  InsuranceAddon,
  BookingInsuranceAddon,
  InsuranceClaim,
  VehicleInspection,
  InsuranceSummary,
  ActivateInsuranceCoverageRequest,
  ReportClaimRequest,
  CreateInspectionRequest,
  INSURER_DISPLAY_NAMES
} from '../models/insurance.model';

/**
 * Servicio de Seguros P2P
 * Gestiona todo lo relacionado con seguros: pólizas, coberturas, siniestros e inspecciones
 */
@Injectable({
  providedIn: 'root'
})
export class InsuranceService {
  private readonly supabase = injectSupabase();

  // ============================================
  // PÓLIZAS
  // ============================================

  /**
   * Obtener todas las pólizas activas disponibles
   */
  getActivePolicies(): Observable<InsurancePolicy[]> {
    return from(
      this.supabase
        .from('insurance_policies')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data as InsurancePolicy[]) || [];
      }),
      catchError(err => {
        console.error('Error fetching insurance policies:', err);
        return of([]);
      })
    );
  }

  /**
   * Obtener la póliza flotante activa de la plataforma
   */
  getPlatformFloatingPolicy(): Observable<InsurancePolicy | null> {
    return from(
      this.supabase
        .from('insurance_policies')
        .select('*')
        .eq('policy_type', 'platform_floating')
        .eq('status', 'active')
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          if (error.code === 'PGRST116') return null; // No encontrado
          throw error;
        }
        return data as InsurancePolicy;
      }),
      catchError(err => {
        console.error('Error fetching platform policy:', err);
        return of(null);
      })
    );
  }

  /**
   * Obtener póliza propia de un propietario para un auto específico
   */
  getOwnerPolicy(carId: string): Observable<InsurancePolicy | null> {
    return from(
      this.supabase
        .from('insurance_policies')
        .select('*')
        .eq('policy_type', 'owner_byoi')
        .eq('car_id', carId)
        .eq('status', 'active')
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          if (error.code === 'PGRST116') return null;
          throw error;
        }
        return data as InsurancePolicy;
      }),
      catchError(() => of(null))
    );
  }

  /**
   * Registrar póliza propia de propietario (BYOI)
   */
  async registerOwnerPolicy(policyData: Partial<InsurancePolicy>): Promise<InsurancePolicy> {
    const { data, error } = await this.supabase
      .from('insurance_policies')
      .insert({
        policy_type: 'owner_byoi',
        status: 'pending_verification',
        ...policyData
      })
      .select()
      .single();

    if (error) throw error;
    return data as InsurancePolicy;
  }

  /**
   * Verificar póliza de propietario (solo admin)
   */
  async verifyOwnerPolicy(policyId: string, approved: boolean): Promise<void> {
    const { error } = await this.supabase
      .from('insurance_policies')
      .update({
        verified_by_admin: approved,
        verification_date: new Date().toISOString(),
        status: approved ? 'active' : 'cancelled'
      })
      .eq('id', policyId);

    if (error) throw error;
  }

  // ============================================
  // COBERTURAS
  // ============================================

  /**
   * Activar cobertura de seguro para una reserva
   */
  async activateCoverage(request: ActivateInsuranceCoverageRequest): Promise<string> {
    const { data, error } = await this.supabase.rpc('activate_insurance_coverage', {
      p_booking_id: request.booking_id,
      p_addon_ids: request.addon_ids || []
    });

    if (error) throw error;
    return data as string; // coverage_id
  }

  /**
   * Obtener cobertura activa de una reserva
   */
  getBookingCoverage(bookingId: string): Observable<BookingInsuranceCoverage | null> {
    return from(
      this.supabase
        .from('booking_insurance_coverage')
        .select(`
          *,
          policy:policy_id (*)
        `)
        .eq('booking_id', bookingId)
        .eq('status', 'active')
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          if (error.code === 'PGRST116') return null;
          throw error;
        }
        return data as BookingInsuranceCoverage;
      }),
      catchError(() => of(null))
    );
  }

  /**
   * Obtener resumen de seguro para mostrar en UI
   */
  async getInsuranceSummary(bookingId: string): Promise<InsuranceSummary | null> {
    // Obtener cobertura
    const { data: coverage, error: covError } = await this.supabase
      .from('booking_insurance_coverage')
      .select(`
        *,
        policy:policy_id (*)
      `)
      .eq('booking_id', bookingId)
      .single();

    if (covError || !coverage) return null;

    // Obtener add-ons
    const { data: addons } = await this.supabase
      .from('booking_insurance_addons')
      .select(`
        *,
        addon:addon_id (*)
      `)
      .eq('booking_id', bookingId);

    const policy = coverage.policy as InsurancePolicy;
    const addonsList = (addons || []) as BookingInsuranceAddon[];

    return {
      has_coverage: true,
      policy_type: policy.policy_type,
      insurer: policy.insurer,
      insurer_display_name: INSURER_DISPLAY_NAMES[policy.insurer],
      liability_coverage: coverage.liability_coverage,
      deductible_amount: coverage.deductible_amount,
      daily_premium: coverage.daily_premium_charged ? 
        coverage.daily_premium_charged / this.calculateRentalDays(coverage.coverage_start, coverage.coverage_end) : 
        undefined,
      total_premium: coverage.daily_premium_charged || 0,
      addons: addonsList.map(a => ({
        name: (a.addon as InsuranceAddon).name,
        daily_cost: a.daily_cost,
        total_cost: a.total_cost
      })),
      security_deposit: coverage.deductible_amount,
      certificate_number: coverage.certificate_number,
      coverage_details: {
        rc: true,
        own_damage: policy.own_damage_coverage,
        theft: policy.theft_coverage,
        fire: policy.fire_coverage,
        misappropriation: policy.misappropriation_coverage,
        countries: ['Argentina'] // TODO: detectar add-on países limítrofes
      }
    };
  }

  private calculateRentalDays(start: string, end: string): number {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1;
  }

  // ============================================
  // ADD-ONS
  // ============================================

  /**
   * Obtener todos los add-ons disponibles
   */
  getAvailableAddons(): Observable<InsuranceAddon[]> {
    return from(
      this.supabase
        .from('insurance_addons')
        .select('*')
        .eq('active', true)
        .order('daily_cost', { ascending: true })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data as InsuranceAddon[]) || [];
      }),
      catchError(err => {
        console.error('Error fetching insurance addons:', err);
        return of([]);
      })
    );
  }

  /**
   * Obtener add-ons contratados de una reserva
   */
  getBookingAddons(bookingId: string): Observable<BookingInsuranceAddon[]> {
    return from(
      this.supabase
        .from('booking_insurance_addons')
        .select(`
          *,
          addon:addon_id (*)
        `)
        .eq('booking_id', bookingId)
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data as BookingInsuranceAddon[]) || [];
      }),
      catchError(() => of([]))
    );
  }

  // ============================================
  // SINIESTROS (CLAIMS)
  // ============================================

  /**
   * Reportar un siniestro
   */
  async reportClaim(request: ReportClaimRequest): Promise<string> {
    const { data, error } = await this.supabase.rpc('report_insurance_claim', {
      p_booking_id: request.booking_id,
      p_claim_type: request.claim_type,
      p_description: request.description,
      p_incident_date: request.incident_date,
      p_location: request.location,
      p_photos: request.photos || []
    });

    if (error) throw error;
    return data as string; // claim_id
  }

  /**
   * Obtener siniestros de un usuario
   */
  getMyClaims(): Observable<InsuranceClaim[]> {
    return from(
      this.supabase
        .from('insurance_claims')
        .select('*')
        .order('created_at', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data as InsuranceClaim[]) || [];
      }),
      catchError(err => {
        console.error('Error fetching claims:', err);
        return of([]);
      })
    );
  }

  /**
   * Obtener un siniestro específico
   */
  getClaimById(claimId: string): Observable<InsuranceClaim | null> {
    return from(
      this.supabase
        .from('insurance_claims')
        .select('*')
        .eq('id', claimId)
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          if (error.code === 'PGRST116') return null;
          throw error;
        }
        return data as InsuranceClaim;
      }),
      catchError(() => of(null))
    );
  }

  /**
   * Actualizar estado de siniestro (solo admin)
   */
  async updateClaimStatus(
    claimId: string, 
    status: InsuranceClaim['status'],
    notes?: string
  ): Promise<void> {
    const updateData: any = { status, updated_at: new Date().toISOString() };
    
    if (notes) {
      updateData.resolution_notes = notes;
    }
    
    if (status === 'closed') {
      updateData.closed_at = new Date().toISOString();
    }

    const { error } = await this.supabase
      .from('insurance_claims')
      .update(updateData)
      .eq('id', claimId);

    if (error) throw error;
  }

  // ============================================
  // INSPECCIONES
  // ============================================

  /**
   * Crear inspección pre/post alquiler
   */
  async createInspection(request: CreateInspectionRequest): Promise<string> {
    const { data, error } = await this.supabase
      .from('vehicle_inspections')
      .insert({
        ...request,
        inspector_id: (await this.supabase.auth.getUser()).data.user?.id,
        completed: !!request.signature_data,
        signed_at: request.signature_data ? new Date().toISOString() : null
      })
      .select()
      .single();

    if (error) throw error;
    return (data as VehicleInspection).id;
  }

  /**
   * Obtener inspecciones de una reserva
   */
  getBookingInspections(bookingId: string): Observable<VehicleInspection[]> {
    return from(
      this.supabase
        .from('vehicle_inspections')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data as VehicleInspection[]) || [];
      }),
      catchError(() => of([]))
    );
  }

  /**
   * Comparar inspecciones pre y post para detectar nuevos daños
   */
  async compareInspections(bookingId: string): Promise<{
    new_damages: any[];
    inspection_pre: VehicleInspection | null;
    inspection_post: VehicleInspection | null;
  }> {
    const { data } = await this.supabase
      .from('vehicle_inspections')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true });

    const inspections = (data || []) as VehicleInspection[];
    const pre = inspections.find(i => i.inspection_type === 'pre_rental') || null;
    const post = inspections.find(i => i.inspection_type === 'post_rental') || null;

    let new_damages: any[] = [];

    if (pre && post) {
      const preDamages = pre.damages_detected || [];
      const postDamages = post.damages_detected || [];
      
      // Detectar daños que están en POST pero no en PRE
      new_damages = postDamages.filter(postDmg => 
        !preDamages.some(preDmg => 
          preDmg.location === postDmg.location && preDmg.type === postDmg.type
        )
      );
    }

    return { new_damages, inspection_pre: pre, inspection_post: post };
  }

  // ============================================
  // UTILIDADES
  // ============================================

  /**
   * Calcular depósito de seguridad basado en valor del auto y póliza
   */
  async calculateSecurityDeposit(carId: string): Promise<number> {
    const { data, error } = await this.supabase.rpc('calculate_deductible', {
      p_car_id: carId,
      p_policy_id: null // usará póliza flotante por defecto
    });

    if (error) {
      console.error('Error calculating deposit:', error);
      return 500000; // Fallback: $500k
    }

    return data as number;
  }

  /**
   * Verificar si un auto tiene seguro propio (BYOI)
   */
  async hasOwnerInsurance(carId: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('cars')
      .select('has_owner_insurance')
      .eq('id', carId)
      .single();

    return data?.has_owner_insurance || false;
  }

  /**
   * Obtener comisión aplicable según tipo de seguro
   * 25% para seguro flotante, 15% para seguro propio
   */
  async getCommissionRate(carId: string): Promise<number> {
    const hasOwnInsurance = await this.hasOwnerInsurance(carId);
    return hasOwnInsurance ? 0.15 : 0.25;
  }
}
