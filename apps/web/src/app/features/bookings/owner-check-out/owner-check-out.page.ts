import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BookingInspection } from '@core/models/fgo-v1-1.model';
import { AuthService } from '@core/services/auth/auth.service';
import { BookingConfirmationService } from '@core/services/bookings/booking-confirmation.service';
import { BookingsService } from '@core/services/bookings/bookings.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { NotificationManagerService } from '@core/services/infrastructure/notification-manager.service';
import { FgoV1_1Service } from '@core/services/verification/fgo-v1-1.service';
import { IonicModule } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { Booking, BookingStatus } from '../../../core/models';
import { InspectionUploaderComponent } from '../../../shared/components/inspection-uploader/inspection-uploader.component';
import { VideoInspectionAIComponent } from '../../../shared/components/video-inspection-ai/video-inspection-ai.component';
import { VideoInspectionLiveComponent } from '../../../shared/components/video-inspection-live/video-inspection-live.component';

type InspectionMode = 'photos' | 'video' | 'live';

/**
 * Owner Check-Out Page
 *
 * Permite al dueño realizar la inspección final del auto cuando el locatario lo devuelve
 * - Registra estado final (odómetro, combustible, daños) usando InspectionUploaderComponent
 * - Marca como 'returned' e inicia confirmación bilateral
 */
