import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
  signal,
} from '@angular/core';

import { AuthService } from '@core/services/auth/auth.service';
import {
  BookingConfirmationService,
  ConfirmAndReleaseResponse,
} from '@core/services/bookings/booking-confirmation.service';
import { TranslateModule } from '@ngx-translate/core';

/**
 * Componente de confirmación del locatario (renter)
 *
 * Permite al locatario:
 * - Confirmar liberar el pago al propietario
 * - Ver el estado de confirmación del propietario
 * - Ver información sobre daños reportados (si aplica)
 *
 * Cuando AMBOS confirman → se liberan fondos automáticamente:
 * - Rental payment → al propietario
 * - Deposit (o deposit - daños) → de vuelta al wallet del locatario
 */
@Component({
  selector: 'app-renter-confirmation',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  templateUrl: './renter-confirmation.component.html',
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class RenterConfirmationComponent {
  private readonly confirmationService = inject(BookingConfirmationService);
  private readonly auth = inject(AuthService);

  /**
   * ID del booking a confirmar
   */
  @Input({ required: true }) bookingId!: string;

  /**
   * Indica si el propietario ya confirmó
   */
  @Input() ownerConfirmed = false;

  /**
   * Indica si el locatario ya confirmó
   */
  @Input() renterConfirmed = false;

  /**
   * Monto de daños reportados por el propietario (si aplica)
   */
  @Input() damageAmount: number | null = null;

  /**
   * Descripción de daños reportados por el propietario (si aplica)
   */
  @Input() damageDescription: string | null = null;

  /**
   * Monto del depósito (usualmente $250)
   */
  @Input() depositAmount = 250;

  /**
   * Emite cuando la confirmación se completó exitosamente
   */
  @Output() confirmed = new EventEmitter<ConfirmAndReleaseResponse>();

  /**
   * Emite cuando ocurre un error
   */
  @Output() errorOccurred = new EventEmitter<string>();

  /**
   * Estado de la confirmación
   */
  readonly confirmationResult = signal<ConfirmAndReleaseResponse | null>(null);

  /**
   * Mensaje de éxito/error
   */
  readonly message = signal<string | null>(null);

  /**
   * Shortcut para el loading state del servicio
   */
  readonly loading = this.confirmationService.loading;

  /**
   * Calcula cuánto dinero recibirá el locatario de vuelta en su wallet
   */
  get amountToReturn(): number {
    if (this.damageAmount && this.damageAmount > 0) {
      return Math.max(0, this.depositAmount - this.damageAmount);
    }
    return this.depositAmount;
  }

  /**
   * Procesa la confirmación del locatario
   */
  async confirm(): Promise<void> {
    const userId = this.auth.sessionSignal()?.user?.id;
    if (!userId) {
      this.message.set('Error: Usuario no autenticado');
      this.errorOccurred.emit('Usuario no autenticado');
      return;
    }

    try {
      // Si hay daños, usamos el flujo V2 explícito
      if (this.damageAmount && this.damageAmount > 0) {
        await this.confirmationService.resolveConclusion({
          booking_id: this.bookingId,
          renter_id: userId,
          accept_damage: true,
        });
        this.confirmationResult.set({
          success: true,
          message: 'Has aceptado los daños. Fondos liberados.',
          funds_released: true,
          completion_status: 'COMPLETED',
          owner_confirmed: true,
          renter_confirmed: true,
          waiting_for: 'none',
        });
        this.message.set('Daños aceptados y pago liberado.');
        this.confirmed.emit(this.confirmationResult()!);
      } else {
        // Flujo normal (o V1 legacy)
        const result = await this.confirmationService.confirmRenter({
          booking_id: this.bookingId,
          confirming_user_id: userId,
        });
        this.confirmationResult.set(result);
        this.message.set(result.message);
        this.confirmed.emit(result);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al confirmar';
      this.message.set(`Error: ${errorMessage}`);
      this.errorOccurred.emit(errorMessage);
    }
  }

  /**
   * Disputar los daños reportados
   */
  async dispute(): Promise<void> {
    const userId = this.auth.sessionSignal()?.user?.id;
    if (!userId) return;

    if (!confirm('¿Estás seguro de iniciar una disputa? El caso será revisado por soporte.'))
      return;

    try {
      await this.confirmationService.resolveConclusion({
        booking_id: this.bookingId,
        renter_id: userId,
        accept_damage: false,
      });
      this.message.set('Disputa iniciada. Soporte te contactará.');
      this.errorOccurred.emit('Disputa iniciada'); // Notify parent to reload/update status
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al disputar';
      this.message.set(`Error: ${errorMessage}`);
    }
  }
}
