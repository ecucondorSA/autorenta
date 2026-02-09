import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { PhoneVerificationService } from '@core/services/auth/phone-verification.service';
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

describe('PhoneVerificationService', () => {
  let service: PhoneVerificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ...testProviders,
        PhoneVerificationService,
        { provide: SupabaseClientService, useValue: mockSupabaseService },
      ],
    });
    service = TestBed.inject(PhoneVerificationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have checkStatus method', () => {
    expect(typeof service.checkStatus).toBe('function');
  });

  it('should have sendVerification method', () => {
    expect(typeof service.sendVerification).toBe('function');
  });

  it('should have sendOTP method', () => {
    expect(typeof service.sendOTP).toBe('function');
  });

  it('should have verifyOTP method', () => {
    expect(typeof service.verifyOTP).toBe('function');
  });

  it('should have checkPhoneStatus method', () => {
    expect(typeof service.checkPhoneStatus).toBe('function');
  });

  it('should have getRemainingAttempts method', () => {
    expect(typeof service.getRemainingAttempts).toBe('function');
  });

  it('should have clearError method', () => {
    expect(typeof service.clearError).toBe('function');
  });

  it('should have resetOTPSentState method', () => {
    expect(typeof service.resetOTPSentState).toBe('function');
  });
});
