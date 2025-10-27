import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Mock factory for Supabase client used in tests
 * Provides pre-configured mocks for common RPC calls
 */
export function createSupabaseMock() {
  const rpcSpy = jasmine.createSpy('rpc');
  const authSpy = jasmine.createSpyObj('auth', ['getUser']);
  const fromSpy = jasmine.createSpy('from');
  const storageSpy = jasmine.createSpyObj('storage', ['from']);

  // Create a chainable query builder mock
  const createQueryBuilder = () => {
    const builder: any = {};
    
    // Define methods that return builder
    builder.select = jasmine.createSpy('select').and.returnValue(builder);
    builder.eq = jasmine.createSpy('eq').and.returnValue(builder);
    builder.neq = jasmine.createSpy('neq').and.returnValue(builder);
    builder.gt = jasmine.createSpy('gt').and.returnValue(builder);
    builder.gte = jasmine.createSpy('gte').and.returnValue(builder);
    builder.lt = jasmine.createSpy('lt').and.returnValue(builder);
    builder.lte = jasmine.createSpy('lte').and.returnValue(builder);
    builder.like = jasmine.createSpy('like').and.returnValue(builder);
    builder.ilike = jasmine.createSpy('ilike').and.returnValue(builder);
    builder.in = jasmine.createSpy('in').and.returnValue(builder);
    builder.is = jasmine.createSpy('is').and.returnValue(builder);
    builder.order = jasmine.createSpy('order').and.returnValue(builder);
    builder.limit = jasmine.createSpy('limit').and.returnValue(builder);
    builder.range = jasmine.createSpy('range').and.returnValue(builder);
    builder.single = jasmine.createSpy('single').and.returnValue(Promise.resolve({ data: null, error: null }));
    builder.maybeSingle = jasmine.createSpy('maybeSingle').and.returnValue(Promise.resolve({ data: null, error: null }));
    
    // Make builder thenable for awaiting
    builder.then = (resolve: any) => {
      resolve({ data: [], error: null });
      return Promise.resolve({ data: [], error: null });
    };
    
    return builder;
  };

  // Configure from() to return query builder
  fromSpy.and.callFake((table: string) => createQueryBuilder());

  const mock = {
    rpc: rpcSpy,
    auth: authSpy,
    from: fromSpy,
    storage: storageSpy,
    createQueryBuilder, // Export for custom configurations
  };

  return mock;
}

/**
 * Configure RPC responses for availability tests
 */
export function mockAvailabilityRPCs(supabaseMock: ReturnType<typeof createSupabaseMock>) {
  // Mock get_available_cars RPC
  supabaseMock.rpc.and.callFake((functionName: string, params?: any) => {
    if (functionName === 'get_available_cars') {
      // Handle city filtering
      const allCars = [
        {
          id: '8a854591-3fec-4425-946e-c7bb764a7333',
          title: 'Chevrolet Onix 2025',
          brand: 'Chevrolet',
          model: 'Onix',
          year: 2025,
          location_city: 'Buenos Aires',
          price_per_day: 15000,
          currency: 'ARS',
          status: 'available',
          photos: [],
        },
      ];

      // If p_city is provided in params, filter by city
      if (params?.p_city) {
        const filtered = allCars.filter(
          car => car.location_city.toLowerCase() === params.p_city.toLowerCase()
        );
        return Promise.resolve({ data: filtered, error: null });
      }

      return Promise.resolve({ data: allCars, error: null });
    }

    if (functionName === 'is_car_available') {
      // Return boolean directly, not an object
      return Promise.resolve({
        data: true,
        error: null,
      });
    }

    return Promise.resolve({ data: null, error: { message: 'Function not mocked' } });
  });
}

/**
 * Configure RPC responses for booking logic tests
 */
export function mockBookingRPCs(supabaseMock: ReturnType<typeof createSupabaseMock>) {
  supabaseMock.rpc.and.callFake((functionName: string) => {
    if (functionName === 'create_booking_with_payment') {
      return Promise.resolve({
        data: {
          booking_id: 'test-booking-123',
          payment_intent_id: 'test-payment-123',
        },
        error: null,
      });
    }

    if (functionName === 'check_booking_conflicts') {
      return Promise.resolve({
        data: { has_conflicts: false, conflicting_bookings: [] },
        error: null,
      });
    }

    return Promise.resolve({ data: null, error: { message: 'Function not mocked' } });
  });
}

/**
 * Configure RPC responses for payments tests
 */
export function mockPaymentRPCs(supabaseMock: ReturnType<typeof createSupabaseMock>) {
  supabaseMock.rpc.and.callFake((functionName: string) => {
    if (functionName === 'process_payment') {
      return Promise.resolve({
        data: {
          payment_id: 'test-payment-123',
          status: 'completed',
        },
        error: null,
      });
    }

    if (functionName === 'create_payment_intent') {
      return Promise.resolve({
        data: {
          intent_id: 'test-intent-123',
          client_secret: 'test-secret',
        },
        error: null,
      });
    }

    return Promise.resolve({ data: null, error: { message: 'Function not mocked' } });
  });
}
