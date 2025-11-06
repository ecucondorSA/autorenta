import { Injectable, signal, computed, inject } from '@angular/core';
import { RealtimeChannel, SupabaseClient, PostgrestSingleResponse } from '@supabase/supabase-js';
import { environment } from '@environment';
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
import { from, Observable, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class WalletService {
  private readonly supabase: SupabaseClient = inject(SupabaseClientService).getClient();
  private readonly logger = inject(LoggerService);

  readonly balance = signal<WalletBalance | null>(null);
  readonly transactions = signal<WalletTransaction[]>([]);
  readonly loading = signal(false);
  readonly error = signal<{ message: string } | null>(null);

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
    // ✅ FIX: Handle errors gracefully to prevent silent failures on page load
    this.getBalance().subscribe({
      error: (err) => {
        // Log error but don't block page - wallet page will show error state
        console.warn('Failed to load wallet balance on init:', err);
      }
    });
    this.getTransactions().subscribe({
      error: (err) => {
        // Log error but don't block page - wallet page will show error state
        console.warn('Failed to load wallet transactions on init:', err);
      }
    });
  }

  getBalance(): Observable<WalletBalance> {
    this.loading.set(true);
    this.error.set(null);
    return from(this.supabase.rpc('wallet_get_balance')).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        if (!data) throw new Error('No se pudo obtener el balance');
        const balance = data[0] as WalletBalance;
        this.balance.set(balance);
        return balance;
      }),
      catchError((err) => {
        this.handleError(err, 'Error al obtener balance');
        return throwError(() => err);
      }),
      map((balance) => {
        this.loading.set(false);
        return balance;
      }),
    );
  }

  getTransactions(filters?: WalletTransactionFilters): Observable<WalletTransaction[]> {
    this.loading.set(true);
    this.error.set(null);
    return from(
      this.supabase
        .from('v_wallet_history')
        .select('*')
        .order('transaction_date', { ascending: false }),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        const transactions = (data ?? []) as WalletTransaction[];
        this.transactions.set(transactions);
        return transactions;
      }),
      catchError((err) => {
        this.handleError(err, 'Error al obtener transacciones');
        return throwError(() => err);
      }),
      map((transactions) => {
        this.loading.set(false);
        return transactions;
      }),
    );
  }

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
            ).then(() => result),
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
  ): Promise<void> {
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

    const { error } = response as { error: { message?: string } | null };
    if (error) {
      throw new Error(error.message ?? 'No se pudo crear la preferencia de pago');
    }
  }

  private handleError(err: unknown, defaultMessage: string): void {
    const errorMessage = err instanceof Error ? err.message : defaultMessage;
    this.error.set({ message: errorMessage });
    this.logger.error(defaultMessage, err instanceof Error ? err : new Error(String(err)));
  }

  // ============================================================================
  // MISSING METHODS - Added 2025-11-01
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
        this.getBalance().subscribe();
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
        this.getBalance().subscribe();
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
        this.getBalance().subscribe();
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
        (payload) => {
          onTransaction(payload.new as WalletTransaction);
          this.getBalance().subscribe();
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

  /**
   * Force poll pending payments from MercadoPago
   */
  async forcePollPendingPayments(): Promise<{ success: boolean; confirmed: number; message: string }> {
    this.loading.set(true);
    try {
      const { data, error } = await this.supabase.rpc('wallet_poll_pending_payments');
      if (error) throw error;
      this.getBalance().subscribe();
      this.getTransactions().subscribe();
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
      this.logger.error('Error al obtener depósitos pendientes', err instanceof Error ? err : new Error(String(err)));
    }
  }
}
