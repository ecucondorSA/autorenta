import {
  ChangeDetectionStrategy,
  Component,
  computed,
  EventEmitter,
  inject,
  Input,
  OnDestroy,
  OnInit,
  Output,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import type { Booking } from '@core/models';
import {
  BookingBilateralStateService,
  FlowStepInfo,
} from '@core/services/bookings/booking-bilateral-state.service';

export interface FlowActionEvent {
  actionType: 'navigate' | 'confirm' | 'resolve';
  route?: string;
  bookingId: string;
}

/**
 * BookingFlowCard
 *
 * Componente unificado que muestra el estado del flujo bilateral
 * de confirmación (owner ↔ renter) de forma clara y accionable.
 *
 * Características:
 * - Progress bar visual de 6 pasos
 * - Badge "Tu turno" cuando el usuario debe actuar
 * - Un solo botón de acción prominente
 * - Countdown para auto-release
 * - Mobile-first responsive
 */
@Component({
  selector: 'app-booking-flow-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="bg-surface-primary rounded-2xl border border-border-subtle shadow-lg overflow-hidden"
    >
      <!-- Header con estado actual -->
      <div class="px-4 py-3 bg-surface-secondary border-b border-border-subtle">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-text-secondary">Estado del viaje</span>
          @if (flowInfo().isYourTurn) {
            <span
              class="px-2 py-0.5 text-xs font-semibold rounded-full bg-cta-default text-cta-text"
            >
              Tu turno
            </span>
          }
        </div>
      </div>

      <!-- Progress Bar -->
      <div class="px-4 py-4">
        <div class="flex items-center justify-between mb-2">
          @for (step of steps; track step) {
            <div class="flex flex-col items-center flex-1">
              <!-- Step indicator -->
              <div
                class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors"
                [class.bg-success-strong]="step < flowInfo().step"
                [class.text-white]="step < flowInfo().step"
                [class.bg-cta-default]="step === flowInfo().step"
                [class.text-cta-text]="step === flowInfo().step"
                [class.ring-2]="step === flowInfo().step"
                [class.ring-cta-default/30]="step === flowInfo().step"
                [class.bg-surface-tertiary]="step > flowInfo().step"
                [class.text-text-tertiary]="step > flowInfo().step"
              >
                @if (step < flowInfo().step) {
                  <svg
                    class="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="3"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                } @else {
                  {{ step }}
                }
              </div>
              <!-- Connector line -->
              @if (step < 6) {
                <div
                  class="hidden sm:block absolute h-0.5 w-full top-3 -translate-y-1/2"
                  [class.bg-success-strong]="step < flowInfo().step"
                  [class.bg-border-subtle]="step >= flowInfo().step"
                ></div>
              }
            </div>
          }
        </div>
        <!-- Step labels (mobile: solo actual) -->
        <div class="text-center text-xs text-text-tertiary">
          Paso {{ flowInfo().step }} de {{ flowInfo().totalSteps }}
        </div>
      </div>

      <!-- Content -->
      <div class="px-4 pb-4">
        <!-- Title & Description -->
        <h3 class="text-lg font-semibold text-text-primary mb-1">
          {{ flowInfo().title }}
        </h3>
        <p class="text-sm text-text-secondary mb-4">
          {{ flowInfo().description }}
        </p>

        <!-- Damage Info (if applicable) -->
        @if (flowInfo().damageInfo?.hasDamages) {
          <div class="mb-4 p-3 rounded-lg bg-warning-bg border border-warning-strong/20">
            <div class="flex items-start gap-2">
              <svg
                class="w-5 h-5 text-warning-strong flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <p class="text-sm font-medium text-warning-strong">
                  Daños reportados: {{ formatMoney(flowInfo().damageInfo!.amountCents) }}
                </p>
                @if (flowInfo().damageInfo!.description) {
                  <p class="text-xs text-text-secondary mt-1">
                    {{ flowInfo().damageInfo!.description }}
                  </p>
                }
              </div>
            </div>
          </div>
        }

        <!-- Primary Action Button -->
        @if (flowInfo().action && flowInfo().isYourTurn) {
          <button
            type="button"
            (click)="handleAction()"
            class="w-full py-3 px-4 rounded-xl font-semibold text-base transition-all
                   bg-cta-default text-cta-text hover:bg-cta-hover active:scale-[0.98]"
          >
            {{ flowInfo().action!.label }}
          </button>
        }

        <!-- Waiting message (when not your turn) -->
        @if (flowInfo().actor !== 'none' && !flowInfo().isYourTurn) {
          <div class="py-3 px-4 rounded-xl bg-surface-tertiary text-center">
            <p class="text-sm text-text-secondary">
              @if (flowInfo().actor === 'owner') {
                Esperando al anfitrión...
              } @else {
                Esperando al viajero...
              }
            </p>
          </div>
        }

        <!-- Auto-release countdown -->
        @if (countdownDisplay()) {
          <div class="mt-3 flex items-center justify-center gap-2 text-xs text-text-tertiary">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Auto-liberación en: {{ countdownDisplay() }}</span>
          </div>
        }

        <!-- Next step preview -->
        @if (flowInfo().nextStepPreview && flowInfo().step < 6) {
          <div class="mt-3 text-xs text-text-tertiary text-center">
            Próximo: {{ flowInfo().nextStepPreview }}
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
export class BookingFlowCardComponent implements OnInit, OnDestroy {
  private readonly stateService = inject(BookingBilateralStateService);
  private readonly router = inject(Router);

  @Input({ required: true }) booking!: Booking;
  @Input({ required: true }) currentUserId!: string;

  @Output() actionRequested = new EventEmitter<FlowActionEvent>();

  readonly steps = [1, 2, 3, 4, 5, 6] as const;

  private countdownSeconds = signal<number | null>(null);
  private countdownInterval: ReturnType<typeof setInterval> | null = null;

  readonly flowInfo = computed<FlowStepInfo>(() => {
    if (!this.booking || !this.currentUserId) {
      return {
        state: 'CONFIRMED',
        step: 1,
        totalSteps: 6,
        title: 'Cargando...',
        description: '',
        actor: 'none',
        isYourTurn: false,
        action: null,
        nextStepPreview: '',
        autoReleaseCountdown: null,
        damageInfo: null,
      };
    }
    return this.stateService.getFlowStep(this.booking, this.currentUserId);
  });

  readonly countdownDisplay = computed(() => {
    const seconds = this.countdownSeconds();
    if (!seconds || seconds <= 0) return null;
    return this.stateService.formatCountdown(seconds);
  });

  ngOnInit(): void {
    this.startCountdown();
  }

  ngOnDestroy(): void {
    this.stopCountdown();
  }

  handleAction(): void {
    const action = this.flowInfo().action;
    if (!action) return;

    const event: FlowActionEvent = {
      actionType: action.actionType || 'navigate',
      route: action.route,
      bookingId: this.booking.id,
    };

    // Si hay ruta, navegar directamente
    if (action.route) {
      this.router.navigate(['/bookings', this.booking.id, action.route]);
    }

    // Emitir evento para que el padre pueda manejar acciones especiales
    this.actionRequested.emit(event);
  }

  formatMoney(cents: number): string {
    const dollars = cents / 100;
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(dollars);
  }

  private startCountdown(): void {
    const info = this.flowInfo();
    if (info.autoReleaseCountdown && info.autoReleaseCountdown > 0) {
      this.countdownSeconds.set(info.autoReleaseCountdown);

      this.countdownInterval = setInterval(() => {
        const current = this.countdownSeconds();
        if (current && current > 0) {
          this.countdownSeconds.set(current - 1);
        } else {
          this.stopCountdown();
        }
      }, 1000);
    }
  }

  private stopCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }
}
