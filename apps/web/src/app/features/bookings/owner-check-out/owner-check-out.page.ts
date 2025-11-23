import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { Booking } from '../../../core/models';
import { BookingInspection } from '../../../core/models/fgo-v1-1.model';
import { AuthService } from '../../../core/services/auth.service';
import { BookingConfirmationService } from '../../../core/services/booking-confirmation.service';
import { BookingsService } from '../../../core/services/bookings.service';
import { NotificationManagerService } from '../../../core/services/notification-manager.service';
import { InspectionUploaderComponent } from '../../../shared/components/inspection-uploader/inspection-uploader.component';

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
  imports: [CommonModule, IonicModule, InspectionUploaderComponent],
  templateUrl: './owner-check-out.page.html',
  styleUrl: './owner-check-out.page.css',
})
export class OwnerCheckOutPage implements OnInit {
  private readonly bookingsService = inject(BookingsService);
  private readonly confirmationService = inject(BookingConfirmationService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(NotificationManagerService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(true);
  // Estado del flujo
  readonly step = signal<'inspection' | 'damages'>('inspection');

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
      // FIXME: Implement once FGO (Fast Global Onboarding) service is ready
      this.checkInData.set({ odometer_reading: 0, fuel_level: 100 });
    } catch {
      this.toastService.error('Error', 'No se pudo cargar la reserva');
      this.router.navigate(['/bookings/owner']);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Paso 1: Inspección completada
   * Avanza al paso de reclamo de daños
   */
  onInspectionCompleted(_inspection: BookingInspection) {
    this.step.set('damages');
    this.toastService.success('Inspección guardada', 'Ahora confirma si hay daños a reportar');
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
}
