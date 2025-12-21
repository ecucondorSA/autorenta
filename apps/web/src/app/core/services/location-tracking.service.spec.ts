import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from './supabase-client.service';
import { LocationTrackingService } from './location-tracking.service';

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

describe('LocationTrackingService', () => {
  let service: LocationTrackingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LocationTrackingService,
        { provide: SupabaseClientService, useValue: mockSupabaseService }]
    });
    service = TestBed.inject(LocationTrackingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have startTracking method', () => {
    expect(typeof service.startTracking).toBe('function');
  });

  it('should have stopTracking method', () => {
    expect(typeof service.stopTracking).toBe('function');
  });

  it('should have checkLocationPermission method', () => {
    expect(typeof service.checkLocationPermission).toBe('function');
  });

  it('should have requestLocationPermission method', () => {
    expect(typeof service.requestLocationPermission).toBe('function');
  });

  it('should have getActiveTracking method', () => {
    expect(typeof service.getActiveTracking).toBe('function');
  });

  it('should have calculateDistance method', () => {
    expect(typeof service.calculateDistance).toBe('function');
  });

  it('should have estimateArrivalTime method', () => {
    expect(typeof service.estimateArrivalTime).toBe('function');
  });

});
