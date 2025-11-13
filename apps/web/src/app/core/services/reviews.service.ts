import { Injectable, signal, computed, inject } from '@angular/core';
import type {
  Review,
  CreateReviewParams,
  UserStats,
  CarStats,
  ReviewSummary,
  ReviewType,
} from '../models';
import { injectSupabase } from './supabase-client.service';
import { CarOwnerNotificationsService } from './car-owner-notifications.service';
import { CarsService } from './cars.service';
import { ProfileService } from './profile.service';

export interface CreateReviewResult {
  success: boolean;
  review_id?: string;
  error?: string;
  published_immediately?: boolean;
}

/** Raw review data from database with reviewer join */
interface ReviewWithReviewer {
  reviewer?: {
    full_name?: string | null;
    avatar_url?: string | null;
  } | null;
  [key: string]: unknown;
}

@Injectable({
  providedIn: 'root',
})
export class ReviewsService {
  private readonly supabase = injectSupabase();
  private readonly carOwnerNotifications = inject(CarOwnerNotificationsService);
  private readonly carsService = inject(CarsService);
  private readonly profileService = inject(ProfileService);

  // Signals privados para estado reactivo
  private readonly reviewsSignal = signal<Review[]>([]);
  private readonly carStatsSignal = signal<CarStats | null>(null);
  private readonly userStatsSignal = signal<UserStats | null>(null);
  private readonly loadingSignal = signal<boolean>(false);
  private readonly errorSignal = signal<string | null>(null);

  // Exponer signals como readonly
  readonly reviews = this.reviewsSignal.asReadonly();
  readonly carStats = this.carStatsSignal.asReadonly();
  readonly userStats = this.userStatsSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  // Computed values
  readonly reviewsCount = computed(() => this.reviews().length);
  readonly averageRating = computed(() => {
    const reviews = this.reviews();
    if (reviews.length === 0) return 0;
    const total = reviews.reduce((sum, r) => {
      const avg =
        (r.rating_cleanliness +
          r.rating_communication +
          r.rating_accuracy +
          r.rating_location +
          r.rating_checkin +
          r.rating_value) /
        6;
      return sum + avg;
    }, 0);
    return Number((total / reviews.length).toFixed(1));
  });
  readonly hasReviews = computed(() => this.reviews().length > 0);

