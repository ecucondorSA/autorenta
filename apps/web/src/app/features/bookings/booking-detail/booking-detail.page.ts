import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Booking, CreateReviewParams, Review } from '../../../core/models';
import { BookingsService } from '../../../core/services/bookings.service';
import { PaymentsService } from '../../../core/services/payments.service';
import { ReviewsService } from '../../../core/services/reviews.service';
import { AuthService } from '../../../core/services/auth.service';
import { ReviewFormComponent } from '../../../shared/components/review-form/review-form.component';
import { ReviewCardComponent } from '../../../shared/components/review-card/review-card.component';
import { OwnerConfirmationComponent } from '../../../shared/components/owner-confirmation/owner-confirmation.component';
import { RenterConfirmationComponent } from '../../../shared/components/renter-confirmation/renter-confirmation.component';
import { BookingChatComponent } from '../../../shared/components/booking-chat/booking-chat.component';
import { ConfirmAndReleaseResponse } from '../../../core/services/booking-confirmation.service';

@Component({
  selector: 'app-booking-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReviewFormComponent,
    ReviewCardComponent,
    OwnerConfirmationComponent,
    RenterConfirmationComponent,
    BookingChatComponent,
  ],
  templateUrl: './booking-detail.page.html',
  styleUrl: './booking-detail.page.css',
})
export class BookingDetailPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly bookingsService = inject(BookingsService);
  private readonly paymentsService = inject(PaymentsService);
  private readonly reviewsService = inject(ReviewsService);
  private readonly authService = inject(AuthService);

  booking = signal<Booking | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  timeRemaining = signal<string | null>(null);

  // Review-related signals
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

  private countdownInterval: number | null = null;

  // Computed properties
  statusClass = computed(() => {
    const status = this.booking()?.status;
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
      case 'expired':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  });

  statusLabel = computed(() => {
    const status = this.booking()?.status;
    switch (status) {
      case 'pending':
        return 'Pendiente de pago';
      case 'confirmed':
        return 'Confirmada';
      case 'in_progress':
        return 'En curso';
      case 'completed':
        return 'Completada';
      case 'cancelled':
        return 'Cancelada';
      case 'expired':
        return 'Expirada';
      case 'no_show':
        return 'No show';
      default:
        return status ?? 'Desconocido';
    }
  });

  showPaymentActions = computed(() => this.booking()?.status === 'pending');
  showConfirmedActions = computed(() => this.booking()?.status === 'confirmed');
  showCompletedActions = computed(() => this.booking()?.status === 'completed');
  isExpired = computed(() => {
    const booking = this.booking();
    return booking ? this.bookingsService.isExpired(booking) : false;
  });

  // Confirmations - show if booking is in "returned" status
  showConfirmationSection = computed(() => {
    const booking = this.booking();
    return booking?.completion_status === 'returned' ||
           booking?.completion_status === 'pending_owner' ||
           booking?.completion_status === 'pending_renter' ||
           booking?.completion_status === 'pending_both' ||
           booking?.completion_status === 'funds_released';
  });

  isOwner = computed(() => {
    const booking = this.booking();
    const currentUser = this.authService.session$()?.user;
    if (!booking || !currentUser) return false;

    // Need to check car owner_id - will load from car data
    return this.carOwnerId() === currentUser.id;
  });

  isRenter = computed(() => {
    const booking = this.booking();
    const currentUser = this.authService.session$()?.user;
    return booking?.renter_id === currentUser?.id;
  });

  // Car owner ID and name (loaded separately)
  carOwnerId = signal<string | null>(null);
  carOwnerName = signal<string>('el anfitrión');

  async ngOnInit() {
    const bookingId = this.route.snapshot.paramMap.get('id');
    if (!bookingId) {
      this.error.set('ID de reserva inválido');
      this.loading.set(false);
      return;
    }

    try {
      const booking = await this.bookingsService.getBookingById(bookingId);
      if (!booking) {
        this.error.set('Reserva no encontrada');
        this.loading.set(false);
        return;
      }

      this.booking.set(booking);
      this.startCountdown();

      // Load car owner ID for confirmation logic
      await this.loadCarOwner();

      // Check if user can review this booking
      if (booking.status === 'completed') {
        await this.checkReviewStatus();
        await this.loadReviewData();
      }
    } catch (err) {
      console.error('Error loading booking:', err);
      this.error.set('Error al cargar la reserva');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadCarOwner(): Promise<void> {
    const booking = this.booking();
    if (!booking) return;

    try {
      const { data: car } = await this.bookingsService['supabase']
        .from('cars')
        .select('owner_id, owner:profiles!cars_owner_id_fkey(id, full_name)')
        .eq('id', booking.car_id)
        .single();

      if (car) {
        this.carOwnerId.set(car.owner_id);
        const ownerFullName = (car as any).owner?.full_name || 'el anfitrión';
        this.carOwnerName.set(ownerFullName);
      }
    } catch (error) {
      console.error('Error loading car owner:', error);
    }
  }

  private async checkReviewStatus(): Promise<void> {
    const booking = this.booking();
    if (!booking) return;

    try {
      // Check if user can review
      const canReview = await this.reviewsService.canReviewBooking(booking.id);
      this.canReview.set(canReview);

      // Check if review already exists
      const currentUser = this.authService.session$()?.user;
      if (!currentUser) return;

      // Get car info from booking
      const { data: car } = await this.bookingsService['supabase']
        .from('cars')
        .select('id, owner_id')
        .eq('id', booking.car_id)
        .single();

      if (!car) return;

      // Check if this user already reviewed
      const { data: review } = await this.reviewsService['supabase']
        .from('reviews')
        .select('*')
        .eq('booking_id', booking.id)
        .eq('reviewer_id', currentUser.id)
        .maybeSingle();

      if (review) {
        this.existingReview.set(review as Review);
        this.canReview.set(false);
      }
    } catch (error) {
      console.error('Error checking review status:', error);
    }
  }

  ngOnDestroy() {
    this.stopCountdown();
  }

  private startCountdown() {
    const booking = this.booking();
    if (!booking || booking.status !== 'pending' || !booking.expires_at) {
      return;
    }

    this.updateCountdown();

    // Update every second
    this.countdownInterval = window.setInterval(() => {
      this.updateCountdown();
    }, 1000);
  }

  private stopCountdown() {
    if (this.countdownInterval !== null) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  private updateCountdown() {
    const booking = this.booking();
    if (!booking) return;

    const remaining = this.bookingsService.getTimeUntilExpiration(booking);
    if (remaining === null || remaining === 0) {
      this.timeRemaining.set(null);
      this.stopCountdown();
      return;
    }

    this.timeRemaining.set(this.bookingsService.formatTimeRemaining(remaining));
  }

  async handlePayNow() {
    const booking = this.booking();
    if (!booking) return;

    try {
      // Create payment intent
      const intent = await this.paymentsService.createPaymentIntent(booking.id, 'mock');

      // Simulate payment (in production, redirect to payment provider)
      await this.paymentsService.simulateWebhook('mock', intent.id, 'approved');

      // Reload booking
      const updated = await this.bookingsService.getBookingById(booking.id);
      this.booking.set(updated);

      alert('¡Pago realizado exitosamente!');
    } catch (err) {
      console.error('Payment error:', err);
      alert('Error al procesar el pago');
    }
  }

  async handleCancel() {
    const booking = this.booking();
    if (!booking) return;

    if (!confirm('¿Estás seguro de que querés cancelar esta reserva?')) {
      return;
    }

    try {
      await this.bookingsService.cancelBooking(booking.id, 'Cancelled by user');

      // Reload booking
      const updated = await this.bookingsService.getBookingById(booking.id);
      this.booking.set(updated);
    } catch (err) {
      console.error('Cancel error:', err);
      alert('Error al cancelar la reserva');
    }
  }

  formatCurrency(cents: number, currency: string): string {
    const amount = cents / 100;
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  formatDateTime(dateStr: string): string {
    return new Date(dateStr).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Review methods
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
          '¡Review enviada exitosamente! Se publicará cuando ambas partes hayan calificado, o después de 14 días.'
        );
        this.showReviewForm.set(false);

        // Reload to show the submitted review
        await this.checkReviewStatus();
      } else {
        alert(`Error al enviar la review: ${result.error}`);
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Error al enviar la review. Intentá nuevamente.');
    } finally {
      this.isSubmittingReview.set(false);
    }
  }

  async loadReviewData(): Promise<void> {
    const booking = this.booking();
    if (!booking) return;

    try {
      const currentUser = this.authService.session$()?.user;
      if (!currentUser) return;

      // Get car and owner info
      const { data: car } = await this.bookingsService['supabase']
        .from('cars')
        .select('id, title, owner_id, owner:profiles!cars_owner_id_fkey(id, full_name)')
        .eq('id', booking.car_id)
        .single();

      if (!car) return;

      // Determine if current user is renter or owner
      const isRenter = booking.renter_id === currentUser.id;
      const isOwner = car.owner_id === currentUser.id;

      if (!isRenter && !isOwner) return;

      let revieweeId: string;
      let revieweeName: string;
      let reviewType: 'renter_to_owner' | 'owner_to_renter';

      if (isRenter) {
        // Renter is reviewing the owner
        revieweeId = car.owner_id;
        revieweeName = (car as any).owner?.full_name || 'Propietario';
        reviewType = 'renter_to_owner';
      } else {
        // Owner is reviewing the renter
        const { data: renter } = await this.bookingsService['supabase']
          .from('profiles')
          .select('id, full_name')
          .eq('id', booking.renter_id)
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
    } catch (error) {
      console.error('Error loading review data:', error);
    }
  }

  // Confirmation handlers
  async handleConfirmationSuccess(result: ConfirmAndReleaseResponse): Promise<void> {
    console.log('Confirmation result:', result);

    // Reload booking to get updated status
    const bookingId = this.booking()?.id;
    if (bookingId) {
      const updated = await this.bookingsService.getBookingById(bookingId);
      this.booking.set(updated);
    }

    // Show success message
    if (result.funds_released) {
      alert(`✅ ${result.message}\n\n¡Los fondos fueron liberados automáticamente!`);
    } else {
      alert(`✅ ${result.message}`);
    }
  }

  handleConfirmationError(errorMessage: string): void {
    console.error('Confirmation error:', errorMessage);
    alert(`❌ Error: ${errorMessage}`);
  }
}
