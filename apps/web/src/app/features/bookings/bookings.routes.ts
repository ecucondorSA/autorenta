import { Routes } from '@angular/router';

export const BOOKINGS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./my-bookings/my-bookings.page').then((m) => m.MyBookingsPage),
  },
  {
    path: ':id',
    loadComponent: () => import('./booking-detail/booking-detail.page').then((m) => m.BookingDetailPage),
  },
  {
    path: 'checkout/:bookingId',
    loadComponent: () => import('./checkout/checkout.page').then((m) => m.CheckoutPage),
  },
];
