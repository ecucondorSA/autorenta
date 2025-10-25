import { TestBed } from '@angular/core/testing';
import { BookingsService } from './bookings.service';
import { SupabaseClientService } from './supabase-client.service';
import { PwaService } from './pwa.service';
import { WalletService } from './wallet.service';

describe('Booking Logic Integration', () => {
  let service: BookingsService;
  let supabase: {
    rpc: jasmine.Spy<any>;
    auth: jasmine.SpyObj<any>;
    from: jasmine.Spy<any>;
  };
  let pwaService: jasmine.SpyObj<PwaService>;
  let walletService: jasmine.SpyObj<WalletService>;

  beforeEach(() => {
    supabase = {
      rpc: jasmine.createSpy('rpc'),
      auth: jasmine.createSpyObj('auth', ['getUser']),
      from: jasmine.createSpy('from'),
    };
    pwaService = jasmine.createSpyObj<PwaService>('PwaService', ['setAppBadge', 'clearAppBadge']);
    walletService = jasmine.createSpyObj<WalletService>('WalletService', ['unlockFunds', 'lockFunds']);

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
      const mockBooking = { id: newBookingId, car_id: carId, status: 'pending' };

      // Mock RPC calls
      supabase.rpc.and.callFake(async (method: string, params: any) => {
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
      const fromSpy = supabase.from.and.returnValue({
        select: (columns: string) => ({
          eq: (column: string, value: any) => ({
            single: async () => ({ data: mockBooking, error: null }),
          }),
        }),
      } as any);

      const result = await service.createBookingWithValidation(carId, startDate, endDate);

      expect(result.success).toBe(true);
      expect(result.booking).toEqual(mockBooking);
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
      supabase.rpc.withArgs('is_car_available', jasmine.any(Object)).and.resolveTo({ data: false, error: null });

      const result = await service.createBookingWithValidation(carId, startDate, endDate);

      expect(result.success).toBe(false);
      expect(result.error).toBe('El auto no está disponible para esas fechas. Por favor elige otras fechas.');
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
      const mockBooking = { id: newBookingId, car_id: carId, status: 'pending' };

      supabase.rpc.and.callFake(async (method: string, params: any) => {
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

      const fromSpy = supabase.from.and.returnValue({
        select: (columns: string) => ({
          eq: (column: string, value: any) => ({
            single: async () => ({ data: mockBooking, error: null }),
          }),
        }),
      } as any);

      const result = await service.createBookingWithValidation(carId, '2026-01-01T10:00:00Z', '2026-01-05T10:00:00Z');

      expect(result.success).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith('is_car_available', {
        p_car_id: carId,
        p_start_date: '2026-01-01T10:00:00Z',
        p_end_date: '2026-01-05T10:00:00Z',
      });
    });

    it('no debería permitir crear una reserva duplicada', async () => {
      const firstBookingId = 'booking-dupe-1';
      const firstBooking = { id: firstBookingId, car_id: carId, status: 'confirmed' };

      // First call is successful
      supabase.rpc.withArgs('is_car_available', jasmine.any(Object)).and.resolveTo({ data: true, error: null });
      supabase.rpc.withArgs('request_booking', jasmine.any(Object)).and.resolveTo({ data: { id: firstBookingId }, error: null });
      supabase.from.and.returnValue({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: firstBooking, error: null }),
          }),
        }),
      } as any);

      const result1 = await service.createBookingWithValidation(carId, '2026-02-01T10:00:00Z', '2026-02-05T10:00:00Z');
      expect(result1.success).toBe(true);
      expect(result1.booking).toEqual(firstBooking);

      // Second call with overlapping dates should fail
      supabase.rpc.withArgs('is_car_available', jasmine.any(Object)).and.resolveTo({ data: false, error: null });
      
      const result2 = await service.createBookingWithValidation(carId, '2026-02-03T10:00:00Z', '2026-02-07T10:00:00Z');

      expect(result2.success).toBe(false);
      expect(result2.error).toContain('El auto no está disponible');
    });
  });

});