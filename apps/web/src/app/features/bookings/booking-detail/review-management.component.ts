import {Component, Input, OnInit, computed, inject, signal,
  ChangeDetectionStrategy} from '@angular/core';

import { Booking, CreateReviewParams, Review } from '../../../core/models';
import { ReviewsService } from '@core/services/cars/reviews.service';
import { AuthService } from '@core/services/auth/auth.service';
import { BookingsService } from '@core/services/bookings/bookings.service';
import { ReviewFormComponent } from '../../../shared/components/review-form/review-form.component';
import { ReviewCardComponent } from '../../../shared/components/review-card/review-card.component';

/**
 * ReviewManagementComponent
 *
 * This component is responsible for managing the review process for a booking.
 * It handles showing the review form, submitting reviews, and displaying existing reviews.
 * It receives a `Booking` object as input.
 */
@Component({
  selector: 'app-review-management',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReviewFormComponent, ReviewCardComponent],
  template: `
    <!-- Completed Actions -->
    @if (showCompletedActions()) {
      <div class="flex flex-col sm:flex-row gap-3">
        @if (canReview() && !existingReview()) {
          <button
            (click)="handleShowReviewForm()"
            class="btn-primary flex-1 px-6 py-3 font-semibold shadow-soft"
            >
            ⭐ Dejar reseña
          </button>
        }
        @if (existingReview()) {
          <button
            class="info-card-petrol flex-1 px-6 py-3 font-semibold cursor-default text-center"
            disabled
            >
            ✅ Ya calificaste esta reserva
          </button>
        }
        <button class="btn-secondary flex-1 px-6 py-3 font-semibold">📄 Ver factura</button>
      </div>
    }
    
    <!-- Review Form Modal -->
    @if (showReviewForm() && reviewData()) {
      <div
        class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto"
        >
        <div class="my-8">
          <app-review-form
            [bookingId]="booking.id"
            [revieweeId]="reviewData()!.revieweeId"
            [carId]="reviewData()!.carId"
            [reviewType]="reviewData()!.reviewType"
            [revieweeName]="reviewData()!.revieweeName"
            [carTitle]="reviewData()!.carTitle"
            (submitReview)="handleSubmitReview($event)"
            (cancelReview)="handleCancelReview()"
          ></app-review-form>
        </div>
      </div>
    }
    
    <!-- Existing Review Display -->
    @if (existingReview() && !showReviewForm()) {
      <div
        class="card-premium rounded-2xl p-4 sm:p-6 shadow-soft"
        >
        <h3 class="h5 mb-4">📝 Tu Calificación</h3>
        <div class="info-card-warm p-4 mb-4">
          <p class="text-sm font-semibold text-warning-strong">⏳ Review pendiente de publicación</p>
          <p class="text-xs text-text-secondary dark:text-text-secondary mt-1">
            Se publicará cuando ambas partes hayan calificado, o después de 14 días.
          </p>
        </div>
        <app-review-card [review]="existingReview()!" [showCarTitle]="false"></app-review-card>
      </div>
    }
    `,
})
export class ReviewManagementComponent implements OnInit {
  @Input({ required: true }) booking!: Booking;

  private readonly reviewsService = inject(ReviewsService);
  private readonly authService = inject(AuthService);
  private readonly bookingsService = inject(BookingsService);

  showReviewForm = signal(false);
  canReview = signal(false);
  existingReview = signal<Review | null>(null);
  isSubmittingReview = signal(false);
  reviewData = signal<{
    revieweeId: string;
    revieweeName: string;
    carId: string;
    carTitle: string;
    reviewType: 'renter_to_owner' | 'owner_to_renter';
  } | null>(null);

  showCompletedActions = computed(() => this.booking?.status === 'completed');

  async ngOnInit() {
    if (this.booking.status === 'completed') {
      await this.checkReviewStatus();
      await this.loadReviewData();
    }
  }

  async checkReviewStatus(): Promise<void> {
    try {
      const canReview = await this.reviewsService.canReviewBooking(this.booking.id);
      this.canReview.set(canReview);

      const currentUser = this.authService.session$()?.user;
      if (!currentUser) return;

      const { data: car } = await this.bookingsService['supabase']
        .from('cars')
        .select('id, owner_id')
        .eq('id', this.booking.car_id)
        .single();

      if (!car) return;

      const { data: review } = await this.reviewsService['supabase']
        .from('reviews')
        .select('*')
        .eq('booking_id', this.booking.id)
        .eq('reviewer_id', currentUser.id)
        .maybeSingle();

      if (review) {
        this.existingReview.set(review as Review);
        this.canReview.set(false);
      }
    } catch {
      /* Silenced */
    }
  }

  handleShowReviewForm(): void {
    this.showReviewForm.set(true);
  }

  handleCancelReview(): void {
    this.showReviewForm.set(false);
  }

  async handleSubmitReview(params: CreateReviewParams): Promise<void> {
    this.isSubmittingReview.set(true);

    try {
      const result = await this.reviewsService.createReview(params);

      if (result.success) {
        alert(
          '¡Review enviada exitosamente! Se publicará cuando ambas partes hayan calificado, o después de 14 días.',
        );
        this.showReviewForm.set(false);

        await this.checkReviewStatus();
      } else {
        alert(`Error al enviar la review: ${result.error}`);
      }
    } catch {
      alert('Error al enviar la review. Intentá nuevamente.');
    } finally {
      this.isSubmittingReview.set(false);
    }
  }

  async loadReviewData(): Promise<void> {
    try {
      const currentUser = this.authService.session$()?.user;
      if (!currentUser) return;

      const { data: car } = await this.bookingsService['supabase']
        .from('cars')
        .select('id, title, owner_id, owner:profiles!cars_owner_id_fkey(id, full_name)')
        .eq('id', this.booking.car_id)
        .single();

      if (!car) return;

      const isRenter = this.booking.renter_id === currentUser.id;
      const isOwner = car.owner_id === currentUser.id;

      if (!isRenter && !isOwner) return;

      let revieweeId: string;
      let revieweeName: string;
      let reviewType: 'renter_to_owner' | 'owner_to_renter';

      if (isRenter) {
        revieweeId = car.owner_id;
        const owner = car.owner as { full_name?: string } | undefined;
        revieweeName = owner?.full_name || 'Propietario';
        reviewType = 'renter_to_owner';
      } else {
        const { data: renter } = await this.bookingsService['supabase']
          .from('profiles')
          .select('id, full_name')
          .eq('id', this.booking.renter_id)
          .single();

        if (!renter) return;

        revieweeId = renter.id;
        revieweeName = renter.full_name || 'Arrendatario';
        reviewType = 'owner_to_renter';
      }

      this.reviewData.set({
        revieweeId,
        revieweeName,
        carId: car.id,
        carTitle: car.title || 'Vehículo',
        reviewType,
      });
    } catch {
      /* Silenced */
    }
  }
}
