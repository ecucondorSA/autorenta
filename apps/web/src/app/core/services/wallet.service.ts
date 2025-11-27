import { Injectable, signal, computed, inject } from '@angular/core';
import { RealtimeChannel, SupabaseClient, PostgrestSingleResponse } from '@supabase/supabase-js';
import { from, Observable, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import type {
  WalletBalance,
  WalletHistoryEntry as WalletTransaction,
  InitiateDepositParams,
  WalletLockFundsResponse,
  WalletUnlockFundsResponse,
  WalletLockRentalAndDepositResponse,
  WalletTransactionFilters,
  WalletInitiateDepositResponse,
} from '../models/wallet.model';
import { SupabaseClientService } from './supabase-client.service';
import { LoggerService } from './logger.service';

@Injectable({
  providedIn: 'root',
})
export class WalletService {
  private readonly supabase: SupabaseClient = inject(SupabaseClientService).getClient();
  private readonly logger = inject(LoggerService);

  // ✅ SIGNALS: Single source of truth for wallet state
  readonly balance = signal<WalletBalance | null>(null);
  readonly transactions = signal<WalletTransaction[]>([]);
  readonly loading = signal(false);
  readonly error = signal<{ message: string } | null>(null);

  // Computed signals for derived state
  readonly availableBalance = computed(() => this.balance()?.available_balance ?? 0);
  readonly lockedBalance = computed(() => this.balance()?.locked_balance ?? 0);
  readonly totalBalance = computed(() => this.balance()?.total_balance ?? 0);
  readonly withdrawableBalance = computed(() => this.balance()?.withdrawable_balance ?? 0);
  readonly transferableBalance = computed(() => this.balance()?.transferable_balance ?? 0);

  // Nuevo sistema de créditos separados (Bonus-Malus Migration 20251106)
  readonly autorentarCreditBalance = computed(() => this.balance()?.autorentar_credit_balance ?? 0);
  readonly cashDepositBalance = computed(() => this.balance()?.cash_deposit_balance ?? 0);

  // DEPRECATED: Backward compatibility
  /** @deprecated Use autorentarCreditBalance and cashDepositBalance instead */
  readonly protectedCreditBalance = computed(() => this.balance()?.protected_credit_balance ?? 0);
  /** @deprecated Use autorentarCreditBalance and cashDepositBalance instead */
  readonly nonWithdrawableBalance = computed(() => this.balance()?.protected_credit_balance ?? 0);

  readonly pendingDepositsCount = signal(0);

  constructor() {
    // Initialize wallet data if user is authenticated
    this.supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        this.fetchBalance().catch(() => {
          // Silent error - wallet page will show error state
        });
        this.fetchTransactions().catch(() => {
          // Silent error - wallet page will show error state
        });
      }
    });
  }

  // ============================================================================
  // ASYNC METHODS - Primary API (Signal-based)
  // ============================================================================

  /**
   * Fetch wallet balance and update signal
   * @returns Promise with the balance
   */
  async fetchBalance(): Promise<WalletBalance> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const { data: { session } } = await this.supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('Usuario no autenticado');
      }

      const { data, error } = await this.supabase.rpc('wallet_get_balance');
      if (error) throw error;
      if (!data) throw new Error('No se pudo obtener el balance');

      const balance = data[0] as WalletBalance;
      this.balance.set(balance);
      return balance;
    } catch (err) {
      this.handleError(err, 'Error al obtener balance');
      throw err;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Fetch wallet transactions and update signal
   * @returns Promise with transactions array
   */
  async fetchTransactions(_filters?: WalletTransactionFilters): Promise<WalletTransaction[]> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const { data: { session } } = await this.supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('Usuario no autenticado');
      }

      const { data, error } = await this.supabase
        .from('v_wallet_history')
        .select('*')
        .order('transaction_date', { ascending: false });

      if (error) throw error;

      const transactions = (data ?? []) as WalletTransaction[];
      this.transactions.set(transactions);
      return transactions;
    } catch (err) {
      this.handleError(err, 'Error al obtener transacciones');
      throw err;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Force refresh balance (fetches fresh data)
   */
  async refreshBalanceAsync(): Promise<WalletBalance> {
    return this.fetchBalance();
  }

  // ============================================================================
  // OBSERVABLE METHODS - For backward compatibility
  // ============================================================================

  /**
   * Get wallet balance (Observable wrapper)
   * @deprecated Use fetchBalance() for async/await pattern
   */
  getBalance(): Observable<WalletBalance> {
    return from(this.fetchBalance());
  }

  /**
   * Force refresh balance (Observable wrapper)
   * @deprecated Use refreshBalanceAsync() for async/await pattern
   */
  refreshBalance(): Observable<WalletBalance> {
    return from(this.fetchBalance());
  }

  /**
   * Get transactions (Observable wrapper)
   * @deprecated Use fetchTransactions() for async/await pattern
   */
  getTransactions(filters?: WalletTransactionFilters): Observable<WalletTransaction[]> {
    return from(this.fetchTransactions(filters));
  }

  // ============================================================================
  // DEPOSIT METHODS
  // ============================================================================

  initiateDeposit(params: InitiateDepositParams): Observable<WalletInitiateDepositResponse> {
    this.loading.set(true);
    this.error.set(null);
    return from(
      this.supabase.rpc('wallet_initiate_deposit', {
        p_amount: params.amount,
        p_provider: params.provider ?? 'mercadopago',
        p_description: params.description ?? 'Depósito a wallet',
        p_allow_withdrawal: params.allowWithdrawal ?? false,
      }),
    ).pipe(
      switchMap((response: PostgrestSingleResponse<WalletInitiateDepositResponse[]>) => {
        if (response.error) throw response.error;
        if (!response.data) throw new Error('No se pudo iniciar el depósito');
        const result = response.data[0];
        if (!result.success) throw new Error(result.message);
        if (params.provider === 'mercadopago') {
          return from(
            this.createMercadoPagoPreference(
              result.transaction_id,
              params.amount,
              params.description ?? 'Depósito a wallet',
            ).then((preference) => {
              // Si MercadoPago devolvió init_point, propagarlo a la respuesta
              if (preference?.init_point) {
                result.payment_url = preference.init_point;
                result.payment_mobile_deep_link =
                  preference.sandbox_init_point ?? preference.init_point;
              }
              return result;
            }),
          );
        }

        if (params.provider === 'stripe') {
          return from(
            Promise.reject(
              new Error(
                'Stripe aún no está configurado para depósitos. Usa Mercado Pago o transferencia bancaria.',
              ),
            ),
          );
        }

        return from(Promise.resolve(result));
      }),
      catchError((err) => {
        this.handleError(err, 'Error al iniciar depósito');
        return throwError(() => err);
      }),
      map((result) => {
        this.loading.set(false);
        return result;
      }),
    );
  }

  private async createMercadoPagoPreference(
    transactionId: string,
    amount: number,
    description: string,
  ): Promise<{ init_point?: string; sandbox_init_point?: string }> {
    const {
      data: { session },
    } = await this.supabase.auth.getSession();
    if (!session) {
      throw new Error('No autenticado');
    }

    const response = await this.supabase.functions.invoke('mercadopago-create-preference', {
      body: {
        transaction_id: transactionId,
        amount,
        description: description || 'Depósito a Wallet - AutoRenta',
      },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    const { data, error } = response as {
      data: { init_point?: string; sandbox_init_point?: string } | null;
      error: { message?: string } | null;
    };

    if (error) {
      throw new Error(error.message ?? 'No se pudo crear la preferencia de pago');
    }

    return {
      init_point: data?.init_point,
      sandbox_init_point: data?.sandbox_init_point,
    };
  }

  private handleError(err: unknown, defaultMessage: string): void {
    const errorMessage = err instanceof Error ? err.message : defaultMessage;
    this.error.set({ message: errorMessage });
    this.logger.error(defaultMessage, String(err));
  }

  // ============================================================================
  // LOCK/UNLOCK FUNDS METHODS
  // ============================================================================

  /**
   * Lock funds for a booking
   */
  lockFunds(
    bookingId: string,
    amount: number,
    description?: string,
  ): Observable<WalletLockFundsResponse> {
    return from(
      this.supabase.rpc('wallet_lock_funds', {
        p_booking_id: bookingId,
        p_amount: amount,
        p_description: description ?? 'Bloqueo de fondos',
      }),
    ).pipe(
      tap((response: PostgrestSingleResponse<WalletLockFundsResponse[]>) => {
        if (response.error) throw response.error;
        // Side effect: refresh balance after locking funds
        this.fetchBalance().catch(() => {});
      }),
      map((response: PostgrestSingleResponse<WalletLockFundsResponse[]>) => {
        if (!response.data) throw new Error('No data returned');
        return response.data[0];
      }),
      catchError((err) => {
        this.handleError(err, 'Error al bloquear fondos');
        return throwError(() => err);
      }),
    );
  }

  /**
   * Unlock funds from a booking
   */
  unlockFunds(bookingId: string, description?: string): Observable<WalletUnlockFundsResponse> {
    return from(
      this.supabase.rpc('wallet_unlock_funds', {
        p_booking_id: bookingId,
        p_description: description ?? 'Desbloqueo de fondos',
      }),
    ).pipe(
      tap((response: PostgrestSingleResponse<WalletUnlockFundsResponse[]>) => {
        if (response.error) throw response.error;
        // Side effect: refresh balance after unlocking funds
        this.fetchBalance().catch(() => {});
      }),
      map((response: PostgrestSingleResponse<WalletUnlockFundsResponse[]>) => {
        if (!response.data) throw new Error('No data returned');
        return response.data[0];
      }),
      catchError((err) => {
        this.handleError(err, 'Error al desbloquear fondos');
        return throwError(() => err);
      }),
    );
  }

  /**
   * Lock rental amount and security deposit
   */
  lockRentalAndDeposit(
    bookingId: string,
    rentalAmount: number,
    depositAmount: number = 250,
  ): Observable<WalletLockRentalAndDepositResponse> {
    return from(
      this.supabase.rpc('wallet_lock_rental_and_deposit', {
        p_booking_id: bookingId,
        p_rental_amount: rentalAmount,
        p_deposit_amount: depositAmount,
      }),
    ).pipe(
      tap((response: PostgrestSingleResponse<WalletLockRentalAndDepositResponse[]>) => {
        if (response.error) throw response.error;
        // Side effect: refresh balance after locking funds
        this.fetchBalance().catch(() => {});
      }),
      map((response: PostgrestSingleResponse<WalletLockRentalAndDepositResponse[]>) => {
        if (!response.data) throw new Error('No data returned');
        return response.data[0];
      }),
      catchError((err) => {
        this.handleError(err, 'Error al bloquear alquiler y depósito');
        return throwError(() => err);
      }),
    );
  }

  // ============================================================================
  // REALTIME SUBSCRIPTIONS
  // ============================================================================

  /**
   * Subscribe to wallet changes via Realtime
   */
  async subscribeToWalletChanges(
    onTransaction: (transaction: WalletTransaction) => void,
    onBalanceChange: (balance: WalletBalance) => void,
  ): Promise<RealtimeChannel> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const channel = this.supabase
      .channel(`wallet:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'wallet_ledger',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          onTransaction(payload.new as WalletTransaction);
          try {
            const balance = await this.fetchBalance();
            onBalanceChange(balance);
          } catch (error) {
            this.logger.warn('Failed to refresh wallet balance after transaction', error);
          }
        },
      )
      .subscribe();

    return channel;
  }

  /**
   * Unsubscribe from wallet changes
   */
  async unsubscribeFromWalletChanges(): Promise<void> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) return;

    const channel = this.supabase.channel(`wallet:${user.id}`);
    await this.supabase.removeChannel(channel);
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Force poll pending payments from MercadoPago
   */
  async forcePollPendingPayments(): Promise<{
    success: boolean;
    confirmed: number;
    message: string;
  }> {
    this.loading.set(true);
    try {
      const { data, error } = await this.supabase.rpc('wallet_poll_pending_payments');
      if (error) throw error;

      // Refresh balance and transactions in background
      this.fetchBalance().catch(() => {});
      this.fetchTransactions().catch(() => {});

      return (data ?? { success: false, confirmed: 0, message: 'No data returned' }) as {
        success: boolean;
        confirmed: number;
        message: string;
      };
    } catch (err: unknown) {
      this.handleError(err, 'Error al consultar pagos pendientes');
      throw err;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Refresh pending deposits count
   */
  async refreshPendingDepositsCount(): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('wallet_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .eq('type', 'deposit');

      if (error) throw error;
      this.pendingDepositsCount.set(data?.length ?? 0);
    } catch (err: unknown) {
      this.logger.error('Error al obtener depósitos pendientes', String(err));
    }
  }

  // ============================================================================
  // PROTECTION CREDIT METHODS
  // ============================================================================

  /**
   * Get Protection Credit balance
   */
  async getProtectionCreditBalance(): Promise<{
    balance_cents: number;
    balance_usd: number;
    issued_at: string | null;
    expires_at: string | null;
    is_expired: boolean;
    days_until_expiry: number | null;
  } | null> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data, error } = await this.supabase.rpc('get_protection_credit_balance', {
        p_user_id: user.id,
      });

      if (error) throw error;
      return data?.[0] || null;
    } catch (err: unknown) {
      this.handleError(err, 'Error al obtener balance de Crédito de Protección');
      throw err;
    }
  }

  /**
   * Issue Protection Credit to a new user ($300 USD)
   */
  async issueProtectionCredit(
    userId: string,
    amountCents: number = 30000,
    validityDays: number = 365,
  ): Promise<string> {
    try {
      const { data, error } = await this.supabase.rpc('issue_protection_credit', {
        p_user_id: userId,
        p_amount_cents: amountCents,
        p_validity_days: validityDays,
      });

      if (error) throw error;

      // Refresh balance after issuing CP
      this.fetchBalance().catch(() => {});

      return data;
    } catch (err: unknown) {
      this.handleError(err, 'Error al emitir Crédito de Protección');
      throw err;
    }
  }

  /**
   * Check Protection Credit renewal eligibility
   */
  async checkProtectionCreditRenewal(): Promise<{
    eligible: boolean;
    completedBookings: number;
    totalClaims: number;
    bookingsNeeded: number;
  }> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Contar bookings completados
      const { count: completedBookings } = await this.supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('renter_id', user.id)
        .eq('status', 'completed');

      // Contar siniestros
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
    const balance = this.protectedCreditBalance();
    return `$${balance.toFixed(2)} USD`;
  }

  /**
   * Get total available funds (including Protection Credit)
   */
  getTotalCoverageBalance(): number {
    return this.availableBalance() + this.protectedCreditBalance();
  }
}
