import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { BookingsService } from '../../../core/services/bookings.service';
import { FgoV1_1Service } from '../../../core/services/fgo-v1-1.service';
import { BookingConfirmationService } from '../../../core/services/booking-confirmation.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationManagerService } from '../../../core/services/notification-manager.service';
import { Booking } from '../../../core/models';

/**
 * Owner Check-Out Page
 *
 * Permite al dueño realizar la inspección final del auto cuando el locatario lo devuelve
 * - Registra estado final (odómetro, combustible, daños)
 * - Compara con check-in
 * - Sube fotos de evidencia
 * - Reporta daños si los hay
 * - Firma digital
 * - Marca como 'returned' e inicia confirmación bilateral
 */
@Component({
  selector: 'app-owner-check-out',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './owner-check-out.page.html',
  styleUrl: './owner-check-out.page.css',
})
export class OwnerCheckOutPage implements OnInit {
  private readonly bookingsService = inject(BookingsService);
  private readonly fgoService = inject(FgoV1_1Service);
  private readonly confirmationService = inject(BookingConfirmationService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(NotificationManagerService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly booking = signal<Booking | null>(null);
  readonly currentUserId = signal<string | null>(null);
  readonly checkInData = signal<any>(null);

  // Datos del formulario
  readonly odometer = signal<number | null>(null);
  readonly fuelLevel = signal<number>(100);
  readonly hasDamages = signal(false);
  readonly damagesNotes = signal('');
  readonly damageAmount = signal<number>(0);
  readonly uploadedPhotos = signal<string[]>([]);
  readonly signatureDataUrl = signal<string | null>(null);

  readonly odometerDifference = computed(() => {
    const checkIn = this.checkInData();
    const current = this.odometer();
    if (!checkIn || !current) return null;
    return current - checkIn.odometer_reading;
  });

  readonly fuelDifference = computed(() => {
    const checkIn = this.checkInData();
    const current = this.fuelLevel();
    if (!checkIn) return null;
    return current - checkIn.fuel_level;
  });

  readonly canSubmit = computed(() => {
    return (
      this.odometer() !== null &&
      this.odometer()! > 0 &&
      this.fuelLevel() > 0 &&
      this.uploadedPhotos().length >= 4 && // Mínimo 4 fotos
      this.signatureDataUrl() !== null &&
      (!this.hasDamages() || (this.damageAmount() > 0 && this.damageAmount() <= 250))
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
        this.toastService.error('Error', 'No tienes permiso para hacer check-out de esta reserva');
        this.router.navigate(['/bookings/owner']);
        return;
      }

      // Validar estado
      if (booking.status !== 'in_progress') {
        this.toastService.error(
          'Error',
          `La reserva debe estar en estado "En curso". Estado actual: ${booking.status}`,
        );
        this.router.navigate(['/bookings/owner']);
        return;
      }

      this.booking.set(booking);

      // Cargar datos del check-in
      // TODO: Implementar cuando FGO service esté listo
      this.checkInData.set({ odometer_reading: 0, fuel_level: 100 });
    } catch (error) {
      this.toastService.error('Error', 'No se pudo cargar la reserva');
      this.router.navigate(['/bookings/owner']);
    } finally {
      this.loading.set(false);
    }
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

  toggleDamages() {
    this.hasDamages.set(!this.hasDamages());
    if (!this.hasDamages()) {
      this.damageAmount.set(0);
      this.damagesNotes.set('');
    }
  }

  async submitCheckOut() {
    if (!this.canSubmit() || this.submitting()) return;

    const booking = this.booking();
    if (!booking) return;

    this.submitting.set(true);

    try {
      // 1. Crear registro FGO para check-out
      // TODO: Implementar cuando FGO service esté listo
      const fgoData = {
        booking_id: booking.id,
        event_type: 'check_out_owner',
        initiated_by: this.currentUserId()!,
        odometer_reading: this.odometer()!,
        fuel_level: this.fuelLevel(),
        damage_notes: this.damagesNotes() || null,
        photo_urls: this.uploadedPhotos(),
        signature_data_url: this.signatureDataUrl()!,
        has_damages: this.hasDamages(),
        damage_amount: this.damageAmount(),
      };
      console.log('FGO Check-out data:', fgoData);

      // 2. Marcar como devuelto (in_progress → returned)
      await this.confirmationService.markAsReturned({
        booking_id: booking.id,
        returned_by: this.currentUserId()!,
      });

      // 3. Confirmar como propietario (puede reportar daños)
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
      this.router.navigate(['/bookings/detail', booking.id]);
    } catch (error) {
      console.error('Error en check-out:', error);
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

  get fuelLevelPercentage(): string {
    return `${this.fuelLevel()}%`;
  }

  get damageAmountFormatted(): string {
    return `$${this.damageAmount()} USD`;
  }
}
