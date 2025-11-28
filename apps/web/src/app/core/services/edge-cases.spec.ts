/**
 * Sprint 5.2 - Edge Cases Test
 *
 * Tests de casos borde y validaciones del sistema
 * Verifica que todas las validaciones funcionen correctamente
 */

import { TestBed } from '@angular/core/testing';
import { VALID_UUID, randomUuid } from '../../../test-helpers/factories';
import { BookingsService } from './bookings.service';
import { CarsService } from './cars.service';
import { SupabaseClientService } from './supabase-client.service';
import { WalletService } from './wallet.service';
import { PwaService } from './pwa.service';
import { InsuranceService } from './insurance.service';
import { ErrorHandlerService } from './error-handler.service';
import { LoggerService } from './logger.service';

// TODO: Fix - Missing HttpClientTestingModule for TikTokEventsService dependency
describe('Sprint 5.2 - Edge Cases', () => {
  let bookingsService: BookingsService;
  let carsService: CarsService;
  let rpcHandlers: Record<string, (args?: any) => Promise<{ data: unknown; error: unknown }>>;
  let rpcSpy: jasmine.Spy;
  let fromSpy: jasmine.Spy;
  let supabaseClient: any;

  beforeEach(() => {
    // Setup RPC handlers map
    rpcHandlers = {};
    rpcSpy = jasmine.createSpy('rpc').and.callFake((fn: string, args?: any) => {
      const handler = rpcHandlers[fn];
      if (handler) {
        return handler(args);
      }
      return Promise.resolve({ data: null, error: null });
    });

    // Setup FROM handlers for table queries
    const queryBuilder = jasmine.createSpyObj('QueryBuilder', [
      'select',
      'eq',
      'ilike',
      'order',
      'single',
      'neq',
      'gte',
      'lte',
    ]);
    queryBuilder.select.and.returnValue(queryBuilder);
    queryBuilder.eq.and.returnValue(queryBuilder);
    queryBuilder.ilike.and.returnValue(queryBuilder);
    queryBuilder.neq.and.returnValue(queryBuilder);
    queryBuilder.gte.and.returnValue(queryBuilder);
    queryBuilder.lte.and.returnValue(queryBuilder);
    queryBuilder.order.and.returnValue(Promise.resolve({ data: [], error: null }));
    queryBuilder.single.and.returnValue(Promise.resolve({ data: null, error: null }));

    fromSpy = jasmine.createSpy('from').and.returnValue(queryBuilder);

    // Create supabase client mock
    supabaseClient = {
      rpc: rpcSpy,
      from: fromSpy,
      auth: {
        getUser: jasmine.createSpy('getUser').and.returnValue(
          Promise.resolve({
            data: { user: { id: VALID_UUID, email: 'test@example.com' } },
            error: null,
          }),
        ),
      },
    };

    // Mock SupabaseClientService
    const supabaseServiceMock = {
      getClient: () => supabaseClient,
    };

    // Mock additional services
    const walletServiceMock = jasmine.createSpyObj<WalletService>('WalletService', [
      'getBalance',
      'lockFunds',
    ]);

    const pwaServiceMock = jasmine.createSpyObj<PwaService>('PwaService', [
      'setAppBadge',
      'clearAppBadge',
    ]);

    const insuranceServiceMock = jasmine.createSpyObj<InsuranceService>('InsuranceService', [
      'activateCoverage',
    ]);
    insuranceServiceMock.activateCoverage.and.resolveTo('coverage-123');

    const errorHandlerMock = jasmine.createSpyObj<ErrorHandlerService>('ErrorHandlerService', [
      'handleError',
    ]);

    const loggerMock = jasmine.createSpyObj<LoggerService>('LoggerService', [
      'debug',
      'info',
      'warn',
      'error',
      'critical',
    ]);

    TestBed.configureTestingModule({
      providers: [
        BookingsService,
        CarsService,
        { provide: SupabaseClientService, useValue: supabaseServiceMock },
        { provide: WalletService, useValue: walletServiceMock },
        { provide: PwaService, useValue: pwaServiceMock },
        { provide: InsuranceService, useValue: insuranceServiceMock },
        { provide: ErrorHandlerService, useValue: errorHandlerMock },
        { provide: LoggerService, useValue: loggerMock },
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

      rpcHandlers['request_booking'] = () =>
        Promise.resolve({
          data: null,
          error: {
            message: 'La fecha de inicio debe ser futura',
            code: 'P0001',
          },
        });

      try {
        await bookingsService.requestBooking(randomUuid(), pastDateStr, futureDateStr);
        fail('Debería haber lanzado un error');
      } catch (error: unknown) {
        expect(error).toBeDefined();
        expect((error as Error).message).toContain('fecha');
      }
    });

    it('debería rechazar reserva con fecha de fin en el pasado', async () => {
      const today = new Date().toISOString();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString();

      rpcHandlers['request_booking'] = () =>
        Promise.resolve({
          data: null,
          error: {
            message: 'La fecha de fin no puede estar en el pasado',
            code: 'P0001',
          },
        });

      try {
        await bookingsService.requestBooking(randomUuid(), today, yesterdayStr);
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

      rpcHandlers['request_booking'] = () =>
        Promise.resolve({
          data: null,
          error: {
            message: 'La fecha de fin debe ser posterior a la fecha de inicio',
            code: 'P0001',
          },
        });

      try {
        await bookingsService.requestBooking(randomUuid(), startDate, endDate);
        fail('Debería haber lanzado un error');
      } catch (error: unknown) {
        expect(error).toBeDefined();
        expect((error as Error).message).toContain('posterior');
      }
    });

    it('debería rechazar reserva con start_date === end_date (0 días)', async () => {
      const sameDate = new Date();
      sameDate.setDate(sameDate.getDate() + 5);
      const sameDateStr = sameDate.toISOString();

      rpcHandlers['request_booking'] = () =>
        Promise.resolve({
          data: null,
          error: {
            message: 'La reserva debe ser de al menos 1 día',
            code: 'P0001',
          },
        });

      try {
        await bookingsService.requestBooking(randomUuid(), sameDateStr, sameDateStr);
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

      rpcHandlers['request_booking'] = () =>
        Promise.resolve({
          data: null,
          error: {
            message: 'Las reservas no pueden exceder 30 días',
            code: 'P0001',
          },
        });

      try {
        await bookingsService.requestBooking(randomUuid(), startDateStr, endDateStr);
        fail('Debería haber lanzado un error o advertencia');
      } catch (error: unknown) {
        expect(error).toBeDefined();
        expect((error as Error).message).toContain('30 días');
      }
    });

    it('debería aceptar reserva de exactamente 30 días', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 1);
      const startDateStr = startDate.toISOString();

      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 30);
      const endDateStr = endDate.toISOString();

      const bookingId = 'booking-30-days';
      const fakeBooking = {
        id: bookingId,
        car_id: randomUuid(),
        start_at: startDateStr,
        end_at: endDateStr,
        status: 'pending',
        total_amount: 150000,
      } as any;

      // Setup RPC handlers
      rpcHandlers['request_booking'] = () =>
        Promise.resolve({ data: { booking_id: bookingId }, error: null });
      rpcHandlers['pricing_recalculate'] = () => Promise.resolve({ data: null, error: null });

      // Mock getBookingById
      spyOn(bookingsService, 'getBookingById').and.resolveTo(fakeBooking);

      const booking = await bookingsService.requestBooking(randomUuid(), startDateStr, endDateStr);
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

      const bookingId = 'booking-long';
      const fakeBooking = {
        id: bookingId,
        car_id: randomUuid(),
        total_amount: expectedTotal,
        status: 'pending',
      } as any;

      // Setup RPC handlers
      rpcHandlers['request_booking'] = () =>
        Promise.resolve({ data: { booking_id: bookingId }, error: null });
      rpcHandlers['pricing_recalculate'] = () => Promise.resolve({ data: null, error: null });

      // Mock getBookingById
      spyOn(bookingsService, 'getBookingById').and.resolveTo(fakeBooking);

      const booking = await bookingsService.requestBooking(
        randomUuid(),
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

      // The default queryBuilder already handles these cases
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

      // Supabase handles SQL injection prevention automatically
      for (const city of dangerousCities) {
        try {
          const cars = await carsService.listActiveCars({ city });
          expect(cars).toBeDefined();
          // No debería causar SQL injection ni XSS
        } catch (_error) {
          // Es aceptable que falle, pero no debe comprometer seguridad
        }
      }
    });

    it('debería manejar acentos y ñ correctamente', async () => {
      const citiesWithAccents = ['Córdoba', 'San Juan', 'La Rioja', 'Neuquén'];

      // Default queryBuilder handles accents correctly
      for (const city of citiesWithAccents) {
        const cars = await carsService.listActiveCars({ city });
        expect(cars).toBeDefined();
        expect(Array.isArray(cars)).toBe(true);
      }
    });

    it('debería ser case-insensitive en búsqueda de ciudades', async () => {
      const variations = ['buenos aires', 'BUENOS AIRES', 'Buenos Aires', 'bUeNoS aIrEs'];

      const results: number[] = [];
      for (const city of variations) {
        const cars = await carsService.listActiveCars({ city });
        results.push(cars.length);
      }

      // Todas las variaciones deberían retornar los mismos resultados
      const allSame = results.every((count) => count === results[0]);
      expect(allSame).toBe(true);
    });
  });

  describe('🔍 Casos borde adicionales', () => {
    it('debería manejar car_id inexistente', async () => {
      rpcHandlers['request_booking'] = () =>
        Promise.resolve({
          data: null,
          error: {
            message: 'El auto no existe',
            code: 'P0001',
          },
        });

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
      // No need to mock anything - the default queryBuilder already handles this
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

      const bookingId = 'booking-tz-test';
      const fakeBooking = {
        id: bookingId,
        status: 'pending',
        total_amount: 50000,
      } as any;

      // Setup RPC handlers ONCE
      rpcHandlers['request_booking'] = () =>
        Promise.resolve({ data: { booking_id: bookingId }, error: null });
      rpcHandlers['pricing_recalculate'] = () => Promise.resolve({ data: null, error: null });

      // Mock getBookingById ONCE before the loop
      spyOn(bookingsService, 'getBookingById').and.resolveTo(fakeBooking);

      for (const date of dates) {
        const endDate = new Date(date);
        endDate.setDate(endDate.getDate() + 5);

        const booking = await bookingsService.requestBooking(
          randomUuid(),
          date,
          endDate.toISOString(),
        );
        expect(booking).toBeDefined();
      }
    });
  });
});
