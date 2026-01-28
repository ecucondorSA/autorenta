import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { CarAvailabilityService } from '@core/services/cars/car-availability.service';
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

describe('CarAvailabilityService', () => {
  let service: CarAvailabilityService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...testProviders, CarAvailabilityService,
        { provide: SupabaseClientService, useValue: mockSupabaseService },],
    });
    service = TestBed.inject(CarAvailabilityService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have getBlackouts method', () => {
    expect(typeof service.getBlackouts).toBe('function');
  });

  it('should have getHandoverPoints method', () => {
    expect(typeof service.getHandoverPoints).toBe('function');
  });

  it('should have getBlockedRangesWithDetails method', () => {
    expect(typeof service.getBlockedRangesWithDetails).toBe('function');
  });

  it('should have checkAvailability method', () => {
    expect(typeof service.checkAvailability).toBe('function');
  });

  it('should have getBlockedDates method', () => {
    expect(typeof service.getBlockedDates).toBe('function');
  });

  it('should have getNextAvailableDate method', () => {
    expect(typeof service.getNextAvailableDate).toBe('function');
  });

  it('should have getNextAvailableRange method', () => {
    expect(typeof service.getNextAvailableRange).toBe('function');
  });

  it('should have getAvailableCars method', () => {
    expect(typeof service.getAvailableCars).toBe('function');
  });

  it('should have hasActiveBookings method', () => {
    expect(typeof service.hasActiveBookings).toBe('function');
  });
});
