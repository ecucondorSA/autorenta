import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FullCalendarModule],
  templateUrl: './calendar.page.html',
  styleUrls: ['./calendar.page.css'],
})
export class CalendarPage {
  // Calendar options with plugins
  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    events: [{ title: 'Reserva demo', start: new Date().toISOString().split('T')[0] }],
    dateClick: (arg) => {
      // When user clicks a date — open a booking flow or picker
      // For demo we just log
      // In production, open booking modal / navigate to booking picker
      // arg.dateStr contains YYYY-MM-DD
      alert(`Seleccionaste la fecha: ${arg.dateStr}`);
    },
  };
}
