import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReviewsService } from '../../../core/services/reviews.service';
import { SupabaseClientService } from '../../../core/services/supabase-client.service';
import { ReviewCardComponent } from '../../../shared/components/review-card/review-card.component';

@Component({
  selector: 'app-reviews-page',
  standalone: true,
  imports: [CommonModule, RouterLink, ReviewCardComponent],
  templateUrl: './reviews.page.html',
  styleUrls: ['./reviews.page.css'],
})
export class ReviewsPage implements OnInit {
  private readonly reviewsService = inject(ReviewsService);
  private readonly supabase = inject(SupabaseClientService).getClient();

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly userId = signal<string | null>(null);
  readonly userRole = signal<'owner' | 'renter' | 'both' | null>(null);

  // Reviews as owner
  readonly ownerReviews = signal<any[]>([]);
  readonly ownerAverageRating = signal<number>(0);
  readonly ownerReviewsCount = signal<number>(0);

  // Reviews as renter
  readonly renterReviews = signal<any[]>([]);
  readonly renterAverageRating = signal<number>(0);
  readonly renterReviewsCount = signal<number>(0);

  readonly activeTab = signal<'owner' | 'renter'>('owner');

  async ngOnInit(): Promise<void> {
    await this.loadUserData();
    await this.loadReviews();
  }

  async loadUserData(): Promise<void> {
    try {
      const user = await this.supabase.auth.getUser();
      if (user.data.user) {
        this.userId.set(user.data.user.id);

        // Get user profile to determine role
        const { data: profile } = await this.supabase
          .from('profiles')
          .select('user_role')
          .eq('id', user.data.user.id)
          .single();

        if (profile) {
          this.userRole.set(profile.user_role as 'owner' | 'renter' | 'both');
        }
      }
    } catch (err) {
      console.error('Error loading user data:', err);
    }
  }

  async loadReviews(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const userId = this.userId();
      if (!userId) {
        throw new Error('Usuario no autenticado');
      }

      const role = this.userRole();

      // Load reviews as owner
      if (role === 'owner' || role === 'both') {
        const ownerReviewsData = await this.reviewsService.getReviewsForUser(userId, true);
        this.ownerReviews.set(ownerReviewsData);
      }

      // Load reviews as renter
      if (role === 'renter' || role === 'both') {
        const renterReviewsData = await this.reviewsService.getReviewsForUser(userId, false);
        this.renterReviews.set(renterReviewsData);
      }

      // Get summary data
      const ownerSummary = await this.reviewsService.getReviewSummary(userId, true);
      if (ownerSummary) {
        this.ownerAverageRating.set(ownerSummary.average_rating || 0);
        this.ownerReviewsCount.set(ownerSummary.total_count || 0);
      }

      const renterSummary = await this.reviewsService.getReviewSummary(userId, false);
      if (renterSummary) {
        this.renterAverageRating.set(renterSummary.average_rating || 0);
        this.renterReviewsCount.set(renterSummary.total_count || 0);
      }
    } catch (err) {
      this.error.set('No pudimos cargar las reseñas. Intentá de nuevo.');
      console.error('Error loading reviews:', err);
    } finally {
      this.loading.set(false);
    }
  }

  setActiveTab(tab: 'owner' | 'renter'): void {
    this.activeTab.set(tab);
  }

  getStarRating(rating: number): ('filled' | 'empty')[] {
    const stars: ('filled' | 'empty')[] = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push('filled');
      } else if (i === fullStars && hasHalfStar) {
        stars.push('filled');
      } else {
        stars.push('empty');
      }
    }
    return stars;
  }
}
