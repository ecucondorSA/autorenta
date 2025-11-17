import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { BookingService } from '../core/services/booking.service';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-4 bg-white rounded shadow">
      <div class="text-sm text-gray-600 mb-2">Calendario (componente mínimo)</div>
      <label class="block">
        Fecha inicio
        <input type="datetime-local" (change)="onStart($any($event.target).value)" />
      </label>
      <label class="block mt-2">
        Fecha fin
        <input type="datetime-local" (change)="onEnd($any($event.target).value)" />
      </label>
      <div class="mt-2">
        <button class="px-3 py-1 bg-blue-600 text-white rounded" (click)="checkAndEmit()">
          Seleccionar rango
        </button>
      </div>
      <div *ngIf="available === false" class="text-red-600 mt-2">
        El rango seleccionado no está disponible.
      </div>
      <div *ngIf="available === true" class="text-green-600 mt-2">Rango disponible.</div>
    </div>
  `,
  styles: [],
})
export class CalendarComponent {
  @Input() carId?: string;
  @Output() rangeSelected = new EventEmitter<{ start: string; end: string }>();

  private bookingService = inject(BookingService);

  start?: string;
  end?: string;
  available?: boolean | null = null;

  onStart(v: string) {
    this.start = v;
    this.available = null;
  }

  onEnd(v: string) {
    this.end = v;
    this.available = null;
  }

  async checkAndEmit() {
    if (!this.start || !this.end || !this.carId) return;
    try {
      const startIso = new Date(this.start).toISOString();
      const endIso = new Date(this.end).toISOString();
      const ok = await this.bookingService.checkAvailability(this.carId, startIso, endIso);
      this.available = !!ok;
      if (ok) this.rangeSelected.emit({ start: startIso, end: endIso });
    } catch (e) {
      this.available = false;
      console.error('availability check failed', e);
    }
  }
}
