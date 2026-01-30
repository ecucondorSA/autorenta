import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';

import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '@core/services/auth/auth.service';
import { BookingsService } from '@core/services/bookings/bookings.service';
import { BookingChatComponent } from '../../shared/components/booking-chat/booking-chat.component';
import { Booking } from '../../core/models';
import { CarChatComponent } from './components/car-chat.component';

/**
 * Página de mensajes standalone
 * Soporta dos modos:
 * 1. Chat de reserva: /messages?bookingId=xxx&userId=xxx&userName=xxx
 * 2. Chat de auto: /messages?carId=xxx&userId=xxx&carName=xxx
 */
@Component({
  selector: 'app-messages',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, BookingChatComponent, CarChatComponent],
  hostDirectives: [],
  template: `
    <div class="h-[100dvh] flex flex-col bg-surface-base overflow-hidden">
      <!-- Header -->
      <div class="flex-shrink-0 bg-surface-raised shadow z-10">
        <div class="mx-auto max-w-4xl px-4 py-3">
          <div class="flex items-center gap-4">
            <!-- Back button -->
            <button
              (click)="goBack()"
              class="flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface-hover"
              type="button"
            >
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <div>
              <h1 class="text-xl font-semibold text-text-primary">Mensajes</h1>
              <p class="text-sm text-text-secondary">
                @if (bookingId()) {
                  Conversación sobre reserva
                } @else if (carId()) {
                  Consulta sobre auto
                } @else {
                  Chat
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Content - fills remaining height -->
      <div class="flex-1 min-h-0 overflow-hidden w-full p-0 pb-safe-bottom sm:mx-auto sm:max-w-4xl sm:p-4">
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

        @if (loading()) {
          <div class="flex h-96 items-center justify-center">
            <div class="text-center">
              <div
                class="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-border-muted border-t-blue-500"
              ></div>
              <p class="text-text-secondary">Cargando chat...</p>
            </div>
          </div>
        } @else if (error()) {
          <div class="rounded-lg bg-error-bg p-4">
            <p class="text-sm text-error-strong">{{ error() }}</p>
            <button
              (click)="goBack()"
              class="mt-2 text-sm text-error-text underline hover:text-error-strong"
              type="button"
            >
              Volver
            </button>
          </div>
        } @else if (bookingId() && recipientId() && recipientName()) {
          <!-- Booking chat -->
          <div class="h-full min-h-0">
            <app-booking-chat
              [bookingId]="bookingId()!"
              [recipientId]="recipientId()!"
              [recipientName]="recipientName()!"
            />
          </div>
        } @else if (carId() && recipientId() && recipientName()) {
          <!-- Car chat (pre-booking) -->
          <div class="h-full min-h-0">
            <app-car-chat
              [carId]="carId()!"
              [recipientId]="recipientId()!"
              [recipientName]="recipientName()!"
            />
          </div>
        } @else {
          <div class="rounded-lg bg-warning-bg p-4">
            <p class="text-sm text-warning-strong">⚠️ Faltan parámetros para iniciar el chat</p>
            <button
              (click)="goBack()"
              class="mt-2 text-sm text-warning-text underline hover:text-warning-strong"
              type="button"
            >
              Volver
            </button>
          </div>
        }
      </div>
    </div>
  `,
})
export class MessagesPage implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly bookingsService = inject(BookingsService);

  // ✅ P0-006 FIX: Destroy subject para limpiar subscriptions
  private readonly destroy$ = new Subject<void>();

  // Query params
  readonly bookingId = signal<string | null>(null);
  readonly carId = signal<string | null>(null);
  readonly recipientId = signal<string | null>(null);
  readonly recipientName = signal<string | null>(null);

  // Booking context (when bookingId is available)
  readonly booking = signal<Booking | null>(null);
  readonly loadingBooking = signal(false);

  // State
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  // Computed
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

  async ngOnInit(): Promise<void> {
    // Verificar autenticación
    const session = this.authService.session$();
    if (!session) {
      this.error.set('Debes iniciar sesión para ver los mensajes');
      this.loading.set(false);
      setTimeout(() => {
        this.router.navigate(['/auth/login'], {
          queryParams: { returnUrl: this.router.url },
        });
      }, 2000);
      return;
    }

    // Leer query params
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(async (params) => {
      this.bookingId.set(params['bookingId'] ?? null);
      this.carId.set(params['carId'] ?? null);
      this.recipientId.set(params['userId'] ?? null);
      this.recipientName.set(params['userName'] ?? params['carName'] ?? 'Usuario');

      // Validar que tenemos al menos booking o car ID
      if (!this.bookingId() && !this.carId()) {
        this.error.set('Falta información para iniciar el chat (booking o car ID)');
      }

      // Validar que tenemos recipient
      if (!this.recipientId()) {
        this.error.set('Falta información del destinatario');
      }

      // Cargar información del booking si está disponible
      if (this.bookingId()) {
        await this.loadBookingContext(this.bookingId()!);
      }

      this.loading.set(false);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
      console.error('Error loading booking context:', err);
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

  /**
   * Formatea fecha
   */
  formatDateTime(dateStr: string): string {
    return new Date(dateStr).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
