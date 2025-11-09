import {
  Component,
  signal,
  computed,
  inject,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import flatpickr from 'flatpickr';
import { Spanish } from 'flatpickr/dist/l10n/es';
import type { Instance } from 'flatpickr/dist/types/instance';
import { format, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ToastService } from '../../../core/services/toast.service';
import {
  CarAvailabilityService,
  DetailedBlockedRange,
} from '../../../core/services/car-availability.service';
import { CarBlockingService } from '../../../core/services/car-blocking.service';
import {
  BlockDateModalComponent,
  BlockDateRequest,
} from '../../../shared/components/block-date-modal/block-date-modal.component';

@Component({
  selector: 'app-availability-calendar',
  standalone: true,
  imports: [CommonModule, BlockDateModalComponent],
  templateUrl: './availability-calendar.page.html',
  styleUrls: ['./availability-calendar.page.css'],
})
export class AvailabilityCalendarPage implements AfterViewInit, OnDestroy {
  @ViewChild('calendarDiv') calendarDiv!: ElementRef<HTMLDivElement>;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly availabilityService = inject(CarAvailabilityService);
  private readonly blockingService = inject(CarBlockingService);
  private readonly toastService = inject(ToastService);

  readonly carId = signal<string>('');
  readonly loading = signal(true);
  readonly blockedRanges = signal<DetailedBlockedRange[]>([]);
  readonly showBlockModal = signal(false);
  readonly currentMonth = signal(new Date());

  // Stats
  readonly stats = computed(() => {
    const ranges = this.blockedRanges();
    const bookings = ranges.filter((r) => r.type === 'booking').length;
    const manualBlocks = ranges.filter((r) => r.type === 'manual_block').length;

    return {
      totalBookings: bookings,
      manualBlocks,
      totalBlocked: bookings + manualBlocks,
    };
  });

  readonly monthName = computed(() => {
    const date = this.currentMonth();
    return format(date, 'MMMM yyyy', { locale: Spanish });
  });

  private flatpickrInstance: Instance | null = null;

  ngAfterViewInit(): void {
    // Get car ID from route
    const carIdParam = this.route.snapshot.paramMap.get('id');
    if (!carIdParam) {
      this.toastService.error('Error', 'ID de auto no encontrado');
      void this.router.navigate(['/dashboard']);
      return;
    }

    this.carId.set(carIdParam);
    void this.loadCalendarData();
  }

  ngOnDestroy(): void {
    this.destroyFlatpickr();
  }

  private async loadCalendarData(): Promise<void> {
    this.loading.set(true);

    try {
      const carId = this.carId();
      const startDate = format(startOfMonth(this.currentMonth()), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(addMonths(this.currentMonth(), 2)), 'yyyy-MM-dd');

      const ranges = await this.availabilityService.getBlockedRangesWithDetails(
        carId,
        startDate,
        endDate,
      );

      this.blockedRanges.set(ranges);
      this.initFlatpickr();
    } catch (error) {
      console.error('Error loading calendar data:', error);
      this.toastService.error('Error', 'No se pudieron cargar los datos del calendario');
    } finally {
      this.loading.set(false);
    }
  }

  private initFlatpickr(): void {
    if (!this.calendarDiv?.nativeElement) return;

    // Destroy existing instance
    this.destroyFlatpickr();

    const ranges = this.blockedRanges();

    // Separate by type for different styling
    const bookingDates = ranges
      .filter((r) => r.type === 'booking')
      .flatMap((r) => this.getDatesBetween(r.from, r.to));

    const blockedDates = ranges
      .filter((r) => r.type === 'manual_block')
      .flatMap((r) => this.getDatesBetween(r.from, r.to));

    this.flatpickrInstance = flatpickr(this.calendarDiv.nativeElement, {
      inline: true,
      locale: Spanish,
      defaultDate: this.currentMonth(),
      mode: 'range',
      onDayCreate: (dObj, dStr, fp, dayElem) => {
        const dateStr = format(dayElem.dateObj, 'yyyy-MM-dd');

        // Style booking dates
        if (bookingDates.includes(dateStr)) {
          dayElem.classList.add('calendar-day-booked');
          dayElem.title = 'Reserva confirmada';
        }

        // Style blocked dates
        if (blockedDates.includes(dateStr)) {
          dayElem.classList.add('calendar-day-blocked');
          dayElem.title = 'Bloqueado manualmente';
        }

        // Past dates
        if (dayElem.dateObj < new Date()) {
          dayElem.classList.add('calendar-day-past');
        }
      },
      onChange: (selectedDates) => {
        // Handle date selection for blocking
        if (selectedDates.length === 2) {
          const [start, end] = selectedDates;

          // Check if trying to block dates with existing bookings
          const hasBooking = ranges.some(
            (r) =>
              r.type === 'booking' &&
              ((new Date(r.from) >= start && new Date(r.from) <= end) ||
                (new Date(r.to) >= start && new Date(r.to) <= end) ||
                (new Date(r.from) <= start && new Date(r.to) >= end)),
          );

          if (hasBooking) {
            this.toastService.error(
              'No se puede bloquear',
              'Este rango tiene reservas confirmadas. Cancela las reservas primero.',
            );
            this.flatpickrInstance?.clear();
            return;
          }

          // Open modal to block
          this.showBlockModal.set(true);
        }
      },
    });
  }

  private destroyFlatpickr(): void {
    if (this.flatpickrInstance) {
      this.flatpickrInstance.destroy();
      this.flatpickrInstance = null;
    }
  }

  async handleBlockDates(request: BlockDateRequest): Promise<void> {
    this.loading.set(true);
    this.showBlockModal.set(false);

    try {
      const result = await this.blockingService.blockDates({
        carId: this.carId(),
        startDate: request.startDate,
        endDate: request.endDate,
        reason: request.reason,
        notes: request.notes,
      });

      if (result) {
        this.toastService.success('Éxito', 'Fechas bloqueadas correctamente');
        await this.loadCalendarData();
      } else {
        this.toastService.error('Error', 'No se pudieron bloquear las fechas');
      }
    } catch (error) {
      console.error('Error blocking dates:', error);
      this.toastService.error('Error', 'Ocurrió un error al bloquear las fechas');
    } finally {
      this.loading.set(false);
    }
  }

  async removeBlock(blockId: string): Promise<void> {
    if (!confirm('¿Estás seguro de que quieres desbloquear estas fechas?')) {
      return;
    }

    this.loading.set(true);

    try {
      const success = await this.blockingService.unblockById(blockId, this.carId());

      if (success) {
        this.toastService.success('Éxito', 'Fechas desbloqueadas correctamente');
        await this.loadCalendarData();
      } else {
        this.toastService.error('Error', 'No se pudieron desbloquear las fechas');
      }
    } catch (error) {
      console.error('Error removing block:', error);
      this.toastService.error('Error', 'Ocurrió un error al desbloquear las fechas');
    } finally {
      this.loading.set(false);
    }
  }

  async clearAllBlocks(): Promise<void> {
    if (
      !confirm(
        '¿Estás seguro de que quieres eliminar TODOS los bloqueos manuales? Esta acción no se puede deshacer.',
      )
    ) {
      return;
    }

    this.loading.set(true);

    try {
      const success = await this.blockingService.clearAllBlocks(this.carId());

      if (success) {
        this.toastService.success('Éxito', 'Todos los bloqueos han sido eliminados');
        await this.loadCalendarData();
      } else {
        this.toastService.error('Error', 'No se pudieron eliminar los bloqueos');
      }
    } catch (error) {
      console.error('Error clearing blocks:', error);
      this.toastService.error('Error', 'Ocurrió un error al eliminar los bloqueos');
    } finally {
      this.loading.set(false);
    }
  }

  previousMonth(): void {
    this.currentMonth.set(subMonths(this.currentMonth(), 1));
    void this.loadCalendarData();
  }

  nextMonth(): void {
    this.currentMonth.set(addMonths(this.currentMonth(), 1));
    void this.loadCalendarData();
  }

  goToToday(): void {
    this.currentMonth.set(new Date());
    void this.loadCalendarData();
  }

  private getDatesBetween(from: string, to: string): string[] {
    const dates: string[] = [];
    const start = new Date(from);
    const end = new Date(to);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(format(d, 'yyyy-MM-dd'));
    }

    return dates;
  }

  // Helper methods for template
  hasManualBlocks(): boolean {
    return this.blockedRanges().filter((r) => r.type === 'manual_block').length > 0;
  }

  getManualBlocks(): DetailedBlockedRange[] {
    return this.blockedRanges().filter((r) => r.type === 'manual_block');
  }

  goBack(): void {
    void this.router.navigate(['/dashboard']);
  }
}
