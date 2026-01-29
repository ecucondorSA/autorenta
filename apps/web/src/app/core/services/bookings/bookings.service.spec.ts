import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { BookingsService } from '@core/services/bookings/bookings.service';
import { testProviders } from '@app/testing/test-providers';

const mockSupabaseClient = {
  from: jasmine.createSpy('from').and.returnValue({
    select: jasmine.createSpy('select').and.returnValue({
      eq: jasmine.createSpy('eq').and.returnValue(Promise.resolve({ data: [], error: null })),
      single: jasmine
        .createSpy('single')
        .and.returnValue(Promise.resolve({ data: null, error: null })),
    }),
    insert: jasmine
      .createSpy('insert')
      .and.returnValue(Promise.resolve({ data: null, error: null })),
    update: jasmine
      .createSpy('update')
      .and.returnValue(Promise.resolve({ data: null, error: null })),
    delete: jasmine
      .createSpy('delete')
      .and.returnValue(Promise.resolve({ data: null, error: null })),
  }),
  rpc: jasmine.createSpy('rpc').and.returnValue(Promise.resolve({ data: null, error: null })),
  auth: {
    getUser: jasmine
      .createSpy('getUser')
      .and.returnValue(Promise.resolve({ data: { user: null }, error: null })),
    getSession: jasmine
      .createSpy('getSession')
      .and.returnValue(Promise.resolve({ data: { session: null }, error: null })),
    onAuthStateChange: jasmine
      .createSpy('onAuthStateChange')
      .and.returnValue({ data: { subscription: { unsubscribe: jasmine.createSpy() } } }),
  },
  storage: {
    from: jasmine.createSpy('from').and.returnValue({
      upload: jasmine
        .createSpy('upload')
        .and.returnValue(Promise.resolve({ data: null, error: null })),
      getPublicUrl: jasmine.createSpy('getPublicUrl').and.returnValue({ data: { publicUrl: '' } }),
    }),
  },
};

const mockSupabaseService = {
  client: mockSupabaseClient,
  from: mockSupabaseClient.from,
  rpc: mockSupabaseClient.rpc,
  auth: mockSupabaseClient.auth,
  storage: mockSupabaseClient.storage,
};

describe('BookingsService', () => {
  let service: BookingsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...testProviders, BookingsService,
        { provide: SupabaseClientService, useValue: mockSupabaseService },],
    });
    service = TestBed.inject(BookingsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have requestBooking method', () => {
    expect(typeof service.requestBooking).toBe('function');
  });

  it('should have requestBookingWithLocation method', () => {
    expect(typeof service.requestBookingWithLocation).toBe('function');
  });

  it('should have getMyBookings method', () => {
    expect(typeof service.getMyBookings).toBe('function');
  });

  it('should have getOwnerBookings method', () => {
    expect(typeof service.getOwnerBookings).toBe('function');
  });

  it('should have getBookingById method', () => {
    expect(typeof service.getBookingById).toBe('function');
  });

  it('should have recalculatePricing method', () => {
    expect(typeof service.recalculatePricing).toBe('function');
  });

  it('should have updateBooking method', () => {
    expect(typeof service.updateBooking).toBe('function');
  });

  it('should have markAsPaid method', () => {
    expect(typeof service.markAsPaid).toBe('function');
  });

  it('should have getOwnerContact method', () => {
    expect(typeof service.getOwnerContact).toBe('function');
  });

  it('should have createBookingAtomic method', () => {
    expect(typeof service.createBookingAtomic).toBe('function');
  });
});
