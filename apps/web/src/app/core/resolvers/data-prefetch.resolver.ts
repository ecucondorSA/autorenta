import { inject } from '@angular/core';
import { ResolveFn, ActivatedRouteSnapshot } from '@angular/router';
import { BookingsService } from '@core/services/bookings/bookings.service';
import { CarsService } from '@core/services/cars/cars.service';
import { ProfileService } from '@core/services/auth/profile.service';
import { Booking } from '@core/models';
import type { Car, UserProfile } from '@core/models';

/**
 * P1-030 FIX: Data Prefetching Resolvers
 *
 * Preload data before route activation for instant page loads
 *
 * Usage in routes:
 * ```ts
 * {
 *   path: 'bookings/:id',
 *   component: BookingDetailComponent,
 *   resolve: {
 *     booking: bookingPrefetchResolver
 *   }
 * }
 * ```
 */

/**
 * Prefetch booking data
 */
export const bookingPrefetchResolver: ResolveFn<Booking | null> = async (
  route: ActivatedRouteSnapshot,
) => {
  const bookingsService = inject(BookingsService);
  const bookingId = route.paramMap.get('id');

  if (!bookingId) {
    return null;
  }

  try {
    return await bookingsService.getBookingById(bookingId);
  } catch (error) {
    console.error('[Resolver] Failed to prefetch booking:', error);
    return null;
  }
};

/**
 * Prefetch car data
 */
export const carPrefetchResolver: ResolveFn<Car | null> = async (route: ActivatedRouteSnapshot) => {
  const carsService = inject(CarsService);
  const carId = route.paramMap.get('id');

  if (!carId) {
    return null;
  }

  try {
    return await carsService.getCarById(carId);
  } catch (error) {
    console.error('[Resolver] Failed to prefetch car:', error);
    return null;
  }
};

/**
 * Prefetch user bookings list
 */
export const myBookingsPrefetchResolver: ResolveFn<{
  bookings: Booking[];
  total: number;
}> = async () => {
  const bookingsService = inject(BookingsService);

  try {
    return await bookingsService.getMyBookings({ limit: 20, offset: 0 });
  } catch (error) {
    console.error('[Resolver] Failed to prefetch bookings:', error);
    return { bookings: [], total: 0 };
  }
};

/**
 * Prefetch user profile
 */
export const profilePrefetchResolver: ResolveFn<UserProfile | null> = async () => {
  const profileService = inject(ProfileService);

  try {
    return await profileService.getCurrentProfile();
  } catch (error) {
    console.error('[Resolver] Failed to prefetch profile:', error);
    return null;
  }
};

/**
 * Prefetch owner bookings list
 */
export const ownerBookingsPrefetchResolver: ResolveFn<{
  bookings: Booking[];
  total: number;
}> = async () => {
  const bookingsService = inject(BookingsService);

  try {
    return await bookingsService.getOwnerBookings({ limit: 20, offset: 0 });
  } catch (error) {
    console.error('[Resolver] Failed to prefetch owner bookings:', error);
    return { bookings: [], total: 0 };
  }
};
