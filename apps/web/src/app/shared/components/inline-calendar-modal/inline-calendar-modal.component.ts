import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonDatetime } from '@ionic/angular/standalone';
import { DateRange } from '../date-range-picker/date-range-picker.component';
import { AnalyticsService } from '../../../core/services/analytics.service';

@Component({
  selector: 'app-inline-calendar-modal',
  standalone: true,
  imports: [
    CommonModule,
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonDatetime,
  ],
  templateUrl: './inline-calendar-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InlineCalendarModalComponent {
  private readonly analytics = inject(AnalyticsService);

  @Input() isOpen = false;
  @Input() initialFrom: string | null = null;
  @Input() initialTo: string | null = null;
  @Input() carId: string | null = null;
  @Input() availabilityChecker: ((carId: string, from: string, to: string) => Promise<boolean>) | null = null;
  @Input() blockedDates: string[] = []; // Array de fechas bloqueadas en formato YYYY-MM-DD

  @Output() readonly isOpenChange = new EventEmitter<boolean>();
  @Output() readonly rangeSelected = new EventEmitter<DateRange>();

  readonly selectedRange = signal<string[]>([]);
  readonly isCheckingAvailability = signal(false);

  /**
   * Cierra el modal
   */
  dismiss(): void {
    this.isOpenChange.emit(false);
  }

  /**
   * Handler de cambio de fecha en ion-datetime
   */
  async onDateChange(event: CustomEvent): Promise<void> {
    const value = event.detail.value;

    // ion-datetime puede devolver un string (single) o array (multiple/range)
    if (Array.isArray(value) && value.length >= 2) {
      // Modo range: [fromISO, toISO]
      const fromISO = value[0];
      const toISO = value[value.length - 1]; // Último elemento es la fecha final

      // Convertir a formato YYYY-MM-DD
      const from = fromISO.split('T')[0];
      const to = toISO.split('T')[0];

      // Validar disponibilidad si se proporciona checker
      if (this.availabilityChecker && this.carId) {
        this.isCheckingAvailability.set(true);
        try {
          const available = await this.availabilityChecker(this.carId, from, to);

          if (available) {
            this.selectedRange.set([from, to]);

            // Track: Calendar range selected
            this.analytics.trackEvent('date_range_selected', {
              car_id: this.carId ?? undefined,
              days_count: Math.ceil(
                (new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24),
              ),
              source: 'inline_calendar',
            });

            // Emitir rango seleccionado
            this.rangeSelected.emit({ from, to });

            // Cerrar modal automáticamente después de 300ms
            setTimeout(() => this.dismiss(), 300);
          } else {
            // Track: Unavailable dates selected
            this.analytics.trackEvent('date_unavailable_error', {
              car_id: this.carId ?? undefined,
              from_date: from,
              to_date: to,
              source: 'inline_calendar',
            });
          }
        } catch (_error) {
          console.error('Error checking availability:', _error);
        } finally {
          this.isCheckingAvailability.set(false);
        }
      } else {
        // Sin validación, emitir directamente
        this.selectedRange.set([from, to]);
        this.rangeSelected.emit({ from, to });
        setTimeout(() => this.dismiss(), 300);
      }
    }
  }

  /**
   * Determina si una fecha está habilitada
   * Deshabilita fechas bloqueadas y fechas pasadas
   */
  isDateEnabled = (dateISOString: string): boolean => {
    const date = dateISOString.split('T')[0]; // YYYY-MM-DD
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateObj = new Date(date);

    // Deshabilitar fechas pasadas
    if (dateObj < today) {
      return false;
    }

    // Deshabilitar fechas bloqueadas
    if (this.blockedDates.includes(date)) {
      return false;
    }

    return true;
  };

  /**
   * Valor inicial del calendario
   */
  get initialValue(): string[] {
    const values: string[] = [];

    if (this.initialFrom) {
      values.push(this.initialFrom);
    }

    if (this.initialTo) {
      values.push(this.initialTo);
    }

    return values;
  }
}
