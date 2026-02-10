import { Routes } from '@angular/router';

export const WALLET_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./wallet.page').then((m) => m.WalletPage),
  },
  {
    path: 'deposit',
    loadComponent: () => import('../deposit/deposit.page').then((m) => m.DepositPage),
    title: 'Depositar Fondos',
  },
  {
    path: 'history',
    loadComponent: () =>
      import('../../shared/components/transaction-history/transaction-history.component').then(
        (m) => m.TransactionHistoryComponent,
      ),
    title: 'Historial de Movimientos',
  },
  {
    path: 'transfer',
    loadComponent: () =>
      import('./components/transfer-funds.component').then((m) => m.TransferFundsComponent),
    title: 'Transferir AutoCréditos',
  },
  {
    path: 'payouts',
    loadComponent: () => import('../payouts/payouts.page').then((m) => m.PayoutsPage),
    title: 'Retiros',
  },
  // Autorentar Club routes
  {
    path: 'club/plans',
    loadComponent: () => import('./club/club-plans.page').then((m) => m.ClubPlansPage),
    title: 'Planes Autorentar Club',
  },
  {
    path: 'club/subscribe',
    loadComponent: () => import('./club/club-subscribe.page').then((m) => m.ClubSubscribePage),
    title: 'Suscribirse al Club',
  },
  {
    path: 'club/history',
    loadComponent: () => import('./club/club-history.page').then((m) => m.ClubHistoryPage),
    title: 'Historial de Cobertura',
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
];
