import { Injectable, signal, computed, inject } from '@angular/core';
import type {
  BankAccount,
  WithdrawalRequest,
  RequestWithdrawalParams,
  WalletRequestWithdrawalResponse,
  WalletApproveWithdrawalResponse,
  ApproveWithdrawalParams,
  RejectWithdrawalParams,
  AddBankAccountParams,
  WithdrawalFilters,
  WithdrawalLoadingState,
  WalletError,
  BankAccountType,
} from '../models/wallet.model';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';

/**
 * WithdrawalService
 *
 * Servicio para gestionar el sistema de retiros:
 * - Gestionar cuentas bancarias del usuario
 * - Solicitar retiros de fondos
 * - Ver historial de retiros
 * - Aprobar/rechazar retiros (admin)
 *
 * Usa signals de Angular 17+ para state management reactivo.
 */
@Injectable({
  providedIn: 'root',
})
export class WithdrawalService {
  private readonly supabase = inject(SupabaseClientService);

  // ==================== SIGNALS ====================

  /**
   * Cuentas bancarias del usuario
   */
  readonly bankAccounts = signal<BankAccount[]>([]);

  /**
   * Solicitudes de retiro del usuario
   */
  readonly withdrawalRequests = signal<WithdrawalRequest[]>([]);

  /**
   * Estados de carga para operaciones asíncronas
   */
  readonly loading = signal<WithdrawalLoadingState>({
    requesting: false,
    approving: false,
    rejecting: false,
    fetchingRequests: false,
    addingBankAccount: false,
    fetchingBankAccounts: false,
  });

  /**
   * Error actual (si existe)
   */
  readonly error = signal<WalletError | null>(null);

  // ==================== COMPUTED SIGNALS ====================

  /**
   * Cuenta bancaria por defecto del usuario
   */
  readonly defaultBankAccount = computed(() => this.bankAccounts().find((acc) => acc.is_default));

  /**
   * Cuentas bancarias activas
   */
  readonly activeBankAccounts = computed(() => this.bankAccounts().filter((acc) => acc.is_active));

  /**
   * Retiros pendientes
   */
  readonly pendingWithdrawals = computed(() =>
    this.withdrawalRequests().filter((req) => req.status === 'pending'),
  );

  /**
   * Retiros completados
   */
  readonly completedWithdrawals = computed(() =>
    this.withdrawalRequests().filter((req) => req.status === 'completed'),
  );

  /**
   * Indica si hay alguna operación en progreso
   */
  readonly isLoading = computed(() => {
    const loadingState = this.loading();
    return Object.values(loadingState).some((v) => v);
  });

  // ==================== BANK ACCOUNTS METHODS ====================

