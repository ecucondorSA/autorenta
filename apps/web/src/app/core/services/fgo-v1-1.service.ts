import { Injectable } from '@angular/core';
import { Observable, from, map, catchError, of } from 'rxjs';
import { SupabaseClient } from '@supabase/supabase-js';

// Models v1.1
import {
  FgoParameters,
  FgoParametersDb,
  BookingRiskSnapshot,
  BookingRiskSnapshotDb,
  BookingInspection,
  BookingInspectionDb,
  FgoStatusV1_1,
  PemCalculation,
  RcCalculationV1_1,
  AlphaAdjustment,
  EligibilityResult,
  WaterfallResult,
  CreateRiskSnapshotParams,
  CreateInspectionParams,
  AssessEligibilityParams,
  ExecuteWaterfallParams,
  UpdateParametersParams,
  mapFgoParameters,
  mapBookingRiskSnapshot,
  mapBookingInspection,
  centsToUsd,
} from '../models/fgo-v1-1.model';

// Models v1.0 (base)
import { FgoMovementView } from '../models/fgo.model';
import { SupabaseClientService } from './supabase-client.service';

/**
 * Servicio para gestionar FGO v1.1 (Extensión de FgoService)
 *
 * NUEVAS FUNCIONALIDADES v1.1:
 * - Gestión de parámetros por país/bucket
 * - Snapshots de riesgo por booking
 * - Inspecciones de vehículo
 * - Evaluación de elegibilidad
 * - Ejecución de waterfall
 * - Métricas extendidas (PEM, RC dinámico)
 */
@Injectable({
  providedIn: 'root',
})
export class FgoV1_1Service {
  private readonly supabaseClient: SupabaseClient;
  private readonly riskSnapshotTable = 'booking_risk_snapshots';

  constructor(private readonly supabaseService: SupabaseClientService) {
    this.supabaseClient = this.supabaseService.getClient();
  }

  // ============================================================================
  // PARÁMETROS FGO
  // ============================================================================

  /**
   * Obtiene los parámetros FGO para un país/bucket específico
   */
  getParameters(countryCode: string, bucket: string): Observable<FgoParameters | null> {
    return from(
      this.supabaseClient
        .from('fgo_parameters')
        .select('*')
        .eq('country_code', countryCode)
        .eq('bucket', bucket)
        .single(),
    ).pipe(
      map((response) => {
        if (response['error']) {
          return null;
        }
        return response.data ? mapFgoParameters(response.data as FgoParametersDb) : null;
      }),
      catchError((_error) => {
        return of(null);
      }),
    );
  }

  /**
   * Obtiene todos los parámetros FGO (todos los países/buckets)
   */
  getAllParameters(): Observable<FgoParameters[]> {
    return from(
      this.supabaseClient.from('fgo_parameters').select('*').order('country_code').order('bucket'),
    ).pipe(
      map((response) => {
        if (response['error']) {
          return [];
        }
        return (response.data || []).map((p) => mapFgoParameters(p as FgoParametersDb));
      }),
      catchError((_error) => {
        return of([]);
      }),
    );
  }

  /**
   * Actualiza parámetros FGO (solo admins)
   */
  updateParameters(params: UpdateParametersParams): Observable<boolean> {
    const updates: Partial<FgoParametersDb> = {};

    if (params.alpha !== undefined) updates.alpha = params.alpha;
    if (params.rcFloor !== undefined) updates.rc_floor = params.rcFloor;
    if (params.eventCapUsd !== undefined) updates.event_cap_usd = params.eventCapUsd;
    if (params.perUserLimit !== undefined) updates.per_user_limit = params.perUserLimit;

    return from(
      this.supabaseClient
        .from('fgo_parameters')
        .update(updates)
        .eq('country_code', params.countryCode)
        .eq('bucket', params.bucket),
    ).pipe(
      map((response) => {
        if (response['error']) {
          return false;
        }
        return true;
      }),
      catchError((_error) => {
        return of(false);
      }),
    );
  }

