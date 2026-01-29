import { Injectable, inject } from '@angular/core';
import { Booking, Car, CarPhoto } from '@core/models';
import { getErrorMessage } from '@core/utils/type-guards';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';

/**
 * BookingDataLoaderService
 *
 * Responsable de:
 * - Cargar detalles del auto para un booking
 * - Cargar cobertura de seguro para un booking
 * - Hidratar objetos de booking con datos relacionados
 *
 * Optimizado para carga paralela cuando sea posible.
 *
 * Extraído de BookingsService para mejor separación de responsabilidades.
 */
@Injectable({
  providedIn: 'root',
})
export class BookingDataLoaderService {
  private readonly supabase = injectSupabase();
  private readonly logger = inject(LoggerService);

  // ============================================================================
  // CAR DETAILS LOADING
  // ============================================================================

  /**
   * Load car details for a booking
   * Mutates the booking object with car data
   *
   * @param booking - Booking to hydrate with car details
   * @throws Error if car loading fails
   */
  async loadCarDetails(booking: Booking): Promise<void> {
    if (!booking.car_id) {
      return;
    }

    try {
      const { data: car, error: carError } = await this.supabase
        .from('cars')
        .select(
          'id, owner_id, title, brand, model, year, fuel_policy, mileage_limit, extra_km_price, allow_smoking, allow_pets, allow_rideshare, max_distance_km, car_photos(id, url, stored_path, position, sort_order, created_at)',
        )
        .eq('id', booking.car_id)
        .single();

      if (!carError && car) {
        const rawPhotos = (car as unknown as { car_photos?: unknown }).car_photos;
        const photos = Array.isArray(rawPhotos)
          ? (rawPhotos as Array<Record<string, unknown>>)
          : [];
        const images = photos
          .map((p) => {
            const url = p['url'];
            return typeof url === 'string' ? url : null;
          })
          .filter((url): url is string => Boolean(url));

        (booking as Booking).car = {
          ...(car as Partial<Car>),
          car_photos: photos as unknown as CarPhoto[],
          photos: photos as unknown as CarPhoto[],
          images,
        } as Partial<Car>;
      } else if (carError) {
        this.logger.error(
          'Car query error',
          'BookingDataLoader',
          carError instanceof Error ? carError : new Error(getErrorMessage(carError)),
        );
      }
    } catch (carException) {
      this.logger.error(
        'Error loading car details',
        'BookingDataLoader',
        carException instanceof Error ? carException : new Error(getErrorMessage(carException)),
      );
      throw new Error(
        `Failed to load car details: ${carException instanceof Error ? carException.message : getErrorMessage(carException)}`,
      );
    }
  }

  // ============================================================================
  // INSURANCE COVERAGE LOADING
  // ============================================================================

  /**
   * Load insurance coverage for a booking
   * Mutates the booking object with insurance coverage data
   *
   * @param booking - Booking to hydrate with insurance coverage
   * @throws Error if coverage loading fails
   */
  async loadInsuranceCoverage(booking: Booking): Promise<void> {
    if (!booking.insurance_coverage_id) {
      return;
    }

    try {
      const { data: coverage, error: coverageError } = await this.supabase
        .from('booking_insurance_coverage')
        .select('*')
        .eq('id', booking.insurance_coverage_id)
        .single();

      if (!coverageError && coverage) {
        // Load policy if available
        if (coverage.policy_id) {
          const { data: policy, error: policyError } = await this.supabase
            .from('insurance_policies')
            .select('*')
            .eq('id', coverage.policy_id)
            .single();

          if (!policyError && policy) {
            (coverage as Record<string, unknown>)['policy'] = policy;
          } else if (policyError) {
            this.logger.error(
              'Policy query error',
              'BookingDataLoader',
              policyError instanceof Error ? policyError : new Error(getErrorMessage(policyError)),
            );
            throw new Error(`Failed to load policy: ${policyError.message}`);
          }
        }

        (booking as Booking).insurance_coverage = coverage;
      } else if (coverageError) {
        this.logger.error(
          'Coverage query error',
          'BookingDataLoader',
          coverageError instanceof Error
            ? coverageError
            : new Error(getErrorMessage(coverageError)),
        );
        throw new Error(`Failed to load coverage: ${coverageError.message}`);
      }
    } catch (coverageException) {
      this.logger.error(
        'Error loading coverage details',
        'BookingDataLoader',
        coverageException instanceof Error
          ? coverageException
          : new Error(getErrorMessage(coverageException)),
      );
      throw new Error(
        `Failed to load insurance coverage: ${coverageException instanceof Error ? coverageException.message : getErrorMessage(coverageException)}`,
      );
    }
  }

  // ============================================================================
  // BATCH LOADING
  // ============================================================================

  /**
   * Load all related data for a booking in parallel
   *
   * @param booking - Booking to hydrate
   */
  async loadAllRelatedData(booking: Booking): Promise<void> {
    const loadPromises: Promise<void>[] = [];

    if (booking.car_id) {
      loadPromises.push(this.loadCarDetails(booking));
    }

    if (booking.insurance_coverage_id) {
      loadPromises.push(this.loadInsuranceCoverage(booking));
    }

    if (loadPromises.length > 0) {
      await Promise.all(loadPromises);
    }
  }

  /**
   * Load car details for multiple bookings in batch
   *
   * @param bookings - Bookings to hydrate
   */
  async loadCarDetailsForMany(bookings: Booking[]): Promise<void> {
    const carIds = [...new Set(bookings.map((b) => b.car_id).filter(Boolean))] as string[];

    if (carIds.length === 0) return;

    try {
      const { data: cars, error } = await this.supabase
        .from('cars')
        .select(
          'id, owner_id, title, brand, model, year, fuel_policy, car_photos(id, url, stored_path, position)',
        )
        .in('id', carIds);

      if (error) {
        this.logger.error('Batch car query error', 'BookingDataLoader', error);
        return;
      }

      if (!cars) return;

      // Create a map for quick lookup
      const carMap = new Map<string, unknown>();
      for (const car of cars) {
        carMap.set(car.id, car);
      }

      // Hydrate bookings
      for (const booking of bookings) {
        if (booking.car_id && carMap.has(booking.car_id)) {
          const car = carMap.get(booking.car_id) as Record<string, unknown>;
          const rawPhotos = car['car_photos'];
          const photos = Array.isArray(rawPhotos)
            ? (rawPhotos as Array<Record<string, unknown>>)
            : [];
          const images = photos
            .map((p) => (typeof p['url'] === 'string' ? p['url'] : null))
            .filter((url): url is string => Boolean(url));

          (booking as Booking).car = {
            ...car,
            car_photos: photos as unknown as CarPhoto[],
            photos: photos as unknown as CarPhoto[],
            images,
          } as Partial<Car>;
        }
      }
    } catch (err) {
      this.logger.error(
        'Batch car loading error',
        'BookingDataLoader',
        err instanceof Error ? err : new Error(getErrorMessage(err)),
      );
    }
  }
}
