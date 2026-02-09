import { Routes } from '@angular/router';
import { AuthGuard } from '@core/guards/auth.guard';

export const CONTACT_VERIFICATION_ROUTES: Routes = [
  {
    path: '',
    canMatch: [AuthGuard],
    loadComponent: () =>
      import('./contact-verification.page').then((m) => m.ContactVerificationPage),
  },
];
