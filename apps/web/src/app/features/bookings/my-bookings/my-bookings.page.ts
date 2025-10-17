import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BookingsService } from '../../../core/services/bookings.service';
import { Booking } from '../../../core/models';
import { formatDateRange } from '../../../shared/utils/date.utils';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

@Component({
  standalone: true,
  selector: 'app-my-bookings-page',
  imports: [CommonModule, MoneyPipe, RouterLink],
  templateUrl: './my-bookings.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyBookingsPage implements OnInit {
  readonly bookings = signal<Booking[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor(private readonly bookingsService: BookingsService) {}

  ngOnInit(): void {
    void this.loadBookings();
  }

  async loadBookings(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const items = await this.bookingsService.getMyBookings();
      this.bookings.set(items);
    } catch (err) {
      console.error('getMyBookings error', err);
      this.error.set('No pudimos cargar tus reservas. Por favor intentá de nuevo más tarde.');
    } finally {
      this.loading.set(false);
    }
  }

  rangeLabel(booking: Booking): string {
    return formatDateRange(booking.start_at, booking.end_at);
  }
}
