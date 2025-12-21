import {Component, OnInit, inject, signal, computed,
  ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Booking } from '../../../core/models';
import { BookingsService } from '@core/services/bookings/bookings.service';
import { BookingConfirmationService } from '@core/services/bookings/booking-confirmation.service';
import { FgoV1_1Service } from '@core/services/verification/fgo-v1-1.service';
import { AuthService } from '@core/services/auth/auth.service';
import { InspectionUploaderComponent } from '../../../shared/components/inspection-uploader/inspection-uploader.component';
import { BookingInspection } from '@core/models/fgo-v1-1.model';
import { LoggerService } from '@core/services/infrastructure/logger.service';

/**
 * Página de Check-out para locatarios
 *
 * Permite realizar la inspección final del vehículo al devolver el auto.
 * Muestra comparación con check-in (odómetro, combustible) y permite reportar daños.
 * Integra con el sistema FGO v1.1 para registrar evidencias.
 */
@Component({
  selector: 'app-check-out',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, InspectionUploaderComponent],
  templateUrl: './check-out.page.html',
  styleUrl: './check-out.page.css',
})
export class CheckOutPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly bookingsService = inject(BookingsService);
  private readonly confirmationService = inject(BookingConfirmationService);
  private readonly fgoService = inject(FgoV1_1Service);
  private readonly authService = inject(AuthService);
  private readonly logger = inject(LoggerService);

  booking = signal<Booking | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  missingReception = signal(false);
  inspectionCompleted = signal(false);
  existingInspection = signal<BookingInspection | null>(null);
  checkInInspection = signal<BookingInspection | null>(null);
  renterCheckInInspection = signal<BookingInspection | null>(null);

  // Computed properties
  readonly canPerformCheckOut = computed(() => {
    const booking = this.booking();
    if (!booking) return false;

    // Solo permite check-out si:
    // 1. Booking está en progreso o completado
    // 2. El usuario es el locatario
    // 3. No hay check-out completado ya
    // 4. Existe check-in completado
    const isRenter = booking.renter_id === this.authService.session$()?.user?.id;
    const validStatus = booking.status === 'in_progress' || booking.status === 'completed';
    const hasCheckOut = this.existingInspection()?.signedAt !== undefined;
    const hasCheckIn = this.renterCheckInInspection()?.signedAt !== undefined;

    return isRenter && validStatus && !hasCheckOut && hasCheckIn;
  });

  readonly isRenter = computed(() => {
    const booking = this.booking();
    const currentUser = this.authService.session$()?.user;
    return booking?.renter_id === currentUser?.id;
  });

  readonly kilometersDriven = computed(() => {
    const checkIn = this.checkInInspection();
    const checkOut = this.existingInspection();
    if (!checkIn?.odometer || !checkOut?.odometer) return null;
    return checkOut.odometer - checkIn.odometer;
  });

  readonly fuelDifference = computed(() => {
    const checkIn = this.checkInInspection();
    const checkOut = this.existingInspection();
    if (checkIn?.fuelLevel === undefined || checkOut?.fuelLevel === undefined) return null;
    return checkOut.fuelLevel - checkIn.fuelLevel;
  });

  /**
   * Calcula la penalidad por combustible faltante
   * Precio por litro: ~$1.50 USD/litro Argentina
   * Tanque promedio: 50 litros
   * Penalización: diferencia% * 50L * $1.50 + 20% margen servicio
   */
  readonly fuelPenalty = computed(() => {
    const diff = this.fuelDifference();
    if (diff === null || diff >= 0) return null;

    const LITERS_PER_TANK = 50;
    const PRICE_PER_LITER_USD = 1.5;
    const SERVICE_MARGIN = 1.2; // 20% margen por servicio de carga

    const litersNeeded = (Math.abs(diff) / 100) * LITERS_PER_TANK;
    const baseCost = litersNeeded * PRICE_PER_LITER_USD;
    const totalCost = baseCost * SERVICE_MARGIN;

    return {
      liters: Math.round(litersNeeded * 10) / 10,
      baseCost: Math.round(baseCost * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      percentageMissing: Math.abs(diff)
    };
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
        this.error.set('No tenés permisos para realizar el check-out de esta reserva');
        this.loading.set(false);
        return;
      }

      // Verificar estado del booking
      if (booking.status !== 'in_progress' && booking.status !== 'completed') {
        this.error.set('El check-out solo está disponible para reservas en progreso');
        this.loading.set(false);
        return;
      }

      // Cargar inspecciones (check-in locador, recepción locatario y check-out)
      const [checkIn, renterCheckIn, checkOut] = await Promise.all([
        firstValueFrom(this.fgoService.getInspectionByStage(bookingId, 'check_in')),
        firstValueFrom(this.fgoService.getInspectionByStage(bookingId, 'renter_check_in')),
        firstValueFrom(this.fgoService.getInspectionByStage(bookingId, 'check_out')),
      ]);

      if (!renterCheckIn?.signedAt) {
        this.missingReception.set(true);
        this.error.set('Debés completar la recepción del vehículo antes del check-out');
        this.loading.set(false);
        return;
      }

      if (renterCheckIn?.signedAt) {
        this.renterCheckInInspection.set(renterCheckIn);
      }

      if (checkIn?.signedAt) {
        this.checkInInspection.set(checkIn);
      } else if (renterCheckIn?.signedAt) {
        // Fallback for comparison if owner check-in is missing
        this.checkInInspection.set(renterCheckIn);
      }

      if (checkOut?.signedAt) {
        this.existingInspection.set(checkOut);
        this.inspectionCompleted.set(true);
      }
    } catch (err) {
      this.error.set('Error al cargar la reserva');
      this.logger.error('Error loading booking', 'CheckOutPage', err);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Maneja la finalización exitosa del check-out
   */
  async onInspectionCompleted(inspection: BookingInspection): Promise<void> {
    try {
      this.inspectionCompleted.set(true);
      this.existingInspection.set(inspection);

      // Marcar devolución y confirmar como locatario (no cerrar hasta confirmación del locador)
      const booking = this.booking();
      const renterId = this.authService.session$()?.user?.id;
      if (booking && renterId) {
        await this.confirmationService.markAsReturned({
          booking_id: booking.id,
          returned_by: renterId,
        });
        await this.confirmationService.confirmRenter({
          booking_id: booking.id,
          confirming_user_id: renterId,
        });
        const updated = await this.bookingsService.getBookingById(booking.id);
        if (updated) this.booking.set(updated);
      }

      // Redirigir a detalle de booking después de un breve delay
      setTimeout(() => {
        this.router.navigate(['/bookings', booking?.id], {
          queryParams: { checkOutCompleted: 'true' },
        });
      }, 2000);
    } catch (err) {
      this.error.set('Error al completar el check-out');
      this.logger.error('Error completing check-out', 'CheckOutPage', err);
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
