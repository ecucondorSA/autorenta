import { Injectable, signal, computed, inject } from '@angular/core';
import { RealtimeChannel, SupabaseClient, PostgrestSingleResponse } from '@supabase/supabase-js';
import { from, Observable, throwError, firstValueFrom } from 'rxjs';
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

  // Nuevo sistema de créditos separados
  readonly autorentarCreditBalance = computed(() => this.balance()?.autorentar_credit_balance ?? 0);
  readonly cashDepositBalance = computed(() => this.balance()?.cash_deposit_balance ?? 0);

  // DEPRECATED: Backward compatibility
  readonly protectedCreditBalance = computed(() => this.balance()?.protected_credit_balance ?? 0);
  readonly nonWithdrawableBalance = computed(() => this.balance()?.protected_credit_balance ?? 0);

  readonly pendingDepositsCount = signal(0);

  constructor() {
    this.supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        this.fetchBalance().catch(() => {});
        this.fetchTransactions().catch(() => {});
      }
    });
  }

  // ============================================================================
  // ASYNC METHODS - Primary API (Signal-based)
  // ============================================================================

  async fetchBalance(): Promise<WalletBalance> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const { data: { session } } = await this.supabase.auth.getSession();
      if (!session?.user) throw new Error('Usuario no autenticado');

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

  async fetchTransactions(_filters?: WalletTransactionFilters): Promise<WalletTransaction[]> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const { data: { session } } = await this.supabase.auth.getSession();
      if (!session?.user) throw new Error('Usuario no autenticado');

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

  async refreshBalanceAsync(): Promise<WalletBalance> {
    return this.fetchBalance();
  }

  // ============================================================================
  // LEGACY COMPATIBILITY METHODS (Wrappers)
  // ============================================================================

  /** @deprecated Use fetchBalance() */
  getBalance(): Observable<WalletBalance> {
    return from(this.fetchBalance());
  }

  /** @deprecated Use fetchTransactions() */
  getTransactions(filters?: WalletTransactionFilters): Observable<WalletTransaction[]> {
    return from(this.fetchTransactions(filters));
  }

  /** @deprecated Use fetchBalance() */
  refreshBalance(): Observable<WalletBalance> {
    return from(this.fetchBalance());
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
      switchMap(async (response: PostgrestSingleResponse<WalletInitiateDepositResponse[]>) => {
        if (response.error) throw response.error;
        if (!response.data) throw new Error('No se pudo iniciar el depósito');
        const result = response.data[0];
        if (!result.success) throw new Error(result.message);
        
        if (params.provider === 'mercadopago') {
          const preference = await this.createMercadoPagoPreference(
            result.transaction_id,
            params.amount,
            params.description ?? 'Depósito a wallet',
          );
          if (preference?.init_point) {
            result.payment_url = preference.init_point;
            result.payment_mobile_deep_link = preference.sandbox_init_point ?? preference.init_point;
          }
        }
        return result;
      }),
      catchError((err) => {
        this.handleError(err, 'Error al iniciar depósito');
        return throwError(() => err);
      }),
      tap(() => this.loading.set(false))
    );
  }

  /**
   * Alias for initiateDeposit for backward compatibility with deposit.page.ts
   */
  async createDepositPreference(params: InitiateDepositParams): Promise<WalletInitiateDepositResponse> {
     return firstValueFrom(this.initiateDeposit(params));
  }


  async depositFunds(
    userId: string,
    amountCents: number,
    description: string,
    referenceId?: string,
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      const { data, error } = await this.supabase.rpc('wallet_deposit_funds_admin', {
        p_user_id: userId,
        p_amount_cents: amountCents,
        p_description: description,
        p_reference_id: referenceId || null,
      });

      if (error) throw error;
      const result = (data && Array.isArray(data) ? data[0] : data) as {
        success: boolean;
        transaction_id?: string;
        error_message?: string;
      };

      if (!result.success) throw new Error(result.error_message || 'Fallo al depositar fondos');

      this.fetchBalance().catch(() => {});
      this.fetchTransactions().catch(() => {});

      return { success: true, transactionId: result.transaction_id };
    } catch (err) {
      this.handleError(err, 'Error al depositar fondos');
      return { success: false, error: err instanceof Error ? err.message : 'Error desconocido' };
    }
  }

  private async createMercadoPagoPreference(
    transactionId: string,
    amount: number,
    description: string,
  ): Promise<{ init_point?: string; sandbox_init_point?: string }> {
    const { data } = await this.supabase.auth.getSession();
    if (!data.session) throw new Error('No autenticado');

    const response = await this.supabase.functions.invoke('mercadopago-create-preference', {
      body: {
        transaction_id: transactionId,
        amount,
        description: description || 'Depósito a Wallet - AutoRenta',
      },
    });

    if (response.error) throw new Error(response.error.message ?? 'No se pudo crear la preferencia de pago');

    return {
      init_point: response.data?.init_point,
      sandbox_init_point: response.data?.sandbox_init_point,
    };
  }

  // ============================================================================
  // LOCK/UNLOCK FUNDS METHODS
  // ============================================================================

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
      tap((response) => {
        if (response.error) throw response.error;
        this.fetchBalance().catch(() => {});
      }),
      map((response) => response.data![0] as WalletLockFundsResponse)
    );
  }

  unlockFunds(bookingId: string, description?: string): Observable<WalletUnlockFundsResponse> {
    return from(
      this.supabase.rpc('wallet_unlock_funds', {
        p_booking_id: bookingId,
        p_description: description ?? 'Desbloqueo de fondos',
      }),
    ).pipe(
      tap((response) => {
        if (response.error) throw response.error;
        this.fetchBalance().catch(() => {});
      }),
      map((response) => response.data![0] as WalletUnlockFundsResponse)
    );
  }

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
      tap((response) => {
        if (response.error) throw response.error;
        this.fetchBalance().catch(() => {});
      }),
      map((response) => response.data![0] as WalletLockRentalAndDepositResponse)
    );
  }

  // ============================================================================
  // REALTIME SUBSCRIPTIONS
  // ============================================================================

  async subscribeToWalletChanges(
    onTransaction: (transaction: WalletTransaction) => void,
    onBalanceChange: (balance: WalletBalance) => void,
  ): Promise<RealtimeChannel> {
    const { data } = await this.supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) throw new Error('No autenticado');

    return this.supabase
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
  }

  async unsubscribeFromWalletChanges(): Promise<void> {
    const { data } = await this.supabase.auth.getSession();
    if (!data.session?.user) return;
    await this.supabase.removeChannel(this.supabase.channel(`wallet:${data.session.user.id}`));
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  async forcePollPendingPayments(): Promise<{ success: boolean; confirmed: number; message: string }> {
    this.loading.set(true);
    try {
      const { data, error } = await this.supabase.rpc('wallet_poll_pending_payments');
      if (error) throw error;
      this.fetchBalance().catch(() => {});
      this.fetchTransactions().catch(() => {});
      return (data ?? { success: false, confirmed: 0, message: 'No data returned' }) as {
        success: boolean;
        confirmed: number;
        message: string;
      };
    } catch (err) {
      this.handleError(err, 'Error al consultar pagos pendientes');
      throw err;
    } finally {
      this.loading.set(false);
    }
  }

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
      this.fetchBalance().catch(() => {});
      return data;
    } catch (err) {
      this.handleError(err, 'Error al emitir Crédito de Protección');
      throw err;
    }
  }

  async checkProtectionCreditRenewal(): Promise<{
    eligible: boolean;
    completedBookings: number;
    totalClaims: number;
    bookingsNeeded: number;
  }> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { count: completedBookings } = await this.supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('renter_id', user.id)
        .eq('status', 'completed');

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
    } catch (err) {
      this.handleError(err, 'Error al verificar elegibilidad de renovación');
      throw err;
    }
  }

  getProtectionCreditFormatted(): string {
    const balance = this.protectedCreditBalance();
    return `$${balance.toFixed(2)} USD`;
  }

  getTotalCoverageBalance(): number {
    return this.availableBalance() + this.protectedCreditBalance();
  }

  private handleError(err: unknown, defaultMessage: string): void {
    const errorMessage = err instanceof Error ? err.message : defaultMessage;
    this.error.set({ message: errorMessage });
    this.logger.error(defaultMessage, String(err));
  }
}
