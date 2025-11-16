import { TestBed } from '@angular/core/testing';
import { ReviewsService, CreateReviewResult } from './reviews.service';
import { SupabaseClientService } from './supabase-client.service';
import { CarOwnerNotificationsService } from './car-owner-notifications.service';
import { CarsService } from './cars.service';
import { ProfileService } from './profile.service';
import { makeSupabaseMock } from '../../../test-helpers/supabase.mock';
import { VALID_UUID } from '../../../test-helpers/factories';
import type { Review, CreateReviewParams, UserStats, CarStats } from '../models';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let supabaseMock: any;
  let rpcHandlers: Record<string, (...args: any[]) => Promise<{ data: unknown; error: unknown }>>;
  let fromHandlers: Record<string, any>;
  let carOwnerNotificationsMock: jasmine.SpyObj<CarOwnerNotificationsService>;
  let carsServiceMock: jasmine.SpyObj<CarsService>;
  let profileServiceMock: jasmine.SpyObj<ProfileService>;

  const mockUserId = VALID_UUID;
  const mockCarId = '11111111-1111-1111-1111-111111111111';
  const mockBookingId = '22222222-2222-2222-2222-222222222222';
  const mockRevieweeId = '33333333-3333-3333-3333-333333333333';
  const mockReviewId = '44444444-4444-4444-4444-444444444444';

  const createMockReview = (overrides?: Partial<Review>): Review => ({
    id: mockReviewId,
    booking_id: mockBookingId,
    reviewer_id: mockUserId,
    reviewee_id: mockRevieweeId,
    car_id: mockCarId,
    review_type: 'renter_to_owner',
    rating_cleanliness: 5,
    rating_communication: 5,
    rating_accuracy: 5,
    rating_location: 5,
    rating_checkin: 5,
    rating_value: 5,
    rating_overall: 5,
    comment_public: 'Great car and owner!',
    comment_private: null,
    status: 'published',
    is_visible: true,
    published_at: new Date().toISOString(),
    is_flagged: false,
    flag_reason: null,
    flagged_by: null,
    flagged_at: null,
    moderation_status: 'approved',
    moderated_by: null,
    moderated_at: null,
    moderation_notes: null,
    created_at: new Date().toISOString(),
    reviewer_name: 'Test User',
    reviewer_avatar: null,
    ...overrides,
  });

  beforeEach(() => {
    rpcHandlers = {};
    fromHandlers = {};

    supabaseMock = makeSupabaseMock();

    // Setup RPC handlers
    supabaseMock.rpc.and.callFake((fn: string, params?: any) => {
      const handler = rpcHandlers[fn];
      if (handler) {
        return handler(params);
      }
      return Promise.resolve({ data: null, error: null });
    });

    // Setup FROM handlers
    supabaseMock.from.and.callFake((table: string) => {
      const handler = fromHandlers[table];
      if (handler) {
        return handler;
      }
      // Default chain
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        }),
      };
    });

    // Mock services
    carOwnerNotificationsMock = jasmine.createSpyObj<CarOwnerNotificationsService>(
      'CarOwnerNotificationsService',
      ['notifyNewReview'],
    );

    carsServiceMock = jasmine.createSpyObj<CarsService>('CarsService', ['getCarById']);
    carsServiceMock.getCarById.and.resolveTo({
      id: mockCarId,
      title: 'Test Car',
      brand: 'Toyota',
      model: 'Camry',
    } as any);

    profileServiceMock = jasmine.createSpyObj<ProfileService>('ProfileService', ['getProfileById']);
    profileServiceMock.getProfileById.and.resolveTo({
      id: mockUserId,
      full_name: 'Test User',
    } as any);

    const supabaseServiceMock = {
      getClient: () => supabaseMock,
    };

    TestBed.configureTestingModule({
      providers: [
        ReviewsService,
        { provide: SupabaseClientService, useValue: supabaseServiceMock },
        { provide: CarOwnerNotificationsService, useValue: carOwnerNotificationsMock },
        { provide: CarsService, useValue: carsServiceMock },
        { provide: ProfileService, useValue: profileServiceMock },
      ],
    });

    service = TestBed.inject(ReviewsService);
  });

  describe('createReview', () => {
    it('should create a review with all 6 category ratings', async () => {
      const params: CreateReviewParams = {
        booking_id: mockBookingId,
        reviewee_id: mockRevieweeId,
        car_id: mockCarId,
        review_type: 'renter_to_owner',
        rating_cleanliness: 5,
        rating_communication: 4,
        rating_accuracy: 5,
        rating_location: 3,
        rating_checkin: 4,
        rating_value: 5,
        comment_public: 'Excellent experience!',
        comment_private: 'Small scratch on door',
      };

      rpcHandlers['create_review_v2'] = () =>
        Promise.resolve({ data: mockReviewId, error: null });

      const result: CreateReviewResult = await service.createReview(params);

      expect(result.success).toBeTrue();
      expect(result.review_id).toBe(mockReviewId);
      expect(supabaseMock.rpc).toHaveBeenCalledWith('create_review_v2', {
        p_booking_id: mockBookingId,
        p_reviewer_id: mockUserId,
        p_reviewee_id: mockRevieweeId,
        p_car_id: mockCarId,
        p_review_type: 'renter_to_owner',
        p_rating_cleanliness: 5,
        p_rating_communication: 4,
        p_rating_accuracy: 5,
        p_rating_location: 3,
        p_rating_checkin: 4,
        p_rating_value: 5,
        p_comment_public: 'Excellent experience!',
        p_comment_private: 'Small scratch on door',
      });
    });

    it('should handle duplicate review prevention', async () => {
      const params: CreateReviewParams = {
        booking_id: mockBookingId,
        reviewee_id: mockRevieweeId,
        car_id: mockCarId,
        review_type: 'renter_to_owner',
        rating_cleanliness: 5,
        rating_communication: 5,
        rating_accuracy: 5,
        rating_location: 5,
        rating_checkin: 5,
        rating_value: 5,
      };

      rpcHandlers['create_review_v2'] = () =>
        Promise.resolve({
          data: null,
          error: { message: 'Ya has dejado una reseña para esta reserva' },
        });

      const result = await service.createReview(params);

      expect(result.success).toBeFalse();
      expect(result.error).toContain('Ya has dejado una reseña');
    });

    it('should validate review window (14 days after checkout)', async () => {
      const params: CreateReviewParams = {
        booking_id: mockBookingId,
        reviewee_id: mockRevieweeId,
        car_id: mockCarId,
        review_type: 'renter_to_owner',
        rating_cleanliness: 5,
        rating_communication: 5,
        rating_accuracy: 5,
        rating_location: 5,
        rating_checkin: 5,
        rating_value: 5,
      };

      rpcHandlers['create_review_v2'] = () =>
        Promise.resolve({
          data: null,
          error: { message: 'El período para dejar reseñas ha expirado' },
        });

      const result = await service.createReview(params);

      expect(result.success).toBeFalse();
      expect(result.error).toContain('período para dejar reseñas ha expirado');
    });

    it('should notify car owner when renter leaves review', async () => {
      const params: CreateReviewParams = {
        booking_id: mockBookingId,
        reviewee_id: mockRevieweeId,
        car_id: mockCarId,
        review_type: 'renter_to_owner',
        rating_cleanliness: 5,
        rating_communication: 5,
        rating_accuracy: 5,
        rating_location: 5,
        rating_checkin: 5,
        rating_value: 5,
      };

      rpcHandlers['create_review_v2'] = () =>
        Promise.resolve({ data: mockReviewId, error: null });

      await service.createReview(params);

      // Wait for async notification
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(carsServiceMock.getCarById).toHaveBeenCalledWith(mockCarId);
      expect(profileServiceMock.getProfileById).toHaveBeenCalledWith(mockUserId);
      expect(carOwnerNotificationsMock.notifyNewReview).toHaveBeenCalledWith(
        'Test User',
        5,
        'Test Car',
        `/cars/${mockCarId}/reviews`,
      );
    });

    it('should not notify when owner reviews renter', async () => {
      const params: CreateReviewParams = {
        booking_id: mockBookingId,
        reviewee_id: mockRevieweeId,
        car_id: mockCarId,
        review_type: 'owner_to_renter',
        rating_cleanliness: 5,
        rating_communication: 5,
        rating_accuracy: 5,
        rating_location: 5,
        rating_checkin: 5,
        rating_value: 5,
      };

      rpcHandlers['create_review_v2'] = () =>
        Promise.resolve({ data: mockReviewId, error: null });

      await service.createReview(params);

      expect(carOwnerNotificationsMock.notifyNewReview).not.toHaveBeenCalled();
    });

    it('should handle authentication errors', async () => {
      supabaseMock.auth.getUser.and.resolveTo({ data: { user: null }, error: null });

      const params: CreateReviewParams = {
        booking_id: mockBookingId,
        reviewee_id: mockRevieweeId,
        car_id: mockCarId,
        review_type: 'renter_to_owner',
        rating_cleanliness: 5,
        rating_communication: 5,
        rating_accuracy: 5,
        rating_location: 5,
        rating_checkin: 5,
        rating_value: 5,
      };

      const result = await service.createReview(params);

      expect(result.success).toBeFalse();
      expect(result.error).toContain('no autenticado');
    });
  });

  describe('flagReview', () => {
    it('should flag a review as inappropriate', async () => {
      rpcHandlers['flag_review'] = (params: any) => {
        expect(params.p_review_id).toBe(mockReviewId);
        expect(params.p_user_id).toBe(mockUserId);
        expect(params.p_reason).toBe('Contenido inapropiado');
        return Promise.resolve({ data: true, error: null });
      };

      const result = await service.flagReview(mockReviewId, 'Contenido inapropiado');

      expect(result).toBeTrue();
      expect(supabaseMock.rpc).toHaveBeenCalledWith('flag_review', {
        p_review_id: mockReviewId,
        p_user_id: mockUserId,
        p_reason: 'Contenido inapropiado',
      });
    });

    it('should handle flag errors gracefully', async () => {
      rpcHandlers['flag_review'] = () =>
        Promise.resolve({ data: null, error: { message: 'Already flagged' } });

      const result = await service.flagReview(mockReviewId, 'Spam');

      expect(result).toBeFalse();
    });
  });

  describe('getPendingReviews', () => {
    it('should get pending reviews for current user', async () => {
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const mockBookings = [
        {
          id: mockBookingId,
          car_title: 'Toyota Camry 2020',
          end_at: new Date().toISOString(),
          status: 'completed',
        },
      ];

      fromHandlers['my_bookings'] = {
        select: () => ({
          eq: () => ({
            gte: () => Promise.resolve({ data: mockBookings, error: null }),
          }),
        }),
      };

      fromHandlers['owner_bookings'] = {
        select: () => ({
          eq: () => ({
            gte: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      };

      fromHandlers['reviews'] = {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        }),
      };

      const result = await service.getPendingReviews();

      expect(result.length).toBe(1);
      expect(result[0].booking_id).toBe(mockBookingId);
      expect(result[0].car_title).toBe('Toyota Camry 2020');
      expect(result[0].days_remaining).toBeGreaterThan(0);
      expect(result[0].days_remaining).toBeLessThanOrEqual(14);
    });

    it('should exclude bookings that already have reviews', async () => {
      const mockBookings = [
        {
          id: mockBookingId,
          car_title: 'Toyota Camry 2020',
          end_at: new Date().toISOString(),
          status: 'completed',
        },
      ];

      fromHandlers['my_bookings'] = {
        select: () => ({
          eq: () => ({
            gte: () => Promise.resolve({ data: mockBookings, error: null }),
          }),
        }),
      };

      fromHandlers['owner_bookings'] = {
        select: () => ({
          eq: () => ({
            gte: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      };

      // Mock existing review
      fromHandlers['reviews'] = {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { id: mockReviewId }, error: null }),
            }),
          }),
        }),
      };

      const result = await service.getPendingReviews();

      expect(result.length).toBe(0);
    });

    it('should exclude bookings older than 14 days', async () => {
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

      const mockBookings = [
        {
          id: mockBookingId,
          car_title: 'Toyota Camry 2020',
          end_at: fifteenDaysAgo.toISOString(),
          status: 'completed',
        },
      ];

      fromHandlers['my_bookings'] = {
        select: () => ({
          eq: () => ({
            gte: () => Promise.resolve({ data: mockBookings, error: null }),
          }),
        }),
      };

      fromHandlers['owner_bookings'] = {
        select: () => ({
          eq: () => ({
            gte: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      };

      fromHandlers['reviews'] = {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        }),
      };

      const result = await service.getPendingReviews();

      expect(result.length).toBe(0);
    });
  });

  describe('loadReviewsForCar', () => {
    it('should load reviews and update signals', async () => {
      const mockReviews = [
        createMockReview({ id: '1', rating_cleanliness: 5 }),
        createMockReview({ id: '2', rating_cleanliness: 4 }),
      ];

      fromHandlers['reviews'] = {
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                order: () => Promise.resolve({ data: mockReviews, error: null }),
              }),
            }),
          }),
        }),
      };

      await service.loadReviewsForCar(mockCarId);

      expect(service.reviews().length).toBe(2);
      expect(service.reviewsCount()).toBe(2);
      expect(service.loading()).toBeFalse();
      expect(service.error()).toBeNull();
      expect(service.hasReviews()).toBeTrue();
    });

    it('should calculate average rating correctly', async () => {
      const mockReviews = [
        createMockReview({
          rating_cleanliness: 5,
          rating_communication: 4,
          rating_accuracy: 5,
          rating_location: 3,
          rating_checkin: 4,
          rating_value: 5,
        }),
        createMockReview({
          rating_cleanliness: 3,
          rating_communication: 3,
          rating_accuracy: 4,
          rating_location: 4,
          rating_checkin: 3,
          rating_value: 4,
        }),
      ];

      fromHandlers['reviews'] = {
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                order: () => Promise.resolve({ data: mockReviews, error: null }),
              }),
            }),
          }),
        }),
      };

      await service.loadReviewsForCar(mockCarId);

      // First review avg: (5+4+5+3+4+5)/6 = 4.33
      // Second review avg: (3+3+4+4+3+4)/6 = 3.5
      // Overall avg: (4.33 + 3.5)/2 = 3.92 -> 3.9
      expect(service.averageRating()).toBeCloseTo(3.9, 1);
    });

    it('should handle loading errors', async () => {
      fromHandlers['reviews'] = {
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                order: () =>
                  Promise.resolve({ data: null, error: { message: 'Database error' } }),
              }),
            }),
          }),
        }),
      };

      await service.loadReviewsForCar(mockCarId);

      expect(service.reviews().length).toBe(0);
      expect(service.error()).toContain('Database error');
      expect(service.loading()).toBeFalse();
    });
  });

  describe('loadUserStats', () => {
    it('should load user statistics', async () => {
      const mockStats: UserStats = {
        user_id: mockUserId,
        owner_reviews_count: 10,
        owner_rating_avg: 4.8,
        owner_rating_cleanliness_avg: 4.9,
        owner_rating_communication_avg: 4.7,
        owner_rating_accuracy_avg: 4.8,
        owner_rating_location_avg: 4.6,
        owner_rating_checkin_avg: 4.8,
        owner_rating_value_avg: 4.7,
        renter_reviews_count: 5,
        renter_rating_avg: 4.5,
        renter_rating_cleanliness_avg: 4.6,
        renter_rating_communication_avg: 4.4,
        renter_rating_accuracy_avg: 4.5,
        renter_rating_checkin_avg: 4.5,
        total_bookings_as_owner: 15,
        total_bookings_as_renter: 8,
        cancellation_count: 1,
        cancellation_rate: 0.04,
        is_top_host: true,
        is_super_host: false,
        is_verified_renter: true,
        badges: [],
        updated_at: new Date().toISOString(),
      };

      fromHandlers['user_stats'] = {
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: mockStats, error: null }),
          }),
        }),
      };

      await service.loadUserStats(mockUserId);

      expect(service.userStats()).toEqual(mockStats);
      expect(service.loading()).toBeFalse();
    });
  });

  describe('loadCarStats', () => {
    it('should load car statistics', async () => {
      const mockStats: CarStats = {
        car_id: mockCarId,
        reviews_count: 20,
        rating_avg: 4.7,
        rating_cleanliness_avg: 4.8,
        rating_communication_avg: 4.6,
        rating_accuracy_avg: 4.7,
        rating_location_avg: 4.5,
        rating_checkin_avg: 4.8,
        rating_value_avg: 4.6,
        total_bookings: 25,
        completed_bookings: 23,
        cancelled_bookings: 2,
        cancellation_rate: 0.08,
        last_review_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      fromHandlers['car_stats'] = {
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: mockStats, error: null }),
          }),
        }),
      };

      await service.loadCarStats(mockCarId);

      expect(service.carStats()).toEqual(mockStats);
      expect(service.loading()).toBeFalse();
    });
  });

  describe('canReviewBooking', () => {
    it('should return true when user can review', async () => {
      rpcHandlers['user_can_review'] = () => Promise.resolve({ data: true, error: null });

      const result = await service.canReviewBooking(mockBookingId);

      expect(result).toBeTrue();
      expect(supabaseMock.rpc).toHaveBeenCalledWith('user_can_review', {
        _booking: mockBookingId,
      });
    });

    it('should return false when user cannot review', async () => {
      rpcHandlers['user_can_review'] = () => Promise.resolve({ data: false, error: null });

      const result = await service.canReviewBooking(mockBookingId);

      expect(result).toBeFalse();
    });

    it('should return false on error', async () => {
      rpcHandlers['user_can_review'] = () =>
        Promise.resolve({ data: null, error: { message: 'Error' } });

      const result = await service.canReviewBooking(mockBookingId);

      expect(result).toBeFalse();
    });
  });

  describe('getReviewSummary', () => {
    it('should calculate review summary correctly', async () => {
      const mockReviews = [
        createMockReview({
          rating_cleanliness: 5,
          rating_communication: 5,
          rating_accuracy: 5,
          rating_location: 5,
          rating_checkin: 5,
          rating_value: 5,
        }),
        createMockReview({
          rating_cleanliness: 4,
          rating_communication: 4,
          rating_accuracy: 4,
          rating_location: 4,
          rating_checkin: 4,
          rating_value: 4,
        }),
        createMockReview({
          rating_cleanliness: 3,
          rating_communication: 3,
          rating_accuracy: 3,
          rating_location: 3,
          rating_checkin: 3,
          rating_value: 3,
        }),
      ];

      fromHandlers['reviews'] = {
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ data: mockReviews, error: null }),
            }),
          }),
        }),
      };

      const summary = await service.getReviewSummary(mockUserId, true);

      expect(summary.total_count).toBe(3);
      expect(summary.average_rating).toBeCloseTo(4.0, 1);
      expect(summary.rating_distribution[5]).toBe(1);
      expect(summary.rating_distribution[4]).toBe(1);
      expect(summary.rating_distribution[3]).toBe(1);
      expect(summary.category_averages.cleanliness).toBeCloseTo(4.0, 1);
      expect(summary.category_averages.communication).toBeCloseTo(4.0, 1);
    });

    it('should return empty summary when no reviews', async () => {
      fromHandlers['reviews'] = {
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        }),
      };

      const summary = await service.getReviewSummary(mockUserId, true);

      expect(summary.total_count).toBe(0);
      expect(summary.average_rating).toBe(0);
      expect(summary.rating_distribution[5]).toBe(0);
    });
  });
});
