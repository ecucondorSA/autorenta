import {Component, OnInit, signal, inject,
  ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReviewsService } from '../../../core/services/reviews.service';
import { AuthService } from '../../../core/services/auth.service';

interface PendingReview {
  booking_id: string;
  car_title: string;
  reviewee_name: string;
  checkout_date: string;
  days_remaining: number;
}

@Component({
  selector: 'app-pending-reviews',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen bg-surface-base dark:bg-surface-raised py-8">
      <div class="max-w-4xl mx-auto px-4">
        <!-- Header -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-text-primary dark:text-text-inverse mb-2">
            Reseñas Pendientes
          </h1>
          <p class="text-text-secondary dark:text-text-secondary">
            Tienes {{ pendingReviews().length }}
            {{ pendingReviews().length === 1 ? 'reseña pendiente' : 'reseñas pendientes' }}
          </p>
        </div>

        <!-- Loading State -->
        @if (loading()) {
          <div class="flex items-center justify-center py-12">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-cta-default"></div>
          </div>
        }

        <!-- Error State -->
        @if (error() && !loading()) {
          <div
            class="bg-error-bg dark:bg-error-900/20 border border-error-border dark:border-error-800 rounded-lg p-4 mb-6"
          >
            <p class="text-error-strong">{{ error() }}</p>
          </div>
        }

        <!-- Empty State -->
        @if (!loading() && !error() && pendingReviews().length === 0) {
          <div class="bg-surface-raised dark:bg-surface-base rounded-lg shadow p-8 text-center">
            <svg
              class="mx-auto h-12 w-12 text-text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 class="mt-4 text-lg font-medium text-text-primary dark:text-text-inverse">
              No tienes reseñas pendientes
            </h3>
            <p class="mt-2 text-sm text-text-secondary dark:text-text-secondary">
              Cuando completes una reserva, podrás dejar una reseña aquí.
            </p>
            <div class="mt-6">
              <a
                routerLink="/bookings"
                class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-cta-text bg-cta-default hover:bg-cta-default"
              >
                Ver mis reservas
              </a>
            </div>
          </div>
        }

        <!-- Pending Reviews List -->
        @if (!loading() && !error() && pendingReviews().length > 0) {
          <div class="space-y-4">
            @for (review of pendingReviews(); track review.booking_id) {
              <div
                class="bg-surface-raised dark:bg-surface-base rounded-lg shadow p-6 border-l-4 border-cta-default"
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <h3 class="text-lg font-semibold text-text-primary dark:text-text-inverse mb-2">
                      {{ review.car_title }}
                    </h3>
                    <p class="text-sm text-text-secondary dark:text-text-secondary mb-2">
                      Califica a: <span class="font-medium">{{ review.reviewee_name }}</span>
                    </p>
                    <div
                      class="flex items-center gap-4 text-sm text-text-secondary dark:text-text-muted"
                    >
                      <span> Finalizó: {{ formatDate(review.checkout_date) }} </span>
                      <span
                        class="px-2 py-1 rounded-full text-xs font-medium"
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
                        {{ review.days_remaining }}
                        {{ review.days_remaining === 1 ? 'día restante' : 'días restantes' }}
                      </span>
                    </div>
                  </div>
                  <div>
                    <a
                      [routerLink]="['/bookings', review.booking_id]"
                      class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-cta-text bg-cta-default hover:bg-cta-default"
                    >
                      Dejar reseña
                    </a>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class PendingReviewsPage implements OnInit {
  private readonly reviewsService = inject(ReviewsService);
  private readonly authService = inject(AuthService);

  readonly pendingReviews = signal<PendingReview[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await this.loadPendingReviews();
  }

  async loadPendingReviews(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const reviews = await this.reviewsService.getPendingReviews();
      this.pendingReviews.set(reviews);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Error al cargar reseñas pendientes');
    } finally {
      this.loading.set(false);
    }
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
}
