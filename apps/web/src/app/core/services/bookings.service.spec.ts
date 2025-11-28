import { TestBed } from '@angular/core/testing';
import { BookingsService } from './bookings.service';
import { SupabaseClientService } from './supabase-client.service';
import { PwaService } from './pwa.service';
import { InsuranceService } from './insurance.service';
import { LoggerService } from './logger.service';
import { BookingWalletService } from './booking-wallet.service';
import { BookingApprovalService } from './booking-approval.service';
import { BookingCompletionService } from './booking-completion.service';
import { BookingValidationService } from './booking-validation.service';
import { BookingCancellationService } from './booking-cancellation.service';
import { BookingUtilsService } from './booking-utils.service';
import { TikTokEventsService } from './tiktok-events.service';
import { CarOwnerNotificationsService } from './car-owner-notifications.service';
import { CarsService } from './cars.service';
import { ProfileService } from './profile.service';
import { Booking, Car, UserProfile } from '../models';

describe('BookingsService', () => {
  let service: BookingsService;
  let mockSupabaseClient: any;
  let mockPwaService: jasmine.SpyObj<PwaService>;
  let mockInsuranceService: jasmine.SpyObj<InsuranceService>;
  let mockLoggerService: jasmine.SpyObj<LoggerService>;
  let mockWalletService: jasmine.SpyObj<BookingWalletService>;
  let mockApprovalService: jasmine.SpyObj<BookingApprovalService>;
  let mockCompletionService: jasmine.SpyObj<BookingCompletionService>;
  let mockValidationService: jasmine.SpyObj<BookingValidationService>;
  let mockCancellationService: jasmine.SpyObj<BookingCancellationService>;
  let mockUtilsService: jasmine.SpyObj<BookingUtilsService>;
  let mockTikTokEventsService: jasmine.SpyObj<TikTokEventsService>;
  let mockCarOwnerNotifications: jasmine.SpyObj<CarOwnerNotificationsService>;
  let mockCarsService: jasmine.SpyObj<CarsService>;
  let mockProfileService: jasmine.SpyObj<ProfileService>;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockBooking: Booking = {
    id: 'booking-123',
    car_id: 'car-456',
    user_id: 'user-123',
    owner_id: 'owner-789',
    status: 'pending',
    start_at: '2025-12-01T10:00:00Z',
    end_at: '2025-12-05T18:00:00Z',
    total_amount: 50000,
    currency: 'ARS',
    created_at: '2025-11-28T10:00:00Z',
  } as Booking;

  beforeEach(() => {
    // Create Supabase mock
    mockSupabaseClient = {
      auth: {
        getUser: jasmine.createSpy('getUser').and.resolveTo({
          data: { user: mockUser },
          error: null,
        }),
      },
      rpc: jasmine.createSpy('rpc'),
      from: jasmine.createSpy('from'),
    };

    // Create service mocks
    mockPwaService = jasmine.createSpyObj('PwaService', ['setAppBadge', 'clearAppBadge']);
    mockPwaService.setAppBadge.and.resolveTo();
    mockPwaService.clearAppBadge.and.resolveTo();

    mockInsuranceService = jasmine.createSpyObj('InsuranceService', [
      'activateCoverage',
      'getInsuranceSummary',
      'calculateSecurityDeposit',
      'hasOwnerInsurance',
      'getCommissionRate',
    ]);
    mockInsuranceService.activateCoverage.and.resolveTo('coverage-123');

    mockLoggerService = jasmine.createSpyObj('LoggerService', [
      'info',
      'warn',
      'error',
      'critical',
    ]);

    mockWalletService = jasmine.createSpyObj('BookingWalletService', [
      'chargeRentalFromWallet',
      'processRentalPayment',
      'lockSecurityDeposit',
      'releaseSecurityDeposit',
      'deductFromSecurityDeposit',
    ]);

    mockApprovalService = jasmine.createSpyObj('BookingApprovalService', [
      'getPendingApprovals',
      'approveBooking',
      'rejectBooking',
      'carRequiresApproval',
    ]);

    mockCompletionService = jasmine.createSpyObj('BookingCompletionService', [
      'completeBookingClean',
      'completeBookingWithDamages',
    ]);

    mockValidationService = jasmine.createSpyObj('BookingValidationService', [
      'createBookingWithValidation',
    ]);

    mockCancellationService = jasmine.createSpyObj('BookingCancellationService', [
      'cancelBooking',
      'cancelBookingLegacy',
    ]);

    mockUtilsService = jasmine.createSpyObj('BookingUtilsService', [
      'extractBookingId',
      'getTimeUntilExpiration',
      'formatTimeRemaining',
      'isExpired',
    ]);
    mockUtilsService.extractBookingId.and.returnValue('booking-123');

    mockTikTokEventsService = jasmine.createSpyObj('TikTokEventsService', [
      'trackPlaceAnOrder',
      'trackPurchase',
    ]);
    mockTikTokEventsService.trackPlaceAnOrder.and.resolveTo();
    mockTikTokEventsService.trackPurchase.and.resolveTo();

    mockCarOwnerNotifications = jasmine.createSpyObj('CarOwnerNotificationsService', [
      'notifyNewBookingRequest',
    ]);

    mockCarsService = jasmine.createSpyObj('CarsService', ['getCarById']);
    mockCarsService.getCarById.and.resolveTo({
      id: 'car-456',
      brand: 'Toyota',
      model: 'Corolla',
      title: 'Toyota Corolla 2023',
    } as Car);

    mockProfileService = jasmine.createSpyObj('ProfileService', ['getProfileById']);
    mockProfileService.getProfileById.and.resolveTo({
      id: 'user-123',
      full_name: 'Test User',
    } as UserProfile);

    TestBed.configureTestingModule({
      providers: [
        BookingsService,
        {
          provide: SupabaseClientService,
          useValue: { getClient: () => mockSupabaseClient },
        },
        { provide: PwaService, useValue: mockPwaService },
        { provide: InsuranceService, useValue: mockInsuranceService },
        { provide: LoggerService, useValue: mockLoggerService },
        { provide: BookingWalletService, useValue: mockWalletService },
        { provide: BookingApprovalService, useValue: mockApprovalService },
        { provide: BookingCompletionService, useValue: mockCompletionService },
        { provide: BookingValidationService, useValue: mockValidationService },
        { provide: BookingCancellationService, useValue: mockCancellationService },
        { provide: BookingUtilsService, useValue: mockUtilsService },
        { provide: TikTokEventsService, useValue: mockTikTokEventsService },
        { provide: CarOwnerNotificationsService, useValue: mockCarOwnerNotifications },
        { provide: CarsService, useValue: mockCarsService },
        { provide: ProfileService, useValue: mockProfileService },
      ],
    });

    service = TestBed.inject(BookingsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('requestBooking', () => {
    beforeEach(() => {
      // Setup RPC mock for request_booking
      mockSupabaseClient.rpc.and.resolveTo({
        data: 'booking-123',
        error: null,
      });

      // Setup from mock for fetching booking
      const mockQuery = {
        select: jasmine.createSpy('select').and.returnValue({
          eq: jasmine.createSpy('eq').and.returnValue({
            single: jasmine.createSpy('single').and.resolveTo({
              data: mockBooking,
              error: null,
            }),
          }),
        }),
      };
      mockSupabaseClient.from.and.returnValue(mockQuery);
    });

    it('should create a booking successfully', async () => {
      const booking = await service.requestBooking(
        'car-456',
        '2025-12-01T10:00:00Z',
        '2025-12-05T18:00:00Z',
      );

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('request_booking', jasmine.objectContaining({
        p_car_id: 'car-456',
        p_start: '2025-12-01T10:00:00Z',
        p_end: '2025-12-05T18:00:00Z',
      }));
      expect(booking).toBeTruthy();
      expect(booking.id).toBe('booking-123');
    });

    it('should activate insurance coverage after creating booking', async () => {
      await service.requestBooking(
        'car-456',
        '2025-12-01T10:00:00Z',
        '2025-12-05T18:00:00Z',
      );

      expect(mockInsuranceService.activateCoverage).toHaveBeenCalledWith({
        booking_id: 'booking-123',
        addon_ids: [],
      });
    });

    it('should track TikTok PlaceAnOrder event', async () => {
      await service.requestBooking(
        'car-456',
        '2025-12-01T10:00:00Z',
        '2025-12-05T18:00:00Z',
      );

      expect(mockTikTokEventsService.trackPlaceAnOrder).toHaveBeenCalled();
    });

    it('should throw error when RPC fails', async () => {
      mockSupabaseClient.rpc.and.resolveTo({
        data: null,
        error: { message: 'Auto no disponible' },
      });

      await expectAsync(
        service.requestBooking('car-456', '2025-12-01T10:00:00Z', '2025-12-05T18:00:00Z'),
      ).toBeRejectedWithError('Auto no disponible');
    });

    it('should throw error when no booking ID returned', async () => {
      mockUtilsService.extractBookingId.and.returnValue(null);

      await expectAsync(
        service.requestBooking('car-456', '2025-12-01T10:00:00Z', '2025-12-05T18:00:00Z'),
      ).toBeRejectedWithError('request_booking did not return a booking id');
    });

    it('should support dynamic pricing options', async () => {
      await service.requestBooking('car-456', '2025-12-01T10:00:00Z', '2025-12-05T18:00:00Z', {
        useDynamicPricing: true,
        priceLockToken: 'lock-token-123',
        dynamicPriceSnapshot: { discount: 10 },
      });

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('request_booking', jasmine.objectContaining({
        p_use_dynamic_pricing: true,
        p_price_lock_token: 'lock-token-123',
        p_dynamic_price_snapshot: { discount: 10 },
      }));
    });
  });

  describe('getMyBookings', () => {
    beforeEach(() => {
      const mockQuery = {
        select: jasmine.createSpy('select').and.returnValue({
          order: jasmine.createSpy('order').and.returnValue({
            range: jasmine.createSpy('range').and.resolveTo({
              data: [mockBooking],
              error: null,
              count: 1,
            }),
          }),
          eq: jasmine.createSpy('eq').and.returnValue({
            order: jasmine.createSpy('order').and.returnValue({
              range: jasmine.createSpy('range').and.resolveTo({
                data: [mockBooking],
                error: null,
                count: 1,
              }),
            }),
          }),
        }),
      };
      mockSupabaseClient.from.and.returnValue(mockQuery);
    });

    it('should return user bookings with pagination', async () => {
      const result = await service.getMyBookings({ limit: 20, offset: 0 });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('my_bookings');
      expect(result.bookings.length).toBe(1);
      expect(result.total).toBe(1);
    });

    it('should update app badge with pending bookings count', async () => {
      await service.getMyBookings();

      expect(mockPwaService.setAppBadge).toHaveBeenCalledWith(1);
    });

    it('should clear app badge when no pending bookings', async () => {
      const completedBooking = { ...mockBooking, status: 'completed' };
      const mockQuery = {
        select: jasmine.createSpy('select').and.returnValue({
          order: jasmine.createSpy('order').and.returnValue({
            range: jasmine.createSpy('range').and.resolveTo({
              data: [completedBooking],
              error: null,
              count: 1,
            }),
          }),
        }),
      };
      mockSupabaseClient.from.and.returnValue(mockQuery);

      await service.getMyBookings();

      expect(mockPwaService.clearAppBadge).toHaveBeenCalled();
    });
  });

  describe('getOwnerBookings', () => {
    beforeEach(() => {
      const mockQuery = {
        select: jasmine.createSpy('select').and.returnValue({
          order: jasmine.createSpy('order').and.returnValue({
            range: jasmine.createSpy('range').and.resolveTo({
              data: [mockBooking],
              error: null,
              count: 1,
            }),
          }),
        }),
      };
      mockSupabaseClient.from.and.returnValue(mockQuery);
    });

    it('should return owner bookings', async () => {
      const result = await service.getOwnerBookings();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('owner_bookings');
      expect(result.bookings.length).toBe(1);
    });
  });

  describe('getBookingById', () => {
    it('should return booking by ID', async () => {
      const mockQuery = {
        select: jasmine.createSpy('select').and.returnValue({
          eq: jasmine.createSpy('eq').and.returnValue({
            single: jasmine.createSpy('single').and.resolveTo({
              data: mockBooking,
              error: null,
            }),
          }),
        }),
      };
      mockSupabaseClient.from.and.returnValue(mockQuery);

      const booking = await service.getBookingById('booking-123');

      expect(booking).toBeTruthy();
      expect(booking?.id).toBe('booking-123');
    });

    it('should return null when booking not found', async () => {
      const mockQuery = {
        select: jasmine.createSpy('select').and.returnValue({
          eq: jasmine.createSpy('eq').and.returnValue({
            single: jasmine.createSpy('single').and.resolveTo({
              data: null,
              error: { code: 'PGRST116', message: 'Not found' },
            }),
          }),
        }),
      };
      mockSupabaseClient.from.and.returnValue(mockQuery);

      const booking = await service.getBookingById('non-existent');

      expect(booking).toBeNull();
    });
  });

  describe('updateBooking', () => {
    it('should update booking fields', async () => {
      const updatedBooking = { ...mockBooking, status: 'confirmed' };
      const mockQuery = {
        update: jasmine.createSpy('update').and.returnValue({
          eq: jasmine.createSpy('eq').and.returnValue({
            select: jasmine.createSpy('select').and.returnValue({
              single: jasmine.createSpy('single').and.resolveTo({
                data: updatedBooking,
                error: null,
              }),
            }),
          }),
        }),
      };
      mockSupabaseClient.from.and.returnValue(mockQuery);

      const result = await service.updateBooking('booking-123', { status: 'confirmed' });

      expect(result.status).toBe('confirmed');
    });
  });

  describe('markAsPaid', () => {
    beforeEach(() => {
      // Mock getBookingById
      const selectQuery = {
        select: jasmine.createSpy('select').and.returnValue({
          eq: jasmine.createSpy('eq').and.returnValue({
            single: jasmine.createSpy('single').and.resolveTo({
              data: mockBooking,
              error: null,
            }),
          }),
        }),
        update: jasmine.createSpy('update').and.returnValue({
          eq: jasmine.createSpy('eq').and.resolveTo({
            data: null,
            error: null,
          }),
        }),
      };
      mockSupabaseClient.from.and.returnValue(selectQuery);
    });

    it('should mark booking as paid', async () => {
      await service.markAsPaid('booking-123', 'payment-intent-456');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('bookings');
    });

    it('should track TikTok Purchase event', async () => {
      await service.markAsPaid('booking-123', 'payment-intent-456');

      expect(mockTikTokEventsService.trackPurchase).toHaveBeenCalled();
    });
  });

  describe('cancelBooking', () => {
    beforeEach(() => {
      const mockQuery = {
        select: jasmine.createSpy('select').and.returnValue({
          eq: jasmine.createSpy('eq').and.returnValue({
            single: jasmine.createSpy('single').and.resolveTo({
              data: mockBooking,
              error: null,
            }),
          }),
        }),
      };
      mockSupabaseClient.from.and.returnValue(mockQuery);
      mockCancellationService.cancelBooking.and.resolveTo({ success: true });
    });

    it('should cancel booking successfully', async () => {
      const result = await service.cancelBooking('booking-123');

      expect(result.success).toBe(true);
      expect(mockCancellationService.cancelBooking).toHaveBeenCalledWith(mockBooking, false);
    });

    it('should return error when booking not found', async () => {
      const mockQuery = {
        select: jasmine.createSpy('select').and.returnValue({
          eq: jasmine.createSpy('eq').and.returnValue({
            single: jasmine.createSpy('single').and.resolveTo({
              data: null,
              error: { code: 'PGRST116' },
            }),
          }),
        }),
      };
      mockSupabaseClient.from.and.returnValue(mockQuery);

      const result = await service.cancelBooking('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Reserva no encontrada');
    });
  });

  describe('Wallet Operations', () => {
    beforeEach(() => {
      const mockQuery = {
        select: jasmine.createSpy('select').and.returnValue({
          eq: jasmine.createSpy('eq').and.returnValue({
            single: jasmine.createSpy('single').and.resolveTo({
              data: mockBooking,
              error: null,
            }),
          }),
        }),
        update: jasmine.createSpy('update').and.returnValue({
          eq: jasmine.createSpy('eq').and.returnValue({
            select: jasmine.createSpy('select').and.returnValue({
              single: jasmine.createSpy('single').and.resolveTo({
                data: mockBooking,
                error: null,
              }),
            }),
          }),
        }),
      };
      mockSupabaseClient.from.and.returnValue(mockQuery);
    });

    describe('lockSecurityDeposit', () => {
      it('should lock security deposit', async () => {
        mockWalletService.lockSecurityDeposit.and.resolveTo({
          ok: true,
          transaction_id: 'tx-123',
        });

        const result = await service.lockSecurityDeposit('booking-123', 10000);

        expect(result.ok).toBe(true);
        expect(result.transaction_id).toBe('tx-123');
      });
    });

    describe('releaseSecurityDeposit', () => {
      it('should release security deposit', async () => {
        mockWalletService.releaseSecurityDeposit.and.resolveTo({ ok: true });

        const result = await service.releaseSecurityDeposit('booking-123');

        expect(result.ok).toBe(true);
      });
    });

    describe('chargeRentalFromWallet', () => {
      it('should charge rental from wallet', async () => {
        mockWalletService.chargeRentalFromWallet.and.resolveTo({ ok: true });

        const result = await service.chargeRentalFromWallet('booking-123', 50000);

        expect(result.ok).toBe(true);
      });
    });
  });

  describe('Approval Operations', () => {
    it('should get pending approvals', async () => {
      mockApprovalService.getPendingApprovals.and.resolveTo([{ id: 'booking-1' }]);

      const approvals = await service.getPendingApprovals();

      expect(approvals.length).toBe(1);
    });

    it('should approve booking', async () => {
      mockApprovalService.approveBooking.and.resolveTo({ success: true });

      const result = await service.approveBooking('booking-123');

      expect(result.success).toBe(true);
    });

    it('should reject booking', async () => {
      mockApprovalService.rejectBooking.and.resolveTo({ success: true });

      const result = await service.rejectBooking('booking-123', 'Not available');

      expect(result.success).toBe(true);
    });
  });

  describe('Utility Operations', () => {
    it('should get time until expiration', () => {
      mockUtilsService.getTimeUntilExpiration.and.returnValue(3600000);

      const time = service.getTimeUntilExpiration(mockBooking);

      expect(time).toBe(3600000);
    });

    it('should format time remaining', () => {
      mockUtilsService.formatTimeRemaining.and.returnValue('1 hora');

      const formatted = service.formatTimeRemaining(3600000);

      expect(formatted).toBe('1 hora');
    });

    it('should check if booking is expired', () => {
      mockUtilsService.isExpired.and.returnValue(false);

      const expired = service.isExpired(mockBooking);

      expect(expired).toBe(false);
    });
  });

  describe('Insurance Operations', () => {
    it('should activate insurance coverage', async () => {
      const result = await service.activateInsuranceCoverage('booking-123', ['addon-1']);

      expect(result.success).toBe(true);
      expect(result.coverage_id).toBe('coverage-123');
    });

    it('should handle insurance activation failure', async () => {
      mockInsuranceService.activateCoverage.and.rejectWith(new Error('Insurance service unavailable'));

      const result = await service.activateInsuranceCoverage('booking-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insurance service unavailable');
    });

    it('should calculate insurance deposit', async () => {
      mockInsuranceService.calculateSecurityDeposit.and.resolveTo(30000);

      const deposit = await service.calculateInsuranceDeposit('car-456');

      expect(deposit).toBe(30000);
    });

    it('should check owner insurance', async () => {
      mockInsuranceService.hasOwnerInsurance.and.resolveTo(true);

      const hasInsurance = await service.hasOwnerInsurance('car-456');

      expect(hasInsurance).toBe(true);
    });
  });

  describe('createBookingAtomic', () => {
    const atomicParams = {
      carId: 'car-456',
      startDate: '2025-12-01',
      endDate: '2025-12-05',
      totalAmount: 50000,
      currency: 'ARS',
      paymentMode: 'wallet',
      riskSnapshot: {
        dailyPriceUsd: 50,
        securityDepositUsd: 300,
        vehicleValueUsd: 15000,
        driverAge: 30,
        coverageType: 'basic',
        paymentMode: 'wallet',
        totalUsd: 200,
        totalArs: 50000,
        exchangeRate: 250,
      },
    };

    it('should create booking atomically', async () => {
      mockSupabaseClient.rpc.and.resolveTo({
        data: { success: true, booking_id: 'booking-123', risk_snapshot_id: 'risk-123' },
        error: null,
      });

      const result = await service.createBookingAtomic(atomicParams);

      expect(result.success).toBe(true);
      expect(result.bookingId).toBe('booking-123');
    });

    it('should return error when user not authenticated', async () => {
      mockSupabaseClient.auth.getUser.and.resolveTo({
        data: { user: null },
        error: null,
      });

      const result = await service.createBookingAtomic(atomicParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Usuario no autenticado');
    });

    it('should handle RPC errors', async () => {
      mockSupabaseClient.rpc.and.resolveTo({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await service.createBookingAtomic(atomicParams);

      expect(result.success).toBe(false);
    });
  });
});