  /**
   * Create a new review using the v2 system with category ratings
   */
  async createReview(params: CreateReviewParams): Promise<CreateReviewResult> {
    try {
      const {
        data: { user },
        error: authError,
      } = await this.supabase.auth.getUser();

      if (authError) throw authError;
      if (!user?.id) throw new Error('Usuario no autenticado');

      // Call the create_review_v2 function
      const { data, error } = await this.supabase.rpc('create_review_v2', {
        p_booking_id: params.booking_id,
        p_reviewer_id: user.id,
        p_reviewee_id: params.reviewee_id,
        p_car_id: params.car_id,
        p_review_type: params.review_type,
        p_rating_cleanliness: params.rating_cleanliness,
        p_rating_communication: params.rating_communication,
        p_rating_accuracy: params.rating_accuracy,
        p_rating_location: params.rating_location,
        p_rating_checkin: params.rating_checkin,
        p_rating_value: params.rating_value,
        p_comment_public: params.comment_public ?? null,
        p_comment_private: params.comment_private ?? null,
      });

      if (error) throw error;

      const reviewId = data as string;

      // ✅ NUEVO: Notificar al dueño del auto sobre la nueva reseña (si es renter_to_owner)
      if (params.review_type === 'renter_to_owner') {
        this.notifyOwnerOfNewReview(reviewId, params).catch((error) => {
          // Silently fail - notification is optional enhancement
          console.debug('Could not notify owner of new review', error);
        });
      }

      return {
        success: true,
        review_id: reviewId,
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  /**
   * Get reviews for a specific user (as owner or renter)
   */
  async getReviewsForUser(userId: string, asOwner: boolean = true): Promise<Review[]> {
    try {
      const reviewType: ReviewType = asOwner ? 'renter_to_owner' : 'owner_to_renter';

      const { data, error } = await this.supabase
        .from('reviews')
        .select(
          `
          *,
          reviewer:profiles!reviews_reviewer_id_fkey(id, full_name, avatar_url),
          car:cars(id, title)
        `,
        )
        .eq('reviewee_id', userId)
        .eq('review_type', reviewType)
        .eq('is_visible', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((review) => ({
        ...review,
        reviewer_name: review.reviewer?.full_name,
        reviewer_avatar: review.reviewer?.avatar_url,
        car_title: review.car?.title,
      })) as Review[];
    } catch {
      return [];
    }
  }

  /**
   * Load reviews for a specific car (updates signals)
   */
  async loadReviewsForCar(carId: string): Promise<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const { data, error } = await this.supabase
        .from('reviews')
        .select(
          `
          *,
          reviewer:profiles!reviews_reviewer_id_fkey(id, full_name, avatar_url)
        `,
        )
        .eq('car_id', carId)
        .eq('is_visible', true)
        .eq('review_type', 'renter_to_owner')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const reviews = (data || []).map((review) => ({
        ...review,
        reviewer_name: review.reviewer?.full_name,
        reviewer_avatar: review.reviewer?.avatar_url,
      })) as Review[];

      this.reviewsSignal.set(reviews);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar reviews';
      this.errorSignal.set(errorMessage);
      this.reviewsSignal.set([]);
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Get reviews for a specific car (backward compatibility - returns Promise)
   * @deprecated Use loadReviewsForCar() and subscribe to reviews signal instead
   */
  async getReviewsForCar(carId: string): Promise<Review[]> {
    await this.loadReviewsForCar(carId);
    return this.reviews();
  }

  /**
   * Load user statistics (updates signals)
   */
  async loadUserStats(userId: string): Promise<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const { data, error } = await this.supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      this.userStatsSignal.set(data as UserStats | null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar estadísticas';
      this.errorSignal.set(errorMessage);
      this.userStatsSignal.set(null);
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Get user statistics (backward compatibility - returns Promise)
   * @deprecated Use loadUserStats() and subscribe to userStats signal instead
   */
  async getUserStats(userId: string): Promise<UserStats | null> {
    await this.loadUserStats(userId);
    return this.userStats();
  }

  /**
   * Load car statistics (updates signals)
   */
  async loadCarStats(carId: string): Promise<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const { data, error } = await this.supabase
        .from('car_stats')
        .select('*')
        .eq('car_id', carId)
        .maybeSingle();

      if (error) throw error;
      this.carStatsSignal.set(data as CarStats | null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar estadísticas';
      this.errorSignal.set(errorMessage);
      this.carStatsSignal.set(null);
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Get car statistics (backward compatibility - returns Promise)
   * @deprecated Use loadCarStats() and subscribe to carStats signal instead
   */
  async getCarStats(carId: string): Promise<CarStats | null> {
    await this.loadCarStats(carId);
    return this.carStats();
  }

  /**
   * Check if current user can review a specific booking
   */
  async canReviewBooking(bookingId: string): Promise<boolean> {
    try {
      const {
        data: { user },
        error: authError,
      } = await this.supabase.auth.getUser();

      if (authError || !user?.id) return false;

      const { data, error } = await this.supabase.rpc('user_can_review', {
        _booking: bookingId,
      });

      if (error) throw error;
      return data as boolean;
    } catch {
      return false;
    }
  }

  /**
   * Flag a review as inappropriate
   */
  async flagReview(reviewId: string, reason: string): Promise<boolean> {
    try {
      const {
        data: { user },
        error: authError,
      } = await this.supabase.auth.getUser();

      if (authError) throw authError;
      if (!user?.id) throw new Error('Usuario no autenticado');

      const { data, error } = await this.supabase.rpc('flag_review', {
        p_review_id: reviewId,
        p_user_id: user.id,
        p_reason: reason,
      });

      if (error) throw error;
      return data as boolean;
    } catch {
      return false;
    }
  }

  /**
   * Get review summary for a user (aggregated stats)
   */
  async getReviewSummary(userId: string, asOwner: boolean = true): Promise<ReviewSummary> {
    try {
      const reviewType: ReviewType = asOwner ? 'renter_to_owner' : 'owner_to_renter';

      const { data: reviews, error } = await this.supabase
        .from('reviews')
        .select('*')
        .eq('reviewee_id', userId)
        .eq('review_type', reviewType)
        .eq('is_visible', true);

      if (error) throw error;

      const reviewList = reviews || [];
      const totalCount = reviewList.length;

      if (totalCount === 0) {
        return {
          total_count: 0,
          average_rating: 0,
          rating_distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
          category_averages: {
            cleanliness: 0,
            communication: 0,
            accuracy: 0,
            location: 0,
            checkin: 0,
            value: 0,
          },
        };
      }

      // Calculate overall average
      const totalRating = reviewList.reduce((sum, r) => {
        const avg =
          (r.rating_cleanliness +
            r.rating_communication +
            r.rating_accuracy +
            r.rating_location +
            r.rating_checkin +
            r.rating_value) /
          6;
        return sum + avg;
      }, 0);

      // Calculate distribution
      const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      reviewList.forEach((r) => {
        const avg = Math.round(
          (r.rating_cleanliness +
            r.rating_communication +
            r.rating_accuracy +
            r.rating_location +
            r.rating_checkin +
            r.rating_value) /
            6,
        );
        distribution[avg as keyof typeof distribution]++;
      });

      // Calculate category averages
      const categoryAverages = {
        cleanliness: reviewList.reduce((sum, r) => sum + r.rating_cleanliness, 0) / totalCount,
        communication: reviewList.reduce((sum, r) => sum + r.rating_communication, 0) / totalCount,
        accuracy: reviewList.reduce((sum, r) => sum + r.rating_accuracy, 0) / totalCount,
        location: reviewList.reduce((sum, r) => sum + r.rating_location, 0) / totalCount,
        checkin: reviewList.reduce((sum, r) => sum + r.rating_checkin, 0) / totalCount,
        value: reviewList.reduce((sum, r) => sum + r.rating_value, 0) / totalCount,
      };

      return {
        total_count: totalCount,
        average_rating: totalRating / totalCount,
        rating_distribution: distribution,
        category_averages: categoryAverages,
      };
    } catch {
      return {
        total_count: 0,
        average_rating: 0,
        rating_distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        category_averages: {
          cleanliness: 0,
          communication: 0,
          accuracy: 0,
          location: 0,
          checkin: 0,
          value: 0,
        },
      };
    }
  }

  /**
   * Get pending reviews for current user (reviews they need to write)
   */
  async getPendingReviews(): Promise<
    Array<{
      booking_id: string;
      car_title: string;
      reviewee_name: string;
      checkout_date: string;
      days_remaining: number;
    }>
  > {
    try {
      const {
        data: { user },
        error: authError,
      } = await this.supabase.auth.getUser();

      if (authError || !user?.id) return [];

      // Get completed bookings without reviews in last 14 days
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      // As renter
      const { data: renterBookings, error: renterError } = await this.supabase
        .from('my_bookings')
        .select('id, car_title, end_at, status')
        .eq('status', 'completed')
        .gte('end_at', fourteenDaysAgo.toISOString());

      if (renterError) throw renterError;

      // As owner
      const { data: ownerBookings, error: ownerError } = await this.supabase
        .from('owner_bookings')
        .select('id, car_title, renter_name, end_at, status')
        .eq('status', 'completed')
        .gte('end_at', fourteenDaysAgo.toISOString());

      if (ownerError) throw ownerError;

      // Filter out bookings that already have reviews
      const allBookings = [...(renterBookings || []), ...(ownerBookings || [])];
      const pendingReviews = [];

      for (const booking of allBookings) {
        const { data: existingReview } = await this.supabase
          .from('reviews')
          .select('id')
          .eq('booking_id', booking.id)
          .eq('reviewer_id', user.id)
          .maybeSingle();

        if (!existingReview) {
          const checkoutDate = new Date(booking.end_at);
          const now = new Date();
          const daysElapsed = Math.floor(
            (now.getTime() - checkoutDate.getTime()) / (1000 * 60 * 60 * 24),
          );
          const daysRemaining = 14 - daysElapsed;

          if (daysRemaining > 0) {
            pendingReviews.push({
              booking_id: booking.id,
              car_title: booking.car_title || 'Vehículo',
              reviewee_name: (booking as { renter_name?: string }).renter_name || 'Usuario',
              checkout_date: booking.end_at,
              days_remaining: daysRemaining,
            });
          }
        }
      }

      return pendingReviews;
    } catch {
      return [];
    }
  }

  /**
   * Obtiene las reviews recibidas por un usuario como owner (para perfil público)
   */
  async getReviewsForOwner(ownerId: string): Promise<Review[]> {
    const { data, error } = await this.supabase
      .from('reviews')
      .select(
        `
        *,
        reviewer:profiles!reviews_reviewer_id_fkey(full_name, avatar_url)
      `,
      )
      .eq('reviewee_id', ownerId)
      .eq('reviewee_role', 'owner')
      .order('created_at', { ascending: false });

    if (error) {
      return [];
    }

    return (data || []).map((review: ReviewWithReviewer) => ({
      ...review,
      reviewer_name: review.reviewer?.full_name || 'Usuario',
      reviewer_avatar: review.reviewer?.avatar_url || null,
    })) as Review[];
  }

  /**
   * Obtiene las reviews recibidas por un usuario como renter (para perfil público)
   */
  async getReviewsForRenter(renterId: string): Promise<Review[]> {
    const { data, error } = await this.supabase
      .from('reviews')
      .select(
        `
        *,
        reviewer:profiles!reviews_reviewer_id_fkey(full_name, avatar_url)
      `,
      )
      .eq('reviewee_id', renterId)
      .eq('reviewee_role', 'renter')
      .order('created_at', { ascending: false });

    if (error) {
      return [];
    }

    return (data || []).map((review: ReviewWithReviewer) => ({
      ...review,
      reviewer_name: review.reviewer?.full_name || 'Usuario',
      reviewer_avatar: review.reviewer?.avatar_url || null,
    })) as Review[];
  }

  // ============================================
  // ADMIN MODERATION METHODS
  // ============================================

  /**
   * Get all flagged reviews for admin moderation
   * Requires admin role
   */
  async getFlaggedReviews(status?: 'pending' | 'approved' | 'rejected'): Promise<Review[]> {
    try {
      const {
        data: { user },
        error: authError,
      } = await this.supabase.auth.getUser();

      if (authError || !user?.id) throw new Error('Usuario no autenticado');

      const { data, error } = await this.supabase.rpc('get_flagged_reviews', {
        p_admin_id: user.id,
        p_status: status || null,
      });

      if (error) throw error;

      return (data || []) as Review[];
    } catch (error) {
      console.error('Error fetching flagged reviews:', error);
      return [];
    }
  }

  /**
   * Moderate a review (approve or reject)
   * Requires admin role
   */
  async moderateReview(
    reviewId: string,
    action: 'approved' | 'rejected',
    notes?: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const {
        data: { user },
        error: authError,
      } = await this.supabase.auth.getUser();

      if (authError || !user?.id) throw new Error('Usuario no autenticado');

      const { data, error } = await this.supabase.rpc('moderate_review', {
        p_review_id: reviewId,
        p_admin_id: user.id,
        p_action: action,
        p_notes: notes || null,
      });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error moderating review:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al moderar la review',
      };
    }
  }

  /**
   * Bulk moderate multiple reviews at once
   * Requires admin role
   */
  async bulkModerateReviews(
    reviewIds: string[],
    action: 'approved' | 'rejected',
    notes?: string,
  ): Promise<{ success: boolean; updatedCount?: number; error?: string }> {
    try {
      const {
        data: { user },
        error: authError,
      } = await this.supabase.auth.getUser();

      if (authError || !user?.id) throw new Error('Usuario no autenticado');

      const { data, error } = await this.supabase.rpc('bulk_moderate_reviews', {
        p_review_ids: reviewIds,
        p_admin_id: user.id,
        p_action: action,
        p_notes: notes || null,
      });

      if (error) throw error;

      return {
        success: true,
        updatedCount: data?.updated_count || 0,
      };
    } catch (error) {
      console.error('Error bulk moderating reviews:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al moderar las reviews',
      };
    }
  }

  /**
   * Notifica al dueño del auto sobre una nueva reseña
   */
  private async notifyOwnerOfNewReview(
    reviewId: string,
    params: CreateReviewParams
  ): Promise<void> {
    try {
      if (!params.car_id || !params.reviewee_id) return;

      // Obtener el ID del reseñador desde el usuario autenticado
      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      if (!user?.id) return;

      // Obtener información del auto y del reseñador en paralelo
      const [car, reviewer] = await Promise.all([
        this.carsService.getCarById(params.car_id),
        this.profileService.getProfileById(user.id),
      ]);

      if (car && reviewer) {
        const carName = car.title || `${car.brand || ''} ${car.model || ''}`.trim() || 'tu auto';
        const reviewerName = reviewer.full_name || 'Un usuario';
        
        // Calcular rating promedio de las 6 categorías
        const ratings = [
          params.rating_cleanliness,
          params.rating_communication,
          params.rating_accuracy,
          params.rating_location,
          params.rating_checkin,
          params.rating_value,
        ];
        const avgRating = Math.round(
          ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
        );

        const reviewUrl = `/cars/${params.car_id}/reviews`;

        this.carOwnerNotifications.notifyNewReview(
          reviewerName,
          avgRating,
          carName,
          reviewUrl
        );
      }
    } catch (error) {
      // Silently fail - notification is optional enhancement
      console.debug('Could not notify owner of new review', error);
    }
  }
}
