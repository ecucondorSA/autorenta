import { TestBed } from '@angular/core/testing';
import { BookingsService } from './bookings.service';
import { SupabaseClientService } from './supabase-client.service';

describe('BookingsService', () => {
  let service: BookingsService;
  let supabase: {
    rpc: jasmine.Spy<any>;
    auth: jasmine.SpyObj<any>;
    from: jasmine.Spy<any>;
  };

  beforeEach(() => {
    supabase = {
      rpc: jasmine.createSpy('rpc'),
      auth: jasmine.createSpyObj('auth', ['getUser']),
      from: jasmine.createSpy('from'),
    };

    TestBed.configureTestingModule({
      providers: [
        BookingsService,
        {
          provide: SupabaseClientService,
          useValue: { getClient: () => supabase },
        },
      ],
    });

    service = TestBed.inject(BookingsService);
  });

  it('requests a booking via stored procedure', async () => {
    const booking = { id: 'booking-1' };
    supabase.rpc.withArgs('request_booking', jasmine.any(Object)).and.resolveTo({ data: booking, error: null });
    supabase.rpc.withArgs('pricing_recalculate', jasmine.any(Object)).and.resolveTo({ data: booking, error: null });

    const builder: any = {};
    builder.select = jasmine.createSpy('select').and.returnValue(builder);
    builder.eq = jasmine.createSpy('eq').and.returnValue(builder);
    builder.single = jasmine.createSpy('single').and.resolveTo({
      data: booking,
      error: null,
    });
    supabase.from.and.returnValue(builder);

    const result = await service.requestBooking('car-1', '2024-01-01', '2024-01-10');

    expect(supabase.rpc).toHaveBeenCalledWith('request_booking', {
      p_car_id: 'car-1',
      p_start: '2024-01-01',
      p_end: '2024-01-10',
    });
    expect(result).toBe(booking as any);
  });

  it('returns the authenticated renter bookings ordered by creation', async () => {
    supabase.auth.getUser.and.resolveTo({ data: { user: { id: 'user-77' } }, error: null });
    const rows = [{ id: 'booking-1' }];
    const builder: any = {};
    builder.select = jasmine.createSpy('select').and.returnValue(builder);
    builder.eq = jasmine.createSpy('eq').and.returnValue(builder);
    builder.order = jasmine.createSpy('order').and.returnValue(builder);
    builder.then = (resolve: (value: { data: unknown; error: null }) => unknown) =>
      resolve({ data: rows, error: null });
    supabase.from.and.returnValue(builder);

    const result = await service.getMyBookings();

    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(result).toEqual(rows as any);
  });

  it('returns null when booking does not exist', async () => {
    const builder: any = {};
    builder.select = jasmine.createSpy('select').and.returnValue(builder);
    builder.eq = jasmine.createSpy('eq').and.returnValue(builder);
    builder.single = jasmine.createSpy('single').and.resolveTo({
      data: null,
      error: { code: 'PGRST116' },
    });
    supabase.from.and.returnValue(builder);

    const result = await service.getBookingById('missing');

    expect(result).toBeNull();
  });
});
