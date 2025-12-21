import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SupabaseClient } from '@supabase/supabase-js';
import { from, Observable, throwError } from 'rxjs';
import { catchError, map, take, tap } from 'rxjs/operators';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';

export interface AutorentarCreditInfo {
  balance: number;
  issued_at: string | null;
  expires_at: string | null;
  last_renewal: string | null;
  days_until_expiration: number | null;
  is_expired: boolean;
  is_renewable: boolean;
}

export interface AutorentarCreditIssueResult {
  success: boolean;
  message: string;
  credit_balance_cents: number;
  issued_at: string;
  expires_at: string;
}

export interface AutorentarCreditConsumeResult {
  success: boolean;
  message: string;
  autorentar_credit_used_cents: number;
  wallet_balance_used_cents: number;
  remaining_claim_cents: number;
  new_autorentar_credit_balance: number;
  new_wallet_balance: number;
}

export interface AutorentarCreditRenewalResult {
  success: boolean;
  message: string;
  renewed: boolean;
  new_balance_cents: number;
  expires_at: string | null;
}

export interface AutorentarCreditBreakageResult {
  success: boolean;
  message: string;
  breakage_amount_cents: number;
  reason: string;
}

@Injectable({
  providedIn: 'root',
})
export class AutorentarCreditService {
  private readonly supabase: SupabaseClient = injectSupabase();
  private readonly logger = inject(LoggerService);
  private readonly destroyRef = inject(DestroyRef);

  readonly creditInfo = signal<AutorentarCreditInfo | null>(null);
  readonly loading = signal(false);
  readonly error = signal<{ message: string } | null>(null);

  // Computed signals
  readonly balance = computed(() => this.creditInfo()?.balance ?? 0);
  readonly balanceCents = computed(() => Math.round((this.creditInfo()?.balance ?? 0) * 100));
  readonly expiresAt = computed(() => this.creditInfo()?.expires_at ?? null);
  readonly daysUntilExpiration = computed(() => this.creditInfo()?.days_until_expiration ?? null);
  readonly isExpired = computed(() => this.creditInfo()?.is_expired ?? false);
  readonly isRenewable = computed(() => this.creditInfo()?.is_renewable ?? false);

