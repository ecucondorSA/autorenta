import { Injectable, inject } from '@angular/core';
import { Observable, from, map, catchError, of } from 'rxjs';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseClientService } from './supabase-client.service';
import {
  FgoStatus,
  FgoStatusView,
  FgoMovement,
  FgoMovementView,
  SubfundBalance,
  MonthlyFgoSummary,
  MonthlyFgoSummaryView,
  DepositWithFgoContribution,
  DepositWithFgoView,
  PaySiniestroParams,
  TransferBetweenSubfundsParams,
  FgoRpcResult,
  SubfundType,
  mapFgoStatus,
  mapFgoMovement,
  centsToUsd,
  getSubfundName,
} from '../models/fgo.model';

/**
 * Servicio para gestionar el Fondo de Garantía Operativa (FGO)
 *
 * Funcionalidades:
 * - Consultar estado del FGO (saldos, métricas, RC, LR)
 * - Ver movimientos del FGO
 * - Ver depósitos con aportes al FGO
 * - Pagar siniestros (solo admins)
 * - Transferir entre subfondos (solo admins)
 * - Recalcular métricas
 */
@Injectable({
  providedIn: 'root',
})
export class FgoService {
  private readonly supabaseClient: SupabaseClient;

  constructor(private readonly supabaseService: SupabaseClientService) {
    this.supabaseClient = this.supabaseService.getClient();
  }

  // ============================================================================
  // CONSULTAS (READ)
  // ============================================================================

  /**
   * Obtiene el estado completo del FGO
   * Incluye saldos por subfondo, métricas (RC, LR) y estado
   */
  getStatus(): Observable<FgoStatus | null> {
    return from(
      this.supabaseClient
        .from('v_fgo_status')
        .select('*')
        .single()
    ).pipe(
      map((response) => {
        if (response.error) {
          console.error('Error fetching FGO status:', response.error);
          return null;
        }
        return response.data ? mapFgoStatus(response.data as FgoStatusView) : null;
      }),
      catchError((error) => {
        console.error('Error in getStatus:', error);
        return of(null);
      })
    );
  }

