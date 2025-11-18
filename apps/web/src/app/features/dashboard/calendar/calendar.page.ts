import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { BookingsService } from '../../../core/services/bookings.service';

@Component({
  selector: 'app-dashboard-calendar-page',
  standalone: true,
  imports: [CommonModule, RouterLink, FullCalendarModule],
  templateUrl: './calendar.page.html',
  styleUrls: ['./calendar.page.css'],
})
export class DashboardCalendarPage implements OnInit {
  private readonly bookingsService = inject(BookingsService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay',
    },
    locale: 'es',
    events: [],
    dateClick: (arg) => {
      // Navigate to booking picker or show booking modal
      console.log('Date clicked:', arg.dateStr);
    },
    eventClick: (arg) => {
      // Navigate to booking detail
      console.log('Event clicked:', arg.event.id);
    },
  };

  async ngOnInit(): Promise<void> {
    await this.loadBookings();
  }

  async loadBookings(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      // Load bookings as owner
      const ownerBookings = await this.bookingsService.getOwnerBookings();

      // Load bookings as renter
      const myBookings = await this.bookingsService.getMyBookings();

      // Combine and format for calendar
      const allBookings = [...ownerBookings, ...myBookings];

      const events = allBookings.map((booking) => ({
        id: booking.id,
        title: `${booking.car?.brand} ${booking.car?.model}`,
        start: booking.start_at,
        end: booking.end_at,
        backgroundColor:
          booking.status === 'in_progress'
            ? '#10b981'
            : booking.status === 'pending' || booking.status === 'pending_payment'
              ? '#f59e0b'
              : booking.status === 'confirmed'
                ? '#3b82f6'
                : booking.status === 'completed'
                  ? '#10b981'
                  : '#6b7280',
        borderColor:
          booking.status === 'in_progress'
            ? '#059669'
            : booking.status === 'pending' || booking.status === 'pending_payment'
              ? '#d97706'
              : booking.status === 'confirmed'
                ? '#2563eb'
                : booking.status === 'completed'
                  ? '#059669'
                  : '#4b5563',
      }));

      this.calendarOptions.events = events;
    } catch (err) {
      this.error.set('No pudimos cargar las reservas. Intentá de nuevo.');
      console.error('Error loading bookings:', err);
    } finally {
      this.loading.set(false);
    }
  }
}
