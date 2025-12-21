import { Routes } from '@angular/router';
import { AuthGuard } from '@core/guards/auth.guard';

export const BOOKINGS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./my-bookings/my-bookings.page').then((m) => m.MyBookingsPage),
  },
  {
    path: 'wizard',
    canMatch: [AuthGuard],
    loadComponent: () =>
      import('./pages/booking-wizard/booking-wizard.page').then((m) => m.BookingWizardPage),
  },
  {
    path: 'owner',
    loadComponent: () =>
      import('./owner-bookings/owner-bookings.page').then((m) => m.OwnerBookingsPage),
    canMatch: [AuthGuard],
  },
  {
    path: 'owner/:id',
    loadComponent: () =>
      import('./owner-booking-detail/owner-booking-detail.page').then(
        (m) => m.OwnerBookingDetailPage,
      ),
    canMatch: [AuthGuard],
  },
  {
    path: 'pending-approval',
    loadComponent: () =>
      import('./pending-approval/pending-approval.page').then((m) => m.PendingApprovalPage),
    canMatch: [AuthGuard],
  },
  {
    path: 'detail-payment',
    loadComponent: () =>
      import('./booking-detail-payment/booking-detail-payment.page').then(
        (m) => m.BookingRequestPage,
      ),
    canMatch: [AuthGuard],
  },
  {
    path: ':bookingId/detail-payment',
    loadComponent: () =>
      import('./booking-detail-payment/booking-detail-payment.page').then(
        (m) => m.BookingRequestPage,
      ),
    canMatch: [AuthGuard],
  },
  {
    path: 'claims',
    loadComponent: () => import('./claims/my-claims.page').then((m) => m.MyClaimsPage),
    canMatch: [AuthGuard],
  },
  {
    path: 'calendar',
    loadComponent: () => import('../calendar/calendar.page').then((m) => m.CalendarPage),
    canMatch: [AuthGuard],
  },
  {
    path: 'success/:id',
    loadComponent: () =>
      import('./booking-success/booking-success.page').then((m) => m.BookingSuccessPage),
    canMatch: [AuthGuard],
  },
  {
    path: 'urgent/:carId',
    canMatch: [AuthGuard],
    loadComponent: () =>
      import('./urgent-booking/urgent-booking.page').then((m) => m.UrgentBookingPage),
  },
  {
    path: ':id/check-in',
    canMatch: [AuthGuard],
    loadComponent: () => import('./check-in/check-in.page').then((m) => m.CheckInPage),
  },
  {
    path: ':id/check-out',
    canMatch: [AuthGuard],
    loadComponent: () => import('./check-out/check-out.page').then((m) => m.CheckOutPage),
  },
  {
    path: ':id/owner-check-in',
    canMatch: [AuthGuard],
    loadComponent: () =>
      import('./owner-check-in/owner-check-in.page').then((m) => m.OwnerCheckInPage),
  },
  {
    path: ':id/owner-check-out',
    canMatch: [AuthGuard],
    loadComponent: () =>
      import('./owner-check-out/owner-check-out.page').then((m) => m.OwnerCheckOutPage),
  },
  {
    path: ':id/owner-damage-report',
    canMatch: [AuthGuard],
    loadComponent: () =>
      import('./owner-damage-report/owner-damage-report.page').then((m) => m.OwnerDamageReportPage),
  },
  {
    path: ':id/active',
    canMatch: [AuthGuard],
    loadComponent: () =>
      import('./active-rental/active-rental.page').then((m) => m.ActiveRentalPage),
  },
  {
    path: ':id/contract',
    canMatch: [AuthGuard],
    loadComponent: () =>
      import('../contracts/booking-contract.page').then((m) => m.BookingContractPage),
  },
  {
    path: ':id/disputes',
    canMatch: [AuthGuard],
    loadComponent: () =>
      import('./disputes/disputes-management.page').then((m) => m.DisputesManagementPage),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./booking-detail/booking-detail.page').then((m) => m.BookingDetailPage),
  },
  {
    path: ':bookingId/checkout',
    loadComponent: () =>
      import('./pages/booking-checkout/booking-checkout.page').then((m) => m.BookingCheckoutPage),
    canMatch: [AuthGuard],
  },
  {
    path: ':bookingId/payment',
    loadComponent: () =>
      import('./booking-payment/booking-payment.page').then((m) => m.BookingPaymentPage),
    canMatch: [AuthGuard],
  },
  {
    path: ':bookingId/pending',
    loadComponent: () =>
      import('./booking-pending/booking-pending.page').then((m) => m.BookingPendingPage),
    canMatch: [AuthGuard],
  },
  {
    path: ':bookingId/report-claim',
    loadComponent: () => import('./report-claim/report-claim.page').then((m) => m.ReportClaimPage),
    canMatch: [AuthGuard],
  },
  // {
  //   path: ':id/voucher',
  //   loadComponent: () =>
  //     import('./booking-voucher/booking-voucher.page').then((m) => m.BookingVoucherPage),
  //   canActivate: [AuthGuard],
  // },
];
