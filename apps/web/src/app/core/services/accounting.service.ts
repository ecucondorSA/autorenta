/**
 * Servicio de Contabilidad Automatizada
 * Integración con sistema contable basado en NIIF 15 y NIIF 37
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

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

export interface CommissionReport {
  period: string;
  total_bookings: number;
  total_commissions: number;
  avg_commission: number;
}

export class AccountingService {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Obtener dashboard ejecutivo con KPIs financieros
   */
  async getDashboard(): Promise<AccountingDashboard | null> {
    const { data, error } = await this.supabase
      .from('accounting_dashboard')
      .select('*')
      .single();

    if (error) {
      console.error('Error fetching accounting dashboard:', error);
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
      console.error('Error fetching balance sheet:', error);
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
      console.error('Error fetching income statement:', error);
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
      console.error('Error fetching provisions:', error);
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
      console.error('Error fetching wallet reconciliation:', error);
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
      console.error('Error fetching commissions report:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Obtener plan de cuentas
   */
  async getChartOfAccounts(): Promise<AccountingAccount[]> {
    const { data, error } = await this.supabase
      .from('accounting_accounts')
      .select('*')
      .eq('is_active', true)
      .order('code');

    if (error) {
      console.error('Error fetching chart of accounts:', error);
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
  }): Promise<any[]> {
    let query = this.supabase
      .from('accounting_ledger')
      .select(`
        *,
        accounting_accounts (
          code,
          name,
          account_type
        )
      `)
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
      console.error('Error fetching ledger:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Obtener flujo de caja
   */
  async getCashFlow(limit: number = 100): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('accounting_cash_flow')
      .select('*')
      .limit(limit);

    if (error) {
      console.error('Error fetching cash flow:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Refrescar balances (materializar vista)
   */
  async refreshBalances(): Promise<boolean> {
    const { error } = await this.supabase
      .rpc('refresh_accounting_balances');

    if (error) {
      console.error('Error refreshing balances:', error);
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
    }>
  ): Promise<string | null> {
    const { data, error } = await this.supabase
      .rpc('create_journal_entry', {
        p_transaction_type: transactionType,
        p_reference_id: null,
        p_reference_table: 'manual_entry',
        p_description: description,
        p_entries: entries,
      });

    if (error) {
      console.error('Error creating journal entry:', error);
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
      .filter(item => item.account_type === 'INCOME')
      .reduce((sum, item) => sum + item.amount, 0);

    const expenses = incomeStatement
      .filter(item => item.account_type === 'EXPENSE')
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
   * Verificar salud financiera
   */
  async checkFinancialHealth(): Promise<{
    walletReconciled: boolean;
    fgoAdequate: boolean;
    profitability: 'GOOD' | 'WARNING' | 'CRITICAL';
    alerts: string[];
  }> {
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
    const walletDiff = reconciliation.find(r => r.source.includes('Diferencia'));
    const walletReconciled = walletDiff ? Math.abs(walletDiff.amount) < 0.01 : false;
    
    if (!walletReconciled) {
      alerts.push(`Diferencia en conciliación wallet: $${walletDiff?.amount.toFixed(2)}`);
    }

    // Verificar FGO adecuado (debe ser al menos 5% del total de pasivos activos)
    const minFGO = dashboard.active_security_deposits * 0.05;
    const fgoAdequate = dashboard.fgo_provision >= minFGO;
    
    if (!fgoAdequate) {
      alerts.push(`FGO insuficiente: $${dashboard.fgo_provision.toFixed(2)} (mínimo recomendado: $${minFGO.toFixed(2)})`);
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

// Export singleton instance (opcional)
let accountingServiceInstance: AccountingService | null = null;

export function getAccountingService(supabaseUrl?: string, supabaseKey?: string): AccountingService {
  if (!accountingServiceInstance) {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials required for first initialization');
    }
    accountingServiceInstance = new AccountingService(supabaseUrl, supabaseKey);
  }
  return accountingServiceInstance;
}
