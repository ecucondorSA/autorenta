import { Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';

export const VERIFICATION_ROUTES: Routes = [
  {
    path: '',
    canMatch: [AuthGuard],
    loadComponent: () => import('./verification.page').then((m) => m.VerificationPage),
  },
];
