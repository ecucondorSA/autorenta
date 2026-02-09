import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { DynamicPricingService } from '@core/services/payments/dynamic-pricing.service';
import { testProviders } from '@app/testing/test-providers';
import {
  PriceLock,
  PriceLockErrorCode,
  isPriceLockExpired,
  calculateLockExpiresIn,
  formatLockCountdown,
  validatePriceLock,
  calculatePriceComparison,
  calculateSurgeTier,
  generateSurgeInfo,
  generatePriceComparisonMessage,
  rpcResponseToPriceLock,
  type LockPriceRpcResponse,
  type DynamicPriceSnapshot,
} from '@core/models';

// Helper to create a mock PriceLock
function createMockPriceLock(overrides: Partial<PriceLock> = {}): PriceLock {
  const now = new Date();
  const lockedUntil = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes from now

  return {
    lockToken: 'test-lock-token-uuid',
    carId: 'car-123',
    userId: 'user-456',
    rentalStart: new Date(now.getTime() + 24 * 60 * 60 * 1000), // tomorrow
    rentalHours: 24,
    pricePerHour: 10.5,
    totalPrice: 252,
    currency: 'USD',
    lockedUntil,
    createdAt: now,
    isExpired: false,
    priceSnapshot: {
      pricePerHour: 10.5,
      totalPrice: 252,
      currency: 'USD',
      breakdown: {
        basePrice: 10,
        dayFactor: 0.05,
        hourFactor: 0,
        userFactor: -0.05,
        demandFactor: 0.05,
        eventFactor: 0,
        totalMultiplier: 1.05,
      },
      details: {
        userRentals: 5,
        dayOfWeek: 6, // Saturday
        hourOfDay: 14,
        regionId: 'region-ar',
      },
      uses_dynamic_pricing: true,
      locked_until: lockedUntil.toISOString(),
      lock_token: 'test-lock-token-uuid',
      car_id: 'car-123',
      user_id: 'user-456',
      rental_start: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      rental_hours: 24,
      created_at: now.toISOString(),
      surgeActive: false,
    },
    ...overrides,
  };
}

// Helper to create expired PriceLock
function createExpiredPriceLock(): PriceLock {
  const now = new Date();
  const expiredTime = new Date(now.getTime() - 60 * 1000); // 1 minute ago

  return createMockPriceLock({
    lockedUntil: expiredTime,
    isExpired: true,
  });
}

