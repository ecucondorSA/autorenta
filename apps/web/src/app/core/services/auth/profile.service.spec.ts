import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { ProfileService } from '@core/services/auth/profile.service';

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

describe('ProfileService', () => {
  let service: ProfileService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ProfileService,
        { provide: SupabaseClientService, useValue: mockSupabaseService },
      ],
    });
    service = TestBed.inject(ProfileService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have getCurrentProfile method', () => {
    expect(typeof service.getCurrentProfile).toBe('function');
  });

  it('should have getProfileById method', () => {
    expect(typeof service.getProfileById).toBe('function');
  });

  it('should have updateProfile method', () => {
    expect(typeof service.updateProfile).toBe('function');
  });

  it('should have uploadAvatar method', () => {
    expect(typeof service.uploadAvatar).toBe('function');
  });

  it('should have deleteAvatar method', () => {
    expect(typeof service.deleteAvatar).toBe('function');
  });

  it('should have canPublishCars method', () => {
    expect(typeof service.canPublishCars).toBe('function');
  });

  it('should have canBookCars method', () => {
    expect(typeof service.canBookCars).toBe('function');
  });

  it('should have getMe method', () => {
    expect(typeof service.getMe).toBe('function');
  });

  it('should have safeUpdateProfile method', () => {
    expect(typeof service.safeUpdateProfile).toBe('function');
  });

  it('should have uploadDocument method', () => {
    expect(typeof service.uploadDocument).toBe('function');
  });
});