  /**
   * Obtiene los movimientos del FGO con paginación
   *
   * @param limit Número máximo de movimientos a retornar (default: 20)
   * @param offset Offset para paginación (default: 0)
   */
  getMovements(limit = 20, offset = 0): Observable<FgoMovementView[]> {
    return from(
      this.supabaseClient
        .from('v_fgo_movements_detailed')
        .select('*')
        .order('ts', { ascending: false })
        .range(offset, offset + limit - 1)
    ).pipe(
      map((response) => {
        if (response.error) {
          console.error('Error fetching FGO movements:', response.error);
          return [];
        }
        return (response.data || []).map((m) => mapFgoMovement(m as FgoMovement));
      }),
      catchError((error) => {
        console.error('Error in getMovements:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtiene los saldos de cada subfondo
   */
  getSubfundsBalance(): Observable<SubfundBalance[]> {
    return from(
      this.supabaseClient
        .from('fgo_subfunds')
        .select('*')
        .order('balance_cents', { ascending: false })
    ).pipe(
      map((response) => {
        if (response.error) {
          console.error('Error fetching subfunds balance:', response.error);
          return [];
        }

        const data = response.data || [];
        const total = data.reduce((sum, sf) => sum + sf.balance_cents, 0);

        return data.map((subfund) => ({
          type: subfund.subfund_type as SubfundType,
          balanceCents: subfund.balance_cents,
          balanceUsd: centsToUsd(subfund.balance_cents),
          percentage: total > 0 ? (subfund.balance_cents / total) * 100 : 0,
          description: subfund.meta?.description || '',
          purpose: subfund.meta?.purpose || getSubfundName(subfund.subfund_type),
        }));
      }),
      catchError((error) => {
        console.error('Error in getSubfundsBalance:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtiene resumen mensual del FGO
   *
   * @param months Número de meses a consultar (default: 6)
   */
  getMonthlySummary(months = 6): Observable<MonthlyFgoSummaryView[]> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    return from(
      this.supabaseClient
        .from('v_fgo_monthly_summary')
        .select('*')
        .gte('month', startDate.toISOString())
        .order('month', { ascending: false })
    ).pipe(
      map((response) => {
        if (response.error) {
          console.error('Error fetching monthly summary:', response.error);
          return [];
        }

        return (response.data || []).map((summary: MonthlyFgoSummary) => ({
          month: summary.month,
          movementType: summary.movement_type,
          subfundType: summary.subfund_type,
          movementCount: summary.movement_count,
          totalCredits: centsToUsd(summary.total_credits_cents),
          totalDebits: centsToUsd(summary.total_debits_cents),
          netChange: centsToUsd(summary.net_change_cents),
        }));
      }),
      catchError((error) => {
        console.error('Error in getMonthlySummary:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtiene depósitos con sus aportes al FGO
   *
   * @param limit Número máximo de depósitos a retornar (default: 20)
   * @param offset Offset para paginación (default: 0)
   */
  getDepositsWithContributions(limit = 20, offset = 0): Observable<DepositWithFgoView[]> {
    return from(
      this.supabaseClient
        .from('v_deposits_with_fgo_contributions')
        .select('*')
        .order('deposit_timestamp', { ascending: false })
        .range(offset, offset + limit - 1)
    ).pipe(
      map((response) => {
        if (response.error) {
          console.error('Error fetching deposits with contributions:', response.error);
          return [];
        }

        return (response.data || []).map((deposit: DepositWithFgoContribution) => ({
          id: deposit.wallet_ledger_id,
          timestamp: new Date(deposit.deposit_timestamp),
          userId: deposit.user_id,
          userName: deposit.user_name,
          depositAmount: deposit.deposit_usd,
          fgoContribution: deposit.fgo_contribution_usd || 0,
          alphaPercentage: deposit.alpha_percentage || 0,
          hasContribution: !!deposit.fgo_movement_id,
        }));
      }),
      catchError((error) => {
        console.error('Error in getDepositsWithContributions:', error);
        return of([]);
      })
    );
  }

  // ============================================================================
  // OPERACIONES ADMIN (WRITE)
  // ============================================================================

  /**
   * Paga un siniestro desde el subfondo de liquidez
   * Requiere permisos de admin
   *
   * @param params Parámetros del pago de siniestro
   */
  paySiniestro(params: PaySiniestroParams): Observable<FgoRpcResult | null> {
    return from(
      this.supabaseClient.rpc('fgo_pay_siniestro', {
        p_booking_id: params.bookingId,
        p_amount_cents: params.amountCents,
        p_description: params.description,
        p_ref: params.ref,
      })
    ).pipe(
      map((response) => {
        if (response.error) {
          console.error('Error paying siniestro:', response.error);
          return null;
        }
        return response.data as FgoRpcResult;
      }),
      catchError((error) => {
        console.error('Error in paySiniestro:', error);
        return of(null);
      })
    );
  }

  /**
   * Transfiere fondos entre subfondos
   * Requiere permisos de admin
   *
   * @param params Parámetros de la transferencia
   */
  transferBetweenSubfunds(params: TransferBetweenSubfundsParams): Observable<FgoRpcResult | null> {
    return from(
      this.supabaseClient.rpc('fgo_transfer_between_subfunds', {
        p_from_subfund: params.fromSubfund,
        p_to_subfund: params.toSubfund,
        p_amount_cents: params.amountCents,
        p_reason: params.reason,
        p_admin_id: params.adminId,
      })
    ).pipe(
      map((response) => {
        if (response.error) {
          console.error('Error transferring between subfunds:', response.error);
          return null;
        }
        return response.data as FgoRpcResult;
      }),
      catchError((error) => {
        console.error('Error in transferBetweenSubfunds:', error);
        return of(null);
      })
    );
  }

  /**
   * Recalcula las métricas del FGO (RC, LR, estado)
   * Útil para forzar actualización después de correcciones manuales
   */
  recalculateMetrics(): Observable<FgoRpcResult | null> {
    return from(
      this.supabaseClient.rpc('calculate_fgo_metrics')
    ).pipe(
      map((response) => {
        if (response.error) {
          console.error('Error recalculating metrics:', response.error);
          return null;
        }
        return response.data as FgoRpcResult;
      }),
      catchError((error) => {
        console.error('Error in recalculateMetrics:', error);
        return of(null);
      })
    );
  }

  /**
   * Actualiza el parámetro Alpha (α%)
   * Requiere permisos de admin
   *
   * @param newAlpha Nuevo valor de alpha (0-100)
   */
  updateAlpha(newAlpha: number): Observable<boolean> {
    if (newAlpha < 0 || newAlpha > 100) {
      console.error('Invalid alpha value. Must be between 0 and 100');
      return of(false);
    }

    return from(
      this.supabaseClient
        .from('fgo_metrics')
        .update({ alpha_percentage: newAlpha })
        .eq('id', true)
    ).pipe(
      map((response) => {
        if (response.error) {
          console.error('Error updating alpha:', response.error);
          return false;
        }
        return true;
      }),
      catchError((error) => {
        console.error('Error in updateAlpha:', error);
        return of(false);
      })
    );
  }

  // ============================================================================
  // UTILIDADES
  // ============================================================================

  /**
   * Verifica si el usuario actual es admin
   */
  async isAdmin(): Promise<boolean> {
    const { data: { user } } = await this.supabaseClient.auth.getUser();
    if (!user) return false;

    const { data: profile } = await this.supabaseClient
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    return profile?.is_admin === true;
  }

  /**
   * Obtiene el ID del usuario actual
   */
  async getCurrentUserId(): Promise<string | null> {
    const { data: { user } } = await this.supabaseClient.auth.getUser();
    return user?.id || null;
  }
}
