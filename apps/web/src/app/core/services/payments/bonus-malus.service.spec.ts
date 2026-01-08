import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { BonusMalusService } from '@core/services/payments/bonus-malus.service';

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

describe('BonusMalusService', () => {
  let service: BonusMalusService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        BonusMalusService,
        { provide: SupabaseClientService, useValue: mockSupabaseService },
      ],
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

  // ===========================================================================
  // TIER DISPLAY TESTS
  // ===========================================================================

  describe('getTierDisplay', () => {
    it('should return elite display for elite tier', () => {
      const display = service.getTierDisplay('elite');
      expect(display.label).toBe('Elite');
      expect(display.color).toBe('#10B981');
      expect(display.icon).toBe('trophy');
      expect(display.benefits).toContain('Sin depósito de garantía');
    });

    it('should return trusted display for trusted tier', () => {
      const display = service.getTierDisplay('trusted');
      expect(display.label).toBe('Trusted');
      expect(display.color).toBe('#8B5CF6');
      expect(display.benefits).toContain('50% descuento en depósito');
    });

    it('should return standard display for standard tier', () => {
      const display = service.getTierDisplay('standard');
      expect(display.label).toBe('Standard');
      expect(display.color).toBe('#6B7280');
    });

    it('should return standard display for unknown tier', () => {
      const display = service.getTierDisplay('unknown' as any);
      expect(display.label).toBe('Standard');
    });
  });

  // ===========================================================================
  // DEPOSIT DISCOUNT TESTS
  // ===========================================================================

  describe('getDepositDiscount', () => {
    it('should return 1.0 (100% off) for elite users', async () => {
      // Mock getUserTier to return elite
      spyOn(service, 'getUserTier').and.returnValue(Promise.resolve('elite'));

      const discount = await service.getDepositDiscount('user-123');
      expect(discount).toBe(1.0);
    });

    it('should return 0.5 (50% off) for trusted users', async () => {
      spyOn(service, 'getUserTier').and.returnValue(Promise.resolve('trusted'));

      const discount = await service.getDepositDiscount('user-123');
      expect(discount).toBe(0.5);
    });

    it('should return 0.0 (no discount) for standard users', async () => {
      spyOn(service, 'getUserTier').and.returnValue(Promise.resolve('standard'));

      const discount = await service.getDepositDiscount('user-123');
      expect(discount).toBe(0.0);
    });
  });

  // ===========================================================================
  // DEPOSIT WAIVER TESTS
  // ===========================================================================

  describe('shouldWaiveDeposit', () => {
    it('should waive deposit only for elite users', async () => {
      spyOn(service, 'getUserTier').and.returnValue(Promise.resolve('elite'));
      expect(await service.shouldWaiveDeposit()).toBeTrue();
    });

    it('should not waive deposit for trusted users', async () => {
      spyOn(service, 'getUserTier').and.returnValue(Promise.resolve('trusted'));
      expect(await service.shouldWaiveDeposit()).toBeFalse();
    });

    it('should not waive deposit for standard users', async () => {
      spyOn(service, 'getUserTier').and.returnValue(Promise.resolve('standard'));
      expect(await service.shouldWaiveDeposit()).toBeFalse();
    });
  });

  // ===========================================================================
  // ERROR HANDLING TESTS
  // ===========================================================================

  describe('Error Handling', () => {
    it('should return null on getUserBonusMalus error', async () => {
      // Create fresh mock that throws error
      const errorMock = {
        from: jasmine.createSpy('from').and.returnValue({
          select: jasmine.createSpy('select').and.returnValue({
            eq: jasmine.createSpy('eq').and.returnValue({
              maybeSingle: jasmine
                .createSpy('maybeSingle')
                .and.returnValue(
                  Promise.resolve({ data: null, error: { message: 'Database error' } }),
                ),
            }),
          }),
        }),
        rpc: jasmine.createSpy('rpc'),
        auth: {
          getUser: jasmine
            .createSpy('getUser')
            .and.returnValue(Promise.resolve({ data: { user: { id: 'test-user' } }, error: null })),
        },
      };

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [BonusMalusService, { provide: SupabaseClientService, useValue: errorMock }],
      });

      const freshService = TestBed.inject(BonusMalusService);
      const result = await freshService.getUserBonusMalus('user-123');

      // Should return null on error, not throw
      expect(result).toBeNull();
    });

    it('should return null on calculateBonusMalus RPC error', async () => {
      const errorMock = {
        rpc: jasmine
          .createSpy('rpc')
          .and.returnValue(Promise.resolve({ data: null, error: { message: 'RPC error' } })),
        auth: {
          getUser: jasmine
            .createSpy('getUser')
            .and.returnValue(Promise.resolve({ data: { user: { id: 'test-user' } }, error: null })),
        },
      };

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [BonusMalusService, { provide: SupabaseClientService, useValue: errorMock }],
      });

      const freshService = TestBed.inject(BonusMalusService);
      const result = await freshService.calculateBonusMalus('user-123');

      expect(result).toBeNull();
    });

    it('should return standard tier on getUserTier error', async () => {
      spyOn(service, 'getUserBonusMalus').and.returnValue(Promise.resolve(null));

      const tier = await service.getUserTier('user-123');
      expect(tier).toBe('standard');
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle missing tier in database and calculate fallback', async () => {
      // Mock data without tier
      const mockData = {
        user_id: 'user-123',
        total_factor: -0.05,
        metrics: { is_verified: true },
        tier: null,
      };

      const mockClient = {
        from: jasmine.createSpy('from').and.returnValue({
          select: jasmine.createSpy('select').and.returnValue({
            eq: jasmine.createSpy('eq').and.returnValue({
              maybeSingle: jasmine
                .createSpy('maybeSingle')
                .and.returnValue(Promise.resolve({ data: mockData, error: null })),
            }),
          }),
        }),
        rpc: jasmine.createSpy('rpc'),
        auth: {
          getUser: jasmine
            .createSpy('getUser')
            .and.returnValue(Promise.resolve({ data: { user: { id: 'user-123' } }, error: null })),
        },
      };

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [BonusMalusService, { provide: SupabaseClientService, useValue: mockClient }],
      });

      const freshService = TestBed.inject(BonusMalusService);
      const result = await freshService.getUserBonusMalus('user-123');

      // Should have calculated tier as 'trusted' (verified + factor <= 0)
      expect(result).toBeTruthy();
      expect(result?.tier).toBe('trusted');
    });

    it('should handle unauthenticated user gracefully', async () => {
      const unauthMock = {
        rpc: jasmine.createSpy('rpc'),
        auth: {
          getUser: jasmine
            .createSpy('getUser')
            .and.returnValue(Promise.resolve({ data: { user: null }, error: null })),
        },
      };

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [BonusMalusService, { provide: SupabaseClientService, useValue: unauthMock }],
      });

      const freshService = TestBed.inject(BonusMalusService);

      // Should return null, not throw
      const result = await freshService.calculateBonusMalus();
      expect(result).toBeNull();
    });
  });
});