@Component({
  selector: 'app-owner-check-out',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonicModule, InspectionUploaderComponent, VideoInspectionAIComponent, VideoInspectionLiveComponent],
  templateUrl: './owner-check-out.page.html',
  styleUrls: ['./owner-check-out.page.css'],
})
export class OwnerCheckOutPage implements OnInit {
  private readonly bookingsService = inject(BookingsService);
  private readonly confirmationService = inject(BookingConfirmationService);
  private readonly authService = inject(AuthService);
  private readonly fgoService = inject(FgoV1_1Service);
  private readonly toastService = inject(NotificationManagerService);
  private readonly logger = inject(LoggerService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(true);
  // Estado del flujo
  readonly step = signal<'inspection' | 'damages'>('inspection');

  // Inspection mode: photos (traditional), video (AI batch), or live (real-time)
  readonly inspectionMode = signal<InspectionMode>('photos');

  // Datos del formulario de daños
  readonly hasDamages = signal(false);
  readonly damagesNotes = signal('');
  readonly damageAmount = signal<number>(0);

  readonly canSubmitDamages = computed(() => {
    return (
      !this.hasDamages() ||
      (this.damageAmount() > 0 && this.damageAmount() <= 250 && this.damagesNotes().length > 0)
    );
  });

  readonly booking = signal<Booking | null>(null);
  readonly currentUserId = signal<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly checkInData = signal<any>(null);
  readonly submitting = signal(false);

  async ngOnInit() {
    const bookingId = this.route.snapshot.paramMap.get('id');
    this.logger.debug(`[OwnerCheckOut] ngOnInit called, bookingId: ${bookingId}`);

    if (!bookingId) {
      this.toastService.error('Error', 'ID de reserva inválido');
      this.router.navigate(['/bookings/owner']);
      return;
    }

    try {
      const session = await this.authService.ensureSession();
      this.currentUserId.set(session?.user?.id ?? null);
      this.logger.debug(`[OwnerCheckOut] Session user ID: ${this.currentUserId()}`);

      const booking = await this.bookingsService.getBookingById(bookingId);
      this.logger.debug(`[OwnerCheckOut] Booking loaded, car:`, 'OwnerCheckOut', {
        hasBooking: !!booking,
        hasCar: !!booking?.car,
        carOwnerId: booking?.car?.owner_id,
        currentUserId: this.currentUserId(),
        status: booking?.status,
      });
      if (!booking) {
        this.toastService.error('Error', 'Reserva no encontrada');
        this.router.navigate(['/bookings/owner']);
        return;
      }

      // Validar que es el dueño del auto
      const currentUserId = this.currentUserId();
      this.logger.debug(`[OwnerCheckOut] Validating owner:`, 'OwnerCheckOut', {
        carOwnerId: booking.car?.owner_id,
        currentUserId,
        isOwner: booking.car?.owner_id === currentUserId,
      });
      if (!booking.car?.owner_id || !currentUserId || booking.car.owner_id !== currentUserId) {
        this.logger.warn(`[OwnerCheckOut] Owner validation FAILED`, 'OwnerCheckOut');
        this.toastService.error('Error', 'No tienes permiso para hacer check-out de esta reserva');
        this.router.navigate(['/bookings/owner']);
        return;
      }

      // Validar estado
      const validStatuses: BookingStatus[] = ['in_progress', 'returned'];
      if (!validStatuses.includes(booking.status)) {
        this.toastService.error(
          'Error',
          `La reserva debe estar en estado "En curso" o "Devuelto". Estado actual: ${booking.status}`,
        );
        this.router.navigate(['/bookings/owner']);
        return;
      }

      this.booking.set(booking);

      // Cargar datos del check-in del renter para comparación
      const renterCheckIn = await firstValueFrom(
        this.fgoService.getInspectionByStage(bookingId, 'renter_check_in'),
      );
      if (renterCheckIn) {
        this.checkInData.set({
          odometer_reading: renterCheckIn.odometer || 0,
          fuel_level: renterCheckIn.fuelLevel || 100,
          photos: renterCheckIn.photos || [],
        });
      } else {
        this.checkInData.set({ odometer_reading: 0, fuel_level: 100, photos: [] });
      }
    } catch {
      this.toastService.error('Error', 'No se pudo cargar la reserva');
      this.router.navigate(['/bookings/owner']);
    } finally {
      this.loading.set(false);
    }
  }

  // Señal para daños detectados por AI
  readonly aiDetectedDamages = signal<{ type: string; description: string; severity: string }[]>(
    [],
  );
  readonly analyzingDamages = signal(false);

  /**
   * Paso 1: Inspección completada
   * Llama al análisis de daños por AI y avanza al paso de confirmación
   */
  async onInspectionCompleted(inspection: BookingInspection) {
    this.step.set('damages');
    this.toastService.success('Inspección guardada', 'Analizando imágenes...');

    // Trigger AI damage analysis if we have check-in photos to compare
    const checkInPhotos = this.checkInData()?.photos || [];
    const checkOutPhotos = inspection.photos || [];

    if (checkInPhotos.length > 0 && checkOutPhotos.length > 0) {
      this.analyzingDamages.set(true);
      try {
        // Analyze first matching pair of photos
        const response = await fetch(
          `${window.location.origin}/functions/v1/analyze-damage-images`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              check_in_image_url: checkInPhotos[0]?.url,
              check_out_image_url: checkOutPhotos[0]?.url,
              pair_index: 1,
              booking_id: this.booking()?.id,
            }),
          },
        );

        if (response.ok) {
          const result = await response.json();
          if (result.damages && result.damages.length > 0) {
            this.aiDetectedDamages.set(result.damages);
            this.hasDamages.set(true);
            this.damagesNotes.set(result.summary || '');
            this.toastService.info(
              'Daños detectados',
              `Se encontraron ${result.damages.length} posible(s) daño(s). Por favor revisa.`,
            );
          } else {
            this.toastService.success('Sin daños', 'No se detectaron daños nuevos');
          }
        }
      } catch (err) {
        this.logger.warn('AI damage analysis failed, continuing without', 'OwnerCheckOutPage', err);
      } finally {
        this.analyzingDamages.set(false);
      }
    }
  }

  toggleDamages() {
    this.hasDamages.set(!this.hasDamages());
    if (!this.hasDamages()) {
      this.damageAmount.set(0);
      this.damagesNotes.set('');
    }
  }

  /**
   * Paso 2: Confirmar devolución y daños
   */
  async submitCheckOut() {
    if (!this.canSubmitDamages() || this.submitting()) return;

    const booking = this.booking();
    if (!booking) return;

    this.submitting.set(true);

    try {
      // 2. Marcar como devuelto (in_progress → returned)
      await this.confirmationService.markAsReturned({
        booking_id: booking.id,
        returned_by: this.currentUserId()!,
      });

      // 3. Confirmar como propietario con los daños reportados
      const confirmResult = await this.confirmationService.confirmOwner({
        booking_id: booking.id,
        confirming_user_id: this.currentUserId()!,
        has_damages: this.hasDamages(),
        damage_amount: this.damageAmount(),
        damage_description: this.damagesNotes() || undefined,
      });

      if (confirmResult.funds_released) {
        this.toastService.success(
          'Éxito',
          '✅ Check-out completado. Fondos liberados automáticamente.',
        );
      } else {
        this.toastService.success(
          'Éxito',
          '✅ Check-out completado. Esperando confirmación del locatario para liberar fondos.',
        );
      }

      // Navegar al detalle de la reserva
      this.router.navigate(['/bookings/owner', booking.id]);
    } catch (error) {
      this.logger.error('Error en check-out', 'OwnerCheckOutPage', error);
      this.toastService.error(
        'Error',
        error instanceof Error ? error.message : 'Error al completar check-out',
      );
    } finally {
      this.submitting.set(false);
    }
  }

  cancel() {
    this.router.navigate(['/bookings/owner']);
  }

  setInspectionMode(mode: InspectionMode): void {
    this.inspectionMode.set(mode);
  }

  switchToPhotos(): void {
    this.inspectionMode.set('photos');
  }
}
