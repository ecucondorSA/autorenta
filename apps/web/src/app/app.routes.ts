import { Routes } from '@angular/router';
import { AuthGuard } from '@core/guards/auth.guard';
import { GuestGuard } from '@core/guards/guest.guard';
import { kycGuard, onboardingGuard } from '@core/guards/onboarding.guard';
import { AdminGuard } from '@core/guards/admin.guard';
import { seoPageResolver } from '@core/resolvers/seo-page.resolver';
import { lazyRetry } from '@core/utils/chunk-error-recovery';

export const routes: Routes = [
  {
    path: '',
    canActivate: [GuestGuard],
    data: { layout: 'full-bleed' },
    loadComponent: lazyRetry(() =>
      import('./features/marketplace/marketplace-v2.page').then((m) => m.MarketplaceV2Page),
    ),
  },
  {
    path: 'rentarfast',
    title: 'Reserva Rápida',
    data: { layout: 'full-bleed', hideFooter: true, hideNav: true },
    loadComponent: lazyRetry(() =>
      import('./features/rentarfast/rentarfast.page').then((m) => m.RentarfastPage),
    ),
  },
  {
    path: 'auth',
    loadChildren: lazyRetry(() => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES)),
  },
  {
    path: 'oauth/consent',
    title: 'Autorización',
    loadComponent: lazyRetry(() =>
      import('./features/oauth/oauth-consent.page').then((m) => m.OAuthConsentPage),
    ),
  },
  {
    path: 'onboarding',
    title: 'Bienvenida',
    loadComponent: lazyRetry(() =>
      import('./features/onboarding/onboarding.page').then((m) => m.OnboardingPage),
    ),
  },
  {
    path: 'become-renter',
    title: 'Convertite en Conductor',
    loadComponent: lazyRetry(() =>
      import('./features/become-renter/become-renter.page').then((m) => m.BecomeRenterPage),
    ),
  },
  {
    path: 'ganar',
    title: 'Ganá con tu Auto',
    data: { layout: 'full-bleed', hideHeader: true },
    loadComponent: lazyRetry(() =>
      import('./features/owners-landing/owners-landing.page').then((m) => m.OwnersLandingPage),
    ),
  },
  {
    path: 'referrals',
    title: 'Referidos',
    canMatch: [AuthGuard],
    data: { layout: 'full-bleed', hideHeader: true },
    loadComponent: lazyRetry(() =>
      import('./features/referrals/referrals.page').then((m) => m.ReferralsPage),
    ),
  },
  {
    path: 'ref/:code',
    loadComponent: lazyRetry(() =>
      import('./features/referrals/referral-landing.page').then((m) => m.ReferralLandingPage),
    ),
  },
  {
    path: 'favorites',
    title: 'Favoritos',
    data: { layout: 'full-bleed', hideHeader: true },
    loadComponent: lazyRetry(() =>
      import('./features/favorites/favorites.page').then((m) => m.FavoritesPage),
    ),
  },
  {
    path: 'cars',
    children: [
      {
        path: '',
        pathMatch: 'full',
        data: {
          layout: 'full-bleed',
          hideHeader: true,
          hideMobileNav: true,
          animation: 'CarsConversionPage',
        },
        loadComponent: lazyRetry(() =>
          import('./features/cars/conversion/cars-conversion.page').then(
            (m) => m.CarsConversionPage,
          ),
        ),
      },
      {
        path: 'list',
        title: 'Marketplace',
        data: { layout: 'full-bleed', hideHeader: true, hideMobileNav: true },
        loadComponent: lazyRetry(() =>
          import('./features/cars/browse/browse-cars.page').then((m) => m.BrowseCarsPage),
        ),
      },
      {
        path: 'compare',
        title: 'Comparar Autos',
        loadComponent: lazyRetry(() =>
          import('./features/cars/compare/compare.page').then((m) => m.ComparePage),
        ),
      },
      {
        path: 'publish',
        title: 'Publicar Auto',
        canMatch: [AuthGuard],
        data: { layout: 'full-bleed', hideHeader: true, hideMobileNav: true },
        loadComponent: lazyRetry(() =>
          import('./features/cars/publish/publish-conversational/publish-conversational.page').then(
            (m) => m.PublishConversationalPage,
          ),
        ),
      },
      {
        path: 'publish/edit/:id',
        title: 'Editar Auto',
        canMatch: [AuthGuard],
        loadComponent: lazyRetry(() =>
          import('./features/cars/publish/publish-car-v2.page').then((m) => m.PublishCarV2Page),
        ),
      },
      {
        path: 'my',
        title: 'Mis Autos',
        canMatch: [AuthGuard],
        loadComponent: lazyRetry(() =>
          import('./features/cars/my-cars/my-cars.page').then((m) => m.MyCarsPage),
        ),
      },
      {
        path: 'bulk-blocking',
        title: 'Bloqueo Masivo',
        canMatch: [AuthGuard],
        loadComponent: lazyRetry(() =>
          import('./features/cars/bulk-blocking/bulk-blocking.page').then(
            (m) => m.BulkBlockingPage,
          ),
        ),
      },
      {
        path: ':id/availability',
        title: 'Disponibilidad',
        canMatch: [AuthGuard],
        loadComponent: lazyRetry(() =>
          import('./features/cars/availability-calendar/availability-calendar.page').then(
            (m) => m.AvailabilityCalendarPage,
          ),
        ),
      },
      {
        path: ':id/documents',
        title: 'Documentos del Auto',
        canMatch: [AuthGuard],
        loadComponent: lazyRetry(() =>
          import('./features/cars/vehicle-documents/vehicle-documents.page').then(
            (m) => m.VehicleDocumentsPage,
          ),
        ),
      },
      {
        path: ':id',
        title: 'Detalle del Auto',
        data: {
          layout: 'full-bleed',
          hideHeader: true,
          hideMobileNav: true,
          animation: 'CarDetailPage',
        },
        loadComponent: lazyRetry(() =>
          import('./features/cars/detail/car-detail.page').then((m) => m.CarDetailPage),
        ),
      },
    ],
  },
  {
    path: 'bookings',
    title: 'Mis Reservas',
    canMatch: [AuthGuard],
    data: { layout: 'full-bleed', hideHeader: true },
    loadChildren: lazyRetry(() =>
      import('./features/bookings/bookings.routes').then((m) => m.BOOKINGS_ROUTES),
    ),
  },
  {
    path: 'reviews',
    title: 'Reseñas',
    canMatch: [AuthGuard],
    data: { layout: 'full-bleed', hideHeader: true },
    children: [
      {
        path: 'pending',
        title: 'Reseñas Pendientes',
        loadComponent: lazyRetry(() =>
          import('./features/reviews/pending-reviews/pending-reviews.page').then(
            (m) => m.PendingReviewsPage,
          ),
        ),
      },
    ],
  },
  {
    path: 'admin',
    title: 'Administración',
    canMatch: [AuthGuard, AdminGuard],
    children: [
      {
        path: '',
        loadComponent: lazyRetry(() =>
          import('./features/admin/dashboard/admin-dashboard.page').then(
            (m) => m.AdminDashboardPage,
          ),
        ),
      },
      {
        path: 'withdrawals',
        loadComponent: lazyRetry(() =>
          import('./features/admin/withdrawals/admin-withdrawals.page').then(
            (m) => m.AdminWithdrawalsPage,
          ),
        ),
      },
      {
        path: 'refunds',
        loadComponent: lazyRetry(() =>
          import('./features/admin/refunds/admin-refunds.page').then((m) => m.AdminRefundsPage),
        ),
      },
      {
        path: 'coverage-fund',
        loadComponent: lazyRetry(() =>
          import('./features/admin/components/coverage-fund-dashboard.component').then(
            (m) => m.CoverageFundDashboardComponent,
          ),
        ),
      },
      {
        path: 'fgo',
        loadComponent: lazyRetry(() =>
          import('./features/admin/fgo/fgo-overview.page').then((m) => m.FgoOverviewPage),
        ),
      },
      {
        path: 'exchange-rates',
        loadComponent: lazyRetry(() =>
          import('./features/admin/exchange-rates/exchange-rates.page').then(
            (m) => m.ExchangeRatesPage,
          ),
        ),
      },
      {
        path: 'accounting',
        loadChildren: lazyRetry(() =>
          import('./features/admin/accounting/accounting.routes').then((m) => m.ACCOUNTING_ROUTES),
        ),
      },
      {
        path: 'claims',
        loadComponent: lazyRetry(() =>
          import('./features/admin/claims/admin-claims.page').then((m) => m.AdminClaimsPage),
        ),
      },
      {
        path: 'claims/:id',
        loadComponent: lazyRetry(() =>
          import('./features/admin/claims/admin-claim-detail.page').then(
            (m) => m.AdminClaimDetailPage,
          ),
        ),
      },
      {
        path: 'reviews',
        loadComponent: lazyRetry(() =>
          import('./features/admin/reviews/admin-reviews.page').then((m) => m.AdminReviewsPage),
        ),
      },
      {
        path: 'verifications',
        loadComponent: lazyRetry(() =>
          import('./features/admin/verifications/admin-verifications.page').then(
            (m) => m.AdminVerificationsPage,
          ),
        ),
      },
      {
        path: 'settlements',
        loadComponent: lazyRetry(() =>
          import('./features/admin/settlements/admin-settlements.page').then(
            (m) => m.AdminSettlementsPage,
          ),
        ),
      },
      {
        path: 'disputes',
        loadComponent: lazyRetry(() =>
          import('./features/admin/disputes/admin-disputes.page').then((m) => m.AdminDisputesPage),
        ),
      },
      {
        path: 'disputes/:id',
        loadComponent: lazyRetry(() =>
          import('./features/disputes/pages/dispute-detail/dispute-detail.page').then(
            (m) => m.DisputeDetailPage,
          ),
        ),
      },
      {
        path: 'deposits',
        loadComponent: lazyRetry(() =>
          import('./features/admin/deposits-monitoring/deposits-monitoring.page').then(
            (m) => m.DepositsMonitoringPage,
          ),
        ),
      },
      {
        path: 'database-export',
        loadComponent: lazyRetry(() =>
          import('./features/admin/database-export/database-export.page').then(
            (m) => m.DatabaseExportPage,
          ),
        ),
      },
      {
        path: 'system-monitoring',
        loadComponent: lazyRetry(() =>
          import('./features/admin/system-monitoring/system-monitoring.page').then(
            (m) => m.SystemMonitoringPage,
          ),
        ),
      },
      {
        path: 'reviews/moderate',
        loadComponent: lazyRetry(() =>
          import('./features/admin/reviews/moderate-reviews/moderate-reviews.page').then(
            (m) => m.ModerateReviewsPage,
          ),
        ),
      },
      {
        path: 'analytics',
        loadComponent: lazyRetry(() =>
          import('./features/admin/analytics/admin-analytics.page').then(
            (m) => m.AdminAnalyticsPage,
          ),
        ),
      },
      {
        path: 'feature-flags',
        loadComponent: lazyRetry(() =>
          import('./features/admin/feature-flags/admin-feature-flags.page').then(
            (m) => m.AdminFeatureFlagsPage,
          ),
        ),
      },
      {
        path: 'pricing',
        loadComponent: lazyRetry(() =>
          import('./features/admin/pricing/admin-pricing.page').then((m) => m.AdminPricingPage),
        ),
      },
      {
        path: 'suspended-users',
        loadComponent: lazyRetry(() =>
          import('./features/admin/suspended-users/admin-suspended-users.page').then(
            (m) => m.AdminSuspendedUsersPage,
          ),
        ),
      },
      {
        path: 'traffic-infractions',
        loadComponent: lazyRetry(() =>
          import('./features/admin/traffic-infractions/admin-traffic-infractions.page').then(
            (m) => m.AdminTrafficInfractionsPage,
          ),
        ),
      },
      {
        path: 'accidents',
        loadComponent: lazyRetry(() =>
          import('./features/admin/accidents/admin-accidents.page').then(
            (m) => m.AdminAccidentsPage,
          ),
        ),
      },
      {
        path: 'marketing',
        loadComponent: lazyRetry(() =>
          import('./features/admin/marketing/admin-marketing.page').then(
            (m) => m.AdminMarketingPage,
          ),
        ),
      },
      {
        path: 'organizations',
        loadComponent: lazyRetry(() =>
          import('./features/organizations/pages/organization-dashboard.component').then(
            (m) => m.OrganizationDashboardComponent,
          ),
        ),
      },
    ],
  },
  {
    path: 'mp-callback',
    title: 'Procesando Pago',
    loadComponent: lazyRetry(() =>
      import('./features/mp-callback/mp-callback.page').then((m) => m.MpCallbackPage),
    ),
  },
  {
    path: 'profile',
    title: 'Mi Perfil',
    canMatch: [AuthGuard],
    data: { layout: 'full-bleed', hideHeader: true, hideFooter: true },
    children: [
      {
        path: '',
        loadComponent: lazyRetry(() =>
          import('./features/profile/profile-expanded.page').then((m) => m.ProfileExpandedPage),
        ),
        data: { layout: 'full-bleed', hideHeader: true },
      },
      {
        path: 'driver-profile',
        title: 'Perfil de Conductor',
        data: { layout: 'full-bleed', hideHeader: true },
        loadComponent: lazyRetry(() =>
          import('./features/driver-profile/driver-profile.page').then((m) => m.DriverProfilePage),
        ),
      },
      {
        path: 'mercadopago-connect',
        title: 'Conectar MercadoPago',
        data: { layout: 'full-bleed', hideHeader: true },
        loadComponent: lazyRetry(() =>
          import('./features/profile/mercadopago-connect.component').then(
            (m) => m.MercadoPagoConnectComponent,
          ),
        ),
      },
      {
        path: 'notifications-settings',
        title: 'Ajustes de Notificaciones',
        data: { layout: 'full-bleed', hideHeader: true },
        loadComponent: lazyRetry(() =>
          import('./features/profile/notifications-settings/notifications-settings.page').then(
            (m) => m.NotificationsSettingsPage,
          ),
        ),
      },
      {
        path: 'driving-stats',
        title: 'Estadísticas de Manejo',
        data: { layout: 'full-bleed', hideHeader: true },
        loadComponent: lazyRetry(() =>
          import('./features/profile/driving-stats/driving-stats.page').then(
            (m) => m.DrivingStatsPage,
          ),
        ),
      },
      {
        path: 'location-settings',
        title: 'Ubicación',
        data: { layout: 'full-bleed', hideHeader: true },
        loadComponent: lazyRetry(() =>
          import('./features/profile/location-settings.page').then((m) => m.LocationSettingsPage),
        ),
      },
      {
        path: 'personal',
        title: 'Datos Personales',
        data: { layout: 'full-bleed', hideHeader: true, hideFooter: true },
        loadComponent: lazyRetry(() =>
          import('./features/profile/personal/profile-personal.page').then(
            (m) => m.ProfilePersonalPage,
          ),
        ),
      },
      {
        path: 'contact',
        title: 'Contacto',
        data: { layout: 'full-bleed', hideHeader: true },
        loadComponent: lazyRetry(() =>
          import('./features/profile/contact/profile-contact.page').then(
            (m) => m.ProfileContactPage,
          ),
        ),
      },
      {
        path: 'preferences',
        title: 'Preferencias',
        data: { layout: 'full-bleed', hideHeader: true },
        loadComponent: lazyRetry(() =>
          import('./features/profile/preferences/profile-preferences.page').then(
            (m) => m.ProfilePreferencesPage,
          ),
        ),
      },
      {
        path: 'security',
        title: 'Seguridad de la Cuenta',
        data: { layout: 'full-bleed', hideHeader: true },
        loadComponent: lazyRetry(() =>
          import('./features/profile/security/profile-security.page').then(
            (m) => m.ProfileSecurityPage,
          ),
        ),
      },
      {
        path: 'verification',
        title: 'Verificación de Identidad',
        data: { layout: 'full-bleed', hideHeader: true },
        loadComponent: lazyRetry(() =>
          import('./features/profile/verification-page/profile-verification.page').then(
            (m) => m.ProfileVerificationPage,
          ),
        ),
      },
    ],
  },
  {
    path: 'protections',
    title: 'Protecciones',
    canMatch: [AuthGuard],
    data: { layout: 'full-bleed', hideHeader: true },
    loadComponent: lazyRetry(() =>
      import('./features/protections/protections.page').then((m) => m.ProtectionsPage),
    ),
  },
  {
    path: 'verification',
    title: 'Verificación',
    loadChildren: lazyRetry(() =>
      import('./features/verification/verification.routes').then((m) => m.VERIFICATION_ROUTES),
    ),
  },
  {
    path: 'contact-verification',
    data: { layout: 'full-bleed', hideHeader: true, hideFooter: true, hideMobileNav: true },
    loadChildren: lazyRetry(() =>
      import('./features/contact-verification/contact-verification.routes').then(
        (m) => m.CONTACT_VERIFICATION_ROUTES,
      ),
    ),
  },
  {
    path: 'users/:id',
    title: 'Perfil Público',
    loadComponent: lazyRetry(() =>
      import('./features/users/public-profile.page').then((m) => m.PublicProfilePage),
    ),
  },
  {
    path: 'finanzas',
    canMatch: [AuthGuard],
    data: { layout: 'full-bleed', hideHeader: true },
    loadComponent: lazyRetry(() =>
      import('./features/finanzas/finanzas.page').then((m) => m.FinanzasPage),
    ),
    title: 'Finanzas',
  },
  {
    path: 'wallet',
    title: 'Mi Billetera',
    canMatch: [AuthGuard],
    data: { layout: 'full-bleed', hideHeader: true },
    children: [
      {
        path: '',
        loadComponent: lazyRetry(() =>
          import('./features/wallet/wallet.page').then((m) => m.WalletPage),
        ),
        loadChildren: lazyRetry(() =>
          import('./features/wallet/wallet.routes').then((m) => m.WALLET_ROUTES),
        ),
      },
    ],
  },
  {
    path: 'dashboard',
    title: 'Panel de Propietario',
    canMatch: [AuthGuard, onboardingGuard],
    data: { layout: 'full-bleed', hideHeader: true },
    children: [
      {
        path: '',
        loadComponent: lazyRetry(() =>
          import('./features/dashboard/owner-dashboard.page').then((m) => m.OwnerDashboardPage),
        ),
      },
      {
        path: 'earnings',
        title: 'Ganancias',
        loadComponent: lazyRetry(() =>
          import('./features/dashboard/earnings/earnings.page').then((m) => m.EarningsPage),
        ),
      },
      {
        path: 'stats',
        title: 'Estadísticas',
        loadComponent: lazyRetry(() =>
          import('./features/dashboard/stats/stats.page').then((m) => m.StatsPage),
        ),
      },
      {
        path: 'reviews',
        title: 'Mis Reseñas',
        loadComponent: lazyRetry(() =>
          import('./features/dashboard/reviews/reviews.page').then((m) => m.ReviewsPage),
        ),
      },
      {
        path: 'insurance',
        title: 'Seguros',
        loadComponent: lazyRetry(() =>
          import('./features/dashboard/insurance/insurance.page').then((m) => m.InsurancePage),
        ),
      },
      {
        path: 'calendar',
        title: 'Calendario',
        loadComponent: lazyRetry(() =>
          import('./features/dashboard/calendar/dashboard-calendar.page').then(
            (m) => m.DashboardCalendarPage,
          ),
        ),
      },
      {
        path: 'points',
        title: 'Puntos',
        loadComponent: lazyRetry(() =>
          import('./features/dashboard/points/points.page').then((m) => m.PointsPage),
        ),
      },
      {
        path: 'security',
        title: 'Centro de Seguridad',
        loadComponent: lazyRetry(() =>
          import('./features/dashboard/pages/security-center/security-dashboard.page').then(
            (m) => m.SecurityDashboardPage,
          ),
        ),
      },
    ],
  },
  {
    path: 'scout',
    title: 'Scout',
    canMatch: [AuthGuard],
    data: { layout: 'full-bleed', hideHeader: true },
    children: [
      {
        path: '',
        redirectTo: 'map',
        pathMatch: 'full',
      },
      {
        path: 'map',
        loadComponent: lazyRetry(() =>
          import('./features/scout/pages/scout-map/scout-map').then((m) => m.ScoutMapPage),
        ),
      },
      {
        path: 'report/:bookingId',
        loadComponent: lazyRetry(() =>
          import('./features/scout/pages/scout-report/scout-report').then((m) => m.ScoutReportPage),
        ),
      },
      {
        path: 'missions',
        loadComponent: lazyRetry(() =>
          import('./features/scout/pages/missions-list/missions-list.page').then(
            (m) => m.MissionsListPage,
          ),
        ),
      },
    ],
  },
  {
    path: 'calendar-demo',
    canMatch: [AuthGuard],
    data: { layout: 'full-bleed', hideHeader: true },
    loadComponent: lazyRetry(() =>
      import('./features/calendar/calendar.page').then((m) => m.CalendarPage),
    ),
  },
  {
    path: 'payouts',
    title: 'Retiros',
    canMatch: [AuthGuard, kycGuard],
    data: { layout: 'full-bleed', hideHeader: true },
    loadComponent: lazyRetry(() =>
      import('./features/payouts/payouts.page').then((m) => m.PayoutsPage),
    ),
  },
  {
    path: 'support',
    title: 'Soporte',
    data: { layout: 'full-bleed', hideHeader: true },
    loadComponent: lazyRetry(() =>
      import('./features/support/support.page').then((m) => m.SupportPage),
    ),
  },
  {
    path: 'panic',
    title: 'Emergencia',
    data: { layout: 'full-bleed', hideHeader: true, hideFooter: true, hideMobileNav: true },
    loadComponent: lazyRetry(() =>
      import('./features/dashboard/pages/security-center/panic-mode.page').then(
        (m) => m.PanicModePage,
      ),
    ),
  },
  {
    path: 'beacon-test',
    data: { layout: 'full-bleed', hideHeader: true, hideFooter: true, hideMobileNav: true },
    loadComponent: lazyRetry(() =>
      import('./features/beacon-test/beacon-test.page').then((m) => m.BeaconTestPage),
    ),
  },
  {
    path: 'terminos',
    title: 'Términos y Condiciones',
    loadComponent: lazyRetry(() =>
      import('./features/legal/terms/terms.page').then((m) => m.TermsPage),
    ),
  },
  {
    path: 'privacy',
    title: 'Política de Privacidad',
    loadComponent: lazyRetry(() =>
      import('./features/legal/privacy/privacy.page').then((m) => m.PrivacyPage),
    ),
  },
  {
    path: 'delete-account',
    title: 'Eliminar Cuenta',
    loadComponent: lazyRetry(() =>
      import('./features/legal/delete-account/delete-account.page').then(
        (m) => m.DeleteAccountPage,
      ),
    ),
  },
  {
    path: 'politica-seguros',
    title: 'Política de Seguros',
    loadComponent: lazyRetry(() =>
      import('./features/legal/insurance-policy/insurance-policy.page').then(
        (m) => m.InsurancePolicyPage,
      ),
    ),
  },
  {
    path: 'messages',
    title: 'Mensajes',
    canMatch: [AuthGuard],
    data: { layout: 'full-bleed', hideHeader: true, hideMobileNav: true },
    children: [
      {
        path: '',
        data: { layout: 'full-bleed', hideHeader: true, hideMobileNav: true },
        loadComponent: lazyRetry(() =>
          import('./features/messages/inbox.page').then((m) => m.InboxPage),
        ),
      },
      {
        path: 'chat',
        data: { layout: 'full-bleed', hideHeader: true, hideMobileNav: true },
        loadComponent: lazyRetry(() =>
          import('./features/messages/messages.page').then((m) => m.MessagesPage),
        ),
      },
    ],
  },
  {
    path: 'notifications',
    title: 'Notificaciones',
    canMatch: [AuthGuard],
    data: { layout: 'full-bleed', hideHeader: true },
    children: [
      {
        path: '',
        loadComponent: lazyRetry(() =>
          import('./features/notifications/notifications.page').then((m) => m.NotificationsPage),
        ),
      },
      {
        path: 'preferences',
        loadComponent: lazyRetry(() =>
          import('./features/notifications/preferences/notification-preferences.page').then(
            (m) => m.NotificationPreferencesPage,
          ),
        ),
      },
    ],
  },
  // ============================================================================
  // STATIC PAGES (Footer Links)
  // ============================================================================
  {
    path: 'help',
    title: 'Centro de Ayuda',
    loadComponent: lazyRetry(() =>
      import('./features/static/help-center/help-center.page').then((m) => m.HelpCenterPage),
    ),
  },
  {
    path: 'aircover',
    title: 'Protección AutoRenta',
    loadComponent: lazyRetry(() =>
      import('./features/static/aircover/aircover.page').then((m) => m.AircoverPage),
    ),
  },
  {
    path: 'safety',
    title: 'Seguridad',
    loadComponent: lazyRetry(() =>
      import('./features/static/safety/safety.page').then((m) => m.SafetyPage),
    ),
  },
  {
    path: 'cancellation',
    title: 'Política de Cancelación',
    loadComponent: lazyRetry(() =>
      import('./features/static/cancellation/cancellation.page').then((m) => m.CancellationPage),
    ),
  },
  {
    path: 'community',
    title: 'Comunidad',
    loadComponent: lazyRetry(() =>
      import('./features/static/community/community.page').then((m) => m.CommunityPage),
    ),
  },
  {
    path: 'rent-your-car',
    title: 'Alquilá tu Auto',
    loadComponent: lazyRetry(() =>
      import('./features/static/rent-your-car/rent-your-car.page').then((m) => m.RentYourCarPage),
    ),
  },
  {
    path: 'owner-resources',
    title: 'Recursos para Propietarios',
    loadComponent: lazyRetry(() =>
      import('./features/static/owner-resources/owner-resources.page').then(
        (m) => m.OwnerResourcesPage,
      ),
    ),
  },
  {
    path: 'resources',
    title: 'Centro de Recursos',
    loadComponent: lazyRetry(() =>
      import('./features/static/resources/resources.page').then((m) => m.ResourcesPage),
    ),
  },
  {
    path: 'newsroom',
    title: 'Novedades',
    loadComponent: lazyRetry(() =>
      import('./features/static/newsroom/newsroom.page').then((m) => m.NewsroomPage),
    ),
  },
  {
    path: 'about',
    title: 'Sobre Nosotros',
    loadComponent: lazyRetry(() =>
      import('./features/static/about/about.page').then((m) => m.AboutPage),
    ),
  },
  {
    path: 'careers',
    title: 'Empleo',
    loadComponent: lazyRetry(() =>
      import('./features/static/careers/careers.page').then((m) => m.CareersPage),
    ),
  },
  {
    path: 'investors',
    title: 'Inversores',
    loadComponent: lazyRetry(() =>
      import('./features/static/investors/investors.page').then((m) => m.InvestorsPage),
    ),
  },
  {
    path: 'sitemap',
    title: 'Mapa del Sitio',
    loadComponent: lazyRetry(() =>
      import('./features/static/sitemap/sitemap.page').then((m) => m.SitemapPage),
    ),
  },
  {
    path: 'company-data',
    title: 'Datos de la Empresa',
    loadComponent: lazyRetry(() =>
      import('./features/static/company-data/company-data.page').then((m) => m.CompanyDataPage),
    ),
  },
  {
    path: 'terms',
    redirectTo: 'terminos',
    pathMatch: 'full',
  },

  // ============================================================================
  // SEO LANDING PAGES (Programmatic SEO)
  // ============================================================================
  {
    path: 'alquiler',
    children: [
      {
        path: ':segment1', // e.g. /alquiler/toyota OR /alquiler/palermo
        loadComponent: lazyRetry(() =>
          import('./features/seo/landing/seo-landing.page').then((m) => m.SeoLandingPageComponent),
        ),
        resolve: { pageData: seoPageResolver },
      },
      {
        path: ':segment1/:segment2', // e.g. /alquiler/toyota/palermo
        loadComponent: lazyRetry(() =>
          import('./features/seo/landing/seo-landing.page').then((m) => m.SeoLandingPageComponent),
        ),
        resolve: { pageData: seoPageResolver },
      },
    ],
  },

  // ============================================================================
  // SEO FOOTER ROUTES (reuse landing page for /alquiler-autos, /aeropuerto, etc.)
  // ============================================================================
  {
    path: 'alquiler-autos/:segment1',
    loadComponent: lazyRetry(() =>
      import('./features/seo/landing/seo-landing.page').then((m) => m.SeoLandingPageComponent),
    ),
    resolve: { pageData: seoPageResolver },
  },
  {
    path: 'aeropuerto/:segment1',
    loadComponent: lazyRetry(() =>
      import('./features/seo/landing/seo-landing.page').then((m) => m.SeoLandingPageComponent),
    ),
    resolve: { pageData: seoPageResolver },
  },
  {
    path: 'rentar/:segment1',
    loadComponent: lazyRetry(() =>
      import('./features/seo/landing/seo-landing.page').then((m) => m.SeoLandingPageComponent),
    ),
    resolve: { pageData: seoPageResolver },
  },
  {
    path: 'categoria/:segment1',
    loadComponent: lazyRetry(() =>
      import('./features/seo/landing/seo-landing.page').then((m) => m.SeoLandingPageComponent),
    ),
    resolve: { pageData: seoPageResolver },
  },
  {
    path: 'buscar/:segment1',
    loadComponent: lazyRetry(() =>
      import('./features/seo/landing/seo-landing.page').then((m) => m.SeoLandingPageComponent),
    ),
    resolve: { pageData: seoPageResolver },
  },

  // ============================================================================
  // ERROR PAGES
  // ============================================================================
  {
    path: 'error/500',
    data: { layout: 'full-bleed', hideHeader: true, hideFooter: true, hideMobileNav: true },
    loadComponent: lazyRetry(() =>
      import('./features/error/server-error/server-error.page').then((m) => m.ServerErrorPage),
    ),
  },
  {
    path: 'error/404',
    data: { layout: 'full-bleed', hideHeader: true, hideFooter: true, hideMobileNav: true },
    loadComponent: lazyRetry(() =>
      import('./features/error/not-found/not-found.page').then((m) => m.NotFoundPage),
    ),
  },
  {
    path: '**',
    component: undefined, // Workaround to lazy load via loadComponent on wildcard
    loadComponent: lazyRetry(() =>
      import('./features/error/not-found/not-found.page').then((m) => m.NotFoundPage),
    ),
  },
];
