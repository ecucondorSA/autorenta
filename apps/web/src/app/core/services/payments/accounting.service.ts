/**
 * Servicio de Contabilidad Automatizada
 * Integración con sistema contable basado en NIIF 15 y NIIF 37
 */

import { Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';

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

export interface LedgerEntry {
  id: string;
  entry_date: string;
  account_code: string;
  debit: number;
  credit: number;
  description: string;
  reference_type?: string;
  reference_id?: string;
  user_id?: string;
  batch_id?: string;
  fiscal_period?: string;
  is_closing_entry: boolean;
  is_reversed: boolean;
  created_by?: string;
  created_at: string;
  accounting_chart_of_accounts?: {
    code: string;
    name: string;
    account_type: string;
  };
}

export interface CashFlowEntry {
  id: string;
  date?: string;
  created_at?: string;
  type?: string;
  transaction_type?: string;
  description?: string;
  inflow?: number;
  debit?: number;
  outflow?: number;
  credit?: number;
  balance?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ProvisionDetail {
  id: string;
  provision_type: string;
  amount: number;
  currency: string;
  probability?: string;
  measurement_basis?: string;
  booking_id?: string;
  user_id?: string;
  status: string;
  created_date: string;
  review_date?: string;
  utilization_date?: string;
  notes?: string;
}

export interface PeriodClosure {
  id: string;
  period_type: string;
  period_code: string;
  start_date: string;
  end_date: string;
  status: string;
  total_debits: number;
  total_credits: number;
  balance_check: boolean;
  closing_entries_batch_id?: string;
  closed_by?: string;
  closed_at?: string;
  notes?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  audit_type: string;
  severity: string;
  description: string;
  affected_period?: string;
  affected_account?: string;
  expected_value?: number;
  actual_value?: number;
  variance?: number;
  resolution_status: string;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
}

export interface RevenueRecognition {
  id: string;
  booking_id: string;
  revenue_type: string;
  gross_amount: number;
  commission_amount: number;
  owner_amount: number;
  recognition_date: string;
  performance_obligation_met: boolean;
  is_recognized: boolean;
  ledger_batch_id?: string;
  created_at: string;
}

@Injectable({
  providedIn: 'root',
})
export class AccountingService {
  private readonly supabase: SupabaseClient;

  constructor() {
    this.supabase = injectSupabase();
  }

  /**
   * Obtener dashboard ejecutivo con KPIs financieros
   */
  async getDashboard(): Promise<AccountingDashboard | null> {
    const { data, error } = await this.supabase.from('accounting_dashboard').select('*').single();

    if (error) {
      console.warn('[AccountingService] Error getting dashboard:', error.message);
      return null;
    }

    return data;
  }

  /**
   * Obtener Balance General (Estado de Situación Financiera)
   */
  async getBalanceSheet(): Promise<BalanceSheet[]> {
    const { data, error } = await this.supabase
      .from('accounting_balance_sheet')
      .select('*')
      .order('code');

    if (error) {
      console.warn('[AccountingService] Error getting balance sheet:', error.message);
      return [];
    }

    return data || [];
  }

  /**
   * Obtener Estado de Resultados (P&L)
   * @param period - Período en formato YYYY-MM (ej: '2025-10')
   */
  async getIncomeStatement(period?: string): Promise<IncomeStatement[]> {
    let query = this.supabase
      .from('accounting_income_statement')
      .select('*')
      .order('period', { ascending: false })
      .order('code');

    if (period) {
      query = query.eq('period', period);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('[AccountingService] Error getting income statement:', error.message);
      return [];
    }

    return data || [];
  }

  /**
   * Obtener provisiones activas (FGO, depósitos de garantía)
   */
  async getActiveProvisions(): Promise<Provision[]> {
    const { data, error } = await this.supabase
      .from('accounting_provisions_report')
      .select('*')
      .eq('status', 'ACTIVE');

    if (error) {
      console.warn('[AccountingService] Error getting provisions:', error.message);
      return [];
    }

    return data || [];
  }

  /**
   * Obtener conciliación wallet vs contabilidad
   */
  async getWalletReconciliation(): Promise<WalletReconciliation[]> {
    const { data, error } = await this.supabase
      .from('accounting_wallet_reconciliation')
      .select('*');

    if (error) {
      console.warn('[AccountingService] Error getting reconciliation:', error.message);
      return [];
    }

    return data || [];
  }

  /**
   * Obtener reporte de comisiones por período
   */
  async getCommissionsReport(): Promise<CommissionReport[]> {
    const { data, error } = await this.supabase
      .from('accounting_commissions_report')
      .select('*')
      .order('period', { ascending: false })
      .limit(12); // Últimos 12 meses

    if (error) {
      console.warn('[AccountingService] Error getting commissions report:', error.message);
      return [];
    }

    return data || [];
  }

  /**
   * Obtener plan de cuentas
   */
  async getChartOfAccounts(): Promise<AccountingAccount[]> {
    const { data, error } = await this.supabase
      .from('accounting_chart_of_accounts')
      .select('*')
      .eq('is_active', true)
      .order('code');

    if (error) {
      console.warn('[AccountingService] Error getting chart of accounts:', error.message);
      return [];
    }

    return data || [];
  }

  /**
   * Obtener libro mayor (ledger) con filtros opcionales
   */
  async getLedger(filters?: {
    startDate?: string;
    endDate?: string;
    accountCode?: string;
    transactionType?: string;
    limit?: number;
  }): Promise<unknown[]> {
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
      `,
      )
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

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('[AccountingService] Error getting ledger:', error.message);
      return [];
    }

    return data || [];
  }

  /**
   * Obtener flujo de caja
   */
  async getCashFlow(limit: number = 100): Promise<CashFlowEntry[]> {
    const { data, error } = await this.supabase
      .from('accounting_cash_flow')
      .select('*')
      .limit(limit);

    if (error) {
      console.warn('[AccountingService] Error getting cash flow:', error.message);
      return [];
    }

    return (data as CashFlowEntry[]) || [];
  }

  /**
   * Refrescar balances (materializar vista)
   */
  async refreshBalances(): Promise<boolean> {
    const { error } = await this.supabase.rpc('refresh_accounting_balances');

    if (error) {
      console.warn('[AccountingService] Error refreshing balances:', error.message);
      return false;
    }

    return true;
  }

  /**
   * Crear asiento contable manual (para ajustes)
   */
  async createManualJournalEntry(
    transactionType: string,
    description: string,
    entries: Array<{
      account_code: string;
      debit?: number;
      credit?: number;
      description?: string;
    }>,
  ): Promise<string | null> {
    const { data, error } = await this.supabase.rpc('create_journal_entry', {
      p_transaction_type: transactionType,
      p_reference_id: null,
      p_reference_table: 'manual_entry',
      p_description: description,
      p_entries: entries,
    });

    if (error) {
      console.warn('[AccountingService] Error creating journal entry:', error.message);
      return null;
    }

    return data;
  }

  /**
   * Obtener resumen financiero para un período
   */
  async getFinancialSummary(period: string): Promise<{
    income: number;
    expenses: number;
    profit: number;
    profitMargin: number;
  }> {
    const incomeStatement = await this.getIncomeStatement(period);

    const income = incomeStatement
      .filter((item) => item.account_type === 'INCOME')
      .reduce((sum, item) => sum + item.amount, 0);

    const expenses = incomeStatement
      .filter((item) => item.account_type === 'EXPENSE')
      .reduce((sum, item) => sum + item.amount, 0);

    const profit = income - expenses;
    const profitMargin = income > 0 ? (profit / income) * 100 : 0;

    return {
      income,
      expenses,
      profit,
      profitMargin,
    };
  }

  /**
   * Obtener libro mayor con paginación
   */
  async getLedgerPaginated(
    page: number = 1,
    pageSize: number = 50,
    filters?: {
      startDate?: string;
      endDate?: string;
      accountCode?: string;
      referenceType?: string;
      searchTerm?: string;
    },
  ): Promise<PaginatedResult<LedgerEntry>> {
    let query = this.supabase
      .from('accounting_ledger')
      .select(
        `
        *,
        accounting_chart_of_accounts!accounting_ledger_account_code_fkey (
          code,
          name,
          account_type
        )
      `,
        { count: 'exact' },
      )
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.startDate) {
      query = query.gte('entry_date', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('entry_date', filters.endDate);
    }

    if (filters?.accountCode) {
      query = query.eq('account_code', filters.accountCode);
    }

    if (filters?.referenceType) {
      query = query.eq('reference_type', filters.referenceType);
    }

    if (filters?.searchTerm) {
      query = query.ilike('description', `%${filters.searchTerm}%`);
    }

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.warn('[AccountingService] Error getting ledger paginated:', error.message);
      return {
        data: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
      };
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / pageSize);

    return {
      data: (data as LedgerEntry[]) || [],
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * Obtener provisiones con filtros
   */
  async getProvisions(filters?: {
    status?: string;
    provisionType?: string;
  }): Promise<ProvisionDetail[]> {
    let query = this.supabase
      .from('accounting_provisions')
      .select('*')
      .order('created_date', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.provisionType) {
      query = query.eq('provision_type', filters.provisionType);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('[AccountingService] Error getting provisions:', error.message);
      return [];
    }

    return (data as ProvisionDetail[]) || [];
  }

  /**
   * Obtener cierres de período con filtros
   */
  async getPeriodClosures(filters?: {
    periodType?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<PeriodClosure[]> {
    let query = this.supabase
      .from('accounting_period_closures')
      .select('*')
      .order('end_date', { ascending: false });

    if (filters?.periodType) {
      query = query.eq('period_type', filters.periodType);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.startDate) {
      query = query.gte('start_date', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('end_date', filters.endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('[AccountingService] Error getting period closures:', error.message);
      return [];
    }

    return (data as PeriodClosure[]) || [];
  }

  /**
   * Obtener logs de auditoría con filtros
   */
  async getAuditLogs(
    page: number = 1,
    pageSize: number = 50,
    filters?: {
      severity?: string;
      auditType?: string;
      resolutionStatus?: string;
      startDate?: string;
      endDate?: string;
    },
  ): Promise<PaginatedResult<AuditLog>> {
    let query = this.supabase
      .from('accounting_audit_log')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.severity) {
      query = query.eq('severity', filters.severity);
    }

    if (filters?.auditType) {
      query = query.eq('audit_type', filters.auditType);
    }

    if (filters?.resolutionStatus) {
      query = query.eq('resolution_status', filters.resolutionStatus);
    }

    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.warn('[AccountingService] Error getting audit logs:', error.message);
      return {
        data: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
      };
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / pageSize);

    return {
      data: (data as AuditLog[]) || [],
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * Obtener reconocimiento de ingresos por booking
   */
  async getRevenueRecognition(filters?: {
    bookingId?: string;
    isRecognized?: boolean;
    startDate?: string;
    endDate?: string;
  }): Promise<RevenueRecognition[]> {
    let query = this.supabase
      .from('accounting_revenue_recognition')
      .select('*')
      .order('recognition_date', { ascending: false });

    if (filters?.bookingId) {
      query = query.eq('booking_id', filters.bookingId);
    }

    if (filters?.isRecognized !== undefined) {
      query = query.eq('is_recognized', filters.isRecognized);
    }

    if (filters?.startDate) {
      query = query.gte('recognition_date', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('recognition_date', filters.endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('[AccountingService] Error getting revenue recognition:', error.message);
      return [];
    }

    return (data as RevenueRecognition[]) || [];
  }

  /**
   * Ejecutar cierre de período
   */
  async executePeriodClosure(
    periodType: 'daily' | 'monthly' | 'yearly',
    periodCode: string,
  ): Promise<{ success: boolean; message: string; closureId?: string }> {
    const { data, error } = await this.supabase.rpc('execute_period_closure', {
      p_period_type: periodType,
      p_period_code: periodCode,
    });

    if (error) {
      return {
        success: false,
        message: error.message || 'Error al ejecutar cierre de período',
      };
    }

    return {
      success: true,
      message: 'Cierre de período ejecutado exitosamente',
      closureId: data,
    };
  }

  /**
   * Verificar salud financiera
   */
  async checkFinancialHealth(): Promise<FinancialHealth> {
    const dashboard = await this.getDashboard();
    const reconciliation = await this.getWalletReconciliation();
    const alerts: string[] = [];

    if (!dashboard) {
      return {
        walletReconciled: false,
        fgoAdequate: false,
        profitability: 'CRITICAL',
        alerts: ['No se pudo obtener dashboard financiero'],
      };
    }

    // Verificar conciliación wallet
    const walletDiff = reconciliation.find((r) => r.source.includes('Diferencia'));
    const walletReconciled = walletDiff ? Math.abs(walletDiff.amount) < 0.01 : false;

    if (!walletReconciled) {
      alerts.push(`Diferencia en conciliación wallet: $${walletDiff?.amount.toFixed(2)}`);
    }

    // Verificar FGO adecuado (debe ser al menos 5% del total de pasivos activos)
    const minFGO = dashboard.active_security_deposits * 0.05;
    const fgoAdequate = dashboard.fgo_provision >= minFGO;

    if (!fgoAdequate) {
      alerts.push(
        `FGO insuficiente: $${dashboard.fgo_provision.toFixed(2)} (mínimo recomendado: $${minFGO.toFixed(2)})`,
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
  }
}
