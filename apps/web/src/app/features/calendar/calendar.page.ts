import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CarsService } from '../../core/services/cars.service';
import {
  CarAvailabilityService,
  DetailedBlockedRange,
} from '../../core/services/car-availability.service';
import { Car } from '../../core/models';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { SupabaseClientService } from '../../core/services/supabase-client.service';

interface CalendarDay {
  day: number | null;
  date: string | null;
  isToday: boolean;
  isPast: boolean;
  isBlocked: boolean;
  blockType: 'booking' | 'blackout' | 'manual_block' | null;
  blockReason: string | null;
  isSelected: boolean;
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent],
  templateUrl: './calendar.page.html',
  styleUrls: ['./calendar.page.css'],
})
export class CalendarPage implements OnInit {
  private readonly carsService = inject(CarsService);
  private readonly availabilityService = inject(CarAvailabilityService);
  private readonly supabaseClient = inject(SupabaseClientService);

  // State signals
  readonly currentDate = signal(new Date());
  readonly myCars = signal<Car[]>([]);
  readonly selectedCarId = signal<string | null>(null);
  readonly blockedRanges = signal<DetailedBlockedRange[]>([]);
  readonly loading = signal(true);
  readonly loadingBlocks = signal(false);
  readonly selectedDates = signal<Set<string>>(new Set());
  readonly isAddingBlackout = signal(false);
  readonly blackoutReason = signal('');
  readonly error = signal<string | null>(null);

  // Computed values
  readonly selectedCar = computed(() => {
    const carId = this.selectedCarId();
    return this.myCars().find((c) => c.id === carId) || null;
  });

  readonly monthName = computed(() => {
    return this.currentDate().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  });

  readonly calendarDays = computed((): CalendarDay[] => {
    const date = this.currentDate();
    const year = date.getFullYear();
    const month = date.getMonth();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const blockedRanges = this.blockedRanges();
    const selectedDates = this.selectedDates();

    const days: CalendarDay[] = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push({
        day: null,
        date: null,
        isToday: false,
        isPast: false,
        isBlocked: false,
        blockType: null,
        blockReason: null,
        isSelected: false,
      });
    }

    // Add all days of the month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const dateStr = this.formatDate(dateObj);
      const isPast = dateObj < today;
      const isToday = dateObj.getTime() === today.getTime();

      // Check if date is blocked
      const block = this.findBlockForDate(dateStr, blockedRanges);

      days.push({
        day: d,
        date: dateStr,
        isToday,
        isPast,
        isBlocked: !!block,
        blockType: block?.type || null,
        blockReason: block?.reason || null,
        isSelected: selectedDates.has(dateStr),
      });
    }

    return days;
  });

  async ngOnInit(): Promise<void> {
    await this.loadMyCars();
  }

  private async loadMyCars(): Promise<void> {
    try {
      this.loading.set(true);
      const cars = await this.carsService.listMyCars();
      this.myCars.set(cars);

      // Auto-select first car if available
      if (cars.length > 0) {
        await this.selectCar(cars[0].id);
      }
    } catch (err) {
      console.error('Error loading cars:', err);
      this.error.set('Error al cargar tus autos');
    } finally {
      this.loading.set(false);
    }
  }

  async selectCar(carId: string): Promise<void> {
    this.selectedCarId.set(carId);
    this.selectedDates.set(new Set());
    this.isAddingBlackout.set(false);
    await this.loadBlockedDates();
  }

  private async loadBlockedDates(): Promise<void> {
    const carId = this.selectedCarId();
    if (!carId) return;

    try {
      this.loadingBlocks.set(true);

      // Load blocked dates for 6 months ahead
      const start = new Date();
      const end = new Date();
      end.setMonth(end.getMonth() + 6);

      const ranges = await this.availabilityService.getBlockedDates(carId, start, end);
      this.blockedRanges.set(ranges);
    } catch (err) {
      console.error('Error loading blocked dates:', err);
    } finally {
      this.loadingBlocks.set(false);
    }
  }

  previousMonth(): void {
    const current = this.currentDate();
    this.currentDate.set(new Date(current.getFullYear(), current.getMonth() - 1, 1));
  }

  nextMonth(): void {
    const current = this.currentDate();
    this.currentDate.set(new Date(current.getFullYear(), current.getMonth() + 1, 1));
  }

  onDateClick(calDay: CalendarDay): void {
    if (!calDay.date || calDay.isPast) return;

    // If blocked by a booking, cannot select
    if (calDay.isBlocked && calDay.blockType === 'booking') {
      return;
    }

    const selected = new Set(this.selectedDates());
    if (selected.has(calDay.date)) {
      selected.delete(calDay.date);
    } else {
      selected.add(calDay.date);
    }
    this.selectedDates.set(selected);
  }

  startAddBlackout(): void {
    if (this.selectedDates().size === 0) return;
    this.isAddingBlackout.set(true);
  }

  cancelAddBlackout(): void {
    this.isAddingBlackout.set(false);
    this.blackoutReason.set('');
  }

  async confirmAddBlackout(): Promise<void> {
    const carId = this.selectedCarId();
    const dates = Array.from(this.selectedDates()).sort();
    if (!carId || dates.length === 0) return;

    try {
      this.loading.set(true);

      const startsAt = dates[0];
      const endsAt = dates[dates.length - 1];
      const reason = this.blackoutReason().trim() || 'Bloqueado manualmente';

      const supabase = this.supabaseClient.getClient();
      // Persist bloqueo manual en car_blocked_dates (tabla vigente en Supabase)
      const { error } = await supabase.from('car_blocked_dates').insert({
        car_id: carId,
        blocked_from: startsAt,
        blocked_to: endsAt,
        reason,
      });

      if (error) throw error;

      // Refresh data
      await this.loadBlockedDates();
      this.selectedDates.set(new Set());
      this.isAddingBlackout.set(false);
      this.blackoutReason.set('');
    } catch (err) {
      console.error('Error adding blackout:', err);
      this.error.set('Error al agregar bloqueo');
    } finally {
      this.loading.set(false);
    }
  }

  async removeBlackout(blockId: string): Promise<void> {
    if (!blockId) return;

    try {
      this.loading.set(true);

      const supabase = this.supabaseClient.getClient();
      const { error } = await supabase.from('car_blocked_dates').delete().eq('id', blockId);

      if (error) throw error;

      await this.loadBlockedDates();
    } catch (err) {
      console.error('Error removing blackout:', err);
      this.error.set('Error al eliminar bloqueo');
    } finally {
      this.loading.set(false);
    }
  }

  clearSelection(): void {
    this.selectedDates.set(new Set());
  }

  onReasonInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.blackoutReason.set(target.value);
  }

  // Helpers
  carLabel(car: Car | null | undefined): string {
    if (!car) return 'Auto sin título';
    const parts = [car.brand, car.model, car.year].filter(Boolean);
    const label = parts.join(' ').trim();
    return label.length > 0 ? label : 'Auto sin título';
  }

  private findBlockForDate(
    dateStr: string,
    ranges: DetailedBlockedRange[],
  ): DetailedBlockedRange | null {
    for (const range of ranges) {
      if (dateStr >= range.from && dateStr <= range.to) {
        return range;
      }
    }
    return null;
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getBlockTypeLabel(type: string | null): string {
    switch (type) {
      case 'booking':
        return 'Reservado';
      case 'blackout':
        return 'Bloqueado';
      case 'manual_block':
        return 'Bloqueado';
      default:
        return '';
    }
  }

  trackByCar(index: number, car: Car): string {
    return car.id;
  }

  trackByDay(index: number): number {
    return index;
  }
}
