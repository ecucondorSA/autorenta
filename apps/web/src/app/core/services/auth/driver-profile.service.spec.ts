import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { DriverProfileService } from '@core/services/auth/driver-profile.service';

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

describe('DriverProfileService', () => {
  let service: DriverProfileService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DriverProfileService,
        { provide: SupabaseClientService, useValue: mockSupabaseService }]
    });
    service = TestBed.inject(DriverProfileService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have loadProfile method', () => {
    expect(typeof service.loadProfile).toBe('function');
  });

  it('should have initializeProfile method', () => {
    expect(typeof service.initializeProfile).toBe('function');
  });

  it('should have getClassBenefits method', () => {
    expect(typeof service.getClassBenefits).toBe('function');
  });

  it('should have getAllClassBenefits method', () => {
    expect(typeof service.getAllClassBenefits).toBe('function');
  });

  it('should have isProfileInitialized method', () => {
    expect(typeof service.isProfileInitialized).toBe('function');
  });

  it('should have ensureProfile method', () => {
    expect(typeof service.ensureProfile).toBe('function');
  });

  it('should have updateClassOnEvent method', () => {
    expect(typeof service.updateClassOnEvent).toBe('function');
  });

  it('should have getProgressToNextClass method', () => {
    expect(typeof service.getProgressToNextClass).toBe('function');
  });

  it('should have getClassDescription method', () => {
    expect(typeof service.getClassDescription).toBe('function');
  });

  it('should have getClassBadge method', () => {
    expect(typeof service.getClassBadge).toBe('function');
  });

});
