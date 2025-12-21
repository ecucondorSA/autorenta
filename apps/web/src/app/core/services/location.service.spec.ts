import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from './supabase-client.service';
import { LocationService } from './location.service';

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

describe('LocationService', () => {
  let service: LocationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LocationService,
        { provide: SupabaseClientService, useValue: mockSupabaseService }]
    });
    service = TestBed.inject(LocationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have getUserLocation method', () => {
    expect(typeof service.getUserLocation).toBe('function');
  });

  it('should have getHomeLocation method', () => {
    expect(typeof service.getHomeLocation).toBe('function');
  });

  it('should have getCurrentPosition method', () => {
    expect(typeof service.getCurrentPosition).toBe('function');
  });

  it('should have saveHomeLocation method', () => {
    expect(typeof service.saveHomeLocation).toBe('function');
  });

  it('should have clearHomeLocation method', () => {
    expect(typeof service.clearHomeLocation).toBe('function');
  });

  it('should have geocodeAndSaveHomeLocation method', () => {
    expect(typeof service.geocodeAndSaveHomeLocation).toBe('function');
  });

  it('should have requestLocationPermission method', () => {
    expect(typeof service.requestLocationPermission).toBe('function');
  });

  it('should have hasHomeLocation method', () => {
    expect(typeof service.hasHomeLocation).toBe('function');
  });

  it('should have getLocationByChoice method', () => {
    expect(typeof service.getLocationByChoice).toBe('function');
  });

  it('should have clearWatch method', () => {
    expect(typeof service.clearWatch).toBe('function');
  });

});
