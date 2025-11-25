import { TestBed } from '@angular/core/testing';
import { BookingFlowService } from './booking-flow.service';
import { AuthService } from './auth.service';
import { BookingConfirmationService } from './booking-confirmation.service';
import { BookingNotificationsService } from './booking-notifications.service';
import { BookingsService } from './bookings.service';
import { FgoV1_1Service } from './fgo-v1-1.service';
import { ReviewsService } from './reviews.service';
import { NotificationsService } from './user-notifications.service';
import { Router } from '@angular/router';
import type { Booking } from '../models';

describe('BookingFlowService', () => {
  let service: BookingFlowService;
  let mockAuthService: any;
  let mockBookingsService: any;
  let mockFgoService: any;
  let mockConfirmationService: any;
  let mockReviewsService: any;
  let mockNotificationsService: any;
  let mockBookingNotifications: any;
  let mockRouter: any;

  const mockUserId = 'user-123';
  const mockOwnerId = 'owner-456';
  const mockRenterId = 'renter-789';
  const mockBookingId = 'booking-001';

  beforeEach(() => {
    mockAuthService = {
      session$: jasmine.createSpy('session$').and.returnValue({
        user: { id: mockUserId },
      }),
      getCurrentUser: jasmine.createSpy('getCurrentUser').and.resolveTo({ id: mockUserId }),
    };

    mockBookingsService = {};
    mockFgoService = {};
    mockConfirmationService = {};
    mockNotificationsService = {};
    mockBookingNotifications = {};
    mockRouter = {};

    mockReviewsService = {
      canReviewBooking: jasmine.createSpy('canReviewBooking'),
    };

    TestBed.configureTestingModule({
      providers: [
        BookingFlowService,
        { provide: AuthService, useValue: mockAuthService },
        { provide: BookingsService, useValue: mockBookingsService },
        { provide: FgoV1_1Service, useValue: mockFgoService },
        { provide: BookingConfirmationService, useValue: mockConfirmationService },
        { provide: ReviewsService, useValue: mockReviewsService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: BookingNotificationsService, useValue: mockBookingNotifications },
        { provide: Router, useValue: mockRouter },
      ],
    });

    service = TestBed.inject(BookingFlowService);
  });

  describe('getAvailableActions', () => {
    it('should return empty actions when no user is logged in', async () => {
      mockAuthService.session$.and.returnValue(null);

      const mockBooking: Booking = {
        id: mockBookingId,
        status: 'pending',
        owner_id: mockOwnerId,
        renter_id: mockRenterId,
      } as Booking;

      const actions = await service.getAvailableActions(mockBooking, 'both');
      expect(actions).toEqual([]);
    });

    it('should return pending actions for owner', async () => {
      mockAuthService.session$.and.returnValue({ user: { id: mockOwnerId } });

      const mockBooking: Booking = {
        id: mockBookingId,
        status: 'pending',
        owner_id: mockOwnerId,
        renter_id: mockRenterId,
      } as Booking;

      const actions = await service.getAvailableActions(mockBooking, 'owner');
      expect(actions.length).toBeGreaterThan(0);
      expect(actions[0].action).toBe('approve');
    });

    it('should return pending payment action for renter', async () => {
      mockAuthService.session$.and.returnValue({ user: { id: mockRenterId } });

      const mockBooking: Booking = {
        id: mockBookingId,
        status: 'pending',
        owner_id: mockOwnerId,
        renter_id: mockRenterId,
      } as Booking;

      const actions = await service.getAvailableActions(mockBooking, 'renter');
      expect(actions.length).toBeGreaterThan(0);
      expect(actions[0].action).toBe('pay');
    });

    it('should return review action for completed booking when user can review', async () => {
      mockAuthService.session$.and.returnValue({ user: { id: mockRenterId } });
      mockReviewsService.canReviewBooking.and.resolveTo(true);

      const completedDate = new Date();
      completedDate.setDate(completedDate.getDate() - 5); // 5 days ago

      const mockBooking: Booking = {
        id: mockBookingId,
        status: 'completed',
        owner_id: mockOwnerId,
        renter_id: mockRenterId,
        updated_at: completedDate.toISOString(),
      } as Booking;

      const actions = await service.getAvailableActions(mockBooking, 'renter');
      expect(actions.some((a) => a.action === 'review')).toBeTrue();
    });

    it('should not return review action when user already reviewed', async () => {
      mockAuthService.session$.and.returnValue({ user: { id: mockRenterId } });
      mockReviewsService.canReviewBooking.and.resolveTo(false);

      const completedDate = new Date();
      completedDate.setDate(completedDate.getDate() - 5);

      const mockBooking: Booking = {
        id: mockBookingId,
        status: 'completed',
        owner_id: mockOwnerId,
        renter_id: mockRenterId,
        updated_at: completedDate.toISOString(),
      } as Booking;

      const actions = await service.getAvailableActions(mockBooking, 'renter');
      expect(actions.some((a) => a.action === 'review')).toBeFalse();
    });

    it('should not return review action when outside 14-day window', async () => {
      mockAuthService.session$.and.returnValue({ user: { id: mockRenterId } });
      mockReviewsService.canReviewBooking.and.resolveTo(true);

      const completedDate = new Date();
      completedDate.setDate(completedDate.getDate() - 20); // 20 days ago - outside window

      const mockBooking: Booking = {
        id: mockBookingId,
        status: 'completed',
        owner_id: mockOwnerId,
        renter_id: mockRenterId,
        updated_at: completedDate.toISOString(),
      } as Booking;

      const actions = await service.getAvailableActions(mockBooking, 'renter');
      expect(actions.some((a) => a.action === 'review')).toBeFalse();
    });

    it('should handle errors from ReviewsService gracefully', async () => {
      mockAuthService.session$.and.returnValue({ user: { id: mockRenterId } });
      mockReviewsService.canReviewBooking.and.rejectWith(new Error('Service error'));

      const completedDate = new Date();
      completedDate.setDate(completedDate.getDate() - 5);

      const mockBooking: Booking = {
        id: mockBookingId,
        status: 'completed',
        owner_id: mockOwnerId,
        renter_id: mockRenterId,
        updated_at: completedDate.toISOString(),
      } as Booking;

      const actions = await service.getAvailableActions(mockBooking, 'renter');
      // Should still include review action even if service errors (fail-safe behavior)
      expect(actions.some((a) => a.action === 'review')).toBeTrue();
    });
  });

  describe('getNextStep', () => {
    it('should return null when no user is logged in', async () => {
      mockAuthService.session$.and.returnValue(null);

      const mockBooking: Booking = {
        id: mockBookingId,
        status: 'pending',
        owner_id: mockOwnerId,
        renter_id: mockRenterId,
      } as Booking;

      const nextStep = await service.getNextStep(mockBooking, 'owner');
      expect(nextStep).toBeNull();
    });

    it('should return pending review step for owner', async () => {
      mockAuthService.session$.and.returnValue({ user: { id: mockOwnerId } });

      const mockBooking: Booking = {
        id: mockBookingId,
        status: 'pending',
        owner_id: mockOwnerId,
        renter_id: mockRenterId,
      } as Booking;

      const nextStep = await service.getNextStep(mockBooking, 'owner');
      expect(nextStep).not.toBeNull();
      expect(nextStep?.title).toBe('Revisar Solicitud');
      expect(nextStep?.priority).toBe('high');
    });

    it('should return check-in step for confirmed booking', async () => {
      mockAuthService.session$.and.returnValue({ user: { id: mockOwnerId } });

      const mockBooking: Booking = {
        id: mockBookingId,
        status: 'confirmed',
        owner_id: mockOwnerId,
        renter_id: mockRenterId,
      } as Booking;

      const nextStep = await service.getNextStep(mockBooking, 'owner');
      expect(nextStep?.title).toBe('Realizar Check-In');
    });

    it('should return review step when booking is completed and user can review', async () => {
      mockAuthService.session$.and.returnValue({ user: { id: mockOwnerId } });
      mockReviewsService.canReviewBooking.and.resolveTo(true);

      const completedDate = new Date();
      completedDate.setDate(completedDate.getDate() - 5);

      const mockBooking: Booking = {
        id: mockBookingId,
        status: 'completed',
        owner_id: mockOwnerId,
        renter_id: mockRenterId,
        updated_at: completedDate.toISOString(),
      } as Booking;

      const nextStep = await service.getNextStep(mockBooking, 'owner');
      expect(nextStep?.title).toBe('Dejar Reseña');
      expect(nextStep?.description).toContain('Califica tu experiencia con el locatario');
    });

    it('should return null when completed but user already reviewed', async () => {
      mockAuthService.session$.and.returnValue({ user: { id: mockOwnerId } });
      mockReviewsService.canReviewBooking.and.resolveTo(false);

      const completedDate = new Date();
      completedDate.setDate(completedDate.getDate() - 5);

      const mockBooking: Booking = {
        id: mockBookingId,
        status: 'completed',
        owner_id: mockOwnerId,
        renter_id: mockRenterId,
        updated_at: completedDate.toISOString(),
      } as Booking;

      const nextStep = await service.getNextStep(mockBooking, 'owner');
      expect(nextStep).toBeNull();
    });

    it('should return payment completion step for renter', async () => {
      mockAuthService.session$.and.returnValue({ user: { id: mockRenterId } });

      const mockBooking: Booking = {
        id: mockBookingId,
        status: 'pending',
        owner_id: mockOwnerId,
        renter_id: mockRenterId,
      } as Booking;

      const nextStep = await service.getNextStep(mockBooking, 'renter');
      expect(nextStep?.title).toBe('Completar Pago');
    });

    it('should return checkout step for renter with in-progress booking', async () => {
      mockAuthService.session$.and.returnValue({ user: { id: mockRenterId } });

      const mockBooking: Booking = {
        id: mockBookingId,
        status: 'in_progress',
        owner_id: mockOwnerId,
        renter_id: mockRenterId,
      } as Booking;

      const nextStep = await service.getNextStep(mockBooking, 'renter');
      expect(nextStep?.title).toBe('Realizar Check-Out');
      expect(nextStep?.priority).toBe('high');
    });

    it('should include correct days remaining in review description', async () => {
      mockAuthService.session$.and.returnValue({ user: { id: mockRenterId } });
      mockReviewsService.canReviewBooking.and.resolveTo(true);

      const completedDate = new Date();
      completedDate.setDate(completedDate.getDate() - 5); // 5 days ago

      const mockBooking: Booking = {
        id: mockBookingId,
        status: 'completed',
        owner_id: mockOwnerId,
        renter_id: mockRenterId,
        updated_at: completedDate.toISOString(),
      } as Booking;

      const actions = await service.getAvailableActions(mockBooking, 'renter');
      const reviewAction = actions.find((a) => a.action === 'review');
      expect(reviewAction?.description).toContain('9'); // 14 - 5 = 9 days remaining
    });
  });

  describe('ReviewsService integration', () => {
    it('should call ReviewsService.canReviewBooking with correct booking ID', async () => {
      mockAuthService.session$.and.returnValue({ user: { id: mockRenterId } });
      mockReviewsService.canReviewBooking.and.resolveTo(true);

      const completedDate = new Date();
      completedDate.setDate(completedDate.getDate() - 5);

      const mockBooking: Booking = {
        id: mockBookingId,
        status: 'completed',
        owner_id: mockOwnerId,
        renter_id: mockRenterId,
        updated_at: completedDate.toISOString(),
      } as Booking;

      await service.getAvailableActions(mockBooking, 'renter');

      expect(mockReviewsService.canReviewBooking).toHaveBeenCalledWith(mockBookingId);
    });

    it('should verify review eligibility using ReviewsService RPC', async () => {
      mockAuthService.session$.and.returnValue({ user: { id: mockOwnerId } });
      mockReviewsService.canReviewBooking.and.resolveTo(false);

      const completedDate = new Date();
      completedDate.setDate(completedDate.getDate() - 8);

      const mockBooking: Booking = {
        id: mockBookingId,
        status: 'completed',
        owner_id: mockOwnerId,
        renter_id: mockRenterId,
        updated_at: completedDate.toISOString(),
      } as Booking;

      const actions = await service.getAvailableActions(mockBooking, 'owner');

      // Service returned false, so no review action should be present
      expect(actions.some((a) => a.action === 'review')).toBeFalse();
      expect(mockReviewsService.canReviewBooking).toHaveBeenCalled();
    });
  });
});
