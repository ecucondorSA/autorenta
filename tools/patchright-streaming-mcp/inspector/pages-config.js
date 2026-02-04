/**
 * 📋 AutoRenta Pages Configuration
 * 153 pages organized by module
 */

export const PAGES_PHASE_1 = [
  { name: 'landing', path: '/', description: 'Landing/Marketplace', requiresAuth: false },
  { name: 'cars_list', path: '/cars/list', description: 'Lista de autos (mapa)', requiresAuth: false },
  { name: 'profile', path: '/profile', description: 'Perfil de usuario', requiresAuth: true },
  { name: 'bookings', path: '/bookings', description: 'Mis reservas', requiresAuth: true },
  { name: 'wallet', path: '/wallet', description: 'Billetera', requiresAuth: true },
  { name: 'cars_my', path: '/cars/my', description: 'Mis autos', requiresAuth: true },
  { name: 'notifications', path: '/notifications', description: 'Notificaciones', requiresAuth: true },
  { name: 'favorites', path: '/favorites', description: 'Favoritos', requiresAuth: true },
  { name: 'messages', path: '/messages', description: 'Mensajes', requiresAuth: true },
];

export const PAGES_ADMIN = [
  // Dashboard & Core
  { name: 'admin_dashboard', path: '/admin', description: 'Admin Dashboard', requiresAuth: true, requiresAdmin: true },
  { name: 'admin_analytics', path: '/admin/analytics', description: 'Analytics', requiresAuth: true, requiresAdmin: true },
  { name: 'admin_marketing', path: '/admin/marketing', description: 'Marketing', requiresAuth: true, requiresAdmin: true },
  { name: 'admin_pricing', path: '/admin/pricing', description: 'Pricing Config', requiresAuth: true, requiresAdmin: true },
  { name: 'admin_feature_flags', path: '/admin/feature-flags', description: 'Feature Flags', requiresAuth: true, requiresAdmin: true },

  // Finance
  { name: 'admin_withdrawals', path: '/admin/withdrawals', description: 'Withdrawals', requiresAuth: true, requiresAdmin: true },
  { name: 'admin_refunds', path: '/admin/refunds', description: 'Refunds', requiresAuth: true, requiresAdmin: true },
  { name: 'admin_deposits', path: '/admin/deposits', description: 'Deposits Monitoring', requiresAuth: true, requiresAdmin: true },
  { name: 'admin_settlements', path: '/admin/settlements', description: 'Settlements', requiresAuth: true, requiresAdmin: true },
  { name: 'admin_exchange_rates', path: '/admin/exchange-rates', description: 'Exchange Rates', requiresAuth: true, requiresAdmin: true },
  { name: 'admin_fgo', path: '/admin/fgo', description: 'FGO Overview', requiresAuth: true, requiresAdmin: true },
  { name: 'admin_coverage_fund', path: '/admin/coverage-fund', description: 'Coverage Fund', requiresAuth: true, requiresAdmin: true },

  // Accounting
  { name: 'admin_accounting', path: '/admin/accounting', description: 'Accounting Dashboard', requiresAuth: true, requiresAdmin: true },

  // Users & Verification
  { name: 'admin_verifications', path: '/admin/verifications', description: 'Verifications', requiresAuth: true, requiresAdmin: true },
  { name: 'admin_suspended', path: '/admin/suspended-users', description: 'Suspended Users', requiresAuth: true, requiresAdmin: true },
  { name: 'admin_reviews', path: '/admin/reviews', description: 'Reviews', requiresAuth: true, requiresAdmin: true },
  { name: 'admin_reviews_moderate', path: '/admin/reviews/moderate', description: 'Moderate Reviews', requiresAuth: true, requiresAdmin: true },

  // Claims & Disputes
  { name: 'admin_claims', path: '/admin/claims', description: 'Claims', requiresAuth: true, requiresAdmin: true },
  { name: 'admin_disputes', path: '/admin/disputes', description: 'Disputes', requiresAuth: true, requiresAdmin: true },

  // Operations
  { name: 'admin_accidents', path: '/admin/accidents', description: 'Accidents', requiresAuth: true, requiresAdmin: true },
  { name: 'admin_traffic', path: '/admin/traffic-infractions', description: 'Traffic Infractions', requiresAuth: true, requiresAdmin: true },

  // System
  { name: 'admin_monitoring', path: '/admin/system-monitoring', description: 'System Monitoring', requiresAuth: true, requiresAdmin: true },
  { name: 'admin_db_export', path: '/admin/database-export', description: 'Database Export', requiresAuth: true, requiresAdmin: true },
];

export const PAGES_BOOKINGS = [
  { name: 'bookings_hub', path: '/bookings', description: 'Bookings Hub', requiresAuth: true },
  { name: 'bookings_pending', path: '/reviews/pending', description: 'Pending Reviews', requiresAuth: true },
  { name: 'dashboard', path: '/dashboard', description: 'Owner Dashboard', requiresAuth: true },
  { name: 'dashboard_earnings', path: '/dashboard/earnings', description: 'Earnings', requiresAuth: true },
  { name: 'dashboard_stats', path: '/dashboard/stats', description: 'Stats', requiresAuth: true },
  { name: 'dashboard_calendar', path: '/dashboard/calendar', description: 'Calendar', requiresAuth: true },
  { name: 'dashboard_insurance', path: '/dashboard/insurance', description: 'Insurance', requiresAuth: true },
  { name: 'dashboard_reviews', path: '/dashboard/reviews', description: 'Reviews', requiresAuth: true },
  { name: 'payouts', path: '/payouts', description: 'Payouts', requiresAuth: true },
];

