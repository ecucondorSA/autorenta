import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BookingsService } from '../../core/services/bookings.service';
import { CarAvailabilityService } from '../../core/services/car-availability.service';
import type { BlockedDateRange } from '../../shared/components/date-range-picker/date-range-picker.component';
import { DateRangePickerComponent } from '../../shared/components/date-range-picker/date-range-picker.component';

@Component({
  standalone: true,
  selector: 'app-car-booking-demo',
  imports: [CommonModule, DateRangePickerComponent, FormsModule],
  template: `
    <div class="container mx-auto p-4">
      <h2 class="text-xl font-semibold mb-4">Demo: Request Booking</h2>

      <div class="mb-4">
        <label class="block text-sm font-medium mb-1">Car ID</label>
        <input
          [(ngModel)]="carId"
          class="w-full p-2 border rounded"
          placeholder="Enter car id (uuid) or use a test id"
        />
      </div>

      <div class="mb-4">
        <app-date-range-picker
          [carId]="carId"
          [blockedRanges]="blockedRanges"
          [availabilityChecker]="availabilityChecker"
          (rangeChange)="onRangeChange($event)"
        ></app-date-range-picker>

        <div class="mt-2 flex gap-2 items-center">
          <button class="px-3 py-1 border rounded" (click)="onCarIdChanged(carId)">Cargar</button>
          <small class="text-sm text-muted">Blocked ranges: {{ blockedRanges.length }}</small>
        </div>
      </div>

      <div class="flex gap-2 items-center">
        <button
          (click)="request()"
          class="px-4 py-2 bg-cta-default text-white rounded"
          [disabled]="!canRequest()"
        >
          Request Booking
        </button>
        <div *ngIf="loading">Processing...</div>
      </div>

      <div *ngIf="result" class="mt-4 p-3 border rounded bg-surface-raised">
        <h3 class="font-medium">Result</h3>
        <pre>{{ result | json }}</pre>
      </div>

      <div *ngIf="error" class="mt-4 p-3 border rounded bg-red-50 text-red-800">
        <strong>Error:</strong> {{ error }}
      </div>
    </div>
  `,
})
export class CarBookingDemoPage {
  private _carId = '';
  get carId() {
    return this._carId;
  }
  set carId(value: string) {
    this._carId = value;
    void this.onCarIdChanged(value);
  }
  start: string | null = null;
  end: string | null = null;
  loading = false;
  result: any = null;
  error: string | null = null;
  blockedRanges: BlockedDateRange[] = [];
  availabilityChecker: ((carId: string, from: string, to: string) => Promise<boolean>) | null =
    null;

  private bookingsService = inject(BookingsService);
  private carAvailability = inject(CarAvailabilityService);

  onRangeChange(range: { from: string | null; to: string | null }) {
    this.start = range.from;
    this.end = range.to;
  }

  canRequest() {
    return !!this.carId && !!this.start && !!this.end && !this.loading;
  }

  async request() {
    if (!this.canRequest()) return;
    this.loading = true;
    this.error = null;
    this.result = null;
    try {
      const booking = await this.bookingsService.requestBooking(this.carId, this.start!, this.end!);
      this.result = booking;
    } catch (err: any) {
      this.error = err?.message || String(err);
    } finally {
      this.loading = false;
    }
  }

  async onCarIdChanged(id: string): Promise<void> {
    this.blockedRanges = [];
    this.availabilityChecker = null;
    if (!id) return;

    try {
      // Fetch blocked ranges for UI
      const ranges = await this.carAvailability.getBlockedDates(id);
      this.blockedRanges = ranges;
      this.availabilityChecker = this.carAvailability.createChecker(id);
    } catch (e) {
      console.warn('Demo: failed to load availability for', id, e);
    }
  }
}
