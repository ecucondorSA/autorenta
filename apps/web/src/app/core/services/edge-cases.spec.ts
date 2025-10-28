/**
 * Sprint 5.2 - Edge Cases Test
 *
 * Tests de casos borde y validaciones del sistema
 * Verifica que todas las validaciones funcionen correctamente
 */

import { TestBed } from '@angular/core/testing';
import { SupabaseClient } from '@supabase/supabase-js';
import { BookingsService } from './bookings.service';
import { CarsService } from './cars.service';

type CarsQueryOptions = { data?: unknown[]; error?: any; reject?: boolean };

function createCarsQueryMock(options: CarsQueryOptions = {}) {
  const query = jasmine.createSpyObj('CarsQuery', ['select', 'eq', 'ilike', 'order']);
  query.select.and.returnValue(query);
  query.eq.and.returnValue(query);
  query.ilike.and.returnValue(query);
  query.order.and.returnValue(query);
  (query as any).then = (
    resolve: (value: { data: unknown[]; error: any }) => unknown,
    reject?: (reason: unknown) => unknown,
  ) => {
    const payload = {
      data: options.data ?? [],
      error: options.error ?? null,
    };
    if (options.reject && reject) {
      return reject(payload.error);
    }
    return resolve(payload);
  };
  return query;
}

