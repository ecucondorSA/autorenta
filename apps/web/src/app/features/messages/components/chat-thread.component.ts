import {
  Component,
  ChangeDetectionStrategy,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { BookingsService } from '@core/services/bookings/bookings.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import type { Booking } from '../../../core/models';
import { BookingChatComponent } from '../../../shared/components/booking-chat/booking-chat.component';
import { CarChatComponent } from './car-chat.component';

type ChatIds = {
  bookingId: string | null;
  carId: string | null;
};

/**
 * Vista de chat reutilizable (booking o car) para mobile y desktop split view.
 */
@Component({
  selector: 'app-chat-thread',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, BookingChatComponent, CarChatComponent],
  template: `
    <div class="h-full min-h-0 flex flex-col">
      @if (showEmptyState() && !hasConversation()) {
        <div class="flex-1 flex items-center justify-center bg-surface-base">
          <div class="text-center px-6">
            <p class="text-sm text-text-secondary">Selecciona un chat para comenzar</p>
          </div>
        </div>
      } @else {
        <!-- Booking Context Card -->
        @if (hasBookingContext() && bookingContext()) {
          <div class="mb-4 rounded-lg border border-cta-default/40 bg-cta-default/10 p-4">
            <div class="flex items-start gap-3">
              <div class="flex-shrink-0">
                <svg
                  class="h-6 w-6 text-cta-default"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div class="flex-1">
                <h3 class="text-sm font-semibold text-cta-default mb-1">
                  Reserva: {{ bookingContext()!.carTitle }}
                </h3>
                @if (bookingContext()!.dates) {
                  <p class="text-xs text-cta-default mb-2">📅 {{ bookingContext()!.dates }}</p>
                }
                <div class="flex items-center gap-2">
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                    [class.bg-cta-default/20]="
                      bookingContext()!.status === 'confirmed' ||
                      bookingContext()!.status === 'in_progress'
                    "
                    [class.text-cta-default]="
                      bookingContext()!.status === 'confirmed' ||
                      bookingContext()!.status === 'in_progress'
                    "
                    [class.bg-warning-bg-hover]="bookingContext()!.status === 'pending'"
                    [class.text-warning-strong]="bookingContext()!.status === 'pending'"
                    [class.bg-success-light/20]="bookingContext()!.status === 'completed'"
                    [class.text-success-strong]="bookingContext()!.status === 'completed'"
                  >
                    {{ bookingContext()!.statusLabel }}
                  </span>
                  <a
                    [routerLink]="['/bookings', bookingId()]"
                    class="text-xs text-cta-default hover:text-cta-default underline"
                  >
                    Ver detalle
                  </a>
                </div>
              </div>
            </div>
          </div>
        }

        @if (error()) {
          <div class="rounded-lg bg-error-bg p-4">
            <p class="text-sm text-error-strong">{{ error() }}</p>
          </div>
        } @else if (bookingId() && recipientId()) {
          <div class="h-full min-h-0">
            <app-booking-chat
              [bookingId]="bookingId()!"
              [recipientId]="recipientId()!"
              [recipientName]="safeRecipientName()"
              [booking]="booking()"
            />
          </div>
        } @else if (carId() && recipientId()) {
          <div class="h-full min-h-0">
            <app-car-chat
              [carId]="carId()!"
              [recipientId]="recipientId()!"
              [recipientName]="safeRecipientName()"
            />
          </div>
        } @else if (!showEmptyState()) {
          <div class="rounded-lg bg-warning-bg p-4">
            <p class="text-sm text-warning-strong">⚠️ Faltan parámetros para iniciar el chat</p>
          </div>
        }
      }
    </div>
  `,
})
export class ChatThreadComponent {
  private readonly bookingsService = inject(BookingsService);
  private readonly logger = inject(LoggerService).createChildLogger('ChatThreadComponent');

  // Inputs
  readonly bookingId = input<string | null>(null);
  readonly carId = input<string | null>(null);
  readonly recipientId = input<string | null>(null);
  readonly recipientName = input<string | null>(null);
  readonly showEmptyState = input<boolean>(false);

  // Booking context
  readonly booking = signal<Booking | null>(null);
  readonly loadingBooking = signal(false);
  readonly error = signal<string | null>(null);

  private lastChatIds: ChatIds = { bookingId: null, carId: null };

  readonly safeRecipientName = computed(() => this.recipientName() || 'Usuario');
  readonly hasConversation = computed(() => !!this.bookingId() || !!this.carId());

  readonly bookingContext = computed(() => {
    const booking = this.booking();
    if (!booking) return null;

    return {
      carTitle: booking.car_title || `${booking.car_brand} ${booking.car_model}`,
      dates:
        booking.start_at && booking.end_at
          ? `${new Date(booking.start_at).toLocaleDateString('es-AR')} - ${new Date(booking.end_at).toLocaleDateString('es-AR')}`
          : null,
      status: booking.status,
      statusLabel: this.getStatusLabel(booking.status),
    };
  });

  readonly hasBookingContext = computed(() => this.booking() !== null);

  constructor() {
    effect(() => {
      const bookingId = this.bookingId();
      const carId = this.carId();

      if (bookingId && bookingId !== this.lastChatIds.bookingId) {
        this.lastChatIds = { bookingId, carId: null };
        void this.loadBookingContext(bookingId);
      } else if (!bookingId && this.lastChatIds.bookingId) {
        this.lastChatIds = { bookingId: null, carId };
        this.booking.set(null);
      }
    });

    effect(() => {
      if (!this.hasConversation()) {
        this.error.set(this.showEmptyState() ? null : 'Falta información para iniciar el chat');
        return;
      }

      if (!this.recipientId()) {
        this.error.set('Falta información del destinatario');
        return;
      }

      this.error.set(null);
    });
  }

  /**
   * Carga información del booking para mostrar contexto
   */
  private async loadBookingContext(bookingId: string): Promise<void> {
    this.loadingBooking.set(true);
    try {
      const booking = await this.bookingsService.getBookingById(bookingId);
      if (booking) {
        this.booking.set(booking);
      }
    } catch (err) {
      // No fallar si no se puede cargar el booking, solo no mostrar contexto
      this.logger.error('Error loading booking context', { error: err, bookingId });
    } finally {
      this.loadingBooking.set(false);
    }
  }

  /**
   * Obtiene la etiqueta del estado del booking
   */
  private getStatusLabel(status: string): string {
    switch (status) {
      case 'pending':
        return 'Pendiente de pago';
      case 'confirmed':
        return 'Confirmada';
      case 'in_progress':
        return 'En curso';
      case 'completed':
        return 'Finalizada';
      case 'cancelled':
        return 'Cancelada';
      case 'expired':
        return 'Vencida';
      default:
        return status;
    }
  }
}
