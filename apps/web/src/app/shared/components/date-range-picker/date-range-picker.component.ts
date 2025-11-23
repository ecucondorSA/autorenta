import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  OnDestroy,
  Output,
  signal,
  ViewChild,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import flatpickr from 'flatpickr';
import { Spanish } from 'flatpickr/dist/l10n/es';
import { AnalyticsService } from '../../../core/services/analytics.service';

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
  imports: [CommonModule, TranslateModule],
  templateUrl: './date-range-picker.component.html',
  styleUrls: ['./date-range-picker.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DateRangePickerComponent implements AfterViewInit, OnDestroy {
  private readonly analytics = inject(AnalyticsService);

  @Input() label = 'Fechas';
  @Input() initialFrom: string | null = null;
  @Input() initialTo: string | null = null;
  @Input() dailyPrice: number | null | undefined = null;
  @Input() showPrices = true;
  @Input() carId: string | null = null;
  @Input() availabilityChecker:
    | ((carId: string, from: string, to: string) => Promise<boolean>)
    | null = null;
  @Input() blockedRanges: BlockedDateRange[] = [];
  @Output() readonly rangeChange = new EventEmitter<DateRange>();
  @Output() readonly availabilityChange = new EventEmitter<boolean>();
  @Output() readonly calendarClick = new EventEmitter<void>();

  @ViewChild('dateRangeInput') dateRangeInput!: ElementRef<HTMLInputElement>;
  private fpInstance: flatpickr.Instance | null = null;

  readonly from = signal<string | null>(this.initialFrom);
  readonly to = signal<string | null>(this.initialTo);
  readonly isCheckingAvailability = signal(false);
  readonly isAvailable = signal<boolean | null>(null);
  readonly availabilityError = signal(false);
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

  ngAfterViewInit(): void {
    this.initFlatpickr();
  }

  ngOnDestroy(): void {
    if (this.fpInstance) {
      this.fpInstance.destroy();
      this.fpInstance = null;
    }
  }

  private initFlatpickr(): void {
    if (!this.dateRangeInput) return;

    const blockedDates = this.blockedDatesArray;

    try {
      this.fpInstance = flatpickr(this.dateRangeInput.nativeElement, {
        mode: 'range',
        locale: Spanish,
        dateFormat: 'Y-m-d',
        minDate: 'today',
        disable: blockedDates,
        defaultDate: this.from() && this.to() ? [this.from()!, this.to()!] : undefined,
        position: 'auto',
        clickOpens: true,
        allowInput: false,
        onChange: (selectedDates, _dateStr) => {
          if (selectedDates.length === 2) {
            const from = selectedDates[0].toISOString().split('T')[0];
            const to = selectedDates[1].toISOString().split('T')[0];

            this.from.set(from);
            this.to.set(to);
            void this.emit();
          }
        },
      });
    } catch (error) {
      // Ignore SecurityError related to cssRules access in flatpickr
      const err = error as Error;
      if (err.name !== 'SecurityError' && !err.message?.includes('cssRules')) {
        console.warn('⚠️ Error initializing flatpickr:', error);
      }
    }
  }

  async applyPreset(preset: DatePreset): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let fromDate: Date;
    let toDate: Date;

    if (preset.days === 'weekend') {
      const dayOfWeek = today.getDay();
      const daysUntilSaturday = dayOfWeek === 6 ? 0 : (6 - dayOfWeek + 7) % 7;

      fromDate = new Date(today);
      fromDate.setDate(today.getDate() + daysUntilSaturday);

      toDate = new Date(fromDate);
      toDate.setDate(fromDate.getDate() + 1);
    } else {
      fromDate = new Date(today);
      fromDate.setDate(today.getDate() + 1);

      toDate = new Date(fromDate);
      toDate.setDate(fromDate.getDate() + (preset.days as number));
    }

    const fromStr = fromDate.toISOString().split('T')[0];
    const toStr = toDate.toISOString().split('T')[0];

    // Update signals
    this.from.set(fromStr);
    this.to.set(toStr);

    // Update flatpickr
    if (this.fpInstance) {
      this.fpInstance.setDate([fromDate, toDate], true);
    } else {
      await this.emit();
    }

    // Track event
    const presetType =
      preset.days === 'weekend'
        ? 'weekend'
        : preset.days === 7
          ? '1week'
          : preset.days === 14
            ? '2weeks'
            : '1month';

    this.analytics.trackEvent('date_preset_clicked', {
      car_id: this.carId ?? undefined,
      preset_type: presetType,
      days_count: preset.days === 'weekend' ? 2 : preset.days,
      total_price: this.getDiscountedPrice(preset) ?? undefined,
    });
  }

  private async emit(): Promise<void> {
    const from = this.from();
    const to = this.to();

    this.rangeChange.emit({ from, to });
    this.availabilityHint.set(null);

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

    if (this.availabilityChecker && this.carId && from && to) {
      await this.checkAvailability(from, to);
    }
  }

  private async checkAvailability(from: string, to: string): Promise<void> {
    if (!this.availabilityChecker || !this.carId) return;

    this.isCheckingAvailability.set(true);
    this.availabilityError.set(false);

    try {
      const available = await this.availabilityChecker(this.carId, from, to);
      this.isAvailable.set(available);
      this.availabilityHint.set(null);
      this.availabilityChange.emit(available);

      this.analytics.trackEvent('date_availability_checked', {
        car_id: this.carId,
        is_available: available,
        days_count: Math.ceil(
          (new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24),
        ),
      });

      if (!available) {
        this.analytics.trackEvent('date_unavailable_error', {
          car_id: this.carId,
          from_date: from,
          to_date: to,
        });

        this.availabilityError.set(true);
        setTimeout(() => this.availabilityError.set(false), 600);

        await this.generateAlternativeSuggestions(from, to);
      } else {
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

  private async generateAlternativeSuggestions(
    requestedFrom: string,
    requestedTo: string,
  ): Promise<void> {
    const requestedDays = Math.ceil(
      (new Date(requestedTo).getTime() - new Date(requestedFrom).getTime()) / (1000 * 60 * 60 * 24),
    );

    const suggestions: AlternativeDateSuggestion[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const maxSearchDays = 60;
    let searchDate = new Date(today);
    searchDate.setDate(today.getDate() + 1);

    while (
      suggestions.length < 5 &&
      searchDate <= new Date(today.getTime() + maxSearchDays * 24 * 60 * 60 * 1000)
    ) {
      const fromDate = new Date(searchDate);
      const toDate = new Date(fromDate);
      toDate.setDate(fromDate.getDate() + requestedDays);

      const fromStr = fromDate.toISOString().split('T')[0];
      const toStr = toDate.toISOString().split('T')[0];

      try {
        if (this.availabilityChecker && this.carId) {
          const available = await this.availabilityChecker(this.carId, fromStr, toStr);

          if (available) {
            const discount = this.calculateDiscountForDays(requestedDays);
            const pricePerDay = this.dailyPrice || null;
            const totalPrice = pricePerDay
              ? requestedDays * pricePerDay * (1 - discount / 100)
              : null;
            const savings =
              pricePerDay && discount > 0 ? requestedDays * pricePerDay * (discount / 100) : null;

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

      searchDate.setDate(searchDate.getDate() + 1);
    }

    this.alternativeSuggestions.set(suggestions);
    this.showingSuggestions.set(suggestions.length > 0);

    if (suggestions.length > 0) {
      this.analytics.trackEvent('alternative_dates_suggested', {
        car_id: this.carId ?? undefined,
        requested_days: requestedDays,
        suggestions_count: suggestions.length,
      });
    }
  }

  private calculateDiscountForDays(days: number): number {
    if (days >= 30) return 20;
    if (days >= 14) return 15;
    if (days >= 7) return 10;
    return 0;
  }

  applySuggestion(suggestion: AlternativeDateSuggestion): void {
    this.from.set(suggestion.from);
    this.to.set(suggestion.to);
    this.alternativeSuggestions.set([]);
    this.showingSuggestions.set(false);

    // Update flatpickr
    if (this.fpInstance) {
      this.fpInstance.setDate([suggestion.from, suggestion.to], true);
    } else {
      void this.emit();
    }

    this.analytics.trackEvent('alternative_date_applied', {
      car_id: this.carId ?? undefined,
      days_count: suggestion.days,
      total_price: suggestion.totalPrice ?? undefined,
    });
  }

  showMoreSuggestions(): void {
    this.showingSuggestions.set(true);
  }

  getPresetPrice(preset: DatePreset): number | null {
    if (!this.dailyPrice || !this.showPrices) return null;

    const days = preset.days === 'weekend' ? 2 : (preset.days as number);
    return days * this.dailyPrice;
  }

  getPresetDiscount(preset: DatePreset): number {
    const days = preset.days === 'weekend' ? 2 : (preset.days as number);

    if (days >= 30) return 20;
    if (days >= 14) return 15;
    if (days >= 7) return 10;
    return 0;
  }

  getDiscountedPrice(preset: DatePreset): number | null {
    const basePrice = this.getPresetPrice(preset);
    if (!basePrice) return null;

    const discount = this.getPresetDiscount(preset);
    if (discount === 0) return basePrice;

    return basePrice * (1 - discount / 100);
  }

  getSavingsAmount(preset: DatePreset): number | null {
    const basePrice = this.getPresetPrice(preset);
    const discountedPrice = this.getDiscountedPrice(preset);

    if (!basePrice || !discountedPrice) return null;
    return basePrice - discountedPrice;
  }

  handleDateInputClick(): void {
    // Flatpickr handles the click automatically
    if (this.fpInstance) {
      try {
        this.fpInstance.open();
      } catch (error) {
        // Ignore SecurityError related to cssRules access in flatpickr
        // This happens when flatpickr tries to scan cross-origin stylesheets
        const err = error as Error;
        if (err.name !== 'SecurityError' && !err.message?.includes('cssRules')) {
          console.warn('⚠️ Error opening flatpickr:', error);
        }
      }
    }
  }

  clearRange(): void {
    if (!this.from() && !this.to()) {
      return;
    }

    this.from.set(null);
    this.to.set(null);

    if (this.fpInstance) {
      this.fpInstance.clear();
    }

    this.isAvailable.set(null);
    this.availabilityHint.set(null);
    this.availabilityError.set(false);
    this.availabilityChange.emit(false);
    void this.emit();
  }

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
