import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { BookingsService } from '../../../core/services/bookings.service';
import { FgoV1_1Service } from '../../../core/services/fgo-v1-1.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationManagerService } from '../../../core/services/notification-manager.service';
import {
  LocationTrackingService,
  TrackingSession,
} from '../../../core/services/location-tracking.service';
import { LiveTrackingMapComponent } from '../../../shared/components/live-tracking-map/live-tracking-map.component';
import { Booking } from '../../../core/models';

/**
 * Owner Check-In Page
 *
 * Permite al dueño realizar la inspección inicial del auto antes de entregarlo al locatario
 * - Registra estado inicial (odómetro, combustible, daños)
 * - Sube fotos de evidencia
 * - Firma digital
 * - Cambia booking de 'confirmed' → 'in_progress'
 */
@Component({
  selector: 'app-owner-check-in',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, LiveTrackingMapComponent],
  templateUrl: './owner-check-in.page.html',
  styleUrl: './owner-check-in.page.css',
})
export class OwnerCheckInPage implements OnInit, OnDestroy {
  private readonly bookingsService = inject(BookingsService);
  private readonly fgoService = inject(FgoV1_1Service);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(NotificationManagerService);
  private readonly locationTracking = inject(LocationTrackingService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly booking = signal<Booking | null>(null);
  readonly currentUserId = signal<string | null>(null);

  // Location tracking signals
  readonly isSharing = signal(false);
  readonly trackingSessions = signal<TrackingSession[]>([]);
  private unsubscribeTracking?: () => void;

  // Datos del formulario
  readonly odometer = signal<number | null>(null);
  readonly fuelLevel = signal<number>(100);
  readonly damagesNotes = signal('');
  readonly uploadedPhotos = signal<string[]>([]);
  readonly signatureDataUrl = signal<string | null>(null);

  readonly canSubmit = computed(() => {
    return (
      this.odometer() !== null &&
      this.odometer()! > 0 &&
      this.fuelLevel() > 0 &&
      this.uploadedPhotos().length >= 4 && // Mínimo 4 fotos
      this.signatureDataUrl() !== null
    );
  });

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
    } catch (error) {
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

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    const files = Array.from(input.files);
    const photoUrls: string[] = [];

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        photoUrls.push(e.target?.result as string);
        if (photoUrls.length === files.length) {
          this.uploadedPhotos.set([...this.uploadedPhotos(), ...photoUrls]);
        }
      };
      reader.readAsDataURL(file);
    });
  }

  async submitCheckIn() {
    if (!this.canSubmit() || this.submitting()) return;

    const booking = this.booking();
    if (!booking) return;

    this.submitting.set(true);

    try {
      // 1. Crear registro FGO (Fine-Grained Observation) para check-in
      // TODO: Implementar cuando FGO service esté listo
      const fgoData = {
        booking_id: booking.id,
        event_type: 'check_in_owner',
        initiated_by: this.currentUserId()!,
        odometer_reading: this.odometer()!,
        fuel_level: this.fuelLevel(),
        damage_notes: this.damagesNotes() || null,
        photo_urls: this.uploadedPhotos(),
        signature_data_url: this.signatureDataUrl()!,
      };
      console.log('FGO Check-in data:', fgoData);

      // 2. Iniciar alquiler (confirmed → in_progress)
      await this.bookingsService.updateBooking(booking.id, { status: 'in_progress' });

      this.toastService.success('Éxito', '✅ Check-in completado. El alquiler ha comenzado.');

      // Navegar al detalle de la reserva
      this.router.navigate(['/bookings/detail', booking.id]);
    } catch (error) {
      console.error('Error en check-in:', error);
      this.toastService.error(
        'Error',
        error instanceof Error ? error.message : 'Error al completar check-in',
      );
    } finally {
      this.submitting.set(false);
    }
  }

  cancel() {
    this.router.navigate(['/bookings/owner']);
  }

  get fuelLevelPercentage(): string {
    return `${this.fuelLevel()}%`;
  }
}
