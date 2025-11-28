import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import {
  SplitPaymentService,
  SplitPaymentRequest,
  PaymentSplit,
} from './split-payment.service';
import { SupabaseClientService } from './supabase-client.service';

// Helper to create chainable Supabase mock queries
function createMockQuery(finalResponse: { data: unknown; error: unknown }): Record<string, any> {
  const query: Record<string, any> = {};
  query['select'] = jasmine.createSpy('select').and.callFake(() => query);
  query['eq'] = jasmine.createSpy('eq').and.callFake(() => query);
  query['order'] = jasmine.createSpy('order').and.callFake(() => query);
  query['insert'] = jasmine.createSpy('insert').and.callFake(() => query);
  query['update'] = jasmine.createSpy('update').and.callFake(() => query);
  query['single'] = jasmine.createSpy('single').and.returnValue(Promise.resolve(finalResponse));
  // When called without single(), return the response directly
  query['then'] = (resolve: (value: unknown) => void) => resolve(finalResponse);
  return query;
}

// Helper to create a mock query that rejects (for error handling tests)
function createRejectingQuery(errorMessage: string): Record<string, any> {
  const query: Record<string, any> = {};
  const rejection = Promise.reject(new Error(errorMessage));
  query['select'] = jasmine.createSpy('select').and.callFake(() => query);
  query['eq'] = jasmine.createSpy('eq').and.callFake(() => query);
  query['order'] = jasmine.createSpy('order').and.callFake(() => query);
  query['insert'] = jasmine.createSpy('insert').and.callFake(() => query);
  query['update'] = jasmine.createSpy('update').and.callFake(() => query);
  query['single'] = jasmine.createSpy('single').and.returnValue(rejection);
  query['then'] = (_resolve: unknown, reject: (err: Error) => void) => reject(new Error(errorMessage));
  query['catch'] = (fn: (err: Error) => void) => fn(new Error(errorMessage));
  return query;
}

