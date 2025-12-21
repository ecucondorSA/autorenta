import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { BonusProtectorService } from './bonus-protector.service';

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

describe('BonusProtectorService', () => {
  let service: BonusProtectorService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BonusProtectorService,
        { provide: SupabaseClientService, useValue: mockSupabaseService }]
    });
    service = TestBed.inject(BonusProtectorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have loadOptions method', () => {
    expect(typeof service.loadOptions).toBe('function');
  });

  it('should have loadActiveProtector method', () => {
    expect(typeof service.loadActiveProtector).toBe('function');
  });

  it('should have purchaseProtector method', () => {
    expect(typeof service.purchaseProtector).toBe('function');
  });

  it('should have canPurchase method', () => {
    expect(typeof service.canPurchase).toBe('function');
  });

  it('should have getRecommendedLevel method', () => {
    expect(typeof service.getRecommendedLevel).toBe('function');
  });

  it('should have getProtectionCapacity method', () => {
    expect(typeof service.getProtectionCapacity).toBe('function');
  });

  it('should have calculatePotentialSavings method', () => {
    expect(typeof service.calculatePotentialSavings).toBe('function');
  });

  it('should have getFormattedExpiry method', () => {
    expect(typeof service.getFormattedExpiry).toBe('function');
  });

  it('should have getDaysRemainingText method', () => {
    expect(typeof service.getDaysRemainingText).toBe('function');
  });

  it('should have getStatusBadgeColor method', () => {
    expect(typeof service.getStatusBadgeColor).toBe('function');
  });

});
