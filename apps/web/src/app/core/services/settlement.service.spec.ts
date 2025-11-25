import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { SettlementService } from './settlement.service';
import { SupabaseClientService } from './supabase-client.service';
import { FgoV1_1Service } from './fgo-v1-1.service';
import { RiskMatrixService } from './risk-matrix.service';
import { FgoService } from './fgo.service';
import { DamageDetectionService } from './damage-detection.service';
import type { Claim, ClaimProcessResult } from './settlement.service';
import type { BookingRiskSnapshot, EligibilityResult } from '../models/fgo-v1-1.model';

describe('SettlementService', () => {
  let service: SettlementService;
  let mockSupabase: any;
  let mockSupabaseService: any;
  let mockFgoV1_1Service: any;
  let mockRiskMatrixService: any;
  let mockFgoService: any;
  let mockDamageDetectionService: any;

  const mockBookingId = 'booking-001';
  const mockClaimId = 'claim-001';

  const mockClaim: Claim = {
    id: mockClaimId,
    bookingId: mockBookingId,
    renterId: 'renter-001',
    status: 'pending',
    totalEstimatedCostUsd: 500,
    damages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSnapshot: BookingRiskSnapshot = {
    id: 'snapshot-001',
    bookingId: mockBookingId,
    createdAt: new Date(),
    hasCard: true,
    hasWalletSecurity: false,
    estimatedHoldAmount: 20000, // $200 in cents
    estimatedDeposit: 0,
    franchiseUsd: 300,
    fxSnapshot: 1.0, // 1:1 exchange rate for simplicity
    pem: 1.5,
    rc: 1.2,
    alphaReduction: 0.85,
    eligibleMaxCover: 100000, // $1000 max FGO coverage
    depositStatus: 'verified',
    currency: 'USD',
    countryCode: 'US',
    bucket: 'silver',
  };

  beforeEach(() => {
    // Create mock Supabase client
    mockSupabase = {
      from: jasmine.createSpy('from').and.returnValue({
        select: jasmine.createSpy('select').and.returnValue({
          eq: jasmine.createSpy('eq').and.returnValue({
            single: jasmine.createSpy('single').and.returnValue(
              Promise.resolve({ data: null, error: null }),
            ),
          }),
        }),
        update: jasmine.createSpy('update').and.returnValue({
          eq: jasmine.createSpy('eq').and.returnValue(
            Promise.resolve({ data: null, error: null }),
          ),
        }),
        insert: jasmine.createSpy('insert').and.returnValue(
          Promise.resolve({ data: null, error: null }),
        ),
      }),
      rpc: jasmine.createSpy('rpc').and.returnValue(
        Promise.resolve({ data: { acquired: true }, error: null }),
      ),
    };

    // Mock services
    mockSupabaseService = {
      getClient: jasmine.createSpy('getClient').and.returnValue(mockSupabase),
    };

    mockFgoV1_1Service = {
      getRiskSnapshot: jasmine.createSpy('getRiskSnapshot').and.returnValue(of(mockSnapshot)),
      assessEligibility: jasmine.createSpy('assessEligibility').and.returnValue(
        of({
          eligible: true,
          reasons: [],
          maxCoverCents: 50000, // $500 max coverage
        } as EligibilityResult),
      ),
      executeWaterfall: jasmine.createSpy('executeWaterfall').and.returnValue(of(null)),
    };

    mockRiskMatrixService = {
      getRiskPolicy: jasmine.createSpy('getRiskPolicy').and.returnValue(
        Promise.resolve({
          franchise: 300,
          dailyRate: 50,
        }),
      ),
    };

    mockFgoService = {
      addPayout: jasmine.createSpy('addPayout').and.returnValue(Promise.resolve()),
      addContribution: jasmine.createSpy('addContribution').and.returnValue(Promise.resolve()),
      getReserveCoefficient: jasmine.createSpy('getReserveCoefficient').and.returnValue(
        Promise.resolve(1.5),
      ),
    };

    mockDamageDetectionService = {
      analyzeImages: jasmine.createSpy('analyzeImages').and.returnValue(
        Promise.resolve({
          success: true,
          damages: [],
          totalEstimatedCostUsd: 0,
          analysisNotes: 'No damage detected',
        }),
      ),
      convertToDamageItems: jasmine.createSpy('convertToDamageItems').and.returnValue([]),
    };

    TestBed.configureTestingModule({
      providers: [
        SettlementService,
        { provide: SupabaseClientService, useValue: mockSupabaseService },
        { provide: FgoV1_1Service, useValue: mockFgoV1_1Service },
        { provide: RiskMatrixService, useValue: mockRiskMatrixService },
        { provide: FgoService, useValue: mockFgoService },
        { provide: DamageDetectionService, useValue: mockDamageDetectionService },
      ],
    });

    service = TestBed.inject(SettlementService);
  });

  describe('FGO Payout Logic', () => {
    it('should call FgoService.addPayout when FGO coverage is needed', async () => {
      // Setup: Mock booking and car data
      mockSupabase.from.and.callFake((table: string) => {
        if (table === 'bookings') {
          return {
            select: jasmine.createSpy('select').and.returnValue({
              eq: jasmine.createSpy('eq').and.returnValue({
                single: jasmine.createSpy('single').and.returnValue(
                  Promise.resolve({
                    data: { car_id: 'car-001' },
                    error: null,
                  }),
                ),
              }),
            }),
          };
        }
        if (table === 'cars') {
          return {
            select: jasmine.createSpy('select').and.returnValue({
              eq: jasmine.createSpy('eq').and.returnValue({
                single: jasmine.createSpy('single').and.returnValue(
                  Promise.resolve({
                    data: { price_per_day: 50 },
                    error: null,
                  }),
                ),
              }),
            }),
          };
        }
        if (table === 'claims') {
          return {
            update: jasmine.createSpy('update').and.returnValue({
              eq: jasmine.createSpy('eq').and.returnValue(
                Promise.resolve({ data: null, error: null }),
              ),
            }),
          };
        }
        return mockSupabase.from(table);
      });

      // Process claim with FGO coverage needed (costs exceed hold amount)
      const highCostClaim = {
        ...mockClaim,
        totalEstimatedCostUsd: 800, // $800 damage > $200 hold
      };

      const result = await service.processClaim(highCostClaim);

      expect(result.ok).toBeTrue();
      expect(mockFgoService.addPayout).toHaveBeenCalled();

      // Verify FGO payout parameters
      const payoutCall = mockFgoService.addPayout.calls.mostRecent();
      expect(payoutCall.args[0]).toBeGreaterThan(0); // Amount in USD
      expect(payoutCall.args[1]).toBe(mockBookingId); // Booking ID
      expect(payoutCall.args[2]).toBe(1.0); // FX rate
    });

    it('should not call FgoService.addPayout when costs are covered by hold', async () => {
      // Setup mocks
      mockSupabase.from.and.callFake((table: string) => {
        if (table === 'bookings') {
          return {
            select: jasmine.createSpy('select').and.returnValue({
              eq: jasmine.createSpy('eq').and.returnValue({
                single: jasmine.createSpy('single').and.returnValue(
                  Promise.resolve({
                    data: { car_id: 'car-001' },
                    error: null,
                  }),
                ),
              }),
            }),
          };
        }
        if (table === 'cars') {
          return {
            select: jasmine.createSpy('select').and.returnValue({
              eq: jasmine.createSpy('eq').and.returnValue({
                single: jasmine.createSpy('single').and.returnValue(
                  Promise.resolve({
                    data: { price_per_day: 50 },
                    error: null,
                  }),
                ),
              }),
            }),
          };
        }
        if (table === 'claims') {
          return {
            update: jasmine.createSpy('update').and.returnValue({
              eq: jasmine.createSpy('eq').and.returnValue(
                Promise.resolve({ data: null, error: null }),
              ),
            }),
          };
        }
        return mockSupabase.from(table);
      });

      // Process claim with low costs (covered by hold)
      const lowCostClaim = {
        ...mockClaim,
        totalEstimatedCostUsd: 150, // $150 damage < $200 hold
      };

      const result = await service.processClaim(lowCostClaim);

      expect(result.ok).toBeTrue();
      expect(mockFgoService.addPayout).not.toHaveBeenCalled();
    });

    it('should handle FgoService.addPayout failure gracefully', async () => {
      // Setup: Mock FGO service to throw error
      mockFgoService.addPayout.and.rejectWith(new Error('FGO service unavailable'));

      mockSupabase.from.and.callFake((table: string) => {
        if (table === 'bookings') {
          return {
            select: jasmine.createSpy('select').and.returnValue({
              eq: jasmine.createSpy('eq').and.returnValue({
                single: jasmine.createSpy('single').and.returnValue(
                  Promise.resolve({
                    data: { car_id: 'car-001' },
                    error: null,
                  }),
                ),
              }),
            }),
          };
        }
        if (table === 'cars') {
          return {
            select: jasmine.createSpy('select').and.returnValue({
              eq: jasmine.createSpy('eq').and.returnValue({
                single: jasmine.createSpy('single').and.returnValue(
                  Promise.resolve({
                    data: { price_per_day: 50 },
                    error: null,
                  }),
                ),
              }),
            }),
          };
        }
        if (table === 'claims') {
          return {
            update: jasmine.createSpy('update').and.returnValue({
              eq: jasmine.createSpy('eq').and.returnValue(
                Promise.resolve({ data: null, error: null }),
              ),
            }),
          };
        }
        return mockSupabase.from(table);
      });

      // Process claim that needs FGO coverage
      const highCostClaim = {
        ...mockClaim,
        totalEstimatedCostUsd: 800,
      };

      const result = await service.processClaim(highCostClaim);

      // Should still succeed even if FGO recording fails
      expect(result.ok).toBeTrue();
      expect(mockFgoService.addPayout).toHaveBeenCalled();

      // Verify breakdown still includes FGO payment
      if (result.waterfallResult) {
        expect(result.waterfallResult.breakdown.fgoPaid).toBeGreaterThan(0);
      }
    });

    it('should respect max FGO coverage limits', async () => {
      // Setup: Mock eligibility with specific max coverage
      mockFgoV1_1Service.assessEligibility.and.returnValue(
        of({
          eligible: true,
          reasons: [],
          maxCoverCents: 30000, // $300 max FGO coverage
        } as EligibilityResult),
      );

      mockSupabase.from.and.callFake((table: string) => {
        if (table === 'bookings') {
          return {
            select: jasmine.createSpy('select').and.returnValue({
              eq: jasmine.createSpy('eq').and.returnValue({
                single: jasmine.createSpy('single').and.returnValue(
                  Promise.resolve({
                    data: { car_id: 'car-001' },
                    error: null,
                  }),
                ),
              }),
            }),
          };
        }
        if (table === 'cars') {
          return {
            select: jasmine.createSpy('select').and.returnValue({
              eq: jasmine.createSpy('eq').and.returnValue({
                single: jasmine.createSpy('single').and.returnValue(
                  Promise.resolve({
                    data: { price_per_day: 50 },
                    error: null,
                  }),
                ),
              }),
            }),
          };
        }
        if (table === 'claims') {
          return {
            update: jasmine.createSpy('update').and.returnValue({
              eq: jasmine.createSpy('eq').and.returnValue(
                Promise.resolve({ data: null, error: null }),
              ),
            }),
          };
        }
        return mockSupabase.from(table);
      });

      // Process claim that exceeds max FGO coverage
      const veryCostlyClaim = {
        ...mockClaim,
        totalEstimatedCostUsd: 1000, // $1000 damage
      };

      const result = await service.processClaim(veryCostlyClaim);

      expect(result.ok).toBeTrue();
      expect(mockFgoService.addPayout).toHaveBeenCalled();

      // Verify FGO payout doesn't exceed max coverage
      const payoutCall = mockFgoService.addPayout.calls.mostRecent();
      expect(payoutCall.args[0]).toBeLessThanOrEqual(300); // Max $300 FGO coverage
    });

    it('should correctly calculate FGO amount when partial coverage is needed', async () => {
      // Setup with snapshot having both hold and wallet
      const mixedSnapshot: BookingRiskSnapshot = {
        ...mockSnapshot,
        hasCard: true,
        hasWalletSecurity: true,
        estimatedHoldAmount: 10000, // $100 hold
        estimatedDeposit: 5000, // $50 wallet
      };

      mockFgoV1_1Service.getRiskSnapshot.and.returnValue(of(mixedSnapshot));

      mockSupabase.from.and.callFake((table: string) => {
        if (table === 'bookings') {
          return {
            select: jasmine.createSpy('select').and.returnValue({
              eq: jasmine.createSpy('eq').and.returnValue({
                single: jasmine.createSpy('single').and.returnValue(
                  Promise.resolve({
                    data: { car_id: 'car-001' },
                    error: null,
                  }),
                ),
              }),
            }),
          };
        }
        if (table === 'cars') {
          return {
            select: jasmine.createSpy('select').and.returnValue({
              eq: jasmine.createSpy('eq').and.returnValue({
                single: jasmine.createSpy('single').and.returnValue(
                  Promise.resolve({
                    data: { price_per_day: 50 },
                    error: null,
                  }),
                ),
              }),
            }),
          };
        }
        if (table === 'claims') {
          return {
            update: jasmine.createSpy('update').and.returnValue({
              eq: jasmine.createSpy('eq').and.returnValue(
                Promise.resolve({ data: null, error: null }),
              ),
            }),
          };
        }
        return mockSupabase.from(table);
      });

      // Damage = $300, Hold = $100, Wallet = $50, FGO needed = $150
      const claim = {
        ...mockClaim,
        totalEstimatedCostUsd: 300,
      };

      const result = await service.processClaim(claim);

      expect(result.ok).toBeTrue();
      expect(mockFgoService.addPayout).toHaveBeenCalled();

      // Verify FGO amount is correct ($150)
      const payoutCall = mockFgoService.addPayout.calls.mostRecent();
      expect(payoutCall.args[0]).toBe(150);
    });

    it('should use correct exchange rate for FGO payout', async () => {
      // Setup snapshot with non-1.0 exchange rate
      const snapshotWithFx: BookingRiskSnapshot = {
        ...mockSnapshot,
        fxSnapshot: 4.5, // 1 USD = 4.5 ARS for example
      };

      mockFgoV1_1Service.getRiskSnapshot.and.returnValue(of(snapshotWithFx));

      mockSupabase.from.and.callFake((table: string) => {
        if (table === 'bookings') {
          return {
            select: jasmine.createSpy('select').and.returnValue({
              eq: jasmine.createSpy('eq').and.returnValue({
                single: jasmine.createSpy('single').and.returnValue(
                  Promise.resolve({
                    data: { car_id: 'car-001' },
                    error: null,
                  }),
                ),
              }),
            }),
          };
        }
        if (table === 'cars') {
          return {
            select: jasmine.createSpy('select').and.returnValue({
              eq: jasmine.createSpy('eq').and.returnValue({
                single: jasmine.createSpy('single').and.returnValue(
                  Promise.resolve({
                    data: { price_per_day: 50 },
                    error: null,
                  }),
                ),
              }),
            }),
          };
        }
        if (table === 'claims') {
          return {
            update: jasmine.createSpy('update').and.returnValue({
              eq: jasmine.createSpy('eq').and.returnValue(
                Promise.resolve({ data: null, error: null }),
              ),
            }),
          };
        }
        return mockSupabase.from(table);
      });

      const highCostClaim = {
        ...mockClaim,
        totalEstimatedCostUsd: 800,
      };

      const result = await service.processClaim(highCostClaim);

      expect(result.ok).toBeTrue();
      expect(mockFgoService.addPayout).toHaveBeenCalled();

      // Verify correct FX rate is passed
      const payoutCall = mockFgoService.addPayout.calls.mostRecent();
      expect(payoutCall.args[2]).toBe(4.5); // FX rate
    });

    it('should not attempt FGO payout when amount is zero', async () => {
      // Mock snapshot with high hold covering all damage
      const highHoldSnapshot: BookingRiskSnapshot = {
        ...mockSnapshot,
        estimatedHoldAmount: 100000, // $1000 hold
      };

      mockFgoV1_1Service.getRiskSnapshot.and.returnValue(of(highHoldSnapshot));

      mockSupabase.from.and.callFake((table: string) => {
        if (table === 'bookings') {
          return {
            select: jasmine.createSpy('select').and.returnValue({
              eq: jasmine.createSpy('eq').and.returnValue({
                single: jasmine.createSpy('single').and.returnValue(
                  Promise.resolve({
                    data: { car_id: 'car-001' },
                    error: null,
                  }),
                ),
              }),
            }),
          };
        }
        if (table === 'cars') {
          return {
            select: jasmine.createSpy('select').and.returnValue({
              eq: jasmine.createSpy('eq').and.returnValue({
                single: jasmine.createSpy('single').and.returnValue(
                  Promise.resolve({
                    data: { price_per_day: 50 },
                    error: null,
                  }),
                ),
              }),
            }),
          };
        }
        if (table === 'claims') {
          return {
            update: jasmine.createSpy('update').and.returnValue({
              eq: jasmine.createSpy('eq').and.returnValue(
                Promise.resolve({ data: null, error: null }),
              ),
            }),
          };
        }
        return mockSupabase.from(table);
      });

      const claim = {
        ...mockClaim,
        totalEstimatedCostUsd: 500, // Less than hold amount
      };

      const result = await service.processClaim(claim);

      expect(result.ok).toBeTrue();
      expect(mockFgoService.addPayout).not.toHaveBeenCalled();
    });
  });

  describe('Waterfall Breakdown', () => {
    it('should correctly populate waterfall breakdown with FGO payment', async () => {
      mockSupabase.from.and.callFake((table: string) => {
        if (table === 'bookings') {
          return {
            select: jasmine.createSpy('select').and.returnValue({
              eq: jasmine.createSpy('eq').and.returnValue({
                single: jasmine.createSpy('single').and.returnValue(
                  Promise.resolve({
                    data: { car_id: 'car-001' },
                    error: null,
                  }),
                ),
              }),
            }),
          };
        }
        if (table === 'cars') {
          return {
            select: jasmine.createSpy('select').and.returnValue({
              eq: jasmine.createSpy('eq').and.returnValue({
                single: jasmine.createSpy('single').and.returnValue(
                  Promise.resolve({
                    data: { price_per_day: 50 },
                    error: null,
                  }),
                ),
              }),
            }),
          };
        }
        if (table === 'claims') {
          return {
            update: jasmine.createSpy('update').and.returnValue({
              eq: jasmine.createSpy('eq').and.returnValue(
                Promise.resolve({ data: null, error: null }),
              ),
            }),
          };
        }
        return mockSupabase.from(table);
      });

      const claim = {
        ...mockClaim,
        totalEstimatedCostUsd: 800,
      };

      const result = await service.processClaim(claim);

      expect(result.ok).toBeTrue();
      expect(result.waterfallResult).toBeDefined();

      if (result.waterfallResult) {
        const breakdown = result.waterfallResult.breakdown;
        expect(breakdown.holdCaptured).toBeGreaterThan(0);
        expect(breakdown.fgoPaid).toBeGreaterThan(0);

        // Verify total coverage
        const totalCovered =
          breakdown.holdCaptured +
          breakdown.walletDebited +
          breakdown.extraCharged +
          breakdown.fgoPaid;
        expect(totalCovered).toBeGreaterThan(0);
      }
    });
  });
});