import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    data: { layout: 'full-bleed' },
    loadComponent: () => import('./features/cars/list/cars-list.page').then((m) => m.CarsListPage),
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'cars',
    children: [
      {
        path: '',
        data: { layout: 'full-bleed' },
        loadComponent: () =>
          import('./features/cars/list/cars-list.page').then((m) => m.CarsListPage),
      },
      {
        path: 'compare',
        loadComponent: () =>
          import('./features/cars/compare/compare.page').then((m) => m.ComparePage),
      },
      {
        path: 'publish',
        canMatch: [AuthGuard],
        loadComponent: () =>
          import('./features/cars/publish/publish-car-v2.page').then((m) => m.PublishCarV2Page),
      },
      {
        path: 'my',
        canMatch: [AuthGuard],
        loadComponent: () =>
          import('./features/cars/my-cars/my-cars.page').then((m) => m.MyCarsPage),
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./features/cars/detail/car-detail.page').then((m) => m.CarDetailPage),
      },
    ],
  },
  {
    path: 'bookings',
    canMatch: [AuthGuard],
    loadChildren: () =>
      import('./features/bookings/bookings.routes').then((m) => m.BOOKINGS_ROUTES),
  },
  {
    path: 'admin',
    canMatch: [AuthGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/admin/dashboard/admin-dashboard.page').then(
            (m) => m.AdminDashboardPage
          ),
      },
      {
        path: 'withdrawals',
        loadComponent: () =>
          import('./features/admin/withdrawals/admin-withdrawals.page').then(
            (m) => m.AdminWithdrawalsPage
          ),
      },
      {
        path: 'coverage-fund',
        loadComponent: () =>
          import('./features/admin/components/coverage-fund-dashboard.component').then(
            (m) => m.CoverageFundDashboardComponent
          ),
      },
      {
        path: 'fgo',
        loadComponent: () =>
          import('./features/admin/fgo/fgo-overview.page').then(
            (m) => m.FgoOverviewPage
          ),
      },
    ],
  },
  {
    path: 'profile',
    canMatch: [AuthGuard],
    loadComponent: () => import('./features/profile/profile-expanded.page').then((m) => m.ProfileExpandedPage),
  },
  {
    path: 'users/:id',
    loadComponent: () => import('./features/users/public-profile.page').then((m) => m.PublicProfilePage),
  },
  {
    path: 'wallet',
    canMatch: [AuthGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./features/wallet/wallet.page').then((m) => m.WalletPage),
      },
      {
        path: 'history',
        loadComponent: () =>
          import('./features/wallet/components/ledger-history.component').then(
            (m) => m.LedgerHistoryComponent
          ),
      },
      {
        path: 'transfer',
        loadComponent: () =>
          import('./features/wallet/components/transfer-funds.component').then(
            (m) => m.TransferFundsComponent
          ),
      },
    ],
  },
  {
    path: 'terminos',
    loadComponent: () => import('./features/legal/terms/terms.page').then((m) => m.TermsPage),
  },
  { path: '**', redirectTo: '' },
];
