import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { AuthService } from '@core/services/auth/auth.service';

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

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthService, { provide: SupabaseClientService, useValue: mockSupabaseService }],
    });
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have ensureSession method', () => {
    expect(typeof service.ensureSession).toBe('function');
  });

  it('should have getCurrentUser method', () => {
    expect(typeof service.getCurrentUser).toBe('function');
  });

  it('should have getCachedUserId method', () => {
    expect(typeof service.getCachedUserId).toBe('function');
  });

  it('should have getCachedUser method', () => {
    expect(typeof service.getCachedUser).toBe('function');
  });

  it('should have refreshSession method', () => {
    expect(typeof service.refreshSession).toBe('function');
  });

  it('should have signUp method', () => {
    expect(typeof service.signUp).toBe('function');
  });

  it('should have signIn method', () => {
    expect(typeof service.signIn).toBe('function');
  });

  it('should have signInWithGoogle method', () => {
    expect(typeof service.signInWithGoogle).toBe('function');
  });

  it('should have signInWithTikTok method', () => {
    expect(typeof service.signInWithTikTok).toBe('function');
  });

  it('should have handleTikTokCallback method', () => {
    expect(typeof service.handleTikTokCallback).toBe('function');
  });
});
