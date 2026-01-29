import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { Booking, BookingExtensionRequest } from '@core/models';
import { BookingsService } from '@core/services/bookings/bookings.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  calendarOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  hourglassOutline,
  timeOutline,
} from 'ionicons/icons';

/**
 * Booking Extensions Manager Component
 *
 * Handles all extension-related functionality:
 * - Displaying pending extension requests
 * - Allowing owners to approve/reject extensions
 * - Allowing renters to request extensions
 *
 * Extracted from BookingDetailPage to reduce complexity.
 */
@Component({
  selector: 'app-booking-extensions-manager',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonIcon],
  template: `
    <!-- Extension Requests Section -->
    @if (hasPendingRequests() || canRequestExtension()) {
      <div class="card-premium p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold text-text-primary flex items-center gap-2">
            <ion-icon name="calendar-outline" class="text-info-600"></ion-icon>
            Extensiones de Reserva
          </h3>

          @if (canRequestExtension()) {
            <button
              (click)="requestExtension()"
              [disabled]="processing()"
              class="flex items-center gap-2 px-4 py-2 rounded-xl bg-info-50 text-info-700 font-semibold hover:bg-info-100 transition-colors border border-info-200 text-sm"
            >
              <ion-icon name="add-outline"></ion-icon>
              Solicitar Extensión
            </button>
          }
        </div>

        <!-- Loading State -->
        @if (loading()) {
          <div class="flex items-center justify-center py-8">
            <div
              class="w-8 h-8 border-3 border-surface-secondary border-t-info-500 rounded-full animate-spin"
            ></div>
          </div>
        }

        <!-- Pending Requests List -->
        @if (!loading() && hasPendingRequests()) {
          <div class="space-y-3">
            @for (request of pendingRequests(); track request.id) {
              <div class="p-4 rounded-xl border border-border-default bg-surface-secondary">
                <div class="flex items-start justify-between gap-4">
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-2">
                      <span
                        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                        [class]="getStatusClasses(request.status || 'pending')"
                      >
                        <ion-icon [name]="getStatusIcon(request.status || 'pending')"></ion-icon>
                        {{ getStatusLabel(request.status || 'pending') }}
                      </span>
                    </div>

                    <p class="text-sm text-text-primary font-medium mb-1">
                      Nueva fecha de fin:
                      <span class="font-bold">{{
                        request.requested_end_at ?? request.new_end_at | date: 'EEEE d MMMM, HH:mm'
                      }}</span>
                    </p>

                    <p class="text-xs text-text-secondary">
                      Costo adicional estimado:
                      <span class="font-semibold text-text-primary">
                        {{
                          (request.additional_cost_cents ??
                            request.additional_amount_cents ??
                            request.estimated_cost_amount ??
                            0) / 100 | currency: 'USD' : 'symbol' : '1.0-0'
                        }}
                      </span>
                    </p>

                    @if (request.reason) {
                      <p class="text-xs text-text-muted mt-2 italic">"{{ request.reason }}"</p>
                    }
                  </div>

                  <!-- Action Buttons (Owner Only) -->
                  @if (isOwner() && (request.status || 'pending') === 'pending') {
                    <div class="flex flex-col gap-2">
                      <button
                        (click)="approveExtension(request.id)"
                        [disabled]="processing()"
                        class="px-4 py-2 rounded-lg bg-success-600 text-white font-semibold text-sm hover:bg-success-700 transition-colors disabled:opacity-50"
                      >
                        Aprobar
                      </button>
                      <button
                        (click)="rejectExtension(request.id)"
                        [disabled]="processing()"
                        class="px-4 py-2 rounded-lg border border-border-default text-text-secondary font-semibold text-sm hover:bg-surface-hover transition-colors disabled:opacity-50"
                      >
                        Rechazar
                      </button>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        }

        <!-- Empty State -->
        @if (!loading() && !hasPendingRequests()) {
          <div class="text-center py-6 text-text-muted">
            <ion-icon name="calendar-outline" class="text-3xl mb-2"></ion-icon>
            <p class="text-sm">No hay solicitudes de extensión pendientes.</p>
          </div>
        }
      </div>
    }
  `,
})
export class BookingExtensionsManagerComponent implements OnInit {
  private readonly bookingsService = inject(BookingsService);
  private readonly logger = inject(LoggerService).createChildLogger('BookingExtensionsManager');

  // Inputs
  readonly booking = input.required<Booking>();
  readonly isOwner = input.required<boolean>();
  readonly isRenter = input.required<boolean>();

  // Outputs
  readonly extensionApproved = output<BookingExtensionRequest>();
  readonly extensionRejected = output<BookingExtensionRequest>();
  readonly extensionRequested = output<BookingExtensionRequest>();
  readonly bookingUpdated = output<Booking>();

  // State
  readonly pendingRequests = signal<BookingExtensionRequest[]>([]);
  readonly loading = signal(false);
  readonly processing = signal(false);

