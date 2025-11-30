import { Routes } from '@angular/router';

export const WALLET_ROUTES: Routes = [
  {
    path: 'deposit',
    loadComponent: () => import('../deposit/deposit.page').then((m) => m.DepositPage),
    title: 'Depositar Fondos - AutoRenta',
  },
  {
    path: 'history',
    loadComponent: () =>
      import('./components/ledger-history.component').then((m) => m.LedgerHistoryComponent),
    title: 'Historial de Movimientos - AutoRenta',
  },
  {
    path: 'transfer',
    loadComponent: () =>
      import('./components/transfer-funds.component').then((m) => m.TransferFundsComponent),
    title: 'Transferir AutoCréditos - AutoRenta',
  },
  {
    path: 'payouts',
    loadComponent: () => import('../payouts/payouts.page').then((m) => m.PayoutsPage),
    title: 'Retiros - AutoRenta',
  },
  {
    path: '',
    redirectTo: 'history',
    pathMatch: 'full',
  },
];
