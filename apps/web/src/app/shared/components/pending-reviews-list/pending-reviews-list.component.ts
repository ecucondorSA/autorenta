import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReviewsService } from '../../../core/services/reviews.service';

@Component({
  selector: 'app-pending-reviews-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 class="mb-4 text-lg font-semibold text-gray-900">Reviews Pendientes</h3>

      @if (loading()) {
        <div class="flex items-center justify-center py-8">
          <div class="h-6 w-6 animate-spin rounded-full border-2 border-sky-500 border-t-transparent"></div>
        </div>
      } @else if (pendingReviews().length === 0) {
        <div class="rounded-lg bg-gray-50 p-4 text-center text-sm text-gray-600">
          No tienes reviews pendientes.
        </div>
      } @else {
        <div class="space-y-3">
          @for (review of pendingReviews(); track review.booking_id) {
            <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <h4 class="font-medium text-gray-900">{{ review.car_title }}</h4>
                  <p class="text-sm text-gray-600">
                    Para: {{ review.reviewee_name }}
                  </p>
                  <p class="mt-1 text-xs text-gray-500">
                    Checkout: {{ review.checkout_date | date: 'short' }}
                  </p>
                </div>
                <div class="ml-4 text-right">
                  <div
                    class="rounded-full px-3 py-1 text-xs font-medium"
                    [class.bg-beige-100]="review.days_remaining > 7"
                    [class.text-beige-500]="review.days_remaining > 7"
                    [class.bg-orange-100]="review.days_remaining <= 7 && review.days_remaining > 3"
                    [class.text-orange-800]="review.days_remaining <= 7 && review.days_remaining > 3"
                    [class.bg-red-100]="review.days_remaining <= 3"
                    [class.text-red-800]="review.days_remaining <= 3"
                  >
                    {{ review.days_remaining }} días restantes
                  </div>
                </div>
              </div>
              <div class="mt-3">
                <a
                  [routerLink]="['/bookings', review.booking_id]"
                  class="inline-block rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
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