const mockSupabaseClient = {
  from: jasmine.createSpy('from').and.returnValue({
    select: jasmine.createSpy('select').and.returnValue({
      eq: jasmine.createSpy('eq').and.returnValue(Promise.resolve({ data: [], error: null })),
      single: jasmine
        .createSpy('single')
        .and.returnValue(Promise.resolve({ data: null, error: null })),
      order: jasmine.createSpy('order').and.returnValue({
        limit: jasmine
          .createSpy('limit')
          .and.returnValue(Promise.resolve({ data: [], error: null })),
      }),
      lte: jasmine.createSpy('lte').and.returnValue({
        gte: jasmine.createSpy('gte').and.returnValue(Promise.resolve({ data: [], error: null })),
      }),
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
  functions: {
    invoke: jasmine
      .createSpy('invoke')
      .and.returnValue(Promise.resolve({ data: null, error: null })),
  },
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

describe('DynamicPricingService', () => {
  let service: DynamicPricingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ...testProviders,
        DynamicPricingService,
        { provide: SupabaseClientService, useValue: mockSupabaseService },
      ],
    });
    service = TestBed.inject(DynamicPricingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have getRegions method', () => {
    expect(typeof service.getRegions).toBe('function');
  });

  it('should have getRegionById method', () => {
    expect(typeof service.getRegionById).toBe('function');
  });

  it('should have calculatePrice method', () => {
    expect(typeof service.calculatePrice).toBe('function');
  });

  it('should have calculatePriceRPC method', () => {
    expect(typeof service.calculatePriceRPC).toBe('function');
  });

  it('should have calculateBatchPricesRPC method', () => {
    expect(typeof service.calculateBatchPricesRPC).toBe('function');
  });

  it('should have getLatestDemand method', () => {
    expect(typeof service.getLatestDemand).toBe('function');
  });

  it('should have getActiveEvents method', () => {
    expect(typeof service.getActiveEvents).toBe('function');
  });

  it('should have getUserPricingHistory method', () => {
    expect(typeof service.getUserPricingHistory).toBe('function');
  });

  it('should have getQuickPrice method', () => {
    expect(typeof service.getQuickPrice).toBe('function');
  });

  it('should have getBatchPrices method', () => {
    expect(typeof service.getBatchPrices).toBe('function');
  });

  // ===========================================================================
  // PRICE LOCK VALIDATION TESTS
  // ===========================================================================

  describe('Price Lock Validation', () => {
    describe('isPriceLockExpired', () => {
      it('should return false for valid (non-expired) lock', () => {
        const validLock = createMockPriceLock();
        expect(isPriceLockExpired(validLock)).toBeFalse();
      });

      it('should return true for expired lock (past lockedUntil)', () => {
        const expiredLock = createExpiredPriceLock();
        expect(isPriceLockExpired(expiredLock)).toBeTrue();
      });

      it('should return true if isExpired flag is set', () => {
        const lock = createMockPriceLock({ isExpired: true });
        expect(isPriceLockExpired(lock)).toBeTrue();
      });

      it('should handle edge case where lockedUntil is exactly now', () => {
        const now = new Date();
        const lock = createMockPriceLock({ lockedUntil: now });
        // Should be expired because now >= lockedUntil
        expect(isPriceLockExpired(lock)).toBeTrue();
      });
    });

    describe('calculateLockExpiresIn', () => {
      it('should return positive seconds for valid lock', () => {
        const lock = createMockPriceLock();
        const expiresIn = calculateLockExpiresIn(lock);
        expect(expiresIn).toBeGreaterThan(0);
        expect(expiresIn).toBeLessThanOrEqual(15 * 60); // max 15 minutes
      });

      it('should return 0 for expired lock', () => {
        const expiredLock = createExpiredPriceLock();
        const expiresIn = calculateLockExpiresIn(expiredLock);
        expect(expiresIn).toBe(0);
      });

      it('should return approximately 900 seconds for fresh 15-minute lock', () => {
        const now = new Date();
        const lockedUntil = new Date(now.getTime() + 15 * 60 * 1000);
        const lock = createMockPriceLock({ lockedUntil });

        const expiresIn = calculateLockExpiresIn(lock);
        // Allow 2 second tolerance for test execution time
        expect(expiresIn).toBeGreaterThanOrEqual(898);
        expect(expiresIn).toBeLessThanOrEqual(900);
      });
    });

    describe('formatLockCountdown', () => {
      it('should format 900 seconds as 15:00', () => {
        expect(formatLockCountdown(900)).toBe('15:00');
      });

      it('should format 60 seconds as 01:00', () => {
        expect(formatLockCountdown(60)).toBe('01:00');
      });

      it('should format 0 seconds as 00:00', () => {
        expect(formatLockCountdown(0)).toBe('00:00');
      });

      it('should format 125 seconds as 02:05', () => {
        expect(formatLockCountdown(125)).toBe('02:05');
      });

      it('should format 59 seconds as 00:59', () => {
        expect(formatLockCountdown(59)).toBe('00:59');
      });
    });

    describe('validatePriceLock', () => {
      it('should return null for valid lock', () => {
        const validLock = createMockPriceLock();
        expect(validatePriceLock(validLock)).toBeNull();
      });

      it('should return error message for null lock', () => {
        const error = validatePriceLock(null);
        expect(error).not.toBeNull();
        expect(error).toContain('No hay precio bloqueado');
      });

      it('should return error message for expired lock', () => {
        const expiredLock = createExpiredPriceLock();
        const error = validatePriceLock(expiredLock);
        expect(error).not.toBeNull();
        expect(error).toContain('expirado');
      });
    });
  });

  // ===========================================================================
  // PRICE COMPARISON TESTS
  // ===========================================================================

  describe('Price Comparison', () => {
    describe('calculatePriceComparison', () => {
      it('should detect cheaper dynamic price', () => {
        const comparison = calculatePriceComparison(100, 85);
        expect(comparison.isCheaper).toBeTrue();
        expect(comparison.isMoreExpensive).toBeFalse();
        expect(comparison.difference).toBe(-15);
        expect(comparison.percentageDiff).toBe(-15);
      });

      it('should detect more expensive dynamic price', () => {
        const comparison = calculatePriceComparison(100, 120);
        expect(comparison.isCheaper).toBeFalse();
        expect(comparison.isMoreExpensive).toBeTrue();
        expect(comparison.difference).toBe(20);
        expect(comparison.percentageDiff).toBe(20);
      });

      it('should detect equal prices', () => {
        const comparison = calculatePriceComparison(100, 100);
        expect(comparison.isCheaper).toBeFalse();
        expect(comparison.isMoreExpensive).toBeFalse();
        expect(comparison.difference).toBe(0);
        expect(comparison.percentageDiff).toBe(0);
      });
    });

    describe('generatePriceComparisonMessage', () => {
      it('should generate savings message for cheaper price', () => {
        const comparison = calculatePriceComparison(100, 85);
        const message = generatePriceComparisonMessage(comparison);
        expect(message).toContain('Ahorrás');
        expect(message).toContain('15');
      });

      it('should generate warning message for more expensive price', () => {
        const comparison = calculatePriceComparison(100, 120);
        const message = generatePriceComparisonMessage(comparison);
        expect(message).toContain('más caro');
        expect(message).toContain('20');
      });

      it('should generate neutral message for equal prices', () => {
        const comparison = calculatePriceComparison(100, 100);
        const message = generatePriceComparisonMessage(comparison);
        expect(message).toContain('Mismo precio');
      });
    });
  });

  // ===========================================================================
  // SURGE TIER TESTS
  // ===========================================================================

  describe('Surge Tier Calculation', () => {
    describe('calculateSurgeTier', () => {
      it('should return none for demandFactor <= 0', () => {
        expect(calculateSurgeTier(0)).toBe('none');
        expect(calculateSurgeTier(-0.1)).toBe('none');
      });

      it('should return low for demandFactor > 0 and < 0.05', () => {
        expect(calculateSurgeTier(0.01)).toBe('low');
        expect(calculateSurgeTier(0.04)).toBe('low');
      });

      it('should return medium for demandFactor >= 0.05 and < 0.15', () => {
        expect(calculateSurgeTier(0.05)).toBe('medium');
        expect(calculateSurgeTier(0.1)).toBe('medium');
        expect(calculateSurgeTier(0.14)).toBe('medium');
      });

      it('should return high for demandFactor >= 0.15 and < 0.25', () => {
        expect(calculateSurgeTier(0.15)).toBe('high');
        expect(calculateSurgeTier(0.2)).toBe('high');
        expect(calculateSurgeTier(0.24)).toBe('high');
      });

      it('should return extreme for demandFactor >= 0.25', () => {
        expect(calculateSurgeTier(0.25)).toBe('extreme');
        expect(calculateSurgeTier(0.3)).toBe('extreme');
        expect(calculateSurgeTier(0.5)).toBe('extreme');
      });
    });

    describe('generateSurgeInfo', () => {
      it('should return green badge for no surge', () => {
        const snapshot = createMockPriceLock().priceSnapshot;
        snapshot.breakdown.demandFactor = 0;
        snapshot.surgeTier = 'none';

        const info = generateSurgeInfo(snapshot);
        expect(info.isActive).toBeFalse();
        expect(info.badgeColor).toBe('green');
        expect(info.tier).toBe('none');
      });

      it('should return red badge for high surge', () => {
        const snapshot = createMockPriceLock().priceSnapshot;
        snapshot.breakdown.demandFactor = 0.2;
        snapshot.surgeTier = 'high';

        const info = generateSurgeInfo(snapshot);
        expect(info.isActive).toBeTrue();
        expect(info.badgeColor).toBe('red');
        expect(info.message).toContain('Alta demanda');
        expect(info.message).toContain('20%');
      });

      it('should return correct message for extreme surge', () => {
        const snapshot = createMockPriceLock().priceSnapshot;
        snapshot.breakdown.demandFactor = 0.3;
        snapshot.surgeTier = 'extreme';

        const info = generateSurgeInfo(snapshot);
        expect(info.message).toContain('Demanda extrema');
        expect(info.icon).toBe('🔥');
      });
    });
  });

  // ===========================================================================
  // RPC RESPONSE CONVERSION TESTS
  // ===========================================================================

  describe('RPC Response Conversion', () => {
    describe('rpcResponseToPriceLock', () => {
      it('should convert valid RPC response to PriceLock', () => {
        const now = new Date();
        const lockedUntil = new Date(now.getTime() + 15 * 60 * 1000);

        const rpcResponse: LockPriceRpcResponse = {
          uses_dynamic_pricing: true,
          price: {
            price_per_hour: 12.5,
            total_price: 300,
            currency: 'USD',
            breakdown: {
              basePrice: 10,
              dayFactor: 0.1,
              hourFactor: 0.05,
              userFactor: -0.05,
              demandFactor: 0.15,
              eventFactor: 0,
              totalMultiplier: 1.25,
            },
            details: {
              userRentals: 3,
              dayOfWeek: 6,
              hourOfDay: 18,
              regionId: 'region-ar',
            },
          },
          locked_until: lockedUntil.toISOString(),
          lock_token: 'lock-uuid-123',
          car_id: 'car-abc',
          user_id: 'user-xyz',
          rental_start: now.toISOString(),
          rental_hours: 24,
          created_at: now.toISOString(),
          surge_active: true,
          surge_message: 'Alta demanda',
        };

        const priceLock = rpcResponseToPriceLock(rpcResponse);

        expect(priceLock).not.toBeNull();
        expect(priceLock!.lockToken).toBe('lock-uuid-123');
        expect(priceLock!.carId).toBe('car-abc');
        expect(priceLock!.userId).toBe('user-xyz');
        expect(priceLock!.pricePerHour).toBe(12.5);
        expect(priceLock!.totalPrice).toBe(300);
        expect(priceLock!.currency).toBe('USD');
        expect(priceLock!.priceSnapshot.surgeActive).toBeTrue();
      });

      it('should return null for fixed pricing response', () => {
        const rpcResponse: LockPriceRpcResponse = {
          uses_dynamic_pricing: false,
          fixed_price: 50,
          message: 'Este auto usa precio fijo',
        };

        const priceLock = rpcResponseToPriceLock(rpcResponse);
        expect(priceLock).toBeNull();
      });

      it('should return null for response without lock_token', () => {
        const rpcResponse: LockPriceRpcResponse = {
          uses_dynamic_pricing: true,
          price: {
            price_per_hour: 10,
            total_price: 240,
            currency: 'USD',
            breakdown: {} as any,
            details: {} as any,
          },
          // Missing lock_token
        };

        const priceLock = rpcResponseToPriceLock(rpcResponse);
        expect(priceLock).toBeNull();
      });
    });
  });

  // ===========================================================================
  // SERVICE METHODS TESTS
  // ===========================================================================

  describe('Service Price Lock Methods', () => {
    it('should have lockPrice method', () => {
      expect(typeof service.lockPrice).toBe('function');
    });

    it('should have isPriceLockValid method', () => {
      expect(typeof service.isPriceLockValid).toBe('function');
    });

    it('should have getLockExpiresIn method', () => {
      expect(typeof service.getLockExpiresIn).toBe('function');
    });

    it('should have refreshPriceLock method', () => {
      expect(typeof service.refreshPriceLock).toBe('function');
    });

    it('should have validatePriceLockForBooking method', () => {
      expect(typeof service.validatePriceLockForBooking).toBe('function');
    });

    it('should have formatLockCountdown method', () => {
      expect(typeof service.formatLockCountdown).toBe('function');
    });

    it('should have isPriceLockExpiringSoon method', () => {
      expect(typeof service.isPriceLockExpiringSoon).toBe('function');
    });

    it('should return false for isPriceLockValid with null', async () => {
      const isValid = await service.isPriceLockValid(null);
      expect(isValid).toBeFalse();
    });

    it('should return 0 for getLockExpiresIn with null', async () => {
      const expiresIn = await service.getLockExpiresIn(null);
      expect(expiresIn).toBe(0);
    });

    it('should return 00:00 for formatLockCountdown with null', async () => {
      const countdown = await service.formatLockCountdown(null);
      expect(countdown).toBe('00:00');
    });
  });
});
