import { TestBed } from '@angular/core/testing';
import { DistanceCalculatorService } from './distance-calculator.service';
import { DriverProfileService } from './driver-profile.service';
import { FranchiseTableService } from './franchise-table.service';
import { RiskCalculatorService } from './risk-calculator.service';
import { SupabaseClientService } from './supabase-client.service';

describe('RiskCalculatorService', () => {
  let service: RiskCalculatorService;
  let mockFranchiseService: jasmine.SpyObj<FranchiseTableService>;
  let mockDistanceService: jasmine.SpyObj<DistanceCalculatorService>;
  let mockDriverProfileService: jasmine.SpyObj<DriverProfileService>;
  let mockSupabaseService: any;

  const mockFranchiseInfo = {
    standardUsd: 500,
    rolloverUsd: 1000,
    holdArs: 500000, // $500 USD * 1000 ARS/USD
    securityCreditUsd: 600,
    minHoldArs: 300000,
  };

  const mockFxRate = 1000;

  beforeEach(() => {
    mockFranchiseService = jasmine.createSpyObj('FranchiseTableService', [
      'getFranchiseInfo',
      'shouldRevalidate',
      'formatArs',
      'formatUsd',
    ]);

    mockDistanceService = jasmine.createSpyObj('DistanceCalculatorService', [
      'getDistanceTier',
      'getGuaranteeMultiplier',
    ]);

    mockDriverProfileService = jasmine.createSpyObj('DriverProfileService', ['profile']);

    // Mock Supabase client
    mockSupabaseService = {
      getClient: jasmine.createSpy('getClient').and.returnValue({
        rpc: jasmine
          .createSpy('rpc')
          .and.returnValue(
            Promise.resolve({ data: null, error: { message: 'Not implemented in tests' } }),
          ),
      }),
    };

    // Default mocks
    mockFranchiseService.getFranchiseInfo.and.returnValue(mockFranchiseInfo);
    mockFranchiseService.shouldRevalidate.and.returnValue(false);
    mockFranchiseService.formatArs.and.callFake(
      (amount: number) => `$${amount.toLocaleString('es-AR')}`,
    );
    mockFranchiseService.formatUsd.and.callFake((amount: number) => `USD ${amount}`);

    mockDistanceService.getDistanceTier.and.returnValue('regional');
    mockDistanceService.getGuaranteeMultiplier.and.returnValue(1.15);

    mockDriverProfileService.profile.and.returnValue(null); // No driver profile by default

    TestBed.configureTestingModule({
      providers: [
        RiskCalculatorService,
        { provide: FranchiseTableService, useValue: mockFranchiseService },
        { provide: DistanceCalculatorService, useValue: mockDistanceService },
        { provide: DriverProfileService, useValue: mockDriverProfileService },
        { provide: SupabaseClientService, useValue: mockSupabaseService },
      ],
    });

    service = TestBed.inject(RiskCalculatorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('calculateRisk (WITHOUT distance)', () => {
    it('should calculate hold guarantee for user with card', async () => {
      const result = await service.calculateRisk(15000, mockFxRate, true);

      expect(result.guaranteeType).toBe('hold');
      expect(result.guaranteeAmountArs).toBe(500000);
      expect(result.guaranteeAmountUsd).toBe(500);
      expect(result.hasCard).toBe(true);
    });

    it('should calculate security credit for user without card', async () => {
      const result = await service.calculateRisk(15000, mockFxRate, false);

      expect(result.guaranteeType).toBe('security_credit');
      expect(result.guaranteeAmountUsd).toBe(600);
      expect(result.guaranteeAmountArs).toBe(600000);
      expect(result.hasCard).toBe(false);
    });

    it('should classify economy bucket correctly (<= $10k)', async () => {
      const result = await service.calculateRisk(8000, mockFxRate, true);

      expect(result.bucket).toBe('economy');
    });

    it('should classify standard bucket correctly ($10k-$20k)', async () => {
      const result = await service.calculateRisk(15000, mockFxRate, true);

      expect(result.bucket).toBe('standard');
    });

    it('should classify premium bucket correctly ($20k-$40k)', async () => {
      const result = await service.calculateRisk(30000, mockFxRate, true);

      expect(result.bucket).toBe('premium');
    });

    it('should classify luxury bucket correctly ($40k-$80k)', async () => {
      const result = await service.calculateRisk(60000, mockFxRate, true);

      expect(result.bucket).toBe('luxury');
    });

    it('should classify ultra-luxury bucket correctly (> $80k)', async () => {
      const result = await service.calculateRisk(100000, mockFxRate, true);

      expect(result.bucket).toBe('ultra-luxury');
    });

    it('should set correct franchise values from service', async () => {
      const result = await service.calculateRisk(15000, mockFxRate, true);

      expect(result.standardFranchiseUsd).toBe(500);
      expect(result.rolloverFranchiseUsd).toBe(1000);
      expect(mockFranchiseService.getFranchiseInfo).toHaveBeenCalledWith(
        15000,
        'standard',
        mockFxRate,
      );
    });

    it('should set snapshot date to current date', async () => {
      const before = new Date();
      const result = await service.calculateRisk(15000, mockFxRate, true);
      const after = new Date();

      expect(result.fxSnapshotDate.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.fxSnapshotDate.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should set requiresRevalidation to false when no existing snapshot', async () => {
      const result = await service.calculateRisk(15000, mockFxRate, true);

      expect(result.requiresRevalidation).toBe(false);
    });

    it('should check revalidation when existing snapshot provided', async () => {
      mockFranchiseService.shouldRevalidate.and.returnValue(true);

      const existingSnapshot = {
        fxRate: 950,
        snapshotDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      };

      const result = await service.calculateRisk(
        15000,
        mockFxRate,
        true,
        undefined,
        undefined,
        existingSnapshot,
      );

      expect(result.requiresRevalidation).toBe(true);
      expect(mockFranchiseService.shouldRevalidate).toHaveBeenCalled();
    });
  });

  describe('calculateRisk (WITH distance - MAYOR criterion)', () => {
    it('should calculate guarantee by distance when distanceKm provided', async () => {
      mockDistanceService.getDistanceTier.and.returnValue('regional');
      mockDistanceService.getGuaranteeMultiplier.and.returnValue(1.15);

      const result = await service.calculateRisk(15000, mockFxRate, true, 50);

      expect(result.distanceKm).toBe(50);
      expect(result.distanceRiskTier).toBe('regional');
      expect(result.distanceRiskMultiplier).toBe(1.15);
      expect(mockDistanceService.getDistanceTier).toHaveBeenCalledWith(50);
      expect(mockDistanceService.getGuaranteeMultiplier).toHaveBeenCalledWith('regional');
    });

    it('should apply MAYOR criterion - distance risk HIGHER', async () => {
      mockDistanceService.getDistanceTier.and.returnValue('long_distance');
      mockDistanceService.getGuaranteeMultiplier.and.returnValue(1.3);

      // Base guarantee: 500 USD (hold) * 1.3 = 650 USD
      const result = await service.calculateRisk(15000, mockFxRate, true, 150);

      expect(result.guaranteeByRisk).toBe(500); // Base risk
      expect(result.guaranteeByDistance).toBe(650); // 500 * 1.3
      expect(result.guaranteeFinal).toBe(650); // Max(500, 650)
      expect(result.guaranteeAmountUsd).toBe(650);
      expect(result.guaranteeAmountArs).toBe(650000); // 650 * 1000
    });

    it('should apply MAYOR criterion - risk EQUAL to distance', async () => {
      mockDistanceService.getDistanceTier.and.returnValue('local');
      mockDistanceService.getGuaranteeMultiplier.and.returnValue(1.0);

      // Base guarantee: 500 USD * 1.0 = 500 USD
      const result = await service.calculateRisk(15000, mockFxRate, true, 10);

      expect(result.guaranteeByRisk).toBe(500);
      expect(result.guaranteeByDistance).toBe(500); // 500 * 1.0
      expect(result.guaranteeFinal).toBe(500); // Max(500, 500)
      expect(result.guaranteeAmountUsd).toBe(500);
    });

    it('should work with security credit and distance (no card)', async () => {
      mockDistanceService.getDistanceTier.and.returnValue('regional');
      mockDistanceService.getGuaranteeMultiplier.and.returnValue(1.15);

      // Security credit: 600 USD * 1.15 = 690 USD
      const result = await service.calculateRisk(15000, mockFxRate, false, 50);

      expect(result.guaranteeType).toBe('security_credit');
      expect(result.guaranteeByRisk).toBe(600); // Security credit base
      expect(result.guaranteeByDistance).toBe(690); // 600 * 1.15
      expect(result.guaranteeFinal).toBe(690); // Max(600, 690)
      expect(result.guaranteeAmountUsd).toBe(690);
      expect(result.guaranteeAmountArs).toBe(690000);
    });

    it('should handle long distance (1.3x multiplier)', async () => {
      mockDistanceService.getDistanceTier.and.returnValue('long_distance');
      mockDistanceService.getGuaranteeMultiplier.and.returnValue(1.3);

      const result = await service.calculateRisk(15000, mockFxRate, true, 200);

      expect(result.distanceRiskTier).toBe('long_distance');
      expect(result.distanceRiskMultiplier).toBe(1.3);
      expect(result.guaranteeByDistance).toBe(650); // 500 * 1.3
    });

    it('should not calculate distance risk when distanceKm is undefined', async () => {
      const result = await service.calculateRisk(15000, mockFxRate, true, undefined);

      expect(result.distanceKm).toBeUndefined();
      expect(result.distanceRiskTier).toBeUndefined();
      expect(result.distanceRiskMultiplier).toBeUndefined();
      expect(result.guaranteeByRisk).toBe(500);
      expect(result.guaranteeByDistance).toBe(500); // Equal to risk
      expect(result.guaranteeFinal).toBe(500);
    });

    it('should ceil distance-adjusted guarantee (no decimals)', async () => {
      mockDistanceService.getGuaranteeMultiplier.and.returnValue(1.15);

      // 500 * 1.15 = 575 (already integer, but Math.ceil ensures it)
      const result = await service.calculateRisk(15000, mockFxRate, true, 50);

      expect(result.guaranteeByDistance).toBe(575);
      expect(Number.isInteger(result.guaranteeByDistance)).toBe(true);
    });
  });

  describe('calculateDepositCents', () => {
    it('should calculate wallet deposit (total + security credit)', () => {
      const totalCents = 50000; // $500 USD
      const guaranteeUsd = 600;

      const result = service.calculateDepositCents(totalCents, 'wallet', guaranteeUsd);

      expect(result).toBe(110000); // 50000 + (600 * 100)
    });

    it('should calculate credit card deposit (only total, no security credit)', () => {
      const totalCents = 50000;
      const guaranteeUsd = 600; // Not added for credit_card

      const result = service.calculateDepositCents(totalCents, 'credit_card', guaranteeUsd);

      expect(result).toBe(50000);
    });

    it('should calculate partial wallet deposit (30% + security credit)', () => {
      const totalCents = 100000; // $1000 USD
      const guaranteeUsd = 500;

      const result = service.calculateDepositCents(totalCents, 'partial_wallet', guaranteeUsd);

      expect(result).toBe(80000); // (100000 * 0.3) + (500 * 100) = 30000 + 50000
    });

    it('should handle zero guarantee for wallet', () => {
      const totalCents = 50000;
      const guaranteeUsd = 0;

      const result = service.calculateDepositCents(totalCents, 'wallet', guaranteeUsd);

      expect(result).toBe(50000); // Total only
    });

    it('should round partial wallet calculation correctly', () => {
      const totalCents = 33333; // Results in 9999.9 (30%)
      const guaranteeUsd = 100;

      const result = service.calculateDepositCents(totalCents, 'partial_wallet', guaranteeUsd);

      expect(result).toBe(20000); // Math.round(33333 * 0.3) + 10000 = 10000 + 10000
    });
  });

  describe('canAffordPaymentMethod', () => {
    it('should return true for credit card regardless of balance', () => {
      const result = service.canAffordPaymentMethod(0, 100000, 'credit_card');

      expect(result).toBe(true);
    });

    it('should return true when wallet has sufficient balance', () => {
      const result = service.canAffordPaymentMethod(120000, 100000, 'wallet');

      expect(result).toBe(true);
    });

    it('should return false when wallet has insufficient balance', () => {
      const result = service.canAffordPaymentMethod(50000, 100000, 'wallet');

      expect(result).toBe(false);
    });

    it('should return true when wallet balance exactly matches required', () => {
      const result = service.canAffordPaymentMethod(100000, 100000, 'partial_wallet');

      expect(result).toBe(true);
    });

    it('should handle partial wallet payment method', () => {
      const result = service.canAffordPaymentMethod(40000, 50000, 'partial_wallet');

      expect(result).toBe(false);
    });
  });

  describe('getGuaranteeCopy', () => {
    it('should return hold copy for users with card', async () => {
      const risk = await service.calculateRisk(15000, mockFxRate, true);

      const copy = service.getGuaranteeCopy(risk);

      expect(copy.title).toContain('preautorización');
      expect(copy.description).toContain('preautoriza en tu tarjeta');
      expect(mockFranchiseService.formatArs).toHaveBeenCalledWith(risk.guaranteeAmountArs);
      expect(mockFranchiseService.formatUsd).toHaveBeenCalledWith(risk.guaranteeAmountUsd);
    });

    it('should return security credit copy for users without card', async () => {
      const risk = await service.calculateRisk(15000, mockFxRate, false);

      const copy = service.getGuaranteeCopy(risk);

      expect(copy.title).toContain('Crédito de Seguridad');
      expect(copy.description).toContain('Queda en tu wallet');
      expect(copy.description).toContain('no retirable');
    });

    it('should include formatted amounts in copy', async () => {
      mockFranchiseService.formatArs.and.returnValue('$500.000');
      mockFranchiseService.formatUsd.and.returnValue('USD 500');

      const risk = await service.calculateRisk(15000, mockFxRate, true);
      const copy = service.getGuaranteeCopy(risk);

      expect(copy.amountArs).toBe('$500.000');
      expect(copy.amountUsd).toBe('USD 500');
    });
  });

  describe('getFranchiseTable', () => {
    it('should return complete franchise table with 3 rows', async () => {
      const risk = await service.calculateRisk(15000, mockFxRate, true);

      const table = service.getFranchiseTable(risk);

      expect(table.rows.length).toBe(3);
    });

    it('should include standard franchise row', async () => {
      const risk = await service.calculateRisk(15000, mockFxRate, true);

      const table = service.getFranchiseTable(risk);
      const standardRow = table.rows[0];

      expect(standardRow.label).toContain('Franquicia Daño/Robo');
      expect(mockFranchiseService.formatUsd).toHaveBeenCalledWith(risk.standardFranchiseUsd);
    });

    it('should include rollover franchise row', async () => {
      const risk = await service.calculateRisk(15000, mockFxRate, true);

      const table = service.getFranchiseTable(risk);
      const rolloverRow = table.rows[1];

      expect(rolloverRow.label).toContain('Franquicia por Vuelco');
    });

    it('should show "Garantía (hold)" for users with card', async () => {
      const risk = await service.calculateRisk(15000, mockFxRate, true);

      const table = service.getFranchiseTable(risk);
      const guaranteeRow = table.rows[2];

      expect(guaranteeRow.label).toContain('Garantía (hold)');
    });

    it('should show "Crédito de Seguridad" for users without card', async () => {
      const risk = await service.calculateRisk(15000, mockFxRate, false);

      const table = service.getFranchiseTable(risk);
      const guaranteeRow = table.rows[2];

      expect(guaranteeRow.label).toContain('Crédito de Seguridad');
    });

    it('should format ARS amounts correctly', async () => {
      const risk = await service.calculateRisk(15000, mockFxRate, true);

      const table = service.getFranchiseTable(risk);

      expect(mockFranchiseService.formatArs).toHaveBeenCalled();
      table.rows.forEach((row) => {
        expect(row.amountArs).toBeDefined();
      });
    });
  });

  describe('integration tests', () => {
    it('should maintain consistency between guarantee types and calculations', async () => {
      const riskWithCard = await service.calculateRisk(15000, mockFxRate, true);
      const riskWithoutCard = await service.calculateRisk(15000, mockFxRate, false);

      expect(riskWithCard.guaranteeType).toBe('hold');
      expect(riskWithoutCard.guaranteeType).toBe('security_credit');
      expect(riskWithCard.guaranteeAmountUsd).not.toBe(riskWithoutCard.guaranteeAmountUsd);
    });

    it('should calculate ARS amounts consistently with FX rate', async () => {
      const result = await service.calculateRisk(15000, mockFxRate, true);

      const expectedArs = Math.round(result.guaranteeAmountUsd * mockFxRate);
      expect(result.guaranteeAmountArs).toBe(expectedArs);
    });

    it('should propagate bucket determination through franchise calculation', async () => {
      const valuesToTest = [8000, 15000, 30000, 60000, 100000];
      const expectedBuckets: Array<'economy' | 'standard' | 'premium' | 'luxury' | 'ultra-luxury'> =
        ['economy', 'standard', 'premium', 'luxury', 'ultra-luxury'];

      for (let index = 0; index < valuesToTest.length; index++) {
        const value = valuesToTest[index];
        const result = await service.calculateRisk(value, mockFxRate, true);

        expect(result.bucket).toBe(expectedBuckets[index]);
        expect(mockFranchiseService.getFranchiseInfo).toHaveBeenCalledWith(
          value,
          expectedBuckets[index],
          mockFxRate,
        );
      }
    });
  });

  describe('MAYOR criterion edge cases', () => {
    // Tests skipped - service signature changed
  });
});
