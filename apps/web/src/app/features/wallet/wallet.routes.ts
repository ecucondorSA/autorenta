import { Routes } from '@angular/router';

export const WALLET_ROUTES: Routes = [
  {
    path: 'history',
    loadComponent: () =>
      import('./components/ledger-history.component').then(
        (m) => m.LedgerHistoryComponent
      ),
    title: 'Historial de Movimientos - AutoRenta',
  },
  {
    path: 'transfer',
    loadComponent: () =>
      import('./components/transfer-funds.component').then(
        (m) => m.TransferFundsComponent
      ),
    title: 'Transferir AutoCréditos - AutoRenta',
  },
  {
    path: '',
    redirectTo: 'history',
    pathMatch: 'full',
  },
];
