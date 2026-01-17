import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  inject,
  computed,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IconComponent } from '@shared/components/icon/icon.component';
import { HoverLiftDirective } from '@shared/directives/hover-lift.directive';
import { PressScaleDirective } from '@shared/directives/press-scale.directive';
import { ToastService } from '@core/services/ui/toast.service';
import { BookingConfirmationService } from '@core/services/bookings/booking-confirmation.service';
import { AuthService } from '@core/services/auth/auth.service';
import { BookingsStore } from '@core/stores/bookings.store';
import type { Booking } from '@core/models';

type ActionType = 'confirm-return' | 'complete-payment' | 'pending-approval';

interface StepInfo {
  label: string;
  description: string;
  status: 'completed' | 'current' | 'pending';
}

/**
 * PendingActionView - Single Focused Action Mode
 *
 * Shown when user needs to take a specific action.
 * UI is laser-focused on ONE task: no distractions.
 *
 * Action Types:
 * - confirm-return: User needs to confirm vehicle return
 * - complete-payment: User needs to finish payment
 * - pending-approval: Waiting for owner approval (P2P)
 */
@Component({
  standalone: true,
  selector: 'app-pending-action-view',
  imports: [
    CommonModule,
    RouterLink,
    IconComponent,
    HoverLiftDirective,
    PressScaleDirective,
  ],
  template: `
    <div class="min-h-screen bg-surface-primary pb-24">
      <!-- Header -->
      <header class="glass-navbar sticky top-0 z-10 px-4 py-4 pt-safe">
        <div class="max-w-2xl mx-auto flex items-center gap-3">
          <a routerLink="/bookings" class="p-2 -ml-2 rounded-full hover:bg-surface-secondary transition-colors">
            <app-icon name="chevron-left" class="w-5 h-5 text-text-secondary" />
          </a>
          <h1 class="text-lg font-semibold text-text-primary">
            {{ headerTitle() }}
          </h1>
        </div>
      </header>

      <main class="px-4 max-w-2xl mx-auto space-y-6 pt-4">
        <!-- Alert Banner -->
        <section
          class="p-4 rounded-xl"
          [class]="alertBannerClass()"
        >
          <div class="flex items-start gap-3">
            <span class="text-2xl">{{ alertIcon() }}</span>
            <div class="flex-1">
              <p class="font-medium" [class]="alertTextClass()">
                {{ alertTitle() }}
              </p>
              <p class="text-sm mt-1 opacity-80" [class]="alertTextClass()">
                {{ alertDescription() }}
              </p>
            </div>
          </div>
        </section>

        <!-- Stepper -->
        <section class="glass-card p-6 rounded-xl">
          <div class="flex items-center justify-between mb-6">
            @for (step of steps(); track step.label; let i = $index; let last = $last) {
              <!-- Step circle -->
              <div class="flex flex-col items-center">
                <div
                  class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all"
                  [class.bg-success-500]="step.status === 'completed'"
                  [class.text-white]="step.status === 'completed'"
                  [class.bg-primary-500]="step.status === 'current'"
                  [class.text-white]="step.status === 'current'"
                  [class.ring-4]="step.status === 'current'"
                  [class.ring-primary-200]="step.status === 'current'"
                  [class.bg-surface-secondary]="step.status === 'pending'"
                  [class.text-text-tertiary]="step.status === 'pending'"
                >
                  @if (step.status === 'completed') {
                    <app-icon name="check" class="w-5 h-5" />
                  } @else {
                    {{ i + 1 }}
                  }
                </div>
                <span class="text-xs text-text-secondary mt-2 text-center max-w-[80px]">
                  {{ step.label }}
                </span>
              </div>

              <!-- Connector line -->
              @if (!last) {
                <div
                  class="flex-1 h-1 mx-2 rounded-full transition-all"
                  [class.bg-success-500]="step.status === 'completed'"
                  [class.bg-border-default]="step.status !== 'completed'"
                ></div>
              }
            }
          </div>

          <!-- Current step description -->
          <div class="text-center">
            <p class="text-text-secondary text-sm">
              {{ currentStepDescription() }}
            </p>
          </div>
        </section>

        <!-- Booking Info Card -->
        <section class="glass-card p-4 rounded-xl" hoverLift>
          <div class="flex items-center gap-4">
            @if (carImageUrl()) {
              <img
                [src]="carImageUrl()"
                [alt]="carName()"
                class="w-20 h-14 object-cover rounded-lg"
              />
            }
            <div class="flex-1">
              <h2 class="font-semibold text-text-primary">{{ carName() }}</h2>
              <p class="text-sm text-text-secondary">{{ dateRange() }}</p>
            </div>
          </div>
        </section>

        <!-- Action-specific content -->
        @switch (actionType) {
          @case ('confirm-return') {
            <section class="space-y-4">
              <!-- Return confirmation info -->
              <div class="glass-card p-4 rounded-xl">
                <h3 class="font-medium text-text-primary flex items-center gap-2 mb-3">
                  <app-icon name="info" class="w-5 h-5 text-info-500" />
                  ¿Qué verificar?
                </h3>
                <ul class="space-y-2 text-sm text-text-secondary">
                  <li class="flex items-start gap-2">
                    <span class="text-success-500">✓</span>
                    <span>El vehículo fue devuelto en el mismo estado</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <span class="text-success-500">✓</span>
                    <span>No hay daños nuevos</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <span class="text-success-500">✓</span>
                    <span>El tanque tiene el nivel acordado</span>
                  </li>
                </ul>
              </div>

              <!-- Problem report link -->
              <div class="text-center">
                <a
                  [routerLink]="['/bookings', booking.id, 'report-claim']"
                  class="text-sm text-text-secondary underline hover:text-text-primary"
                >
                  ¿Hubo algún problema? Reportar aquí
                </a>
              </div>
            </section>
          }

          @case ('complete-payment') {
            <section class="space-y-4">
              <!-- Payment info -->
              <div class="glass-card p-4 rounded-xl">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-text-secondary">Total a pagar</span>
                  <span class="text-xl font-bold text-text-primary">
                    {{ booking.total_amount | currency:'ARS':'symbol':'1.0-0' }}
                  </span>
                </div>
                <p class="text-xs text-text-tertiary">
                  Incluye cobertura básica y tasas de servicio
                </p>
              </div>

              <!-- Security note -->
              <div class="glass-card p-4 rounded-xl bg-info-bg/50">
                <div class="flex items-start gap-3">
                  <span class="text-lg">🔒</span>
                  <div>
                    <p class="text-sm text-info-text font-medium">Pago seguro</p>
                    <p class="text-xs text-info-text/80 mt-1">
                      Tu pago está protegido por MercadoPago. Los fondos se retienen hasta confirmar la entrega.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          }

          @case ('pending-approval') {
            <section class="space-y-4">
              <!-- Waiting indicator -->
              <div class="glass-card p-6 rounded-xl text-center">
                <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-warning-bg flex items-center justify-center">
                  <div class="w-8 h-8 border-3 border-warning-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <h3 class="font-medium text-text-primary">Esperando al Propietario</h3>
                <p class="text-sm text-text-secondary mt-2">
                  Te notificaremos cuando responda tu solicitud.
                </p>
              </div>

              <!-- Contact owner -->
              <a
                [routerLink]="['/messages/chat']"
                [queryParams]="{bookingId: booking.id, userId: booking.owner_id}"
                class="glass-card p-4 rounded-xl flex items-center justify-between"
                hoverLift
                pressScale
              >
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-primary-bg flex items-center justify-center">
                    <app-icon name="message-circle" class="w-5 h-5 text-primary-500" />
                  </div>
                  <span class="font-medium text-text-primary">Contactar propietario</span>
                </div>
                <app-icon name="chevron-right" class="w-5 h-5 text-text-secondary" />
              </a>
            </section>
          }
        }

        <!-- Primary CTA -->
        <section class="pt-4 space-y-3">
          @if (actionType !== 'pending-approval') {
            <button
              type="button"
              (click)="handlePrimaryAction()"
              [disabled]="loading()"
              class="w-full btn-primary flex items-center justify-center gap-2 py-4 rounded-xl font-medium text-lg disabled:opacity-50"
              pressScale
            >
              @if (loading()) {
                <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              } @else {
                <app-icon [name]="ctaIcon()" class="w-5 h-5" />
              }
              {{ ctaLabel() }}
            </button>
          }

          <!-- View details link -->
          <a
            [routerLink]="['/bookings', booking.id]"
            class="w-full flex items-center justify-center gap-2 py-3 text-primary-500 font-medium"
            pressScale
          >
            Ver todos los detalles
          </a>
        </section>
      </main>
    </div>
  `,
  styles: [`
    .pt-safe {
      padding-top: env(safe-area-inset-top);
    }

    .btn-primary {
      background: linear-gradient(135deg, var(--primary-500), var(--primary-600));
      color: white;
      transition: all 0.2s ease;
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(var(--primary-500-rgb), 0.3);
    }

    .border-3 {
      border-width: 3px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PendingActionViewComponent {
  @Input({ required: true }) booking!: Booking;
  @Input() actionType: ActionType = 'complete-payment';

  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  private readonly confirmationService = inject(BookingConfirmationService);
  private readonly authService = inject(AuthService);
  private readonly store = inject(BookingsStore);

  readonly loading = signal(false);

  // Computed values
  readonly carName = computed(() => {
    const { car_brand, car_model, car_year } = this.booking;
    if (car_brand && car_model) {
      return `${car_brand} ${car_model}${car_year ? ` ${car_year}` : ''}`;
    }
    return 'Tu vehículo';
  });

  readonly carImageUrl = computed(() => {
    return this.booking.main_photo_url || this.booking.car_image || null;
  });

  readonly dateRange = computed(() => {
    const start = this.booking.start_at ? new Date(this.booking.start_at) : null;
    const end = this.booking.end_at ? new Date(this.booking.end_at) : null;

    if (!start) return '';

    const formatDate = (d: Date) =>
      d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });

    return end
      ? `${formatDate(start)} - ${formatDate(end)}`
      : formatDate(start);
  });

  readonly headerTitle = computed(() => {
    switch (this.actionType) {
      case 'confirm-return':
        return 'Confirmar Devolución';
      case 'complete-payment':
        return 'Completar Pago';
      case 'pending-approval':
        return 'Solicitud Pendiente';
    }
  });

  readonly alertIcon = computed(() => {
    switch (this.actionType) {
      case 'confirm-return':
        return '🔍';
      case 'complete-payment':
        return '💳';
      case 'pending-approval':
        return '⏳';
    }
  });

  readonly alertTitle = computed(() => {
    switch (this.actionType) {
      case 'confirm-return':
        return 'El propietario ya confirmó la devolución';
      case 'complete-payment':
        return 'Completa el pago para confirmar tu reserva';
      case 'pending-approval':
        return 'Tu solicitud está siendo revisada';
    }
  });

  readonly alertDescription = computed(() => {
    switch (this.actionType) {
      case 'confirm-return':
        return 'Verificá que todo esté en orden y confirmá para liberar los fondos.';
      case 'complete-payment':
        return 'El auto está reservado para vos. Completá el pago antes de que expire.';
      case 'pending-approval':
        return 'El propietario está evaluando tu perfil. Te avisaremos cuando responda.';
    }
  });

  readonly alertBannerClass = computed(() => {
    switch (this.actionType) {
      case 'confirm-return':
        return 'bg-info-bg border border-info-200';
      case 'complete-payment':
        return 'bg-warning-bg border border-warning-200';
      case 'pending-approval':
        return 'bg-surface-secondary border border-border-default';
    }
  });

  readonly alertTextClass = computed(() => {
    switch (this.actionType) {
      case 'confirm-return':
        return 'text-info-text';
      case 'complete-payment':
        return 'text-warning-text';
      case 'pending-approval':
        return 'text-text-primary';
    }
  });

  readonly steps = computed<StepInfo[]>(() => {
    switch (this.actionType) {
      case 'confirm-return':
        return [
          { label: 'Devolución', description: 'Auto devuelto', status: 'completed' },
          { label: 'Inspección', description: 'Verificar estado', status: 'current' },
          { label: 'Fondos', description: 'Liberación de garantía', status: 'pending' },
        ];
      case 'complete-payment':
        return [
          { label: 'Reserva', description: 'Reserva creada', status: 'completed' },
          { label: 'Pago', description: 'Completar pago', status: 'current' },
          { label: 'Confirmación', description: 'Reserva confirmada', status: 'pending' },
        ];
      case 'pending-approval':
        return [
          { label: 'Solicitud', description: 'Solicitud enviada', status: 'completed' },
          { label: 'Revisión', description: 'Propietario revisando', status: 'current' },
          { label: 'Respuesta', description: 'Aprobación o rechazo', status: 'pending' },
        ];
    }
  });

  readonly currentStepDescription = computed(() => {
    const currentStep = this.steps().find(s => s.status === 'current');
    return currentStep?.description ?? '';
  });

  readonly ctaLabel = computed(() => {
    switch (this.actionType) {
      case 'confirm-return':
        return 'Confirmar Devolución';
      case 'complete-payment':
        return 'Ir al Checkout';
      case 'pending-approval':
        return 'Esperando...';
    }
  });

  readonly ctaIcon = computed(() => {
    switch (this.actionType) {
      case 'confirm-return':
        return 'check-circle';
      case 'complete-payment':
        return 'credit-card';
      case 'pending-approval':
        return 'clock';
    }
  });

  async handlePrimaryAction(): Promise<void> {
    switch (this.actionType) {
      case 'confirm-return':
        await this.confirmReturn();
        break;
      case 'complete-payment':
        this.router.navigate(['/bookings', this.booking.id, 'checkout']);
        break;
    }
  }

  private async confirmReturn(): Promise<void> {
    this.loading.set(true);

    try {
      const userId = this.authService.userId();
      if (!userId) {
        this.toastService.error('Error', 'Debes iniciar sesión para confirmar');
        return;
      }

      // Call the confirm return endpoint using the confirmation service
      const result = await this.confirmationService.confirmRenter({
        booking_id: this.booking.id,
        confirming_user_id: userId,
      });

      if (result.success) {
        this.toastService.success(
          'Devolución confirmada',
          result.funds_released
            ? 'Los fondos han sido liberados.'
            : 'Esperando confirmación del propietario.'
        );
        // Reload bookings to update UI
        await this.store.loadMyBookings({ force: true });
        this.router.navigate(['/bookings']);
      } else {
        this.toastService.error(
          'Error',
          result.message ?? 'No se pudo confirmar la devolución'
        );
      }
    } catch (error) {
      const err = error as { message?: string };
      this.toastService.error(
        'Error',
        err.message ?? 'Ocurrió un error al confirmar la devolución'
      );
    } finally {
      this.loading.set(false);
    }
  }
}
