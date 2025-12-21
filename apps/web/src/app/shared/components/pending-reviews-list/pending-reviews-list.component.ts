import { CommonModule } from '@angular/common';
import {Component, OnInit, inject, signal,
  ChangeDetectionStrategy} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReviewsService } from '@core/services/cars/reviews.service';

@Component({
  selector: 'app-pending-reviews-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="rounded-lg border border-border-default bg-surface-raised p-6 shadow-sm">
      <h3 class="mb-4 text-lg font-semibold text-text-primary">Reviews Pendientes</h3>

      @if (loading()) {
        <div class="flex items-center justify-center py-8">
          <div
            class="h-6 w-6 animate-spin rounded-full border-2 border-cta-default border-t-transparent"
          ></div>
        </div>
      } @else if (pendingReviews().length === 0) {
        <div class="rounded-lg bg-surface-base p-4 text-center text-sm text-text-secondary">
          No tienes reviews pendientes.
        </div>
      } @else {
        <div class="space-y-3">
          @for (review of pendingReviews(); track review.booking_id) {
            <div class="rounded-lg border border-border-default bg-surface-base p-4">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <h4 class="font-medium text-text-primary">{{ review.car_title }}</h4>
                  <p class="text-sm text-text-secondary">Para: {{ review.reviewee_name }}</p>
                  <p class="mt-1 text-xs text-text-secondary">
                    Checkout: {{ review.checkout_date | date: 'short' }}
                  </p>
                </div>
                <div class="ml-4 text-right">
                  <div
                    class="rounded-full px-3 py-1 text-xs font-medium"
                    [class.bg-warning-bg-hover]="review.days_remaining > 7"
                    [class.text-warning-strong]="review.days_remaining > 7"
                    [class.bg-warning-light/20]="
                      review.days_remaining <= 7 && review.days_remaining > 3
                    "
                    [class.text-warning-strong]="
                      review.days_remaining <= 7 && review.days_remaining > 3
                    "
                    [class.bg-error-bg-hover]="review.days_remaining <= 3"
                    [class.text-error-strong]="review.days_remaining <= 3"
                  >
                    {{ review.days_remaining }} días restantes
                  </div>
                </div>
              </div>
              <div class="mt-3">
                <a
                  [routerLink]="['/bookings', review.booking_id]"
                  class="inline-block rounded-lg bg-cta-default text-cta-text hover:bg-cta-default"
                >
                  Escribir Review
                </a>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class PendingReviewsListComponent implements OnInit {
  private readonly reviewsService = inject(ReviewsService);

  readonly pendingReviews = signal<
    Array<{
      booking_id: string;
      car_title: string;
      reviewee_name: string;
      checkout_date: string;
      days_remaining: number;
    }>
  >([]);
  readonly loading = signal(false);

  async ngOnInit(): Promise<void> {
    await this.loadPendingReviews();
  }

  async loadPendingReviews(): Promise<void> {
    this.loading.set(true);

    try {
      const reviews = await this.reviewsService.getPendingReviews();
      this.pendingReviews.set(reviews);
    } catch (err) {
      console.error('Error loading pending reviews:', err);
    } finally {
      this.loading.set(false);
    }
  }
}
