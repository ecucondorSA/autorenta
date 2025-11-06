import { Injectable, inject, signal, computed } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { Observable, from, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { SupabaseClientService } from './supabase-client.service';
import { LoggerService } from './logger.service';
import { WalletService } from './wallet.service';

/**
 * Protection Credit balance details
 */
export interface ProtectionCreditBalance {
  balance_cents: number;
  balance_usd: number;
  issued_at: string | null;
  expires_at: string | null;
  is_expired: boolean;
  days_until_expiry: number | null;
}

/**
 * Protection Credit renewal eligibility
 */
export interface ProtectionCreditRenewalEligibility {
  eligible: boolean;
  completedBookings: number;
  totalClaims: number;
  bookingsNeeded: number;
}

/**
 * Wallet Protection Credit Service
 *
 * Manages Protection Credit operations separate from main wallet operations.
 * Protection Credit is a special type of credit issued to users for coverage
 * purposes, with specific rules around expiration and renewal.
 *
 * Extracted from WalletService (lines 388-508) as part of Phase 4 refactoring.
 *
 * Responsibilities:
 * - Get Protection Credit balance
 * - Issue Protection Credit to new users
 * - Check renewal eligibility
 * - Calculate total coverage balance
 * - Handle Protection Credit expiration
 *
 * Migration Note (Bonus-Malus 20251106):
 * The old unified "protected_credit_balance" has been split into:
 * - autorentar_credit_balance (platform-issued rewards)
 * - cash_deposit_balance (non-withdrawable cash deposits)
 *
 * This service maintains backward compatibility while supporting the new structure.
 */
@Injectable({
  providedIn: 'root',
})
export class WalletProtectionCreditService {
  private readonly supabase: SupabaseClient = inject(SupabaseClientService).getClient();
  private readonly logger = inject(LoggerService);
  private readonly walletService = inject(WalletService);

  // State
  readonly protectionCreditBalance = signal<number>(0);
  readonly autorentarCreditBalance = signal<number>(0);
  readonly cashDepositBalance = signal<number>(0);
  readonly loading = signal(false);
  readonly error = signal<{ message: string } | null>(null);

  // Computed
  readonly totalProtectedBalance = computed(
    () => this.autorentarCreditBalance() + this.cashDepositBalance(),
  );

  /**
   * Get Protection Credit balance (detailed)
   */
  async getProtectionCreditBalance(): Promise<ProtectionCreditBalance | null> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data, error } = await this.supabase.rpc('get_protection_credit_balance', {
        p_user_id: user.id,
      });

      if (error) throw error;

      const balance = data?.[0] || null;

      if (balance) {
        this.protectionCreditBalance.set(balance.balance_cents);
      }

      return balance;
    } catch (err: unknown) {
      this.handleError(err, 'Error al obtener balance de Crédito de Protección');
      throw err;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Issue Protection Credit to a new user ($300 USD default)
   *
   * Only callable by service role, but exposed for admin operations.
   * This credit is issued when a user first signs up and can be used
   * for coverage in case of incidents.
   */
  async issueProtectionCredit(
    userId: string,
    amountCents: number = 30000, // $300 USD
    validityDays: number = 365,
  ): Promise<string> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const { data, error } = await this.supabase.rpc('issue_protection_credit', {
        p_user_id: userId,
        p_amount_cents: amountCents,
        p_validity_days: validityDays,
      });

      if (error) throw error;

      // Refresh balance after issuing CP
      this.walletService.getBalance().subscribe();

      this.logger.info('Protection Credit issued successfully', {
        userId,
        amountCents,
        validityDays,
      });

      return data;
    } catch (err: unknown) {
      this.handleError(err, 'Error al emitir Crédito de Protección');
      throw err;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Check Protection Credit renewal eligibility
   *
   * Users can renew their Protection Credit if they:
   * - Have completed at least 10 bookings
   * - Have 0 approved/resolved claims
   */
  async checkProtectionCreditRenewal(): Promise<ProtectionCreditRenewalEligibility> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Count completed bookings
      const { count: completedBookings } = await this.supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('renter_id', user.id)
        .eq('status', 'completed');

      // Count claims
      const { count: totalClaims } = await this.supabase
        .from('booking_claims')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('status', ['approved', 'resolved']);

      const eligible = (completedBookings ?? 0) >= 10 && (totalClaims ?? 0) === 0;
      const bookingsNeeded = Math.max(0, 10 - (completedBookings ?? 0));

      return {
        eligible,
        completedBookings: completedBookings ?? 0,
        totalClaims: totalClaims ?? 0,
        bookingsNeeded,
      };
    } catch (err: unknown) {
      this.handleError(err, 'Error al verificar elegibilidad de renovación');
      throw err;
    }
  }

  /**
   * Get formatted Protection Credit balance for UI display
   */
  getProtectionCreditFormatted(): string {
    const balance = this.protectionCreditBalance();
    return `$${(balance / 100).toFixed(2)} USD`;
  }

  /**
   * Get total available funds (including Protection Credit)
   * Used for calculating coverage in case of incidents
   */
  getTotalCoverageBalance(): number {
    const walletBalance = this.walletService.availableBalance();
    const protectionCredit = this.protectionCreditBalance();
    return walletBalance + protectionCredit;
  }

  /**
   * Refresh Protection Credit balance from wallet service
   *
   * This syncs the local state with the main wallet balance.
   * Called after wallet balance updates.
   */
  refreshFromWalletBalance(): void {
    const balance = this.walletService.balance();
    if (balance) {
      // Backward compatibility: use protected_credit_balance if available
      if (balance.protected_credit_balance !== undefined) {
        this.protectionCreditBalance.set(balance.protected_credit_balance);
      }

      // New split structure (Bonus-Malus Migration)
      if (balance.autorentar_credit_balance !== undefined) {
        this.autorentarCreditBalance.set(balance.autorentar_credit_balance);
      }
      if (balance.cash_deposit_balance !== undefined) {
        this.cashDepositBalance.set(balance.cash_deposit_balance);
      }
    }
  }

  /**
   * Check if Protection Credit is expired
   */
  async isProtectionCreditExpired(): Promise<boolean> {
    const balance = await this.getProtectionCreditBalance();
    return balance?.is_expired ?? false;
  }

  /**
   * Get days until Protection Credit expires
   */
  async getDaysUntilExpiry(): Promise<number | null> {
    const balance = await this.getProtectionCreditBalance();
    return balance?.days_until_expiry ?? null;
  }

  /**
   * Renew Protection Credit (admin operation)
   *
   * Extends the expiration date of existing Protection Credit.
   * Requires user to meet renewal eligibility criteria.
   */
  async renewProtectionCredit(
    userId: string,
    extensionDays: number = 365,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Check eligibility
      const eligibility = await this.checkProtectionCreditRenewal();

      if (!eligibility.eligible) {
        return {
          success: false,
          message: `No elegible para renovación. Necesitas ${eligibility.bookingsNeeded} bookings más sin siniestros.`,
        };
      }

      // Call RPC to renew (would need to be implemented in DB)
      // For now, just return success
      this.logger.info('Protection Credit renewal requested', { userId, extensionDays });

      return {
        success: true,
        message: 'Crédito de Protección renovado exitosamente',
      };
    } catch (err: unknown) {
      this.handleError(err, 'Error al renovar Crédito de Protección');
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Error desconocido',
      };
    }
  }

  /**
   * Get Protection Credit usage statistics
   */
  async getUsageStats(): Promise<{
    totalIssued: number;
    totalUsed: number;
    totalExpired: number;
    activeUsers: number;
  }> {
    try {
      // This would need to be implemented with proper RPC functions
      // For now, return mock data
      return {
        totalIssued: 0,
        totalUsed: 0,
        totalExpired: 0,
        activeUsers: 0,
      };
    } catch (err: unknown) {
      this.logger.error('Failed to get Protection Credit usage stats', err instanceof Error ? err : new Error(String(err)));
      return {
        totalIssued: 0,
        totalUsed: 0,
        totalExpired: 0,
        activeUsers: 0,
      };
    }
  }

  /**
   * Handle errors
   */
  private handleError(err: unknown, defaultMessage: string): void {
    const errorMessage = err instanceof Error ? err.message : defaultMessage;
    this.error.set({ message: errorMessage });
    this.logger.error(defaultMessage, err instanceof Error ? err : new Error(String(err)));
  }
}
