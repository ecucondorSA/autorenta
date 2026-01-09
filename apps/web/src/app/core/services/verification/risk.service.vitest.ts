import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RiskService } from './risk.service';
import { RiskCalculatorService } from './risk-calculator.service';
import { firstValueFrom } from 'rxjs';
import type { CountryCode } from '@core/models/booking-detail-payment.model';

// Mock supabase
const mockSupabaseClient = {
  from: vi.fn(),
};

vi.mock('@core/services/infrastructure/supabase-client.service', () => ({
  injectSupabase: () => mockSupabaseClient,
}));

describe('RiskService', () => {
  let service: RiskService;
  let mockRiskCalculator: {
    calculateRisk: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockRiskCalculator = {
      calculateRisk: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        RiskService,
        { provide: RiskCalculatorService, useValue: mockRiskCalculator },
      ],
    });

    service = TestBed.inject(RiskService);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  describe('calculateRiskSnapshot', () => {
    it('should calculate risk snapshot with all parameters', async () => {
      mockRiskCalculator.calculateRisk
        .mockResolvedValueOnce({
          guaranteeAmountArs: 300000,
          guaranteeAmountUsd: 300,
        })
        .mockResolvedValueOnce({
          guaranteeAmountArs: 600000,
          guaranteeAmountUsd: 600,
        });

      const result = await service.calculateRiskSnapshot({
        vehicleValueUsd: 15000,
        bucket: 'standard',
        country: 'AR' as CountryCode,
        fxRate: 1000,
        coverageUpgrade: 'standard',
        distanceKm: 50,
      });

      expect(result.deductibleUsd).toBeGreaterThan(0);
      expect(result.rolloverDeductibleUsd).toBe(result.deductibleUsd * 1.5);
      expect(result.holdEstimatedArs).toBe(300000);
      expect(result.creditSecurityUsd).toBe(600);
      expect(result.bucket).toBe('standard');
      expect(result.country).toBe('AR');
      expect(result.fxRate).toBe(1000);
      expect(result.calculatedAt).toBeInstanceOf(Date);
    });

    it('should use zero deductible for zero coverage upgrade', async () => {
      mockRiskCalculator.calculateRisk.mockResolvedValue({
        guaranteeAmountArs: 0,
        guaranteeAmountUsd: 0,
      });

      const result = await service.calculateRiskSnapshot({
        vehicleValueUsd: 20000,
        bucket: 'premium',
        country: 'AR' as CountryCode,
        fxRate: 1000,
        coverageUpgrade: 'zero',
      });

      expect(result.deductibleUsd).toBe(0);
      expect(result.rolloverDeductibleUsd).toBe(0);
      expect(result.coverageUpgrade).toBe('zero');
    });

    it('should apply reduced coverage upgrade', async () => {
      mockRiskCalculator.calculateRisk.mockResolvedValue({
        guaranteeAmountArs: 150000,
        guaranteeAmountUsd: 150,
      });

      const result = await service.calculateRiskSnapshot({
        vehicleValueUsd: 10000,
        bucket: 'economy',
        country: 'AR' as CountryCode,
        fxRate: 1000,
        coverageUpgrade: 'premium50',
      });

      expect(result.coverageUpgrade).toBe('premium50');
      expect(result.deductibleUsd).toBeGreaterThan(0);
    });

    it('should call risk calculator with correct parameters', async () => {
      mockRiskCalculator.calculateRisk.mockResolvedValue({
        guaranteeAmountArs: 200000,
        guaranteeAmountUsd: 200,
      });

      await service.calculateRiskSnapshot({
        vehicleValueUsd: 12000,
        bucket: 'standard',
        country: 'AR' as CountryCode,
        fxRate: 1000,
        distanceKm: 100,
      });

      expect(mockRiskCalculator.calculateRisk).toHaveBeenCalledTimes(2);
      expect(mockRiskCalculator.calculateRisk).toHaveBeenCalledWith(
        12000,
        1000,
        true,
        '100',
      );
      expect(mockRiskCalculator.calculateRisk).toHaveBeenCalledWith(
        12000,
        1000,
        false,
        '100',
      );
    });
  });

  describe('persistRiskSnapshot', () => {
    it('should persist risk snapshot successfully', async () => {
      mockSupabaseClient.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { booking_id: 'booking-123' },
              error: null,
            }),
          }),
        }),
      });

      const snapshot = {
        deductibleUsd: 500,
        rolloverDeductibleUsd: 750,
        holdEstimatedArs: 300000,
        holdEstimatedUsd: 300,
        creditSecurityUsd: 600,
        bucket: 'standard' as const,
        vehicleValueUsd: 15000,
        country: 'AR' as CountryCode,
        fxRate: 1000,
        calculatedAt: new Date(),
        coverageUpgrade: 'standard' as const,
      };

      const result = await firstValueFrom(
        service.persistRiskSnapshot('booking-123', snapshot, 'card'),
      );

      expect(result.ok).toBe(true);
      expect(result.snapshotId).toBe('booking-123');
    });

    it('should handle persist error', async () => {
      mockSupabaseClient.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Insert failed' },
            }),
          }),
        }),
      });

      const snapshot = {
        deductibleUsd: 500,
        rolloverDeductibleUsd: 750,
        holdEstimatedArs: 300000,
        holdEstimatedUsd: 300,
        creditSecurityUsd: 600,
        bucket: 'standard' as const,
        vehicleValueUsd: 15000,
        country: 'AR' as CountryCode,
        fxRate: 1000,
        calculatedAt: new Date(),
        coverageUpgrade: 'standard' as const,
      };

      const result = await firstValueFrom(
        service.persistRiskSnapshot('booking-456', snapshot, 'wallet'),
      );

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Insert failed');
    });
  });

  describe('getRiskSnapshotByBookingId', () => {
    it('should retrieve risk snapshot by booking ID', async () => {
      const mockData = {
        booking_id: 'booking-789',
        franchise_usd: 500,
        rollover_franchise_usd: 750,
        estimated_hold_amount: 300000,
        estimated_deposit: 600,
        bucket: 'standard',
        country_code: 'AR',
        fx_snapshot: 1000,
        created_at: new Date().toISOString(),
        meta: {
          vehicle_value_usd: 15000,
          coverage_upgrade: 'standard',
          rollover_deductible_usd: 750,
        },
      };

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
          }),
        }),
      });

      const result = await firstValueFrom(
        service.getRiskSnapshotByBookingId('booking-789'),
      );

      expect(result.snapshot).not.toBeNull();
      expect(result.snapshot?.deductibleUsd).toBe(500);
      expect(result.snapshot?.country).toBe('AR');
    });

    it('should return null when snapshot not found', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            }),
          }),
        }),
      });

      const result = await firstValueFrom(
        service.getRiskSnapshotByBookingId('non-existent'),
      );

      expect(result.snapshot).toBeNull();
    });
  });

  describe('recalculateWithUpgrade', () => {
    it('should recalculate with new coverage upgrade', async () => {
      mockRiskCalculator.calculateRisk.mockResolvedValue({
        guaranteeAmountArs: 150000,
        guaranteeAmountUsd: 150,
      });

      const currentSnapshot = {
        deductibleUsd: 500,
        rolloverDeductibleUsd: 750,
        holdEstimatedArs: 300000,
        holdEstimatedUsd: 300,
        creditSecurityUsd: 600,
        bucket: 'standard' as const,
        vehicleValueUsd: 15000,
        country: 'AR' as CountryCode,
        fxRate: 1000,
        calculatedAt: new Date(),
        coverageUpgrade: 'standard' as const,
      };

      const result = await service.recalculateWithUpgrade(currentSnapshot, 'premium50');

      expect(result.coverageUpgrade).toBe('premium50');
      expect(result.vehicleValueUsd).toBe(15000);
    });
  });

  describe('recalculateWithNewFxRate', () => {
    it('should recalculate with new FX rate', async () => {
      mockRiskCalculator.calculateRisk.mockResolvedValue({
        guaranteeAmountArs: 350000,
        guaranteeAmountUsd: 280,
      });

      const currentSnapshot = {
        deductibleUsd: 500,
        rolloverDeductibleUsd: 750,
        holdEstimatedArs: 300000,
        holdEstimatedUsd: 300,
        creditSecurityUsd: 600,
        bucket: 'standard' as const,
        vehicleValueUsd: 15000,
        country: 'AR' as CountryCode,
        fxRate: 1000,
        calculatedAt: new Date(),
        coverageUpgrade: 'standard' as const,
      };

      const result = await service.recalculateWithNewFxRate(currentSnapshot, 1250);

      expect(result.fxRate).toBe(1250);
    });
  });

  describe('validateRiskSnapshot', () => {
    it('should validate correct risk snapshot', () => {
      const validSnapshot = {
        deductibleUsd: 500,
        rolloverDeductibleUsd: 750,
        holdEstimatedArs: 300000,
        holdEstimatedUsd: 300,
        creditSecurityUsd: 600,
        bucket: 'standard' as const,
        vehicleValueUsd: 15000,
        country: 'AR' as CountryCode,
        fxRate: 1000,
        calculatedAt: new Date(),
        coverageUpgrade: 'standard' as const,
      };

      const result = service.validateRiskSnapshot(validSnapshot);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid deductible', () => {
      const invalidSnapshot = {
        deductibleUsd: 0,
        rolloverDeductibleUsd: 0,
        holdEstimatedArs: 300000,
        holdEstimatedUsd: 300,
        creditSecurityUsd: 600,
        bucket: 'standard' as const,
        vehicleValueUsd: 15000,
        country: 'AR' as CountryCode,
        fxRate: 1000,
        calculatedAt: new Date(),
        coverageUpgrade: 'standard' as const,
      };

      const result = service.validateRiskSnapshot(invalidSnapshot);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('La franquicia debe ser mayor a 0');
    });

    it('should accept zero deductible for zero coverage', () => {
      const zeroSnapshot = {
        deductibleUsd: 0,
        rolloverDeductibleUsd: 0,
        holdEstimatedArs: 300000,
        holdEstimatedUsd: 300,
        creditSecurityUsd: 600,
        bucket: 'premium' as const,
        vehicleValueUsd: 20000,
        country: 'AR' as CountryCode,
        fxRate: 1000,
        calculatedAt: new Date(),
        coverageUpgrade: 'zero' as const,
      };

      const result = service.validateRiskSnapshot(zeroSnapshot);

      expect(result.errors).not.toContain('La franquicia debe ser mayor a 0');
    });

    it('should detect invalid credit security', () => {
      const invalidSnapshot = {
        deductibleUsd: 500,
        rolloverDeductibleUsd: 750,
        holdEstimatedArs: 300000,
        holdEstimatedUsd: 300,
        creditSecurityUsd: 500,
        bucket: 'standard' as const,
        vehicleValueUsd: 15000,
        country: 'AR' as CountryCode,
        fxRate: 1000,
        calculatedAt: new Date(),
        coverageUpgrade: 'standard' as const,
      };

      const result = service.validateRiskSnapshot(invalidSnapshot);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Crédito de seguridad debe ser 600 USD');
    });

    it('should detect hold out of range', () => {
      const invalidSnapshot = {
        deductibleUsd: 500,
        rolloverDeductibleUsd: 750,
        holdEstimatedArs: 50000,
        holdEstimatedUsd: 50,
        creditSecurityUsd: 600,
        bucket: 'standard' as const,
        vehicleValueUsd: 15000,
        country: 'AR' as CountryCode,
        fxRate: 1000,
        calculatedAt: new Date(),
        coverageUpgrade: 'standard' as const,
      };

      const result = service.validateRiskSnapshot(invalidSnapshot);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Hold fuera de rango'))).toBe(true);
    });

    it('should detect invalid FX rate for AR', () => {
      const invalidSnapshot = {
        deductibleUsd: 500,
        rolloverDeductibleUsd: 750,
        holdEstimatedArs: 300000,
        holdEstimatedUsd: 300,
        creditSecurityUsd: 600,
        bucket: 'standard' as const,
        vehicleValueUsd: 15000,
        country: 'AR' as CountryCode,
        fxRate: 50,
        calculatedAt: new Date(),
        coverageUpgrade: 'standard' as const,
      };

      const result = service.validateRiskSnapshot(invalidSnapshot);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Tasa FX fuera de rango'))).toBe(true);
    });
  });
});
