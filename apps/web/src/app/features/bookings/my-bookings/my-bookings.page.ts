import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BookingsService } from '../../../core/services/bookings.service';
import { Booking } from '../../../core/models';
import { formatDateRange } from '../../../shared/utils/date.utils';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

@Component({
  standalone: true,
  selector: 'app-my-bookings-page',
  imports: [CommonModule, MoneyPipe],
  templateUrl: './my-bookings.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyBookingsPage implements OnInit {
  readonly bookings = signal<Booking[]>([]);
  readonly loading = signal(false);

  constructor(private readonly bookingsService: BookingsService) {}

  ngOnInit(): void {
    void this.loadBookings();
  }

  async loadBookings(): Promise<void> {
    this.loading.set(true);
    try {
      const items = await this.bookingsService.getMyBookings();
      this.bookings.set(items);
    } catch (err) {
      console.error('getMyBookings error', err);
    } finally {
      this.loading.set(false);
    }
  }

  rangeLabel(booking: Booking): string {
    return formatDateRange(booking.start_at, booking.end_at);
  }
}