  constructor() {
    // Auto-load credit info on service init
    this.getCreditInfo()
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: (err) => this.logger.error('Failed to load credit info on init', err),
      });
  }

  /**
   * Get Autorentar Credit balance and info
   */
  getCreditInfo(): Observable<AutorentarCreditInfo> {
    this.loading.set(true);
    this.error.set(null);

    return from(this.supabase.rpc('wallet_get_autorentar_credit_info')).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        if (!data || data.length === 0) {
          // No credit info, return default
          const defaultInfo: AutorentarCreditInfo = {
            balance: 0,
            issued_at: null,
            expires_at: null,
            last_renewal: null,
            days_until_expiration: null,
            is_expired: false,
            is_renewable: false,
          };
          this.creditInfo.set(defaultInfo);
          return defaultInfo;
        }
        const info = data[0] as AutorentarCreditInfo;
        this.creditInfo.set(info);
        return info;
      }),
      catchError((err) => {
        this.handleError(err, 'Error al obtener información de Crédito Autorentar');
        return throwError(() => err);
      }),
      tap(() => this.loading.set(false)),
    );
  }

  /**
   * Issue initial Autorentar Credit to user
   */
  issueCredit(
    userId: string,
    amountCents: number = 30000,
  ): Observable<AutorentarCreditIssueResult> {
    this.loading.set(true);
    this.error.set(null);

    return from(
      this.supabase.rpc('issue_autorentar_credit', {
        p_user_id: userId,
        p_amount_cents: amountCents,
      }),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        const result = data[0] as AutorentarCreditIssueResult;

        // Refresh credit info after issuance
        this.getCreditInfo()
          .pipe(take(1), takeUntilDestroyed(this.destroyRef))
          .subscribe({
            error: (err) => this.logger.error('Failed to refresh credit info after issuance', err),
          });

        return result;
      }),
      catchError((err) => {
        this.handleError(err, 'Error al emitir Crédito Autorentar');
        return throwError(() => err);
      }),
      tap(() => this.loading.set(false)),
    );
  }

  /**
   * Consume Autorentar Credit for claim coverage
   */
  consumeCredit(params: {
    userId: string;
    claimAmountCents: number;
    bookingId: string;
    claimId?: string;
  }): Observable<AutorentarCreditConsumeResult> {
    this.loading.set(true);
    this.error.set(null);

    return from(
      this.supabase.rpc('consume_autorentar_credit_for_claim', {
        p_user_id: params.userId,
        p_claim_amount_cents: params.claimAmountCents,
        p_booking_id: params.bookingId,
        p_claim_id: params.claimId ?? null,
      }),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        const result = data[0] as AutorentarCreditConsumeResult;

        // Refresh credit info after consumption
        this.getCreditInfo()
          .pipe(take(1), takeUntilDestroyed(this.destroyRef))
          .subscribe({
            error: (err) => this.logger.error('Failed to refresh credit info after consumption', err),
          });

        return result;
      }),
      catchError((err) => {
        this.handleError(err, 'Error al consumir Crédito Autorentar');
        return throwError(() => err);
      }),
      tap(() => this.loading.set(false)),
    );
  }

  /**
   * Extend/renew Autorentar Credit for good history
   */
  extendCredit(userId: string): Observable<AutorentarCreditRenewalResult> {
    this.loading.set(true);
    this.error.set(null);

    return from(
      this.supabase.rpc('extend_autorentar_credit_for_good_history', {
        p_user_id: userId,
      }),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        const result = data[0] as AutorentarCreditRenewalResult;

        // Refresh credit info after renewal
        if (result.success && result.renewed) {
          this.getCreditInfo()
            .pipe(take(1), takeUntilDestroyed(this.destroyRef))
            .subscribe({
              error: (err) => this.logger.error('Failed to refresh credit info after renewal', err),
            });
        }

        return result;
      }),
      catchError((err) => {
        this.handleError(err, 'Error al renovar Crédito Autorentar');
        return throwError(() => err);
      }),
      tap(() => this.loading.set(false)),
    );
  }

  /**
   * Check renewal eligibility (called from UI)
   */
  checkRenewalEligibility(userId: string): Observable<boolean> {
    return this.extendCredit(userId).pipe(
      map((result) => result.success && result.renewed),
      catchError(() => from([false])),
    );
  }

  /**
   * Recognize breakage revenue (admin only)
   */
  recognizeBreakage(userId: string): Observable<AutorentarCreditBreakageResult> {
    this.loading.set(true);
    this.error.set(null);

    return from(
      this.supabase.rpc('recognize_autorentar_credit_breakage', {
        p_user_id: userId,
      }),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        const result = data[0] as AutorentarCreditBreakageResult;

        // Refresh credit info after breakage
        if (result.success) {
          this.getCreditInfo()
            .pipe(take(1), takeUntilDestroyed(this.destroyRef))
            .subscribe({
              error: (err) => this.logger.error('Failed to refresh credit info after breakage', err),
            });
        }

        return result;
      }),
      catchError((err) => {
        this.handleError(err, 'Error al reconocer breakage de Crédito Autorentar');
        return throwError(() => err);
      }),
      tap(() => this.loading.set(false)),
    );
  }

  /**
   * Refresh credit info (useful after changes)
   */
  refresh(): void {
    this.getCreditInfo()
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: (err) => this.logger.error('Failed to refresh credit info', err),
      });
  }

  /**
   * Format balance for display
   */
  formatBalance(): string {
    const balance = this.balance();
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'USD',
    }).format(balance);
  }

  /**
   * Format expiration date for display
   */
  formatExpirationDate(): string | null {
    const expiresAt = this.expiresAt();
    if (!expiresAt) return null;

    const date = new Date(expiresAt);
    return new Intl.DateTimeFormat('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  }

  private handleError(error: unknown, defaultMessage: string): void {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message: unknown }).message)
          : defaultMessage;
    this.error.set({ message });
    this.loading.set(false);
    this.logger.error(defaultMessage, error instanceof Error ? error.message : String(error));
  }
}
