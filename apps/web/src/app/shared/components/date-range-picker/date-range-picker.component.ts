import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  signal,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { InlineCalendarModalComponent } from '../inline-calendar-modal/inline-calendar-modal.component';

export interface DateRange {
  from: string | null;
  to: string | null;
}

interface DatePreset {
  label: string;
  days: number | 'weekend';
  icon: string;
}

@Component({
  selector: 'app-date-range-picker',
  standalone: true,
  imports: [CommonModule, TranslateModule, InlineCalendarModalComponent],
  templateUrl: './date-range-picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DateRangePickerComponent {
  private readonly analytics = inject(AnalyticsService);

  @Input() label = 'Fechas';
  @Input() initialFrom: string | null = null;
  @Input() initialTo: string | null = null;
  @Input() dailyPrice: number | null | undefined = null; // Precio por día para calcular total en presets
  @Input() showPrices = true; // Mostrar precios en los presets
  @Input() carId: string | null = null; // ID del auto para validar disponibilidad
  @Input() availabilityChecker: ((carId: string, from: string, to: string) => Promise<boolean>) | null = null;
  @Input() nextAvailableRangeProvider: ((carId: string, from: string, to: string) => Promise<DateRange | null>) | null = null;
  @Input() blockedDates: string[] = []; // Fechas bloqueadas para el calendario inline
  @Output() readonly rangeChange = new EventEmitter<DateRange>();
  @Output() readonly availabilityChange = new EventEmitter<boolean>();

  readonly from = signal<string | null>(this.initialFrom);
  readonly to = signal<string | null>(this.initialTo);
  readonly isCheckingAvailability = signal(false);
  readonly isAvailable = signal<boolean | null>(null);
  readonly availabilityError = signal(false); // Para animación shake
  readonly availabilityHint = signal<string | null>(null);
  readonly isCalendarModalOpen = signal(false);

  readonly presets: DatePreset[] = [
    { label: 'Fin de semana', days: 'weekend', icon: '🎉' },
    { label: '1 semana', days: 7, icon: '📅' },
    { label: '2 semanas', days: 14, icon: '🗓️' },
    { label: '1 mes', days: 30, icon: '📆' },
  ];

  onFromChange(value: string): void {
    // Convert empty string to null
    const newValue = value && value.trim() !== '' ? value : null;
    this.from.set(newValue);
    this.emit();
  }

  onToChange(value: string): void {
    // Convert empty string to null
    const newValue = value && value.trim() !== '' ? value : null;
    this.to.set(newValue);
    this.emit();
  }

  async applyPreset(preset: DatePreset): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to midnight

    let fromDate: Date;
    let toDate: Date;

    if (preset.days === 'weekend') {
      // Calcular próximo fin de semana (sábado a domingo)
      const dayOfWeek = today.getDay(); // 0 = domingo, 6 = sábado
      const daysUntilSaturday = dayOfWeek === 6 ? 0 : (6 - dayOfWeek + 7) % 7;

      fromDate = new Date(today);
      fromDate.setDate(today.getDate() + daysUntilSaturday);

      toDate = new Date(fromDate);
      toDate.setDate(fromDate.getDate() + 1); // Domingo
    } else {
      fromDate = new Date(today);
      fromDate.setDate(today.getDate() + 1); // Empezar mañana

      toDate = new Date(fromDate);
      toDate.setDate(fromDate.getDate() + (preset.days as number));
    }

    // Convertir a formato YYYY-MM-DD
    const fromStr = fromDate.toISOString().split('T')[0];
    const toStr = toDate.toISOString().split('T')[0];

    // Track evento: preset clicked
    const presetType: 'weekend' | '1week' | '2weeks' | '1month' =
      preset.days === 'weekend' ? 'weekend' :
      preset.days === 7 ? '1week' :
      preset.days === 14 ? '2weeks' : '1month';

    this.analytics.trackEvent('date_preset_clicked', {
      car_id: this.carId ?? undefined,
      preset_type: presetType,
      days_count: preset.days === 'weekend' ? 2 : preset.days,
      total_price: this.getDiscountedPrice(preset) ?? undefined,
    });

    this.from.set(fromStr);
    this.to.set(toStr);
    await this.emit();
  }

  private async emit(): Promise<void> {
    const from = this.from();
    const to = this.to();

    // Emitir cambio de rango inmediatamente
    this.rangeChange.emit({ from, to });
    this.availabilityHint.set(null);

    // Track: date range selected
    if (from && to) {
      const daysCount = Math.ceil(
        (new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24),
      );

      this.analytics.trackEvent('date_range_selected', {
        car_id: this.carId ?? undefined,
        days_count: daysCount,
        total_price: this.dailyPrice ? daysCount * this.dailyPrice : undefined,
      });
    }

    // Validar disponibilidad si se proporcionó checker y hay fechas completas
    if (this.availabilityChecker && this.carId && from && to) {
      await this.checkAvailability(from, to);
    }
  }

  /**
   * Valida disponibilidad del auto para las fechas seleccionadas
   */
  private async checkAvailability(from: string, to: string): Promise<void> {
    if (!this.availabilityChecker || !this.carId) return;

    this.isCheckingAvailability.set(true);
    this.availabilityError.set(false);

    try {
      const available = await this.availabilityChecker(this.carId, from, to);
      if (available) {
        this.isAvailable.set(true);
        this.availabilityHint.set(null);
        this.availabilityChange.emit(true);
        // Track: availability checked
        this.analytics.trackEvent('date_availability_checked', {
          car_id: this.carId,
          is_available: true,
          days_count: Math.ceil(
            (new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24),
          ),
        });
        return;
      }

      // Intentar recuperar sugiriendo próxima ventana disponible
      const suggestion = await this.trySuggestNextRange(from, to);
      if (suggestion) {
        this.isAvailable.set(true);
        this.availabilityChange.emit(true);
        return;
      }

      this.isAvailable.set(false);
      this.availabilityHint.set(null);
      this.availabilityChange.emit(false);

      // Track: availability checked
      this.analytics.trackEvent('date_availability_checked', {
        car_id: this.carId,
        is_available: false,
        days_count: Math.ceil(
          (new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24),
        ),
      });

      // Activar animación shake si no está disponible
      // Track: unavailable error
      this.analytics.trackEvent('date_unavailable_error', {
        car_id: this.carId,
        from_date: from,
        to_date: to,
      });

      this.availabilityError.set(true);
      // Desactivar shake después de la animación
      setTimeout(() => this.availabilityError.set(false), 600);
    } catch (_error) {
      console.error('Error checking availability:', _error);
      this.isAvailable.set(null);
    } finally {
      this.isCheckingAvailability.set(false);
    }
  }

  private async trySuggestNextRange(from: string, to: string): Promise<DateRange | null> {
    if (!this.nextAvailableRangeProvider || !this.carId) {
      return null;
    }

    try {
      const suggestion = await this.nextAvailableRangeProvider(this.carId, from, to);
      if (!suggestion?.from || !suggestion?.to) {
        return null;
      }

      const normalizedFrom = this.normalizeDate(suggestion.from);
      const normalizedTo = this.normalizeDate(suggestion.to);

      // Actualizar fechas y emitir nuevo rango
      this.from.set(normalizedFrom);
      this.to.set(normalizedTo);
      this.rangeChange.emit({ from: normalizedFrom, to: normalizedTo });

      const hint = `Actualizamos tus fechas a la próxima ventana libre: ${this.formatDateForHint(
        normalizedFrom,
      )} → ${this.formatDateForHint(normalizedTo)}`;
      this.availabilityHint.set(hint);

      this.analytics.trackEvent('date_autosuggest_applied', {
        car_id: this.carId,
        original_from: from,
        original_to: to,
        suggested_from: normalizedFrom,
        suggested_to: normalizedTo,
      });

      return { from: normalizedFrom, to: normalizedTo };
    } catch (_error) {
      console.warn('No se pudo sugerir nueva ventana disponible:', _error);
      return null;
    }
  }

  private normalizeDate(value: string): string {
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? value : parsed.toISOString().split('T')[0];
  }

  private formatDateForHint(value: string): string {
    const parsed = new Date(value);
    if (isNaN(parsed.getTime())) return value;
    return new Intl.DateTimeFormat('es-AR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    }).format(parsed);
  }

  /**
   * Calcula el precio total para un preset dado
   */
  getPresetPrice(preset: DatePreset): number | null {
    if (!this.dailyPrice || !this.showPrices) return null;

    const days = preset.days === 'weekend' ? 2 : (preset.days as number);
    return days * this.dailyPrice;
  }

  /**
   * Calcula el descuento porcentual para duraciones largas
   * Ejemplo: 7+ días = 10%, 14+ días = 15%, 30+ días = 20%
   */
  getPresetDiscount(preset: DatePreset): number {
    const days = preset.days === 'weekend' ? 2 : (preset.days as number);

    if (days >= 30) return 20;
    if (days >= 14) return 15;
    if (days >= 7) return 10;
    return 0;
  }

  /**
   * Obtiene el precio con descuento aplicado
   */
  getDiscountedPrice(preset: DatePreset): number | null {
    const basePrice = this.getPresetPrice(preset);
    if (!basePrice) return null;

    const discount = this.getPresetDiscount(preset);
    if (discount === 0) return basePrice;

    return basePrice * (1 - discount / 100);
  }

  /**
   * Calcula el ahorro en pesos
   */
  getSavingsAmount(preset: DatePreset): number | null {
    const basePrice = this.getPresetPrice(preset);
    const discountedPrice = this.getDiscountedPrice(preset);

    if (!basePrice || !discountedPrice) return null;
    return basePrice - discountedPrice;
  }

  /**
   * Abre el calendario inline
   */
  openCalendarModal(): void {
    this.isCalendarModalOpen.set(true);

    // Track: Calendar modal opened
    this.analytics.trackEvent('date_range_selected', {
      car_id: this.carId ?? undefined,
      source: 'calendar_button_clicked',
    });
  }

  /**
   * Handler cuando se selecciona un rango en el calendario
   */
  onCalendarRangeSelected(range: DateRange): void {
    this.from.set(range.from);
    this.to.set(range.to);
    void this.emit();
  }
}
