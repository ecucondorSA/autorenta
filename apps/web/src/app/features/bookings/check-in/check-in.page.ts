import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BookingInspection } from '@core/models/fgo-v1-1.model';
import { AuthService } from '@core/services/auth/auth.service';
import { BookingsService } from '@core/services/bookings/bookings.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { FgoV1_1Service } from '@core/services/verification/fgo-v1-1.service';
import { firstValueFrom } from 'rxjs';
import { Booking } from '../../../core/models';
import { InspectionUploaderComponent } from '../../../shared/components/inspection-uploader/inspection-uploader.component';
import { VideoInspectionAIComponent } from '../../../shared/components/video-inspection-ai/video-inspection-ai.component';
import { VideoInspectionLiveComponent } from '../../../shared/components/video-inspection-live/video-inspection-live.component';

type InspectionMode = 'photos' | 'video' | 'live';

/**
 * Página de Check-in para locatarios
 *
 * Permite realizar la inspección inicial del vehículo antes de iniciar el alquiler.
 * Integra con el sistema FGO v1.1 para registrar evidencias.
 */
@Component({
  selector: 'app-check-in',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, InspectionUploaderComponent, VideoInspectionAIComponent, VideoInspectionLiveComponent],
  templateUrl: './check-in.page.html',
  styleUrl: './check-in.page.css',
})
export class CheckInPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly bookingsService = inject(BookingsService);
  private readonly fgoService = inject(FgoV1_1Service);
  private readonly authService = inject(AuthService);
  private readonly logger = inject(LoggerService);

  booking = signal<Booking | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  inspectionCompleted = signal(false);
  existingInspection = signal<BookingInspection | null>(null);
  ownerCheckInInspection = signal<BookingInspection | null>(null);

  // Inspection mode: photos (traditional) or video (AI-powered)
  inspectionMode = signal<InspectionMode>('photos');

  // Computed properties
  readonly canPerformCheckIn = computed(() => {
    const booking = this.booking();
    if (!booking) return false;

    // Solo permite check-in si:
    // 1. Booking está confirmado o en progreso
    // 2. El usuario es el locatario
    // 3. No hay check-in completado ya
    const isRenter = booking.renter_id === this.authService.session$()?.user?.id;
    const validStatus = booking.status === 'confirmed' || booking.status === 'in_progress';
    const ownerCheckInReady = this.ownerCheckInInspection()?.signedAt !== undefined;
    const hasCheckIn = this.existingInspection()?.signedAt !== undefined;

    if (!isRenter || !validStatus || hasCheckIn) return false;

    // Legacy fallback: allow renter documentation even if owner check-in is missing
    if (booking.status === 'in_progress') {
      return true;
    }

    return ownerCheckInReady;
  });

  readonly isRenter = computed(() => {
    const booking = this.booking();
    const currentUser = this.authService.session$()?.user;
    return booking?.renter_id === currentUser?.id;
  });

  readonly ownerCheckInCompleted = computed(() => {
    return this.ownerCheckInInspection()?.signedAt !== undefined;
  });

  readonly isLegacyInProgress = computed(() => {
    const booking = this.booking();
    return booking?.status === 'in_progress' && !this.ownerCheckInCompleted();
  });

  async ngOnInit(): Promise<void> {
    const bookingId = this.route.snapshot.paramMap.get('id');
    if (!bookingId) {
      this.error.set('ID de reserva inválido');
      this.loading.set(false);
      return;
    }

    try {
      // Cargar booking
      const booking = await this.bookingsService.getBookingById(bookingId);
      if (!booking) {
        this.error.set('Reserva no encontrada');
        this.loading.set(false);
        return;
      }

      this.booking.set(booking);

      // Verificar que el usuario es el locatario
      if (!this.isRenter()) {
        this.error.set('No tenés permisos para realizar el check-in de esta reserva');
        this.loading.set(false);
        return;
      }

      // Verificar estado del booking
      if (booking.status !== 'confirmed' && booking.status !== 'in_progress') {
        this.error.set('El check-in solo está disponible para reservas confirmadas o en progreso');
        this.loading.set(false);
        return;
      }

      // Cargar inspección del locador y del locatario
      const [ownerCheckIn, renterCheckIn] = await Promise.all([
        firstValueFrom(this.fgoService.getInspectionByStage(bookingId, 'check_in')),
        firstValueFrom(this.fgoService.getInspectionByStage(bookingId, 'renter_check_in')),
      ]);

      if (ownerCheckIn?.signedAt) {
        this.ownerCheckInInspection.set(ownerCheckIn);
      }

      if (renterCheckIn?.signedAt) {
        this.existingInspection.set(renterCheckIn);
        this.inspectionCompleted.set(true);
      }
    } catch (err) {
      this.error.set('Error al cargar la reserva');
      this.logger.error('Error loading booking', 'CheckInPage', err);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Maneja la finalización exitosa del check-in
   */
  async onInspectionCompleted(inspection: BookingInspection): Promise<void> {
    try {
      this.inspectionCompleted.set(true);
      this.existingInspection.set(inspection);

      // Si el booking está en 'confirmed', actualizar a 'in_progress'
      const booking = this.booking();
      if (booking && booking.status === 'confirmed') {
        const result = await this.bookingsService.startRental(booking.id);
        if (!result.success) {
          throw new Error(result.error);
        }

        // Recargar booking
        const updated = await this.bookingsService.getBookingById(booking.id);
        if (updated) {
          this.booking.set(updated);
        }
      }

      // Redirigir a detalle de booking después de un breve delay
      setTimeout(() => {
        this.router.navigate(['/bookings', booking?.id], {
          queryParams: { checkInCompleted: 'true' },
        });
      }, 2000);
    } catch (err) {
      this.error.set('Error al completar el check-in');
      this.logger.error('Error completing check-in', 'CheckInPage', err);
    }
  }

  /**
   * Redirige al detalle de booking
   */
  goToBookingDetail(): void {
    const booking = this.booking();
    if (booking) {
      this.router.navigate(['/bookings', booking.id]);
    }
  }

  /**
   * Cambia el modo de inspección
   */
  setInspectionMode(mode: InspectionMode): void {
    this.inspectionMode.set(mode);
  }

  /**
   * Cambia a modo fotos (callback desde video component)
   */
  switchToPhotos(): void {
    this.inspectionMode.set('photos');
  }

  formatDateTime(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
