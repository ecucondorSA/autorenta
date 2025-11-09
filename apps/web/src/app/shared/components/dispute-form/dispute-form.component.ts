import { Component, input, output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DisputesService, DisputeKind } from '../../../core/services/disputes.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-dispute-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      *ngIf="isOpen()"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      (click)="onBackdropClick($event)"
    >
      <div
        class="bg-white dark:bg-slate-deep-pure rounded-2xl shadow-2xl max-w-2xl w-full p-6 transform transition-all max-h-[90vh] overflow-y-auto"
        (click)="$event.stopPropagation()"
      >
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-bold text-smoke-black dark:text-pearl-light">Crear Disputa</h2>
          <button
            type="button"
            (click)="close()"
            class="text-charcoal-medium hover:text-smoke-black dark:hover:text-pearl-light transition-colors"
            aria-label="Cerrar"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="space-y-4">
          <p class="text-sm text-charcoal-medium dark:text-pearl-light">
            Si tienes un problema con esta reserva, puedes crear una disputa. Nuestro equipo la
            revisará y te ayudará a resolverla.
          </p>

          <!-- Dispute Kind Selector -->
          <div>
            <label class="block text-sm font-medium text-smoke-black dark:text-pearl-light mb-2">
              Tipo de Disputa *
            </label>
            <select
              [(ngModel)]="selectedKind"
              class="w-full px-4 py-3 rounded-xl border-2 border-pearl-gray dark:border-gray-600 bg-white dark:bg-slate-deep focus:border-accent-petrol focus:ring-2 focus:ring-accent-petrol/20 transition-all"
            >
              <option value="">-- Seleccionar tipo --</option>
              <option value="damage">Daños al vehículo</option>
              <option value="no_show">No se presentó</option>
              <option value="late_return">Devolución tardía</option>
              <option value="other">Otro</option>
            </select>
          </div>

          <!-- Description -->
          <div>
            <label class="block text-sm font-medium text-smoke-black dark:text-pearl-light mb-2">
              Descripción *
            </label>
            <textarea
              [(ngModel)]="description"
              rows="6"
              placeholder="Describe el problema en detalle..."
              class="w-full px-4 py-3 rounded-xl border-2 border-pearl-gray dark:border-gray-600 bg-white dark:bg-slate-deep focus:border-accent-petrol focus:ring-2 focus:ring-accent-petrol/20 transition-all resize-none"
              required
            ></textarea>
            <p class="text-xs text-charcoal-medium dark:text-pearl-light mt-1">
              Proporciona todos los detalles relevantes para ayudar a nuestro equipo a entender el
              problema.
            </p>
          </div>

          <!-- Error Message -->
          <div
            *ngIf="error()"
            class="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400"
          >
            {{ error() }}
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-3 mt-6">
          <button
            type="button"
            (click)="close()"
            class="flex-1 px-4 py-3 rounded-xl border-2 border-pearl-gray dark:border-gray-600 text-charcoal-medium hover:bg-gray-100 dark:hover:bg-slate-deep transition-all font-medium"
          >
            Cancelar
          </button>
          <button
            type="button"
            (click)="submit()"
            [disabled]="!canSubmit() || loading()"
            [class.opacity-50]="!canSubmit() || loading()"
            [class.cursor-not-allowed]="!canSubmit() || loading()"
            class="flex-1 px-4 py-3 rounded-xl bg-accent-petrol text-white hover:bg-accent-petrol/90 transition-all font-medium flex items-center justify-center gap-2"
          >
            <svg
              *ngIf="loading()"
              class="animate-spin h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span>{{ loading() ? 'Creando...' : 'Crear Disputa' }}</span>
          </button>
        </div>
      </div>
    </div>
  `,
})
export class DisputeFormComponent {
  private readonly disputesService = inject(DisputesService);
  private readonly toastService = inject(ToastService);

  readonly isOpen = input.required<boolean>();
  readonly bookingId = input.required<string>();

  readonly closeModal = output<void>();
  readonly disputeCreated = output<void>();

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  selectedKind: DisputeKind | '' = '';
  description = '';

  canSubmit(): boolean {
    return !!this.selectedKind && !!this.description.trim();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  close(): void {
    this.resetForm();
    this.closeModal.emit();
  }

  async submit(): Promise<void> {
    if (!this.canSubmit() || this.loading()) return;

    this.loading.set(true);
    this.error.set(null);

    try {
      await this.disputesService.createDispute({
        bookingId: this.bookingId(),
        kind: this.selectedKind as DisputeKind,
        description: this.description.trim(),
      });

      this.toastService.success('Disputa creada', 'Nuestro equipo la revisará pronto');
      this.disputeCreated.emit();
      this.close();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Error al crear la disputa');
    } finally {
      this.loading.set(false);
    }
  }

  private resetForm(): void {
    this.selectedKind = '';
    this.description = '';
    this.error.set(null);
  }
}
