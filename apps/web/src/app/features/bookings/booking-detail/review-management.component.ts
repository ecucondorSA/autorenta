import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
  computed,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';

import { ReviewsService } from '@core/services/cars/reviews.service';
import { AuthService } from '@core/services/auth/auth.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
// eslint-disable-next-line no-restricted-imports -- TODO: migrate to service facade
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { Booking, CreateReviewParams, Review } from '../../../core/models';
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

    <!-- Review Form Section (Inline - NO MODAL per design rules) -->
    @if (showReviewForm() && reviewData()) {
      <div class="mt-6 card-premium rounded-2xl p-4 sm:p-6 shadow-soft animate-fade-in">
        <div class="flex items-center justify-between mb-4">
          <h3 class="h5">Dejar una resena</h3>
          <button
            (click)="handleCancelReview()"
            class="btn-secondary-sm p-2 rounded-full hover:bg-gray-100"
            aria-label="Cancelar resena"
          >
            <span class="text-lg">✕</span>
          </button>
        </div>
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
    }

    <!-- Existing Review Display -->
    @if (existingReview() && !showReviewForm()) {
      <div class="card-premium rounded-2xl p-4 sm:p-6 shadow-soft">
        <h3 class="h5 mb-4">📝 Tu Calificación</h3>
        <div class="info-card-warm p-4 mb-4">
          <p class="text-sm font-semibold text-warning-strong">
            ⏳ Review pendiente de publicación
          </p>
          <p class="text-xs text-text-secondary mt-1">
            Se publicará cuando ambas partes hayan calificado, o después de 14 días.
          </p>
        </div>
        <app-review-card [review]="existingReview()!" [showCarTitle]="false"></app-review-card>
      </div>
    }
  `,
})
export class ReviewManagementComponent implements OnInit, OnChanges {
  @Input({ required: true }) booking!: Booking;

  private readonly reviewsService = inject(ReviewsService);
  private readonly authService = inject(AuthService);
  private readonly supabase = injectSupabase();
  private readonly logger = inject(LoggerService).createChildLogger('ReviewManagement');

  private dataLoaded = false;

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

  // Allow reviews for both pending_review and completed statuses
  showCompletedActions = computed(
    () => this.booking?.status === 'completed' || this.booking?.status === 'pending_review',
  );

  async ngOnInit() {
    await this.initializeReviewData();
  }

  async ngOnChanges(changes: SimpleChanges) {
    // React to booking input changes
    if (changes['booking'] && !changes['booking'].firstChange) {
      this.dataLoaded = false;
      await this.initializeReviewData();
    }
  }

  private async initializeReviewData(): Promise<void> {
    if (this.dataLoaded) return;

    // Check if booking status allows reviews
    if (this.booking?.status !== 'completed' && this.booking?.status !== 'pending_review') {
      return;
    }

    // Wait for auth to be ready (max 3 seconds)
    const currentUser = await this.waitForAuth(3000);
    if (!currentUser) {
      this.logger.warn('Auth not ready after timeout');
      return;
    }

    this.dataLoaded = true;
    await this.checkReviewStatus();
    await this.loadReviewData();
  }

  private async waitForAuth(timeoutMs: number): Promise<{ id: string } | null> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const session = this.authService.session$();
      if (session?.user) {
        return session.user;
      }
      // Wait 100ms before checking again
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return null;
  }

  async checkReviewStatus(): Promise<void> {
    try {
      const canReview = await this.reviewsService.canReviewBooking(this.booking.id);
      this.canReview.set(canReview);

      const currentUser = this.authService.session$()?.user;
      if (!currentUser) return;

      const { data: car } = await this.supabase
        .from('cars')
        .select('id, owner_id')
        .eq('id', this.booking.car_id)
        .single();

      if (!car) return;

      const { data: review } = await this.supabase
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
      if (!currentUser) {
        this.logger.warn('No current user found');
        return;
      }

      if (!this.booking?.car_id) {
        this.logger.warn('No car_id in booking');
        return;
      }

      const { data: car, error: carError } = await this.supabase
        .from('cars')
        .select('id, title, owner_id')
        .eq('id', this.booking.car_id)
        .single();

      if (carError) {
        this.logger.error('Car query error', carError);
        return;
      }

      if (!car) {
        this.logger.error('Car not found');
        return;
      }

      const isRenter = this.booking.renter_id === currentUser.id;
      const isOwner = car.owner_id === currentUser.id;

      // Debug: Log role detection for troubleshooting category display
      this.logger.debug('Role detection', {
        currentUserId: currentUser.id,
        renterId: this.booking.renter_id,
        ownerId: car.owner_id,
        isRenter,
        isOwner,
        reviewType: isRenter ? 'renter_to_owner' : 'owner_to_renter',
      });

      if (!isRenter && !isOwner) {
        this.logger.warn('User is neither renter nor owner');
        return;
      }

      let revieweeId: string;
      let revieweeName: string;
      let reviewType: 'renter_to_owner' | 'owner_to_renter';

      if (isRenter) {
        // Renter reviews the owner
        revieweeId = car.owner_id;
        const { data: ownerProfile } = await this.supabase
          .from('profiles')
          .select('full_name')
          .eq('id', car.owner_id)
          .single();
        revieweeName = ownerProfile?.full_name || 'Propietario';
        reviewType = 'renter_to_owner';
      } else {
        // Owner reviews the renter
        const { data: renter, error: renterError } = await this.supabase
          .from('profiles')
          .select('id, full_name')
          .eq('id', this.booking.renter_id)
          .single();

        if (renterError) {
          this.logger.error('Renter profile query error', renterError);
          return;
        }

        if (!renter) {
          this.logger.error('Renter profile not found');
          return;
        }

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
    } catch (err) {
      this.logger.error('Error in loadReviewData', err);
    }
  }
}
