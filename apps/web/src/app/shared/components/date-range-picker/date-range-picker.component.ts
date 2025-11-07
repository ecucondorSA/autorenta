import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  signal,
  inject,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { InlineCalendarModalComponent } from '../inline-calendar-modal/inline-calendar-modal.component';

export interface DateRange {
  from: string | null;
  to: string | null;
}

export interface BlockedDateRange {
  from: string;
  to: string;
}

interface DatePreset {
  label: string;
  days: number | 'weekend';
  icon: string;
}

export interface AlternativeDateSuggestion {
  from: string;
  to: string;
  days: number;
  pricePerDay: number | null;
  totalPrice: number | null;
  discount: number;
  savings: number | null;
  available: boolean;
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
  @Input() blockedRanges: BlockedDateRange[] = []; // ✅ NEW: Rangos de fechas bloqueadas (bookings confirmados)
  @Output() readonly rangeChange = new EventEmitter<DateRange>();
  @Output() readonly availabilityChange = new EventEmitter<boolean>();

  readonly from = signal<string | null>(this.initialFrom);
  readonly to = signal<string | null>(this.initialTo);
  readonly isCheckingAvailability = signal(false);
  readonly isAvailable = signal<boolean | null>(null);
  readonly availabilityError = signal(false); // Para animación shake
  readonly availabilityHint = signal<string | null>(null);
  readonly isCalendarModalOpen = signal(false);
  readonly alternativeSuggestions = signal<AlternativeDateSuggestion[]>([]);
  readonly showingSuggestions = signal(false);
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
   * ✅ UPDATED: Valida disponibilidad del auto para las fechas seleccionadas
   * Auto-suggestion removida - calendar blocking previene selección de fechas no disponibles
   */
  private async checkAvailability(from: string, to: string): Promise<void> {
    if (!this.availabilityChecker || !this.carId) return;

    this.isCheckingAvailability.set(true);
    this.availabilityError.set(false);

    try {
      const available = await this.availabilityChecker(this.carId, from, to);
      this.isAvailable.set(available);
      this.availabilityHint.set(null);
      this.availabilityChange.emit(available);

      // Track: availability checked
      this.analytics.trackEvent('date_availability_checked', {
        car_id: this.carId,
        is_available: available,
        days_count: Math.ceil(
          (new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24),
        ),
      });

      if (!available) {
        // Track: unavailable error
        this.analytics.trackEvent('date_unavailable_error', {
          car_id: this.carId,
          from_date: from,
          to_date: to,
        });

        // Activar animación shake si no está disponible
        this.availabilityError.set(true);
        // Desactivar shake después de la animación
        setTimeout(() => this.availabilityError.set(false), 600);

        // Generar sugerencias de fechas alternativas
        await this.generateAlternativeSuggestions(from, to);
      } else {
        // Limpiar sugerencias si está disponible
        this.alternativeSuggestions.set([]);
        this.showingSuggestions.set(false);
      }
    } catch (_error) {
      console.error('Error checking availability:', _error);
      this.isAvailable.set(null);
    } finally {
      this.isCheckingAvailability.set(false);
    }
  }

  /**
   * Genera sugerencias de fechas alternativas cuando el rango seleccionado no está disponible
   */
  private async generateAlternativeSuggestions(requestedFrom: string, requestedTo: string): Promise<void> {
    const requestedDays = Math.ceil(
      (new Date(requestedTo).getTime() - new Date(requestedFrom).getTime()) / (1000 * 60 * 60 * 24),
    );

    const suggestions: AlternativeDateSuggestion[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Buscar hasta 30 días en el futuro
    const maxSearchDays = 60;
    let searchDate = new Date(today);
    searchDate.setDate(today.getDate() + 1); // Empezar mañana

    // Intentar encontrar 5 sugerencias
    while (suggestions.length < 5 && searchDate <= new Date(today.getTime() + maxSearchDays * 24 * 60 * 60 * 1000)) {
      const fromDate = new Date(searchDate);
      const toDate = new Date(fromDate);
      toDate.setDate(fromDate.getDate() + requestedDays);

      const fromStr = fromDate.toISOString().split('T')[0];
      const toStr = toDate.toISOString().split('T')[0];

      // Verificar si está disponible
      try {
        if (this.availabilityChecker && this.carId) {
          const available = await this.availabilityChecker(this.carId, fromStr, toStr);

          if (available) {
            const discount = this.calculateDiscountForDays(requestedDays);
            const pricePerDay = this.dailyPrice || null;
            const totalPrice = pricePerDay ? requestedDays * pricePerDay * (1 - discount / 100) : null;
            const savings = pricePerDay && discount > 0 ? requestedDays * pricePerDay * (discount / 100) : null;

            suggestions.push({
              from: fromStr,
              to: toStr,
              days: requestedDays,
              pricePerDay,
              totalPrice,
              discount,
              savings,
              available: true,
            });
          }
        }
      } catch (error) {
        console.error('Error checking alternative date:', error);
      }

      // Avanzar 1 día
      searchDate.setDate(searchDate.getDate() + 1);
    }

    this.alternativeSuggestions.set(suggestions);
    this.showingSuggestions.set(suggestions.length > 0);

    // Track: alternative suggestions generated
    if (suggestions.length > 0) {
      this.analytics.trackEvent('alternative_dates_suggested', {
        car_id: this.carId ?? undefined,
        requested_days: requestedDays,
        suggestions_count: suggestions.length,
      });
    }
  }

  /**
   * Calcula el descuento basado en la duración
   */
  private calculateDiscountForDays(days: number): number {
    if (days >= 30) return 20;
    if (days >= 14) return 15;
    if (days >= 7) return 10;
    return 0;
  }

  /**
   * Aplica una sugerencia alternativa
   */
  applySuggestion(suggestion: AlternativeDateSuggestion): void {
    this.from.set(suggestion.from);
    this.to.set(suggestion.to);
    this.alternativeSuggestions.set([]);
    this.showingSuggestions.set(false);

    // Track: alternative date applied
    this.analytics.trackEvent('alternative_date_applied', {
      car_id: this.carId ?? undefined,
      days_count: suggestion.days,
      total_price: suggestion.totalPrice ?? undefined,
    });

    void this.emit();
  }

  /**
   * Muestra más sugerencias (expande la lista)
   */
  showMoreSuggestions(): void {
    this.showingSuggestions.set(true);
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
   * Limpia las fechas seleccionadas y resetea el estado de disponibilidad
   */
  clearRange(): void {
    if (!this.from() && !this.to()) {
      return;
    }

    this.from.set(null);
    this.to.set(null);
    this.isAvailable.set(null);
    this.availabilityHint.set(null);
    this.availabilityError.set(false);
    this.availabilityChange.emit(false);
    void this.emit();
  }

  /**
   * Handler cuando se selecciona un rango en el calendario
   */
  onCalendarRangeSelected(range: DateRange): void {
    this.from.set(range.from);
    this.to.set(range.to);
    void this.emit();
  }

  /**
   * Convierte los rangos bloqueados a un array de fechas individuales
   * para pasarlo al componente de calendario
   */
  get blockedDatesArray(): string[] {
    const blockedDates: string[] = [];

    for (const range of this.blockedRanges) {
      const start = new Date(range.from);
      const end = new Date(range.to);

      // Iterar desde start hasta end (inclusive)
      const currentDate = new Date(start);
      while (currentDate <= end) {
        blockedDates.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    return blockedDates;
  }
}
