import { computed, inject, Injectable, signal } from '@angular/core';
import { PostgrestSingleResponse, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { firstValueFrom, from, Observable, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import type {
  ExpiringCredit,
  InitiateDepositParams,
  WalletBalance,
  WalletInitiateDepositResponse,
  WalletLockFundsResponse,
  WalletLockRentalAndDepositResponse,
  WalletHistoryEntry as WalletTransaction,
  WalletTransactionFilters,
  WalletUnlockFundsResponse,
  WalletReferenceType,
  WalletPaymentProvider,
} from '@core/models';
import {
  WALLET_STALE_TIME_MS,
  MAX_WALLET_LOCKS_PER_MINUTE,
  RATE_LIMIT_WINDOW_MS,
} from '@core/constants';
import { WalletError } from '@core/errors';
import { AuthService } from '@core/services/auth/auth.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';

@Injectable({
  providedIn: 'root',
})
export class WalletService {
  private readonly supabase: SupabaseClient = injectSupabase();
  private readonly logger = inject(LoggerService);
  private readonly authService = inject(AuthService);

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

  private walletChannel: RealtimeChannel | null = null;

  // 🚀 PERF: Request deduplication to prevent multiple parallel fetches
  // Before: 8 components calling fetchBalance() = 8 API requests
  // After: 8 components calling fetchBalance() = 1 API request (shared promise)
  private pendingFetchBalance: Promise<WalletBalance> | null = null;
  private lastFetchTimestamp = 0;

  // 🔒 SECURITY: Rate limiting for lock operations
  // Prevents abuse by limiting locks to MAX_WALLET_LOCKS_PER_MINUTE per user
  private lockTimestamps: number[] = [];

  constructor() {
    // Use AuthService.ensureSession() to wait for session to be properly loaded
    this.authService
      .ensureSession()
      .then((session) => {
        if (session?.user) {
          this.fetchBalance().catch((err) => {
            this.logger.warn('Failed to fetch wallet balance on init', err);
          });
          this.fetchTransactions().catch((err) => {
            this.logger.warn('Failed to fetch wallet transactions on init', err);
          });
        }
      })
      .catch((err) => {
        this.logger.warn('Failed to get session on wallet service init', err);
      });
  }

  // ============================================================================
  // ASYNC METHODS - Primary API (Signal-based)
  // ============================================================================

  /**
   * 🚀 PERF: Fetch balance with request deduplication and SWR-like caching
   *
   * - If a request is already in-flight, returns the same promise (deduplication)
   * - If data is fresh (< 5s old), returns cached data immediately
   * - Multiple consumers calling this simultaneously get the same result
   *
   * @param forceRefresh - Skip cache and force a new API call
   */
  async fetchBalance(forceRefresh = false): Promise<WalletBalance> {
    // 🚀 PERF: Return cached data if still fresh (SWR pattern)
    const now = Date.now();
    const cachedBalance = this.balance();
    if (!forceRefresh && cachedBalance && now - this.lastFetchTimestamp < WALLET_STALE_TIME_MS) {
      return cachedBalance;
    }

    // 🚀 PERF: Return pending request if one is already in-flight (deduplication)
    if (this.pendingFetchBalance) {
      return this.pendingFetchBalance;
    }

    // Start new fetch
    this.pendingFetchBalance = this.doFetchBalance();

    try {
      const result = await this.pendingFetchBalance;
      this.lastFetchTimestamp = Date.now();
      return result;
    } finally {
      this.pendingFetchBalance = null;
    }
  }

  /**
   * Internal method that performs the actual API call
   */
  private readonly DEFAULT_BALANCE: WalletBalance = {
    user_id: '',
    available_balance: 0,
    locked_balance: 0,
    total_balance: 0,
    withdrawable_balance: 0,
    transferable_balance: 0,
    autorentar_credit_balance: 0,
    cash_deposit_balance: 0,
    protected_credit_balance: 0,
    currency: 'USD',
  };

  private async doFetchBalance(): Promise<WalletBalance> {
    this.loading.set(true);
    this['error'].set(null);

    try {
      // Use AuthService.ensureSession() to properly wait for session
      const session = await this.authService.ensureSession();
      if (!session?.user) {
        // Not authenticated — return default zero balance silently
        this.balance.set(this.DEFAULT_BALANCE);
        return this.DEFAULT_BALANCE;
      }

      const { data, error } = await this.supabase.rpc('wallet_get_balance');
      if (error) throw error;
      if (!data || !Array.isArray(data) || data.length === 0) {
        // Empty result (e.g. function returned no rows) — use defaults
        this.balance.set(this.DEFAULT_BALANCE);
        return this.DEFAULT_BALANCE;
      }

      const rawBalance = data[0] as Record<string, unknown>;
      const balance = this.parseWalletBalance(rawBalance);
      this.balance.set(balance);
      return balance;
    } catch (err: unknown) {
      // RPC may return 400 if function doesn't exist or user lacks auth.
      // Return default balance instead of crashing — this is non-critical on page load.
      this.balance.set(this.DEFAULT_BALANCE);
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      this.logger['error']('wallet_get_balance failed (non-critical)', msg);
      return this.DEFAULT_BALANCE;
    } finally {
      this.loading.set(false);
    }
  }

  async fetchTransactions(_filters?: WalletTransactionFilters): Promise<WalletTransaction[]> {
    this.loading.set(true);
    this['error'].set(null);

    try {
      const session = await this.authService.ensureSession();
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

  /**
   * Invalidate the wallet balance cache
   * Call this after any operation that modifies wallet state
   */
  invalidateCache(): void {
    this.lastFetchTimestamp = 0;
    this.pendingFetchBalance = null;
  }

  // ============================================================================
  // ATOMIC WALLET OPERATIONS (Fintech Core)
  // ============================================================================

  /**
   * Deposit funds atomically with idempotency support
   */
  async depositAtomic(
    amountCents: number,
    description: string,
    refId?: string,
    idempotencyKey?: string,
  ): Promise<{ success: boolean; transactionId?: string }> {
    try {
      const userId = await this.authService.getCachedUserId();
      if (!userId) throw new Error('Usuario no autenticado');

      const { data, error } = await this.supabase.rpc('process_wallet_transaction', {
        p_user_id: userId,
        p_amount_cents: amountCents,
        p_type: 'deposit',
        p_category: 'general',
        p_description: description,
        p_reference_id: refId || null,
        p_idempotency_key: idempotencyKey || crypto.randomUUID(),
      });

      if (error) throw error;

      // Immediate refresh
      this.invalidateCache();
      void this.fetchBalance(true);
      void this.fetchTransactions();

      return { success: true, transactionId: data.transaction_id };
    } catch (err) {
      this.handleError(err, 'Error en depósito atómico');
      throw err;
    }
  }

  /**
   * Hold funds for booking security deposit (Atomic Lock)
   */
  async holdFundsAtomic(
    bookingId: string,
    amountCents: number,
  ): Promise<{ success: boolean; transactionId?: string }> {
    try {
      const { data, error } = await this.supabase.rpc('wallet_hold_funds', {
        p_amount_cents: amountCents,
        p_booking_id: bookingId,
      });

      if (error) throw error;

      this.invalidateCache();
      void this.fetchBalance(true);

      return { success: true, transactionId: data.transaction_id };
    } catch (err) {
      // Translate SQL errors to user friendly messages
      if (JSON.stringify(err).includes('Insufficient funds')) {
        throw new WalletError(
          'INSUFFICIENT_BALANCE',
          'Saldo insuficiente para retención de garantía',
        );
      }
      this.handleError(err, 'Error al retener fondos');
      throw err;
    }
  }

  /**
   * Release funds (Unlock)
   */
  async releaseFundsAtomic(
    bookingId: string,
    amountCents: number,
  ): Promise<{ success: boolean; transactionId?: string }> {
    try {
      const { data, error } = await this.supabase.rpc('wallet_release_funds', {
        p_amount_cents: amountCents,
        p_booking_id: bookingId,
      });

      if (error) throw error;

      this.invalidateCache();
      void this.fetchBalance(true);

      return { success: true, transactionId: data.transaction_id };
    } catch (err) {
      this.handleError(err, 'Error al liberar fondos');
      throw err;
    }
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
    this['error'].set(null);
    return from(
      this.supabase.rpc('wallet_initiate_deposit', {
        p_amount: params['amount'],
        p_provider: params.provider ?? 'mercadopago',
        p_description: params['description'] ?? 'Depósito a wallet',
        p_allow_withdrawal: params.allowWithdrawal ?? false,
      }),
    ).pipe(
      switchMap(async (response: PostgrestSingleResponse<WalletInitiateDepositResponse[]>) => {
        if (response['error']) throw response['error'];
        if (!response.data) throw new Error('No se pudo iniciar el depósito');
        const result = response.data[0];
        if (!result.success) throw new Error(result['message']);

        if (params.provider === 'mercadopago') {
          const preference = await this.createMercadoPagoPreference(
            result.transaction_id,
            params['amount'],
            params['description'] ?? 'Depósito a wallet',
          );
          if (preference?.init_point) {
            result.payment_url = preference.init_point;
            result.payment_mobile_deep_link =
              preference.sandbox_init_point ?? preference.init_point;
          }
        }
        return result;
      }),
      catchError((err) => {
        this.handleError(err, 'Error al iniciar depósito');
        return throwError(() => err);
      }),
      tap(() => this.loading.set(false)),
    );
  }

  /**
   * Alias for initiateDeposit for backward compatibility with deposit.page.ts
   */
  async createDepositPreference(
    params: InitiateDepositParams,
  ): Promise<WalletInitiateDepositResponse> {
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
      return { success: false, error: err instanceof Error ? err['message'] : 'Error desconocido' };
    }
  }

  private async createMercadoPagoPreference(
    transactionId: string,
    amount: number,
    description: string,
  ): Promise<{ init_point?: string; sandbox_init_point?: string }> {
    const session = await this.authService.ensureSession();
    if (!session) throw new Error('No autenticado');

    const response = await this.supabase.functions.invoke('mercadopago-create-preference', {
      body: {
        transaction_id: transactionId,
        amount,
        description: description || 'Depósito a Wallet - AutoRenta',
      },
    });

    if (response['error'])
      throw new Error(response['error']['message'] ?? 'No se pudo crear la preferencia de pago');

    return {
      init_point: response.data?.init_point,
      sandbox_init_point: response.data?.sandbox_init_point,
    };
  }

  // ============================================================================
  // LOCK/UNLOCK FUNDS METHODS
  // ============================================================================

  /**
   * 🔒 SECURITY: Check if rate limit is exceeded for lock operations
   * Returns true if the user has exceeded MAX_WALLET_LOCKS_PER_MINUTE locks in the last minute
   */
  private isLockRateLimited(): boolean {
    const now = Date.now();
    // Remove timestamps older than the window
    this.lockTimestamps = this.lockTimestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
    return this.lockTimestamps.length >= MAX_WALLET_LOCKS_PER_MINUTE;
  }

  /**
   * 🔒 SECURITY: Record a lock attempt timestamp
   */
  private recordLockAttempt(): void {
    this.lockTimestamps.push(Date.now());
  }

  lockFunds(
    bookingId: string,
    amount: number,
    description?: string,
  ): Observable<WalletLockFundsResponse> {
    // 🔒 SECURITY: Check rate limit before proceeding
    if (this.isLockRateLimited()) {
      this.logger.warn('WalletService.lockFunds rate limited', { bookingId, amount });
      return throwError(() => WalletError.rateLimited());
    }

    // Record this attempt
    this.recordLockAttempt();

    return from(
      this.supabase.rpc('wallet_lock_funds', {
        p_booking_id: bookingId,
        p_amount: amount,
        p_description: description ?? 'Bloqueo de fondos',
      }),
    ).pipe(
      tap((response) => {
        if (response['error']) throw response['error'];
        // FIX 2025-12-27: Invalidate cache and force refresh after lock
        this.invalidateCache();
        this.fetchBalance(true).catch(() => {});
      }),
      map((response) => response.data![0] as WalletLockFundsResponse),
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
        if (response['error']) throw response['error'];
        // FIX 2025-12-27: Invalidate cache and force refresh after unlock
        this.invalidateCache();
        this.fetchBalance(true).catch(() => {});
      }),
      map((response) => response.data![0] as WalletUnlockFundsResponse),
    );
  }

  lockRentalAndDeposit(
    bookingId: string,
    rentalAmount: number,
    depositAmount: number = 250,
  ): Observable<WalletLockRentalAndDepositResponse> {
    // 🔒 SECURITY: Check rate limit before proceeding
    if (this.isLockRateLimited()) {
      this.logger.warn('WalletService.lockRentalAndDeposit rate limited', {
        bookingId,
        rentalAmount,
        depositAmount,
      });
      return throwError(() => WalletError.rateLimited());
    }

    // Record this attempt
    this.recordLockAttempt();

    return from(
      this.supabase.rpc('wallet_lock_rental_and_deposit', {
        p_booking_id: bookingId,
        p_rental_amount: rentalAmount,
        p_deposit_amount: depositAmount,
      }),
    ).pipe(
      tap((response) => {
        if (response['error']) throw response['error'];
        // FIX 2025-12-27: Invalidate cache and force refresh after lock
        this.invalidateCache();
        this.fetchBalance(true).catch(() => {});
      }),
      map((response) => response.data![0] as WalletLockRentalAndDepositResponse),
    );
  }

  // ============================================================================
  // REALTIME SUBSCRIPTIONS
  // ============================================================================

  async subscribeToWalletChanges(
    onTransaction: (transaction: WalletTransaction) => void,
    onBalanceChange: (balance: WalletBalance) => void,
  ): Promise<RealtimeChannel> {
    const session = await this.authService.ensureSession();
    const user = session?.user;
    if (!user) throw new Error('No autenticado');

    // Cleanup any previous channel to avoid duplicate callbacks
    if (this.walletChannel) {
      await this.supabase.removeChannel(this.walletChannel);
      this.walletChannel = null;
    }

    const normalizeTransaction = (row: Record<string, unknown>): WalletTransaction => {
      const rawAmount = row['amount'];
      const amountNum =
        typeof rawAmount === 'number'
          ? rawAmount
          : typeof rawAmount === 'string'
            ? Number(rawAmount)
            : 0;
      const amountCents = Number.isFinite(amountNum) ? Math.round(amountNum) : 0;

      const referenceType =
        typeof row['reference_type'] === 'string' ? row['reference_type'] : undefined;
      const referenceId = typeof row['reference_id'] === 'string' ? row['reference_id'] : undefined;

      return {
        id: String(row['id'] ?? ''),
        user_id: String(row['user_id'] ?? user.id),
        transaction_date: String(
          row['created_at'] ?? row['completed_at'] ?? new Date().toISOString(),
        ),
        transaction_type: String(row['type'] ?? ''),
        status: String(row['status'] ?? ''),
        amount_cents: amountCents,
        currency: String(row['currency'] ?? 'USD'),
        metadata: {
          description: typeof row['description'] === 'string' ? row['description'] : undefined,
          reference_type: referenceType as WalletReferenceType | undefined,
          reference_id: referenceId,
          provider:
            typeof row['provider'] === 'string'
              ? (row['provider'] as WalletPaymentProvider)
              : undefined,
          provider_transaction_id:
            typeof row['provider_transaction_id'] === 'string'
              ? row['provider_transaction_id']
              : undefined,
          provider_metadata:
            row['provider_metadata'] && typeof row['provider_metadata'] === 'object'
              ? (row['provider_metadata'] as Record<string, unknown>)
              : undefined,
          admin_notes: typeof row['admin_notes'] === 'string' ? row['admin_notes'] : undefined,
          is_withdrawable:
            typeof row['is_withdrawable'] === 'boolean' ? row['is_withdrawable'] : undefined,
          category: typeof row['category'] === 'string' ? row['category'] : undefined,
          balance_after_cents: row['balance_after_cents'],
        },
        booking_id: referenceType === 'booking' ? referenceId : undefined,
        source_system: 'legacy',
        legacy_transaction_id: String(row['id'] ?? ''),
      };
    };

    this.walletChannel = this.supabase
      .channel(`wallet:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallet_transactions',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const tx = payload.new as unknown as Record<string, unknown>;
          const type = String(tx['type'] ?? '');
          const status = String(tx['status'] ?? '');
          const prev = payload.old as unknown as Record<string, unknown> | null;
          const prevStatus = prev ? String(prev['status'] ?? '') : '';

          // Only notify the "deposit confirmed" callback for completed deposits.
          if (type === 'deposit' && status === 'completed' && prevStatus !== 'completed') {
            onTransaction(normalizeTransaction(tx));
          }
          try {
            const balance = await this.fetchBalance(true);
            onBalanceChange(balance);
          } catch (error) {
            this.logger.warn(
              'Failed to refresh wallet balance after transaction',
              error instanceof Error ? error.message : String(error),
            );
          }
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.debug('[Wallet] Realtime subscription active');
        }
      });

    return this.walletChannel;
  }

  async unsubscribeFromWalletChanges(): Promise<void> {
    if (!this.walletChannel) return;
    await this.supabase.removeChannel(this.walletChannel);
    this.walletChannel = null;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  async forcePollPendingPayments(): Promise<{
    success: boolean;
    confirmed: number;
    message: string;
  }> {
    this.loading.set(true);
    try {
      // Polling MercadoPago is done via Edge Function (service role) because it requires external API calls.
      const response = await this.supabase.functions.invoke('mercadopago-poll-pending-payments', {
        body: {},
      });

      if (response.error) {
        throw new Error(response.error.message ?? 'Error al consultar pagos pendientes');
      }

      const data = (response.data ?? {}) as Record<string, unknown>;
      const summary = (data['summary'] ?? null) as Record<string, unknown> | null;
      const confirmedRaw = summary?.['confirmed'];
      const confirmed =
        typeof confirmedRaw === 'number'
          ? confirmedRaw
          : typeof confirmedRaw === 'string'
            ? Number(confirmedRaw)
            : 0;

      const message =
        typeof data['message'] === 'string'
          ? String(data['message'])
          : `Confirmados: ${Number.isFinite(confirmed) ? confirmed : 0}`;

      this.invalidateCache();
      this.fetchBalance(true).catch(() => {});
      this.fetchTransactions().catch(() => {});

      return {
        success: data['success'] === true,
        confirmed: Number.isFinite(confirmed) ? confirmed : 0,
        message,
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
      const { error, count } = await this.supabase
        .from('wallet_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .eq('type', 'deposit');

      if (error) throw error;
      this.pendingDepositsCount.set(count ?? 0);
    } catch (err: unknown) {
      this.logger['error']('Error al obtener depósitos pendientes', String(err));
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
      const userId = await this.authService.getCachedUserId();
      if (!userId) throw new Error('Usuario no autenticado');

      const { count: completedBookings } = await this.supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('renter_id', userId)
        .eq('status', 'completed');

      const { count: totalClaims } = await this.supabase
        .from('booking_claims')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
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

  // ============================================================================
  // EXPIRING CREDITS
  // ============================================================================

  /**
   * Signal para créditos que expiran pronto (30 días o menos)
   */
  readonly expiringCredits = signal<ExpiringCredit[]>([]);

  /**
   * Computed: tiene créditos por vencer en 7 días o menos (urgente)
   */
  readonly hasUrgentExpiringCredits = computed(() =>
    this.expiringCredits().some((c) => c.days_until_expiry <= 7),
  );

  /**
   * Computed: total de créditos por vencer
   */
  readonly totalExpiringAmount = computed(() =>
    this.expiringCredits().reduce((sum, c) => sum + c.amount_cents, 0),
  );

  /**
   * Obtiene créditos que expiran en los próximos N días
   */
  async fetchExpiringCredits(daysAhead: number = 30): Promise<ExpiringCredit[]> {
    try {
      const { data, error } = await this.supabase.rpc('get_expiring_credits', {
        p_days_ahead: daysAhead,
      });

      if (error) throw error;

      const credits = (data ?? []) as ExpiringCredit[];
      this.expiringCredits.set(credits);
      return credits;
    } catch (err) {
      this.logger['error']('Error al obtener créditos por vencer', String(err));
      return [];
    }
  }

  /**
   * Parse raw RPC result into WalletBalance with type safety
   * Extracts numeric values with defaults to prevent runtime errors
   */
  private parseWalletBalance(raw: Record<string, unknown>): WalletBalance {
    const toNumber = (value: unknown, defaultValue = 0): number => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? defaultValue : parsed;
      }
      return defaultValue;
    };

    return {
      user_id: String(raw['user_id'] ?? ''),
      available_balance: toNumber(raw['available_balance']),
      transferable_balance: toNumber(raw['transferable_balance']),
      withdrawable_balance: toNumber(raw['withdrawable_balance']),
      autorentar_credit_balance: toNumber(raw['autorentar_credit_balance']),
      cash_deposit_balance: toNumber(raw['cash_deposit_balance']),
      protected_credit_balance: toNumber(raw['protected_credit_balance']),
      locked_balance: toNumber(raw['locked_balance']),
      total_balance: toNumber(raw['total_balance']),
      currency: String(raw['currency'] ?? 'USD'),
    };
  }

  private handleError(err: unknown, defaultMessage: string): void {
    const errorMessage = err instanceof Error ? err['message'] : defaultMessage;
    this['error'].set({ message: errorMessage });
    this.logger['error'](defaultMessage, String(err));
  }
}