describe('SplitPaymentService', () => {
  let service: SplitPaymentService;
  let mockSupabaseClient: any;

  const mockPaymentSplit: PaymentSplit = {
    id: 'split_123',
    paymentId: 'payment_456',
    bookingId: 'booking_789',
    collectorId: 'user_001',
    amount: 10000,
    platformFee: 500,
    netAmount: 9500,
    status: 'pending',
    createdAt: '2025-11-28T10:00:00Z',
  };

  const mockSplitRequest: SplitPaymentRequest = {
    paymentIntentId: 'payment_456',
    bookingId: 'booking_789',
    totalAmount: 10000,
    currency: 'ARS',
    collectors: [
      { userId: 'user_001', percentage: 85, description: 'Owner' },
      { userId: 'user_002', percentage: 15, description: 'Platform' },
    ],
  };

  beforeEach(() => {
    mockSupabaseClient = {
      from: jasmine.createSpy('from'),
    };

    TestBed.configureTestingModule({
      providers: [
        SplitPaymentService,
        {
          provide: SupabaseClientService,
          useValue: { getClient: () => mockSupabaseClient },
        },
      ],
    });

    service = TestBed.inject(SplitPaymentService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ========================================
  // processSplitPayment
  // ========================================
  describe('processSplitPayment', () => {
    it('should validate that percentages sum to 100%', async () => {
      const invalidRequest = {
        ...mockSplitRequest,
        collectors: [
          { userId: 'user_001', percentage: 50 },
          { userId: 'user_002', percentage: 30 }, // Sum = 80, not 100
        ],
      };

      const result = await firstValueFrom(service.processSplitPayment(invalidRequest));

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Collector percentages must sum to 100%');
    });

    it('should validate that total amount is positive', async () => {
      const invalidRequest = {
        ...mockSplitRequest,
        totalAmount: 0,
      };

      const result = await firstValueFrom(service.processSplitPayment(invalidRequest));

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Total amount must be greater than 0');
    });

    it('should reject duplicate collectors', async () => {
      const invalidRequest = {
        ...mockSplitRequest,
        collectors: [
          { userId: 'user_001', percentage: 50 },
          { userId: 'user_001', percentage: 50 }, // Duplicate
        ],
      };

      const result = await firstValueFrom(service.processSplitPayment(invalidRequest));

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Duplicate collectors found');
    });

    it('should warn when split amount is below minimum', async () => {
      // With totalAmount = 10000 and 1% = 100 (which equals MIN_SPLIT_AMOUNT)
      // But 0.5% = 50 which is below minimum
      const smallSplitRequest = {
        ...mockSplitRequest,
        totalAmount: 1000, // Small amount
        collectors: [
          { userId: 'user_001', percentage: 5 }, // 50 ARS - below minimum
          { userId: 'user_002', percentage: 95 }, // 950 ARS - above minimum
        ],
      };

      // Mock successful insert
      mockSupabaseClient.from.and.callFake((table: string) => {
        if (table === 'payment_splits') {
          return createMockQuery({ data: null, error: null });
        }
        if (table === 'wallet_transactions') {
          return createMockQuery({ data: null, error: null });
        }
        if (table === 'wallet_ledger') {
          return createMockQuery({ data: null, error: null });
        }
        return createMockQuery({ data: null, error: null });
      });

      const result = await firstValueFrom(service.processSplitPayment(smallSplitRequest));

      expect(result.errors?.some((e) => e.includes('below minimum'))).toBe(true);
    });

    it('should calculate platform fee correctly', async () => {
      // Mock successful insert
      mockSupabaseClient.from.and.callFake((table: string) => {
        if (table === 'payment_splits') {
          return createMockQuery({ data: null, error: null });
        }
        if (table === 'wallet_transactions') {
          return createMockQuery({ data: null, error: null });
        }
        if (table === 'wallet_ledger') {
          return createMockQuery({ data: null, error: null });
        }
        return createMockQuery({ data: null, error: null });
      });

      const result = await firstValueFrom(service.processSplitPayment(mockSplitRequest));

      expect(result.success).toBe(true);
      expect(result.totalFee).toBeGreaterThan(0);
      // With 5% default fee on 10000 total:
      // user_001 gets 8500, fee = 425, net = 8075
      // user_002 gets 1500, fee = 75, net = 1425
      // total fee = 500
      expect(result.totalFee).toBe(500);
    });

    it('should process valid split payment successfully', async () => {
      // Mock successful inserts
      mockSupabaseClient.from.and.callFake((table: string) => {
        if (table === 'payment_splits') {
          return createMockQuery({ data: null, error: null });
        }
        if (table === 'wallet_transactions') {
          return createMockQuery({ data: null, error: null });
        }
        if (table === 'wallet_ledger') {
          return createMockQuery({ data: null, error: null });
        }
        return createMockQuery({ data: null, error: null });
      });

      const result = await firstValueFrom(service.processSplitPayment(mockSplitRequest));

      expect(result.success).toBe(true);
      expect(result.splits.length).toBe(2);
      expect(result.totalProcessed).toBe(2);
    });

    it('should use custom platform fee when provided', async () => {
      const customFeeRequest = {
        ...mockSplitRequest,
        platformFeePercentage: 10, // 10% instead of default 5%
      };

      mockSupabaseClient.from.and.callFake(() =>
        createMockQuery({ data: null, error: null }),
      );

      const result = await firstValueFrom(service.processSplitPayment(customFeeRequest));

      expect(result.success).toBe(true);
      // With 10% fee on 10000 total: total fee = 1000
      expect(result.totalFee).toBe(1000);
    });

    it('should handle database insert error', async () => {
      mockSupabaseClient.from.and.callFake((table: string) => {
        if (table === 'payment_splits') {
          return createMockQuery({ data: null, error: { message: 'Insert failed' } });
        }
        return createMockQuery({ data: null, error: null });
      });

      const result = await firstValueFrom(service.processSplitPayment(mockSplitRequest));

      expect(result.success).toBe(false);
      expect(result.errors?.some((e) => e.includes('Database error'))).toBe(true);
    });
  });

  // ========================================
  // getBookingSplits
  // ========================================
  describe('getBookingSplits', () => {
    it('should return splits for a booking', async () => {
      const mockSplits = [mockPaymentSplit, { ...mockPaymentSplit, id: 'split_456' }];

      mockSupabaseClient.from.and.returnValue(
        createMockQuery({ data: mockSplits, error: null }),
      );

      const result = await firstValueFrom(service.getBookingSplits('booking_789'));

      expect(result.length).toBe(2);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('payment_splits');
    });

    it('should throw error when fetch fails', async () => {
      mockSupabaseClient.from.and.returnValue(createRejectingQuery('Fetch failed'));

      await expectAsync(
        firstValueFrom(service.getBookingSplits('booking_789')),
      ).toBeRejectedWithError('Failed to fetch payment splits');
    });
  });

  // ========================================
  // getUserSplits
  // ========================================
  describe('getUserSplits', () => {
    it('should return splits for a user', async () => {
      const mockSplits = [mockPaymentSplit];

      const query = createMockQuery({ data: mockSplits, error: null });
      mockSupabaseClient.from.and.returnValue(query);

      const result = await firstValueFrom(service.getUserSplits('user_001'));

      expect(result.length).toBe(1);
      expect(query['order']).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should throw error when fetch fails', async () => {
      mockSupabaseClient.from.and.returnValue(createRejectingQuery('Fetch failed'));

      await expectAsync(
        firstValueFrom(service.getUserSplits('user_001')),
      ).toBeRejectedWithError('Failed to fetch user payment splits');
    });
  });

  // ========================================
  // getUserSplitStats
  // ========================================
  describe('getUserSplitStats', () => {
    it('should calculate statistics correctly', async () => {
      const mockSplits: PaymentSplit[] = [
        { ...mockPaymentSplit, status: 'completed', netAmount: 1000 },
        { ...mockPaymentSplit, id: 'split_2', status: 'completed', netAmount: 2000 },
        { ...mockPaymentSplit, id: 'split_3', status: 'pending', netAmount: 500 },
      ];

      mockSupabaseClient.from.and.returnValue(
        createMockQuery({ data: mockSplits, error: null }),
      );

      const result = await firstValueFrom(service.getUserSplitStats('user_001'));

      expect(result.totalEarnings).toBe(3500);
      expect(result.totalCompleted).toBe(3000);
      expect(result.totalPending).toBe(500);
      expect(result.completedPayouts).toBe(2);
      expect(result.averagePayoutAmount).toBe(1500);
    });

    it('should handle zero completed payouts', async () => {
      const mockSplits: PaymentSplit[] = [
        { ...mockPaymentSplit, status: 'pending', netAmount: 500 },
      ];

      mockSupabaseClient.from.and.returnValue(
        createMockQuery({ data: mockSplits, error: null }),
      );

      const result = await firstValueFrom(service.getUserSplitStats('user_001'));

      expect(result.completedPayouts).toBe(0);
      expect(result.averagePayoutAmount).toBe(0);
    });

    it('should throw error when calculation fails', async () => {
      mockSupabaseClient.from.and.returnValue(createRejectingQuery('Error'));

      await expectAsync(
        firstValueFrom(service.getUserSplitStats('user_001')),
      ).toBeRejectedWithError('Failed to calculate payment statistics');
    });
  });

  // ========================================
  // completeSplit
  // ========================================
  describe('completeSplit', () => {
    it('should mark split as completed and create wallet transaction', async () => {
      const completedSplit = { ...mockPaymentSplit, status: 'completed' as const };

      mockSupabaseClient.from.and.callFake((table: string) => {
        if (table === 'payment_splits') {
          return createMockQuery({ data: completedSplit, error: null });
        }
        if (table === 'wallet_transactions') {
          return createMockQuery({ data: null, error: null });
        }
        if (table === 'wallet_ledger') {
          return createMockQuery({ data: null, error: null });
        }
        return createMockQuery({ data: null, error: null });
      });

      const result = await firstValueFrom(service.completeSplit('split_123', 'payout_001'));

      expect(result.status).toBe('completed');
    });

    it('should throw error when update fails', async () => {
      mockSupabaseClient.from.and.returnValue(createRejectingQuery('Update failed'));

      await expectAsync(
        firstValueFrom(service.completeSplit('split_123', 'payout_001')),
      ).toBeRejectedWithError('Failed to complete payment split');
    });
  });

  // ========================================
  // failSplit
  // ========================================
  describe('failSplit', () => {
    it('should mark split as failed', async () => {
      const failedSplit = {
        ...mockPaymentSplit,
        status: 'failed' as const,
        failureReason: 'Payment declined',
      };

      mockSupabaseClient.from.and.returnValue(
        createMockQuery({ data: failedSplit, error: null }),
      );

      const result = await firstValueFrom(service.failSplit('split_123', 'Payment declined'));

      expect(result.status).toBe('failed');
      expect(result.failureReason).toBe('Payment declined');
    });

    it('should throw error when update fails', async () => {
      mockSupabaseClient.from.and.returnValue(createRejectingQuery('Update failed'));

      await expectAsync(
        firstValueFrom(service.failSplit('split_123', 'reason')),
      ).toBeRejectedWithError('Failed to mark payment split as failed');
    });
  });

  // ========================================
  // getPaymentBreakdown
  // ========================================
  describe('getPaymentBreakdown', () => {
    it('should return payment breakdown with summary', async () => {
      const mockPayment = { id: 'payment_456', amount: 10000, currency: 'ARS' };
      const mockSplits = [
        { ...mockPaymentSplit, platformFee: 250, netAmount: 4750 },
        { ...mockPaymentSplit, id: 'split_2', platformFee: 250, netAmount: 4750 },
      ];

      // Mock Promise.all by returning resolved data when from() is called
      let callCount = 0;
      mockSupabaseClient.from.and.callFake((table: string) => {
        callCount++;
        if (table === 'payments' || callCount === 1) {
          return createMockQuery({ data: mockPayment, error: null });
        }
        if (table === 'payment_splits' || callCount === 2) {
          return createMockQuery({ data: mockSplits, error: null });
        }
        return createMockQuery({ data: null, error: null });
      });

      const result = await firstValueFrom(service.getPaymentBreakdown('payment_456'));

      expect(result.payment).toBeTruthy();
      expect(result.summary.totalAmount).toBe(10000);
      expect(result.summary.totalFees).toBe(500);
      expect(result.summary.netDistributed).toBe(9500);
    });

    it('should throw error when fetch fails', async () => {
      mockSupabaseClient.from.and.returnValue(createRejectingQuery('Error'));

      await expectAsync(
        firstValueFrom(service.getPaymentBreakdown('payment_456')),
      ).toBeRejectedWithError('Failed to fetch payment breakdown');
    });
  });
});
