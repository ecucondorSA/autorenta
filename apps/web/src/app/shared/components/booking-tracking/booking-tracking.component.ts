import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export interface TrackingSessionSnapshot {
  active: boolean;
  started_at: string;
  ended_at?: string | null;
  points_count?: number;
}

@Component({
  selector: 'app-booking-tracking',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="rounded-xl border border-border-default dark:border-neutral-800/60 bg-surface-raised dark:bg-surface-secondary p-4 space-y-3"
    >
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold text-text-primary">Tracking del viaje</h3>
        <span
          class="px-2 py-1 rounded-full text-xs font-semibold"
          [ngClass]="
            session?.active
              ? 'bg-success-light/20 text-success-strong'
              : 'bg-warning-bg text-warning-600'
          "
        >
          {{ session?.active ? 'Activo' : 'Inactivo' }}
        </span>
      </div>

      <ng-container *ngIf="session; else empty">
        <p class="text-sm text-text-secondary">Inicio: {{ session?.started_at || '—' }}</p>
        <p class="text-sm text-text-secondary">Fin: {{ session?.ended_at || '—' }}</p>
        <p class="text-sm text-text-secondary" *ngIf="session?.points_count !== undefined">
          Puntos capturados: {{ session?.points_count }}
        </p>
        <div class="text-xs text-text-secondary/80">
          Ruta y mapa se mostrarán aquí cuando haya puntos GPS disponibles.
        </div>
      </ng-container>

      <ng-template #empty>
        <p class="text-sm text-text-secondary">Sin tracking disponible para esta reserva.</p>
      </ng-template>
    </div>
  `,
})
export class BookingTrackingComponent {
  @Input() session: TrackingSessionSnapshot | null = null;
}
