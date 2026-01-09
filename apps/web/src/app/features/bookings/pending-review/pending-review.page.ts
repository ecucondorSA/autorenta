import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ViewWillEnter } from '@ionic/angular';
import { BookingsService } from '@core/services/bookings/bookings.service';
import { BookingConfirmationService } from '@core/services/bookings/booking-confirmation.service';
import { AuthService } from '@core/services/auth/auth.service';
import { NotificationManagerService } from '@core/services/infrastructure/notification-manager.service';
import { Booking } from '../../../core/models';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { SkeletonLoaderComponent } from '../../../shared/components/skeleton-loader/skeleton-loader.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { formatDateRange } from '../../../shared/utils/date.utils';

@Component({
  selector: 'app-pending-review',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, MoneyPipe, SkeletonLoaderComponent, IconComponent],
  templateUrl: './pending-review.page.html',
  styleUrl: './pending-review.page.scss',
})
export class PendingReviewPage implements OnInit, ViewWillEnter {
  private readonly bookingsService = inject(BookingsService);
  private readonly confirmationService = inject(BookingConfirmationService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(NotificationManagerService);
  private readonly router = inject(Router);
  private isInitialized = false;

  readonly loading = signal(true);
  readonly pendingReviews = signal<Booking[]>([]);
  readonly confirmingId = signal<string | null>(null);

  readonly hasBookings = computed(() => this.pendingReviews().length > 0);

  async ngOnInit() {
    await this.loadPendingReviews();
    this.isInitialized = true;
  }

  ionViewWillEnter(): void {
    if (this.isInitialized) {
      void this.loadPendingReviews();
    }
  }

  async loadPendingReviews() {
    try {
      this.loading.set(true);
      const { bookings } = await this.bookingsService.getOwnerBookings();
      // Filter bookings with pending_review status
      const pendingReviews = bookings.filter((b) => b.status === 'pending_review');
      this.pendingReviews.set(pendingReviews);
    } catch {
      this.toastService.error('Error', 'Error al cargar reservas en revisión');
    } finally {
      this.loading.set(false);
    }
  }

  formatDateRange(booking: Booking): string {
    return formatDateRange(booking.start_at, booking.end_at);
  }

  navigateToBooking(bookingId: string) {
    this.router.navigate(['/bookings/owner', bookingId]);
  }

  /**
   * Confirma la devolución sin daños directamente desde la lista
   */
  async confirmReturnDirectly(bookingId: string, event: Event): Promise<void> {
    event.stopPropagation();

    this.confirmingId.set(bookingId);
    try {
      const session = await this.authService.ensureSession();
      const currentUserId = session?.user?.id;
      if (!currentUserId) {
        this.toastService.error('Error', 'No autenticado');
        return;
      }

      await this.confirmationService.confirmOwner({
        booking_id: bookingId,
        confirming_user_id: currentUserId,
        has_damages: false,
      });

      this.toastService.success('Devolución confirmada', 'Los fondos se liberarán en 24 horas');
      await this.loadPendingReviews();
    } catch (error) {
      console.error('Error confirming return:', error);
      this.toastService.error('Error', 'No se pudo confirmar la devolución');
    } finally {
      this.confirmingId.set(null);
    }
  }

  /**
   * Navega a reportar daños
   */
  reportDamages(bookingId: string, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/bookings', bookingId, 'damage-report']);
  }

  /**
   * Calcula tiempo desde la devolución
   */
  getTimeSinceReturn(booking: Booking): string {
    if (!booking.updated_at) return '';

    const now = new Date();
    const returnedAt = new Date(booking.updated_at);
    const diffMs = now.getTime() - returnedAt.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return 'Hace menos de 1 hora';
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;

    const diffDays = Math.floor(diffHours / 24);
    return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
  }

  goBack() {
    this.router.navigate(['/bookings/owner']);
  }
}
