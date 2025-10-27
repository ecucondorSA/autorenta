import { Injectable, inject, signal, computed } from '@angular/core';
import { injectSupabase } from './supabase-client.service';

// ============================================================================
// INTERFACES - Wallet Ledger System
// ============================================================================

export type LedgerKind =
  | 'deposit'
  | 'transfer_out'
  | 'transfer_in'
  | 'rental_charge'
  | 'rental_payment'
  | 'refund'
  | 'franchise_user'
  | 'franchise_fund'
  | 'withdrawal'
  | 'adjustment'
  | 'bonus'
  | 'fee';

export interface LedgerEntry {
  id: string;
  ts: string;
  user_id: string;
  kind: LedgerKind;
  amount_cents: number;
  balance_change_cents: number; // Positivo o negativo
  ref: string;
  meta: Record<string, unknown>;
  booking_id?: string | null;
  transaction_id?: string | null;
  created_at: string;
  // Join fields
  car_id?: string;
  booking_status?: string;
}

export interface WalletTransfer {
  id: string;
  from_user: string;
  to_user: string;
  from_user_name?: string;
  to_user_name?: string;
  amount_cents: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  ref: string;
  meta: Record<string, unknown>;
  created_at: string;
  completed_at?: string | null;
}

export interface TransferRequest {
  to_user_id: string;
  amount_cents: number;
  description?: string;
  meta?: Record<string, unknown>;
}

export interface TransferResponse {
  ok: boolean;
  transfer?: {
    transfer_id: string;
    ref: string;
    status: string;
    from_user: string;
    to_user: string;
    amount_cents: number;
  };
  error?: string;
}

// ============================================================================
// SERVICIO - Wallet Ledger
// ============================================================================

@Injectable({
  providedIn: 'root',
})
export class WalletLedgerService {
  private readonly supabase = injectSupabase();

  // Estado reactivo
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  // Cache de historial
  private readonly ledgerHistoryCache = signal<LedgerEntry[]>([]);
  readonly ledgerHistory = computed(() => this.ledgerHistoryCache());

  // Cache de transferencias
  private readonly transfersCache = signal<WalletTransfer[]>([]);
  readonly transfers = computed(() => this.transfersCache());

  /**
   * Obtener historial de ledger del usuario actual
   */
  async loadLedgerHistory(limit = 50): Promise<LedgerEntry[]> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const { data, error } = await this.supabase
        .from('v_user_ledger_history')
        .select('*')
        .eq('user_id', user.id)
        .order('ts', { ascending: false })
        .limit(limit);

      if (error) throw error;

