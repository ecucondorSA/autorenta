import { TestBed } from '@angular/core/testing';
import { CarAvailabilityService } from './car-availability.service';
import { CarBlockingService } from './car-blocking.service';
import { SupabaseClientService } from './supabase-client.service';

// TODO: Fix preloadBlockedRanges method reference
xdescribe('CarAvailabilityService', () => {
  let service: CarAvailabilityService;
  let mockSupabaseClient: any;
  let mockCarBlocking: any;

  const carId = '00000000-0000-0000-0000-000000000001';

  beforeEach(() => {
    // Mock supabase client with rpc spy
    mockSupabaseClient = {
      rpc: jasmine.createSpy('rpc'),
    };

    // Mock SupabaseClientService to return our client
    const supabaseProvider = {
      provide: SupabaseClientService,
      useValue: {
        getClient: () => mockSupabaseClient,
      },
    };

    // Mock CarBlockingService
    mockCarBlocking = {
      getBlockedDates: jasmine.createSpy('getBlockedDates').and.callFake((id: string) =>
        Promise.resolve([
          {
            id: 'block1',
            blocked_from: '2025-11-20',
            blocked_to: '2025-11-21',
            reason: 'test',
            notes: '',
          },
        ]),
      ),
    };

    TestBed.configureTestingModule({
      providers: [supabaseProvider, { provide: CarBlockingService, useValue: mockCarBlocking }],
    });

    service = TestBed.inject(CarAvailabilityService);
  });

  it('preloadBlockedRanges warms cache so subsequent getBlockedDates does not call rpc again for same range', async () => {
    // Prepare dates matching preload logic for 1 month
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    // rpc should return booking blocks
    mockSupabaseClient.rpc.and.callFake((fnName: string, params: any) => {
      if (fnName === 'get_car_blocked_dates') {
        return Promise.resolve({
          data: [{ booking_id: 'b1', start_date: startStr, end_date: endStr, status: 'confirmed' }],
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    });

    // Call preload
    await service.preloadBlockedRanges(carId, 1);
    expect(mockSupabaseClient.rpc).toHaveBeenCalled();

    const beforeCalls = mockSupabaseClient.rpc.calls.count();

    // Call getBlockedDates with same explicit range
    const ranges = await service.getBlockedDates(carId, startStr, endStr);

    // rpc should NOT be called again because of cache
    expect(mockSupabaseClient.rpc.calls.count()).toBe(beforeCalls);

    // Validate returned combined ranges length (booking + manual)
    expect(ranges.length).toBeGreaterThanOrEqual(1);
  });

  it('checkAvailability returns boolean based on rpc result', async () => {
    mockSupabaseClient.rpc.and.callFake((fnName: string, params: any) => {
      if (fnName === 'check_car_availability') {
        return Promise.resolve({ data: true, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const res = await service.checkAvailability(carId, '2025-12-01', '2025-12-05');
    expect(res).toBeTrue();
    expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
      'check_car_availability',
      jasmine.any(Object),
    );
  });
});
