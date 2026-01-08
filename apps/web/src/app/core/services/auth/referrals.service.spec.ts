import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { ReferralsService } from '@core/services/auth/referrals.service';

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

describe('ReferralsService', () => {
  let service: ReferralsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ReferralsService,
        { provide: SupabaseClientService, useValue: mockSupabaseService },
      ],
    });
    service = TestBed.inject(ReferralsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have getOrCreateMyReferralCode method', () => {
    expect(typeof service.getOrCreateMyReferralCode).toBe('function');
  });

  it('should have applyReferralCode method', () => {
    expect(typeof service.applyReferralCode).toBe('function');
  });

  it('should have getMyStats method', () => {
    expect(typeof service.getMyStats).toBe('function');
  });

  it('should have getMyReferrals method', () => {
    expect(typeof service.getMyReferrals).toBe('function');
  });

  it('should have getMyRewards method', () => {
    expect(typeof service.getMyRewards).toBe('function');
  });

  it('should have validateReferralCode method', () => {
    expect(typeof service.validateReferralCode).toBe('function');
  });

  it('should have getReferralCodeInfo method', () => {
    expect(typeof service.getReferralCodeInfo).toBe('function');
  });

  it('should have loadAllData method', () => {
    expect(typeof service.loadAllData).toBe('function');
  });
});