      this.ledgerHistoryCache.set(data as LedgerEntry[]);
      return data as LedgerEntry[];
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al cargar historial';
      this.error.set(errorMsg);
      throw err;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Obtener transferencias del usuario (enviadas y recibidas)
   */
  async loadTransfers(limit = 20): Promise<WalletTransfer[]> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const { data, error } = await this.supabase
        .from('v_wallet_transfers_summary')
        .select('*')
        .or(`from_user.eq.${user.id},to_user.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      this.transfersCache.set(data as WalletTransfer[]);
      return data as WalletTransfer[];
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al cargar transferencias';
      this.error.set(errorMsg);
      throw err;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Realizar transferencia P2P
   */
  async transferFunds(request: TransferRequest): Promise<TransferResponse> {
    this.loading.set(true);
    this.error.set(null);

    try {
      console.log('[WalletLedgerService] Iniciando transferencia:', {
        to_user_id: request.to_user_id,
        amount_cents: request.amount_cents,
        description: request.description,
      });

      // Generar idempotency key único
      const idempotencyKey = `transfer-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      console.log('[WalletLedgerService] Invocando edge function wallet-transfer...');

      const { data, error } = await this.supabase.functions.invoke('wallet-transfer', {
        body: {
          to_user_id: request.to_user_id,
          amount_cents: request.amount_cents,
          description: request.description,
          meta: request.meta,
        },
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
      });

      console.log('[WalletLedgerService] Respuesta de edge function:', { data, error });

      if (error) {
        console.error('[WalletLedgerService] Error en edge function:', error);

        // Intentar obtener el body del error para más detalles
        let errorMessage = error.message || 'Error al procesar transferencia';

        // Si el error tiene contexto adicional, mostrarlo
        if (error.context) {
          console.error('[WalletLedgerService] Error context:', error.context);

          // Si context es una Response, parsear el body
          if (error.context instanceof Response) {
            try {
              const errorBody = await error.context.json();
              console.error('[WalletLedgerService] Error body from server:', errorBody);

              if (errorBody.error) {
                errorMessage = errorBody.error;
                if (errorBody.message) {
                  errorMessage = errorBody.message;
                }
              }
            } catch (parseError) {
              console.error('[WalletLedgerService] Could not parse error body:', parseError);
            }
          }
          // Si context es un objeto con mensaje de error del servidor
          else if (typeof error.context === 'object' && error.context.error) {
            errorMessage = error.context.error;
            if (error.context.message) {
              errorMessage += ': ' + error.context.message;
            }
          }
        }

        throw new Error(errorMessage);
      }

      if (!data) {
        console.error('[WalletLedgerService] Edge function no retornó datos');
        throw new Error('La transferencia no retornó datos');
      }

      // Verificar si la transferencia fue exitosa
      if (!data.ok && data.error) {
        console.error('[WalletLedgerService] Transferencia rechazada:', data.error);
        throw new Error(data.error);
      }

      console.log('[WalletLedgerService] Transferencia exitosa, recargando datos...');

      // Recargar historial y transferencias
      await Promise.all([this.loadLedgerHistory(), this.loadTransfers()]);

      console.log('[WalletLedgerService] Transferencia completada');

      return {
        ok: true,
        transfer: data.transfer,
      };
    } catch (err) {
      console.error('[WalletLedgerService] Error capturado:', err);
      const errorMsg = err instanceof Error ? err.message : 'Error al transferir fondos';
      this.error.set(errorMsg);
      return {
        ok: false,
        error: errorMsg,
      };
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Formatear monto en centavos a string con moneda
   */
  formatAmount(cents: number, currency = 'ARS'): string {
    const amount = cents / 100;
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  /**
   * Obtener icono según tipo de movimiento
   */
  getKindIcon(kind: LedgerKind): string {
    const icons: Record<LedgerKind, string> = {
      deposit: '💰',
      transfer_out: '📤',
      transfer_in: '📥',
      rental_charge: '🚗',
      rental_payment: '💵',
      refund: '↩️',
      franchise_user: '🛡️',
      franchise_fund: '🏦',
      withdrawal: '🏧',
      adjustment: '⚙️',
      bonus: '🎁',
      fee: '💳',
    };
    return icons[kind] || '📄';
  }

  /**
   * Obtener etiqueta legible según tipo de movimiento
   */
  getKindLabel(kind: LedgerKind): string {
    const labels: Record<LedgerKind, string> = {
      deposit: 'Depósito',
      transfer_out: 'Transferencia enviada',
      transfer_in: 'Transferencia recibida',
      rental_charge: 'Cargo por alquiler',
      rental_payment: 'Pago recibido',
      refund: 'Reembolso',
      franchise_user: 'Franquicia (usuario)',
      franchise_fund: 'Franquicia (fondo)',
      withdrawal: 'Retiro',
      adjustment: 'Ajuste',
      bonus: 'Bonificación',
      fee: 'Comisión',
    };
    return labels[kind] || kind;
  }

  /**
   * Obtener color según tipo de movimiento
   */
  getKindColor(kind: LedgerKind): string {
    // Movimientos positivos (entran fondos)
    if (['deposit', 'transfer_in', 'refund', 'rental_payment', 'bonus'].includes(kind)) {
      return 'text-green-600 dark:text-green-400';
    }
    // Movimientos negativos (salen fondos)
    return 'text-red-600 dark:text-red-400';
  }

  /**
   * Suscribirse a cambios en tiempo real del ledger
   */
  subscribeToLedgerChanges(userId: string, callback: () => void) {
    const channel = this.supabase
      .channel(`ledger-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'wallet_ledger',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          console.log('[WalletLedgerService] New ledger entry detected');
          callback();
        },
      )
      .subscribe();

    return () => {
      void this.supabase.removeChannel(channel);
    };
  }

  /**
   * Buscar usuario por número de cuenta wallet (WAN)
   * Formato: ARXXXXXXXXXXXXXX (16 caracteres)
   */
  async searchUserByWalletNumber(
    query: string,
  ): Promise<{
    id: string;
    full_name: string;
    email?: string;
    wallet_account_number: string;
  } | null> {
    // Limpiar y formatear query
    const cleanQuery = query.trim().toUpperCase();

    // Validar formato básico (AR + 14 dígitos)
    if (!cleanQuery.startsWith('AR') || cleanQuery.length !== 16) {
      return null;
    }

    const { data, error } = await this.supabase.rpc('search_users_by_wallet_number', {
      p_query: cleanQuery,
    });

    if (error) {
      console.error('Error searching user by wallet number:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    return data[0] as {
      id: string;
      full_name: string;
      email?: string;
      wallet_account_number: string;
    };
  }

  /**
   * Buscar usuario por email/nombre para transferencia (DEPRECATED - usar searchUserByWalletNumber)
   */
  async searchUsers(
    query: string,
  ): Promise<Array<{ id: string; full_name: string; email?: string }>> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('id, full_name')
      .or(`full_name.ilike.%${query}%`)
      .limit(10);

    if (error) {
      console.error('Error searching users:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Obtener resumen de movimientos por tipo
   */
  async getLedgerSummary(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<Record<LedgerKind, { count: number; total_cents: number }>> {
    let query = this.supabase
      .from('wallet_ledger')
      .select('kind, amount_cents')
      .eq('user_id', userId);

    if (startDate) {
      query = query.gte('ts', startDate.toISOString());
    }

    if (endDate) {
      query = query.lte('ts', endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error getting ledger summary:', error);
      return {} as Record<LedgerKind, { count: number; total_cents: number }>;
    }

    // Agrupar por kind
    const summary: Record<string, { count: number; total_cents: number }> = {};

    data?.forEach((entry: { kind: LedgerKind; amount_cents: number }) => {
      if (!summary[entry.kind]) {
        summary[entry.kind] = { count: 0, total_cents: 0 };
      }
      summary[entry.kind].count++;
      summary[entry.kind].total_cents += entry.amount_cents;
    });

    return summary as Record<LedgerKind, { count: number; total_cents: number }>;
  }
}
