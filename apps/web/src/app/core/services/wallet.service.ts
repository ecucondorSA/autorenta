import { Injectable, signal, computed, inject } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';
import type {
  WalletBalance,
  WalletTransaction,
  WalletLockFundsResponse,
  WalletUnlockFundsResponse,
  WalletInitiateDepositResponse,
  InitiateDepositParams,
  LockFundsParams,
  UnlockFundsParams,
  WalletTransactionFilters,
  WalletLoadingState,
  WalletError,
  WalletLockRentalAndDepositResponse,
  WalletCompleteBookingResponse,
  WalletCompleteBookingWithDamagesResponse,
  LockRentalAndDepositParams,
  CompleteBookingWithDamagesParams,
} from '../models/wallet.model';

/**
 * WalletService
 *
 * Servicio para gestionar operaciones de wallet:
 * - Obtener balance del usuario
 * - Iniciar depósitos
 * - Bloquear/desbloquear fondos para reservas
 * - Ver historial de transacciones
 *
 * Usa signals de Angular 17+ para state management reactivo.
 */
@Injectable({
  providedIn: 'root',
})
export class WalletService {
  private readonly supabase = inject(SupabaseClientService);

  // ==================== SIGNALS ====================

  /**
   * Balance actual del usuario (disponible, bloqueado, total)
   */
  readonly balance = signal<WalletBalance | null>(null);

  /**
   * Lista de transacciones del usuario
   */
  readonly transactions = signal<WalletTransaction[]>([]);

  /**
   * Estados de carga para operaciones asíncronas
   */
  readonly loading = signal<WalletLoadingState>({
    balance: false,
    transactions: false,
    initiatingDeposit: false,
    lockingFunds: false,
    unlockingFunds: false,
  });

  /**
   * Error actual (si existe)
   */
  readonly error = signal<WalletError | null>(null);

  // ==================== COMPUTED SIGNALS ====================

  /**
   * Balance disponible (computed para fácil acceso)
   */
  readonly availableBalance = computed(() => this.balance()?.available_balance ?? 0);

  /**
   * Balance que puede retirarse a cuenta bancaria
   */
  readonly withdrawableBalance = computed(() => this.balance()?.withdrawable_balance ?? this.availableBalance());

  /**
   * Crédito interno (no reembolsable) que debe permanecer en Autorentar
   */
  readonly nonWithdrawableBalance = computed(() => this.balance()?.non_withdrawable_balance ?? 0);

  /**
   * Balance bloqueado (computed para fácil acceso)
   */
  readonly lockedBalance = computed(() => this.balance()?.locked_balance ?? 0);

  /**
   * Balance total (computed para fácil acceso)
   */
  readonly totalBalance = computed(() => this.balance()?.total_balance ?? 0);

  /**
   * Indica si hay alguna operación en progreso
   */
  readonly isLoading = computed(() => {
    const loadingState = this.loading();
    return (
      loadingState.balance ||
      loadingState.transactions ||
      loadingState.initiatingDeposit ||
      loadingState.lockingFunds ||
      loadingState.unlockingFunds
    );
  });

  /**
   * Indica si el usuario tiene fondos suficientes para una cantidad dada
   */
  hasSufficientFunds(amount: number): boolean {
    return this.availableBalance() >= amount;
  }

  /**
   * Indica si el usuario puede retirar un monto específico (considerando el piso no reembolsable)
   */
  hasSufficientWithdrawableFunds(amount: number): boolean {
    return this.withdrawableBalance() >= amount;
  }

  // ==================== PUBLIC METHODS ====================

  /**
   * Obtiene el balance actual del usuario
   * Llama a la función RPC wallet_get_balance()
   */
  async getBalance(): Promise<WalletBalance> {
    this.setLoadingState('balance', true);
    this.clearError();

    try {
      const { data, error} = await this.supabase.getClient().rpc('wallet_get_balance');

      if (error) {
        throw this.createError('BALANCE_FETCH_ERROR', error.message, error);
      }

      if (!data || data.length === 0) {
        throw this.createError('BALANCE_EMPTY', 'No se pudo obtener el balance');
      }

      const balance = data[0] as WalletBalance;
      const normalizedBalance: WalletBalance = {
        ...balance,
        available_balance: balance.available_balance ?? 0,
        withdrawable_balance: balance.withdrawable_balance ?? balance.available_balance ?? 0,
        non_withdrawable_balance:
          balance.non_withdrawable_balance ??
          Math.max((balance.available_balance ?? 0) - (balance.withdrawable_balance ?? balance.available_balance ?? 0), 0),
        locked_balance: balance.locked_balance ?? 0,
        total_balance: balance.total_balance ?? ((balance.available_balance ?? 0) + (balance.locked_balance ?? 0)),
        currency: balance.currency ?? 'USD',
      };

      this.balance.set(normalizedBalance);

      return normalizedBalance;
    } catch (err) {
      const walletError = this.handleError(err, 'Error al obtener balance');
      throw walletError;
    } finally {
      this.setLoadingState('balance', false);
    }
  }

