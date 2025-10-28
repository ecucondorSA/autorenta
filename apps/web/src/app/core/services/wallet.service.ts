import { Injectable, signal, computed, inject } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { environment } from '@environment';
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
import { SupabaseClientService } from './supabase-client.service';

/** Metadata structure stored in wallet_transactions.metadata (JSONB) */
interface WalletMetadata {
  is_withdrawable?: boolean;
  reference_type?: string;
  reference_id?: string;
  provider?: string;
  provider_transaction_id?: string;
  provider_metadata?: Record<string, unknown>;
  description?: string;
  admin_notes?: string;
  [key: string]: unknown; // Allow additional fields
}

/** Database row from wallet transactions view */
interface WalletTransactionRow {
  id: unknown;
  user_id: unknown;
  transaction_type: unknown;
  status: unknown;
  amount_cents: unknown;
  currency: unknown;
  metadata?: WalletMetadata | null;
  booking_id?: unknown;
  transaction_date: unknown;
  legacy_completed_at?: unknown;
  [key: string]: unknown;
}

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
  // IMPORTANTE: NO cachear balance en localStorage
  // El balance debe SIEMPRE obtenerse fresco de la base de datos
  // para evitar mostrar datos obsoletos que causen errores de "saldo insuficiente"

  /**
   * Canal de subscripción a cambios realtime en wallet_transactions
   */
  private realtimeChannel: RealtimeChannel | null = null;

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
   * Balance disponible (Total - Locked)
   */
  readonly availableBalance = computed(() => this.balance()?.available_balance ?? 0);

  /**
   * Fondos transferibles dentro de la app o a otros usuarios (Available - Protected)
   */
  readonly transferableBalance = computed(() => this.balance()?.transferable_balance ?? 0);

  /**
   * Fondos retirables a cuenta bancaria externa (Transferable - Hold)
   */
  readonly withdrawableBalance = computed(() => this.balance()?.withdrawable_balance ?? 0);

  /**
   * Crédito Autorentar (meta inicial USD 300, no retirable, no transferible)
   * Solo para cubrir garantías de reservas
   */
  readonly protectedCreditBalance = computed(() => this.balance()?.protected_credit_balance ?? 0);

  /**
   * @deprecated Use protectedCreditBalance instead
   * Backward compatibility
   */
  readonly nonWithdrawableBalance = computed(() => this.balance()?.protected_credit_balance ?? 0);

  /**
   * Balance bloqueado en reservas activas
   */
  readonly lockedBalance = computed(() => this.balance()?.locked_balance ?? 0);

  /**
   * Balance total (Available + Locked)
   */
  readonly totalBalance = computed(() => this.balance()?.total_balance ?? 0);

  /**
   * Número de depósitos pendientes
   */
  readonly pendingDepositsCount = signal(0);

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

  /**
   * Refresca el número de depósitos pendientes (transaction_type = deposit, status = pending)
   */
  async refreshPendingDepositsCount(): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .getClient()
        .from('v_wallet_history')
        .select('id')
        .eq('transaction_type', 'deposit')
        .eq('status', 'pending');

      if (error) {
        throw this.createError('PENDING_DEPOSITS_ERROR', error.message, error);
      }

      const count = data?.length ?? 0;
      this.pendingDepositsCount.set(count);
      return count;
    } catch (err) {
      this.handleError(err, 'No se pudieron obtener los depósitos pendientes');
      return this.pendingDepositsCount();
    }
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
      const { data, error } = await this.supabase.getClient().rpc('wallet_get_balance');

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
        transferable_balance: balance.transferable_balance ?? 0,
        withdrawable_balance: balance.withdrawable_balance ?? 0,
        protected_credit_balance: balance.protected_credit_balance ?? 0,
        locked_balance: balance.locked_balance ?? 0,
        total_balance: balance.total_balance ?? 0,
        currency: balance.currency ?? 'USD',
        // Backward compatibility
        non_withdrawable_balance: balance.protected_credit_balance ?? 0,
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

          // 🔍 DEBUG: Logging agresivo

          const supabaseUrl = environment.supabaseUrl;
          if (!supabaseUrl) {
            throw this.createError(
              'SUPABASE_URL_MISSING',
              'Supabase URL no configurada. Define NG_APP_SUPABASE_URL antes de iniciar depósitos.',
            );
          }

          const edgeFunctionUrl = `${supabaseUrl}/functions/v1/mercadopago-create-preference`;

          const requestBody = {
            transaction_id: result.transaction_id,
            amount: params.amount,
            description: params.description || 'Depósito a Wallet - AutoRenta',
          };

          const mpResponse = await fetch(edgeFunctionUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(requestBody),
          });


          if (!mpResponse.ok) {
            const errorText = await mpResponse.text();

            let errorData: Record<string, unknown> = {};
            try {
              errorData = JSON.parse(errorText) as Record<string, unknown>;
            } catch {
              errorData = { rawError: errorText };
            }

            throw this.createError(
              'MERCADOPAGO_ERROR',
              `Error al crear preferencia de pago (${mpResponse.status}): ${errorData.error || errorText}`,
              errorData,
            );
          }

          const mpData = await mpResponse.json();

          const initPoint: string | undefined = mpData.init_point || mpData.sandbox_init_point;

          // Actualizar result con la URL real de Mercado Pago
          // init_point funciona tanto en web como en móvil (MP redirige automáticamente a la app si está instalada)
          if (initPoint) {
            result.payment_url = initPoint;
          }
        } catch (mpError) {
          // Si falla la creación de preference, registrar error pero no fallar la transacción
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
   * Fuerza el polling de pagos pendientes de MercadoPago
   * Llama a la Edge Function mercadopago-poll-pending-payments
   *
   * Esta función permite al usuario forzar manualmente la verificación
   * de pagos pendientes en MercadoPago, útil cuando:
   * - El usuario acaba de completar un pago
   * - El webhook falló
   * - El auto-polling no ha ejecutado aún
   *
   * @returns Promise con resultado del polling
   */
  async forcePollPendingPayments(): Promise<{
    success: boolean;
    confirmed: number;
    message: string;
  }> {
    try {

      // Obtener access token
      const {
        data: { session },
      } = await this.supabase.getClient().auth.getSession();
      const accessToken = session?.access_token;

      if (!accessToken) {
        throw this.createError('AUTH_ERROR', 'No hay sesión activa');
      }

      const supabaseUrl = environment.supabaseUrl;
      if (!supabaseUrl) {
        throw this.createError(
          'SUPABASE_URL_MISSING',
          'Supabase URL no configurada. Define NG_APP_SUPABASE_URL antes de forzar el polling de pagos.',
        );
      }
      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/mercadopago-poll-pending-payments`;


      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw this.createError('POLLING_ERROR', `Error al ejecutar polling (${response.status})`, {
          rawError: errorText,
        });
      }

      const result = await response.json();

      // Refrescar balance después del polling
      await this.getBalance().catch(() => {
      });

      return {
        success: result.success || false,
        confirmed: result.summary?.confirmed || 0,
        message:
          result.summary?.confirmed > 0
            ? `Se confirmaron ${result.summary.confirmed} depósito(s)`
            : 'No se encontraron pagos aprobados para confirmar',
      };
    } catch (err) {
      const walletError = this.handleError(err, 'Error al verificar pagos pendientes');
      throw walletError;
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
      const protectedCredit = previous?.protected_credit_balance ?? 0;
      const transferable = Math.max(result.new_available_balance - protectedCredit, 0);
      const withdrawable = transferable; // Por ahora, sin hold adicional

      const updatedBalance: WalletBalance = {
        available_balance: result.new_available_balance,
        transferable_balance: transferable,
        withdrawable_balance: withdrawable,
        protected_credit_balance: protectedCredit,
        locked_balance: result.new_locked_balance,
        total_balance: result.new_available_balance + result.new_locked_balance,
        currency: previous?.currency ?? 'USD',
        // Backward compatibility
        non_withdrawable_balance: protectedCredit,
      };
      this.balance.set(updatedBalance);

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
      const protectedCredit = previous?.protected_credit_balance ?? 0;
      const transferable = Math.max(result.new_available_balance - protectedCredit, 0);
      const withdrawable = transferable; // Por ahora, sin hold adicional

      const updatedBalance: WalletBalance = {
        available_balance: result.new_available_balance,
        transferable_balance: transferable,
        withdrawable_balance: withdrawable,
        protected_credit_balance: protectedCredit,
        locked_balance: result.new_locked_balance,
        total_balance: result.new_available_balance + result.new_locked_balance,
        currency: previous?.currency ?? 'USD',
        // Backward compatibility
        non_withdrawable_balance: protectedCredit,
      };
      this.balance.set(updatedBalance);

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
   *
   * ACTUALIZADO (2025-10-22): Usa vista consolidada v_wallet_history que combina
   * wallet_transactions (legacy) y wallet_ledger (nuevo sistema de doble partida)
   */
  async getTransactions(filters?: WalletTransactionFilters): Promise<WalletTransaction[]> {
    this.setLoadingState('transactions', true);
    this.clearError();

    try {
      // Usar vista consolidada en vez de wallet_transactions directamente
      let query = this.supabase
        .getClient()
        .from('v_wallet_history')
        .select('*')
        .order('transaction_date', { ascending: false });

      // Aplicar filtros (adaptados a columnas de vista consolidada)
      if (filters?.type) {
        if (Array.isArray(filters.type)) {
          query = query.in('transaction_type', filters.type);
        } else {
          query = query.eq('transaction_type', filters.type);
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
        // reference_type está en metadata, filtrar con JSONB operator
        query = query.contains('metadata', { reference_type: filters.reference_type });
      }

      if (filters?.reference_id) {
        // Filtrar por booking_id (más común) o por metadata.reference_id
        query = query.or(
          `booking_id.eq.${filters.reference_id},metadata.cs.{"reference_id":"${filters.reference_id}"}`,
        );
      }

      if (filters?.from_date) {
        query = query.gte('transaction_date', filters.from_date.toISOString());
      }

      if (filters?.to_date) {
        query = query.lte('transaction_date', filters.to_date.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        throw this.createError('TRANSACTIONS_FETCH_ERROR', error.message, error);
      }

      // Transformar datos de vista consolidada a formato WalletTransaction
      const transactions = (data ?? []).map((row: WalletTransactionRow) => {
        const amountCents = typeof row.amount_cents === 'number' ? row.amount_cents : 0;
        const metadata = row.metadata ?? {};

        return {
        id: row.id,
        user_id: row.user_id,
        type: row.transaction_type,
        status: row.status,
        amount: amountCents / 100, // Convertir centavos a decimales
        currency: row.currency,
        is_withdrawable: metadata.is_withdrawable ?? false,
        reference_type: metadata.reference_type,
        reference_id: metadata.reference_id || row.booking_id,
        provider: metadata.provider,
        provider_transaction_id: metadata.provider_transaction_id,
        provider_metadata: metadata.provider_metadata,
        description: metadata.description,
        admin_notes: metadata.admin_notes,
        created_at: row.transaction_date,
        updated_at: row.transaction_date,
        completed_at:
          row.legacy_completed_at ||
          (row.status === 'completed' ? row.transaction_date : undefined),
        };
      }) as WalletTransaction[];

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
  async lockRentalAndDeposit(
    params: LockRentalAndDepositParams,
  ): Promise<WalletLockRentalAndDepositResponse> {
    this.setLoadingState('lockingFunds', true);
    this.clearError();

    try {
      const { data, error } = await this.supabase
        .getClient()
        .rpc('wallet_lock_rental_and_deposit', {
          p_booking_id: params.booking_id,
          p_rental_amount: params.rental_amount,
          p_deposit_amount: params.deposit_amount ?? 250,
        });

      if (error) throw this.createError('LOCK_RENTAL_DEPOSIT_ERROR', error.message, error);
      if (!data || data.length === 0)
        throw this.createError('LOCK_EMPTY', 'No se pudo bloquear fondos');

      const result = data[0] as WalletLockRentalAndDepositResponse;
      if (!result.success) throw this.createError('LOCK_FAILED', result.message);

      // Actualizar balance local
      const previous = this.balance();
      const protectedCredit = previous?.protected_credit_balance ?? 0;
      const transferable = Math.max(result.new_available_balance - protectedCredit, 0);
      const withdrawable = transferable; // Por ahora, sin hold adicional

      const updatedBalance: WalletBalance = {
        available_balance: result.new_available_balance,
        transferable_balance: transferable,
        withdrawable_balance: withdrawable,
        protected_credit_balance: protectedCredit,
        locked_balance: result.new_locked_balance,
        total_balance: result.new_available_balance + result.new_locked_balance,
        currency: previous?.currency ?? 'USD',
        // Backward compatibility
        non_withdrawable_balance: protectedCredit,
      };
      this.balance.set(updatedBalance);

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
  async completeBooking(
    bookingId: string,
    completionNotes?: string,
  ): Promise<WalletCompleteBookingResponse> {
    this.setLoadingState('unlockingFunds', true);
    this.clearError();

    try {
      const { data, error } = await this.supabase.getClient().rpc('wallet_complete_booking', {
        p_booking_id: bookingId,
        p_completion_notes: completionNotes ?? 'Auto entregado en buenas condiciones',
      });

      if (error) throw this.createError('COMPLETE_BOOKING_ERROR', error.message, error);
      if (!data || data.length === 0)
        throw this.createError('COMPLETE_EMPTY', 'No se pudo completar booking');

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
  async completeBookingWithDamages(
    params: CompleteBookingWithDamagesParams,
  ): Promise<WalletCompleteBookingWithDamagesResponse> {
    this.setLoadingState('unlockingFunds', true);
    this.clearError();

    try {
      const { data, error } = await this.supabase
        .getClient()
        .rpc('wallet_complete_booking_with_damages', {
          p_booking_id: params.booking_id,
          p_damage_amount: params.damage_amount,
          p_damage_description: params.damage_description,
        });

      if (error) throw this.createError('COMPLETE_WITH_DAMAGES_ERROR', error.message, error);
      if (!data || data.length === 0)
        throw this.createError('COMPLETE_EMPTY', 'No se pudo completar booking');

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

  // ==================== REALTIME SUBSCRIPTIONS ====================

  /**
   * Subscribirse a cambios en wallet_transactions en tiempo real
   * Útil para mostrar notificaciones cuando se confirman depósitos
   *
   * @param onDepositConfirmed - Callback cuando un depósito pasa de pending a completed
   * @param onTransactionUpdate - Callback para cualquier cambio en transacciones
   */
  async subscribeToWalletChanges(
    onDepositConfirmed?: (transaction: WalletTransaction) => void,
    onTransactionUpdate?: (transaction: WalletTransaction) => void,
  ): Promise<void> {
    try {
      // Obtener user_id actual
      const {
        data: { user },
      } = await this.supabase.getClient().auth.getUser();
      if (!user) {
        return;
      }

      // Desuscribirse del canal anterior si existe
      if (this.realtimeChannel) {
        await this.unsubscribeFromWalletChanges();
      }


      // Crear canal de subscripción
      this.realtimeChannel = this.supabase
        .getClient()
        .channel(`wallet_updates_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'wallet_transactions',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {

            const oldRecord = payload.old as Record<string, unknown> | undefined;
            const newRecord = payload.new as Record<string, unknown> | undefined;

            if (!newRecord) {
              return;
            }

            // Convertir a WalletTransaction
            const transaction: WalletTransaction = {
              id: newRecord.id as string,
              user_id: newRecord.user_id as string,
              type: newRecord.type as WalletTransaction['type'],
              status: newRecord.status as WalletTransaction['status'],
              amount: newRecord.amount as number,
              currency: newRecord.currency as string,
              is_withdrawable: newRecord.is_withdrawable as boolean,
              reference_type: newRecord.reference_type as WalletTransaction['reference_type'],
              reference_id: (newRecord.reference_id as string | null) ?? undefined,
              provider: newRecord.provider as WalletTransaction['provider'],
              provider_transaction_id: (newRecord.provider_transaction_id as string | null) ?? undefined,
              provider_metadata: (newRecord.provider_metadata as Record<string, unknown> | null) ?? undefined,
              description: (newRecord.description as string | null) ?? undefined,
              admin_notes: (newRecord.admin_notes as string | null) ?? undefined,
              created_at: newRecord.created_at as string,
              updated_at: newRecord.updated_at as string,
              completed_at: (newRecord.completed_at as string | null) ?? undefined,
            };

            // Detectar si es un depósito que pasó de pending a completed
            if (
              transaction.type === 'deposit' &&
              oldRecord?.status === 'pending' &&
              newRecord.status === 'completed'
            ) {

              // Refrescar balance automáticamente
              this.getBalance().catch((err) => {
              });

              // Enviar email de confirmación
              this.sendDepositConfirmationEmail(transaction).catch((err) => {
                // No fallar si el email falla, es opcional
              });

              // Llamar callback si existe
              if (onDepositConfirmed) {
                onDepositConfirmed(transaction);
              }
            }

            // Callback genérico para cualquier update
            if (onTransactionUpdate) {
              onTransactionUpdate(transaction);
            }

            // Actualizar lista de transacciones en memoria
            this.transactions.update((current) => {
              const index = current.findIndex((t) => t.id === transaction.id);
              if (index >= 0) {
                // Actualizar transacción existente
                const updated = [...current];
                updated[index] = transaction;
                return updated;
              }
              // Agregar nueva transacción al inicio
              return [transaction, ...current];
            });
          },
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'wallet_transactions',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {

            const newRecord = payload.new as Record<string, unknown> | undefined;

            if (!newRecord) {
              return;
            }

            const transaction: WalletTransaction = {
              id: newRecord.id as string,
              user_id: newRecord.user_id as string,
              type: newRecord.type as WalletTransaction['type'],
              status: newRecord.status as WalletTransaction['status'],
              amount: newRecord.amount as number,
              currency: newRecord.currency as string,
              is_withdrawable: newRecord.is_withdrawable as boolean,
              reference_type: newRecord.reference_type as WalletTransaction['reference_type'],
              reference_id: (newRecord.reference_id as string | null) ?? undefined,
              provider: newRecord.provider as WalletTransaction['provider'],
              provider_transaction_id: (newRecord.provider_transaction_id as string | null) ?? undefined,
              provider_metadata: (newRecord.provider_metadata as Record<string, unknown> | null) ?? undefined,
              description: (newRecord.description as string | null) ?? undefined,
              admin_notes: (newRecord.admin_notes as string | null) ?? undefined,
              created_at: newRecord.created_at as string,
              updated_at: newRecord.updated_at as string,
              completed_at: (newRecord.completed_at as string | null) ?? undefined,
            };

            // Callback para nueva transacción
            if (onTransactionUpdate) {
              onTransactionUpdate(transaction);
            }

            // Agregar a lista de transacciones
            this.transactions.update((current) => [transaction, ...current]);
          },
        )
        .subscribe((status) => {

          if (status === 'SUBSCRIBED') {
          } else if (status === 'CHANNEL_ERROR') {
          } else if (status === 'TIMED_OUT') {
          } else if (status === 'CLOSED') {
          }
        });
    } catch (err) {
      throw this.handleError(err, 'Error al iniciar subscripción realtime');
    }
  }

  /**
   * Desuscribirse de cambios en wallet_transactions
   */
  async unsubscribeFromWalletChanges(): Promise<void> {
    if (this.realtimeChannel) {
      await this.supabase.getClient().removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
  }

  /**
   * Limpia el estado del servicio
   */
  clear(): void {
    this.balance.set(null);
    this.transactions.set([]);
    this.clearError();
    // Cerrar subscripción realtime
    this.unsubscribeFromWalletChanges().catch((err) => {
    });
  }

  /**
   * Resetea manualmente el error expuesto (p. ej. después de manejar un fallo de Mercado Pago)
   */
  resetError(): void {
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

  /**
   * Envía email de confirmación de depósito
   */
  private async sendDepositConfirmationEmail(transaction: WalletTransaction): Promise<void> {
    try {
      const session = await this.supabase.getClient().auth.getSession();
      const accessToken = session.data.session?.access_token;

      if (!accessToken) {
        return;
      }

      const supabaseUrl = environment.supabaseUrl;
      if (!supabaseUrl) {
          '⚠️ Supabase URL no configurada. Omite envío de email de confirmación. Define NG_APP_SUPABASE_URL para habilitarlo.',
        );
        return;
      }
      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/send-deposit-confirmation-email`;


      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          transaction_id: transaction.id,
          user_id: transaction.user_id,
          amount: transaction.amount,
          currency: transaction.currency,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return;
      }

      const result = await response.json();
    } catch (err) {
      // No propagar el error, el email es opcional
    }
  }
}
