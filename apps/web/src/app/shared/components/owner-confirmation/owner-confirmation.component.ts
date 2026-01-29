import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  inject,
  DestroyRef,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';

import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  BookingConfirmationService,
  ConfirmAndReleaseResponse,
} from '@core/services/bookings/booking-confirmation.service';
import { AuthService } from '@core/services/auth/auth.service';

/**
 * Componente de confirmación del propietario (locador)
 *
 * Permite al propietario:
 * - Confirmar que recibió el vehículo
 * - Reportar daños opcionalmente (con monto y descripción)
 * - Ver el estado de confirmación del locatario
 *
 * Cuando AMBOS confirman → se liberan fondos automáticamente:
 * - Rental payment → al propietario
 * - Deposit (o deposit - daños) → de vuelta al wallet del locatario
 */
@Component({
  selector: 'app-owner-confirmation',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TranslateModule],
  templateUrl: './owner-confirmation.component.html',
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class OwnerConfirmationComponent implements OnInit {
  private readonly confirmationService = inject(BookingConfirmationService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

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
   * Formulario de confirmación
   */
  readonly form = new FormGroup({
    has_damages: new FormControl<boolean>(false, { nonNullable: true }),
    damage_amount: new FormControl<number | null>(null),
    damage_description: new FormControl<string | null>(null),
  });

  /**
   * Shortcut para el loading state del servicio
   */
  readonly loading = this.confirmationService.loading;

  constructor() {}

  ngOnInit(): void {
    // Cuando se marca "tiene daños", hacer campos de daño requeridos
    this.form.controls.has_damages.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((hasDamages) => {
        if (hasDamages) {
          this.form.controls.damage_amount?.setValidators([
            Validators.required,
            Validators.min(1),
            Validators.max(250),
          ]);
          this.form.controls.damage_description?.setValidators([
            Validators.required,
            Validators.minLength(10),
          ]);
        } else {
          this.form.controls.damage_amount?.clearValidators();
          this.form.controls.damage_description?.clearValidators();
        }
        this.form.controls.damage_amount?.updateValueAndValidity();
        this.form.controls.damage_description?.updateValueAndValidity();
      });
  }

  /**
   * Procesa la confirmación del propietario
   */
  async confirm(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const userId = this.auth.sessionSignal()?.user?.id;
    if (!userId) {
      this.message.set('Error: Usuario no autenticado');
      this.errorOccurred.emit('Usuario no autenticado');
      return;
    }

    try {
      const formValue = this.form.getRawValue();

      const result = await this.confirmationService.confirmOwner({
        booking_id: this.bookingId,
        confirming_user_id: userId,
        has_damages: formValue.has_damages,
        damage_amount: formValue.damage_amount ?? undefined,
        damage_description: formValue.damage_description ?? undefined,
      });

      this.confirmationResult.set(result);
      this.message.set(result.message);
      this.confirmed.emit(result);

      // Deshabilitar form después de confirmar
      this.form.disable();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al confirmar';
      this.message.set(`Error: ${errorMessage}`);
      this.errorOccurred.emit(errorMessage);
    }
  }

  /**
   * Resetea el formulario
   */
  reset(): void {
    this.form.reset({
      has_damages: false,
      damage_amount: null,
      damage_description: null,
    });
    this.confirmationResult.set(null);
    this.message.set(null);
    this.form.enable();
  }
}