export const PAGES_CARS = [
  { name: 'cars_browse', path: '/cars', description: 'Browse Cars', requiresAuth: false },
  { name: 'cars_list', path: '/cars/list', description: 'Cars List/Map', requiresAuth: false },
  { name: 'cars_compare', path: '/cars/compare', description: 'Compare Cars', requiresAuth: false },
  { name: 'cars_publish', path: '/cars/publish', description: 'Publish Car', requiresAuth: true },
  { name: 'cars_my', path: '/cars/my', description: 'My Cars', requiresAuth: true },
  { name: 'cars_bulk_blocking', path: '/cars/bulk-blocking', description: 'Bulk Blocking', requiresAuth: true },
];

export const PAGES_PROFILE = [
  { name: 'profile', path: '/profile', description: 'Profile', requiresAuth: true },
  { name: 'profile_personal', path: '/profile/personal', description: 'Personal Info', requiresAuth: true },
  { name: 'profile_contact', path: '/profile/contact', description: 'Contact', requiresAuth: true },
  { name: 'profile_preferences', path: '/profile/preferences', description: 'Preferences', requiresAuth: true },
  { name: 'profile_security', path: '/profile/security', description: 'Security', requiresAuth: true },
  { name: 'profile_verification', path: '/profile/verification', description: 'Verification', requiresAuth: true },
  { name: 'profile_driving_stats', path: '/profile/driving-stats', description: 'Driving Stats', requiresAuth: true },
  { name: 'profile_location', path: '/profile/location-settings', description: 'Location Settings', requiresAuth: true },
  { name: 'profile_notifications', path: '/profile/notifications-settings', description: 'Notification Settings', requiresAuth: true },
];

export const PAGES_WALLET = [
  { name: 'wallet', path: '/wallet', description: 'Wallet', requiresAuth: true },
  { name: 'wallet_club_plans', path: '/wallet/club/plans', description: 'Club Plans', requiresAuth: true },
  { name: 'wallet_club_subscribe', path: '/wallet/club/subscribe', description: 'Club Subscribe', requiresAuth: true },
  { name: 'wallet_club_history', path: '/wallet/club/history', description: 'Club History', requiresAuth: true },
];

export const PAGES_AUTH = [
  { name: 'auth_login', path: '/auth/login', description: 'Login', requiresAuth: false },
  { name: 'auth_register', path: '/auth/register', description: 'Register', requiresAuth: false },
  { name: 'auth_reset', path: '/auth/reset-password', description: 'Reset Password', requiresAuth: false },
];

export const PAGES_STATIC = [
  { name: 'about', path: '/about', description: 'About', requiresAuth: false },
  { name: 'help', path: '/help', description: 'Help Center', requiresAuth: false },
  { name: 'support', path: '/support', description: 'Support', requiresAuth: false },
  { name: 'safety', path: '/safety', description: 'Safety', requiresAuth: false },
  { name: 'terms', path: '/terms', description: 'Terms', requiresAuth: false },
  { name: 'privacy', path: '/privacy', description: 'Privacy', requiresAuth: false },
  { name: 'aircover', path: '/aircover', description: 'Aircover', requiresAuth: false },
  { name: 'cancellation', path: '/cancellation', description: 'Cancellation Policy', requiresAuth: false },
  { name: 'careers', path: '/careers', description: 'Careers', requiresAuth: false },
  { name: 'investors', path: '/investors', description: 'Investors', requiresAuth: false },
  { name: 'rent_your_car', path: '/rent-your-car', description: 'Rent Your Car', requiresAuth: false },
  { name: 'sitemap', path: '/sitemap', description: 'Sitemap', requiresAuth: false },
];

export const PAGES_OTHER = [
  { name: 'onboarding', path: '/onboarding', description: 'Onboarding', requiresAuth: true },
  { name: 'become_renter', path: '/become-renter', description: 'Become Renter', requiresAuth: false },
  { name: 'referrals', path: '/referrals', description: 'Referrals', requiresAuth: true },
  { name: 'verification', path: '/verification', description: 'Verification', requiresAuth: true },
  { name: 'protections', path: '/protections', description: 'Protections', requiresAuth: true },
  { name: 'missions', path: '/scout/missions', description: 'Scout Missions', requiresAuth: true },
  { name: 'rentarfast', path: '/rentarfast', description: 'Rentarfast', requiresAuth: false },
  { name: 'marketplace', path: '/', description: 'Marketplace', requiresAuth: false },
];

// All pages combined
export const ALL_PAGES = [
  ...PAGES_PHASE_1,
  ...PAGES_ADMIN,
  ...PAGES_BOOKINGS,
  ...PAGES_CARS,
  ...PAGES_PROFILE,
  ...PAGES_WALLET,
  ...PAGES_AUTH,
  ...PAGES_STATIC,
  ...PAGES_OTHER,
];

// Get pages by module
export function getPagesByModule(module) {
  switch (module) {
    case 'phase1': return PAGES_PHASE_1;
    case 'admin': return PAGES_ADMIN;
    case 'bookings': return PAGES_BOOKINGS;
    case 'cars': return PAGES_CARS;
    case 'profile': return PAGES_PROFILE;
    case 'wallet': return PAGES_WALLET;
    case 'auth': return PAGES_AUTH;
    case 'static': return PAGES_STATIC;
    case 'other': return PAGES_OTHER;
    case 'all': return ALL_PAGES;
    default: return PAGES_PHASE_1;
  }
}

export default { ALL_PAGES, getPagesByModule };
