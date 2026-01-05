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
      import('../../shared/components/transaction-history/transaction-history.component').then(
        (m) => m.TransactionHistoryComponent,
      ),
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
  // Autorentar Club routes
  {
    path: 'club/plans',
    loadComponent: () => import('./club/club-plans.page').then((m) => m.ClubPlansPage),
    title: 'Planes Autorentar Club - AutoRenta',
  },
  {
    path: 'club/subscribe',
    loadComponent: () => import('./club/club-subscribe.page').then((m) => m.ClubSubscribePage),
    title: 'Suscribirse al Club - AutoRenta',
  },
  {
    path: 'club/history',
    loadComponent: () => import('./club/club-history.page').then((m) => m.ClubHistoryPage),
    title: 'Historial de Cobertura - AutoRenta',
  },
  {
    path: 'club/renew',
    redirectTo: 'club/plans',
    pathMatch: 'full',
  },
  {
    path: 'club/recharge',
    redirectTo: 'club/plans',
    pathMatch: 'full',
  },
  {
    path: '',
    redirectTo: 'history',
    pathMatch: 'full',
  },
];
