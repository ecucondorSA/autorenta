import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from './supabase-client.service';
import { MarketplaceOnboardingService } from './marketplace-onboarding.service';

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

describe('MarketplaceOnboardingService', () => {
  let service: MarketplaceOnboardingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MarketplaceOnboardingService,
        { provide: SupabaseClientService, useValue: mockSupabaseService }]
    });
    service = TestBed.inject(MarketplaceOnboardingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have startOnboarding method', () => {
    expect(typeof service.startOnboarding).toBe('function');
  });

  it('should have handleCallback method', () => {
    expect(typeof service.handleCallback).toBe('function');
  });

  it('should have getMarketplaceStatus method', () => {
    expect(typeof service.getMarketplaceStatus).toBe('function');
  });

  it('should have canListCars method', () => {
    expect(typeof service.canListCars).toBe('function');
  });

  it('should have unlinkAccount method', () => {
    expect(typeof service.unlinkAccount).toBe('function');
  });

  it('should have getDecryptedAccessToken method', () => {
    expect(typeof service.getDecryptedAccessToken).toBe('function');
  });

  it('should have getDecryptedRefreshToken method', () => {
    expect(typeof service.getDecryptedRefreshToken).toBe('function');
  });

});
