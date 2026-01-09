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
import { Booking, TrafficInfraction } from '@core/models';
import { TrafficInfractionsService } from '@core/services/infrastructure/traffic-infractions.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  alertCircleOutline,
  carOutline,
  cashOutline,
  checkmarkCircleOutline,
  documentTextOutline,
  flagOutline,
  hourglassOutline,
  locationOutline,
  receiptOutline,
  timeOutline,
} from 'ionicons/icons';

/**
 * Booking Traffic Fines Manager Component
 *
 * Handles all traffic fine-related functionality:
 * - Displaying reported traffic fines
 * - Allowing owners to report new fines
 * - Allowing renters to dispute fines
 *
 * Extracted from BookingDetailPage to reduce complexity.
 */
@Component({
  selector: 'app-booking-traffic-fines-manager',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonIcon],
  template: `
    @if (hasFines() || canReportFine()) {
      <div class="card-premium p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold text-text-primary flex items-center gap-2">
            <ion-icon name="receipt-outline" class="text-warning-600"></ion-icon>
            Multas de Tránsito
          </h3>

          @if (canReportFine()) {
            <button
              (click)="reportFineClicked.emit()"
              [disabled]="processing()"
              class="flex items-center gap-2 px-4 py-2 rounded-xl bg-warning-50 text-warning-700 font-semibold hover:bg-warning-100 transition-colors border border-warning-200 text-sm"
            >
              <ion-icon name="add-outline"></ion-icon>
              Reportar Multa
            </button>
          }
        </div>

        <!-- Loading State -->
        @if (loading()) {
          <div class="flex items-center justify-center py-8">
            <div
              class="w-8 h-8 border-3 border-surface-secondary border-t-warning-500 rounded-full animate-spin"
            ></div>
          </div>
        }

        <!-- Fines List -->
        @if (!loading() && hasFines()) {
          <div class="space-y-3">
            @for (fine of trafficFines(); track fine.id) {
              <div
                class="p-4 rounded-xl border border-border-default bg-surface-secondary"
              >
                <div class="flex items-start justify-between gap-4">
                  <div class="flex-1">
                    <!-- Status Badge -->
                    <div class="flex items-center gap-2 mb-3">
                      <span
                        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                        [class]="getStatusClasses(fine.status)"
                      >
                        <ion-icon [name]="getStatusIcon(fine.status)"></ion-icon>
                        {{ getStatusLabel(fine.status) }}
                      </span>
                      <span class="text-xs text-text-muted">
                        {{ fine.created_at | date: 'dd/MM/yyyy' }}
                      </span>
                    </div>

                    <!-- Fine Details -->
                    <div class="grid grid-cols-2 gap-3 text-sm">
                      <div class="flex items-center gap-2">
                        <ion-icon name="document-text-outline" class="text-text-muted"></ion-icon>
                        <div>
                          <p class="text-[10px] text-text-muted uppercase font-bold">Tipo</p>
                          <p class="text-text-primary font-medium">{{ fine.violation_type }}</p>
                        </div>
                      </div>

                      <div class="flex items-center gap-2">
                        <ion-icon name="cash-outline" class="text-text-muted"></ion-icon>
                        <div>
                          <p class="text-[10px] text-text-muted uppercase font-bold">Monto</p>
                          <p class="text-text-primary font-semibold">
                            {{ fine.amount_cents / 100 | currency: 'ARS' : 'symbol' : '1.0-0' }}
                          </p>
                        </div>
                      </div>

                      @if (fine.location) {
                        <div class="flex items-center gap-2 col-span-2">
                          <ion-icon name="location-outline" class="text-text-muted"></ion-icon>
                          <div>
                            <p class="text-[10px] text-text-muted uppercase font-bold">Ubicación</p>
                            <p class="text-text-primary">{{ fine.location }}</p>
                          </div>
                        </div>
                      }

                      @if (fine.infraction_date) {
                        <div class="flex items-center gap-2">
                          <ion-icon name="time-outline" class="text-text-muted"></ion-icon>
                          <div>
                            <p class="text-[10px] text-text-muted uppercase font-bold">Fecha</p>
                            <p class="text-text-primary">
                              {{ fine.infraction_date | date: 'dd/MM/yyyy HH:mm' }}
                            </p>
                          </div>
                        </div>
                      }
                    </div>

                    @if (fine.description) {
                      <p class="text-xs text-text-secondary mt-3 p-2 bg-surface-base rounded-lg">
                        {{ fine.description }}
                      </p>
                    }

                    @if (fine.dispute_reason) {
                      <div class="mt-3 p-2 bg-warning-50 border border-warning-200 rounded-lg">
                        <p class="text-xs font-semibold text-warning-700 mb-1">Motivo de disputa:</p>
                        <p class="text-xs text-warning-600">{{ fine.dispute_reason }}</p>
                      </div>
                    }
                  </div>

                  <!-- Dispute Button (Renter Only) -->
                  @if (isRenter() && fine.status === 'pending') {
                    <button
                      (click)="disputeFine(fine)"
                      [disabled]="processing()"
                      class="px-4 py-2 rounded-lg border border-warning-300 text-warning-700 font-semibold text-sm hover:bg-warning-50 transition-colors disabled:opacity-50"
                    >
                      <ion-icon name="flag-outline" class="mr-1"></ion-icon>
                      Disputar
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        }

        <!-- Empty State -->
        @if (!loading() && !hasFines()) {
          <div class="text-center py-6 text-text-muted">
            <ion-icon name="car-outline" class="text-3xl mb-2"></ion-icon>
            <p class="text-sm">No hay multas de tránsito reportadas.</p>
          </div>
        }
      </div>
    }
  `,
})
export class BookingTrafficFinesManagerComponent implements OnInit {
  private readonly trafficInfractionsService = inject(TrafficInfractionsService);
  private readonly logger = inject(LoggerService).createChildLogger('BookingTrafficFinesManager');

