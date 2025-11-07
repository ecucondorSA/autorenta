import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { MercadoPagoGuard } from './core/guards/mercadopago.guard';

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
    path: 'onboarding',
    loadComponent: () => import('./features/onboarding/onboarding.page').then((m) => m.OnboardingPage),
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
        path: ':id/availability',
        canMatch: [AuthGuard],
        loadComponent: () =>
          import('./features/cars/availability-calendar/availability-calendar.page').then(
            (m) => m.AvailabilityCalendarPage,
          ),
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
            (m) => m.AdminDashboardPage,
          ),
      },
      {
        path: 'withdrawals',
        loadComponent: () =>
          import('./features/admin/withdrawals/admin-withdrawals.page').then(
            (m) => m.AdminWithdrawalsPage,
          ),
      },
      {
        path: 'coverage-fund',
        loadComponent: () =>
          import('./features/admin/components/coverage-fund-dashboard.component').then(
            (m) => m.CoverageFundDashboardComponent,
          ),
      },
      {
        path: 'fgo',
        loadComponent: () =>
          import('./features/admin/fgo/fgo-overview.page').then((m) => m.FgoOverviewPage),
      },
      {
        path: 'exchange-rates',
        loadComponent: () =>
          import('./features/admin/exchange-rates/exchange-rates.page').then(
            (m) => m.ExchangeRatesPage,
          ),
      },
      {
        path: 'accounting',
        loadComponent: () =>
          import('./features/admin/accounting/accounting-admin.page').then(
            (m) => m.AccountingAdminPage,
          ),
      },
      {
        path: 'claims',
        loadComponent: () =>
          import('./features/admin/claims/admin-claims.page').then((m) => m.AdminClaimsPage),
      },
      {
        path: 'claims/:id',
        loadComponent: () =>
          import('./features/admin/claims/admin-claim-detail.page').then(
            (m) => m.AdminClaimDetailPage,
          ),
      },
    ],
  },
  {
    path: 'mp-callback',
    loadComponent: () =>
      import('./features/mp-callback/mp-callback.page').then((m) => m.MpCallbackPage),
  },
  {
    path: 'profile',
    canMatch: [AuthGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/profile/profile-expanded.page').then((m) => m.ProfileExpandedPage),
      },
      {
        path: 'mercadopago-connect',
        loadComponent: () =>
          import('./features/profile/mercadopago-connect.component').then(
            (m) => m.MercadoPagoConnectComponent,
          ),
      },
    ],
  },
  {
    path: 'driver-profile',
    canMatch: [AuthGuard],
    loadComponent: () =>
      import('./features/driver-profile/driver-profile.page').then((m) => m.DriverProfilePage),
  },
  {
    path: 'protections',
    canMatch: [AuthGuard],
    loadComponent: () =>
      import('./features/protections/protections.page').then((m) => m.ProtectionsPage),
  },
  {
    path: 'users/:id',
    loadComponent: () =>
      import('./features/users/public-profile.page').then((m) => m.PublicProfilePage),
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
            (m) => m.LedgerHistoryComponent,
          ),
      },
      {
        path: 'transfer',
        loadComponent: () =>
          import('./features/wallet/components/transfer-funds.component').then(
            (m) => m.TransferFundsComponent,
          ),
      },
    ],
  },
  {
    path: 'terminos',
    loadComponent: () => import('./features/legal/terms/terms.page').then((m) => m.TermsPage),
  },
  {
    path: 'messages',
    canMatch: [AuthGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./features/messages/inbox.page').then((m) => m.InboxPage),
      },
      {
        path: 'chat',
        loadComponent: () => import('./features/messages/messages.page').then((m) => m.MessagesPage),
      },
    ],
  },
  {
    path: 'notifications',
    canMatch: [AuthGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/notifications/notifications.page').then((m) => m.NotificationsPage),
      },
      {
        path: 'preferences',
        loadComponent: () =>
          import('./features/notifications/preferences/notification-preferences.page').then(
            (m) => m.NotificationPreferencesPage,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
