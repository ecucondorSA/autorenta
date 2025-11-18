import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { kycGuard, onboardingGuard } from './core/guards/onboarding.guard';

export const routes: Routes = [
  {
    path: '',
    data: { layout: 'full-bleed' },
    loadComponent: () =>
      import('./features/marketplace/marketplace-v2.page').then((m) => m.MarketplaceV2Page),
  },
  {
    path: 'marketplace',
    redirectTo: '',
    pathMatch: 'full',
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'onboarding',
    loadComponent: () =>
      import('./features/onboarding/onboarding.page').then((m) => m.OnboardingPage),
  },
  {
    path: 'become-renter',
    loadComponent: () =>
      import('./features/become-renter/become-renter.page').then((m) => m.BecomeRenterPage),
  },
  {
    path: 'home-v2',
    data: { layout: 'full-bleed' },
    loadComponent: () => import('./features/home-v2/home-v2.page').then((m) => m.HomeV2Page),
  },
  {
    path: 'ui-showcase',
    data: { layout: 'full-bleed' },
    loadComponent: () =>
      import('./features/ui-showcase/ui-showcase.page').then((m) => m.UIShowcasePage),
  },
  {
    path: 'referrals',
    canMatch: [AuthGuard],
    loadComponent: () => import('./features/referrals/referrals.page').then((m) => m.ReferralsPage),
  },
  {
    path: 'ref/:code',
    loadComponent: () =>
      import('./features/referrals/referral-landing.page').then((m) => m.ReferralLandingPage),
  },
  {
    path: 'cars',
    children: [
      {
        path: '',
        pathMatch: 'full',
        data: { layout: 'full-bleed' },
        loadComponent: () =>
          import('./features/cars/conversion/cars-conversion.page').then(
            (m) => m.CarsConversionPage,
          ),
      },
      {
        path: 'list',
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
      // Wizard removed - using publish-car-v2 as single publish system
      {
        path: 'my',
        canMatch: [AuthGuard],
        loadComponent: () =>
          import('./features/cars/my-cars/my-cars.page').then((m) => m.MyCarsPage),
      },
      {
        path: 'bulk-blocking',
        canMatch: [AuthGuard],
        loadComponent: () =>
          import('./features/cars/bulk-blocking/bulk-blocking.page').then(
            (m) => m.BulkBlockingPage,
          ),
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
        path: ':id/documents',
        canMatch: [AuthGuard],
        loadComponent: () =>
          import('./features/cars/vehicle-documents/vehicle-documents.page').then(
            (m) => m.VehicleDocumentsPage,
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
        path: 'refunds',
        loadComponent: () =>
          import('./features/admin/refunds/admin-refunds.page').then((m) => m.AdminRefundsPage),
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
        loadChildren: () =>
          import('./features/admin/accounting/accounting.routes').then((m) => m.ACCOUNTING_ROUTES),
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
      {
        path: 'reviews',
        loadComponent: () =>
          import('./features/admin/reviews/admin-reviews.page').then((m) => m.AdminReviewsPage),
      },
      {
        path: 'verifications',
        loadComponent: () =>
          import('./features/admin/verifications/admin-verifications.page').then(
            (m) => m.AdminVerificationsPage,
          ),
      },
      {
        path: 'settlements',
        loadComponent: () =>
          import('./features/admin/settlements/admin-settlements.page').then(
            (m) => m.AdminSettlementsPage,
          ),
      },
      {
        path: 'disputes',
        loadComponent: () =>
          import('./features/admin/disputes/admin-disputes.page').then((m) => m.AdminDisputesPage),
      },
      {
        path: 'deposits',
        loadComponent: () =>
          import('./features/admin/deposits-monitoring/deposits-monitoring.page').then(
            (m) => m.DepositsMonitoringPage,
          ),
      },
      {
        path: 'database-export',
        loadComponent: () =>
          import('./features/admin/database-export/database-export.page').then(
            (m) => m.DatabaseExportPage,
          ),
      },
      {
        path: 'reviews/moderate',
        loadComponent: () =>
          import('./features/admin/reviews/moderate-reviews/moderate-reviews.page').then(
            (m) => m.ModerateReviewsPage,
          ),
      },
      {
        path: 'analytics',
        loadComponent: () =>
          import('./features/admin/analytics/admin-analytics.page').then(
            (m) => m.AdminAnalyticsPage,
          ),
      },
      {
        path: 'pricing',
        loadComponent: () =>
          import('./features/admin/pricing/admin-pricing.page').then((m) => m.AdminPricingPage),
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
        path: 'driver-profile',
        loadComponent: () =>
          import('./features/driver-profile/driver-profile.page').then((m) => m.DriverProfilePage),
      },
      {
        path: 'mercadopago-connect',
        loadComponent: () =>
          import('./features/profile/mercadopago-connect.component').then(
            (m) => m.MercadoPagoConnectComponent,
          ),
      },
      {
        path: 'notifications-settings',
        loadComponent: () =>
          import('./features/profile/notifications-settings/notifications-settings.page').then(
            (m) => m.NotificationsSettingsPage,
          ),
      },
      {
        path: 'driving-stats',
        loadComponent: () =>
          import('./features/profile/driving-stats/driving-stats.page').then(
            (m) => m.DrivingStatsPage,
          ),
      },
      {
        path: 'location-settings',
        loadComponent: () =>
          import('./features/profile/location-settings.page').then((m) => m.LocationSettingsPage),
      },
      {
        path: 'contact',
        loadComponent: () =>
          import('./features/profile/contact/profile-contact.page').then(
            (m) => m.ProfileContactPage,
          ),
      },
      {
        path: 'preferences',
        loadComponent: () =>
          import('./features/profile/preferences/profile-preferences.page').then(
            (m) => m.ProfilePreferencesPage,
          ),
      },
      {
        path: 'security',
        loadComponent: () =>
          import('./features/profile/security/profile-security.page').then(
            (m) => m.ProfileSecurityPage,
          ),
      },
      {
        path: 'verification',
        loadComponent: () =>
          import('./features/profile/verification-page/profile-verification.page').then(
            (m) => m.ProfileVerificationPage,
          ),
      },
    ],
  },
  {
    path: 'protections',
    canMatch: [AuthGuard],
    loadComponent: () =>
      import('./features/protections/protections.page').then((m) => m.ProtectionsPage),
  },
  {
    path: 'verification',
    loadChildren: () =>
      import('./features/verification/verification.routes').then((m) => m.VERIFICATION_ROUTES),
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
    path: 'dashboard',
    canMatch: [AuthGuard, onboardingGuard],
    loadComponent: () =>
      import('./features/dashboard/owner-dashboard.page').then((m) => m.OwnerDashboardPage),
  },
  {
    path: 'calendar-demo',
    canMatch: [AuthGuard],
    loadComponent: () => import('./features/calendar/calendar.page').then((m) => m.CalendarPage),
  },
  {
    path: 'payouts',
    canMatch: [AuthGuard, kycGuard],
    loadComponent: () => import('./features/payouts/payouts.page').then((m) => m.PayoutsPage),
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
        loadComponent: () =>
          import('./features/messages/messages.page').then((m) => m.MessagesPage),
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