  // Inputs
  readonly booking = input.required<Booking>();
  readonly isOwner = input.required<boolean>();
  readonly isRenter = input.required<boolean>();

  // Outputs
  readonly reportFineClicked = output<void>();
  readonly fineDisputed = output<TrafficInfraction>();
  readonly finesUpdated = output<TrafficInfraction[]>();

  // State
  readonly trafficFines = signal<TrafficInfraction[]>([]);
  readonly loading = signal(false);
  readonly processing = signal(false);

  // Computed
  readonly hasFines = computed(() => this.trafficFines().length > 0);

  readonly canReportFine = computed(() => {
    const booking = this.booking();
    if (!booking || !this.isOwner()) return false;
    return booking.status === 'completed' || booking.status === 'in_progress';
  });

  constructor() {
    addIcons({
      receiptOutline,
      addOutline,
      documentTextOutline,
      cashOutline,
      locationOutline,
      timeOutline,
      flagOutline,
      hourglassOutline,
      checkmarkCircleOutline,
      alertCircleOutline,
      carOutline,
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadFines();
  }

  async loadFines(): Promise<void> {
    const booking = this.booking();
    if (!booking) return;

    this.loading.set(true);
    try {
      const fines = await this.trafficInfractionsService.getInfractionsByBooking(booking.id);
      this.trafficFines.set(fines);
      this.finesUpdated.emit(fines);
    } catch (error) {
      this.logger.error('Error loading traffic fines:', error);
    } finally {
      this.loading.set(false);
    }
  }

  async disputeFine(fine: TrafficInfraction): Promise<void> {
    const reason = prompt('Por favor, ingresa la razón por la que deseas disputar esta multa:');
    if (!reason) {
      alert('Debes ingresar una razón para disputar la multa.');
      return;
    }

    if (!confirm('¿Confirmas que deseas disputar esta multa de tránsito?')) {
      return;
    }

    this.processing.set(true);
    try {
      await this.trafficInfractionsService.updateInfractionStatus(fine.id, 'disputed', reason);
      alert('Multa disputada exitosamente. El propietario será notificado.');
      await this.loadFines();
      this.fineDisputed.emit(fine);
    } catch (error) {
      this.logger.error('Error disputing fine:', error);
      alert('Ocurrió un error al disputar la multa.');
    } finally {
      this.processing.set(false);
    }
  }

  getStatusClasses(status: string): string {
    const classMap: Record<string, string> = {
      pending: 'bg-warning-100 text-warning-700 border border-warning-300',
      disputed: 'bg-info-100 text-info-700 border border-info-300',
      resolved: 'bg-success-100 text-success-700 border border-success-300',
      paid: 'bg-success-100 text-success-700 border border-success-300',
      rejected: 'bg-error-100 text-error-700 border border-error-300',
    };
    return classMap[status] ?? 'bg-surface-secondary text-text-secondary';
  }

  getStatusIcon(status: string): string {
    const iconMap: Record<string, string> = {
      pending: 'hourglass-outline',
      disputed: 'alert-circle-outline',
      resolved: 'checkmark-circle-outline',
      paid: 'checkmark-circle-outline',
      rejected: 'alert-circle-outline',
    };
    return iconMap[status] ?? 'time-outline';
  }

  getStatusLabel(status: string): string {
    const labelMap: Record<string, string> = {
      pending: 'Pendiente',
      disputed: 'Disputada',
      resolved: 'Resuelta',
      paid: 'Pagada',
      rejected: 'Rechazada',
    };
    return labelMap[status] ?? status;
  }
}
