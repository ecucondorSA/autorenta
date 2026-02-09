import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { BookingUiStatus } from '@core/models';

interface TripStep {
  label: string;
  icon: string;
  completed: boolean;
  active: boolean;
}

/**
 * TripProgressBar — Atom component
 *
 * Visual horizontal step indicator for booking lifecycle:
 * Reserva → Pago → Retiro → En Viaje → Devolución → Completado
 *
 * Highlights the current step based on booking status.
 */
@Component({
  selector: 'app-trip-progress-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="w-full" role="progressbar" [attr.aria-valuenow]="currentStepIndex()" [attr.aria-valuemax]="5">
      <!-- Steps -->
      <div class="flex items-center justify-between relative">
        <!-- Connecting line -->
        <div class="absolute top-4 left-4 right-4 h-0.5 bg-slate-200"></div>
        <div
          class="absolute top-4 left-4 h-0.5 bg-emerald-500 transition-all duration-500"
          [style.width.%]="progressPercent()"></div>

        @for (step of steps(); track step.label) {
          <div class="relative flex flex-col items-center gap-1 z-10">
            <!-- Circle -->
            <div
              class="w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all duration-300"
              [class]="step.completed
                ? 'bg-emerald-500 text-white shadow-sm'
                : step.active
                  ? 'bg-blue-500 text-white shadow-md ring-2 ring-blue-200'
                  : 'bg-white text-slate-400 border-2 border-slate-200'">
              {{ step.icon }}
            </div>
            <!-- Label -->
            <span
              class="text-[10px] font-medium max-w-[4rem] text-center leading-tight"
              [class]="step.completed
                ? 'text-emerald-600'
                : step.active
                  ? 'text-blue-600'
                  : 'text-slate-400'">
              {{ step.label }}
            </span>
          </div>
        }
      </div>
    </div>
  `,
})
export class TripProgressBarComponent {
  readonly status = input.required<BookingUiStatus | string>();

  private static readonly STEP_DEFINITIONS: { label: string; icon: string; statuses: string[] }[] = [
    { label: 'Reserva', icon: '📝', statuses: ['pending', 'pending_payment', 'pending_deposit', 'pending_approval', 'pending_owner_approval'] },
    { label: 'Pago', icon: '💳', statuses: ['confirmed'] },
    { label: 'Retiro', icon: '🔑', statuses: [] },
    { label: 'En Viaje', icon: '🚗', statuses: ['in_progress'] },
    { label: 'Devolución', icon: '🔄', statuses: ['pending_return', 'returned', 'pending_review', 'inspected_good', 'damage_reported'] },
    { label: 'Completado', icon: '🏁', statuses: ['completed'] },
  ];

  protected readonly currentStepIndex = computed(() => {
    const s = this.status();
    const idx = TripProgressBarComponent.STEP_DEFINITIONS.findIndex(step =>
      step.statuses.includes(s),
    );
    return idx >= 0 ? idx : 0;
  });

  protected readonly progressPercent = computed(() => {
    const total = TripProgressBarComponent.STEP_DEFINITIONS.length - 1;
    return total > 0 ? (this.currentStepIndex() / total) * 100 : 0;
  });

  protected readonly steps = computed<TripStep[]>(() => {
    const currentIdx = this.currentStepIndex();
    return TripProgressBarComponent.STEP_DEFINITIONS.map((step, i) => ({
      label: step.label,
      icon: step.icon,
      completed: i < currentIdx,
      active: i === currentIdx,
    }));
  });
}
