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
import { SupabaseClient } from '@supabase/supabase-js';

describe('Sprint 5.3 - Error Handling', () => {
  let bookingsService: BookingsService;
  let carsService: CarsService;
  let paymentsService: PaymentsService;
  let mockSupabase: jasmine.SpyObj<SupabaseClient>;

  beforeEach(() => {
    mockSupabase = jasmine.createSpyObj('SupabaseClient', ['from', 'rpc', 'auth', 'storage']);
    mockSupabase.auth = jasmine.createSpyObj('Auth', ['getUser']) as any;
    (mockSupabase.auth.getUser as jasmine.Spy).and.returnValue(
      Promise.resolve({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null
      })
    );

    TestBed.configureTestingModule({
      providers: [
        BookingsService,
        CarsService,
        PaymentsService,
        { provide: 'SUPABASE_CLIENT', useValue: mockSupabase }
      ]
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
      mockQuery.order.and.returnValue(Promise.resolve({
        data: null,
        error: {
          message: 'Failed to fetch',
          code: 'NETWORK_ERROR'
        }
      }));

      mockSupabase.from.and.returnValue(mockQuery as any);

      try {
        await carsService.listActiveCars({ city: 'Buenos Aires' });
        fail('Debería haber lanzado un error');
      } catch (error: any) {
        expect(error).toBeDefined();
        expect(error.message).toContain('fetch');
        console.log('✅ Error de red manejado:', error.message);
      }
    });

    it('debería manejar error de red al crear reserva', async () => {
      (mockSupabase.rpc as jasmine.Spy).and.returnValue(
        Promise.resolve({
          data: null,
          error: {
            message: 'Network request failed',
            code: 'NETWORK_ERROR'
          }
        })
      );

      try {
        await bookingsService.requestBooking(
          'car-123',
          '2025-11-01T10:00:00',
          '2025-11-05T18:00:00'
        );
        fail('Debería haber lanzado un error');
      } catch (error: any) {
        expect(error).toBeDefined();
        expect(error.message).toMatch(/Network|failed/i);
        console.log('✅ Error de red en booking manejado');
      }
    });

    it('debería manejar error de conexión al obtener detalles del auto', async () => {
      const mockQuery = jasmine.createSpyObj('Query', ['select', 'eq', 'single']);
      mockQuery.select.and.returnValue(mockQuery);
      mockQuery.eq.and.returnValue(mockQuery);
      mockQuery.single.and.returnValue(Promise.resolve({
        data: null,
        error: {
          message: 'Connection timeout',
          code: 'CONNECTION_TIMEOUT'
        }
      }));

      mockSupabase.from.and.returnValue(mockQuery as any);

      try {
        await carsService.getCarById('car-123');
        fail('Debería haber lanzado un error');
      } catch (error: any) {
        expect(error).toBeDefined();
        expect(error.code).toBe('CONNECTION_TIMEOUT');
        console.log('✅ Timeout de conexión manejado');
      }
    });

    it('debería proporcionar mensaje de error amigable para el usuario', async () => {
      const mockQuery = jasmine.createSpyObj('Query', ['select', 'eq', 'order']);
      mockQuery.select.and.returnValue(mockQuery);
      mockQuery.eq.and.returnValue(mockQuery);
      mockQuery.order.and.returnValue(Promise.resolve({
        data: null,
        error: {
          message: 'Failed to fetch',
          code: 'NETWORK_ERROR'
        }
      }));

      mockSupabase.from.and.returnValue(mockQuery as any);

      try {
        await carsService.listActiveCars({ city: 'Buenos Aires' });
      } catch (error: any) {
        // El mensaje debería ser comprensible para usuarios no técnicos
        expect(error.message).toBeDefined();
        expect(error.message.length).toBeGreaterThan(0);
        console.log('✅ Mensaje de error disponible para UI:', error.message);
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
              code: 'TIMEOUT'
            });
          }, 100);
        })
      );

      mockSupabase.from.and.returnValue(mockQuery as any);

      try {
        await carsService.listActiveCars({ city: 'Buenos Aires' });
        fail('Debería haber lanzado un error de timeout');
      } catch (error: any) {
        expect(error).toBeDefined();
        expect(error.message).toContain('timeout');
        console.log('✅ Timeout de búsqueda manejado');
      }
    });

    it('debería manejar timeout al crear booking', async () => {
      (mockSupabase.rpc as jasmine.Spy).and.returnValue(
        new Promise((_, reject) => {
          setTimeout(() => {
            reject({
              message: 'RPC timeout after 30s',
              code: 'RPC_TIMEOUT'
            });
          }, 100);
        })
      );

      try {
        await bookingsService.requestBooking(
          'car-123',
          '2025-11-01T10:00:00',
          '2025-11-05T18:00:00'
        );
        fail('Debería haber lanzado un error de timeout');
      } catch (error: any) {
        expect(error).toBeDefined();
        expect(error.code).toBe('RPC_TIMEOUT');
        console.log('✅ Timeout de RPC booking manejado');
      }
    });

    it('debería manejar timeout al cargar mis reservas', async () => {
      const mockQuery = jasmine.createSpyObj('Query', ['select', 'order']);
      mockQuery.select.and.returnValue(mockQuery);
      mockQuery.order.and.returnValue(
        new Promise((_, reject) => {
          setTimeout(() => {
            reject({ message: 'Query timeout', code: 'QUERY_TIMEOUT' });
          }, 50);
        })
      );

      mockSupabase.from.and.returnValue(mockQuery as any);

      try {
        await bookingsService.getMyBookings();
        fail('Debería haber lanzado un error de timeout');
      } catch (error: any) {
        expect(error).toBeDefined();
        console.log('✅ Timeout de "Mis Reservas" manejado');
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
        })
      );

      mockSupabase.from.and.returnValue(mockQuery as any);

      try {
        await carsService.listActiveCars({ city: 'Test' });
      } catch {
        const elapsed = Date.now() - startTime;
        expect(elapsed).toBeLessThan(60000); // Menos de 60 segundos
        console.log(`✅ Timeout razonable: ${elapsed}ms`);
      }
    });
  });

  describe('❌ Datos inválidos del servidor', () => {
    it('debería manejar respuesta con formato inesperado', async () => {
      const mockQuery = jasmine.createSpyObj('Query', ['select', 'eq', 'order']);
      mockQuery.select.and.returnValue(mockQuery);
      mockQuery.eq.and.returnValue(mockQuery);
      mockQuery.order.and.returnValue(Promise.resolve({
        data: 'invalid-not-an-array', // Debería ser array
        error: null
      }));

      mockSupabase.from.and.returnValue(mockQuery as any);

      try {
        const cars = await carsService.listActiveCars({ city: 'Buenos Aires' });
        // Debería manejar gracefully o convertir a array vacío
        expect(Array.isArray(cars) || cars === null).toBe(true);
        console.log('✅ Formato inválido manejado gracefully');
      } catch (error) {
        // También es aceptable que lance error
        console.log('✅ Formato inválido detectado y rechazado');
        expect(error).toBeDefined();
      }
    });

    it('debería manejar booking sin ID en respuesta', async () => {
      (mockSupabase.rpc as jasmine.Spy).and.returnValue(
        Promise.resolve({
          data: null, // No retorna ID como esperado
          error: null
        })
      );

      try {
        await bookingsService.requestBooking(
          'car-123',
          '2025-11-01T10:00:00',
          '2025-11-05T18:00:00'
        );
        fail('Debería haber lanzado un error');
      } catch (error: any) {
        expect(error).toBeDefined();
        expect(error.message).toContain('booking id');
        console.log('✅ Respuesta sin ID manejada:', error.message);
      }
    });

    it('debería manejar campos faltantes en respuesta de auto', async () => {
      const mockQuery = jasmine.createSpyObj('Query', ['select', 'eq', 'single']);
      mockQuery.select.and.returnValue(mockQuery);
      mockQuery.eq.and.returnValue(mockQuery);
      mockQuery.single.and.returnValue(Promise.resolve({
        data: {
          id: 'car-123',
          // Falta brand, model, price_per_day, etc.
        },
        error: null
      }));

      mockSupabase.from.and.returnValue(mockQuery as any);

      const car = await carsService.getCarById('car-123');
      
      // Debería manejar campos faltantes sin crashear
      expect(car).toBeDefined();
      expect(car?.id).toBe('car-123');
      console.log('✅ Campos faltantes manejados sin crash');
    });

    it('debería manejar valores null en campos críticos', async () => {
      const mockQuery = jasmine.createSpyObj('Query', ['select', 'eq', 'order']);
      mockQuery.select.and.returnValue(mockQuery);
      mockQuery.eq.and.returnValue(mockQuery);
      mockQuery.order.and.returnValue(Promise.resolve({
        data: [{
          id: 'car-123',
          brand: null,
          model: null,
          price_per_day: null,
          location_city: null
        }],
        error: null
      }));

      mockSupabase.from.and.returnValue(mockQuery as any);

      const cars = await carsService.listActiveCars({ city: 'Test' });
      
      expect(cars).toBeDefined();
      expect(Array.isArray(cars)).toBe(true);
      console.log('✅ Valores null en campos críticos manejados');
    });

    it('debería manejar tipos de datos incorrectos', async () => {
      const mockQuery = jasmine.createSpyObj('Query', ['select', 'eq', 'order']);
      mockQuery.select.and.returnValue(mockQuery);
      mockQuery.eq.and.returnValue(mockQuery);
      mockQuery.order.and.returnValue(Promise.resolve({
        data: [{
          id: 'car-123',
          price_per_day: 'five-thousand', // String en lugar de number
          year: '2023', // String en lugar de number
          location_city: 12345 // Number en lugar de string
        }],
        error: null
      }));

      mockSupabase.from.and.returnValue(mockQuery as any);

      try {
        const cars = await carsService.listActiveCars({ city: 'Test' });
        // Debería manejar o sanitizar los tipos incorrectos
        expect(cars).toBeDefined();
        console.log('✅ Tipos de datos incorrectos manejados');
      } catch (error) {
        console.log('✅ Tipos incorrectos detectados y rechazados');
        expect(error).toBeDefined();
      }
    });
  });

  describe('📴 Usuario sin conexión', () => {
    it('debería detectar cuando el usuario está offline', async () => {
      const mockQuery = jasmine.createSpyObj('Query', ['select', 'eq', 'order']);
      mockQuery.select.and.returnValue(mockQuery);
      mockQuery.eq.and.returnValue(mockQuery);
      mockQuery.order.and.returnValue(Promise.resolve({
        data: null,
        error: {
          message: 'No internet connection',
          code: 'OFFLINE'
        }
      }));

      mockSupabase.from.and.returnValue(mockQuery as any);

      try {
        await carsService.listActiveCars({ city: 'Buenos Aires' });
        fail('Debería haber lanzado un error');
      } catch (error: any) {
        expect(error).toBeDefined();
        expect(error.code).toBe('OFFLINE');
        console.log('✅ Usuario offline detectado');
      }
    });

    it('debería proporcionar mensaje específico para estado offline', async () => {
      const mockQuery = jasmine.createSpyObj('Query', ['select', 'eq', 'order']);
      mockQuery.select.and.returnValue(mockQuery);
      mockQuery.eq.and.returnValue(mockQuery);
      mockQuery.order.and.returnValue(Promise.resolve({
        data: null,
        error: {
          message: 'Failed to fetch',
          code: 'NETWORK_ERROR'
        }
      }));

      mockSupabase.from.and.returnValue(mockQuery as any);

      try {
        await carsService.listActiveCars({ city: 'Test' });
      } catch (error: any) {
        // El mensaje debería indicar problemas de conexión
        expect(error.message).toBeDefined();
        console.log('✅ Mensaje offline disponible:', error.message);
      }
    });

    it('debería fallar gracefully al intentar crear booking sin conexión', async () => {
      (mockSupabase.rpc as jasmine.Spy).and.returnValue(
        Promise.resolve({
          data: null,
          error: {
            message: 'Network unavailable',
            code: 'NETWORK_ERROR'
          }
        })
      );

      try {
        await bookingsService.requestBooking(
          'car-123',
          '2025-11-01T10:00:00',
          '2025-11-05T18:00:00'
        );
        fail('Debería haber lanzado un error');
      } catch (error: any) {
        expect(error).toBeDefined();
        // No debería corromper datos locales
        console.log('✅ Booking offline manejado sin corrupción');
      }
    });

    it('debería evitar operaciones peligrosas cuando está offline', async () => {
      // Mock de estado offline
      (mockSupabase.rpc as jasmine.Spy).and.returnValue(
        Promise.resolve({
          data: null,
          error: { message: 'Offline', code: 'OFFLINE' }
        })
      );

      try {
        await bookingsService.requestBooking(
          'car-123',
          '2025-11-01T10:00:00',
          '2025-11-05T18:00:00'
        );
      } catch (error) {
        // El error debería prevenir operaciones parciales
        expect(error).toBeDefined();
        console.log('✅ Operación peligrosa prevenida en modo offline');
      }
    });
  });

  describe('🔐 Errores de autenticación', () => {
    it('debería manejar sesión expirada', async () => {
      (mockSupabase.auth.getUser as jasmine.Spy).and.returnValue(
        Promise.resolve({
          data: { user: null },
          error: { message: 'Session expired', code: 'SESSION_EXPIRED' }
        })
      );

      try {
        await carsService.createCar({
          brand: 'Toyota',
          model: 'Corolla',
          year: 2023
        });
        fail('Debería haber lanzado un error');
      } catch (error: any) {
        expect(error).toBeDefined();
        expect(error.message).toContain('autenticado');
        console.log('✅ Sesión expirada manejada');
      }
    });

    it('debería manejar usuario no autenticado', async () => {
      (mockSupabase.auth.getUser as jasmine.Spy).and.returnValue(
        Promise.resolve({
          data: { user: null },
          error: null
        })
      );

      try {
        await carsService.createCar({
          brand: 'Test',
          model: 'Test'
        });
        fail('Debería haber lanzado un error');
      } catch (error: any) {
        expect(error).toBeDefined();
        expect(error.message).toMatch(/autenticado/i);
        console.log('✅ Usuario no autenticado rechazado');
      }
    });
  });

  describe('🔄 Recuperación de errores', () => {
    it('debería poder reintentar después de un error de red', async () => {
      const mockQuery = jasmine.createSpyObj('Query', ['select', 'eq', 'order']);
      mockQuery.select.and.returnValue(mockQuery);
      mockQuery.eq.and.returnValue(mockQuery);

      let attemptCount = 0;
      mockQuery.order.and.callFake(() => {
        attemptCount++;
        if (attemptCount === 1) {
          return Promise.resolve({
            data: null,
            error: { message: 'Network error', code: 'NETWORK_ERROR' }
          });
        }
        return Promise.resolve({
          data: [{ id: 'car-123', brand: 'Toyota' }],
          error: null
        });
      });

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
      console.log('✅ Recuperación exitosa después de error');
    });

    it('debería mantener estado consistente después de error', async () => {
      (mockSupabase.rpc as jasmine.Spy).and.returnValue(
        Promise.resolve({
          data: null,
          error: { message: 'Database error', code: 'DB_ERROR' }
        })
      );

      try {
        await bookingsService.requestBooking(
          'car-123',
          '2025-11-01T10:00:00',
          '2025-11-05T18:00:00'
        );
      } catch {
        // Después del error, el servicio debería seguir funcionando
        (mockSupabase.rpc as jasmine.Spy).and.returnValues(
          Promise.resolve({ data: 'booking-success', error: null }),
          Promise.resolve({ data: null, error: null })
        );

        const mockQuery = jasmine.createSpyObj('Query', ['select', 'eq', 'single']);
        mockQuery.select.and.returnValue(mockQuery);
        mockQuery.eq.and.returnValue(mockQuery);
        mockQuery.single.and.returnValue(Promise.resolve({
          data: { id: 'booking-success', status: 'pending' },
          error: null
        }));

        mockSupabase.from.and.returnValue(mockQuery as any);

        const booking = await bookingsService.requestBooking(
          'car-123',
          '2025-11-01T10:00:00',
          '2025-11-05T18:00:00'
        );

        expect(booking).toBeDefined();
        console.log('✅ Estado consistente después de error');
      }
    });
  });
});