  // Computed
  readonly hasPendingRequests = computed(() => this.pendingRequests().length > 0);

  readonly canRequestExtension = computed(() => {
    const booking = this.booking();
    return this.isRenter() && booking?.status === 'in_progress';
  });

  constructor() {
    addIcons({
      calendarOutline,
      addOutline,
      hourglassOutline,
      checkmarkCircleOutline,
      closeCircleOutline,
      timeOutline,
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadPendingRequests();
  }

  async loadPendingRequests(): Promise<void> {
    const booking = this.booking();
    if (!booking) return;

    this.loading.set(true);
    try {
      const requests = await this.bookingsService.getPendingExtensionRequests(booking.id);
      this.pendingRequests.set(requests);
    } catch (error) {
      this.logger.error('Error loading extension requests:', error);
    } finally {
      this.loading.set(false);
    }
  }

  async requestExtension(): Promise<void> {
    const booking = this.booking();
    if (!booking) return;

    const daysStr = prompt('¿Cuántos días adicionales necesitas?', '1');
    if (!daysStr) return;

    const days = parseInt(daysStr, 10);
    if (isNaN(days) || days < 1) {
      alert('Por favor ingresa un número válido de días.');
      return;
    }

    const currentEndDate = new Date(booking.end_at);
    const newEndDate = new Date(currentEndDate);
    newEndDate.setDate(newEndDate.getDate() + days);

    if (
      !confirm(
        `¿Confirmas solicitar extender la reserva hasta el ${newEndDate.toLocaleDateString()}? El anfitrión deberá aprobarla.`,
      )
    ) {
      return;
    }

    this.processing.set(true);
    try {
      const result = await this.bookingsService.requestExtension(booking.id, newEndDate);
      if (result.success) {
        alert(
          `Solicitud de extensión enviada exitosamente por un costo estimado de ${result.additionalCost}. Esperando aprobación del anfitrión.`,
        );
        await this.loadPendingRequests();

        // Reload booking
        const updated = await this.bookingsService.getBookingById(booking.id);
        if (updated) {
          this.bookingUpdated.emit(updated);
        }
      } else {
        alert('Error al solicitar extensión: ' + result.error);
      }
    } catch (error) {
      this.logger.error('Error requesting extension:', error);
      alert('Ocurrió un error inesperado al solicitar la extensión.');
    } finally {
      this.processing.set(false);
    }
  }

  async approveExtension(requestId: string): Promise<void> {
    if (!confirm('¿Confirmas que quieres aprobar esta solicitud de extensión?')) return;

    this.processing.set(true);
    try {
      const result = await this.bookingsService.approveExtensionRequest(requestId);
      if (result.success) {
        alert('Solicitud de extensión aprobada y reserva actualizada.');
        await this.loadPendingRequests();

        // Reload booking
        const booking = this.booking();
        if (booking) {
          const updated = await this.bookingsService.getBookingById(booking.id);
          if (updated) {
            this.bookingUpdated.emit(updated);
          }
        }
      } else {
        alert('Error al aprobar extensión: ' + result.error);
      }
    } catch (error) {
      this.logger.error('Error approving extension:', error);
      alert('Ocurrió un error inesperado al aprobar la extensión.');
    } finally {
      this.processing.set(false);
    }
  }

  async rejectExtension(requestId: string): Promise<void> {
    const reason = prompt('¿Por qué rechazas esta solicitud de extensión? (Opcional)');

    if (!confirm('¿Confirmas que quieres rechazar esta solicitud de extensión?')) return;

    this.processing.set(true);
    try {
      const result = await this.bookingsService.rejectExtensionRequest(requestId, reason || '');
      if (result.success) {
        alert('Solicitud de extensión rechazada.');
        await this.loadPendingRequests();
      } else {
        alert('Error al rechazar extensión: ' + result.error);
      }
    } catch (error) {
      this.logger.error('Error rejecting extension:', error);
      alert('Ocurrió un error inesperado al rechazar la extensión.');
    } finally {
      this.processing.set(false);
    }
  }

  getStatusClasses(status: string): string {
    const classMap: Record<string, string> = {
      pending: 'bg-warning-100 text-warning-700 border border-warning-300',
      approved: 'bg-success-100 text-success-700 border border-success-300',
      rejected: 'bg-error-100 text-error-700 border border-error-300',
    };
    return classMap[status] ?? 'bg-surface-secondary text-text-secondary';
  }

  getStatusIcon(status: string): string {
    const iconMap: Record<string, string> = {
      pending: 'hourglass-outline',
      approved: 'checkmark-circle-outline',
      rejected: 'close-circle-outline',
    };
    return iconMap[status] ?? 'time-outline';
  }

  getStatusLabel(status: string): string {
    const labelMap: Record<string, string> = {
      pending: 'Pendiente',
      approved: 'Aprobada',
      rejected: 'Rechazada',
    };
    return labelMap[status] ?? status;
  }
}
