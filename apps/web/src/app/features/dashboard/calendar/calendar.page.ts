import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BookingsService } from '../../../core/services/bookings.service';

interface BookingEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  status: string;
}

@Component({
  selector: 'app-dashboard-calendar-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './calendar.page.html',
  styleUrls: ['./calendar.page.css'],
})
export class DashboardCalendarPage implements OnInit {
  private readonly bookingsService = inject(BookingsService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly bookingEvents = signal<BookingEvent[]>([]);
  readonly currentDate = signal(new Date());

  get monthName(): string {
    return this.currentDate().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  }

  get daysInMonth(): number {
    return new Date(
      this.currentDate().getFullYear(),
      this.currentDate().getMonth() + 1,
      0,
    ).getDate();
  }

  get firstDayOfMonth(): number {
    return new Date(this.currentDate().getFullYear(), this.currentDate().getMonth(), 1).getDay();
  }

  get calendarDays(): (number | null)[] {
    const days: (number | null)[] = [];
    for (let i = 0; i < this.firstDayOfMonth; i++) {
      days.push(null);
    }
    for (let i = 1; i <= this.daysInMonth; i++) {
      days.push(i);
    }
    return days;
  }

  getEventsForDay(day: number | null): BookingEvent[] {
    if (!day) return [];
    const date = new Date(this.currentDate().getFullYear(), this.currentDate().getMonth(), day);
    const dateStr = date.toISOString().split('T')[0];
    return this.bookingEvents().filter(
      (event) => dateStr >= event.start.split('T')[0] && dateStr <= event.end.split('T')[0],
    );
  }

  async ngOnInit(): Promise<void> {
    await this.loadBookings();
  }

  async loadBookings(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const ownerBookings = await this.bookingsService.getOwnerBookings();
      const myBookings = await this.bookingsService.getMyBookings();
      const allBookings = [...ownerBookings, ...myBookings];

      const events: BookingEvent[] = allBookings.map((booking) => ({
        id: booking.id,
        title: `${booking.car?.brand} ${booking.car?.model}`,
        start: booking.start_at,
        end: booking.end_at,
        status: booking.status,
      }));

      this.bookingEvents.set(events);
    } catch (err) {
      this.error.set('No pudimos cargar las reservas. Intentá de nuevo.');
      console.error('Error loading bookings:', err);
    } finally {
      this.loading.set(false);
    }
  }

  previousMonth(): void {
    this.currentDate.set(
      new Date(this.currentDate().getFullYear(), this.currentDate().getMonth() - 1),
    );
  }

  nextMonth(): void {
    this.currentDate.set(
      new Date(this.currentDate().getFullYear(), this.currentDate().getMonth() + 1),
    );
  }
}
