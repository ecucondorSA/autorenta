import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, computed } from '@angular/core';
import { Booking } from '../../../core/models';

interface TimelineStep {
  id: number;
  label: string;
  description: string;
  status: 'completed' | 'current' | 'pending' | 'error';
  icon: string;
}

@Component({
  selector: 'app-booking-timeline',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div
      class="w-full py-6 px-4 bg-surface-raised rounded-2xl border border-border-default shadow-sm mb-6"
    >
      <!-- Mobile View: Simple Progress Bar -->
      <div class="md:hidden">
        <div class="flex justify-between items-center mb-2">
          <span class="text-sm font-bold text-text-primary">{{ currentStepLabel() }}</span>
          <span class="text-xs text-text-muted"
            >Paso {{ activeStepIndex() + 1 }} de {{ steps().length }}</span
          >
        </div>
        <div class="w-full h-2 bg-surface-secondary rounded-full overflow-hidden">
          <div
            class="h-full bg-cta-default transition-all duration-500 ease-out"
            [style.width.%]="progressPercentage()"
          ></div>
        </div>
      </div>

      <!-- Desktop View: Vertical/Horizontal Timeline -->
      <div class="hidden md:flex justify-between relative">
        <!-- Connecting Line -->
        <div class="absolute top-5 left-0 w-full h-0.5 bg-border-default -z-0"></div>
        <div
          class="absolute top-5 left-0 h-0.5 bg-cta-default transition-all duration-700 ease-in-out -z-0"
          [style.width.%]="progressPercentage()"
        ></div>

        @for (step of steps(); track step.id; let i = $index) {
          <div class="relative z-10 flex flex-col items-center w-1/5 group">
            <!-- Step Circle -->
            <div
              class="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2"
              [ngClass]="{
                'bg-cta-default border-cta-default text-white shadow-lg shadow-cta-default/20':
                  step.status === 'completed' || step.status === 'current',
                'bg-surface-base border-border-default text-text-muted': step.status === 'pending',
                'bg-error-bg border-error-strong text-error-strong': step.status === 'error',
              }"
            >
              @if (step.status === 'completed') {
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="3"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              } @else {
                <span class="text-sm font-bold">{{ i + 1 }}</span>
              }
            </div>

            <!-- Label -->
            <div class="mt-3 text-center">
              <p
                class="text-xs font-black uppercase tracking-tighter transition-colors"
                [ngClass]="{
                  'text-cta-default': step.status === 'current',
                  'text-text-primary': step.status === 'completed',
                  'text-text-muted': step.status === 'pending',
                }"
              >
                {{ step.label }}
              </p>
              <p
                class="text-[10px] text-text-muted leading-tight mt-1 opacity-0 group-hover:opacity-100 transition-opacity max-w-[80px] mx-auto"
              >
                {{ step.description }}
              </p>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class BookingTimelineComponent {
  @Input({ required: true }) booking!: Booking;

  steps = computed(() => {
    const s = this.booking?.status;
    const isOwnerAccepted = s !== 'pending' && s !== 'cancelled';
    const isPaid =
      s === 'confirmed' || s === 'in_progress' || s === 'completed' || s === 'returned';
    const isCheckedIn = s === 'in_progress' || s === 'completed' || s === 'returned';
    const isFinished = s === 'completed';

    const timeline: TimelineStep[] = [
      {
        id: 1,
        label: 'Solicitud',
        description: 'Aprobación del anfitrión',
        status: isOwnerAccepted ? 'completed' : s === 'pending' ? 'current' : 'error',
        icon: 'check',
      },
      {
        id: 2,
        label: 'Pago',
        description: 'Garantía y reserva',
        status: isPaid ? 'completed' : s === 'pending_payment' ? 'current' : 'pending',
        icon: 'wallet',
      },
      {
        id: 3,
        label: 'Contrato',
        description: 'Firma de Comodato',
        status: isPaid ? 'completed' : 'pending',
        icon: 'document',
      },
      {
        id: 4,
        label: 'Entrega',
        description: 'Inspección con IA',
        status: isCheckedIn ? 'completed' : isPaid && s === 'confirmed' ? 'current' : 'pending',
        icon: 'camera',
      },
      {
        id: 5,
        label: 'Viaje',
        description: 'Auto en posesión',
        status: isFinished ? 'completed' : s === 'in_progress' ? 'current' : 'pending',
        icon: 'car',
      },
    ];

    return timeline;
  });

  activeStepIndex = computed(() => {
    const activeIndex = this.steps().findIndex((s) => s.status === 'current');
    if (activeIndex !== -1) return activeIndex;

    // Si no hay 'current', pero hay completados, el progreso es el último completado
    const lastCompleted = [...this.steps()].reverse().findIndex((s) => s.status === 'completed');
    if (lastCompleted !== -1) return this.steps().length - 1 - lastCompleted;

    return 0;
  });

  progressPercentage = computed(() => {
    const index = this.activeStepIndex();
    const total = this.steps().length - 1;
    return (index / total) * 100;
  });

  currentStepLabel = computed(() => {
    return this.steps()[this.activeStepIndex()]?.label || 'Procesando';
  });
}
