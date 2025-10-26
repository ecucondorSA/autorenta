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
    path: 'detail-payment',
    loadComponent: () =>
      import('./booking-detail-payment/booking-detail-payment.page').then(
        (m) => m.BookingDetailPaymentPage
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
    path: ':id',
    loadComponent: () => import('./booking-detail/booking-detail.page').then((m) => m.BookingDetailPage),
  },
  {
    path: ':bookingId/report-claim',
    loadComponent: () => import('./report-claim/report-claim.page').then((m) => m.ReportClaimPage),
    canActivate: [AuthGuard],
  },
  {
    path: 'checkout/:bookingId',
    loadComponent: () => import('./checkout/checkout.page').then((m) => m.CheckoutPage),
  },
  // {
  //   path: ':id/voucher',
  //   loadComponent: () =>
  //     import('./booking-voucher/booking-voucher.page').then((m) => m.BookingVoucherPage),
  //   canActivate: [AuthGuard],
  // },
];