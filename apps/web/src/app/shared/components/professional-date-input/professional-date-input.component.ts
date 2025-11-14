import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  signal,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DateRange } from '../date-range-picker/date-range-picker.component';
import { AnalyticsService } from '../../../core/services/analytics.service';

@Component({
  selector: 'app-professional-date-input',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './professional-date-input.component.html',
  styleUrls: ['./professional-date-input.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfessionalDateInputComponent {
  private readonly analytics = inject(AnalyticsService);

  @Input() placeholder = '¿Cuándo lo necesitas?';
  @Input() label = 'Fechas';
  @Input() initialFrom: string | null = null;
  @Input() initialTo: string | null = null;
  @Input() carId: string | null = null;
  @Input() availabilityChecker:
    | ((carId: string, from: string, to: string) => Promise<boolean>)
    | null = null;
  @Input() blockedRanges: Array<{ from: string; to: string }> = [];
  @Input() disabled = false;
  @Input() showIcon = true;

  @Output() readonly rangeChange = new EventEmitter<DateRange>();
  @Output() readonly calendarOpen = new EventEmitter<void>();

  readonly from = signal<string | null>(this.initialFrom);
  readonly to = signal<string | null>(this.initialTo);
  readonly isCalendarOpen = signal(false);

  /**
   * Formatea las fechas para mostrar en el input
   */
  readonly displayText = computed(() => {
    const from = this.from();
    const to = this.to();

    if (!from || !to) {
      return this.placeholder;
    }

    try {
      const fromDate = new Date(from);
      const toDate = new Date(to);

      // Formato corto: "15 Ene - 20 Ene"
      const fromFormatted = this.formatDateShort(fromDate);
      const toFormatted = this.formatDateShort(toDate);

      // Si es el mismo mes, mostrar solo una vez el mes
      if (
        fromDate.getMonth() === toDate.getMonth() &&
        fromDate.getFullYear() === toDate.getFullYear()
      ) {
        return `${fromDate.getDate()} - ${toDate.getDate()} ${this.getMonthName(fromDate)}`;
      }

      return `${fromFormatted} - ${toFormatted}`;
    } catch {
      return `${from} - ${to}`;
    }
  });

  /**
   * Indica si hay fechas seleccionadas
   */
  readonly hasSelection = computed(() => {
    return !!(this.from() && this.to());
  });

  /**
   * Calcula los días seleccionados
   */
  readonly selectedDays = computed(() => {
    const from = this.from();
    const to = this.to();
    if (!from || !to) {
      return null;
    }

    const diff = Math.ceil(
      (new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24),
    );
    return diff > 0 ? diff : null;
  });

  /**
   * Formatea una fecha en formato corto (ej: "15 Ene")
   */
  private formatDateShort(date: Date): string {
    const day = date.getDate();
    const month = this.getMonthName(date);
    return `${day} ${month}`;
  }

  /**
   * Obtiene el nombre del mes abreviado
   */
  private getMonthName(date: Date): string {
    const months = [
      'Ene',
      'Feb',
      'Mar',
      'Abr',
      'May',
      'Jun',
      'Jul',
      'Ago',
      'Sep',
      'Oct',
      'Nov',
      'Dic',
    ];
    return months[date.getMonth()];
  }

  /**
   * Abre el calendario
   */
  openCalendar(): void {
    if (this.disabled) {
      return;
    }

    this.isCalendarOpen.set(true);
    this.calendarOpen.emit();

    // Track: Calendar opened - using valid event type
    this.analytics.trackEvent('date_range_selected', {
      car_id: this.carId ?? undefined,
      source: 'calendar_opened',
      has_dates: this.hasSelection(),
    });
  }

  /**
   * Cierra el calendario
   */
  closeCalendar(): void {
    this.isCalendarOpen.set(false);
  }

  /**
   * Maneja la selección de rango desde el calendario
   */
  onRangeSelected(range: DateRange): void {
    this.from.set(range.from);
    this.to.set(range.to);
    this.closeCalendar();

    // Emitir cambio
    this.rangeChange.emit(range);

    // Track: Date range selected
    if (range.from && range.to) {
      const daysCount = Math.ceil(
        (new Date(range.to).getTime() - new Date(range.from).getTime()) / (1000 * 60 * 60 * 24),
      );

      this.analytics.trackEvent('date_range_selected', {
        car_id: this.carId ?? undefined,
        days_count: daysCount,
        source: 'professional_date_input',
      });
    }
  }

  /**
   * Limpia la selección
   */
  clearSelection(event: Event): void {
    event.stopPropagation();
    this.from.set(null);
    this.to.set(null);
    this.rangeChange.emit({ from: null, to: null });

    // Track: Date cleared - using valid event type
    this.analytics.trackEvent('date_range_selected', {
      car_id: this.carId ?? undefined,
      source: 'date_input_cleared',
    });
  }

  /**
   * Convierte los rangos bloqueados a array de fechas
   */
  get blockedDatesArray(): string[] {
    const blockedDates: string[] = [];

    for (const range of this.blockedRanges) {
      const start = new Date(range.from);
      const end = new Date(range.to);

      const currentDate = new Date(start);
      while (currentDate <= end) {
        blockedDates.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    return blockedDates;
  }
}

