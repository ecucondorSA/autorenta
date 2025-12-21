import { Injectable, signal, computed } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';

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
  balance_change_cents: number;
  ref: string;
  meta: Record<string, unknown>;
  booking_id?: string | null;
  transaction_id?: string | null;
  created_at: string;
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

@Injectable({
  providedIn: 'root',
})
export class WalletLedgerService {
  private readonly supabase: SupabaseClient = injectSupabase();

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  private readonly ledgerHistoryCache = signal<LedgerEntry[]>([]);
  readonly ledgerHistory = computed(() => this.ledgerHistoryCache());

  private readonly transfersCache = signal<WalletTransfer[]>([]);
  readonly transfers = computed(() => this.transfersCache());

  async loadLedgerHistory(limit = 50): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data, error } = await this.supabase
        .from('v_user_ledger_history')
        .select('*')
        .eq('user_id', user.id)
        .order('ts', { ascending: false })
        .limit(limit);

      if (error) throw error;
      this.ledgerHistoryCache.set(data as LedgerEntry[]);
    } catch (err) {
      this.handleError(err, 'Error al cargar historial');
    } finally {
      this.loading.set(false);
    }
  }

  async loadTransfers(limit = 20): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data, error } = await this.supabase
        .from('v_wallet_transfers_summary')
        .select('*')
        .or(`from_user.eq.${user.id},to_user.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      this.transfersCache.set(data as WalletTransfer[]);
    } catch (err) {
      this.handleError(err, 'Error al cargar transferencias');
    } finally {
      this.loading.set(false);
    }
  }

  async transferFunds(request: TransferRequest): Promise<TransferResponse> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const idempotencyKey = `transfer-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const { data, error } = await this.supabase.functions.invoke('wallet-transfer', {
        body: request,
        headers: { 'Idempotency-Key': idempotencyKey },
      });

      if (error) throw error;
      if (!data.ok) throw new Error(data.error);

      await this.loadLedgerHistory();
      await this.loadTransfers();

      return { ok: true, transfer: data.transfer };
    } catch (err) {
      this.handleError(err, 'Error al transferir fondos');
      return { ok: false, error: err instanceof Error ? err.message : 'Error desconocido' };
    } finally {
      this.loading.set(false);
    }
  }

  async searchUserByWalletNumber(query: string): Promise<Record<string, unknown> | null> {
    const cleanQuery = query.trim().toUpperCase();
    if (!cleanQuery.startsWith('AR') || cleanQuery.length !== 16) return null;

    const { data, error } = await this.supabase.rpc('search_users_by_wallet_number', {
      p_query: cleanQuery,
    });

    if (error) return null;
    return (data?.[0] as Record<string, unknown>) || null;
  }

  formatAmount(cents: number, currency = 'USD'): string {
    const locale = currency === 'ARS' ? 'es-AR' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  }

  private handleError(err: unknown, defaultMessage: string): void {
    const errorMessage = err instanceof Error ? err.message : defaultMessage;
    this.error.set(errorMessage);
  }

  getKindLabel(kind: LedgerKind): string {
    const labels: Record<LedgerKind, string> = {
      deposit: 'Depósito',
      transfer_out: 'Transferencia enviada',
      transfer_in: 'Transferencia recibida',
      rental_charge: 'Cargo de alquiler',
      rental_payment: 'Pago de alquiler',
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

  getKindIcon(kind: LedgerKind): string {
    const icons: Record<LedgerKind, string> = {
      deposit: 'M12 4v16m8-8H4',
      transfer_out: 'M15 12H9m6 0l-3-3m3 3l-3 3',
      transfer_in: 'M9 12h6m-6 0l3-3m-3 3l3 3',
      rental_charge:
        'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
      rental_payment: 'M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6',
      refund: 'M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6',
      franchise_user:
        'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
      franchise_fund:
        'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
      withdrawal: 'M9 11l3-3m0 0l3 3m-3-3v8m0-13a9 9 0 110 18 9 9 0 010-18z',
      adjustment: 'M10 20l4-16m4 4l-4 4-4-4 4-4',
      bonus:
        'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      fee: 'M9 14l6-6m-6 0l6 6',
    };
    return icons[kind] || 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
  }

  getKindColor(kind: LedgerKind): string {
    const colors: Record<LedgerKind, string> = {
      deposit: 'bg-success-bg-hover text-success-strong',
      transfer_out: 'bg-error-bg-hover text-error-strong',
      transfer_in: 'bg-success-bg-hover text-success-strong',
      rental_charge: 'bg-error-bg-hover text-error-strong',
      rental_payment: 'bg-success-bg-hover text-success-strong',
      refund: 'bg-cta-default/20 text-cta-default',
      franchise_user: 'bg-warning-bg-hover text-warning-strong',
      franchise_fund: 'bg-warning-bg-hover text-warning-strong',
      withdrawal: 'bg-cta-default/20 text-cta-default',
      adjustment: 'bg-surface-raised text-text-primary',
      bonus: 'bg-success-bg-hover text-success-strong',
      fee: 'bg-surface-raised text-text-primary',
    };
    return colors[kind] || 'bg-surface-raised text-text-primary';
  }
}
