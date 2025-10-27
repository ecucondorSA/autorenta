import { RealtimeChannel } from '@supabase/supabase-js';

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
    builder.single = jasmine
      .createSpy('single')
      .and.returnValue(Promise.resolve({ data: null, error: null }));
    builder.maybeSingle = jasmine
      .createSpy('maybeSingle')
      .and.returnValue(Promise.resolve({ data: null, error: null }));

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
      // Define mock car data - match actual RPC response structure
      const allCars = [
        {
          id: '8a854591-3fec-4425-946e-c7bb764a7333',
          title: 'Chevrolet Onix 2025',
          brand: 'Chevrolet',
          model: 'Onix',
          year: 2025,
          location_city: 'Buenos Aires',
          location: { city: 'Buenos Aires' }, // Also for filtering
          price_per_day: 15000,
          currency: 'ARS',
          status: 'available',
          photos: [],
        },
        {
          id: '9b965692-4fed-5536-a57f-d8cc875b8444',
          title: 'Toyota Corolla 2024',
          brand: 'Toyota',
          model: 'Corolla',
          year: 2024,
          location_city: 'Córdoba',
          location: { city: 'Córdoba' }, // Also for filtering
          price_per_day: 18000,
          currency: 'ARS',
          status: 'available',
          photos: [],
        },
      ];

      let filtered = [...allCars];

      // Filter by city (case-insensitive) - RPC doesn't filter by city
      // The service filters after getting results
      if (params?.p_city) {
        filtered = filtered.filter(
          (car) => car.location?.city?.toLowerCase() === params.p_city.toLowerCase(),
        );
      }

      // Apply pagination
      const limit = params?.p_limit || 100;
      const offset = params?.p_offset || 0;
      filtered = filtered.slice(offset, offset + limit);

      return Promise.resolve({ data: filtered, error: null });
    }

    if (functionName === 'is_car_available') {
      // Return boolean directly
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
  supabaseMock.rpc.and.callFake((functionName: string, params?: any) => {
    if (functionName === 'request_booking' || functionName === 'create_booking_with_payment') {
      // Validate UUID format
      const carId = params?.p_car_id || params?.car_id;
      if (carId && !isValidUUID(carId)) {
        return Promise.resolve({
          data: null,
          error: { message: `invalid input syntax for type uuid: "${carId}"`, code: '22P02' },
        });
      }

      // Validate dates
      const startDate = params?.p_start || params?.start_at;
      const endDate = params?.p_end || params?.end_at;

      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const now = new Date();

        // Check if start is in the past
        if (start < now) {
          return Promise.resolve({
            data: null,
            error: {
              message: 'La fecha de inicio debe ser posterior a la fecha actual',
              code: 'INVALID_DATE',
            },
          });
        }

        // Check if end is before start
        if (end < start) {
          return Promise.resolve({
            data: null,
            error: {
              message: 'La fecha de fin debe ser posterior a la fecha de inicio',
              code: 'INVALID_DATE_RANGE',
            },
          });
        }

        // Check if booking is longer than 30 days
        const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > 30) {
          return Promise.resolve({
            data: null,
            error: {
              message: 'Las reservas no pueden exceder los 30 días',
              code: 'BOOKING_TOO_LONG',
            },
          });
        }
      }

      return Promise.resolve({
        data: 'test-booking-' + Date.now(),
        error: null,
      });
    }

    if (functionName === 'check_booking_conflicts') {
      return Promise.resolve({
        data: { has_conflicts: false, conflicting_bookings: [] },
        error: null,
      });
    }

    if (functionName === 'pricing_recalculate') {
      return Promise.resolve({
        data: null,
        error: null,
      });
    }

    return Promise.resolve({ data: null, error: { message: 'Function not mocked' } });
  });
}

// Helper to validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
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

/**
 * Create a comprehensive mock with all scenarios
 * Use this for most tests that need full coverage
 */
export function mockAllRPCs(supabaseMock: ReturnType<typeof createSupabaseMock>) {
  supabaseMock.rpc.and.callFake((functionName: string, params?: any) => {
    // Availability RPCs
    if (functionName === 'get_available_cars') {
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

      let filtered = [...allCars];
      if (params?.p_city) {
        filtered = filtered.filter(
          (car) => car.location_city.toLowerCase() === params.p_city.toLowerCase(),
        );
      }

      return Promise.resolve({ data: filtered, error: null });
    }

    if (functionName === 'is_car_available') {
      return Promise.resolve({ data: true, error: null });
    }

    // Booking RPCs
    if (functionName === 'request_booking' || functionName === 'create_booking_with_payment') {
      const carId = params?.p_car_id || params?.car_id;
      if (carId && !isValidUUID(carId)) {
        return Promise.resolve({
          data: null,
          error: { message: `invalid input syntax for type uuid: "${carId}"`, code: '22P02' },
        });
      }

      const startDate = params?.p_start || params?.start_at;
      const endDate = params?.p_end || params?.end_at;

      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const now = new Date();

        if (start < now) {
          return Promise.resolve({
            data: null,
            error: {
              message: 'La fecha de inicio debe ser posterior a la fecha actual',
              code: 'INVALID_DATE',
            },
          });
        }

        if (end < start) {
          return Promise.resolve({
            data: null,
            error: {
              message: 'La fecha de fin debe ser posterior a la fecha de inicio',
              code: 'INVALID_DATE_RANGE',
            },
          });
        }

        const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > 30) {
          return Promise.resolve({
            data: null,
            error: {
              message: 'Las reservas no pueden exceder los 30 días',
              code: 'BOOKING_TOO_LONG',
            },
          });
        }
      }

      return Promise.resolve({
        data: 'test-booking-' + Date.now(),
        error: null,
      });
    }

    if (functionName === 'pricing_recalculate') {
      return Promise.resolve({ data: null, error: null });
    }

    if (functionName === 'check_booking_conflicts') {
      return Promise.resolve({
        data: { has_conflicts: false, conflicting_bookings: [] },
        error: null,
      });
    }

    // Payment RPCs
    if (functionName === 'process_payment') {
      return Promise.resolve({
        data: { payment_id: 'test-payment-123', status: 'completed' },
        error: null,
      });
    }

    if (functionName === 'create_payment_intent') {
      return Promise.resolve({
        data: { intent_id: 'test-intent-123', client_secret: 'test-secret' },
        error: null,
      });
    }

    // Default: function not mocked
    return Promise.resolve({
      data: null,
      error: { message: `RPC function '${functionName}' not mocked`, code: 'FUNCTION_NOT_MOCKED' },
    });
  });
}
