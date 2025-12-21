import { CommonModule } from '@angular/common';
import {Component, inject,
  ChangeDetectionStrategy} from '@angular/core';
import { BookingsService } from '@core/services/bookings/bookings.service';
import { CalendarComponent } from '../../shared/calendar.component';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CalendarComponent],
  selector: 'app-car-booking',
  template: `
    <div class="p-6">
      <h2 class="text-xl font-bold">Reservar coche</h2>
      <app-calendar [carId]="carId" (rangeSelected)="onRange($event)"></app-calendar>
    
      @if (selectedRange) {
        <div class="mt-4">
          <p>Rango seleccionado: {{ selectedRange.start }} → {{ selectedRange.end }}</p>
          <button class="mt-2 px-4 py-2 bg-green-600 text-white rounded" (click)="book()">
            Reservar (card)
          </button>
        </div>
      }
    
      @if (result) {
        <div class="mt-4 p-3 border rounded bg-gray-50">
          Result: {{ result | json }}
        </div>
      }
      @if (error) {
        <div class="mt-4 p-3 border rounded bg-red-50 text-red-700">
          Error: {{ error }}
        </div>
      }
    </div>
    `,
})
export class CarBookingPage {
  carId = '11111111-1111-1111-1111-111111111111';
  selectedRange?: { start: string; end: string };
  result: unknown = null;
  error: string | null = null;

  private bookingService = inject(BookingsService);

  onRange(r: { start: string; end: string }) {
    this.selectedRange = r;
    this.result = null;
    this.error = null;
  }

  async book() {
    if (!this.selectedRange) return;
    try {
      const payload = await this.bookingService.requestBooking(
        this.carId,
        this.selectedRange.start,
        this.selectedRange.end,
      );
      this.result = payload;
    } catch (err: unknown) {
      const error = err as { message?: string };
      this.error = error?.message || String(err);
    }
  }
}
