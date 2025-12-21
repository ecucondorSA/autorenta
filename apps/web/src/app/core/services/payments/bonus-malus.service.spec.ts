import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { BonusMalusService } from '@core/services/payments/bonus-malus.service';

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

describe('BonusMalusService', () => {
  let service: BonusMalusService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BonusMalusService,
        { provide: SupabaseClientService, useValue: mockSupabaseService }]
    });
    service = TestBed.inject(BonusMalusService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have getUserBonusMalus method', () => {
    expect(typeof service.getUserBonusMalus).toBe('function');
  });

  it('should have getUserTier method', () => {
    expect(typeof service.getUserTier).toBe('function');
  });

  it('should have shouldWaiveDeposit method', () => {
    expect(typeof service.shouldWaiveDeposit).toBe('function');
  });

  it('should have getDepositDiscount method', () => {
    expect(typeof service.getDepositDiscount).toBe('function');
  });

  it('should have calculateBonusMalus method', () => {
    expect(typeof service.calculateBonusMalus).toBe('function');
  });

  it('should have getBonusMalusFactor method', () => {
    expect(typeof service.getBonusMalusFactor).toBe('function');
  });

  it('should have needsRecalculation method', () => {
    expect(typeof service.needsRecalculation).toBe('function');
  });

  it('should have getImprovementTips method', () => {
    expect(typeof service.getImprovementTips).toBe('function');
  });

  it('should have getBonusMalusStats method', () => {
    expect(typeof service.getBonusMalusStats).toBe('function');
  });

  it('should have recalculateAllBonusMalus method', () => {
    expect(typeof service.recalculateAllBonusMalus).toBe('function');
  });

});
