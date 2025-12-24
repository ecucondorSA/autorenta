import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Input,
  OnInit,
  signal,
} from '@angular/core';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isToday,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
  CarAvailabilityService,
  DetailedBlockedRange,
} from '@core/services/cars/car-availability.service';

interface CalendarDay {
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  status: 'available' | 'booked' | 'blocked';
}

@Component({
  selector: 'app-availability-mini-calendar',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="availability-mini-calendar rounded-xl border border-border-default bg-surface-raised overflow-hidden min-w-[280px] w-full max-w-full">
      <!-- Header -->
      <div class="flex items-center justify-between p-3 border-b border-border-default bg-surface-base">
        <button
          type="button"
          (click)="previousMonth()"
          class="p-1.5 rounded-lg hover:bg-surface-hover transition-colors"
          aria-label="Mes anterior"
        >
          <svg class="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <h4 class="text-sm font-semibold text-text-primary capitalize">
          {{ monthName() }}
        </h4>

        <button
          type="button"
          (click)="nextMonth()"
          class="p-1.5 rounded-lg hover:bg-surface-hover transition-colors"
          aria-label="Mes siguiente"
        >
          <svg class="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <!-- Calendar Grid -->
      <div class="p-2">
        <!-- Weekday Headers -->
        <div
          class="mini-calendar-weekdays mb-1"
          style="display: grid !important; grid-template-columns: repeat(7, 1fr) !important; gap: 2px !important;"
        >
          @for (day of weekDays; track day) {
            <div class="text-center text-xs font-medium text-text-muted py-1">
              {{ day }}
            </div>
          }
        </div>

        <!-- Days Grid -->
        @if (loading()) {
          <div class="flex items-center justify-center py-8">
            <div class="w-5 h-5 border-2 border-cta-default/30 border-t-cta-default rounded-full animate-spin"></div>
          </div>
        } @else {
          <div
            class="mini-calendar-grid"
            style="display: grid !important; grid-template-columns: repeat(7, 1fr) !important; gap: 2px !important;"
          >
            @for (day of calendarDays(); track day.date.toISOString()) {
              <div
                class="mini-calendar-day"
                [ngClass]="getDayClasses(day)"
                [title]="getDayTitle(day)"
              >
                {{ day.dayNumber }}
              </div>
            }
          </div>
        }
      </div>

      <!-- Legend -->
      <div class="flex items-center justify-center gap-4 p-2 border-t border-border-default bg-surface-base text-xs">
        <div class="flex items-center gap-1.5">
          <div class="w-3 h-3 rounded-full bg-emerald-500"></div>
          <span class="text-text-primary font-medium">Disponible</span>
        </div>
        <div class="flex items-center gap-1.5">
          <div class="w-3 h-3 rounded-full bg-red-500"></div>
          <span class="text-text-primary font-medium">Reservado</span>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      :host .availability-mini-calendar {
        width: 100%;
        min-width: 0;
      }

      :host .mini-calendar-weekdays,
      :host .mini-calendar-grid {
        display: grid;
        grid-template-columns: repeat(7, minmax(0, 1fr));
        gap: 0.25rem;
      }

      :host .mini-calendar-day {
        width: 100%;
        aspect-ratio: 1 / 1;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      @media (max-width: 480px) {
        :host .mini-calendar-day {
          font-size: 0.7rem;
        }
      }
    `,
  ],
})
export class AvailabilityMiniCalendarComponent implements OnInit {
  private readonly availabilityService = inject(CarAvailabilityService);

  @Input({ required: true }) carId!: string;

  readonly weekDays = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];
  readonly currentMonth = signal(new Date());
  readonly loading = signal(true);
  readonly blockedRanges = signal<DetailedBlockedRange[]>([]);

  readonly monthName = computed(() => {
    return format(this.currentMonth(), 'MMMM yyyy', { locale: es });
  });

  readonly calendarDays = computed(() => {
    const month = this.currentMonth();
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days = eachDayOfInterval({ start, end });
    const ranges = this.blockedRanges();

    // Add padding days for first week (Monday = 0)
    const firstDayOfWeek = getDay(start);
    const paddingDays = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

    const calendarDays: CalendarDay[] = [];

    // Add empty padding days
    for (let i = 0; i < paddingDays; i++) {
      const paddingDate = new Date(start);
      paddingDate.setDate(start.getDate() - (paddingDays - i));
      calendarDays.push({
        date: paddingDate,
        dayNumber: paddingDate.getDate(),
        isCurrentMonth: false,
        isToday: false,
        isPast: paddingDate < today,
        status: 'available',
      });
    }

    // Add actual month days
    for (const day of days) {
      const dayDate = new Date(day);
      dayDate.setHours(0, 0, 0, 0);

      const status = this.getDateStatus(dayDate, ranges);

      calendarDays.push({
        date: dayDate,
        dayNumber: dayDate.getDate(),
        isCurrentMonth: true,
        isToday: isToday(dayDate),
        isPast: dayDate < today,
        status,
      });
    }

    return calendarDays;
  });

  ngOnInit(): void {
    void this.loadBlockedRanges();
  }

  private async loadBlockedRanges(): Promise<void> {
    this.loading.set(true);

    try {
      const month = this.currentMonth();
      const startDate = format(startOfMonth(month), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(addMonths(month, 2)), 'yyyy-MM-dd');

      const ranges = await this.availabilityService.getBlockedRangesWithDetails(
        this.carId,
        startDate,
        endDate
      );

      this.blockedRanges.set(ranges);
    } catch (error) {
      console.error('Error loading blocked ranges:', error);
    } finally {
      this.loading.set(false);
    }
  }

  private getDateStatus(
    date: Date,
    ranges: DetailedBlockedRange[]
  ): 'available' | 'booked' | 'blocked' {
    for (const range of ranges) {
      // FIX: Parse dates without timezone shift
      const from = this.parseToLocalDate(range.from);
      const to = this.parseToLocalDate(range.to);

      if (date >= from && date <= to) {
        return range.type === 'booking' ? 'booked' : 'blocked';
      }
    }

    return 'available';
  }

  /**
   * Parse date string to local Date without timezone issues
   * "2026-01-23" → Date(2026, 0, 23) in local timezone
   */
  private parseToLocalDate(value: string): Date {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    // Fallback: parse and normalize to local midnight
    const parsed = new Date(value);
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }

  getDayClasses(day: CalendarDay): string {
    const base =
      'flex items-center justify-center text-xs sm:text-xs rounded-full transition-colors';

    if (!day.isCurrentMonth) {
      return `${base} text-text-muted/30`;
    }

    if (day.isPast) {
      return `${base} text-text-muted/50`;
    }

    if (day.isToday) {
      const statusColor = this.getStatusColor(day.status);
      return `${base} ${statusColor} ring-2 ring-cta-default ring-offset-1 font-bold`;
    }

    const statusColor = this.getStatusColor(day.status);
    return `${base} ${statusColor}`;
  }

  private getStatusColor(status: 'available' | 'booked' | 'blocked'): string {
    switch (status) {
      case 'booked':
        // Rojo sólido para reservado
        return 'bg-red-500 text-white font-semibold';
      case 'blocked':
        // Naranja para bloqueado manualmente
        return 'bg-orange-500 text-white font-semibold';
      case 'available':
      default:
        // Verde sólido para disponible
        return 'bg-emerald-500 text-white font-medium';
    }
  }

  getDayTitle(day: CalendarDay): string {
    if (!day.isCurrentMonth || day.isPast) return '';

    switch (day.status) {
      case 'booked':
        return 'Reservado';
      case 'blocked':
        return 'No disponible';
      case 'available':
      default:
        return 'Disponible';
    }
  }

  previousMonth(): void {
    this.currentMonth.set(subMonths(this.currentMonth(), 1));
    void this.loadBlockedRanges();
  }

  nextMonth(): void {
    this.currentMonth.set(addMonths(this.currentMonth(), 1));
    void this.loadBlockedRanges();
  }
}
