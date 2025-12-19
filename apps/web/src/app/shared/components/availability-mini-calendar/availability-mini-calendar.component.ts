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
  isSameDay,
  isToday,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
  CarAvailabilityService,
  DetailedBlockedRange,
} from '../../../core/services/car-availability.service';

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
    <div class="rounded-xl border border-border-default bg-surface-raised overflow-hidden">
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
        <div class="grid grid-cols-7 gap-0.5 mb-1">
          @for (day of weekDays; track day) {
            <div class="text-center text-[10px] font-medium text-text-muted py-1">
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
          <div class="grid grid-cols-7 gap-0.5">
            @for (day of calendarDays(); track day.date.toISOString()) {
              <div
                [class]="getDayClasses(day)"
                [title]="getDayTitle(day)"
              >
                {{ day.dayNumber }}
              </div>
            }
          </div>
        }
      </div>

      <!-- Legend -->
      <div class="flex items-center justify-center gap-4 p-2 border-t border-border-default bg-surface-base text-[10px]">
        <div class="flex items-center gap-1">
          <div class="w-2.5 h-2.5 rounded-full bg-success-default"></div>
          <span class="text-text-secondary">Disponible</span>
        </div>
        <div class="flex items-center gap-1">
          <div class="w-2.5 h-2.5 rounded-full bg-error-default"></div>
          <span class="text-text-secondary">Reservado</span>
        </div>
      </div>
    </div>
  `,
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
    const dateStr = format(date, 'yyyy-MM-dd');

    for (const range of ranges) {
      const from = new Date(range.from);
      const to = new Date(range.to);
      from.setHours(0, 0, 0, 0);
      to.setHours(0, 0, 0, 0);

      if (date >= from && date <= to) {
        return range.type === 'booking' ? 'booked' : 'blocked';
      }
    }

    return 'available';
  }

  getDayClasses(day: CalendarDay): string {
    const base = 'w-7 h-7 flex items-center justify-center text-xs rounded-full transition-colors';

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
        return 'bg-error-default/20 text-error-default font-medium';
      case 'blocked':
        return 'bg-warning-default/20 text-warning-default font-medium';
      case 'available':
      default:
        return 'bg-success-default/20 text-success-default';
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