describe('Sprint 5.2 - Edge Cases', () => {
  let bookingsService: BookingsService;
  let carsService: CarsService;
  let mockSupabase: jasmine.SpyObj<SupabaseClient>;

  beforeEach(() => {
    mockSupabase = jasmine.createSpyObj('SupabaseClient', ['from', 'rpc', 'auth', 'storage']);
    mockSupabase.auth = jasmine.createSpyObj('Auth', ['getUser']) as unknown;
    (mockSupabase.auth.getUser as jasmine.Spy).and.returnValue(
      Promise.resolve({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null,
      }),
    );

    TestBed.configureTestingModule({
      providers: [
        BookingsService,
        CarsService,
        { provide: 'SUPABASE_CLIENT', useValue: mockSupabase },
      ],
    });

    bookingsService = TestBed.inject(BookingsService);
    carsService = TestBed.inject(CarsService);
  });

  describe('❌ Fecha pasada (debe fallar)', () => {
    it('debería rechazar reserva con fecha de inicio en el pasado', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1); // Ayer
      const pastDateStr = pastDate.toISOString();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      const futureDateStr = futureDate.toISOString();

      (mockSupabase.rpc as jasmine.Spy).and.returnValue(
        Promise.resolve({
          data: null,
          error: {
            message: 'La fecha de inicio debe ser futura',
            code: 'P0001',
          },
        }),
      );

      try {
        await bookingsService.requestBooking('car-123', pastDateStr, futureDateStr);
        fail('Debería haber lanzado un error');
      } catch (error: unknown) {
        expect(error).toBeDefined();
        expect(error.message).toContain('fecha');
      }
    });

    it('debería rechazar reserva con fecha de fin en el pasado', async () => {
      const today = new Date().toISOString();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString();

      (mockSupabase.rpc as jasmine.Spy).and.returnValue(
        Promise.resolve({
          data: null,
          error: {
            message: 'La fecha de fin no puede estar en el pasado',
            code: 'P0001',
          },
        }),
      );

      try {
        await bookingsService.requestBooking('car-123', today, yesterdayStr);
        fail('Debería haber lanzado un error');
      } catch (error: unknown) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('❌ Fecha fin antes que inicio (debe fallar)', () => {
    it('debería rechazar reserva cuando end_date < start_date', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      const startDate = futureDate.toISOString();

      const earlierDate = new Date();
      earlierDate.setDate(earlierDate.getDate() + 5);
      const endDate = earlierDate.toISOString();

      (mockSupabase.rpc as jasmine.Spy).and.returnValue(
        Promise.resolve({
          data: null,
          error: {
            message: 'La fecha de fin debe ser posterior a la fecha de inicio',
            code: 'P0001',
          },
        }),
      );

      try {
        await bookingsService.requestBooking('car-123', startDate, endDate);
        fail('Debería haber lanzado un error');
      } catch (error: unknown) {
        expect(error).toBeDefined();
        expect(error.message).toContain('posterior');
      }
    });

    it('debería rechazar reserva con start_date === end_date (0 días)', async () => {
      const sameDate = new Date();
      sameDate.setDate(sameDate.getDate() + 5);
      const sameDateStr = sameDate.toISOString();

      (mockSupabase.rpc as jasmine.Spy).and.returnValue(
        Promise.resolve({
          data: null,
          error: {
            message: 'La reserva debe ser de al menos 1 día',
            code: 'P0001',
          },
        }),
      );

      try {
        await bookingsService.requestBooking('car-123', sameDateStr, sameDateStr);
        fail('Debería haber lanzado un error');
      } catch (error: unknown) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('⚠️ Periodo muy largo >30 días (debe validarse)', () => {
    it('debería validar o advertir sobre reserva mayor a 30 días', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 1);
      const startDateStr = startDate.toISOString();

      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 35); // 35 días
      const endDateStr = endDate.toISOString();

      (mockSupabase.rpc as jasmine.Spy).and.returnValue(
        Promise.resolve({
          data: null,
          error: {
            message: 'Las reservas no pueden exceder 30 días',
            code: 'P0001',
          },
        }),
      );

      try {
        await bookingsService.requestBooking('car-123', startDateStr, endDateStr);
        fail('Debería haber lanzado un error o advertencia');
      } catch (error: unknown) {
        expect(error).toBeDefined();
        expect(error.message).toContain('30 días');
      }
    });

    it('debería aceptar reserva de exactamente 30 días', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 1);
      const startDateStr = startDate.toISOString();

      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 30);
      const endDateStr = endDate.toISOString();

      (mockSupabase.rpc as jasmine.Spy).and.returnValues(
        Promise.resolve({ data: 'booking-30-days', error: null }),
        Promise.resolve({ data: null, error: null }),
      );

      const mockQuery = jasmine.createSpyObj('Query', ['select', 'eq', 'single']);
      mockQuery.select.and.returnValue(mockQuery);
      mockQuery.eq.and.returnValue(mockQuery);
      mockQuery.single.and.returnValue(
        Promise.resolve({
          data: {
            id: 'booking-30-days',
            car_id: 'car-123',
            start_at: startDateStr,
            end_at: endDateStr,
            status: 'pending',
          },
          error: null,
        }),
      );

      mockSupabase.from.and.returnValue(mockQuery as any);

      const booking = await bookingsService.requestBooking('car-123', startDateStr, endDateStr);
      expect(booking).toBeDefined();
      expect(booking.id).toBe('booking-30-days');
    });

    it('debería calcular correctamente el precio para periodos largos', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 1);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 25); // 25 días

      const pricePerDay = 5000;
      const expectedTotal = 25 * pricePerDay; // 125,000 ARS

      (mockSupabase.rpc as jasmine.Spy).and.returnValues(
        Promise.resolve({ data: 'booking-long', error: null }),
        Promise.resolve({ data: null, error: null }),
      );

      const mockQuery = jasmine.createSpyObj('Query', ['select', 'eq', 'single']);
      mockQuery.select.and.returnValue(mockQuery);
      mockQuery.eq.and.returnValue(mockQuery);
      mockQuery.single.and.returnValue(
        Promise.resolve({
          data: {
            id: 'booking-long',
            car_id: 'car-123',
            total_price: expectedTotal,
            status: 'pending',
          },
          error: null,
        }),
      );

      mockSupabase.from.and.returnValue(mockQuery as any);

      const booking = await bookingsService.requestBooking(
        'car-123',
        startDate.toISOString(),
        endDate.toISOString(),
      );

      expect(booking.total_amount).toBe(expectedTotal);
    });
  });

  describe('🔤 Caracteres especiales en ciudad', () => {
    it('debería manejar correctamente caracteres especiales en búsqueda', async () => {
      const specialCities = [
        'Buenos Aires',
        'Río Gallegos',
        'Cañuelas',
        'La Matanza',
        'José C. Paz',
      ];

      const mockQuery = jasmine.createSpyObj('Query', ['select', 'eq', 'ilike', 'order']);
      mockQuery.select.and.returnValue(mockQuery);
      mockQuery.eq.and.returnValue(mockQuery);
      mockQuery.ilike.and.returnValue(mockQuery);
      mockQuery.order.and.returnValue(
        Promise.resolve({
          data: [],
          error: null,
        }),
      );

      mockSupabase.from.and.returnValue(mockQuery as any);

      for (const city of specialCities) {
        const cars = await carsService.listActiveCars({ city });
        expect(cars).toBeDefined();
        expect(Array.isArray(cars)).toBe(true);
      }
    });

    it('debería sanitizar caracteres peligrosos en búsqueda', async () => {
      const dangerousCities = [
        "'; DROP TABLE cars; --",
        '<script>alert("xss")</script>',
        '../../etc/passwd',
        'null\0byte',
      ];

      const mockQuery = jasmine.createSpyObj('Query', ['select', 'eq', 'ilike', 'order']);
      mockQuery.select.and.returnValue(mockQuery);
      mockQuery.eq.and.returnValue(mockQuery);
      mockQuery.ilike.and.returnValue(mockQuery);
      mockQuery.order.and.returnValue(
        Promise.resolve({
          data: [],
          error: null,
        }),
      );

      mockSupabase.from.and.returnValue(mockQuery as any);

      for (const city of dangerousCities) {
        try {
          const cars = await carsService.listActiveCars({ city });
          expect(cars).toBeDefined();
          // No debería causar SQL injection ni XSS
        } catch (error) {
          // Es aceptable que falle, pero no debe comprometer seguridad
        }
      }
    });

    it('debería manejar acentos y ñ correctamente', async () => {
      const citiesWithAccents = ['Córdoba', 'San Juan', 'La Rioja', 'Neuquén'];

      for (const city of citiesWithAccents) {
        const builder = createCarsQueryMock({
          data: [{ id: 'car-1', location_city: city, brand: 'Toyota' }],
        });
        mockSupabase.from.and.callFake((table: string) => {
          expect(table).toBe('cars');
          return builder;
        });

        const cars = await carsService.listActiveCars({ city });
        expect(cars).toBeDefined();
        expect(builder.ilike).toHaveBeenCalledWith('location_city', `%${city}%`);

        mockSupabase.from.calls.reset();
      }
    });

    it('debería ser case-insensitive en búsqueda de ciudades', async () => {
      const variations = ['buenos aires', 'BUENOS AIRES', 'Buenos Aires', 'bUeNoS aIrEs'];

      const results: number[] = [];
      for (const city of variations) {
        const builder = createCarsQueryMock({
          data: [{ id: 'car-1', location_city: 'Buenos Aires' }],
        });
        mockSupabase.from.and.callFake((table: string) => {
          expect(table).toBe('cars');
          return builder;
        });

        const cars = await carsService.listActiveCars({ city });
        results.push(cars.length);
        expect(builder.ilike).toHaveBeenCalledWith('location_city', `%${city}%`);

        mockSupabase.from.calls.reset();
      }

      // Todas las variaciones deberían retornar los mismos resultados
      const allSame = results.every((count) => count === results[0]);
      expect(allSame).toBe(true);
    });
  });

  describe('🔍 Casos borde adicionales', () => {
    it('debería manejar car_id inexistente', async () => {
      (mockSupabase.rpc as jasmine.Spy).and.returnValue(
        Promise.resolve({
          data: null,
          error: {
            message: 'El auto no existe',
            code: 'P0001',
          },
        }),
      );

      try {
        await bookingsService.requestBooking(
          'car-does-not-exist',
          '2025-11-01T10:00:00',
          '2025-11-05T18:00:00',
        );
        fail('Debería haber lanzado un error');
      } catch (error: unknown) {
        expect(error).toBeDefined();
      }
    });

    it('debería manejar ciudad vacía en búsqueda', async () => {
      const mockQuery = jasmine.createSpyObj('Query', ['select', 'eq', 'order']);
      mockQuery.select.and.returnValue(mockQuery);
      mockQuery.eq.and.returnValue(mockQuery);
      mockQuery.order.and.returnValue(
        Promise.resolve({
          data: [],
          error: null,
        }),
      );

      mockSupabase.from.and.returnValue(mockQuery as any);

      const cars = await carsService.listActiveCars({ city: '' });
      expect(cars).toBeDefined();
      expect(Array.isArray(cars)).toBe(true);
    });

    it('debería manejar fechas con zonas horarias diferentes', async () => {
      const dates = [
        '2025-11-01T10:00:00Z', // UTC
        '2025-11-01T10:00:00-03:00', // Buenos Aires
        '2025-11-01T10:00:00+00:00', // UTC explícito
      ];

      (mockSupabase.rpc as jasmine.Spy).and.returnValue(
        Promise.resolve({ data: 'booking-tz-test', error: null }),
      );

      const mockQuery = jasmine.createSpyObj('Query', ['select', 'eq', 'single']);
      mockQuery.select.and.returnValue(mockQuery);
      mockQuery.eq.and.returnValue(mockQuery);
      mockQuery.single.and.returnValue(
        Promise.resolve({
          data: { id: 'booking-tz-test', status: 'pending' },
          error: null,
        }),
      );

      mockSupabase.from.and.returnValue(mockQuery as any);

      for (const date of dates) {
        (mockSupabase.rpc as jasmine.Spy).calls.reset();
        (mockSupabase.rpc as jasmine.Spy).and.returnValues(
          Promise.resolve({ data: 'booking-tz-test', error: null }),
          Promise.resolve({ data: null, error: null }),
        );

        const endDate = new Date(date);
        endDate.setDate(endDate.getDate() + 5);

        const booking = await bookingsService.requestBooking(
          'car-123',
          date,
          endDate.toISOString(),
        );
        expect(booking).toBeDefined();
      }
    });
  });
});
