import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { MarketplaceService } from './marketplace.service';

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

describe('MarketplaceService', () => {
  let service: MarketplaceService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MarketplaceService,
        { provide: SupabaseClientService, useValue: mockSupabaseService }]
    });
    service = TestBed.inject(MarketplaceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have validateMarketplaceConfig method', () => {
    expect(typeof service.validateMarketplaceConfig).toBe('function');
  });

  it('should have isUserOnboardingComplete method', () => {
    expect(typeof service.isUserOnboardingComplete).toBe('function');
  });

  it('should have getUserCollectorId method', () => {
    expect(typeof service.getUserCollectorId).toBe('function');
  });

  it('should have getMarketplaceConfig method', () => {
    expect(typeof service.getMarketplaceConfig).toBe('function');
  });

  it('should have validateCarHasCollectorId method', () => {
    expect(typeof service.validateCarHasCollectorId).toBe('function');
  });

  it('should have getOnboardingStatus method', () => {
    expect(typeof service.getOnboardingStatus).toBe('function');
  });

  it('should have initiateOnboarding method', () => {
    expect(typeof service.initiateOnboarding).toBe('function');
  });

  it('should have calculateSplitAmounts method', () => {
    expect(typeof service.calculateSplitAmounts).toBe('function');
  });

});
