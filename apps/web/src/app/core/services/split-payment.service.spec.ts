import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import {
  SplitPaymentService,
  SplitPaymentRequest,
  SplitPaymentCollector,
  PaymentSplit,
  SplitPaymentResponse,
} from './split-payment.service';
import { SupabaseClientService } from './supabase-client.service';

describe('SplitPaymentService', () => {
  let service: SplitPaymentService;
  let supabaseClient: jasmine.SpyObj<any>;
  let supabaseService: jasmine.SpyObj<SupabaseClientService>;

  // Test Data
  const mockSplitPayment: PaymentSplit = {
    id: 'split-123',
    paymentId: 'payment-456',
    bookingId: 'booking-789',
    collectorId: 'user-collector',
    amount: 425, // 85% of 500
    platformFee: 21.25, // 5% of 425
    netAmount: 403.75, // 425 - 21.25
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    // Create Supabase client mock
    const mockFrom = jasmine.createSpy('from').and.returnValue({
      select: jasmine.createSpy('select').and.returnValue({
        eq: jasmine.createSpy('eq').and.returnValue({
          single: jasmine.createSpy('single').and.returnValue(Promise.resolve({ data: null, error: null })),
          order: jasmine.createSpy('order').and.returnValue(Promise.resolve({ data: [], error: null })),
        }),
      }),
      insert: jasmine.createSpy('insert').and.returnValue(Promise.resolve({ data: null, error: null })),
      update: jasmine.createSpy('update').and.returnValue({
        eq: jasmine.createSpy('eq').and.returnValue({
          select: jasmine.createSpy('select').and.returnValue({
            single: jasmine.createSpy('single').and.returnValue(Promise.resolve({ data: mockSplitPayment, error: null })),
          }),
        }),
      }),
    });

    supabaseClient = {
      from: mockFrom,
      functions: {
        invoke: jasmine.createSpy('invoke'),
      },
    };

    const supabaseServiceSpy = jasmine.createSpyObj('SupabaseClientService', ['getClient']);
    supabaseServiceSpy.getClient.and.returnValue(supabaseClient);

    TestBed.configureTestingModule({
      providers: [
        SplitPaymentService,
        { provide: SupabaseClientService, useValue: supabaseServiceSpy },
      ],
    });

    service = TestBed.inject(SplitPaymentService);
    supabaseService = TestBed.inject(SupabaseClientService) as jasmine.SpyObj<SupabaseClientService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ============================================================================
  // SPLIT PAYMENT PROCESSING TESTS (85/15 Revenue Split)
  // ============================================================================

  describe('processSplitPayment', () => {
    it('should process 85/15 split payment correctly for AutoRenta', (done) => {
      // Arrange - AutoRenta 85% to owner, 15% to platform
      const collectors: SplitPaymentCollector[] = [
        { userId: 'owner-user-id', percentage: 85, description: 'Car owner' },
        { userId: 'platform-user-id', percentage: 15, description: 'Platform fee' },
      ];

      const request: SplitPaymentRequest = {
        paymentIntentId: 'payment-intent-123',
        bookingId: 'booking-456',
        totalAmount: 10000, // ARS 10,000
        currency: 'ARS',
        collectors,
        platformFeePercentage: 5, // 5% additional platform fee on each split
      };

      // Setup successful insert
      supabaseClient.from('payment_splits').insert.and.returnValue(
        Promise.resolve({ data: null, error: null }),
      );
      supabaseClient.from('wallet_transactions').insert.and.returnValue(
        Promise.resolve({ data: null, error: null }),
      );
      supabaseClient.from('wallet_ledger').insert.and.returnValue(
        Promise.resolve({ data: null, error: null }),
      );

      // Act
      service.processSplitPayment(request).subscribe({
        next: (response: SplitPaymentResponse) => {
          // Assert
          expect(response.success).toBe(true);
          expect(response.splits.length).toBe(2);

          // Owner split: 85% of 10,000 = 8,500 ARS
          const ownerSplit = response.splits.find((s) => s.collectorId === 'owner-user-id');
          expect(ownerSplit).toBeDefined();
          expect(ownerSplit!.amount).toBe(8500);
          expect(ownerSplit!.platformFee).toBe(425); // 5% of 8,500
          expect(ownerSplit!.netAmount).toBe(8075); // 8,500 - 425

          // Platform split: 15% of 10,000 = 1,500 ARS
          const platformSplit = response.splits.find((s) => s.collectorId === 'platform-user-id');
          expect(platformSplit).toBeDefined();
          expect(platformSplit!.amount).toBe(1500);
          expect(platformSplit!.platformFee).toBe(75); // 5% of 1,500
          expect(platformSplit!.netAmount).toBe(1425); // 1,500 - 75

          // Total fee should be sum of both fees
          expect(response.totalFee).toBe(500); // 425 + 75

          done();
        },
        error: done.fail,
      });
    });

    it('should validate that percentages sum to 100%', (done) => {
      // Arrange - Invalid: doesn't sum to 100%
      const collectors: SplitPaymentCollector[] = [
        { userId: 'user-1', percentage: 60 },
        { userId: 'user-2', percentage: 30 }, // Only 90% total
      ];

      const request: SplitPaymentRequest = {
        paymentIntentId: 'payment-123',
        bookingId: 'booking-456',
        totalAmount: 1000,
        currency: 'ARS',
        collectors,
      };

      // Act
      service.processSplitPayment(request).subscribe({
        next: (response: SplitPaymentResponse) => {
          // Assert
          expect(response.success).toBe(false);
          expect(response.errors).toContain('Collector percentages must sum to 100%');
          done();
        },
        error: done.fail,
      });
    });

    it('should reject split payment with zero or negative amount', (done) => {
      // Arrange
      const collectors: SplitPaymentCollector[] = [
        { userId: 'user-1', percentage: 100 },
      ];

      const request: SplitPaymentRequest = {
        paymentIntentId: 'payment-123',
        bookingId: 'booking-456',
        totalAmount: -500, // Negative amount
        currency: 'ARS',
        collectors,
      };

      // Act
      service.processSplitPayment(request).subscribe({
        next: (response: SplitPaymentResponse) => {
          // Assert
          expect(response.success).toBe(false);
          expect(response.errors).toContain('Total amount must be greater than 0');
          done();
        },
        error: done.fail,
      });
    });

    it('should reject duplicate collectors', (done) => {
      // Arrange
      const collectors: SplitPaymentCollector[] = [
        { userId: 'user-1', percentage: 50 },
        { userId: 'user-1', percentage: 50 }, // Duplicate
      ];

      const request: SplitPaymentRequest = {
        paymentIntentId: 'payment-123',
        bookingId: 'booking-456',
        totalAmount: 1000,
        currency: 'ARS',
        collectors,
      };

      // Act
      service.processSplitPayment(request).subscribe({
        next: (response: SplitPaymentResponse) => {
          // Assert
          expect(response.success).toBe(false);
          expect(response.errors).toContain('Duplicate collectors found');
          done();
        },
        error: done.fail,
      });
    });

    it('should reject splits below minimum amount (100 ARS)', (done) => {
      // Arrange - Collector gets only 1% of 5000 = 50 ARS (below minimum)
      const collectors: SplitPaymentCollector[] = [
        { userId: 'user-1', percentage: 99 },
        { userId: 'user-2', percentage: 1 }, // Only 50 ARS, below 100 ARS minimum
      ];

      const request: SplitPaymentRequest = {
        paymentIntentId: 'payment-123',
        bookingId: 'booking-456',
        totalAmount: 5000,
        currency: 'ARS',
        collectors,
      };

      supabaseClient.from('payment_splits').insert.and.returnValue(
        Promise.resolve({ data: null, error: null }),
      );
      supabaseClient.from('wallet_transactions').insert.and.returnValue(
        Promise.resolve({ data: null, error: null }),
      );
      supabaseClient.from('wallet_ledger').insert.and.returnValue(
        Promise.resolve({ data: null, error: null }),
      );

      // Act
      service.processSplitPayment(request).subscribe({
        next: (response: SplitPaymentResponse) => {
          // Assert
          expect(response.success).toBe(true); // Still succeeds
          expect(response.splits.length).toBe(1); // But only 1 split created (user-1)
          expect(response.errors).toBeDefined();
          expect(response.errors![0]).toContain('below minimum');
          done();
        },
        error: done.fail,
      });
    });

    it('should use default platform fee of 5% when not specified', (done) => {
      // Arrange
      const collectors: SplitPaymentCollector[] = [
        { userId: 'user-1', percentage: 100 },
      ];

      const request: SplitPaymentRequest = {
        paymentIntentId: 'payment-123',
        bookingId: 'booking-456',
        totalAmount: 1000,
        currency: 'ARS',
        collectors,
        // No platformFeePercentage specified
      };

      supabaseClient.from('payment_splits').insert.and.returnValue(
        Promise.resolve({ data: null, error: null }),
      );
      supabaseClient.from('wallet_transactions').insert.and.returnValue(
        Promise.resolve({ data: null, error: null }),
      );
      supabaseClient.from('wallet_ledger').insert.and.returnValue(
        Promise.resolve({ data: null, error: null }),
      );

      // Act
      service.processSplitPayment(request).subscribe({
        next: (response: SplitPaymentResponse) => {
          // Assert
          expect(response.success).toBe(true);
          expect(response.splits[0].platformFee).toBe(50); // 5% of 1000
          expect(response.splits[0].netAmount).toBe(950); // 1000 - 50
          done();
        },
        error: done.fail,
      });
    });

    it('should handle database insertion errors gracefully', (done) => {
      // Arrange
      const collectors: SplitPaymentCollector[] = [
        { userId: 'user-1', percentage: 100 },
      ];

      const request: SplitPaymentRequest = {
        paymentIntentId: 'payment-123',
        bookingId: 'booking-456',
        totalAmount: 1000,
        currency: 'ARS',
        collectors,
      };

      supabaseClient.from('payment_splits').insert.and.returnValue(
        Promise.resolve({ data: null, error: { message: 'Database error' } }),
      );

      // Act
      service.processSplitPayment(request).subscribe({
        next: (response: SplitPaymentResponse) => {
          // Assert
          expect(response.success).toBe(false);
          expect(response.errors).toBeDefined();
          expect(response.errors![0]).toContain('Database error');
          done();
        },
        error: done.fail,
      });
    });
  });

  // ============================================================================
  // BOOKING SPLITS QUERY TESTS
  // ============================================================================

  describe('getBookingSplits', () => {
    it('should retrieve splits for a booking', (done) => {
      // Arrange
      const mockSplits = [mockSplitPayment];

      supabaseClient.from('payment_splits').select('*').eq('booking_id', 'booking-789').and.returnValue(
        Promise.resolve({ data: mockSplits, error: null }),
      );

      // Act
      service.getBookingSplits('booking-789').subscribe({
        next: (splits: PaymentSplit[]) => {
          // Assert
          expect(splits).toEqual(mockSplits);
          expect(supabaseClient.from).toHaveBeenCalledWith('payment_splits');
          done();
        },
        error: done.fail,
      });
    });

    it('should handle errors when fetching booking splits', (done) => {
      // Arrange
      supabaseClient.from('payment_splits').select('*').eq('booking_id', 'booking-789').and.returnValue(
        Promise.resolve({ data: null, error: { message: 'Database error' } }),
      );

      // Act
      service.getBookingSplits('booking-789').subscribe({
        next: () => done.fail('Should have thrown error'),
        error: (error: Error) => {
          // Assert
          expect(error.message).toContain('Failed to fetch payment splits');
          done();
        },
      });
    });
  });

  // ============================================================================
  // USER SPLITS QUERY TESTS
  // ============================================================================

  describe('getUserSplits', () => {
    it('should retrieve splits for a user (collector)', (done) => {
      // Arrange
      const mockSplits = [mockSplitPayment];

      supabaseClient.from('payment_splits')
        .select('*')
        .eq('collector_id', 'user-collector')
        .order('created_at', { ascending: false })
        .and.returnValue(Promise.resolve({ data: mockSplits, error: null }));

      // Act
      service.getUserSplits('user-collector').subscribe({
        next: (splits: PaymentSplit[]) => {
          // Assert
          expect(splits).toEqual(mockSplits);
          done();
        },
        error: done.fail,
      });
    });
  });

  // ============================================================================
  // USER SPLIT STATISTICS TESTS
  // ============================================================================

  describe('getUserSplitStats', () => {
    it('should calculate split statistics correctly', (done) => {
      // Arrange
      const mockSplits: PaymentSplit[] = [
        { ...mockSplitPayment, status: 'completed', netAmount: 1000 },
        { ...mockSplitPayment, id: 'split-2', status: 'completed', netAmount: 2000 },
        { ...mockSplitPayment, id: 'split-3', status: 'pending', netAmount: 500 },
        { ...mockSplitPayment, id: 'split-4', status: 'processing', netAmount: 300 },
      ];

      supabaseClient.from('payment_splits')
        .select('*')
        .eq('collector_id', 'user-123')
        .order('created_at', { ascending: false })
        .and.returnValue(Promise.resolve({ data: mockSplits, error: null }));

      // Act
      service.getUserSplitStats('user-123').subscribe({
        next: (stats) => {
          // Assert
          expect(stats.totalEarnings).toBe(3800); // 1000 + 2000 + 500 + 300
          expect(stats.totalCompleted).toBe(3000); // 1000 + 2000
          expect(stats.totalPending).toBe(800); // 500 + 300
          expect(stats.completedPayouts).toBe(2);
          expect(stats.averagePayoutAmount).toBe(1500); // 3000 / 2
          done();
        },
        error: done.fail,
      });
    });

    it('should handle user with no splits', (done) => {
      // Arrange
      supabaseClient.from('payment_splits')
        .select('*')
        .eq('collector_id', 'user-no-splits')
        .order('created_at', { ascending: false })
        .and.returnValue(Promise.resolve({ data: [], error: null }));

      // Act
      service.getUserSplitStats('user-no-splits').subscribe({
        next: (stats) => {
          // Assert
          expect(stats.totalEarnings).toBe(0);
          expect(stats.totalCompleted).toBe(0);
          expect(stats.totalPending).toBe(0);
          expect(stats.completedPayouts).toBe(0);
          expect(stats.averagePayoutAmount).toBe(0);
          done();
        },
        error: done.fail,
      });
    });
  });

  // ============================================================================
  // SPLIT COMPLETION TESTS
  // ============================================================================

  describe('completeSplit', () => {
    it('should mark split as completed and create wallet transaction', (done) => {
      // Arrange
      supabaseClient.from('payment_splits')
        .update.and.returnValue({
          eq: jasmine.createSpy('eq').and.returnValue({
            select: jasmine.createSpy('select').and.returnValue({
              single: jasmine.createSpy('single').and.returnValue(
                Promise.resolve({ data: { ...mockSplitPayment, status: 'completed' }, error: null }),
              ),
            }),
          }),
        });

      supabaseClient.from('wallet_transactions').insert.and.returnValue(
        Promise.resolve({ data: null, error: null }),
      );
      supabaseClient.from('wallet_ledger').insert.and.returnValue(
        Promise.resolve({ data: null, error: null }),
      );

      // Act
      service.completeSplit('split-123', 'payout-456').subscribe({
        next: (split: PaymentSplit) => {
          // Assert
          expect(split.status).toBe('completed');
          expect(supabaseClient.from).toHaveBeenCalledWith('payment_splits');
          expect(supabaseClient.from).toHaveBeenCalledWith('wallet_transactions');
          done();
        },
        error: done.fail,
      });
    });
  });

  // ============================================================================
  // SPLIT FAILURE TESTS
  // ============================================================================

  describe('failSplit', () => {
    it('should mark split as failed with reason', (done) => {
      // Arrange
      supabaseClient.from('payment_splits')
        .update.and.returnValue({
          eq: jasmine.createSpy('eq').and.returnValue({
            select: jasmine.createSpy('select').and.returnValue({
              single: jasmine.createSpy('single').and.returnValue(
                Promise.resolve({
                  data: { ...mockSplitPayment, status: 'failed', failureReason: 'Insufficient funds' },
                  error: null,
                }),
              ),
            }),
          }),
        });

      // Act
      service.failSplit('split-123', 'Insufficient funds').subscribe({
        next: (split: PaymentSplit) => {
          // Assert
          expect(split.status).toBe('failed');
          expect(split.failureReason).toBe('Insufficient funds');
          done();
        },
        error: done.fail,
      });
    });
  });

  // ============================================================================
  // PAYMENT BREAKDOWN TESTS
  // ============================================================================

  describe('getPaymentBreakdown', () => {
    it('should return complete payment breakdown', (done) => {
      // Arrange
      const mockPayment = {
        id: 'payment-456',
        amount: 10000,
        currency: 'ARS',
      };

      const mockSplits: PaymentSplit[] = [
        { ...mockSplitPayment, platformFee: 425, netAmount: 8075 },
        { ...mockSplitPayment, id: 'split-2', platformFee: 75, netAmount: 1425 },
      ];

      // Mock payment query
      const paymentQuery = jasmine.createSpyObj('paymentQuery', ['single']);
      paymentQuery.single.and.returnValue(Promise.resolve({ data: mockPayment, error: null }));

      const selectSpy = jasmine.createSpy('select').and.returnValue(paymentQuery);
      const eqSpy = jasmine.createSpy('eq').and.returnValue({ select: selectSpy });

      // Mock splits query
      const splitsQuery = jasmine.createSpyObj('splitsQuery', ['eq']);
      splitsQuery.eq.and.returnValue(Promise.resolve({ data: mockSplits, error: null }));

      const selectSplitsSpy = jasmine.createSpy('select').and.returnValue(splitsQuery);
      const eqSplitsSpy = jasmine.createSpy('eq').and.returnValue({ select: selectSplitsSpy });

      supabaseClient.from.and.callFake((table: string) => {
        if (table === 'payments') {
          return { select: selectSpy, eq: eqSpy };
        } else {
          return { select: selectSplitsSpy, eq: eqSplitsSpy };
        }
      });

      // Act
      service.getPaymentBreakdown('payment-456').subscribe({
        next: (breakdown) => {
          // Assert
          expect(breakdown.payment).toEqual(mockPayment);
          expect(breakdown.splits).toEqual(mockSplits);
          expect(breakdown.summary.totalAmount).toBe(10000);
          expect(breakdown.summary.totalFees).toBe(500); // 425 + 75
          expect(breakdown.summary.netDistributed).toBe(9500); // 8075 + 1425
          done();
        },
        error: done.fail,
      });
    });
  });
});
