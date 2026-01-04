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
import { NotificationManagerService } from '@core/services/infrastructure/notification-manager.service';
import { Booking } from '../../../core/models';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { SkeletonLoaderComponent } from '../../../shared/components/skeleton-loader/skeleton-loader.component';
import { formatDateRange } from '../../../shared/utils/date.utils';

@Component({
  selector: 'app-pending-review',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, MoneyPipe, SkeletonLoaderComponent],
  templateUrl: './pending-review.page.html',
  styleUrl: './pending-review.page.scss',
})
export class PendingReviewPage implements OnInit, ViewWillEnter {
  private readonly bookingsService = inject(BookingsService);
  private readonly toastService = inject(NotificationManagerService);
  private readonly router = inject(Router);
  private isInitialized = false;

  readonly loading = signal(true);
  readonly pendingReviews = signal<Booking[]>([]);

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

  goBack() {
    this.router.navigate(['/bookings/owner']);
  }
}