  /**
   * Obtiene las cuentas bancarias del usuario
   */
  async getBankAccounts(): Promise<BankAccount[]> {
    this.setLoadingState('fetchingBankAccounts', true);
    this.clearError();

    try {
      const { data, error } = await this.supabase
        .getClient()
        .from('bank_accounts')
        .select('*')
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        throw this.createError('BANK_ACCOUNTS_FETCH_ERROR', error.message, error);
      }

      const accounts = (data ?? []) as BankAccount[];
      this.bankAccounts.set(accounts);

      return accounts;
    } catch (err) {
      const walletError = this.handleError(err, 'Error al obtener cuentas bancarias');
      throw walletError;
    } finally {
      this.setLoadingState('fetchingBankAccounts', false);
    }
  }

  /**
   * Agrega una nueva cuenta bancaria
   */
  async addBankAccount(params: AddBankAccountParams): Promise<BankAccount> {
    this.setLoadingState('addingBankAccount', true);
    this.clearError();

    try {
      // Validar formato según tipo de cuenta
      this.validateAccountNumber(params.account_type, params.account_number);

      // Validar DNI/CUIT
      if (!params.account_holder_document || params.account_holder_document.length < 7) {
        throw this.createError('INVALID_DOCUMENT', 'DNI/CUIT inválido');
      }

      // Crear cuenta bancaria
      const { data, error } = await this.supabase
        .getClient()
        .from('bank_accounts')
        .insert({
          account_type: params.account_type,
          account_number: params.account_number,
          account_holder_name: params.account_holder_name,
          account_holder_document: params.account_holder_document,
          bank_name: params.bank_name,
          is_active: true,
          // Marcar como default si es la primera cuenta
          is_default: this.bankAccounts().length === 0,
        })
        .select()
        .single();

      if (error) {
        throw this.createError('ADD_BANK_ACCOUNT_ERROR', error.message, error);
      }

      const account = data as BankAccount;

      // Actualizar lista de cuentas
      this.bankAccounts.update((accounts) => [account, ...accounts]);

      return account;
    } catch (err) {
      const walletError = this.handleError(err, 'Error al agregar cuenta bancaria');
      throw walletError;
    } finally {
      this.setLoadingState('addingBankAccount', false);
    }
  }

  /**
   * Establece una cuenta como predeterminada
   */
  async setDefaultBankAccount(accountId: string): Promise<void> {
    this.clearError();

    try {
      const { error } = await this.supabase.getClient().rpc('set_default_bank_account', {
        p_bank_account_id: accountId,
      });

      if (error) {
        throw this.createError('SET_DEFAULT_ERROR', error.message, error);
      }

      // Actualizar estado local
      this.bankAccounts.update((accounts) =>
        accounts.map((acc) => ({
          ...acc,
          is_default: acc.id === accountId,
        })),
      );
    } catch (err) {
      const walletError = this.handleError(err, 'Error al establecer cuenta predeterminada');
      throw walletError;
    }
  }

  /**
   * Elimina una cuenta bancaria
   */
  async deleteBankAccount(accountId: string): Promise<void> {
    this.clearError();

    try {
      const { error } = await this.supabase
        .getClient()
        .from('bank_accounts')
        .delete()
        .eq('id', accountId);

      if (error) {
        throw this.createError('DELETE_BANK_ACCOUNT_ERROR', error.message, error);
      }

      // Actualizar estado local
      this.bankAccounts.update((accounts) => accounts.filter((acc) => acc.id !== accountId));
    } catch (err) {
      const walletError = this.handleError(err, 'Error al eliminar cuenta bancaria');
      throw walletError;
    }
  }

  // ==================== WITHDRAWAL METHODS ====================

  /**
   * Solicita un retiro de fondos
   */
  async requestWithdrawal(
    params: RequestWithdrawalParams,
  ): Promise<WalletRequestWithdrawalResponse> {
    this.setLoadingState('requesting', true);
    this.clearError();

    try {
      // Validar parámetros
      if (params.amount <= 0) {
        throw this.createError('INVALID_AMOUNT', 'El monto debe ser mayor a 0');
      }

      if (params.amount < 100) {
        throw this.createError('AMOUNT_TOO_LOW', 'El monto mínimo de retiro es $100 ARS');
      }

      const { data, error } = await this.supabase.getClient().rpc('wallet_request_withdrawal', {
        p_bank_account_id: params.bank_account_id,
        p_amount: params.amount,
        p_user_notes: params.user_notes ?? null,
      });

      if (error) {
        throw this.createError('REQUEST_WITHDRAWAL_ERROR', error.message, error);
      }

      if (!data || data.length === 0) {
        throw this.createError('REQUEST_WITHDRAWAL_EMPTY', 'No se pudo procesar la solicitud');
      }

      const result = data[0] as WalletRequestWithdrawalResponse;

      if (!result.success) {
        throw this.createError('REQUEST_WITHDRAWAL_FAILED', result.message);
      }

      // Refrescar lista de solicitudes
      await this.getWithdrawalRequests().catch(() => {
        /* Ignorar errores de refresh */
      });

      return result;
    } catch (err) {
      const walletError = this.handleError(err, 'Error al solicitar retiro');
      throw walletError;
    } finally {
      this.setLoadingState('requesting', false);
    }
  }

  /**
   * Obtiene el historial de solicitudes de retiro
   */
  async getWithdrawalRequests(filters?: WithdrawalFilters): Promise<WithdrawalRequest[]> {
    this.setLoadingState('fetchingRequests', true);
    this.clearError();

    try {
      let query = this.supabase
        .getClient()
        .from('withdrawal_requests')
        .select('*')
        .order('created_at', { ascending: false });

      // Aplicar filtros
      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status);
        } else {
          query = query.eq('status', filters.status);
        }
      }

      if (filters?.from_date) {
        query = query.gte('created_at', filters.from_date.toISOString());
      }

      if (filters?.to_date) {
        query = query.lte('created_at', filters.to_date.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        throw this.createError('WITHDRAWAL_REQUESTS_FETCH_ERROR', error.message, error);
      }

      const requests = (data ?? []) as WithdrawalRequest[];
      this.withdrawalRequests.set(requests);

      return requests;
    } catch (err) {
      const walletError = this.handleError(err, 'Error al obtener solicitudes de retiro');
      throw walletError;
    } finally {
      this.setLoadingState('fetchingRequests', false);
    }
  }

  /**
   * Obtiene TODAS las solicitudes de retiro (Admin only)
   * Este método es semánticamente para uso administrativo.
   * Confía en que las políticas RLS del backend permitirán al admin ver todo.
   */
  async getAllWithdrawals(filters?: WithdrawalFilters): Promise<WithdrawalRequest[]> {
    return this.getWithdrawalRequests(filters);
  }

  /**
   * Cancela una solicitud de retiro pendiente
   */
  async cancelWithdrawalRequest(requestId: string): Promise<void> {
    this.clearError();

    try {
      const { error } = await this.supabase
        .getClient()
        .from('withdrawal_requests')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', requestId)
        .eq('status', 'pending'); // Solo permitir cancelar pendientes

      if (error) {
        throw this.createError('CANCEL_WITHDRAWAL_ERROR', error.message, error);
      }

      // Actualizar estado local
      this.withdrawalRequests.update((requests) =>
        requests.map((req) =>
          req.id === requestId ? { ...req, status: 'cancelled' as const } : req,
        ),
      );
    } catch (err) {
      const walletError = this.handleError(err, 'Error al cancelar solicitud de retiro');
      throw walletError;
    }
  }

  // ==================== ADMIN METHODS ====================

  /**
   * Aprueba una solicitud de retiro (admin only)
   */
  async approveWithdrawal(
    params: ApproveWithdrawalParams,
  ): Promise<WalletApproveWithdrawalResponse> {
    this.setLoadingState('approving', true);
    this.clearError();

    try {
      const { data, error } = await this.supabase.getClient().rpc('wallet_approve_withdrawal', {
        p_request_id: params.request_id,
        p_admin_notes: params.admin_notes ?? null,
      });

      if (error) {
        throw this.createError('APPROVE_WITHDRAWAL_ERROR', error.message, error);
      }

      if (!data || data.length === 0) {
        throw this.createError('APPROVE_WITHDRAWAL_EMPTY', 'No se pudo procesar la aprobación');
      }

      const result = data[0] as WalletApproveWithdrawalResponse;

      if (!result.success) {
        throw this.createError('APPROVE_WITHDRAWAL_FAILED', result.message);
      }

      // Refrescar lista de solicitudes
      await this.getWithdrawalRequests().catch(() => {
        /* Ignorar errores de refresh */
      });

      return result;
    } catch (err) {
      const walletError = this.handleError(err, 'Error al aprobar retiro');
      throw walletError;
    } finally {
      this.setLoadingState('approving', false);
    }
  }

  /**
   * Rechaza una solicitud de retiro (admin only)
   */
  async rejectWithdrawal(params: RejectWithdrawalParams): Promise<void> {
    this.setLoadingState('rejecting', true);
    this.clearError();

    try {
      const { error } = await this.supabase
        .getClient()
        .from('withdrawal_requests')
        .update({
          status: 'rejected',
          rejection_reason: params.rejection_reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.request_id)
        .eq('status', 'pending');

      if (error) {
        throw this.createError('REJECT_WITHDRAWAL_ERROR', error.message, error);
      }

      // Actualizar estado local
      this.withdrawalRequests.update((requests) =>
        requests.map((req) =>
          req.id === params.request_id
            ? {
                ...req,
                status: 'rejected' as const,
                rejection_reason: params.rejection_reason,
              }
            : req,
        ),
      );
    } catch (err) {
      const walletError = this.handleError(err, 'Error al rechazar retiro');
      throw walletError;
    } finally {
      this.setLoadingState('rejecting', false);
    }
  }

  /**
   * Refresca tanto las cuentas como las solicitudes
   */
  async refresh(): Promise<void> {
    await Promise.all([
      this.getBankAccounts().catch(() => {
        /* Ignorar errores de refresh */
      }),
      this.getWithdrawalRequests().catch(() => {
        /* Ignorar errores de refresh */
      }),
    ]);
  }

  /**
   * Limpia el estado del servicio
   */
  clear(): void {
    this.bankAccounts.set([]);
    this.withdrawalRequests.set([]);
    this.clearError();
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Valida el formato de número de cuenta según el tipo
   */
  private validateAccountNumber(type: BankAccountType, number: string): void {
    switch (type) {
      case 'cbu':
        if (!/^\d{22}$/.test(number)) {
          throw this.createError('INVALID_CBU', 'El CBU debe tener 22 dígitos');
        }
        break;
      case 'cvu':
        if (!/^\d{22}$/.test(number)) {
          throw this.createError('INVALID_CVU', 'El CVU debe tener 22 dígitos');
        }
        break;
      case 'alias':
        if (!/^[a-zA-Z0-9.]+$/.test(number) || number.length < 6 || number.length > 20) {
          throw this.createError(
            'INVALID_ALIAS',
            'El alias debe tener entre 6 y 20 caracteres alfanuméricos',
          );
        }
        break;
    }
  }

  /**
   * Actualiza un estado de carga específico
   */
  private setLoadingState(key: keyof WithdrawalLoadingState, value: boolean): void {
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
      return this.createError('UNKNOWN_ERROR', err.message || defaultMessage, err);
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
