import { Routes } from '@angular/router';
import { GuestGuard } from '@core/guards/guest.guard';

export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    // TODO(human): Add title for login route (e.g., title: 'Iniciar Sesión')
    canActivate: [GuestGuard],
    data: { layout: 'full-bleed', hideFooter: true, hideMobileNav: true },
    loadComponent: () => import('./login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    // TODO(human): Add title for register route (e.g., title: 'Crear Cuenta')
    canActivate: [GuestGuard],
    data: { layout: 'full-bleed', hideFooter: true, hideMobileNav: true },
    loadComponent: () => import('./register/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'reset-password',
    canActivate: [GuestGuard],
    data: { layout: 'full-bleed', hideFooter: true, hideMobileNav: true },
    loadComponent: () =>
      import('./reset-password/reset-password.page').then((m) => m.ResetPasswordPage),
  },
  {
    path: 'callback',
    // No GuestGuard - permite acceso durante el proceso OAuth
    data: { layout: 'full-bleed', hideFooter: true, hideMobileNav: true },
    loadComponent: () => import('./callback/auth-callback.page').then((m) => m.AuthCallbackPage),
  },
  {
    path: 'mercadopago/callback',
    // Callback de OAuth de MercadoPago (sin guard, permite acceso durante OAuth)
    data: { layout: 'full-bleed', hideFooter: true, hideMobileNav: true },
    loadComponent: () =>
      import('./mercadopago-callback.page').then((m) => m.MercadoPagoCallbackPage),
  },
];
