import { Routes } from '@angular/router';

/**
 * Rutas del módulo de contabilidad
 * Todas las rutas están protegidas por AuthGuard y AdminGuard a nivel superior
 */
export const ACCOUNTING_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/accounting-dashboard.page').then((m) => m.AccountingDashboardPage),
  },
  {
    path: 'balance-sheet',
    loadComponent: () => import('./pages/balance-sheet.page').then((m) => m.BalanceSheetPage),
  },
  {
    path: 'income-statement',
    loadComponent: () => import('./pages/income-statement.page').then((m) => m.IncomeStatementPage),
  },
  {
    path: 'journal-entries',
    loadComponent: () => import('./pages/journal-entries.page').then((m) => m.JournalEntriesPage),
  },
  {
    path: 'reconciliation',
    loadComponent: () => import('./pages/reconciliation.page').then((m) => m.ReconciliationPage),
  },
  {
    path: 'provisions',
    loadComponent: () => import('./pages/provisions.page').then((m) => m.ProvisionsPage),
  },
  {
    path: 'manual-entry',
    loadComponent: () =>
      import('./pages/manual-journal-entry.page').then((m) => m.ManualJournalEntryPage),
  },
  {
    path: 'ledger',
    loadComponent: () => import('./pages/ledger.page').then((m) => m.LedgerPage),
  },
  {
    path: 'revenue-recognition',
    loadComponent: () =>
      import('./pages/revenue-recognition.page').then((m) => m.RevenueRecognitionPage),
  },
  {
    path: 'period-closures',
    loadComponent: () => import('./pages/period-closures.page').then((m) => m.PeriodClosuresPage),
  },
  {
    path: 'financial-health',
    loadComponent: () => import('./pages/financial-health.page').then((m) => m.FinancialHealthPage),
  },
  {
    path: 'cash-flow',
    loadComponent: () => import('./cash-flow/cash-flow.page').then((m) => m.CashFlowPage),
  },
  {
    path: 'audit-logs',
    loadComponent: () => import('./audit-logs/audit-logs.page').then((m) => m.AuditLogsPage),
  },
];
