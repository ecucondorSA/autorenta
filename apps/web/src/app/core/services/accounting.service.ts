/**
 * Servicio de Contabilidad Automatizada
 * Integración con sistema contable basado en NIIF 15 y NIIF 37
 *
 * @version 2.0 - Migrado a Angular 17 con Signals
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { from, Observable, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { SupabaseClientService } from './supabase-client.service';
import { LoggerService } from './logger.service';

export interface AccountingAccount {
  id: string;
  code: string;
  name: string;
  account_type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
  sub_type: string;
  balance?: number;
}

export interface JournalEntry {
  id: string;
  entry_number: string;
  entry_date: string;
  transaction_type: string;
  reference_id?: string;
  reference_table?: string;
  description: string;
  total_debit: number;
  total_credit: number;
  is_balanced: boolean;
  status: 'DRAFT' | 'POSTED' | 'VOIDED';
}

export interface LedgerEntry {
  id: string;
  entry_date: string;
  account_code: string;
  debit_amount: number;
  credit_amount: number;
  balance: number;
  description: string;
  transaction_type: string;
  reference_id?: string;
  accounting_accounts?: {
    code: string;
    name: string;
    account_type: string;
  };
}

export interface Provision {
  id: string;
  provision_type: 'FGO_RESERVE' | 'SECURITY_DEPOSIT' | 'CLAIMS_RESERVE';
  reference_id?: string;
  provision_amount: number;
  utilized_amount: number;
  released_amount: number;
  current_balance: number;
  status: 'ACTIVE' | 'UTILIZED' | 'RELEASED' | 'EXPIRED';
  provision_date: string;
}

export interface AccountingDashboard {
  total_assets: number;
  total_liabilities: number;
  total_equity: number;
  monthly_income: number;
  monthly_expenses: number;
  monthly_profit: number;
  wallet_liability: number;
  fgo_provision: number;
  active_security_deposits: number;
}

export interface BalanceSheet {
  code: string;
  name: string;
  account_type: string;
  sub_type: string;
  balance: number;
}

export interface IncomeStatement {
  code: string;
  name: string;
  account_type: 'INCOME' | 'EXPENSE';
  amount: number;
  period: string;
}

export interface WalletReconciliation {
  source: string;
  amount: number;
}

export interface FinancialHealth {
  walletReconciled: boolean;
  fgoAdequate: boolean;
  profitability: 'GOOD' | 'WARNING' | 'CRITICAL';
  alerts: string[];
}

export interface CommissionReport {
  period: string;
  total_bookings: number;
  total_commissions: number;
  avg_commission: number;
}

export interface PeriodClosure {
  id: string;
  period: string;
  closure_type: 'DAILY' | 'MONTHLY';
  total_income: number;
  total_expenses: number;
  net_profit: number;
  closed_at: string;
  closed_by: string;
}

export interface AuditLogEntry {
  id: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  created_at: string;
}

@Injectable({
  providedIn: 'root',
})
export class AccountingService {
  private readonly supabase: SupabaseClient = inject(SupabaseClientService).getClient();
  private readonly logger = inject(LoggerService);

  // Signals
  readonly dashboard = signal<AccountingDashboard | null>(null);
  readonly balanceSheet = signal<BalanceSheet[]>([]);
  readonly incomeStatement = signal<IncomeStatement[]>([]);
  readonly provisions = signal<Provision[]>([]);
  readonly journalEntries = signal<JournalEntry[]>([]);
  readonly ledgerEntries = signal<LedgerEntry[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  // Computed values
  readonly totalAssets = computed(() =>
    this.balanceSheet()
      .filter((a) => a.account_type === 'ASSET')
      .reduce((sum, a) => sum + a.balance, 0)
  );

  readonly totalLiabilities = computed(() =>
    this.balanceSheet()
      .filter((a) => a.account_type === 'LIABILITY')
      .reduce((sum, a) => sum + a.balance, 0)
  );

  readonly totalEquity = computed(() =>
    this.balanceSheet()
      .filter((a) => a.account_type === 'EQUITY')
      .reduce((sum, a) => sum + a.balance, 0)
  );

  readonly totalIncome = computed(() =>
    this.incomeStatement()
      .filter((i) => i.account_type === 'INCOME')
      .reduce((sum, i) => sum + i.amount, 0)
  );

  readonly totalExpenses = computed(() =>
    this.incomeStatement()
      .filter((i) => i.account_type === 'EXPENSE')
      .reduce((sum, i) => sum + i.amount, 0)
  );

  readonly netProfit = computed(() => this.totalIncome() - this.totalExpenses());

  readonly activeProvisions = computed(() =>
    this.provisions().filter((p) => p.status === 'ACTIVE')
  );

  private handleError(error: unknown, context: string): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.logger.error(
      `AccountingService: ${context}`,
      'AccountingService',
      error instanceof Error ? error : new Error(errorMessage)
    );
    this.error.set(errorMessage);
  }

  /**
   * Obtener dashboard ejecutivo con KPIs financieros
   */
  getDashboard(): Observable<AccountingDashboard | null> {
    this.loading.set(true);
    this.error.set(null);

    return from(this.supabase.from('accounting_dashboard').select('*').single()).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        this.dashboard.set(data);
        return data;
      }),
      catchError((error) => {
        this.handleError(error, 'Error al obtener dashboard');
        return throwError(() => error);
      }),
      tap(() => this.loading.set(false))
    );
  }

  /**
   * Obtener Balance General (Estado de Situación Financiera)
   */
  getBalanceSheet(): Observable<BalanceSheet[]> {
    this.loading.set(true);
    this.error.set(null);

    return from(
      this.supabase.from('accounting_balance_sheet').select('*').order('code')
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        const balances = (data || []) as BalanceSheet[];
        this.balanceSheet.set(balances);
        return balances;
      }),
      catchError((error) => {
        this.handleError(error, 'Error al obtener Balance General');
        return throwError(() => error);
      }),
      tap(() => this.loading.set(false))
    );
  }

  /**
   * Obtener Estado de Resultados (P&L)
   * @param period - Período en formato YYYY-MM (ej: '2025-10')
   */
  getIncomeStatement(period?: string): Observable<IncomeStatement[]> {
    this.loading.set(true);
    this.error.set(null);

    let query = this.supabase
      .from('accounting_income_statement')
      .select('*')
      .order('period', { ascending: false })
      .order('code');

    if (period) {
      query = query.eq('period', period);
    }

    return from(query).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        const statements = (data || []) as IncomeStatement[];
        this.incomeStatement.set(statements);
        return statements;
      }),
      catchError((error) => {
        this.handleError(error, 'Error al obtener Estado de Resultados');
        return throwError(() => error);
      }),
      tap(() => this.loading.set(false))
    );
  }

  /**
   * Obtener provisiones activas (FGO, depósitos de garantía)
   */
  getActiveProvisions(): Observable<Provision[]> {
    this.loading.set(true);
    this.error.set(null);

    return from(
      this.supabase
        .from('accounting_provisions_report')
        .select('*')
        .eq('status', 'ACTIVE')
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        const provisions = (data || []) as Provision[];
        this.provisions.set(provisions);
        return provisions;
      }),
      catchError((error) => {
        this.handleError(error, 'Error al obtener provisiones');
        return throwError(() => error);
      }),
      tap(() => this.loading.set(false))
    );
  }

  /**
   * Obtener todas las provisiones (con filtros opcionales)
   */
  getAllProvisions(status?: string): Observable<Provision[]> {
    this.loading.set(true);
    this.error.set(null);

    let query = this.supabase.from('accounting_provisions_report').select('*');

    if (status) {
      query = query.eq('status', status);
    }

    return from(query).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        const provisions = (data || []) as Provision[];
        this.provisions.set(provisions);
        return provisions;
      }),
      catchError((error) => {
        this.handleError(error, 'Error al obtener provisiones');
        return throwError(() => error);
      }),
      tap(() => this.loading.set(false))
    );
  }

  /**
   * Obtener conciliación wallet vs contabilidad
   */
  getWalletReconciliation(): Observable<WalletReconciliation[]> {
    this.loading.set(true);
    this.error.set(null);

    return from(this.supabase.from('accounting_wallet_reconciliation').select('*')).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data || []) as WalletReconciliation[];
      }),
      catchError((error) => {
        this.handleError(error, 'Error al obtener conciliación wallet');
        return throwError(() => error);
      }),
      tap(() => this.loading.set(false))
    );
  }

  /**
   * Obtener reporte de comisiones por período
   */
  getCommissionsReport(limit: number = 12): Observable<CommissionReport[]> {
    this.loading.set(true);
    this.error.set(null);

    return from(
      this.supabase
        .from('accounting_commissions_report')
        .select('*')
        .order('period', { ascending: false })
        .limit(limit)
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data || []) as CommissionReport[];
      }),
      catchError((error) => {
        this.handleError(error, 'Error al obtener reporte de comisiones');
        return throwError(() => error);
      }),
      tap(() => this.loading.set(false))
    );
  }

  /**
   * Obtener plan de cuentas
   */
  getChartOfAccounts(): Observable<AccountingAccount[]> {
    this.loading.set(true);
    this.error.set(null);

    return from(
      this.supabase
        .from('accounting_accounts')
        .select('*')
        .eq('is_active', true)
        .order('code')
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data || []) as AccountingAccount[];
      }),
      catchError((error) => {
        this.handleError(error, 'Error al obtener plan de cuentas');
        return throwError(() => error);
      }),
      tap(() => this.loading.set(false))
    );
  }

  /**
   * Obtener asientos del libro diario (journal entries)
   */
  getJournalEntries(filters?: {
    startDate?: string;
    endDate?: string;
    transactionType?: string;
    status?: 'DRAFT' | 'POSTED' | 'VOIDED';
    limit?: number;
  }): Observable<JournalEntry[]> {
    this.loading.set(true);
    this.error.set(null);

    let query = this.supabase
      .from('accounting_journal_entries')
      .select('*')
      .order('entry_date', { ascending: false });

    if (filters?.startDate) {
      query = query.gte('entry_date', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('entry_date', filters.endDate);
    }

    if (filters?.transactionType) {
      query = query.eq('transaction_type', filters.transactionType);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    return from(query).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        const entries = (data || []) as JournalEntry[];
        this.journalEntries.set(entries);
        return entries;
      }),
      catchError((error) => {
        this.handleError(error, 'Error al obtener asientos del diario');
        return throwError(() => error);
      }),
      tap(() => this.loading.set(false))
    );
  }

  /**
   * Obtener libro mayor (ledger) con filtros opcionales
   */
  getLedger(filters?: {
    startDate?: string;
    endDate?: string;
    accountCode?: string;
    transactionType?: string;
    limit?: number;
  }): Observable<LedgerEntry[]> {
    this.loading.set(true);
    this.error.set(null);

    let query = this.supabase
      .from('accounting_ledger')
      .select(
        `
        *,
        accounting_accounts (
          code,
          name,
          account_type
        )
      `
      )
      .order('entry_date', { ascending: false });

    if (filters?.startDate) {
      query = query.gte('entry_date', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('entry_date', filters.endDate);
    }

    if (filters?.accountCode) {
      query = query.eq('account_code', filters.accountCode);
    }

    if (filters?.transactionType) {
      query = query.eq('transaction_type', filters.transactionType);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    return from(query).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        const entries = (data || []) as LedgerEntry[];
        this.ledgerEntries.set(entries);
        return entries;
      }),
      catchError((error) => {
        this.handleError(error, 'Error al obtener libro mayor');
        return throwError(() => error);
      }),
      tap(() => this.loading.set(false))
    );
  }

  /**
   * Obtener cierres de período
   */
  getPeriodClosures(limit: number = 12): Observable<PeriodClosure[]> {
    this.loading.set(true);
    this.error.set(null);

    return from(
      this.supabase
        .from('accounting_period_closures')
        .select('*')
        .order('period', { ascending: false })
        .limit(limit)
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data || []) as PeriodClosure[];
      }),
      catchError((error) => {
        this.handleError(error, 'Error al obtener cierres de período');
        return throwError(() => error);
      }),
      tap(() => this.loading.set(false))
    );
  }

  /**
   * Obtener log de auditoría
   */
  getAuditLog(filters?: {
    startDate?: string;
    endDate?: string;
    userId?: string;
    tableName?: string;
    limit?: number;
  }): Observable<AuditLogEntry[]> {
    this.loading.set(true);
    this.error.set(null);

    let query = this.supabase
      .from('accounting_audit_log')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }

    if (filters?.tableName) {
      query = query.eq('table_name', filters.tableName);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    return from(query).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data || []) as AuditLogEntry[];
      }),
      catchError((error) => {
        this.handleError(error, 'Error al obtener log de auditoría');
        return throwError(() => error);
      }),
      tap(() => this.loading.set(false))
    );
  }

  /**
   * Refrescar balances (materializar vista)
   */
  refreshBalances(): Observable<void> {
    this.loading.set(true);
    this.error.set(null);

    return from(this.supabase.rpc('refresh_accounting_balances')).pipe(
      map(({ error }) => {
        if (error) throw error;
      }),
      catchError((error) => {
        this.handleError(error, 'Error al refrescar balances');
        return throwError(() => error);
      }),
      tap(() => this.loading.set(false))
    );
  }

  /**
   * Ejecutar cierre de período mensual
   */
  executeMonthlyClosing(period: string): Observable<void> {
    this.loading.set(true);
    this.error.set(null);

    return from(
      this.supabase.rpc('accounting_monthly_closure', { p_period: period })
    ).pipe(
      map(({ error }) => {
        if (error) throw error;
      }),
      catchError((error) => {
        this.handleError(error, 'Error al ejecutar cierre mensual');
        return throwError(() => error);
      }),
      tap(() => this.loading.set(false))
    );
  }

  /**
   * Crear asiento contable manual (para ajustes)
   */
  createManualJournalEntry(
    transactionType: string,
    description: string,
    entries: Array<{
      account_code: string;
      debit?: number;
      credit?: number;
      description?: string;
    }>
  ): Observable<string> {
    this.loading.set(true);
    this.error.set(null);

    return from(
      this.supabase.rpc('create_journal_entry', {
        p_transaction_type: transactionType,
        p_reference_id: null,
        p_reference_table: 'manual_entry',
        p_description: description,
        p_entries: entries,
      })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data as string;
      }),
      catchError((error) => {
        this.handleError(error, 'Error al crear asiento manual');
        return throwError(() => error);
      }),
      tap(() => this.loading.set(false))
    );
  }

  /**
   * Verificar salud financiera
   */
  checkFinancialHealth(): Observable<FinancialHealth> {
    return this.getDashboard().pipe(
      switchMap((dashboard) => {
        if (!dashboard) {
          return throwError(() => new Error('No se pudo obtener dashboard'));
        }

        return this.getWalletReconciliation().pipe(
          map((reconciliation) => {
            const alerts: string[] = [];

            // Verificar conciliación wallet
            const walletDiff = reconciliation.find((r) => r.source.includes('Diferencia'));
            const walletReconciled = walletDiff ? Math.abs(walletDiff.amount) < 0.01 : false;

            if (!walletReconciled) {
              alerts.push(
                `Diferencia en conciliación wallet: $${walletDiff?.amount.toFixed(2)}`
              );
            }

            // Verificar FGO adecuado (debe ser al menos 5% del total de pasivos activos)
            const minFGO = dashboard.active_security_deposits * 0.05;
            const fgoAdequate = dashboard.fgo_provision >= minFGO;

            if (!fgoAdequate) {
              alerts.push(
                `FGO insuficiente: $${dashboard.fgo_provision.toFixed(2)} (mínimo recomendado: $${minFGO.toFixed(2)})`
              );
            }

            // Evaluar rentabilidad
            let profitability: 'GOOD' | 'WARNING' | 'CRITICAL' = 'GOOD';

            if (dashboard.monthly_profit < 0) {
              profitability = 'CRITICAL';
              alerts.push('Pérdidas en el mes actual');
            } else if (dashboard.monthly_profit < dashboard.monthly_income * 0.05) {
              profitability = 'WARNING';
              alerts.push('Margen de utilidad bajo (<5%)');
            }

            return {
              walletReconciled,
              fgoAdequate,
              profitability,
              alerts,
            };
          })
        );
      }),
      catchError((error) => {
        this.handleError(error, 'Error al verificar salud financiera');
        return throwError(() => error);
      })
    );
  }
}
