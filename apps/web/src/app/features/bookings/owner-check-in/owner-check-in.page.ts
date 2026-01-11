import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BookingInspection } from '@core/models/fgo-v1-1.model';
import { AuthService } from '@core/services/auth/auth.service';
import { BookingNotificationsService } from '@core/services/bookings/booking-notifications.service';
import { BookingsService } from '@core/services/bookings/bookings.service';
import {
  LocationTrackingService,
  TrackingSession,
} from '@core/services/geo/location-tracking.service';
import { NotificationManagerService } from '@core/services/infrastructure/notification-manager.service';
import { IonicModule } from '@ionic/angular';
import { Booking } from '../../../core/models';
import { InspectionUploaderComponent } from '../../../shared/components/inspection-uploader/inspection-uploader.component';
import { LiveTrackingMapComponent } from '../../../shared/components/live-tracking-map/live-tracking-map.component';
import { formatDate } from '../../../shared/utils/date.utils';

/**
 * Owner Check-In Page
 *
 * Permite al dueño realizar la inspección inicial del auto antes de entregarlo al locatario
 * - Registra estado inicial (odómetro, combustible, daños) usando InspectionUploaderComponent
 * - Comparte ubicación en tiempo real
 */
@Component({
  selector: 'app-owner-check-in',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    IonicModule,
    LiveTrackingMapComponent,
    InspectionUploaderComponent,
  ],
  templateUrl: './owner-check-in.page.html',
  styleUrl: './owner-check-in.page.css',
})
export class OwnerCheckInPage implements OnInit, OnDestroy {
  private readonly bookingsService = inject(BookingsService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(NotificationManagerService);
  private readonly bookingNotifications = inject(BookingNotificationsService);
  private readonly locationTracking = inject(LocationTrackingService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(true);
  readonly booking = signal<Booking | null>(null);
  readonly currentUserId = signal<string | null>(null);

  // Location tracking signals
  readonly isSharing = signal(false);
  readonly trackingSessions = signal<TrackingSession[]>([]);
  private unsubscribeTracking?: () => void;

  formatBookingDate(date?: string | Date | null): string {
    if (!date) return '-';
    return formatDate(date, { format: 'medium' });
  }

  async ngOnInit() {
    const bookingId = this.route.snapshot.paramMap.get('id');
    if (!bookingId) {
      this.toastService.error('Error', 'ID de reserva inválido');
      this.router.navigate(['/bookings/owner']);
      return;
    }

    try {
      const session = await this.authService.ensureSession();
      this.currentUserId.set(session?.user?.id ?? null);

      const booking = await this.bookingsService.getBookingById(bookingId);
      if (!booking) {
        this.toastService.error('Error', 'Reserva no encontrada');
        this.router.navigate(['/bookings/owner']);
        return;
      }

      // Validar que es el dueño del auto
      const currentUserId = this.currentUserId();
      if (!booking.car?.owner_id || !currentUserId || booking.car.owner_id !== currentUserId) {
        this.toastService.error('Error', 'No tienes permiso para hacer check-in de esta reserva');
        this.router.navigate(['/bookings/owner']);
        return;
      }

      // Validar estado
      if (booking.status !== 'confirmed') {
        this.toastService.error(
          'Error',
          `La reserva debe estar en estado "Confirmada". Estado actual: ${booking.status}`,
        );
        this.router.navigate(['/bookings/owner']);
        return;
      }

      this.booking.set(booking);

      // Subscribe to location tracking updates for this booking
      this.subscribeToLocationUpdates(bookingId);
    } catch {
      this.toastService.error('Error', 'No se pudo cargar la reserva');
      this.router.navigate(['/bookings/owner']);
    } finally {
      this.loading.set(false);
    }
  }

  ngOnDestroy() {
    // Clean up tracking subscription
    if (this.unsubscribeTracking) {
      this.unsubscribeTracking();
    }

    // Stop tracking if currently sharing
    if (this.isSharing()) {
      this.locationTracking.stopTracking('inactive');
    }
  }

  // ============================================================================
  // LOCATION TRACKING METHODS
  // ============================================================================

  async startSharing() {
    const booking = this.booking();
    if (!booking) return;

    try {
      // Request location permission
      const granted = await this.locationTracking.requestLocationPermission();
      if (!granted) {
        this.toastService.error(
          'Permiso requerido',
          'Necesitas activar la ubicación para compartir tu posición',
        );
        return;
      }

      // Start tracking
      await this.locationTracking.startTracking(booking.id, 'check_in');
      this.isSharing.set(true);
      this.toastService.success(
        'Ubicación compartida',
        'El locatario puede ver tu ubicación en tiempo real',
      );
    } catch (error) {
      console.error('Error starting location sharing:', error);
      this.toastService.error('Error', 'No se pudo iniciar el compartir ubicación');
    }
  }

  async stopSharing() {
    try {
      await this.locationTracking.stopTracking('inactive');
      this.isSharing.set(false);
      this.toastService.success('Ubicación detenida', 'Ya no estás compartiendo tu ubicación');
    } catch (error) {
      console.error('Error stopping location sharing:', error);
      this.toastService.error('Error', 'No se pudo detener el compartir ubicación');
    }
  }

  async arriveAtDestination() {
    try {
      await this.locationTracking.stopTracking('arrived');
      this.isSharing.set(false);
      this.toastService.success('Llegada registrada', 'Has llegado al punto de encuentro');
    } catch (error) {
      console.error('Error marking arrival:', error);
      this.toastService.error('Error', 'No se pudo registrar la llegada');
    }
  }

  private subscribeToLocationUpdates(bookingId: string) {
    this.unsubscribeTracking = this.locationTracking.subscribeToLocationUpdates(
      bookingId,
      (sessions) => {
        this.trackingSessions.set(sessions);

        // Check if renter is nearby (less than 500m)
        const renterSession = sessions.find((s) => s.user_role === 'locatario');
        if (renterSession && renterSession.distance_remaining) {
          const distance = Number(renterSession.distance_remaining);
          if (distance < 500 && distance > 0) {
            // Only show once
            const notificationKey = `renter-nearby-${bookingId}`;
            if (!sessionStorage.getItem(notificationKey)) {
              this.toastService.success(
                '📍 Locatario cerca',
                `${renterSession.user_name} está a menos de 500m`,
              );
              sessionStorage.setItem(notificationKey, 'true');
            }
          }
        }
      },
    );
  }

  getTimeSince(timestamp: string): string {
    const now = new Date();
    const lastUpdate = new Date(timestamp);
    const diffMs = now.getTime() - lastUpdate.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);

    if (diffSeconds < 10) return 'hace un momento';
    if (diffSeconds < 60) return `${diffSeconds} seg`;

    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes} min`;

    const diffHours = Math.floor(diffMinutes / 60);
    return `${diffHours} h`;
  }

  // ============================================================================
  // INSPECTION METHODS
  // ============================================================================

  async onInspectionCompleted(_inspection: BookingInspection) {
    const booking = this.booking();
    if (!booking) return;

    try {
      // Notificar al locatario para que documente la recepción
      const currentUserId = this.currentUserId();
      if (currentUserId) {
        await this.bookingNotifications.notifyInspectionCompleted(
          booking,
          'check_in',
          currentUserId,
        );
      }

      this.toastService.success(
        'Éxito',
        '✅ Check-in completado. El locatario ahora debe documentar la recepción.',
      );

      // Navegar al detalle de la reserva
      this.router.navigate(['/bookings/owner', booking.id]);
    } catch (error) {
      console.error('Error en check-in:', error);
      this.toastService.error(
        'Error',
        error instanceof Error ? error.message : 'Error al completar check-in',
      );
    }
  }

  cancel() {
    this.router.navigate(['/bookings/owner']);
  }
}