  // ============================================================================
  // SNAPSHOTS DE RIESGO
  // ============================================================================

  /**
   * Crea un snapshot de riesgo para un booking
   */
  createRiskSnapshot(params: CreateRiskSnapshotParams): Observable<BookingRiskSnapshot | null> {
    const snapshotData: Omit<BookingRiskSnapshotDb, 'created_at'> = {
      booking_id: params['bookingId'],
      country_code: params.countryCode,
      bucket: params.bucket,
      fx_snapshot: params.fxSnapshot,
      currency: params['currency'],
      estimated_hold_amount: params.estimatedHoldAmount,
      estimated_deposit: params.estimatedDeposit,
      franchise_usd: params.franchiseUsd,
      has_card: params.hasCard,
      has_wallet_security: params.hasWalletSecurity,
      meta: {},
    };

    return from(
      this.supabaseClient.from(this.riskSnapshotTable).insert(snapshotData).select().single(),
    ).pipe(
      map((response) => {
        if (response['error']) {
          return null;
        }
        return response.data
          ? mapBookingRiskSnapshot(response.data as BookingRiskSnapshotDb)
          : null;
      }),
      catchError((_error) => {
        return of(null);
      }),
    );
  }

  /**
   * Obtiene el snapshot de riesgo de un booking
   */
  getRiskSnapshot(bookingId: string): Observable<BookingRiskSnapshot | null> {
    return from(
      this.supabaseClient
        .from(this.riskSnapshotTable)
        .select('*')
        .eq('booking_id', bookingId)
        .maybeSingle(),
    ).pipe(
      map((response) => {
        if (response['error']) {
          return null;
        }
        return response.data
          ? mapBookingRiskSnapshot(response.data as BookingRiskSnapshotDb)
          : null;
      }),
      catchError((_error) => {
        return of(null);
      }),
    );
  }

  // ============================================================================
  // INSPECCIONES DE VEHÍCULO
  // ============================================================================

  /**
   * Crea una inspección de vehículo
   */
  createInspection(params: CreateInspectionParams): Observable<BookingInspection | null> {
    const inspectionData: Omit<BookingInspectionDb, 'id' | 'created_at' | 'signed_at'> = {
      booking_id: params['bookingId'],
      stage: params.stage,
      inspector_id: params.inspectorId,
      photos: params.photos,
      odometer: params.odometer,
      fuel_level: params.fuelLevel,
      latitude: params.latitude,
      longitude: params.longitude,
    };

    return from(
      this.supabaseClient.from('booking_inspections').insert(inspectionData).select().single(),
    ).pipe(
      map((response) => {
        if (response['error']) {
          return null;
        }
        return response.data ? mapBookingInspection(response.data as BookingInspectionDb) : null;
      }),
      catchError((_error) => {
        return of(null);
      }),
    );
  }

  /**
   * Firma una inspección (marca como completada)
   */
  signInspection(inspectionId: string): Observable<boolean> {
    return from(
      this.supabaseClient
        .from('booking_inspections')
        .update({ signed_at: new Date().toISOString() })
        .eq('id', inspectionId),
    ).pipe(
      map((response) => {
        if (response['error']) {
          return false;
        }
        return true;
      }),
      catchError((_error) => {
        return of(false);
      }),
    );
  }

