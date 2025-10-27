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

  const mock = {
    rpc: rpcSpy,
    auth: authSpy,
    from: fromSpy,
    storage: storageSpy,
  };

  return mock;
}

/**
 * Configure RPC responses for availability tests
 */
export function mockAvailabilityRPCs(supabaseMock: ReturnType<typeof createSupabaseMock>) {
  // Mock get_available_cars RPC
  supabaseMock.rpc.and.callFake((functionName: string) => {
    if (functionName === 'get_available_cars') {
      return Promise.resolve({
        data: [
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
          },
        ],
        error: null,
      });
    }

    if (functionName === 'is_car_available') {
      return Promise.resolve({
        data: { available: true, conflicting_bookings: [] },
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
