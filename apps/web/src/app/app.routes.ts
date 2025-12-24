import { Routes } from '@angular/router';
import { AuthGuard } from '@core/guards/auth.guard';
import { GuestGuard } from '@core/guards/guest.guard';
import { kycGuard, onboardingGuard } from '@core/guards/onboarding.guard';

export const routes: Routes = [
  {
    path: '',
    canActivate: [GuestGuard],
    data: { layout: 'full-bleed' },
    loadComponent: () =>
      import('./features/marketplace/marketplace-v2.page').then((m) => m.MarketplaceV2Page),
  },

  {
    path: 'explore',
    loadComponent: () => import('./features/explore/explore.page').then((m) => m.ExplorePage),
  },
  {
    path: 'rentarfast',
    data: { layout: 'full-bleed', hideFooter: true, hideNav: true },
    loadComponent: () =>
      import('./features/rentarfast/rentarfast.page').then((m) => m.RentarfastPage),
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
    path: 'favorites',
    loadComponent: () => import('./features/favorites/favorites.page').then((m) => m.FavoritesPage),
  },
  {
    path: 'cars',
    children: [
      {
        path: '',
        pathMatch: 'full',
        data: { layout: 'full-bleed', animation: 'CarsConversionPage' },
        loadComponent: () =>
          import('./features/cars/conversion/cars-conversion.page').then(
            (m) => m.CarsConversionPage,
          ),
      },
      {
        path: 'list',
        data: { layout: 'full-bleed', animation: 'CarsListPage', hideFooter: true },
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
        data: { animation: 'CarDetailPage' },
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
        path: 'disputes/:id', // Nueva ruta para el detalle de disputas
        loadComponent: () =>
          import('./features/disputes/pages/dispute-detail/dispute-detail.page').then(
            (m) => m.DisputeDetailPage,
          ),
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
        path: 'feature-flags',
        loadComponent: () =>
          import('./features/admin/feature-flags/admin-feature-flags.page').then(
            (m) => m.AdminFeatureFlagsPage,
          ),
      },
      {
        path: 'pricing',
        loadComponent: () =>
          import('./features/admin/pricing/admin-pricing.page').then((m) => m.AdminPricingPage),
      },
      {
        path: 'suspended-users',
        loadComponent: () =>
          import('./features/admin/suspended-users/admin-suspended-users.page').then(
            (m) => m.AdminSuspendedUsersPage,
          ),
      },
      {
        path: 'traffic-infractions',
        loadComponent: () =>
          import('./features/admin/traffic-infractions/admin-traffic-infractions.page').then(
            (m) => m.AdminTrafficInfractionsPage,
          ),
      },
      {
        path: 'accidents',
        loadComponent: () =>
          import('./features/admin/accidents/admin-accidents.page').then(
            (m) => m.AdminAccidentsPage,
          ),
      },
      {
        path: 'organizations', // Nueva ruta para organizaciones
        loadComponent: () =>
          import('./features/organizations/pages/organization-dashboard.component').then(
            (m) => m.OrganizationDashboardComponent,
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
        path: 'personal',
        loadComponent: () =>
          import('./features/profile/personal/profile-personal.page').then(
            (m) => m.ProfilePersonalPage,
          ),
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
        path: '',
        loadChildren: () => import('./features/wallet/wallet.routes').then((m) => m.WALLET_ROUTES),
      },
    ],
  },
  {
    path: 'dashboard',
    canMatch: [AuthGuard, onboardingGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/dashboard/owner-dashboard.page').then((m) => m.OwnerDashboardPage),
      },
      {
        path: 'earnings',
        loadComponent: () =>
          import('./features/dashboard/earnings/earnings.page').then((m) => m.EarningsPage),
      },
      {
        path: 'stats',
        loadComponent: () =>
          import('./features/dashboard/stats/stats.page').then((m) => m.StatsPage),
      },
      {
        path: 'reviews',
        loadComponent: () =>
          import('./features/dashboard/reviews/reviews.page').then((m) => m.ReviewsPage),
      },
      {
        path: 'insurance',
        loadComponent: () =>
          import('./features/dashboard/insurance/insurance.page').then((m) => m.InsurancePage),
      },
      {
        path: 'calendar',
        loadComponent: () =>
          import('./features/dashboard/calendar/calendar.page').then((m) => m.DashboardCalendarPage),
      },
    ],
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
    path: 'support',
    canMatch: [AuthGuard],
    loadComponent: () => import('./features/support/support.page').then((m) => m.SupportPage),
  },
  {
    path: 'terminos',
    loadComponent: () => import('./features/legal/terms/terms.page').then((m) => m.TermsPage),
  },
  {
    path: 'privacy',
    loadComponent: () =>
      import('./features/legal/privacy/privacy.page').then((m) => m.PrivacyPage),
  },
  {
    path: 'politica-seguros',
    loadComponent: () =>
      import('./features/legal/insurance-policy/insurance-policy.page').then(
        (m) => m.InsurancePolicyPage,
      ),
  },
  {
    path: 'messages',
    canMatch: [AuthGuard],
    data: { layout: 'full-bleed' },
    children: [
      {
        path: '',
        data: { layout: 'full-bleed' },
        loadComponent: () => import('./features/messages/inbox.page').then((m) => m.InboxPage),
      },
      {
        path: 'chat',
        data: { layout: 'full-bleed' },
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