  /**
   * Inicia un proceso de depósito
   * 1. Llama a wallet_initiate_deposit() para crear transacción pending en DB
   * 2. Si provider es 'mercadopago', llama a Edge Function para crear preference
   * 3. Retorna init_point (URL de checkout) para redirigir al usuario
   *
   * @returns URL de pago para redirigir al usuario
   */
  async initiateDeposit(params: InitiateDepositParams): Promise<WalletInitiateDepositResponse> {
    this.setLoadingState('initiatingDeposit', true);
    this.clearError();

    try {
      // Validar parámetros
      if (params.amount <= 0) {
        throw this.createError('INVALID_AMOUNT', 'El monto debe ser mayor a 0');
      }

      if (params.amount < 10) {
        throw this.createError('AMOUNT_TOO_LOW', 'El depósito mínimo es $10 USD');
      }

      if (params.amount > 5000) {
        throw this.createError(
          'AMOUNT_TOO_HIGH',
          'El depósito máximo es $5,000 USD. Para montos mayores contacte a soporte.',
        );
      }

      // Paso 1: Crear transacción pending en la base de datos
      const { data, error } = await this.supabase.getClient().rpc('wallet_initiate_deposit', {
        p_amount: params.amount,
        p_provider: params.provider ?? 'mercadopago',
        p_description: params.description ?? 'Depósito a wallet',
        p_allow_withdrawal: params.allowWithdrawal ?? false,
      });

      if (error) {
        throw this.createError('DEPOSIT_INITIATION_ERROR', error.message, error);
      }

      if (!data || data.length === 0) {
        throw this.createError('DEPOSIT_EMPTY', 'No se pudo iniciar el depósito');
      }

      const result = data[0] as WalletInitiateDepositResponse;

      if (!result.success) {
        throw this.createError('DEPOSIT_FAILED', result.message);
      }

      // Paso 2: Si es Mercado Pago, llamar a Edge Function para crear preference
      if (params.provider === 'mercadopago' || !params.provider) {
        try {
          const session = await this.supabase.getClient().auth.getSession();
          const accessToken = session.data.session?.access_token;

          if (!accessToken) {
            throw this.createError('NO_AUTH_TOKEN', 'Usuario no autenticado');
          }

          const supabaseUrl = (this.supabase.getClient() as any).supabaseUrl;
          const mpResponse = await fetch(
            `${supabaseUrl}/functions/v1/mercadopago-create-preference`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                transaction_id: result.transaction_id,
                amount: params.amount,
                description: params.description || 'Depósito a Wallet - AutoRenta',
              }),
            }
          );

          if (!mpResponse.ok) {
            const errorData = await mpResponse.json().catch(() => ({}));
            throw this.createError(
              'MERCADOPAGO_ERROR',
              `Error al crear preferencia de pago: ${errorData.error || mpResponse.statusText}`,
              errorData
            );
          }

          const mpData = await mpResponse.json();

          const initPoint: string | undefined = mpData.init_point || mpData.sandbox_init_point;
          const mobileDeepLink: string | undefined =
            mpData.mobile_deep_link ||
            mpData.point_of_interaction?.transaction_data?.ticket_url ||
            (typeof initPoint === 'string'
              ? initPoint.replace('https://www.mercadopago.com', 'mercadopago://')
              : undefined);

          // Actualizar result con la URL real de Mercado Pago
          if (initPoint) {
            result.payment_url = initPoint;
          }

          if (mobileDeepLink) {
            result.payment_mobile_deep_link = mobileDeepLink;
          }
        } catch (mpError) {
          // Si falla la creación de preference, registrar error pero no fallar la transacción
          console.error('Error creating MercadoPago preference:', mpError);
          // La transacción ya fue creada en DB, el usuario puede reintentar
          throw this.handleError(mpError, 'Error al procesar con Mercado Pago');
        }
      }

      // Refrescar balance después de iniciar depósito (aunque estará pending)
      await this.getBalance().catch(() => {
        // Ignorar error de refresh, no es crítico
      });

      return result;
    } catch (err) {
      const walletError = this.handleError(err, 'Error al iniciar depósito');
      throw walletError;
    } finally {
      this.setLoadingState('initiatingDeposit', false);
    }
  }

  /**
   * Bloquea fondos para una reserva
   * Llama a la función RPC wallet_lock_funds()
   */
  async lockFunds(params: LockFundsParams): Promise<WalletLockFundsResponse> {
    this.setLoadingState('lockingFunds', true);
    this.clearError();

    try {
      // Validar parámetros
      if (params.amount <= 0) {
        throw this.createError('INVALID_AMOUNT', 'El monto debe ser mayor a 0');
      }

      if (!params.booking_id) {
        throw this.createError('MISSING_BOOKING_ID', 'El ID de la reserva es requerido');
      }

      // Verificar fondos suficientes antes de intentar bloquear
      if (!this.hasSufficientFunds(params.amount)) {
        throw this.createError(
          'INSUFFICIENT_FUNDS',
          `Fondos insuficientes. Disponible: $${this.availableBalance()}, Requerido: $${params.amount}`,
        );
      }

      const { data, error } = await this.supabase.getClient().rpc('wallet_lock_funds', {
        p_booking_id: params.booking_id,
        p_amount: params.amount,
        p_description: params.description ?? 'Garantía bloqueada para reserva',
      });

      if (error) {
        throw this.createError('LOCK_FUNDS_ERROR', error.message, error);
      }

      if (!data || data.length === 0) {
        throw this.createError('LOCK_EMPTY', 'No se pudo bloquear los fondos');
      }

      const result = data[0] as WalletLockFundsResponse;

      if (!result.success) {
        throw this.createError('LOCK_FAILED', result.message);
      }

      // Actualizar balance local con el nuevo balance
      const previous = this.balance();
      const previousNonWithdrawable = previous?.non_withdrawable_balance ?? 0;
      const nonWithdrawable = Math.min(previousNonWithdrawable, result.new_available_balance);
      const withdrawable = Math.max(result.new_available_balance - nonWithdrawable, 0);

      this.balance.set({
        available_balance: result.new_available_balance,
        withdrawable_balance: withdrawable,
        non_withdrawable_balance: nonWithdrawable,
        locked_balance: result.new_locked_balance,
        total_balance: result.new_available_balance + result.new_locked_balance,
        currency: previous?.currency ?? 'USD',
      });

      return result;
    } catch (err) {
      const walletError = this.handleError(err, 'Error al bloquear fondos');
      throw walletError;
    } finally {
      this.setLoadingState('lockingFunds', false);
    }
  }

  /**
   * Desbloquea fondos previamente bloqueados
   * Llama a la función RPC wallet_unlock_funds()
   */
  async unlockFunds(params: UnlockFundsParams): Promise<WalletUnlockFundsResponse> {
    this.setLoadingState('unlockingFunds', true);
    this.clearError();

    try {
      if (!params.booking_id) {
        throw this.createError('MISSING_BOOKING_ID', 'El ID de la reserva es requerido');
      }

      const { data, error } = await this.supabase.getClient().rpc('wallet_unlock_funds', {
        p_booking_id: params.booking_id,
        p_description: params.description ?? 'Fondos desbloqueados',
      });

      if (error) {
        throw this.createError('UNLOCK_FUNDS_ERROR', error.message, error);
      }

      if (!data || data.length === 0) {
        throw this.createError('UNLOCK_EMPTY', 'No se pudo desbloquear los fondos');
      }

      const result = data[0] as WalletUnlockFundsResponse;

      if (!result.success) {
        throw this.createError('UNLOCK_FAILED', result.message);
      }

      // Actualizar balance local con el nuevo balance
      const previous = this.balance();
      const previousNonWithdrawable = previous?.non_withdrawable_balance ?? 0;
      const nonWithdrawable = Math.min(previousNonWithdrawable, result.new_available_balance);
      const withdrawable = Math.max(result.new_available_balance - nonWithdrawable, 0);

      this.balance.set({
        available_balance: result.new_available_balance,
        withdrawable_balance: withdrawable,
        non_withdrawable_balance: nonWithdrawable,
        locked_balance: result.new_locked_balance,
        total_balance: result.new_available_balance + result.new_locked_balance,
        currency: previous?.currency ?? 'USD',
      });

      return result;
    } catch (err) {
      const walletError = this.handleError(err, 'Error al desbloquear fondos');
      throw walletError;
    } finally {
      this.setLoadingState('unlockingFunds', false);
    }
  }

  /**
   * Obtiene el historial de transacciones del usuario
   * Con filtros opcionales
   */
  async getTransactions(filters?: WalletTransactionFilters): Promise<WalletTransaction[]> {
    this.setLoadingState('transactions', true);
    this.clearError();

    try {
      let query = this.supabase.getClient()
        .from('wallet_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      // Aplicar filtros
      if (filters?.type) {
        if (Array.isArray(filters.type)) {
          query = query.in('type', filters.type);
        } else {
          query = query.eq('type', filters.type);
        }
      }

      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status);
        } else {
          query = query.eq('status', filters.status);
        }
      }

      if (filters?.reference_type) {
        query = query.eq('reference_type', filters.reference_type);
      }

      if (filters?.reference_id) {
        query = query.eq('reference_id', filters.reference_id);
      }

      if (filters?.from_date) {
        query = query.gte('created_at', filters.from_date.toISOString());
      }

      if (filters?.to_date) {
        query = query.lte('created_at', filters.to_date.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        throw this.createError('TRANSACTIONS_FETCH_ERROR', error.message, error);
      }

      const transactions = (data ?? []) as WalletTransaction[];
      this.transactions.set(transactions);

      return transactions;
    } catch (err) {
      const walletError = this.handleError(err, 'Error al obtener transacciones');
      throw walletError;
    } finally {
      this.setLoadingState('transactions', false);
    }
  }

  /**
   * Refresca tanto el balance como las transacciones
   */
  async refresh(): Promise<void> {
    await Promise.all([
      this.getBalance().catch(() => {
        /* Ignorar errores de refresh */
      }),
      this.getTransactions().catch(() => {
        /* Ignorar errores de refresh */
      }),
    ]);
  }

  // ==================== MÉTODOS DE SISTEMA DUAL (RENTAL + DEPOSIT) ====================

  /**
   * Bloquea tanto el pago del alquiler como la garantía
   * El pago se transfiere al propietario, la garantía se devuelve al usuario
   *
   * @example
   * // Alquiler de $300 + Garantía de $250 = $550 total bloqueado
   * await walletService.lockRentalAndDeposit({
   *   booking_id: 'booking-uuid',
   *   rental_amount: 300,
   *   deposit_amount: 250 // Opcional, default $250
   * });
   */
  async lockRentalAndDeposit(params: LockRentalAndDepositParams): Promise<WalletLockRentalAndDepositResponse> {
    this.setLoadingState('lockingFunds', true);
    this.clearError();

    try {
      const { data, error } = await this.supabase.getClient().rpc('wallet_lock_rental_and_deposit', {
        p_booking_id: params.booking_id,
        p_rental_amount: params.rental_amount,
        p_deposit_amount: params.deposit_amount ?? 250,
      });

      if (error) throw this.createError('LOCK_RENTAL_DEPOSIT_ERROR', error.message, error);
      if (!data || data.length === 0) throw this.createError('LOCK_EMPTY', 'No se pudo bloquear fondos');

      const result = data[0] as WalletLockRentalAndDepositResponse;
      if (!result.success) throw this.createError('LOCK_FAILED', result.message);

      // Actualizar balance local
      const previous = this.balance();
      const previousNonWithdrawable = previous?.non_withdrawable_balance ?? 0;
      const nonWithdrawable = Math.min(previousNonWithdrawable, result.new_available_balance);
      const withdrawable = Math.max(result.new_available_balance - nonWithdrawable, 0);

      this.balance.set({
        available_balance: result.new_available_balance,
        withdrawable_balance: withdrawable,
        non_withdrawable_balance: nonWithdrawable,
        locked_balance: result.new_locked_balance,
        total_balance: result.new_available_balance + result.new_locked_balance,
        currency: previous?.currency ?? 'USD',
      });

      return result;
    } catch (err) {
      throw this.handleError(err, 'Error al bloquear rental + deposit');
    } finally {
      this.setLoadingState('lockingFunds', false);
    }
  }

  /**
   * Completa un booking sin daños
   * - Transfiere el pago del alquiler al propietario
   * - Devuelve la garantía completa al usuario (a su wallet)
   */
  async completeBooking(bookingId: string, completionNotes?: string): Promise<WalletCompleteBookingResponse> {
    this.setLoadingState('unlockingFunds', true);
    this.clearError();

    try {
      const { data, error } = await this.supabase.getClient().rpc('wallet_complete_booking', {
        p_booking_id: bookingId,
        p_completion_notes: completionNotes ?? 'Auto entregado en buenas condiciones',
      });

      if (error) throw this.createError('COMPLETE_BOOKING_ERROR', error.message, error);
      if (!data || data.length === 0) throw this.createError('COMPLETE_EMPTY', 'No se pudo completar booking');

      const result = data[0] as WalletCompleteBookingResponse;
      if (!result.success) throw this.createError('COMPLETE_FAILED', result.message);

      // Refrescar balance después de completar
      await this.getBalance().catch(() => {
        /* Ignorar errores de refresh */
      });

      return result;
    } catch (err) {
      throw this.handleError(err, 'Error al completar booking');
    } finally {
      this.setLoadingState('unlockingFunds', false);
    }
  }

  /**
   * Completa un booking con daños
   * - Transfiere el pago del alquiler al propietario
   * - Cobra daños de la garantía (parcial o total)
   * - Devuelve el resto de la garantía al usuario (si aplica)
   */
  async completeBookingWithDamages(params: CompleteBookingWithDamagesParams): Promise<WalletCompleteBookingWithDamagesResponse> {
    this.setLoadingState('unlockingFunds', true);
    this.clearError();

    try {
      const { data, error } = await this.supabase.getClient().rpc('wallet_complete_booking_with_damages', {
        p_booking_id: params.booking_id,
        p_damage_amount: params.damage_amount,
        p_damage_description: params.damage_description,
      });

      if (error) throw this.createError('COMPLETE_WITH_DAMAGES_ERROR', error.message, error);
      if (!data || data.length === 0) throw this.createError('COMPLETE_EMPTY', 'No se pudo completar booking');

      const result = data[0] as WalletCompleteBookingWithDamagesResponse;
      if (!result.success) throw this.createError('COMPLETE_FAILED', result.message);

      // Refrescar balance después de completar
      await this.getBalance().catch(() => {
        /* Ignorar errores de refresh */
      });

      return result;
    } catch (err) {
      throw this.handleError(err, 'Error al completar booking con daños');
    } finally {
      this.setLoadingState('unlockingFunds', false);
    }
  }

  /**
   * Limpia el estado del servicio
   */
  clear(): void {
    this.balance.set(null);
    this.transactions.set([]);
    this.clearError();
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Actualiza un estado de carga específico
   */
  private setLoadingState(key: keyof WalletLoadingState, value: boolean): void {
    this.loading.update((state) => ({ ...state, [key]: value }));
  }

  /**
   * Crea un objeto de error estandarizado
   */
  private createError(code: string, message: string, details?: unknown): WalletError {
    const error: WalletError = { code, message, details };
    this.error.set(error);
    return error;
  }

  /**
   * Maneja errores genéricos y los convierte a WalletError
   */
  private handleError(err: unknown, defaultMessage: string): WalletError {
    if (this.isWalletError(err)) {
      return err;
    }

    if (err instanceof Error) {
      const message = err.message || defaultMessage;

      if (err instanceof TypeError && message.toLowerCase().includes('fetch')) {
        return this.createError(
          'NETWORK_ERROR',
          'No pudimos conectar con el servicio de wallet. Verifica tu conexión a internet e inténtalo nuevamente.',
          err,
        );
      }

      return this.createError('UNKNOWN_ERROR', message, err);
    }

    return this.createError('UNKNOWN_ERROR', defaultMessage, err);
  }

  /**
   * Type guard para WalletError
   */
  private isWalletError(err: unknown): err is WalletError {
    return (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      'message' in err &&
      typeof (err as WalletError).code === 'string' &&
      typeof (err as WalletError).message === 'string'
    );
  }

  /**
   * Limpia el error actual
   */
  private clearError(): void {
    this.error.set(null);
  }
}
