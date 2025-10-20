import { Component, Input, Output, EventEmitter, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  BookingConfirmationService,
  ConfirmAndReleaseResponse,
} from '../../../core/services/booking-confirmation.service';
import { AuthService } from '../../../core/services/auth.service';
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
  imports: [CommonModule, TranslateModule],
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
  @Output() error = new EventEmitter<string>();

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
      this.error.emit('Usuario no autenticado');
      return;
    }

    try {
      const result = await this.confirmationService.confirmRenter({
        booking_id: this.bookingId,
        confirming_user_id: userId,
      });

      this.confirmationResult.set(result);
      this.message.set(result.message);
      this.confirmed.emit(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al confirmar';
      this.message.set(`Error: ${errorMessage}`);
      this.error.emit(errorMessage);
    }
  }
}
