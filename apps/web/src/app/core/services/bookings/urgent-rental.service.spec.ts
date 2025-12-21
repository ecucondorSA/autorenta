import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { UrgentRentalService } from '@core/services/bookings/urgent-rental.service';

const mockSupabaseClient = {
  from: jasmine.createSpy('from').and.returnValue({
    select: jasmine.createSpy('select').and.returnValue({
      eq: jasmine.createSpy('eq').and.returnValue(Promise.resolve({ data: [], error: null })),
      single: jasmine.createSpy('single').and.returnValue(Promise.resolve({ data: null, error: null })),
    }),
    insert: jasmine.createSpy('insert').and.returnValue(Promise.resolve({ data: null, error: null })),
    update: jasmine.createSpy('update').and.returnValue(Promise.resolve({ data: null, error: null })),
    delete: jasmine.createSpy('delete').and.returnValue(Promise.resolve({ data: null, error: null })),
  }),
  rpc: jasmine.createSpy('rpc').and.returnValue(Promise.resolve({ data: null, error: null })),
  auth: {
    getUser: jasmine.createSpy('getUser').and.returnValue(Promise.resolve({ data: { user: null }, error: null })),
    getSession: jasmine.createSpy('getSession').and.returnValue(Promise.resolve({ data: { session: null }, error: null })),
    onAuthStateChange: jasmine.createSpy('onAuthStateChange').and.returnValue({ data: { subscription: { unsubscribe: jasmine.createSpy() } } }),
  },
  storage: {
    from: jasmine.createSpy('from').and.returnValue({
      upload: jasmine.createSpy('upload').and.returnValue(Promise.resolve({ data: null, error: null })),
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

describe('UrgentRentalService', () => {
  let service: UrgentRentalService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UrgentRentalService,
        { provide: SupabaseClientService, useValue: mockSupabaseService }]
    });
    service = TestBed.inject(UrgentRentalService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have getCurrentLocation method', () => {
    expect(typeof service.getCurrentLocation).toBe('function');
  });

  it('should have checkImmediateAvailability method', () => {
    expect(typeof service.checkImmediateAvailability).toBe('function');
  });

  it('should have getUrgentQuote method', () => {
    expect(typeof service.getUrgentQuote).toBe('function');
  });

  it('should have createUrgentBooking method', () => {
    expect(typeof service.createUrgentBooking).toBe('function');
  });

  it('should have calculateDistance method', () => {
    expect(typeof service.calculateDistance).toBe('function');
  });

  it('should have calculateETA method', () => {
    expect(typeof service.calculateETA).toBe('function');
  });

  it('should have getUrgentDefaults method', () => {
    expect(typeof service.getUrgentDefaults).toBe('function');
  });

  it('should have formatDistance method', () => {
    expect(typeof service.formatDistance).toBe('function');
  });

  it('should have formatTime method', () => {
    expect(typeof service.formatTime).toBe('function');
  });

});
