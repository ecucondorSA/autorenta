import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/cars/list/cars-list.page').then((m) => m.CarsListPage),
  },
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'cars',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/cars/list/cars-list.page').then((m) => m.CarsListPage),
      },
      {
        path: 'publish',
        canMatch: [AuthGuard],
        loadComponent: () =>
          import('./features/cars/publish/publish-car.page').then((m) => m.PublishCarPage),
      },
      {
        path: 'my',
        canMatch: [AuthGuard],
        loadComponent: () =>
          import('./features/cars/my-cars/my-cars.page').then((m) => m.MyCarsPage),
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./features/cars/detail/car-detail.page').then((m) => m.CarDetailPage),
      },
    ],
  },
  {
    path: 'bookings',
    canMatch: [AuthGuard],
    loadChildren: () =>
      import('./features/bookings/bookings.routes').then((m) => m.BOOKINGS_ROUTES),
  },
  {
    path: 'admin',
    canMatch: [AuthGuard],
    loadComponent: () =>
      import('./features/admin/admin-dashboard.page').then((m) => m.AdminDashboardPage),
  },
  {
    path: 'profile',
    canMatch: [AuthGuard],
    loadComponent: () =>
      import('./features/profile/profile.page').then((m) => m.ProfilePage),
  },
  { path: '**', redirectTo: '' },
];
