import { TestBed } from '@angular/core/testing';
import type { Booking } from '../types/supabase-types';
import { BookingsService } from './bookings.service';
import { SupabaseClientService } from './supabase-client.service';
import { PwaService } from './pwa.service';
import { WalletService } from './wallet.service';

describe('Booking Logic Integration', () => {
  let service: BookingsService;
  let supabase: any;
  let pwaService: jasmine.SpyObj<PwaService>;
  let walletService: jasmine.SpyObj<WalletService>;

  beforeEach(() => {
    supabase = {
      rpc: jasmine.createSpy('rpc'),
      auth: jasmine.createSpyObj('auth', ['getUser']),
      from: jasmine.createSpy('from'),
    };
    pwaService = jasmine.createSpyObj<PwaService>('PwaService', ['setAppBadge', 'clearAppBadge']);
    walletService = jasmine.createSpyObj<WalletService>('WalletService', [
      'unlockFunds',
      'lockFunds',
    ]);

    TestBed.configureTestingModule({
      providers: [
        BookingsService,
        {
          provide: SupabaseClientService,
          useValue: { getClient: () => supabase },
        },
        { provide: PwaService, useValue: pwaService },
        { provide: WalletService, useValue: walletService },
      ],
    });

    service = TestBed.inject(BookingsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('createBookingWithValidation', () => {
    const carId = 'test-car-id';
    const startDate = '2025-12-01T10:00:00Z';
    const endDate = '2025-12-05T10:00:00Z';

    it('should create a booking when the car is available', async () => {
      const newBookingId = 'new-booking-123';
      const mockBooking: Booking = {
        id: newBookingId,
        car_id: carId,
        status: 'pending',
        user_id: 'test-user-id',
        renter_id: 'test-user-id',
        start_at: startDate,
        end_at: endDate,
        total_amount: 1000,
        currency: 'ARS',
        created_at: new Date().toISOString(),
      } as unknown as Booking;

      // Mock RPC calls
      supabase.rpc.and.callFake(async (method: string, params: unknown) => {
        if (method === 'is_car_available') {
          return { data: true, error: null };
        }
        if (method === 'request_booking') {
          return { data: { id: newBookingId }, error: null };
        }
        if (method === 'pricing_recalculate') {
          return { data: null, error: null };
        }
        return { data: null, error: new Error(`Unknown RPC: ${method}`) };
      });

      // Mock getBookingById which is called after creation
      const _fromSpy = supabase.from.and.returnValue({
        select: (columns: string) => ({
          eq: (column: string, value: unknown) => ({
            single: async () => ({ data: mockBooking, error: null }),
          }),
        }),
      } as any);

      const result = await service.createBookingWithValidation(carId, startDate, endDate);

      expect(result.success).toBe(true);
      expect(result.booking?.id).toBe(mockBooking.id);
      expect(result.booking?.car_id).toBe(mockBooking.car_id);
      expect(result.booking?.status).toBe(mockBooking.status);
      expect(supabase.rpc).toHaveBeenCalledWith('is_car_available', {
        p_car_id: carId,
        p_start_date: startDate,
        p_end_date: endDate,
      });
      expect(supabase.rpc).toHaveBeenCalledWith('request_booking', {
        p_car_id: carId,
        p_start: startDate,
        p_end: endDate,
      });
    });

    it('should not create a booking when the car is unavailable', async () => {
      // Mock is_car_available to return false
      supabase.rpc
        .withArgs('is_car_available', jasmine.any(Object))
        .and.resolveTo({ data: false, error: null });

      const result = await service.createBookingWithValidation(carId, startDate, endDate);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'El auto no está disponible para esas fechas. Por favor elige otras fechas.',
      );
      expect(result.booking).toBeUndefined();

      // Verify that request_booking was not called
      expect(supabase.rpc).not.toHaveBeenCalledWith('request_booking', jasmine.any(Object));
    });

    it('should return an error if start date is not before end date', async () => {
      const invalidEndDate = '2025-11-30T10:00:00Z'; // Before start date
      const result = await service.createBookingWithValidation(carId, startDate, invalidEndDate);

      expect(result.success).toBe(false);
      expect(result.error).toBe('La fecha de inicio debe ser anterior a la fecha de fin');
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it('debería verificar correctamente la disponibilidad de un coche', async () => {
      const newBookingId = 'new-booking-456';
      const mockBooking: Booking = {
        id: newBookingId,
        car_id: carId,
        status: 'pending',
        user_id: 'test-user-id',
        renter_id: 'test-user-id',
        start_at: '2026-01-01T10:00:00Z',
        end_at: '2026-01-05T10:00:00Z',
        total_amount: 1000,
        currency: 'ARS',
        created_at: new Date().toISOString(),
      } as unknown as Booking;

      supabase.rpc.and.callFake(async (method: string, params: unknown) => {
        if (method === 'is_car_available') {
          return { data: true, error: null };
        }
        if (method === 'request_booking') {
          return { data: { id: newBookingId }, error: null };
        }
        if (method === 'pricing_recalculate') {
          return { data: null, error: null };
        }
        return { data: null, error: new Error(`Unknown RPC: ${method}`) };
      });

      const _fromSpy = supabase.from.and.returnValue({
        select: (columns: string) => ({
          eq: (column: string, value: unknown) => ({
            single: async () => ({ data: mockBooking, error: null }),
          }),
        }),
      } as any);

      const result = await service.createBookingWithValidation(
        carId,
        '2026-01-01T10:00:00Z',
        '2026-01-05T10:00:00Z',
      );

      expect(result.success).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith('is_car_available', {
        p_car_id: carId,
        p_start_date: '2026-01-01T10:00:00Z',
        p_end_date: '2026-01-05T10:00:00Z',
      });
    });

    it('no debería permitir crear una reserva duplicada', async () => {
      const firstBookingId = 'booking-dupe-1';
      const firstBooking: Booking = {
        id: firstBookingId,
        car_id: carId,
        status: 'confirmed',
        user_id: 'test-user-id',
        renter_id: 'test-user-id',
        start_at: '2026-02-01T10:00:00Z',
        end_at: '2026-02-05T10:00:00Z',
        total_amount: 1000,
        currency: 'ARS',
        created_at: new Date().toISOString(),
      } as unknown as Booking;

      // First call is successful
      let callCount = 0;
      supabase.rpc.and.callFake(async (method: string, params: unknown) => {
        if (method === 'is_car_available' && callCount === 0) {
          return { data: true, error: null };
        }
        if (method === 'is_car_available' && callCount > 0) {
          return { data: false, error: null };
        }
        if (method === 'request_booking') {
          callCount++;
          return { data: { id: firstBookingId }, error: null };
        }
        if (method === 'pricing_recalculate') {
          return { data: null, error: null };
        }
        return { data: null, error: new Error(`Unknown RPC: ${method}`) };
      });

      supabase.from.and.returnValue({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: firstBooking, error: null }),
          }),
        }),
      } as any);

      const result1 = await service.createBookingWithValidation(
        carId,
        '2026-02-01T10:00:00Z',
        '2026-02-05T10:00:00Z',
      );
      expect(result1.success).toBe(true);
      expect(result1.booking?.id).toBe(firstBooking.id);

      // Second call with overlapping dates should fail
      const result2 = await service.createBookingWithValidation(
        carId,
        '2026-02-03T10:00:00Z',
        '2026-02-07T10:00:00Z',
      );

      expect(result2.success).toBe(false);
      expect(result2.error).toContain('El auto no está disponible');
    });
  });

  /**
   * SPRINT 2 - Test 2.3: Prevención de doble reserva (CRÍTICO)
   *
   * Tests mejorados para verificar que el sistema previene correctamente
   * reservas solapadas y que los mensajes de error son descriptivos
   */
  describe('Prevención de doble reserva - CRÍTICO', () => {
    const carId = 'test-car-prevent-double';

    it('✅ Primera reserva debe ser exitosa', async () => {
      const bookingId = 'first-booking-ok';
      const mockBooking: Booking = {
        id: bookingId,
        car_id: carId,
        status: 'confirmed',
        user_id: 'user-1',
        renter_id: 'user-1',
        start_at: '2026-03-01T10:00:00Z',
        end_at: '2026-03-05T18:00:00Z',
        total_amount: 20000,
        currency: 'ARS',
        created_at: new Date().toISOString(),
      } as unknown as Booking;

      supabase.rpc.and.callFake(async (method: string) => {
        if (method === 'is_car_available') {
          return { data: true, error: null };
        }
        if (method === 'request_booking') {
          return { data: { id: bookingId }, error: null };
        }
        if (method === 'pricing_recalculate') {
          return { data: null, error: null };
        }
        return { data: null, error: new Error(`Unknown RPC: ${method}`) };
      });

      supabase.from.and.returnValue({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: mockBooking, error: null }),
          }),
        }),
      } as any);

      const result = await service.createBookingWithValidation(
        carId,
        '2026-03-01T10:00:00Z',
        '2026-03-05T18:00:00Z',
      );

      expect(result.success).toBe(true);
      expect(result.booking?.id).toBe(bookingId);
      expect(result.booking?.status).toBe('confirmed');
    });

    it('❌ Segunda reserva SOLAPADA debe fallar', async () => {
      // Primera reserva: 1-5 marzo
      // Segunda reserva intentada: 3-7 marzo (solapa con la primera)

      supabase.rpc.and.callFake(async (method: string) => {
        if (method === 'is_car_available') {
          // Retorna false porque ya hay una reserva en ese periodo
          return { data: false, error: null };
        }
        return { data: null, error: new Error(`Unknown RPC: ${method}`) };
      });

      const result = await service.createBookingWithValidation(
        carId,
        '2026-03-03T10:00:00Z',
        '2026-03-07T18:00:00Z',
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('no está disponible');
      expect(result.booking).toBeUndefined();

      // Verificar que NO se intentó crear la reserva
      expect(supabase.rpc).not.toHaveBeenCalledWith('request_booking', jasmine.any(Object));
    });

    it('✅ Reservas SECUENCIALES (no solapadas) deben ser exitosas', async () => {
      // Primera reserva: 1-5 marzo
      // Segunda reserva: 6-10 marzo (NO solapa)

      const booking1Id = 'seq-booking-1';
      const booking2Id = 'seq-booking-2';

      let callCount = 0;

      supabase.rpc.and.callFake(async (method: string) => {
        if (method === 'is_car_available') {
          return { data: true, error: null };
        }
        if (method === 'request_booking') {
          callCount++;
          return { data: { id: callCount === 1 ? booking1Id : booking2Id }, error: null };
        }
        if (method === 'pricing_recalculate') {
          return { data: null, error: null };
        }
        return { data: null, error: new Error(`Unknown RPC: ${method}`) };
      });

      supabase.from.and.callFake(
        () =>
          ({
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: {
                    id: callCount === 1 ? booking1Id : booking2Id,
                    car_id: carId,
                    status: 'confirmed',
                    user_id: 'user-1',
                    renter_id: 'user-1',
                    start_at: callCount === 1 ? '2026-03-01T10:00:00Z' : '2026-03-06T10:00:00Z',
                    end_at: callCount === 1 ? '2026-03-05T18:00:00Z' : '2026-03-10T18:00:00Z',
                    total_amount: 20000,
                    currency: 'ARS',
                    created_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
          }) as any,
      );

      // Primera reserva: 1-5 marzo
      const result1 = await service.createBookingWithValidation(
        carId,
        '2026-03-01T10:00:00Z',
        '2026-03-05T18:00:00Z',
      );

      expect(result1.success).toBe(true);
      expect(result1.booking?.id).toBe(booking1Id);

      // Segunda reserva: 6-10 marzo (NO solapa)
      const result2 = await service.createBookingWithValidation(
        carId,
        '2026-03-06T10:00:00Z',
        '2026-03-10T18:00:00Z',
      );

      expect(result2.success).toBe(true);
      expect(result2.booking?.id).toBe(booking2Id);
    });

    it('❌ Error debe ser descriptivo y útil para el usuario', async () => {
      supabase.rpc.and.callFake(async (method: string) => {
        if (method === 'is_car_available') {
          return { data: false, error: null };
        }
        return { data: null, error: null };
      });

      const result = await service.createBookingWithValidation(
        carId,
        '2026-04-01T10:00:00Z',
        '2026-04-05T18:00:00Z',
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      // Verificar que el mensaje es descriptivo
      const errorMsg = result.error!.toLowerCase();
      expect(
        errorMsg.includes('no está disponible') ||
          errorMsg.includes('no disponible') ||
          errorMsg.includes('ocupado'),
      ).toBe(true);

      // NO debe ser un error genérico
      expect(errorMsg).not.toContain('unknown error');
      expect(errorMsg).not.toContain('undefined');
    });

    it('❌ Solape PARCIAL al inicio debe fallar', async () => {
      // Reserva existente: 1-5 marzo
      // Nueva reserva: 28 feb - 3 marzo (solapa al inicio)

      supabase.rpc.and.callFake(async (method: string) => {
        if (method === 'is_car_available') {
          return { data: false, error: null };
        }
        return { data: null, error: null };
      });

      const result = await service.createBookingWithValidation(
        carId,
        '2026-02-28T10:00:00Z',
        '2026-03-03T18:00:00Z',
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('no está disponible');
    });

    it('❌ Solape PARCIAL al final debe fallar', async () => {
      // Reserva existente: 1-5 marzo
      // Nueva reserva: 4-8 marzo (solapa al final)

      supabase.rpc.and.callFake(async (method: string) => {
        if (method === 'is_car_available') {
          return { data: false, error: null };
        }
        return { data: null, error: null };
      });

      const result = await service.createBookingWithValidation(
        carId,
        '2026-03-04T10:00:00Z',
        '2026-03-08T18:00:00Z',
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('no está disponible');
    });

    it('❌ Solape COMPLETO (reserva dentro de otra) debe fallar', async () => {
      // Reserva existente: 1-10 marzo
      // Nueva reserva: 3-7 marzo (completamente dentro)

      supabase.rpc.and.callFake(async (method: string) => {
        if (method === 'is_car_available') {
          return { data: false, error: null };
        }
        return { data: null, error: null };
      });

      const result = await service.createBookingWithValidation(
        carId,
        '2026-03-03T10:00:00Z',
        '2026-03-07T18:00:00Z',
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('no está disponible');
    });

    it('✅ Mismo día inicio/fin de reserva anterior debe permitir nueva reserva', async () => {
      // Reserva existente: 1-5 marzo, termina a las 18:00
      // Nueva reserva: 5 marzo a las 18:00 - 10 marzo
      // Esto es válido si is_car_available lo permite

      const bookingId = 'same-day-transition';

      supabase.rpc.and.callFake(async (method: string) => {
        if (method === 'is_car_available') {
          // La RPC verifica rangos y permite si no hay solape real
          return { data: true, error: null };
        }
        if (method === 'request_booking') {
          return { data: { id: bookingId }, error: null };
        }
        if (method === 'pricing_recalculate') {
          return { data: null, error: null };
        }
        return { data: null, error: null };
      });

      supabase.from.and.returnValue({
        select: () => ({
          eq: () => ({
            single: async () => ({
              data: {
                id: bookingId,
                car_id: carId,
                status: 'confirmed',
                user_id: 'user-1',
                renter_id: 'user-1',
                start_at: '2026-03-05T18:00:00Z',
                end_at: '2026-03-10T18:00:00Z',
                total_amount: 25000,
                currency: 'ARS',
                created_at: new Date().toISOString(),
              },
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await service.createBookingWithValidation(
        carId,
        '2026-03-05T18:00:00Z',
        '2026-03-10T18:00:00Z',
      );

      expect(result.success).toBe(true);
      expect(result.booking?.id).toBe(bookingId);
    });
  });
});
