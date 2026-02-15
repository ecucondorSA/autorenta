import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, from, interval } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';

// Services
import { BookingsService } from '@core/services/bookings/bookings.service';
import { BookingRealtimeService } from '@core/services/bookings/booking-realtime.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { ToastService } from '@core/services/ui/toast.service';
import type { Database } from '@core/types/database.types';

// Components
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';

// Pipes
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

type Booking = Database['public']['Views']['my_bookings']['Row'];
type Car = Database['public']['Tables']['cars']['Row'];

@Component({
  selector: 'app-booking-pending',
  standalone: true,
  imports: [TranslateModule, LoadingStateComponent, ButtonComponent, MoneyPipe],
  templateUrl: './booking-pending.page.html',
  styleUrls: ['./booking-pending.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingPendingPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly bookingService = inject(BookingsService);
  private readonly bookingRealtime = inject(BookingRealtimeService);
  private readonly logger = inject(LoggerService);
  private readonly toastService = inject(ToastService);
  private readonly destroy$ = new Subject<void>();

  // State
  readonly loading = signal(true);
  readonly booking = signal<Booking | null>(null);
  readonly car = signal<Car | null>(null);
  readonly checkCount = signal(0);
  readonly maxChecks = 30; // Check for 5 minutes (30 * 10 seconds)

  ngOnInit(): void {
    const bookingId = this.route.snapshot.paramMap.get('bookingId');

    if (!bookingId) {
      this.toastService.error('Error de reserva', 'ID de reserva no válido');
      this.router.navigate(['/']);
      return;
    }

    this.loadBookingData(bookingId);
    this.subscribeToRealtimeUpdates(bookingId); // ✅ FIX Bug #9: Realtime primero
    this.startPolling(bookingId); // Polling como fallback
  }

  ngOnDestroy(): void {
    this.bookingRealtime.unsubscribeAll(); // ✅ FIX Bug #9: Cleanup realtime
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * ✅ FIX Bug #9: Subscribe to realtime booking updates
   *
   * Uses Supabase Realtime to detect payment status changes instantly.
   * Polling is kept as a fallback in case realtime connection fails.
   */
  private subscribeToRealtimeUpdates(bookingId: string): void {
    this.logger.debug(`[BookingPending] Subscribing to realtime for booking: ${bookingId}`);

    this.bookingRealtime.subscribeToBooking(bookingId, {
      onBookingChange: (updatedBooking) => {
        this.logger.debug('[BookingPending] Realtime: Booking changed', {
          payment_status: updatedBooking.payment_status,
          status: updatedBooking.status,
        });

        // Update booking signal
        this.booking.set(updatedBooking as unknown as Booking);

        // Check payment status
        if (updatedBooking.payment_status === 'approved') {
          this.logger.debug('✅ Payment approved via realtime');
          this.handlePaymentApproved(bookingId);
        } else if (updatedBooking.payment_status === 'rejected') {
          this.logger.debug('❌ Payment rejected via realtime');
          this.handlePaymentRejected(bookingId);
        }
      },
      onConnectionChange: (status) => {
        this.logger.debug('[BookingPending] Realtime connection status:', status);
      },
    });
  }

  private loadBookingData(bookingId: string): void {
    this.loading.set(true);

    from(this.bookingService.getBookingById(bookingId)).subscribe({
      next: (booking) => {
        if (!booking) {
          this.toastService.error(
            'Reserva no encontrada',
            'No se pudo encontrar la reserva solicitada',
          );
          this.router.navigate(['/']);
          return;
        }

        this.booking.set(booking as unknown as Booking);

        // Load car data if available
        if (booking.car) {
          this.car.set(booking.car as unknown as Car);
        }

        // Check if payment is already processed
        if (booking.payment_status === 'approved') {
          this.handlePaymentApproved(bookingId);
        } else if (booking.payment_status === 'rejected') {
          this.handlePaymentRejected(bookingId);
        }

        this.loading.set(false);
      },
      error: (error) => {
        console.error('[BookingPending] Error loading booking:', error);
        this.toastService.error('Error de carga', 'No se pudo cargar la información de la reserva');
        this.router.navigate(['/']);
      },
    });
  }

  private startPolling(bookingId: string): void {
    // Poll every 10 seconds
    interval(10000)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => this.bookingService.getBookingById(bookingId)),
      )
      .subscribe({
        next: (booking) => {
          if (!booking) return;

          this.booking.set(booking as unknown as Booking);
          this.checkCount.update((count) => count + 1);

          // Check payment status
          if (booking.payment_status === 'approved') {
            this.handlePaymentApproved(bookingId);
          } else if (booking.payment_status === 'rejected') {
            this.handlePaymentRejected(bookingId);
          } else if (this.checkCount() >= this.maxChecks) {
            this.handleTimeout(bookingId);
          }
        },
        error: (error) => {
          console.error('[BookingPending] Polling error:', error);
        },
      });
  }

  private handlePaymentApproved(bookingId: string): void {
    this.destroy$.next(); // Stop polling
    this.toastService.success('Pago aprobado', '¡Tu pago ha sido procesado exitosamente!');
    this.router.navigate(['/bookings', 'success', bookingId]);
  }

  private handlePaymentRejected(bookingId: string): void {
    this.destroy$.next(); // Stop polling
    this.toastService.error('Pago rechazado', 'El pago fue rechazado por el procesador');
    this.router.navigate(['/bookings', bookingId, 'request'], {
      queryParams: { retry: 'true' },
    });
  }

  private handleTimeout(_bookingId: string): void {
    this.destroy$.next(); // Stop polling
    this.toastService.warning(
      'Verificación pendiente',
      'La verificación del pago está tardando más de lo esperado',
    );
  }

  retryPayment(): void {
    const bookingId = this.booking()?.id;
    if (bookingId) {
      this.router.navigate(['/bookings', bookingId, 'request'], {
        queryParams: { retry: 'true' },
      });
    }
  }

  contactSupport(): void {
    // Open support chat or email
    window.open(
      'mailto:soporte@autorentar.com?subject=Pago pendiente - Reserva ' + this.booking()?.id,
      '_blank',
    );
  }

  goToBookingDetail(): void {
    const bookingId = this.booking()?.id;
    if (bookingId) {
      this.router.navigate(['/bookings', bookingId]);
    }
  }
}
