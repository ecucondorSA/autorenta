import { Injectable, inject } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';

/**
 * Resultado de adquisición de lock
 */
export interface ClaimLockResult {
  ok: boolean;
  error?: string;
}

/**
 * ClaimLockService
 *
 * Responsable de:
 * - Adquirir locks optimistas en claims para prevenir double-spend
 * - Liberar locks en caso de error
 * - Marcar claims como pagados (estado final)
 *
 * P0-SECURITY: Implementa locking optimista para prevenir race conditions
 * y doble procesamiento de claims.
 *
 * Extraído de SettlementService para mejor separación de responsabilidades.
 */
@Injectable({
  providedIn: 'root',
})
export class ClaimLockService {
  private readonly supabaseClient: SupabaseClient;
  private readonly logger = inject(LoggerService).createChildLogger('ClaimLock');

  // Lock expiry time in minutes
  private readonly LOCK_EXPIRY_MINUTES = 5;

  constructor(private readonly supabaseService: SupabaseClientService) {
    this.supabaseClient = this.supabaseService.getClient();
  }

  // ============================================================================
  // CLAIM LOCKING (previene double-spend)
  // ============================================================================

  /**
   * Acquire optimistic lock on a claim before processing
   * Uses atomic UPDATE with WHERE clause to prevent race conditions
   *
   * @param claimId - ID of the claim to lock
   * @returns Result indicating if lock was acquired
   */
  async acquireClaimLock(claimId: string): Promise<ClaimLockResult> {
    try {
      const {
        data: { user },
      } = await this.supabaseClient.auth.getUser();
      if (!user) {
        return { ok: false, error: 'Usuario no autenticado' };
      }

      // Atomic lock acquisition: only succeeds if claim is in 'approved' status
      // and not already locked (locked_at is null or expired > 5 minutes)
      const lockExpiry = new Date(Date.now() - this.LOCK_EXPIRY_MINUTES * 60 * 1000).toISOString();

      const { data, error } = await this.supabaseClient
        .from('claims')
        .update({
          status: 'processing',
          locked_at: new Date().toISOString(),
          locked_by: user.id,
        })
        .eq('id', claimId)
        .eq('status', 'approved') // Only lock if still in approved state
        .or(`locked_at.is.null,locked_at.lt.${lockExpiry}`) // Not locked or lock expired
        .select()
        .single();

      if (error) {
        // Check if it's a "no rows returned" error (claim already locked/processed)
        if (error.code === 'PGRST116') {
          return {
            ok: false,
            error: 'Claim ya está siendo procesado o no está en estado aprobado',
          };
        }
        return { ok: false, error: error.message };
      }

      if (!data) {
        return {
          ok: false,
          error: 'No se pudo adquirir lock - claim puede estar siendo procesado por otro usuario',
        };
      }

      this.logger.info(`Lock acquired on claim ${claimId} by user ${user.id}`);
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Error al adquirir lock',
      };
    }
  }

  /**
   * Release lock on a claim (called on error/failure)
   * Reverts the claim to a previous status so it can be retried
   *
   * @param claimId - ID of the claim to unlock
   * @param revertToStatus - Status to revert to (default: 'approved')
   */
  async releaseClaimLock(
    claimId: string,
    revertToStatus: 'approved' | 'rejected' = 'approved',
  ): Promise<void> {
    try {
      const { error } = await this.supabaseClient
        .from('claims')
        .update({
          status: revertToStatus,
          locked_at: null,
          locked_by: null,
        })
        .eq('id', claimId)
        .eq('status', 'processing'); // Only release if still in processing

      if (error) {
        this.logger.error(`Failed to release claim lock: ${error.message}`);
      } else {
        this.logger.info(`Lock released on claim ${claimId}, reverted to ${revertToStatus}`);
      }
    } catch (err) {
      this.logger.error(`Exception releasing claim lock: ${String(err)}`);
    }
  }

  /**
   * Mark claim as successfully paid (final state)
   * This is the terminal state for a successfully processed claim
   *
   * @param claimId - ID of the claim to mark as paid
   */
  async markClaimAsPaid(claimId: string): Promise<void> {
    try {
      const { error } = await this.supabaseClient
        .from('claims')
        .update({
          status: 'paid',
          processed_at: new Date().toISOString(),
          locked_at: null,
          locked_by: null,
        })
        .eq('id', claimId);

      if (error) {
        this.logger.error(`Failed to mark claim as paid: ${error.message}`);
      } else {
        this.logger.info(`Claim ${claimId} marked as paid`);
      }
    } catch (err) {
      this.logger.error(`Exception marking claim as paid: ${String(err)}`);
    }
  }

  /**
   * Check if a claim is currently locked
   *
   * @param claimId - ID of the claim to check
   * @returns True if claim is locked and lock hasn't expired
   */
  async isClaimLocked(claimId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabaseClient
        .from('claims')
        .select('status, locked_at')
        .eq('id', claimId)
        .single();

      if (error || !data) {
        return false;
      }

      // Check if in processing status
      if (data.status !== 'processing') {
        return false;
      }

      // Check if lock has expired
      if (data.locked_at) {
        const lockTime = new Date(data.locked_at).getTime();
        const expiryTime = lockTime + this.LOCK_EXPIRY_MINUTES * 60 * 1000;
        return Date.now() < expiryTime;
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Force release an expired lock (admin operation)
   * Only use this when a lock has expired and needs manual intervention
   *
   * @param claimId - ID of the claim to force unlock
   */
  async forceReleaseLock(claimId: string): Promise<ClaimLockResult> {
    try {
      const lockExpiry = new Date(Date.now() - this.LOCK_EXPIRY_MINUTES * 60 * 1000).toISOString();

      const { data, error } = await this.supabaseClient
        .from('claims')
        .update({
          status: 'approved',
          locked_at: null,
          locked_by: null,
        })
        .eq('id', claimId)
        .eq('status', 'processing')
        .lt('locked_at', lockExpiry) // Only force release if expired
        .select()
        .single();

      if (error || !data) {
        return {
          ok: false,
          error: 'No se pudo forzar liberación del lock - puede no estar expirado',
        };
      }

      this.logger.warn(`Force released expired lock on claim ${claimId}`);
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Error al forzar liberación',
      };
    }
  }
}
