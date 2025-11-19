import { Routes } from '@angular/router';
import { AuthGuard } from '../core/guards/auth.guard';
import { TabsPage } from './tabs.page';

export const TABS_ROUTES: Routes = [
  {
    path: '',
    component: TabsPage,
    children: [
      {
        path: 'home',
        loadComponent: () => import('../features/home/home.page').then((m) => m.HomePage),
      },
      {
        path: 'explore',
        loadComponent: () => import('../features/explore/explore.page').then((m) => m.ExplorePage),
      },
      {
        path: 'bookings',
        canMatch: [AuthGuard],
        loadChildren: () =>
          import('../features/bookings/bookings.routes').then((m) => m.BOOKINGS_ROUTES),
      },
      {
        path: 'profile',
        canMatch: [AuthGuard],
        loadComponent: () =>
          import('../features/profile/profile-expanded.page').then((m) => m.ProfileExpandedPage),
      },
      {
        path: '',
        redirectTo: '/tabs/home',
        pathMatch: 'full',
      },
    ],
  },
];
