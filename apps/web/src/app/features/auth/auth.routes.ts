import { Routes } from '@angular/router';
import { GuestGuard } from '../../core/guards/guest.guard';

export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    canMatch: [GuestGuard],
    loadComponent: () => import('./login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    canMatch: [GuestGuard],
    loadComponent: () => import('./register/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'reset-password',
    canMatch: [GuestGuard],
    loadComponent: () =>
      import('./reset-password/reset-password.page').then((m) => m.ResetPasswordPage),
  },
  {
    path: 'callback',
    // No GuestGuard - permite acceso durante el proceso OAuth
    loadComponent: () => import('./callback/auth-callback.page').then((m) => m.AuthCallbackPage),
  },
  {
    path: 'mercadopago/callback',
    // Callback de OAuth de MercadoPago (sin guard, permite acceso durante OAuth)
    loadComponent: () => import('./mercadopago-callback.page').then((m) => m.MercadoPagoCallbackPage),
  },
];
