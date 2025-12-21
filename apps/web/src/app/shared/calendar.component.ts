
import {Component, EventEmitter, Input, Output, inject,
  ChangeDetectionStrategy} from '@angular/core';
import { CarAvailabilityService } from '@core/services/cars/car-availability.service';

@Component({
  selector: 'app-calendar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
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
      @if (available === false) {
        <div class="text-red-600 mt-2">
          El rango seleccionado no está disponible.
        </div>
      }
      @if (available === true) {
        <div class="text-green-600 mt-2">Rango disponible.</div>
      }
    </div>
    `,
  styles: [],
})
export class CalendarComponent {
  @Input() carId?: string;
  @Output() rangeSelected = new EventEmitter<{ start: string; end: string }>();
  private availabilityService = inject(CarAvailabilityService);

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

      // Consultar disponibilidad real vía RPC (Supabase)
      const ok = await this.availabilityService.checkAvailability(
        this.carId,
        startIso.slice(0, 10),
        endIso.slice(0, 10),
      );
      this.available = !!ok;
      if (ok) this.rangeSelected.emit({ start: startIso, end: endIso });
    } catch (e) {
      this.available = false;
      console.error('availability check failed', e);
    }
  }
}