  /**
   * Obtiene las inspecciones de un booking
   */
  getInspections(bookingId: string): Observable<BookingInspection[]> {
    return from(
      this.supabaseClient
        .from('booking_inspections')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true }),
    ).pipe(
      map((response) => {
        if (response['error']) {
          return [];
        }
        return (response.data || []).map((i) => mapBookingInspection(i as BookingInspectionDb));
      }),
      catchError((_error) => {
        return of([]);
      }),
    );
  }

  /**
   * Obtiene una inspección específica (por booking y stage)
   */
  getInspectionByStage(
    bookingId: string,
    stage: 'check_in' | 'check_out',
  ): Observable<BookingInspection | null> {
    return from(
      this.supabaseClient
        .from('booking_inspections')
        .select('*')
        .eq('booking_id', bookingId)
        .eq('stage', stage)
        .single(),
    ).pipe(
      map((response) => {
        if (response['error']) {
          return null;
        }
        return response.data ? mapBookingInspection(response.data as BookingInspectionDb) : null;
      }),
      catchError((_error) => {
        return of(null);
      }),
    );
  }

  // ============================================================================
  // MÉTRICAS EXTENDIDAS v1.1
  // ============================================================================

  /**
   * Obtiene el estado extendido del FGO con métricas v1.1
   */
  getStatusV1_1(): Observable<FgoStatusV1_1 | null> {
    return from(this.supabaseClient.from('v_fgo_status_v1_1').select('*').single()).pipe(
      map((response) => {
        if (response['error']) {
          return null;
        }

        const data = response.data;
        if (!data) return null;

        return {
          // v1.0 fields
          liquidityBalance: centsToUsd(data.liquidity_balance_cents),
          capitalizationBalance: centsToUsd(data.capitalization_balance_cents),
          profitabilityBalance: centsToUsd(data.profitability_balance_cents),
          totalBalance: centsToUsd(data.total_fgo_balance_cents),
          alphaPercentage: data.alpha_percentage,
          targetMonthsCoverage: data.target_months_coverage,
          totalContributions: centsToUsd(data.total_contributions_cents),
          totalSiniestrosPaid: centsToUsd(data.total_siniestros_paid_cents),
          totalSiniestrosCount: data.total_siniestros_count,
          coverageRatio: data.coverage_ratio,
          lossRatio: data.loss_ratio,
          targetBalance: data.target_balance_cents ? centsToUsd(data.target_balance_cents) : null,
          status: data['status'],

          // 🆕 v1.1 fields
          pemCents: data.pem_cents,
          pem: data.pem_cents ? centsToUsd(data.pem_cents) : null,
          lr90d: data.lr_90d,
          lr365d: data.lr_365d,
          totalEvents90d: data.total_events_90d || 0,
          avgRecoveryRate: data.avg_recovery_rate,

          lastCalculatedAt: new Date(data.last_calculated_at),
          updatedAt: new Date(data['updated_at']),
        } as FgoStatusV1_1;
      }),
      catchError((_error) => {
        return of(null);
      }),
    );
  }

  /**
   * Calcula PEM (Pérdida Esperada Mensual) para un país/bucket
   */
  calculatePem(
    countryCode?: string,
    bucket?: string,
    windowDays = 90,
  ): Observable<PemCalculation | null> {
    return from(
      this.supabaseClient.rpc('calculate_pem', {
        p_country_code: countryCode || null,
        p_bucket: bucket || null,
        p_window_days: windowDays,
      }),
    ).pipe(
      map((response) => {
        if (response['error']) {
          return null;
        }

        const results = response.data as Record<string, unknown>[] | null;
        const data = results?.[0];
        if (!data) return null;

        return {
          countryCode: data.country_code as string,
          bucket: data.bucket as string,
          pemCents: data.pem_cents as number,
          pem: centsToUsd(data.pem_cents as number),
          eventCount: data.event_count as number,
          avgEventCents: data.avg_event_cents as number,
          avgEvent: centsToUsd(data.avg_event_cents as number),
          totalPaid: centsToUsd(data.total_paid_cents as number),
          totalRecovered: centsToUsd(data.total_recovered_cents as number),
        } as PemCalculation;
      }),
      catchError((_error) => {
        return of(null);
      }),
    );
  }

  /**
   * Calcula RC dinámico v1.1 (basado en PEM)
   */
  calculateRcV1_1(countryCode?: string, bucket?: string): Observable<RcCalculationV1_1 | null> {
    return from(
      this.supabaseClient.rpc('calculate_rc_v1_1', {
        p_country_code: countryCode || null,
        p_bucket: bucket || null,
      }),
    ).pipe(
      map((response) => {
        if (response['error']) {
          return null;
        }

        const data = response.data;
        if (!data) return null;

        return {
          pemCents: data.pem_cents,
          pem: centsToUsd(data.pem_cents),
          currentBalanceCents: data.current_balance_cents,
          currentBalance: centsToUsd(data.current_balance_cents),
          targetBalanceCents: data.target_balance_cents,
          targetBalance: centsToUsd(data.target_balance_cents),
          rc: data.rc,
          eventCount: data.event_count,
          status: data['status'],
          calculatedAt: new Date(data.calculated_at),
        } as RcCalculationV1_1;
      }),
      catchError((_error) => {
        return of(null);
      }),
    );
  }

  /**
   * Ajusta alpha dinámicamente según RC (solo ejecutable por admin/cron)
   */
  adjustAlphaDynamic(countryCode: string, bucket: string): Observable<AlphaAdjustment | null> {
    return from(
      this.supabaseClient.rpc('adjust_alpha_dynamic', {
        p_country_code: countryCode,
        p_bucket: bucket,
      }),
    ).pipe(
      map((response) => {
        if (response['error']) {
          return null;
        }

        const data = response.data;
        if (!data) return null;

        return {
          countryCode: data.country_code,
          bucket: data.bucket,
          rc: data.rc,
          previousAlpha: data.previous_alpha,
          newAlpha: data.new_alpha,
          adjusted: data.adjusted,
          adjustmentDelta: data.adjustment_delta,
          timestamp: new Date(data.timestamp),
        } as AlphaAdjustment;
      }),
      catchError((_error) => {
        return of(null);
      }),
    );
  }

  // ============================================================================
  // WATERFALL Y ELEGIBILIDAD
  // ============================================================================

  /**
   * Evalúa la elegibilidad de un booking para cobertura FGO
   */
  assessEligibility(params: AssessEligibilityParams): Observable<EligibilityResult | null> {
    return from(
      this.supabaseClient.rpc('fgo_assess_eligibility', {
        p_booking_id: params['bookingId'],
        p_claim_amount_cents: params.claimAmountCents,
      }),
    ).pipe(
      map((response) => {
        if (response['error']) {
          return null;
        }

        const data = response.data;
        if (!data) return null;

        return {
          eligible: data.eligible,
          reasons: data.reasons || [],
          rc: data.rc,
          rcStatus: data.rc_status,
          franchisePercentage: data.franchise_percentage,
          maxCoverCents: data.max_cover_cents,
          maxCoverUsd: data.max_cover_usd,
          eventCapUsd: data.event_cap_usd,
          monthlyPayoutUsedCents: data.monthly_payout_used_cents,
          monthlyCapCents: data.monthly_cap_cents,
          userEventsQuarter: data.user_events_quarter,
          userEventLimit: data.user_event_limit,
          fgoBalanceCents: data.fgo_balance_cents,
          snapshot: data.snapshot,
        } as EligibilityResult;
      }),
      catchError((_error) => {
        return of(null);
      }),
    );
  }

  /**
   * Ejecuta el waterfall completo de cobros
   * IMPORTANTE: Solo ejecutable por service role (admin/sistema)
   */
  executeWaterfall(params: ExecuteWaterfallParams): Observable<WaterfallResult | null> {
    return from(
      this.supabaseClient.rpc('fgo_execute_waterfall', {
        p_booking_id: params['bookingId'],
        p_total_claim_cents: params.totalClaimCents,
        p_description: params['description'],
        p_evidence_url: params.evidenceUrl || null,
      }),
    ).pipe(
      map((response) => {
        if (response['error']) {
          return null;
        }

        const data = response.data;
        if (!data) return null;

        return {
          ok: data.ok,
          error: data['error'],
          bookingId: data.booking_id,
          totalClaimCents: data.total_claim_cents,
          breakdown: {
            holdCaptured: data.breakdown.hold_captured,
            walletDebited: data.breakdown.wallet_debited,
            extraCharged: data.breakdown.extra_charged,
            fgoPaid: data.breakdown.fgo_paid,
            remainingUncovered: data.breakdown.remaining_uncovered,
          },
          fgoMovementId: data.fgo_movement_id,
          fgoRef: data.fgo_ref,
          eligibility: data.eligibility,
          executedAt: new Date(data.executed_at),
        } as WaterfallResult;
      }),
      catchError((_error) => {
        return of(null);
      }),
    );
  }

  // ============================================================================
  // UTILIDADES
  // ============================================================================

  /**
   * Verifica si el usuario actual es admin
   */
  async isAdmin(): Promise<boolean> {
    const {
      data: { user },
    } = await this.supabaseClient.auth.getUser();
    if (!user) return false;

    const { data: profile } = await this.supabaseClient
      .from('profiles')
      .select('is_admin')
      .eq('id', user['id'])
      .single();

    return profile?.['is_admin'] === true;
  }

  /**
   * Obtiene el ID del usuario actual
   */
  async getCurrentUserId(): Promise<string | null> {
    const {
      data: { user },
    } = await this.supabaseClient.auth.getUser();
    return user?.['id'] || null;
  }

  getMovements(limit: number, offset: number): Observable<FgoMovementView[]> {
    return from(
      this.supabaseClient
        .from('fgo_movements_view') // Assuming a view with this name exists
        .select('*')
        .limit(limit)
        .range(offset, offset + limit - 1),
    ).pipe(
      map((response) => {
        if (response['error']) {
          return [];
        }
        return response.data as FgoMovementView[];
      }),
      catchError((_error) => {
        return of([]);
      }),
    );
  }

  recalculateMetrics(): Observable<{ ok: boolean; error?: string }> {
    return from(this.supabaseClient.rpc('recalculate_fgo_metrics')).pipe(
      map((response) => {
        if (response['error']) {
          return { ok: false, error: response['error']['message'] };
        }
        return { ok: true };
      }),
      catchError((_error) => {
        return of({ ok: false, error: _error['message'] });
      }),
    );
  }

  transferBetweenSubfunds(params: {
    fromSubfund: string;
    toSubfund: string;
    amountCents: number;
    reason: string;
    adminId: string;
  }): Observable<{ ok: boolean; ref?: string; error?: string }> {
    return from(
      this.supabaseClient.rpc('transfer_fgo_funds', {
        p_from_subfund: params.fromSubfund,
        p_to_subfund: params.toSubfund,
        p_amount_cents: params.amountCents,
        p_reason: params.reason,
        p_admin_id: params.adminId,
      }),
    ).pipe(
      map((response) => {
        if (response['error']) {
          return { ok: false, error: response['error']['message'] };
        }
        return { ok: true, ref: response.data };
      }),
      catchError((_error) => {
        return of({ ok: false, error: _error['message'] });
      }),
    );
  }

  paySiniestro(params: {
    bookingId: string;
    amountCents: number;
    description: string;
  }): Observable<{ ok: boolean; ref?: string; error?: string }> {
    return from(
      this.supabaseClient.rpc('pay_fgo_siniestro', {
        p_booking_id: params['bookingId'],
        p_amount_cents: params.amountCents,
        p_description: params['description'],
      }),
    ).pipe(
      map((response) => {
        if (response['error']) {
          return { ok: false, error: response['error']['message'] };
        }
        return { ok: true, ref: response.data };
      }),
      catchError((_error) => {
        return of({ ok: false, error: _error['message'] });
      }),
    );
  }
}
