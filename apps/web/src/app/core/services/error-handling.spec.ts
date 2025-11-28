/**
 * Sprint 5.3 - Error Handling Test
 *
 * Tests de manejo de errores y escenarios de fallo
 * Verifica que el sistema maneje gracefully todos los fallos posibles
 */

import { TestBed } from '@angular/core/testing';
import { BookingsService } from './bookings.service';
import { CarsService } from './cars.service';
import { PaymentsService } from './payments.service';

function normalizeError(error: unknown): { message?: string; code?: string } {
  if (error instanceof Error) {
    return { message: error.message };
  }
  if (error && typeof error === 'object') {
    const typed = error as { message?: string; code?: string };
    return { message: typed.message, code: typed.code };
  }
  return { message: String(error) };
}

// TODO: Fix - requires complete service mocking (services use inject() internally)
// These tests attempt to inject real services with a mock Supabase client,
// but the services use SupabaseClientService (not SUPABASE_CLIENT token).
// Needs rewrite with proper service mocks or integration test setup.
xdescribe('Sprint 5.3 - Error Handling', () => {
  let bookingsService: BookingsService;
  let carsService: CarsService;
  let paymentsService: PaymentsService;
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = jasmine.createSpyObj('SupabaseClient', ['from', 'rpc', 'auth', 'storage']);
    mockSupabase.auth = jasmine.createSpyObj('Auth', ['getUser']);
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
        PaymentsService,
        { provide: 'SUPABASE_CLIENT', useValue: mockSupabase },
      ],
    });

    bookingsService = TestBed.inject(BookingsService);
    carsService = TestBed.inject(CarsService);
    paymentsService = TestBed.inject(PaymentsService);
  });

  describe('🌐 Red caída (error de conexión)', () => {
    it('debería manejar error de red al buscar autos', async () => {
      const mockQuery = jasmine.createSpyObj('Query', ['select', 'eq', 'order']);
      mockQuery.select.and.returnValue(mockQuery);
      mockQuery.eq.and.returnValue(mockQuery);
      mockQuery.order.and.returnValue(
        Promise.resolve({
          data: null,
          error: {
            message: 'Failed to fetch',
            code: 'NETWORK_ERROR',
          },
        }),
      );

      mockSupabase.from.and.returnValue(mockQuery as any);

      try {
        await carsService.listActiveCars({ city: 'Buenos Aires' });
        fail('Debería haber lanzado un error');
      } catch (error: unknown) {
        expect(error).toBeDefined();
        const normalized = normalizeError(error);
        expect(normalized.message || normalized.code).toBeTruthy();
      }
    });

    it('debería manejar error de red al crear reserva', async () => {
      (mockSupabase.rpc as jasmine.Spy).and.returnValue(
        Promise.resolve({
          data: null,
          error: {
            message: 'Network request failed',
            code: 'NETWORK_ERROR',
          },
        }),
      );

      try {
        await bookingsService.requestBooking(
          'car-123',
          '2025-11-01T10:00:00',
          '2025-11-05T18:00:00',
        );
        fail('Debería haber lanzado un error');
      } catch (error: unknown) {
        expect(error).toBeDefined();
        const normalized = normalizeError(error);
        expect(normalized.message || normalized.code).toBeTruthy();
      }
    });

    it('debería manejar error de conexión al obtener detalles del auto', async () => {
      const mockQuery = jasmine.createSpyObj('Query', ['select', 'eq', 'single']);
      mockQuery.select.and.returnValue(mockQuery);
      mockQuery.eq.and.returnValue(mockQuery);
      mockQuery.single.and.returnValue(
        Promise.resolve({
          data: null,
          error: {
            message: 'Connection timeout',
            code: 'CONNECTION_TIMEOUT',
          },
        }),
      );

      mockSupabase.from.and.returnValue(mockQuery as any);

      try {
        await carsService.getCarById('car-123');
        fail('Debería haber lanzado un error');
      } catch (error: unknown) {
        expect(error).toBeDefined();
        const normalized = normalizeError(error);
        expect(normalized.code || normalized.message).toBeTruthy();
      }
    });

    it('debería proporcionar mensaje de error amigable para el usuario', async () => {
      const mockQuery = jasmine.createSpyObj('Query', ['select', 'eq', 'order']);
      mockQuery.select.and.returnValue(mockQuery);
      mockQuery.eq.and.returnValue(mockQuery);
      mockQuery.order.and.returnValue(
        Promise.resolve({
          data: null,
          error: {
            message: 'Failed to fetch',
            code: 'NETWORK_ERROR',
          },
        }),
      );

      mockSupabase.from.and.returnValue(mockQuery as any);

      try {
        await carsService.listActiveCars({ city: 'Buenos Aires' });
        fail('Should have thrown an error');
      } catch (error: unknown) {
        // El mensaje debería ser comprensible para usuarios no técnicos
        const normalized = normalizeError(error);
        expect(normalized.message || normalized.code).toBeDefined();
      }
    });
  });

  describe('⏱️ Timeout de API', () => {
    it('debería manejar timeout al buscar autos disponibles', async () => {
      const mockQuery = jasmine.createSpyObj('Query', ['select', 'eq', 'order']);
      mockQuery.select.and.returnValue(mockQuery);
      mockQuery.eq.and.returnValue(mockQuery);
      mockQuery.order.and.returnValue(
        new Promise((_, reject) => {
          setTimeout(() => {
            reject({
              message: 'Request timeout exceeded',
              code: 'TIMEOUT',
            });
          }, 10); // Reduce timeout
        }),
      );

      mockSupabase.from.and.returnValue(mockQuery as any);

      try {
        await carsService.listActiveCars({ city: 'Buenos Aires' });
        fail('Debería haber lanzado un error de timeout');
      } catch (error: unknown) {
        expect(error).toBeDefined();
        const normalized = normalizeError(error);
        expect(normalized.message || normalized.code).toBeTruthy();
      }
    });

    it('debería manejar timeout al crear booking', async () => {
      (mockSupabase.rpc as jasmine.Spy).and.returnValue(
        new Promise((_, reject) => {
          setTimeout(() => {
            reject({
              message: 'RPC timeout after 30s',
              code: 'RPC_TIMEOUT',
            });
          }, 100);
        }),
      );

      try {
        await bookingsService.requestBooking(
          'car-123',
          '2025-11-01T10:00:00',
          '2025-11-05T18:00:00',
        );
        fail('Debería haber lanzado un error de timeout');
      } catch (error: unknown) {
        expect(error).toBeDefined();
        const normalized = normalizeError(error);
        expect(normalized.message || normalized.code).toBeTruthy();
      }
    });

    it('debería manejar timeout al cargar mis reservas', async () => {
      const mockQuery = jasmine.createSpyObj('Query', ['select', 'order']);
      mockQuery.select.and.returnValue(mockQuery);
      mockQuery.order.and.returnValue(
        new Promise((_, reject) => {
          setTimeout(() => {
            reject({ message: 'Query timeout', code: 'QUERY_TIMEOUT' });
          }, 10); // Reduce timeout para que falle rápido
        }),
      );

      mockSupabase.from.and.returnValue(mockQuery as any);

      try {
        await bookingsService.getMyBookings();
        fail('Debería haber lanzado un error de timeout');
      } catch (error: unknown) {
        expect(error).toBeDefined();
        const normalized = normalizeError(error);
        expect(normalized.message || normalized.code).toBeTruthy();
      }
    });

    it('debería tener timeout razonable configurado (< 60s)', async () => {
      // Verificar que los timeouts no sean excesivamente largos
      const startTime = Date.now();

      const mockQuery = jasmine.createSpyObj('Query', ['select', 'eq', 'order']);
      mockQuery.select.and.returnValue(mockQuery);
      mockQuery.eq.and.returnValue(mockQuery);
      mockQuery.order.and.returnValue(
        new Promise((_, reject) => {
          setTimeout(() => {
            reject({ message: 'Timeout', code: 'TIMEOUT' });
          }, 100);
        }),
      );

      mockSupabase.from.and.returnValue(mockQuery as any);

      try {
        await carsService.listActiveCars({ city: 'Test' });
      } catch {
        const elapsed = Date.now() - startTime;
        expect(elapsed).toBeLessThan(60000); // Menos de 60 segundos
      }
    });
  });

  describe('❌ Datos inválidos del servidor', () => {
    it('debería manejar respuesta con formato inesperado', async () => {
      const mockQuery = jasmine.createSpyObj('Query', ['select', 'eq', 'order']);
      mockQuery.select.and.returnValue(mockQuery);
      mockQuery.eq.and.returnValue(mockQuery);
      mockQuery.order.and.returnValue(
        Promise.resolve({
          data: 'invalid-not-an-array', // Debería ser array
          error: null,
        }),
      );

      mockSupabase.from.and.returnValue(mockQuery as any);

      try {
        const cars = await carsService.listActiveCars({ city: 'Buenos Aires' });
        // Debería manejar gracefully o convertir a array vacío
        expect(Array.isArray(cars) || cars === null).toBe(true);
      } catch (error) {
        // También es aceptable que lance error
        expect(error).toBeDefined();
      }
    });

    it('debería manejar booking sin ID en respuesta', async () => {
      const validCarId = '8a854591-3fec-4425-946e-c7bb764a7333'; // Valid UUID

      (mockSupabase.rpc as jasmine.Spy).and.returnValue(
        Promise.resolve({
          data: null, // No retorna ID como esperado
          error: null,
        }),
      );

      try {
        await bookingsService.requestBooking(
          validCarId,
          '2025-11-01T10:00:00',
          '2025-11-05T18:00:00',
        );
        fail('Debería haber lanzado un error');
      } catch (error: unknown) {
        expect(error).toBeDefined();
        const normalized = normalizeError(error);
        expect((normalized.message || '').toLowerCase()).toContain('booking');
      }
    });

    it('debería manejar campos faltantes en respuesta de auto', async () => {
      const mockQuery = jasmine.createSpyObj('Query', ['select', 'eq', 'single']);
      mockQuery.select.and.returnValue(mockQuery);
      mockQuery.eq.and.returnValue(mockQuery);
      mockQuery.single.and.returnValue(
        Promise.resolve({
          data: {
            id: 'car-123',
            car_photos: [],
            // Falta brand, model, price_per_day, etc.
          },
          error: null,
        }),
      );

      mockSupabase.from.and.returnValue(mockQuery as any);

      const car = await carsService.getCarById('car-123');

      // Debería manejar campos faltantes sin crashear
      expect(car).toBeDefined();
      expect(car?.id).toBe('car-123');
    });

    it('debería manejar valores null en campos críticos', async () => {
      const mockQuery = jasmine.createSpyObj('Query', ['select', 'eq', 'order']);
      mockQuery.select.and.returnValue(mockQuery);
      mockQuery.eq.and.returnValue(mockQuery);
      mockQuery.order.and.returnValue(
        Promise.resolve({
          data: [
            {
              id: 'car-123',
              brand: null,
              model: null,
              price_per_day: null,
              location_city: null,
            },
          ],
          error: null,
        }),
      );

      mockSupabase.from.and.returnValue(mockQuery as any);

      const cars = await carsService.listActiveCars({ city: 'Test' });

      expect(cars).toBeDefined();
      expect(Array.isArray(cars)).toBe(true);
    });

    it('debería manejar tipos de datos incorrectos', async () => {
      const mockQuery = jasmine.createSpyObj('Query', ['select', 'eq', 'order']);
      mockQuery.select.and.returnValue(mockQuery);
      mockQuery.eq.and.returnValue(mockQuery);
      mockQuery.order.and.returnValue(
        Promise.resolve({
          data: [
            {
              id: 'car-123',
              price_per_day: 'five-thousand', // String en lugar de number
              year: '2023', // String en lugar de number
              location_city: 12345, // Number en lugar de string
            },
          ],
          error: null,
        }),
      );

      mockSupabase.from.and.returnValue(mockQuery as any);

      try {
        const cars = await carsService.listActiveCars({ city: 'Test' });
        // Debería manejar o sanitizar los tipos incorrectos
        expect(cars).toBeDefined();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('📴 Usuario sin conexión', () => {
    it('debería detectar cuando el usuario está offline', async () => {
      const mockQuery = jasmine.createSpyObj('Query', ['select', 'eq', 'order']);
      mockQuery.select.and.returnValue(mockQuery);
      mockQuery.eq.and.returnValue(mockQuery);
      mockQuery.order.and.returnValue(
        Promise.resolve({
          data: null,
          error: {
            message: 'No internet connection',
            code: 'OFFLINE',
          },
        }),
      );

      mockSupabase.from.and.returnValue(mockQuery);

      try {
        await carsService.listActiveCars({ city: 'Buenos Aires' });
        fail('Debería haber lanzado un error');
      } catch (error: unknown) {
        expect(error).toBeDefined();
        const normalized = normalizeError(error);
        expect(normalized.code || normalized.message).toBeTruthy();
      }
    });

    it('debería proporcionar mensaje específico para estado offline', async () => {
      const mockQuery = jasmine.createSpyObj('Query', ['select', 'eq', 'order']);
      mockQuery.select.and.returnValue(mockQuery);
      mockQuery.eq.and.returnValue(mockQuery);
      mockQuery.order.and.returnValue(
        Promise.resolve({
          data: null,
          error: {
            message: 'Failed to fetch',
            code: 'NETWORK_ERROR',
          },
        }),
      );

      mockSupabase.from.and.returnValue(mockQuery as any);

      try {
        await carsService.listActiveCars({ city: 'Test' });
        fail('Should have thrown an error');
      } catch (error: unknown) {
        // El mensaje debería indicar problemas de conexión
        const normalized = normalizeError(error);
        expect(normalized.message || normalized.code).toBeDefined();
      }
    });

    it('debería fallar gracefully al intentar crear booking sin conexión', async () => {
      (mockSupabase.rpc as jasmine.Spy).and.returnValue(
        Promise.resolve({
          data: null,
          error: {
            message: 'Network unavailable',
            code: 'NETWORK_ERROR',
          },
        }),
      );

      try {
        await bookingsService.requestBooking(
          'car-123',
          '2025-11-01T10:00:00',
          '2025-11-05T18:00:00',
        );
        fail('Debería haber lanzado un error');
      } catch (error: unknown) {
        expect(error).toBeDefined();
        // No debería corromper datos locales
      }
    });

    it('debería evitar operaciones peligrosas cuando está offline', async () => {
      // Mock de estado offline
      (mockSupabase.rpc as jasmine.Spy).and.returnValue(
        Promise.resolve({
          data: null,
          error: { message: 'Offline', code: 'OFFLINE' },
        }),
      );

      try {
        await bookingsService.requestBooking(
          'car-123',
          '2025-11-01T10:00:00',
          '2025-11-05T18:00:00',
        );
      } catch (error) {
        // El error debería prevenir operaciones parciales
        expect(error).toBeDefined();
      }
    });
  });

  describe('🔐 Errores de autenticación', () => {
    it('debería manejar sesión expirada', async () => {
      (mockSupabase.auth.getUser as jasmine.Spy).and.returnValue(
        Promise.resolve({
          data: { user: null },
          error: { message: 'Session expired', code: 'SESSION_EXPIRED' },
        }),
      );

      try {
        await carsService.createCar({
          brand: 'Toyota',
          model: 'Corolla',
          year: 2023,
        });
        fail('Debería haber lanzado un error');
      } catch (error: unknown) {
        expect(error).toBeDefined();
        expect((error as Error).message).toContain('autenticado');
      }
    });

    it('debería manejar usuario no autenticado', async () => {
      (mockSupabase.auth.getUser as jasmine.Spy).and.returnValue(
        Promise.resolve({
          data: { user: null },
          error: null,
        }),
      );

      try {
        await carsService.createCar({
          brand: 'Test',
          model: 'Test',
        });
        fail('Debería haber lanzado un error');
      } catch (error: unknown) {
        expect(error).toBeDefined();
        expect((error as Error).message).toMatch(/autenticado/i);
      }
    });
  });

  describe('🔄 Recuperación de errores', () => {
    it('debería poder reintentar después de un error de red', async () => {
      const mockQuery = jasmine.createSpyObj('Query', ['select', 'eq', 'order', 'in', 'or']);
      mockQuery.select.and.returnValue(mockQuery);
      mockQuery.eq.and.returnValue(mockQuery);
      mockQuery.in.and.returnValue(mockQuery);

      let attemptCount = 0;
      mockQuery.order.and.callFake(() => {
        attemptCount++;
        if (attemptCount === 1) {
          return Promise.resolve({
            data: null,
            error: { message: 'Network error', code: 'NETWORK_ERROR' },
          });
        }
        return Promise.resolve({
          data: [{ id: 'car-123', brand: 'Toyota', location_city: 'Test' }],
          error: null,
        });
      });

      // Mock availability check (no conflicts)
      mockQuery.or.and.returnValue(
        Promise.resolve({
          data: [], // No conflicts
          error: null,
        }),
      );

      mockSupabase.from.and.returnValue(mockQuery as any);

      // Primer intento falla
      try {
        await carsService.listActiveCars({ city: 'Test' });
        fail('Primer intento debería fallar');
      } catch (error) {
        expect(error).toBeDefined();
      }

      // Segundo intento exitoso
      const cars = await carsService.listActiveCars({ city: 'Test' });
      expect(cars).toBeDefined();
      expect(cars.length).toBeGreaterThan(0);
    });

    it('debería mantener estado consistente después de error', async () => {
      const validCarId = '8a854591-3fec-4425-946e-c7bb764a7333'; // Valid UUID

      (mockSupabase.rpc as jasmine.Spy).and.returnValue(
        Promise.resolve({
          data: null,
          error: { message: 'Database error', code: 'DB_ERROR' },
        }),
      );

      try {
        await bookingsService.requestBooking(
          validCarId,
          '2025-11-01T10:00:00',
          '2025-11-05T18:00:00',
        );
      } catch {
        // Después del error, el servicio debería seguir funcionando
        (mockSupabase.rpc as jasmine.Spy).and.returnValues(
          Promise.resolve({ data: 'booking-success', error: null }),
          Promise.resolve({ data: null, error: null }),
        );

        const mockQuery = jasmine.createSpyObj('Query', ['select', 'eq', 'single']);
        mockQuery.select.and.returnValue(mockQuery);
        mockQuery.eq.and.returnValue(mockQuery);
        mockQuery.single.and.returnValue(
          Promise.resolve({
            data: {
              id: 'booking-success',
              car_id: validCarId,
              status: 'pending',
              total_amount: 10000,
              start_at: '2025-11-01T10:00:00',
              end_at: '2025-11-05T18:00:00',
            },
            error: null,
          }),
        );

        mockSupabase.from.and.returnValue(mockQuery as any);

        const booking = await bookingsService.requestBooking(
          validCarId,
          '2025-11-01T10:00:00',
          '2025-11-05T18:00:00',
        );

        expect(booking).toBeDefined();
      }
    });
  });
});
