import { TestBed } from '@angular/core/testing';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserBonusMalus, BonusMalusCalculation } from '../models';
import { BonusMalusService } from './bonus-malus.service';

describe('BonusMalusService', () => {
  let service: BonusMalusService;
  let mockSupabase: jasmine.SpyObj<SupabaseClient>;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';

  const mockUserBonusMalus: UserBonusMalus = {
    user_id: mockUserId,
    total_factor: -0.08, // 8% BONUS
    rating_factor: -0.05,
    cancellation_factor: -0.02,
    completion_factor: -0.01,
    verification_factor: 0.0,
    metrics: {
      average_rating: 4.8,
      owner_rating: 4.7,
      renter_rating: 4.9,
      cancellation_rate: 0.0,
      total_rentals: 15,
      completed_rentals: 15,
      is_verified: false,
      owner_reviews_count: 5,
      renter_reviews_count: 10,
      factors: {
        rating_factor: -0.05,
        cancellation_factor: -0.02,
        completion_factor: -0.01,
        verification_factor: 0.0,
      },
    },
    last_calculated_at: new Date().toISOString(),
    next_recalculation_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockCalculation: BonusMalusCalculation = {
    user_id: mockUserId,
    total_factor: -0.08,
    discount_or_surcharge: 'BONUS (Descuento)',
    percentage: '8%',
    breakdown: {
      rating_factor: -0.05,
      cancellation_factor: -0.02,
      completion_factor: -0.01,
      verification_factor: 0.0,
    },
    metrics: mockUserBonusMalus.metrics,
  };

  beforeEach(() => {
    // Create mock Supabase client
    mockSupabase = jasmine.createSpyObj('SupabaseClient', ['auth', 'from', 'rpc']);

    TestBed.configureTestingModule({
      providers: [BonusMalusService],
    });

    service = TestBed.inject(BonusMalusService);

    // Mock injectSupabase to return our mock
    (service as any).supabase = mockSupabase;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getUserBonusMalus', () => {
    it('should return user bonus-malus data', async () => {
      // Mock auth
      mockSupabase.auth = {
        getUser: jasmine.createSpy('getUser').and.returnValue(
          Promise.resolve({
            data: { user: { id: mockUserId } },
            error: null,
          }),
        ),
      } as any;

      // Mock from query
      const mockFrom = jasmine.createSpy('from').and.returnValue({
        select: jasmine.createSpy('select').and.returnValue({
          eq: jasmine.createSpy('eq').and.returnValue({
            maybeSingle: jasmine
              .createSpy('maybeSingle')
              .and.returnValue(Promise.resolve({ data: mockUserBonusMalus, error: null })),
          }),
        }),
      });
      mockSupabase.from = mockFrom;

      const result = await service.getUserBonusMalus();

      expect(result).toEqual(mockUserBonusMalus);
      expect(mockFrom).toHaveBeenCalledWith('user_bonus_malus');
    });

    it('should return null on error', async () => {
      mockSupabase.auth = {
        getUser: jasmine.createSpy('getUser').and.returnValue(
          Promise.resolve({
            data: { user: null },
            error: new Error('Not authenticated'),
          }),
        ),
      } as any;

      const result = await service.getUserBonusMalus();

      expect(result).toBeNull();
    });
  });

  describe('calculateBonusMalus', () => {
    it('should calculate bonus-malus for user', async () => {
      mockSupabase.auth = {
        getUser: jasmine.createSpy('getUser').and.returnValue(
          Promise.resolve({
            data: { user: { id: mockUserId } },
            error: null,
          }),
        ),
      } as any;

      mockSupabase.rpc = jasmine
        .createSpy('rpc')
        .and.returnValue(Promise.resolve({ data: mockCalculation, error: null }));

      const result = await service.calculateBonusMalus();

      expect(result).toEqual(mockCalculation);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('calculate_user_bonus_malus', {
        p_user_id: mockUserId,
      });
    });

    it('should return null on RPC error', async () => {
      mockSupabase.auth = {
        getUser: jasmine.createSpy('getUser').and.returnValue(
          Promise.resolve({
            data: { user: { id: mockUserId } },
            error: null,
          }),
        ),
      } as any;

      mockSupabase.rpc = jasmine
        .createSpy('rpc')
        .and.returnValue(Promise.resolve({ data: null, error: new Error('RPC failed') }));

      const result = await service.calculateBonusMalus();

      expect(result).toBeNull();
    });
  });

  describe('getBonusMalusFactor', () => {
    it('should return the total factor', async () => {
      spyOn(service, 'getUserBonusMalus').and.returnValue(Promise.resolve(mockUserBonusMalus));

      const factor = await service.getBonusMalusFactor(mockUserId);

      expect(factor).toBe(-0.08);
    });

    it('should return 0 if no data', async () => {
      spyOn(service, 'getUserBonusMalus').and.returnValue(Promise.resolve(null));

      const factor = await service.getBonusMalusFactor(mockUserId);

      expect(factor).toBe(0);
    });
  });

  describe('getBonusMalusDisplay', () => {
    it('should format significant BONUS correctly', () => {
      const display = service.getBonusMalusDisplay(-0.08);

      expect(display.type).toBe('BONUS');
      expect(display.percentage).toBe(8);
      expect(display.message).toContain('8% de descuento');
      expect(display.icon).toBe('🎉');
      expect(display.color).toBe('text-success-light');
      expect(display.tips?.length).toBeGreaterThan(0);
    });

    it('should format small BONUS correctly', () => {
      const display = service.getBonusMalusDisplay(-0.03);

      expect(display.type).toBe('BONUS');
      expect(display.percentage).toBe(3);
      expect(display.icon).toBe('✨');
      expect(display.color).toBe('text-success-light');
    });

    it('should format NEUTRAL correctly', () => {
      const display = service.getBonusMalusDisplay(0);

      expect(display.type).toBe('NEUTRAL');
      expect(display.percentage).toBe(0);
      expect(display.message).toContain('estándar');
      expect(display.icon).toBe('➖');
      expect(display.color).toBe('text-gray-600 dark:text-gray-300');
    });

    it('should format small MALUS correctly', () => {
      const display = service.getBonusMalusDisplay(0.03);

      expect(display.type).toBe('MALUS');
      expect(display.percentage).toBe(3);
      expect(display.message).toContain('3% de recargo');
      expect(display.icon).toBe('⚠️');
      expect(display.color).toBe('text-warning-light');
    });

    it('should format significant MALUS correctly', () => {
      const display = service.getBonusMalusDisplay(0.15);

      expect(display.type).toBe('MALUS');
      expect(display.percentage).toBe(15);
      expect(display.message).toContain('15% de recargo');
      expect(display.icon).toBe('⛔');
      expect(display.color).toBe('text-red-600');
    });
  });

  describe('needsRecalculation', () => {
    it('should return true if next_recalculation_at is in the past', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Yesterday
      const outdatedBonusMalus = { ...mockUserBonusMalus, next_recalculation_at: pastDate };

      spyOn(service, 'getUserBonusMalus').and.returnValue(Promise.resolve(outdatedBonusMalus));

      const needs = await service.needsRecalculation(mockUserId);

      expect(needs).toBe(true);
    });

    it('should return false if next_recalculation_at is in the future', async () => {
      spyOn(service, 'getUserBonusMalus').and.returnValue(Promise.resolve(mockUserBonusMalus));

      const needs = await service.needsRecalculation(mockUserId);

      expect(needs).toBe(false);
    });

    it('should return true if no bonus-malus data exists', async () => {
      spyOn(service, 'getUserBonusMalus').and.returnValue(Promise.resolve(null));

      const needs = await service.needsRecalculation(mockUserId);

      expect(needs).toBe(true);
    });
  });

  describe('getImprovementTips', () => {
    it('should provide tips for low rating', async () => {
      const lowRatingBonusMalus = {
        ...mockUserBonusMalus,
        metrics: {
          ...mockUserBonusMalus.metrics,
          average_rating: 3.5,
        },
      };

      spyOn(service, 'getUserBonusMalus').and.returnValue(Promise.resolve(lowRatingBonusMalus));

      const tips = await service.getImprovementTips(mockUserId);

      expect(tips.length).toBeGreaterThan(0);
      expect(tips.some((tip) => tip.includes('Mejora tu rating'))).toBe(true);
    });

    it('should provide tips for high cancellation rate', async () => {
      const highCancellationBonusMalus = {
        ...mockUserBonusMalus,
        metrics: {
          ...mockUserBonusMalus.metrics,
          cancellation_rate: 0.25,
        },
      };

      spyOn(service, 'getUserBonusMalus').and.returnValue(
        Promise.resolve(highCancellationBonusMalus),
      );

      const tips = await service.getImprovementTips(mockUserId);

      expect(tips.some((tip) => tip.includes('Reduce cancelaciones'))).toBe(true);
    });

    it('should provide tips for low experience', async () => {
      const lowExperienceBonusMalus = {
        ...mockUserBonusMalus,
        metrics: {
          ...mockUserBonusMalus.metrics,
          completed_rentals: 5,
        },
      };

      spyOn(service, 'getUserBonusMalus').and.returnValue(Promise.resolve(lowExperienceBonusMalus));

      const tips = await service.getImprovementTips(mockUserId);

      expect(tips.some((tip) => tip.includes('Gana experiencia'))).toBe(true);
    });

    it('should provide tips for unverified users', async () => {
      spyOn(service, 'getUserBonusMalus').and.returnValue(Promise.resolve(mockUserBonusMalus));

      const tips = await service.getImprovementTips(mockUserId);

      expect(tips.some((tip) => tip.includes('Verifica tu identidad'))).toBe(true);
    });

    it('should congratulate excellent users', async () => {
      const excellentBonusMalus = {
        ...mockUserBonusMalus,
        metrics: {
          average_rating: 4.9,
          owner_rating: 4.8,
          renter_rating: 5.0,
          cancellation_rate: 0.0,
          total_rentals: 30,
          completed_rentals: 30,
          is_verified: true,
          owner_reviews_count: 10,
          renter_reviews_count: 20,
          factors: mockUserBonusMalus.metrics.factors,
        },
      };

      spyOn(service, 'getUserBonusMalus').and.returnValue(Promise.resolve(excellentBonusMalus));

      const tips = await service.getImprovementTips(mockUserId);

      expect(tips.some((tip) => tip.includes('Excelente'))).toBe(true);
    });
  });

  describe('calculateMonetaryImpact', () => {
    it('should calculate BONUS impact correctly', () => {
      const basePrice = 1000;
      const factor = -0.08; // 8% descuento

      const impact = service.calculateMonetaryImpact(basePrice, factor);

      expect(impact.adjustedPrice).toBe(920);
      expect(impact.difference).toBe(-80);
      expect(impact.percentageChange).toBe(-8);
    });

    it('should calculate MALUS impact correctly', () => {
      const basePrice = 1000;
      const factor = 0.15; // 15% recargo

      const impact = service.calculateMonetaryImpact(basePrice, factor);

      expect(impact.adjustedPrice).toBe(1150);
      expect(impact.difference).toBe(150);
      expect(impact.percentageChange).toBe(15);
    });

    it('should handle neutral factor', () => {
      const basePrice = 1000;
      const factor = 0;

      const impact = service.calculateMonetaryImpact(basePrice, factor);

      expect(impact.adjustedPrice).toBe(1000);
      expect(impact.difference).toBe(0);
      expect(impact.percentageChange).toBe(0);
    });

    it('should round prices correctly', () => {
      const basePrice = 999.99;
      const factor = -0.075; // 7.5% descuento

      const impact = service.calculateMonetaryImpact(basePrice, factor);

      expect(impact.adjustedPrice).toBe(924.99);
      expect(impact.difference).toBe(-75);
    });
  });

  describe('getBonusMalusStats', () => {
    it('should aggregate stats correctly', async () => {
      const mockStats = [
        { total_factor: -0.08 },
        { total_factor: 0.05 },
        { total_factor: 0 },
        { total_factor: -0.03 },
        { total_factor: 0.1 },
      ];

      const mockFrom = jasmine.createSpy('from').and.returnValue({
        select: jasmine
          .createSpy('select')
          .and.returnValue(Promise.resolve({ data: mockStats, error: null })),
      });
      mockSupabase.from = mockFrom;

      const stats = await service.getBonusMalusStats();

      expect(stats).not.toBeNull();
      expect(stats!.totalUsers).toBe(5);
      expect(stats!.usersWithBonus).toBe(2);
      expect(stats!.usersWithMalus).toBe(2);
      expect(stats!.usersNeutral).toBe(1);
      expect(stats!.averageFactor).toBeCloseTo(0.008, 3);
    });
  });

  describe('recalculateAllBonusMalus', () => {
    it('should call RPC function', async () => {
      mockSupabase.rpc = jasmine
        .createSpy('rpc')
        .and.returnValue(Promise.resolve({ data: 42, error: null }));

      const result = await service.recalculateAllBonusMalus();

      expect(result.success).toBe(true);
      expect(result.count).toBe(42);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('recalculate_all_bonus_malus');
    });

    it('should handle errors', async () => {
      mockSupabase.rpc = jasmine
        .createSpy('rpc')
        .and.returnValue(Promise.resolve({ data: null, error: new Error('RPC failed') }));

      const result = await service.recalculateAllBonusMalus();

      expect(result.success).toBe(false);
      expect(result.count).toBe(0);
    });
  });
});
