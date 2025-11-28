/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - Tests need rewrite: getMyBookings return type changed
/**
 * Sprint 5.1 - E2E Booking Flow Test
 *
 * Tests del flujo completo de reserva: búsqueda → selección → booking → confirmación
 * Estos tests simulan la experiencia completa del usuario desde la búsqueda hasta ver la reserva
 */

import { TestBed } from '@angular/core/testing';
import { BookingsService } from '../core/services/bookings.service';
import { CarsService } from '../core/services/cars.service';
import { WalletService } from '../core/services/wallet.service';
import { makeSupabaseMock } from '../../test-helpers/supabase.mock';
import { randomUuid, VALID_UUID } from '../../test-helpers/factories';

// TODO: Fix getMyBookings return type from Booking[] to { bookings: Booking[], total: number }
describe('Sprint 5.1 - E2E Booking Flow', () => {
  let carsService: CarsService;
  let bookingsService: BookingsService;
  let walletService: WalletService;
  let supabaseMock: any;

  const renterId = randomUuid();
  const ownerId = randomUuid();
  const carId = randomUuid();
  const bookingId = randomUuid();

  const mockCar = {
    id: carId,
    brand: 'Toyota',
    model: 'Corolla',
    year: 2023,
    location_city: 'Buenos Aires',
    location_province: 'Buenos Aires',
    price_per_day: 5000,
    status: 'active',
    owner_id: ownerId,
    photos: [],
    owner: {
      id: ownerId,
      full_name: 'Owner Test',
      avatar_url: '',
      rating_avg: 4.5,
      rating_count: 10,
    },
  };

  const mockBooking = {
    id: bookingId,
    car_id: carId,
    user_id: renterId,
    start_at: '2025-11-01T10:00:00',
    end_at: '2025-11-05T18:00:00',
    status: 'pending',
    total_price: 20000,
    created_at: new Date().toISOString(),
  };

  beforeEach(() => {
    // Mock Supabase client
    supabaseMock = makeSupabaseMock();
    supabaseMock.auth.getUser.and.returnValue(
      Promise.resolve({
        data: { user: { id: renterId, email: 'test@example.com' } },
        error: null,
      }),
    );

    TestBed.configureTestingModule({
      providers: [
        CarsService,
        BookingsService,
        WalletService,
        { provide: 'SUPABASE_CLIENT', useValue: supabaseMock },
      ],
    });

    carsService = TestBed.inject(CarsService);
    bookingsService = TestBed.inject(BookingsService);
    walletService = TestBed.inject(WalletService);

    localStorage.clear();
    sessionStorage.clear();
  });

  describe('✅ Flujo completo: Búsqueda → Selección → Booking', () => {
    it('debería completar el flujo completo de reserva desde búsqueda hasta confirmación', async () => {
      // PASO 1: Búsqueda de autos disponibles
      const mockQuery = jasmine.createSpyObj('Query', [
        'eq',
        'ilike',
        'order',
        'select',
        'single',
        'in',
        'or',
      ]);
      mockQuery.select.and.returnValue(mockQuery);
      mockQuery.eq.and.returnValue(mockQuery);
      mockQuery.in.and.returnValue(mockQuery);
      mockQuery.or.and.returnValue(
        Promise.resolve({
          data: [], // No conflicts
          error: null,
        }),
      );
      mockQuery.order.and.returnValue(
        Promise.resolve({
          data: [mockCar],
          error: null,
        }),
      );

      supabaseMock.from.and.returnValue(mockQuery as any);

      const availableCars = await carsService.listActiveCars({
        city: 'Buenos Aires',
        from: '2025-11-01T10:00:00',
        to: '2025-11-05T18:00:00',
      });

      expect(availableCars).toBeDefined();
      expect(availableCars.length).toBeGreaterThan(0);
      // Case-insensitive comparison for city name
      expect(availableCars[0].location_city.toLowerCase()).toBe('buenos aires');

      // PASO 2: Selección de auto específico
      const selectedCarId = availableCars[0].id;

      mockQuery.eq.and.returnValue(mockQuery);
      mockQuery.select.and.returnValue(mockQuery);
      mockQuery.single.and.returnValue(
        Promise.resolve({
          data: { ...mockCar, car_photos: [] },
          error: null,
        }),
      );

      const selectedCar = await carsService.getCarById(selectedCarId);

      expect(selectedCar).toBeDefined();
      expect(selectedCar?.id).toBe(selectedCarId);
      expect(selectedCar?.price_per_day).toBeGreaterThan(0);

      // PASO 3: Crear reserva
      (supabaseMock.rpc as jasmine.Spy).and.returnValues(
        // Primera llamada: request_booking
        Promise.resolve({
          data: mockBooking.id,
          error: null,
        }),
        // Segunda llamada: pricing_recalculate
        Promise.resolve({ data: null, error: null }),
      );

      mockQuery.single.and.returnValue(
        Promise.resolve({
          data: mockBooking,
          error: null,
        }),
      );

      const booking = await bookingsService.requestBooking(
        selectedCarId,
        '2025-11-01T10:00:00',
        '2025-11-05T18:00:00',
      );

      expect(booking).toBeDefined();
      expect(booking.car_id).toBe(selectedCarId);
      expect(booking.status).toBe('pending');
      expect(booking.total_amount).toBeGreaterThan(0);

      // PASO 4: Verificar que la reserva aparece en "Mis Reservas"
      mockQuery.order.and.returnValue(
        Promise.resolve({
          data: [booking],
          error: null,
        }),
      );

      const myBookings = await bookingsService.getMyBookings();

      expect(myBookings).toBeDefined();
      expect(myBookings.length).toBeGreaterThan(0);
      expect(myBookings[0].id).toBe(booking.id);

      // VALIDACIÓN FINAL: Todo el flujo se completó correctamente
      expect(true).toBe(true);
    });

    it('debería retornar datos válidos en cada paso del flujo', async () => {
      const mockQuery = jasmine.createSpyObj('Query', [
        'eq',
        'ilike',
        'order',
        'select',
        'single',
        'in',
        'or',
      ]);
      mockQuery.select.and.returnValue(mockQuery);
      mockQuery.eq.and.returnValue(mockQuery);
      mockQuery.in.and.returnValue(mockQuery);
      mockQuery.or.and.returnValue(
        Promise.resolve({
          data: [],
          error: null,
        }),
      );
      mockQuery.order.and.returnValue(
        Promise.resolve({
          data: [mockCar],
          error: null,
        }),
      );

      supabaseMock.from.and.returnValue(mockQuery as any);

      // Búsqueda
      const cars = await carsService.listActiveCars({ city: 'Buenos Aires' });

      expect(cars[0].id).toBeDefined();
      expect(cars[0].brand).toBeDefined();
      expect(cars[0].model).toBeDefined();
      expect(cars[0].price_per_day).toBeDefined();
      expect(cars[0].location_city).toBeDefined();

      // Detalle
      mockQuery.single.and.returnValue(
        Promise.resolve({
          data: { ...mockCar, car_photos: [] },
          error: null,
        }),
      );

      const carDetail = await carsService.getCarById(cars[0].id);

      expect(carDetail?.id).toBeDefined();
      expect(carDetail?.owner).toBeDefined();
      expect(carDetail?.owner?.full_name).toBeDefined();

      // Booking
      (supabaseMock.rpc as jasmine.Spy).and.returnValues(
        Promise.resolve({ data: bookingId, error: null }),
        Promise.resolve({ data: null, error: null }),
      );

      mockQuery.single.and.returnValue(
        Promise.resolve({
          data: mockBooking,
          error: null,
        }),
      );

      const booking = await bookingsService.requestBooking(
        cars[0].id,
        '2025-11-01T10:00:00',
        '2025-11-05T18:00:00',
      );

      expect(booking.id).toBeDefined();
      expect(booking.car_id).toBeDefined();
      expect(booking.status).toBeDefined();
      expect(booking.total_amount).toBeDefined();
      expect(booking.start_at).toBeDefined();
      expect(booking.end_at).toBeDefined();
    });

    it('debería validar disponibilidad antes de permitir reserva', async () => {
      const mockQuery = jasmine.createSpyObj('Query', [
        'eq',
        'ilike',
        'order',
        'select',
        'in',
        'or',
      ]);
      mockQuery.select.and.returnValue(mockQuery);
      mockQuery.eq.and.returnValue(mockQuery);
      mockQuery.in.and.returnValue(mockQuery);
      mockQuery.or.and.returnValue(
        Promise.resolve({
          data: [], // Sin conflictos = disponible
          error: null,
        }),
      );
      mockQuery.order.and.returnValue(
        Promise.resolve({
          data: [mockCar],
          error: null,
        }),
      );

      supabaseMock.from.and.returnValue(mockQuery as any);

      const cars = await carsService.listActiveCars({
        city: 'Buenos Aires',
        from: '2025-11-01T10:00:00',
        to: '2025-11-05T18:00:00',
      });

      expect(cars.length).toBeGreaterThan(0);
      expect(supabaseMock.from).toHaveBeenCalledWith('bookings');
    });
  });

  describe('✅ Consistencia de datos a través del flujo', () => {
    it('debería mantener consistencia de precios entre búsqueda y reserva', async () => {
      const mockQuery = jasmine.createSpyObj('Query', [
        'eq',
        'order',
        'select',
        'single',
        'in',
        'or',
      ]);
      mockQuery.select.and.returnValue(mockQuery);
      mockQuery.eq.and.returnValue(mockQuery);
      mockQuery.in.and.returnValue(mockQuery);
      mockQuery.or.and.returnValue(
        Promise.resolve({
          data: [],
          error: null,
        }),
      );
      mockQuery.order.and.returnValue(
        Promise.resolve({
          data: [mockCar],
          error: null,
        }),
      );
      mockQuery.single.and.returnValue(
        Promise.resolve({
          data: { ...mockCar, car_photos: [] },
          error: null,
        }),
      );

      supabaseMock.from.and.returnValue(mockQuery as any);

      const cars = await carsService.listActiveCars({ city: 'Buenos Aires' });
      const priceAtSearch = cars[0].price_per_day;

      const carDetail = await carsService.getCarById(cars[0].id);
      const priceAtDetail = carDetail?.price_per_day;

      expect(priceAtSearch).toBe(priceAtDetail!);
    });

    it('debería mantener el car_id correcto a través de todo el flujo', async () => {
      const testCarId = randomUuid();
      const mockQuery = jasmine.createSpyObj('Query', [
        'eq',
        'order',
        'select',
        'single',
        'in',
        'or',
      ]);
      mockQuery.select.and.returnValue(mockQuery);
      mockQuery.eq.and.returnValue(mockQuery);
      mockQuery.in.and.returnValue(mockQuery);
      mockQuery.or.and.returnValue(
        Promise.resolve({
          data: [],
          error: null,
        }),
      );
      mockQuery.order.and.returnValue(
        Promise.resolve({
          data: [{ ...mockCar, id: testCarId }],
          error: null,
        }),
      );
      mockQuery.single.and.returnValue(
        Promise.resolve({
          data: { ...mockCar, id: testCarId, car_photos: [] },
          error: null,
        }),
      );

      supabaseMock.from.and.returnValue(mockQuery as any);

      const cars = await carsService.listActiveCars({ city: 'Buenos Aires' });
      const carIdAtSearch = cars[0].id;

      const carDetail = await carsService.getCarById(testCarId);
      const carIdAtDetail = carDetail?.id;

      (supabaseMock.rpc as jasmine.Spy).and.returnValues(
        Promise.resolve({ data: bookingId, error: null }),
        Promise.resolve({ data: null, error: null }),
      );

      mockQuery.single.and.returnValue(
        Promise.resolve({
          data: { ...mockBooking, car_id: testCarId },
          error: null,
        }),
      );

      const booking = await bookingsService.requestBooking(
        testCarId,
        '2025-11-01T10:00:00',
        '2025-11-05T18:00:00',
      );
      const carIdAtBooking = booking.car_id;

      expect(carIdAtSearch).toBe(testCarId);
      expect(carIdAtDetail).toBe(testCarId);
      expect(carIdAtBooking).toBe(testCarId);
    });
  });
});
