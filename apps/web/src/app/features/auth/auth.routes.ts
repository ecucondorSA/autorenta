import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./register/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./reset-password/reset-password.page').then((m) => m.ResetPasswordPage),
  },
];
