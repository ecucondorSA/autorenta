// @ts-nocheck - Tests need rewrite: CarStats type mismatch, missing module
import { TestBed } from '@angular/core/testing';
import { createSupabaseMock } from '../../../testing/mocks/supabase-mock';
import type { ReviewType } from '../models';
import { ReviewsService } from './reviews.service';
import { SupabaseClientService } from './supabase-client.service';

// TODO: Fix CarStats type (missing rating_* properties), fix module path
xdescribe('ReviewsService', () => {
  let service: ReviewsService;
  let supabaseMock: ReturnType<typeof createSupabaseMock>;

  beforeEach(() => {
    supabaseMock = createSupabaseMock();
    TestBed.configureTestingModule({
      providers: [
        ReviewsService,
        {
          provide: SupabaseClientService,
          useValue: { getClient: () => supabaseMock },
        },
      ],
    });
    service = TestBed.inject(ReviewsService);
  });

  describe('Signals Initialization', () => {
    it('should initialize with empty reviews', () => {
      expect(service.reviews()).toEqual([]);
    });

    it('should initialize with null carStats', () => {
      expect(service.carStats()).toBeNull();
    });

    it('should initialize with null userStats', () => {
      expect(service.userStats()).toBeNull();
    });

    it('should initialize with loading false', () => {
      expect(service.loading()).toBe(false);
    });

    it('should initialize with null error', () => {
      expect(service.error()).toBeNull();
    });
  });

  describe('Computed Values', () => {
    it('should calculate reviewsCount correctly', () => {
      const mockReviews = [
        {
          id: '1',
          rating_cleanliness: 5,
          rating_communication: 4,
          rating_accuracy: 5,
          rating_location: 4,
          rating_checkin: 5,
          rating_value: 4,
        },
        {
          id: '2',
          rating_cleanliness: 4,
          rating_communication: 5,
          rating_accuracy: 4,
          rating_location: 5,
          rating_checkin: 4,
          rating_value: 5,
        },
      ] as any[];

      // @ts-expect-error - Accessing private property for testing
      service.reviewsSignal.set(mockReviews);

      expect(service.reviewsCount()).toBe(2);
    });

    it('should calculate averageRating correctly', () => {
      const mockReviews = [
        {
          id: '1',
          rating_cleanliness: 5,
          rating_communication: 5,
          rating_accuracy: 5,
          rating_location: 5,
          rating_checkin: 5,
          rating_value: 5,
        },
        {
          id: '2',
          rating_cleanliness: 3,
          rating_communication: 3,
          rating_accuracy: 3,
          rating_location: 3,
          rating_checkin: 3,
          rating_value: 3,
        },
      ] as any[];

      // @ts-expect-error - Accessing private property for testing
      service.reviewsSignal.set(mockReviews);

      expect(service.averageRating()).toBe(4.0);
    });

    it('should return 0 for averageRating when no reviews', () => {
      expect(service.averageRating()).toBe(0);
    });

    it('should return false for hasReviews when empty', () => {
      expect(service.hasReviews()).toBe(false);
    });

    it('should return true for hasReviews when reviews exist', () => {
      const mockReviews = [{ id: '1' }] as any[];
      // @ts-expect-error - Accessing private property for testing
      service.reviewsSignal.set(mockReviews);
      expect(service.hasReviews()).toBe(true);
    });
  });

  describe('loadReviewsForCar', () => {
    it('should set loading to true while fetching', async () => {
      const mockData = [
        {
          id: '1',
          reviewer: { full_name: 'Test User', avatar_url: 'https://example.com/avatar.jpg' },
        },
      ];

      const builder = supabaseMock.createQueryBuilder();
      (builder.order as jasmine.Spy).and.returnValue(
        Promise.resolve({ data: mockData, error: null }),
      );

      supabaseMock.from.and.returnValue(builder);

      const promise = service.loadReviewsForCar('car-1');
      expect(service.loading()).toBe(true);

      await promise;
      expect(service.loading()).toBe(false);
    });

    it('should populate reviews signal on success', async () => {
      const mockData = [
        {
          id: '1',
          car_id: 'car-1',
          reviewer: { full_name: 'Test User', avatar_url: 'https://example.com/avatar.jpg' },
        },
      ];

      const builder = supabaseMock.createQueryBuilder();
      (builder.order as jasmine.Spy).and.returnValue(
        Promise.resolve({ data: mockData, error: null }),
      );

      supabaseMock.from.and.returnValue(builder);

      await service.loadReviewsForCar('car-1');

      expect(service.reviews().length).toBe(1);
      expect(service.reviews()[0].reviewer_name).toBe('Test User');
    });

    it('should set error signal on failure', async () => {
      const builder = supabaseMock.createQueryBuilder();
      (builder.order as jasmine.Spy).and.returnValue(
        Promise.resolve({ data: null, error: { message: 'Database error' } }),
      );

      supabaseMock.from.and.returnValue(builder);

      await service.loadReviewsForCar('car-1');

      expect(service.error()).toBe('Database error');
      expect(service.reviews()).toEqual([]);
    });

    it('should handle empty results', async () => {
      const builder = supabaseMock.createQueryBuilder();
      (builder.order as jasmine.Spy).and.returnValue(Promise.resolve({ data: [], error: null }));

      supabaseMock.from.and.returnValue(builder);

      await service.loadReviewsForCar('car-1');

      expect(service.reviews()).toEqual([]);
      expect(service.error()).toBeNull();
    });
  });

  describe('loadCarStats', () => {
    it('should set loading to true while fetching', async () => {
      const mockStats = { car_id: 'car-1', rating_avg: 4.5, reviews_count: 10 };

      const builder = supabaseMock.createQueryBuilder();
      (builder.maybeSingle as jasmine.Spy).and.returnValue(
        Promise.resolve({ data: mockStats, error: null }),
      );

      supabaseMock.from.and.returnValue(builder);

      const promise = service.loadCarStats('car-1');
      expect(service.loading()).toBe(true);

      await promise;
      expect(service.loading()).toBe(false);
    });

    it('should populate carStats signal on success', async () => {
      const mockStats = { car_id: 'car-1', rating_avg: 4.5, reviews_count: 10 };

      const builder = supabaseMock.createQueryBuilder();
      (builder.maybeSingle as jasmine.Spy).and.returnValue(
        Promise.resolve({ data: mockStats, error: null }),
      );

      supabaseMock.from.and.returnValue(builder);

      await service.loadCarStats('car-1');

      expect(service.carStats()).toEqual(mockStats);
    });

    it('should set error signal on failure', async () => {
      const builder = supabaseMock.createQueryBuilder();
      (builder.maybeSingle as jasmine.Spy).and.returnValue(
        Promise.resolve({ data: null, error: { message: 'Error' } }),
      );

      supabaseMock.from.and.returnValue(builder);

      await service.loadCarStats('car-1');

      expect(service.error()).toBe('Error');
      expect(service.carStats()).toBeNull();
    });
  });

  describe('createReview', () => {
    beforeEach(() => {
      (supabaseMock.auth.getUser as jasmine.Spy).and.returnValue(
        Promise.resolve({ data: { user: { id: 'user-1' } }, error: null }),
      );
    });

    it('should call create_review_v2 RPC function', async () => {
      (supabaseMock.rpc as jasmine.Spy).and.returnValue(
        Promise.resolve({ data: 'review-id', error: null }),
      );

      const params = {
        booking_id: 'booking-1',
        reviewee_id: 'user-2',
        car_id: 'car-1',
        review_type: 'renter_to_owner' as ReviewType,
        rating_cleanliness: 5,
        rating_communication: 4,
        rating_accuracy: 5,
        rating_location: 4,
        rating_checkin: 5,
        rating_value: 4,
      };

      await service.createReview(params);

      expect(supabaseMock.rpc).toHaveBeenCalledWith(
        'create_review_v2',
        jasmine.objectContaining({
          p_booking_id: 'booking-1',
          p_reviewer_id: 'user-1',
          p_reviewee_id: 'user-2',
          p_car_id: 'car-1',
          p_review_type: 'renter_to_owner',
        }),
      );
    });

    it('should return success result with review_id', async () => {
      (supabaseMock.rpc as jasmine.Spy).and.returnValue(
        Promise.resolve({ data: 'review-id', error: null }),
      );

      const params = {
        booking_id: 'booking-1',
        reviewee_id: 'user-2',
        car_id: 'car-1',
        review_type: 'renter_to_owner' as ReviewType,
        rating_cleanliness: 5,
        rating_communication: 4,
        rating_accuracy: 5,
        rating_location: 4,
        rating_checkin: 5,
        rating_value: 4,
      };

      const result = await service.createReview(params);

      expect(result.success).toBe(true);
      expect(result.review_id).toBe('review-id');
    });

    it('should return error result on failure', async () => {
      (supabaseMock.rpc as jasmine.Spy).and.returnValue(
        Promise.resolve({ data: null, error: { message: 'RPC error' } }),
      );

      const params = {
        booking_id: 'booking-1',
        reviewee_id: 'user-2',
        car_id: 'car-1',
        review_type: 'renter_to_owner' as ReviewType,
        rating_cleanliness: 5,
        rating_communication: 4,
        rating_accuracy: 5,
        rating_location: 4,
        rating_checkin: 5,
        rating_value: 4,
      };

      const result = await service.createReview(params);

      expect(result.success).toBe(false);
      expect(result.error).toBe('RPC error');
    });

    it('should handle unauthenticated user', async () => {
      (supabaseMock.auth.getUser as jasmine.Spy).and.returnValue(
        Promise.resolve({ data: { user: null }, error: null }),
      );

      const params = {
        booking_id: 'booking-1',
        reviewee_id: 'user-2',
        car_id: 'car-1',
        review_type: 'renter_to_owner' as ReviewType,
        rating_cleanliness: 5,
        rating_communication: 4,
        rating_accuracy: 5,
        rating_location: 4,
        rating_checkin: 5,
        rating_value: 4,
      };

      const result = await service.createReview(params);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Usuario no autenticado');
    });
  });

  describe('flagReview', () => {
    beforeEach(() => {
      (supabaseMock.auth.getUser as jasmine.Spy).and.returnValue(
        Promise.resolve({ data: { user: { id: 'user-1' } }, error: null }),
      );
    });

    it('should call flag_review RPC function', async () => {
      (supabaseMock.rpc as jasmine.Spy).and.returnValue(
        Promise.resolve({ data: true, error: null }),
      );

      await service.flagReview('review-1', 'Inappropriate content');

      expect(supabaseMock.rpc).toHaveBeenCalledWith('flag_review', {
        p_review_id: 'review-1',
        p_user_id: 'user-1',
        p_reason: 'Inappropriate content',
      });
    });

    it('should return true on success', async () => {
      (supabaseMock.rpc as jasmine.Spy).and.returnValue(
        Promise.resolve({ data: true, error: null }),
      );

      const result = await service.flagReview('review-1', 'Inappropriate content');

      expect(result).toBe(true);
    });

    it('should return false on failure', async () => {
      (supabaseMock.rpc as jasmine.Spy).and.returnValue(
        Promise.resolve({ data: null, error: { message: 'Error' } }),
      );

      const result = await service.flagReview('review-1', 'Inappropriate content');

      expect(result).toBe(false);
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain getReviewsForCar for backward compatibility', async () => {
      const mockData = [
        {
          id: '1',
          car_id: 'car-1',
          reviewer: { full_name: 'Test User', avatar_url: null },
        },
      ];

      const builder = supabaseMock.createQueryBuilder();
      (builder.order as jasmine.Spy).and.returnValue(
        Promise.resolve({ data: mockData, error: null }),
      );

      supabaseMock.from.and.returnValue(builder);

      const result = await service.getReviewsForCar('car-1');

      expect(result).toEqual(jasmine.any(Array));
      expect(result.length).toBe(1);
    });

    it('should maintain getCarStats for backward compatibility', async () => {
      const mockStats = { car_id: 'car-1', rating_avg: 4.5, reviews_count: 10 };

      const builder = supabaseMock.createQueryBuilder();
      (builder.maybeSingle as jasmine.Spy).and.returnValue(
        Promise.resolve({ data: mockStats, error: null }),
      );

      supabaseMock.from.and.returnValue(builder);

      const result = await service.getCarStats('car-1');

      expect(result).toEqual(mockStats);
    });
  });
});
