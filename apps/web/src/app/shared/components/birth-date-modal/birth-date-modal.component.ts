
import {Component, EventEmitter, inject, Output, signal,
  ChangeDetectionStrategy} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProfileService } from '../../../core/services/profile.service';
import { NotificationManagerService } from '../../../core/services/notification-manager.service';
import { calculateAge, validateBirthDate, getMin18BirthDate } from '../../utils/age-calculator';

/**
 * Modal component to collect user's date of birth before booking
 * Shows when user attempts to book but has no date_of_birth in profile
 */
@Component({
  selector: 'app-birth-date-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <!-- Modal Overlay -->
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        class="w-full max-w-md rounded-2xl bg-white dark:bg-surface-raised shadow-xl"
        (click)="$event.stopPropagation()"
        >
        <!-- Header -->
        <div class="px-6 pt-6 pb-4 border-b border-border-default dark:border-border-muted">
          <h2 class="text-xl font-bold text-text-primary dark:text-text-inverse">
            Necesitamos tu fecha de nacimiento
          </h2>
          <p class="mt-2 text-sm text-text-secondary dark:text-text-secondary">
            Para calcular el precio exacto del seguro, necesitamos conocer tu edad
          </p>
        </div>
    
        <!-- Body -->
        <form [formGroup]="form" class="p-6 space-y-4">
          <div>
            <label
              class="block text-sm font-semibold text-text-primary dark:text-text-primary mb-2"
              >
              Fecha de Nacimiento
            </label>
            <input
              type="date"
              formControlName="date_of_birth"
              [max]="getMaxBirthDate()"
              class="w-full px-4 py-2.5 rounded-lg border border-border-default dark:border-border-muted bg-surface-base dark:bg-surface-base text-text-primary dark:text-text-inverse focus:outline-none focus:ring-2 focus:ring-cta-default/50 focus:border-cta-default transition-colors"
              [class.border-error-text]="showError()"
              />
    
            <!-- Age Display -->
            @if (calculatedAge()) {
              <p class="mt-2 text-sm text-success-strong">
                ✓ Edad: {{ calculatedAge() }} años
              </p>
            }
    
            <!-- Validation Error -->
            @if (showError()) {
              <p class="mt-2 text-sm text-error-text">
                {{ errorMessage() }}
              </p>
            }
    
            <!-- Helper Text -->
            @if (!form.value.date_of_birth) {
              <p
                class="mt-2 text-xs text-text-secondary dark:text-text-secondary"
                >
                Debes tener al menos 18 años para alquilar un vehículo
              </p>
            }
          </div>
    
          <!-- Privacy Notice -->
          <div
            class="rounded-lg bg-surface-hover dark:bg-surface-base/50 p-4 border border-border-default dark:border-border-muted/50"
            >
            <div class="flex gap-3">
              <svg
                class="h-5 w-5 text-cta-default flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
              </svg>
              <div>
                <h4 class="text-sm font-semibold text-text-primary dark:text-text-primary">
                  Tu privacidad está protegida
                </h4>
                <p class="mt-1 text-xs text-text-secondary dark:text-text-secondary">
                  Esta información solo se usa para calcular el precio del seguro. No se comparte
                  con terceros.
                </p>
              </div>
            </div>
          </div>
        </form>
    
        <!-- Footer -->
        <div class="flex gap-3 px-6 pb-6">
          <button
            type="button"
            (click)="onCancel()"
            [disabled]="saving()"
            class="flex-1 px-4 py-2.5 rounded-lg border border-border-default dark:border-border-muted text-text-primary dark:text-text-inverse hover:bg-surface-hover dark:hover:bg-surface-base/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
            Cancelar
          </button>
          <button
            type="button"
            (click)="onSubmit()"
            [disabled]="!canSubmit() || saving()"
            class="flex-1 px-4 py-2.5 rounded-lg bg-cta-default hover:bg-cta-hover text-text-inverse-pure font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
            @if (saving()) {
              <span>Guardando...</span>
            }
            @if (!saving()) {
              <span>Continuar</span>
            }
          </button>
        </div>
      </div>
    </div>
    `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class BirthDateModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly profileService = inject(ProfileService);
  private readonly toastService = inject(NotificationManagerService);

  @Output() completed = new EventEmitter<string>(); // Emits date_of_birth on success
  @Output() cancelled = new EventEmitter<void>();

  readonly saving = signal(false);

  readonly form = this.fb.nonNullable.group({
    date_of_birth: ['', Validators.required],
  });

  readonly calculatedAge = signal<number | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly touched = signal(false);

  readonly showError = signal(false);
  readonly canSubmit = signal(false);

  constructor() {
    // Watch form value changes
    this.form.get('date_of_birth')?.valueChanges.subscribe((value) => {
      this.updateValidation(value);
    });
  }

  private updateValidation(birthDate: string): void {
    if (!birthDate) {
      this.calculatedAge.set(null);
      this.errorMessage.set(null);
      this.showError.set(false);
      this.canSubmit.set(false);
      return;
    }

    // Calculate age
    const age = calculateAge(birthDate);
    this.calculatedAge.set(age);

    // Validate
    const validation = validateBirthDate(birthDate);

    if (!validation.valid) {
      this.errorMessage.set(validation.error || 'Fecha inválida');
      this.showError.set(true);
      this.canSubmit.set(false);
    } else {
      this.errorMessage.set(null);
      this.showError.set(false);
      this.canSubmit.set(true);
    }
  }

  getMaxBirthDate(): string {
    const maxDate = getMin18BirthDate();
    return maxDate.toISOString().split('T')[0];
  }

  async onSubmit(): Promise<void> {
    this.touched.set(true);

    const birthDate = this.form.value.date_of_birth;
    if (!birthDate) {
      this.errorMessage.set('Por favor ingresa tu fecha de nacimiento');
      this.showError.set(true);
      return;
    }

    // Validate one more time
    const validation = validateBirthDate(birthDate);
    if (!validation.valid) {
      this.errorMessage.set(validation.error || 'Fecha inválida');
      this.showError.set(true);
      return;
    }

    this.saving.set(true);

    try {
      // Update profile with date_of_birth
      await this.profileService.safeUpdateProfile({
        date_of_birth: birthDate,
      });

      this.toastService.success(
        'Fecha guardada',
        'Tu fecha de nacimiento ha sido guardada exitosamente',
        3000,
      );

      this.completed.emit(birthDate);
    } catch (error) {
      console.error('Error saving date of birth:', error);
      this.toastService.error(
        'Error al guardar',
        'No pudimos guardar tu fecha de nacimiento. Por favor intenta nuevamente.',
        4000,
      );
      this.showError.set(true);
      this.errorMessage.set('Error al guardar. Intenta nuevamente.');
    } finally {
      this.saving.set(false);
    }
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}
