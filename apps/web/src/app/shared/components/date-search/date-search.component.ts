import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { GoogleCalendarComponent } from '../google-calendar/google-calendar.component';
import { DateRange } from '../date-range-picker/date-range-picker.component';

export interface DateSearchQuery {
  from: string | null;
  to: string | null;
}

/**
 * DateSearchComponent
 *
 * Componente profesional de búsqueda por fechas con diseño tipo Airbnb/Booking.
 * Características:
 * - Diseño limpio con gradiente turquesa/cyan
 * - Click para abrir calendario (integración con date-range-picker)
 * - Animaciones suaves y responsive
 * - Muestra duración del rango seleccionado
 */
@Component({
  selector: 'app-date-search',
  standalone: true,
  imports: [CommonModule, TranslateModule, GoogleCalendarComponent],
  templateUrl: './date-search.component.html',
  styleUrls: ['./date-search.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DateSearchComponent {
  @Input() label = 'Fechas';
  @Input() placeholder = '¿Cuándo lo necesitas?';
  @Input() initialFrom: string | null = null;
  @Input() initialTo: string | null = null;
  @Input() carId: string | null = null;
  @Input() availabilityChecker:
    | ((carId: string, from: string, to: string) => Promise<boolean>)
    | null = null;
  @Input() blockedDates: string[] = [];
  @Input() googleCalendarId: string | null = null; // ID del calendario de Google
  @Input() showGoogleCalendar: boolean = false; // Mostrar Google Calendar en lugar del inline
  @Output() readonly searchClick = new EventEmitter<void>();
  @Output() readonly dateChange = new EventEmitter<DateSearchQuery>();

  readonly from = signal<string | null>(this.initialFrom);
  readonly to = signal<string | null>(this.initialTo);
  // showCalendar removido - componente de Ionic eliminado
  readonly showGoogleCalendarModal = signal(false);

  /**
   * Duración del rango en días
   */
  readonly durationDays = computed(() => {
    const from = this.from();
    const to = this.to();
    if (!from || !to) return null;

    const diff = Math.ceil(
      (new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24),
    );

    return diff > 0 ? diff : null;
  });

  /**
   * Texto formateado del rango de fechas
   */
  readonly dateRangeText = computed(() => {
    const from = this.from();
    const to = this.to();

    if (!from && !to) return null;

    if (from && !to) {
      return new Date(from).toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }

    if (!from && to) {
      return new Date(to).toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }

    const fromFormatted = new Date(from!).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    const toFormatted = new Date(to!).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    return `${fromFormatted} → ${toFormatted}`;
  });

  /**
   * Actualiza las fechas desde el componente padre
   */
  updateDates(from: string | null, to: string | null): void {
    this.from.set(from);
    this.to.set(to);
    this.dateChange.emit({ from, to });
  }

  /**
   * Limpia las fechas seleccionadas
   */
  clearDates(): void {
    this.from.set(null);
    this.to.set(null);
    this.dateChange.emit({ from: null, to: null });
  }

  /**
   * Emite evento de click para abrir selector de fechas
   */
  onDateInputClick(): void {
    if (this.showGoogleCalendar && this.googleCalendarId) {
      this.showGoogleCalendarModal.set(true);
    }
    // Calendario inline de Ionic eliminado - usar Google Calendar o date-range-picker
    this.searchClick.emit();
  }

  /**
   * Handler cuando se selecciona un rango en el calendario
   * Nota: Calendario inline de Ionic eliminado - este método se mantiene para compatibilidad
   */
  onCalendarRangeSelected(range: DateRange): void {
    this.from.set(range.from);
    this.to.set(range.to);
    this.dateChange.emit({ from: range.from, to: range.to });
  }

  /**
   * Cierra el calendario
   * Nota: Calendario inline de Ionic eliminado - este método se mantiene para compatibilidad
   */
  closeCalendar(): void {
    // Método mantenido para compatibilidad, pero el calendario ya no existe
  }

  /**
   * Cierra el modal de Google Calendar
   */
  closeGoogleCalendar(): void {
    this.showGoogleCalendarModal.set(false);
  }
}
