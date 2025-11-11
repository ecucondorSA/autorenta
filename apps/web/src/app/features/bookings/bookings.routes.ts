import { Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';

export const BOOKINGS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./my-bookings/my-bookings.page').then((m) => m.MyBookingsPage),
  },
  {
    path: 'owner',
    loadComponent: () =>
      import('./owner-bookings/owner-bookings.page').then((m) => m.OwnerBookingsPage),
    canActivate: [AuthGuard],
  },
  {
    path: 'pending-approval',
    loadComponent: () =>
      import('./pending-approval/pending-approval.page').then((m) => m.PendingApprovalPage),
    canActivate: [AuthGuard],
  },
  {
    path: 'detail-payment',
    loadComponent: () =>
      import('./booking-detail-payment/booking-detail-payment.page').then(
        (m) => m.BookingDetailPaymentPage,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'success/:id',
    loadComponent: () =>
      import('./booking-success/booking-success.page').then((m) => m.BookingSuccessPage),
    canActivate: [AuthGuard],
  },
  {
    path: 'urgent/:carId',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./urgent-booking/urgent-booking.page').then((m) => m.UrgentBookingPage),
  },
  {
    path: ':id/check-in',
    canActivate: [AuthGuard],
    loadComponent: () => import('./check-in/check-in.page').then((m) => m.CheckInPage),
  },
  {
    path: ':id/check-out',
    canActivate: [AuthGuard],
    loadComponent: () => import('./check-out/check-out.page').then((m) => m.CheckOutPage),
  },
  {
    path: ':id/owner-check-in',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./owner-check-in/owner-check-in.page').then((m) => m.OwnerCheckInPage),
  },
  {
    path: ':id/owner-check-out',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./owner-check-out/owner-check-out.page').then((m) => m.OwnerCheckOutPage),
  },
  {
    path: ':id/owner-damage-report',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./owner-damage-report/owner-damage-report.page').then((m) => m.OwnerDamageReportPage),
  },
  {
    path: ':id/contract',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('../contracts/booking-contract.page').then((m) => m.BookingContractPage),
  },
  {
    path: ':id/disputes',
    canActivate: [AuthGuard],
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
    canActivate: [AuthGuard],
  },
  {
    path: ':bookingId/checkout-wizard',
    loadComponent: () =>
      import('./pages/booking-checkout-wizard/booking-checkout-wizard.page').then(
        (m) => m.BookingCheckoutWizardPage,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: ':bookingId/report-claim',
    loadComponent: () => import('./report-claim/report-claim.page').then((m) => m.ReportClaimPage),
    canActivate: [AuthGuard],
  },
  {
    path: 'claims',
    loadComponent: () => import('./claims/my-claims.page').then((m) => m.MyClaimsPage),
    canActivate: [AuthGuard],
  },
  // {
  //   path: ':id/voucher',
  //   loadComponent: () =>
  //     import('./booking-voucher/booking-voucher.page').then((m) => m.BookingVoucherPage),
  //   canActivate: [AuthGuard],
  // },
];
