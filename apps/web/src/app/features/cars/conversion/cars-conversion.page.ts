import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CalendarPage } from '../../calendar/calendar.page';
import { BookingPickerPage } from '../../booking-picker/booking-picker.page';

@Component({
  selector: 'app-cars-conversion',
  standalone: true,
  imports: [CommonModule, RouterLink, CalendarPage, BookingPickerPage],
  templateUrl: './cars-conversion.page.html',
  styleUrls: ['./cars-conversion.page.css'],
})
export class CarsConversionPage {
  readonly perks = [
    {
      icon: '🕐',
      title: 'Horarios',
      description: 'Elegí la hora exacta de retiro y devolución',
    },
    {
      icon: '📅',
      title: 'Disponibilidad en tiempo real',
      description: 'Vemos conflictos automáticamente antes de reservar',
    },
    {
      icon: '⚡',
      title: 'Confirmación rápida',
      description: 'Reserva confirmada en menos de 15 minutos',
    },
  ];
}
