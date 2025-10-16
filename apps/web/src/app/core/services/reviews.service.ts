import { Injectable } from '@angular/core';
import { injectSupabase } from './supabase-client.service';

export type RatingRole = 'owner_rates_renter' | 'renter_rates_owner';

export interface UserRatingSummary {
  user_id: string;
  avg_rating: number;
  reviews_count: number;
}

@Injectable({
  providedIn: 'root',
})
export class ReviewsService {
  private readonly supabase = injectSupabase();

  async createReview(params: {
    bookingId: string;
    revieweeId: string;
    role: RatingRole;
    rating: number;
    comment?: string;
  }): Promise<void> {
    const {
      data: { user },
      error: authError,
    } = await this.supabase.auth.getUser();
    if (authError) throw authError;
    if (!user?.id) throw new Error('Usuario no autenticado');

    const { error } = await this.supabase.from('reviews').insert({
      booking_id: params.bookingId,
      reviewer_id: user.id,
      reviewee_id: params.revieweeId,
      role: params.role,
      rating: params.rating,
      comment: params.comment ?? null,
    });
    if (error) throw error;
  }

  async getUserRatingSummary(userId: string): Promise<UserRatingSummary | null> {
    const { data, error } = await this.supabase
      .from('user_ratings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return (data as UserRatingSummary | null) ?? null;
  }
}
