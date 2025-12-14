
import {Component, Input,
  ChangeDetectionStrategy} from '@angular/core';

export interface BookingOpsData {
  payment_note?: string | null;
  payment_date?: string | null;
  pickup_confirmed_at?: string | null;
  dropoff_confirmed_at?: string | null;
  owner_confirmation_at?: string | null;
  renter_confirmation_at?: string | null;
  returned_at?: string | null;
  funds_released_at?: string | null;
  cancellation_reason?: string | null;
  cancellation_fee_cents?: number | null;
  cancelled_at?: string | null;
}

@Component({
  selector: 'app-booking-ops-timeline',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div
      class="rounded-xl border border-border-default dark:border-neutral-800/60 bg-surface-raised dark:bg-surface-secondary p-4 space-y-4"
      >
      <h3 class="text-sm font-semibold text-text-primary">Operaciones</h3>
    
      <div class="space-y-3 text-sm">
        @for (item of timeline; track item) {
          <div class="flex justify-between items-start" [class.opacity-60]="!item.date">
            <div>
              <p class="font-medium">{{ item.label }}</p>
              @if (item.note) {
                <p class="text-xs text-text-secondary">{{ item.note }}</p>
              }
            </div>
            <span class="text-xs font-mono text-text-secondary">
              {{ item.date || '—' }}
            </span>
          </div>
        }
      </div>
    
      @if (data.cancellation_reason || data.cancellation_fee_cents) {
        <div
          class="pt-3 border-t border-border-default/60 dark:border-neutral-700 text-sm"
          >
          <p class="font-semibold text-error-strong">Cancelación</p>
          @if (data.cancellation_reason) {
            <p class="text-text-secondary">
              Motivo: {{ data.cancellation_reason }}
            </p>
          }
          @if (data.cancellation_fee_cents !== null && data.cancellation_fee_cents !== undefined) {
            <p
              class="text-text-secondary"
              >
              Fee: {{ formatCents(data.cancellation_fee_cents) }}
            </p>
          }
          @if (data.cancelled_at) {
            <p class="text-xs text-text-secondary/80">
              Cancelado: {{ data.cancelled_at }}
            </p>
          }
        </div>
      }
    </div>
    `,
})
export class BookingOpsTimelineComponent {
  @Input({ required: true }) data!: BookingOpsData;

  get timeline() {
    return [
      { label: 'Pago', date: this.data.payment_date, note: this.data.payment_note },
      { label: 'Confirmación pickup', date: this.data.pickup_confirmed_at },
      { label: 'Confirmación dropoff', date: this.data.dropoff_confirmed_at },
      { label: 'Owner confirmó', date: this.data.owner_confirmation_at },
      { label: 'Renter confirmó pago', date: this.data.renter_confirmation_at },
      { label: 'Devuelto', date: this.data.returned_at },
      { label: 'Fondos liberados', date: this.data.funds_released_at },
    ];
  }

  formatCents(cents: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  }
}
