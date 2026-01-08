import { Injectable } from '@angular/core';
import { Observable, from, map, catchError, of, shareReplay } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
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
  INSURER_DISPLAY_NAMES,
  InsuranceVerification,
} from '@core/models';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';

/**
 * Servicio de Seguros P2P
 * Gestiona todo lo relacionado con seguros: pólizas, coberturas, siniestros e inspecciones
 */
@Injectable({
  providedIn: 'root',
})
export class InsuranceService {
  private readonly supabase = injectSupabase();

  // ✅ OPTIMIZED: Cached observables for static data
  private addonsCache$: Observable<InsuranceAddon[]> | null = null;
  private platformPolicyCache$: Observable<InsurancePolicy | null> | null = null;

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
        .order('created_at', { ascending: false }),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data as InsurancePolicy[]) || [];
      }),
      catchError((_err) => {
        return of([]);
      }),
    );
  }

  /**
   * Obtener la póliza flotante activa de la plataforma
   * ✅ OPTIMIZED: Uses shareReplay to cache static policy data
   */
  getPlatformFloatingPolicy(): Observable<InsurancePolicy | null> {
    if (this.platformPolicyCache$) {
      return this.platformPolicyCache$;
    }

    this.platformPolicyCache$ = from(
      this.supabase
        .from('insurance_policies')
        .select('*')
        .eq('policy_type', 'platform_floating')
        .eq('status', 'active')
        .single(),
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          if (error.code === 'PGRST116') return null; // No encontrado
          throw error;
        }
        return data as InsurancePolicy;
      }),
      catchError((_err) => {
        this.platformPolicyCache$ = null; // Clear cache on error
        return of(null);
      }),
      // ✅ Cache the result, share among subscribers
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    return this.platformPolicyCache$;
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
        .single(),
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          if (error.code === 'PGRST116') return null;
          throw error;
        }
        return data as InsurancePolicy;
      }),
      catchError(() => of(null)),
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
        ...policyData,
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
        status: approved ? 'active' : 'cancelled',
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
      p_addon_ids: request.addon_ids || [],
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
        .select(
          `
          *,
          policy:policy_id (*)
        `,
        )
        .eq('booking_id', bookingId)
        .eq('status', 'active')
        .single(),
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          if (error.code === 'PGRST116') return null;
          throw error;
        }
        return data as BookingInsuranceCoverage;
      }),
      catchError(() => of(null)),
    );
  }

  /**
   * Obtener resumen de seguro para mostrar en UI
   */
  async getInsuranceSummary(bookingId: string): Promise<InsuranceSummary | null> {
    // Obtener cobertura
    const { data: coverage, error: covError } = await this.supabase
      .from('booking_insurance_coverage')
      .select(
        `
        *,
        policy:policy_id (*)
      `,
      )
      .eq('booking_id', bookingId)
      .single();

    if (covError || !coverage) return null;

    // Obtener add-ons
    const { data: addons } = await this.supabase
      .from('booking_insurance_addons')
      .select(
        `
        *,
        addon:addon_id (*)
      `,
      )
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
      daily_premium: coverage.daily_premium_charged
        ? coverage.daily_premium_charged /
          this.calculateRentalDays(coverage.coverage_start, coverage.coverage_end)
        : undefined,
      total_premium: coverage.daily_premium_charged || 0,
      addons: addonsList.map((a) => ({
        name: (a.addon as InsuranceAddon).name,
        daily_cost: a.daily_cost,
        total_cost: a.total_cost,
      })),
      security_deposit: coverage.deductible_amount,
      certificate_number: coverage.certificate_number,
      coverage_details: {
        rc: true,
        own_damage: policy.own_damage_coverage,
        theft: policy.theft_coverage,
        fire: policy.fire_coverage,
        misappropriation: policy.misappropriation_coverage,
        countries: this.detectCoverageCountries(addonsList),
      },
    };
  }

  private calculateRentalDays(start: string, end: string): number {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1;
  }

  /**
   * Detecta países cubiertos basándose en los add-ons contratados
   * Si tiene el add-on 'paises_limitrofes', incluye países vecinos de Argentina
   */
  private detectCoverageCountries(addonsList: BookingInsuranceAddon[]): string[] {
    const hasLimitrofesAddon = addonsList.some(
      (a) => a.addon && a.addon.addon_type === 'paises_limitrofes'
    );

    if (hasLimitrofesAddon) {
      return ['Argentina', 'Uruguay', 'Chile', 'Brasil', 'Paraguay', 'Bolivia'];
    }

    return ['Argentina'];
  }

  // ============================================
  // ADD-ONS
  // ============================================

  /**
   * Obtener todos los add-ons disponibles
   * ✅ OPTIMIZED: Uses shareReplay to cache static addon data
   */
  getAvailableAddons(): Observable<InsuranceAddon[]> {
    if (this.addonsCache$) {
      return this.addonsCache$;
    }

    this.addonsCache$ = from(
      this.supabase
        .from('insurance_addons')
        .select('*')
        .eq('active', true)
        .order('daily_cost', { ascending: true }),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data as InsuranceAddon[]) || [];
      }),
      catchError((_err) => {
        this.addonsCache$ = null; // Clear cache on error
        return of([]);
      }),
      // ✅ Cache the result, share among subscribers
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    return this.addonsCache$;
  }

  /**
   * Obtener add-ons contratados de una reserva
   */
  getBookingAddons(bookingId: string): Observable<BookingInsuranceAddon[]> {
    return from(
      this.supabase
        .from('booking_insurance_addons')
        .select(
          `
          *,
          addon:addon_id (*)
        `,
        )
        .eq('booking_id', bookingId),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data as BookingInsuranceAddon[]) || [];
      }),
      catchError(() => of([])),
    );
  }

  // ============================================
  // SINIESTROS (CLAIMS)
  // ============================================

  /**
   * Subir foto de evidencia de siniestro
   * Path: {user_id}/claim-evidence/{booking_id}/{uuid}.{ext}
   */
  async uploadClaimEvidence(file: File, bookingId: string): Promise<string> {
    const userId = (await this.supabase.auth.getUser()).data['user']?.['id'];
    if (!userId) throw new Error('Usuario no autenticado');

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      throw new Error('Solo se permiten imágenes');
    }

    // Validar tamaño (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Imagen muy grande. Máximo 5MB');
    }

    // Obtener extensión del archivo
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';

    // Path: {userId}/claim-evidence/{bookingId}/{uuid}.{extension}
    const filePath = `${userId}/claim-evidence/${bookingId}/${uuidv4()}.${extension}`;

    const { error } = await this.supabase.storage.from('documents').upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

    if (error) throw error;

    // Retornar la ruta del archivo (sin bucket name)
    return filePath;
  }

  /**
   * Obtener URL pública de foto de evidencia
   */
  getClaimEvidenceUrl(filePath: string): string {
    const { data } = this.supabase.storage.from('documents').getPublicUrl(filePath);
    return data.publicUrl;
  }

  /**
   * Reportar un siniestro
   */
  async reportClaim(request: ReportClaimRequest): Promise<string> {
    const { data, error } = await this.supabase.rpc('report_insurance_claim', {
      p_booking_id: request.booking_id,
      p_claim_type: request.claim_type,
      p_description: request['description'],
      p_incident_date: request.incident_date,
      p_location: request.location,
      p_photos: request.photos || [],
    });

    if (error) throw error;
    return data as string; // claim_id
  }

  /**
   * Obtener siniestros de un usuario
   */
  getMyClaims(): Observable<InsuranceClaim[]> {
    return from(
      this.supabase.from('insurance_claims').select('*').order('created_at', { ascending: false }),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data as InsuranceClaim[]) || [];
      }),
      catchError((_err) => {
        return of([]);
      }),
    );
  }

  /**
   * Obtener un siniestro específico
   */
  getClaimById(claimId: string): Observable<InsuranceClaim | null> {
    return from(this.supabase.from('insurance_claims').select('*').eq('id', claimId).single()).pipe(
      map(({ data, error }) => {
        if (error) {
          if (error.code === 'PGRST116') return null;
          throw error;
        }
        return data as InsuranceClaim;
      }),
      catchError(() => of(null)),
    );
  }

  /**
   * Actualizar estado de siniestro (solo admin)
   */
  async updateClaimStatus(
    claimId: string,
    status: InsuranceClaim['status'],
    notes?: string,
  ): Promise<void> {
    const updateData: Record<string, unknown> = { status, updated_at: new Date().toISOString() };

    if (notes) {
      updateData['resolution_notes'] = notes;
    }

    if (status === 'paid') {
      updateData['closed_at'] = new Date().toISOString();
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
        inspector_id: (await this.supabase.auth.getUser()).data['user']?.['id'],
        completed: !!request.signature_data,
        signed_at: request.signature_data ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) throw error;
    return (data as VehicleInspection)['id'];
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
        .order('created_at', { ascending: true }),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data as VehicleInspection[]) || [];
      }),
      catchError(() => of([])),
    );
  }

  /**
   * Comparar inspecciones pre y post para detectar nuevos daños
   */
  async compareInspections(bookingId: string): Promise<{
    new_damages: unknown[];
    inspection_pre: VehicleInspection | null;
    inspection_post: VehicleInspection | null;
  }> {
    const { data } = await this.supabase
      .from('vehicle_inspections')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true });

    const inspections = (data || []) as VehicleInspection[];
    const pre = inspections.find((i) => i.inspection_type === 'pre_rental') || null;
    const post = inspections.find((i) => i.inspection_type === 'post_rental') || null;

    let new_damages: unknown[] = [];

    if (pre && post) {
      const preDamages = pre.damages_detected || [];
      const postDamages = post.damages_detected || [];

      // Detectar daños que están en POST pero no en PRE
      new_damages = postDamages.filter(
        (postDmg) =>
          !preDamages.some(
            (preDmg) => preDmg.location === postDmg.location && preDmg.type === postDmg.type,
          ),
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
      p_policy_id: null, // usará póliza flotante por defecto
    });

    if (error) {
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

  // ============================================
  // BYOI VERIFICATION (Mandatory for Pilot)
  // ============================================

  /**
   * Lista de aseguradoras aceptadas para BYOI
   */
  static readonly ACCEPTED_INSURERS = [
    // Con cláusula de alquiler sin chofer
    { code: 'rio_uruguay', name: 'Río Uruguay Seguros (RUS)', type: 'personal_endorsed' },
    { code: 'federacion_patronal', name: 'Federación Patronal', type: 'personal_endorsed' },
    { code: 'sancor', name: 'Sancor Seguros', type: 'personal_endorsed' },
    { code: 'rivadavia', name: 'Seguros Rivadavia', type: 'personal_endorsed' },
    // Seguros de flota
    { code: 'la_caja', name: 'La Caja', type: 'fleet' },
    { code: 'mapfre', name: 'Mapfre', type: 'fleet' },
    { code: 'san_cristobal', name: 'San Cristóbal', type: 'fleet' },
    { code: 'allianz', name: 'Allianz', type: 'fleet' },
    // Otros
    { code: 'other', name: 'Otra aseguradora', type: 'other' },
  ] as const;

  /**
   * Subir documento de seguro al storage
   * Path: {user_id}/insurance/{car_id}/{uuid}.{ext}
   */
  async uploadInsuranceDocument(file: File, carId: string): Promise<string> {
    const userId = (await this.supabase.auth.getUser()).data['user']?.['id'];
    if (!userId) throw new Error('Usuario no autenticado');

    // Validar tipo de archivo
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Solo se permiten archivos PDF o imágenes (JPG, PNG, WebP)');
    }

    // Validar tamaño (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('Archivo muy grande. Máximo 10MB');
    }

    // Obtener extensión del archivo
    const extension = file.name.split('.').pop()?.toLowerCase() || 'pdf';

    // Path: {userId}/insurance/{carId}/{uuid}.{extension}
    const filePath = `${userId}/insurance/${carId}/${uuidv4()}.${extension}`;

    const { error } = await this.supabase.storage.from('documents').upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

    if (error) throw error;

    // Obtener URL pública
    const { data: urlData } = this.supabase.storage.from('documents').getPublicUrl(filePath);
    return urlData.publicUrl;
  }

  /**
   * Enviar seguro para verificación
   * Llama al RPC submit_insurance_verification
   */
  async submitInsuranceForVerification(params: {
    carId: string;
    documentUrl: string;
    policyNumber: string;
    insurer: string;
    expiryDate: string;
    coverageType?: 'personal_endorsed' | 'fleet';
    hasRentalEndorsement?: boolean;
    rcAmount?: number;
  }): Promise<string> {
    const { data, error } = await this.supabase.rpc('submit_insurance_verification', {
      p_car_id: params.carId,
      p_document_url: params.documentUrl,
      p_policy_number: params.policyNumber,
      p_insurer: params.insurer,
      p_expiry_date: params.expiryDate,
      p_coverage_type: params.coverageType || 'personal_endorsed',
      p_has_rental_endorsement: params.hasRentalEndorsement ?? true,
      p_rc_amount: params.rcAmount || 50000000, // Default: $50M ARS
    });

    if (error) throw error;
    return data as string; // verification_id
  }

  /**
   * Obtener estado de verificación de seguro para un auto
   */
  async getInsuranceVerificationStatus(carId: string): Promise<{
    status: 'not_uploaded' | 'pending' | 'verified' | 'rejected' | 'expired';
    documentUrl?: string;
    policyNumber?: string;
    insurer?: string;
    expiresAt?: string;
    rejectionReason?: string;
    verifiedAt?: string;
  } | null> {
    const { data, error } = await this.supabase
      .from('cars')
      .select(`
        insurance_status,
        insurance_document_url,
        insurance_policy_number,
        insurance_company,
        insurance_expires_at,
        insurance_rejection_reason,
        insurance_verified_at
      `)
      .eq('id', carId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return {
      status: data.insurance_status || 'not_uploaded',
      documentUrl: data.insurance_document_url,
      policyNumber: data.insurance_policy_number,
      insurer: data.insurance_company,
      expiresAt: data.insurance_expires_at,
      rejectionReason: data.insurance_rejection_reason,
      verifiedAt: data.insurance_verified_at,
    };
  }

  /**
   * Verificar si un auto puede ser activado (tiene seguro verificado)
   */
  async canActivateCar(carId: string): Promise<{
    canActivate: boolean;
    reason?: string;
    insuranceStatus?: string;
  }> {
    const status = await this.getInsuranceVerificationStatus(carId);

    if (!status) {
      return {
        canActivate: false,
        reason: 'No se encontró información del vehículo',
      };
    }

    if (status.status === 'verified') {
      // Verificar que no esté vencido
      if (status.expiresAt && new Date(status.expiresAt) < new Date()) {
        return {
          canActivate: false,
          reason: 'El seguro ha vencido. Por favor actualiza tu póliza.',
          insuranceStatus: 'expired',
        };
      }
      return { canActivate: true, insuranceStatus: 'verified' };
    }

    const reasons: Record<string, string> = {
      not_uploaded: 'Debes subir tu póliza de seguro para activar el auto.',
      pending: 'Tu seguro está siendo verificado. Te notificaremos cuando esté listo.',
      rejected: status.rejectionReason || 'Tu seguro fue rechazado. Por favor sube un nuevo documento.',
      expired: 'El seguro ha vencido. Por favor actualiza tu póliza.',
    };

    return {
      canActivate: false,
      reason: reasons[status.status] || 'No se puede activar el auto.',
      insuranceStatus: status.status,
    };
  }

  /**
   * Obtener historial de verificaciones de seguro para un auto
   */
  getInsuranceVerificationHistory(carId: string): Observable<InsuranceVerification[]> {
    return from(
      this.supabase
        .from('insurance_verifications')
        .select('*')
        .eq('car_id', carId)
        .order('created_at', { ascending: false }),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data as InsuranceVerification[]) || [];
      }),
      catchError(() => of([])),
    );
  }
}
