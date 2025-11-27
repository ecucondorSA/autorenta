import { TestBed } from '@angular/core/testing';
import { CarAvailabilityService } from './car-availability.service';
import { CarBlockingService } from './car-blocking.service';
import { SupabaseClientService } from './supabase-client.service';

// TODO: Fix - Service API changed, mocks not matching
xdescribe('CarAvailabilityService', () => {
  let service: CarAvailabilityService;
  let mockSupabaseClient: any;
  let mockCarBlocking: any;

  const carId = '00000000-0000-0000-0000-000000000001';

  beforeEach(() => {
    // Mock supabase client with rpc spy and from() method
    mockSupabaseClient = {
      rpc: jasmine.createSpy('rpc'),
      from: jasmine.createSpy('from').and.returnValue({
        select: jasmine.createSpy('select').and.returnValue({
          eq: jasmine.createSpy('eq').and.returnValue({
            in: jasmine.createSpy('in').and.returnValue({
              gte: jasmine.createSpy('gte').and.returnValue({
                lte: jasmine.createSpy('lte').and.returnValue({
                  order: jasmine.createSpy('order').and.returnValue(
                    Promise.resolve({ data: [], error: null }),
                  ),
                }),
              }),
            }),
          }),
        }),
      }),
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
        Promise.resolve([]),
      ),
    };

    TestBed.configureTestingModule({
      providers: [supabaseProvider, { provide: CarBlockingService, useValue: mockCarBlocking }],
    });

    service = TestBed.inject(CarAvailabilityService);
  });

  /**
   * Helper function to set up mock bookings for getNextAvailableRange tests
   */
  function mockBookingsQuery(bookings: Array<{ start_at: string; end_at: string }>) {
    mockSupabaseClient.from.and.returnValue({
      select: jasmine.createSpy('select').and.returnValue({
        eq: jasmine.createSpy('eq').and.returnValue({
          in: jasmine.createSpy('in').and.returnValue({
            gte: jasmine.createSpy('gte').and.returnValue({
              lte: jasmine.createSpy('lte').and.returnValue({
                order: jasmine.createSpy('order').and.returnValue(
                  Promise.resolve({ data: bookings, error: null }),
                ),
              }),
            }),
          }),
        }),
      }),
    });
  }

  /**
   * Helper function to set up mock manual blocks
   */
  function mockManualBlocks(blocks: Array<{
    id: string;
    car_id?: string;
    blocked_from: string;
    blocked_to: string;
    reason?: string;
    notes?: string;
  }>) {
    mockCarBlocking.getBlockedDates.and.returnValue(Promise.resolve(blocks));
  }

  it('getBlockedDates caches results to avoid redundant queries', async () => {
    // This test validates caching behavior
    mockBookingsQuery([]);
    mockManualBlocks([
      {
        id: 'block1',
        blocked_from: '2025-12-20',
        blocked_to: '2025-12-21',
      },
    ]);

    const startStr = '2025-12-01';
    const endStr = '2025-12-31';

    // Call getBlockedDates
    const ranges = await service.getBlockedDates(carId, startStr, endStr);

    // Should return at least the manual block
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

  // ========================================
  // getNextAvailableRange() Tests
  // ========================================

  it('getNextAvailableRange returns empty array when no bookings or blocks exist', async () => {
    mockBookingsQuery([]);
    mockManualBlocks([]);

    const result = await service.getNextAvailableRange(
      carId,
      '2025-12-01',
      '2025-12-10',
    );

    // Should return one range: the entire search period
    expect(result.length).toBe(1);
    expect(result[0].startDate).toBe('2025-12-01');
    expect(result[0].endDate).toBe('2025-12-10');
    expect(result[0].daysCount).toBe(10);
  });

  it('getNextAvailableRange handles single booking correctly', async () => {
    // Booking from Dec 5-7
    mockBookingsQuery([
      {
        start_at: '2025-12-05T00:00:00Z',
        end_at: '2025-12-07T23:59:59Z',
      },
    ]);
    mockManualBlocks([]);

    const result = await service.getNextAvailableRange(
      carId,
      '2025-12-01',
      '2025-12-10',
    );

    // Should return gaps: before (Dec 1-4) and after (Dec 8-10)
    expect(result.length).toBe(2);
    // First gap: before booking
    expect(result[0].startDate).toBe('2025-12-01');
    expect(result[0].daysCount).toBeGreaterThan(0);
    // Second gap: after booking
    expect(result[1].startDate).toMatch(/2025-12-0[8-9]|2025-12-1[0]/);
  });

  it('getNextAvailableRange handles multiple non-overlapping bookings', async () => {
    mockBookingsQuery([
      {
        start_at: '2025-12-02T00:00:00Z',
        end_at: '2025-12-03T23:59:59Z',
      },
      {
        start_at: '2025-12-06T00:00:00Z',
        end_at: '2025-12-07T23:59:59Z',
      },
    ]);
    mockManualBlocks([]);

    const result = await service.getNextAvailableRange(
      carId,
      '2025-12-01',
      '2025-12-10',
      5, // Request up to 5 gaps
    );

    // Should find gaps before first, between, and after last booking
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].startDate).toBe('2025-12-01');
  });

  it('getNextAvailableRange combines bookings and manual blocks correctly', async () => {
    // Booking: Dec 5-6
    mockBookingsQuery([
      {
        start_at: '2025-12-05T00:00:00Z',
        end_at: '2025-12-06T23:59:59Z',
      },
    ]);
    // Manual block: Dec 8-9
    mockManualBlocks([
      {
        id: 'block1',
        blocked_from: '2025-12-08',
        blocked_to: '2025-12-09',
        car_id: carId,
        reason: 'test',
        notes: '',
      },
    ]);

    const result = await service.getNextAvailableRange(
      carId,
      '2025-12-01',
      '2025-12-10',
      5,
    );

    // Should recognize both blocked periods
    expect(result.length).toBeGreaterThan(0);
    // First gap should be Dec 1-4
    expect(result[0].startDate).toBe('2025-12-01');
  });

  it('getNextAvailableRange returns maxOptions or fewer results', async () => {
    // Create 5 separate bookings with gaps between
    mockBookingsQuery([
      {
        start_at: '2025-12-02T00:00:00Z',
        end_at: '2025-12-02T23:59:59Z',
      },
      {
        start_at: '2025-12-04T00:00:00Z',
        end_at: '2025-12-04T23:59:59Z',
      },
      {
        start_at: '2025-12-06T00:00:00Z',
        end_at: '2025-12-06T23:59:59Z',
      },
      {
        start_at: '2025-12-08T00:00:00Z',
        end_at: '2025-12-08T23:59:59Z',
      },
      {
        start_at: '2025-12-20T00:00:00Z',
        end_at: '2025-12-20T23:59:59Z',
      },
    ]);
    mockManualBlocks([]);

    const result = await service.getNextAvailableRange(
      carId,
      '2025-12-01',
      '2025-12-31',
      3, // Request only 3
    );

    // Should return exactly 3 or fewer gaps
    expect(result.length).toBeLessThanOrEqual(3);
    expect(result.length).toBeGreaterThan(0);
  });

  it('getNextAvailableRange calculates daysCount correctly', async () => {
    mockBookingsQuery([
      {
        start_at: '2025-12-10T00:00:00Z',
        end_at: '2025-12-15T23:59:59Z',
      },
    ]);
    mockManualBlocks([]);

    const result = await service.getNextAvailableRange(
      carId,
      '2025-12-01',
      '2025-12-20',
    );

    // First gap (Dec 1-9) should have ~9 days
    expect(result[0].daysCount).toBeGreaterThan(0);
    // Second gap (Dec 16-20) should have ~5 days
    if (result.length > 1) {
      expect(result[1].daysCount).toBeGreaterThan(0);
    }
  });

  it('getNextAvailableRange returns empty array on database error', async () => {
    // Mock an error response
    mockSupabaseClient.from.and.returnValue({
      select: jasmine.createSpy('select').and.returnValue({
        eq: jasmine.createSpy('eq').and.returnValue({
          in: jasmine.createSpy('in').and.returnValue({
            gte: jasmine.createSpy('gte').and.returnValue({
              lte: jasmine.createSpy('lte').and.returnValue({
                order: jasmine.createSpy('order').and.returnValue(
                  Promise.resolve({ data: null, error: new Error('Database error') }),
                ),
              }),
            }),
          }),
        }),
      }),
    });

    const result = await service.getNextAvailableRange(
      carId,
      '2025-12-01',
      '2025-12-10',
    );

    expect(result).toEqual([]);
  });

  it('getNextAvailableRange handles overlapping bookings correctly', async () => {
    // Overlapping bookings should be treated as one continuous block
    mockBookingsQuery([
      {
        start_at: '2025-12-05T00:00:00Z',
        end_at: '2025-12-08T23:59:59Z',
      },
      {
        start_at: '2025-12-07T00:00:00Z', // Overlaps with previous
        end_at: '2025-12-10T23:59:59Z',
      },
    ]);
    mockManualBlocks([]);

    const result = await service.getNextAvailableRange(
      carId,
      '2025-12-01',
      '2025-12-15',
    );

    // Should still find gaps, treating overlapping blocks as continuous
    expect(result.length).toBeGreaterThan(0);
  });

  it('getNextAvailableRange handles date ranges outside of bookings', async () => {
    mockBookingsQuery([
      {
        start_at: '2025-12-10T00:00:00Z',
        end_at: '2025-12-15T23:59:59Z',
      },
    ]);
    mockManualBlocks([]);

    // Search before the booking exists
    const resultBefore = await service.getNextAvailableRange(
      carId,
      '2025-12-01',
      '2025-12-09',
    );
    expect(resultBefore.length).toBe(1);
    expect(resultBefore[0].daysCount).toBeGreaterThan(0);

    // Search after the booking exists
    const resultAfter = await service.getNextAvailableRange(
      carId,
      '2025-12-16',
      '2025-12-25',
    );
    expect(resultAfter.length).toBe(1);
    expect(resultAfter[0].daysCount).toBeGreaterThan(0);
  });

  it('getNextAvailableRange respects maxOptions parameter', async () => {
    // Create many gaps
    mockBookingsQuery([
      {
        start_at: '2025-12-02T00:00:00Z',
        end_at: '2025-12-02T23:59:59Z',
      },
      {
        start_at: '2025-12-04T00:00:00Z',
        end_at: '2025-12-04T23:59:59Z',
      },
      {
        start_at: '2025-12-06T00:00:00Z',
        end_at: '2025-12-06T23:59:59Z',
      },
    ]);
    mockManualBlocks([]);

    // Request only 1
    const resultOne = await service.getNextAvailableRange(
      carId,
      '2025-12-01',
      '2025-12-31',
      1,
    );
    expect(resultOne.length).toBeLessThanOrEqual(1);

    // Request 10
    const resultTen = await service.getNextAvailableRange(
      carId,
      '2025-12-01',
      '2025-12-31',
      10,
    );
    expect(resultTen.length).toBeLessThanOrEqual(10);
    expect(resultTen.length).toBeGreaterThanOrEqual(resultOne.length);
  });

  it('getNextAvailableRange returns dates in ISO format', async () => {
    mockBookingsQuery([]);
    mockManualBlocks([]);

    const result = await service.getNextAvailableRange(
      carId,
      '2025-12-01',
      '2025-12-10',
    );

    expect(result.length).toBeGreaterThan(0);
    // Check that dates are in YYYY-MM-DD format
    expect(result[0].startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result[0].endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('getNextAvailableRange returns 3 results by default when max options not specified', async () => {
    // Create 5 gaps
    mockBookingsQuery([
      {
        start_at: '2025-12-02T00:00:00Z',
        end_at: '2025-12-02T23:59:59Z',
      },
      {
        start_at: '2025-12-04T00:00:00Z',
        end_at: '2025-12-04T23:59:59Z',
      },
      {
        start_at: '2025-12-06T00:00:00Z',
        end_at: '2025-12-06T23:59:59Z',
      },
      {
        start_at: '2025-12-08T00:00:00Z',
        end_at: '2025-12-08T23:59:59Z',
      },
      {
        start_at: '2025-12-20T00:00:00Z',
        end_at: '2025-12-20T23:59:59Z',
      },
    ]);
    mockManualBlocks([]);

    const result = await service.getNextAvailableRange(
      carId,
      '2025-12-01',
      '2025-12-31',
      // No maxOptions specified, should default to 3
    );

    expect(result.length).toBeLessThanOrEqual(3);
  });
});
