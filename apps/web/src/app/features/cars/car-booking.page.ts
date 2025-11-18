import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { BookingService } from '../../core/services/booking.service';
import { CalendarComponent } from '../../shared/calendar.component';

@Component({
  standalone: true,
  imports: [CommonModule, CalendarComponent],
  selector: 'app-car-booking',
  template: `
    <div class="p-6">
      <h2 class="text-xl font-bold">Reservar coche</h2>
      <app-calendar [carId]="carId" (rangeSelected)="onRange($event)"></app-calendar>

      <div *ngIf="selectedRange" class="mt-4">
        <p>Rango seleccionado: {{ selectedRange.start }} → {{ selectedRange.end }}</p>
        <button class="mt-2 px-4 py-2 bg-green-600 text-white rounded" (click)="book()">
          Reservar (card)
        </button>
      </div>

      <div *ngIf="result" class="mt-4 p-3 border rounded bg-gray-50">
        Result: {{ result | json }}
      </div>
      <div *ngIf="error" class="mt-4 p-3 border rounded bg-red-50 text-red-700">
        Error: {{ error }}
      </div>
    </div>
  `,
})
export class CarBookingPage {
  carId = '11111111-1111-1111-1111-111111111111';
  selectedRange?: { start: string; end: string };
  result: any = null;
  error: any = null;

  private bookingService = inject(BookingService);

  onRange(r: { start: string; end: string }) {
    this.selectedRange = r;
    this.result = null;
    this.error = null;
  }

  async book() {
    if (!this.selectedRange) return;
    try {
      const payload = await this.bookingService.requestBooking({
        car_id: this.carId,
        renter_id: '00000000-0000-0000-0000-000000000002',
        start_at: this.selectedRange.start,
        end_at: this.selectedRange.end,
        payment_method: 'card',
        idempotency_key: `idem-${Date.now()}`,
      });
      this.result = payload;
    } catch (err: any) {
      this.error = err?.message || err;
    }
  }
}
