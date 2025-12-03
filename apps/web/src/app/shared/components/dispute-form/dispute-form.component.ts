import { Component, input, output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DisputesService, DisputeKind, Dispute } from '../../../core/services/disputes.service';
import { NotificationManagerService } from '../../../core/services/notification-manager.service';
import { EvidenceUploaderComponent } from '../../../features/disputes/components/evidence-uploader/evidence-uploader.component';

@Component({
  selector: 'app-dispute-form',
  standalone: true,
  imports: [CommonModule, FormsModule, EvidenceUploaderComponent], // Añadir EvidenceUploaderComponent
  template: `
    <div
      *ngIf="isOpen()"
      class="fixed inset-0 z-50 flex items-center justify-center bg-surface-overlay/50 p-4"
      (click)="onBackdropClick($event)"
    >
      <div
        class="bg-surface-raised dark:bg-surface-raised rounded-2xl shadow-2xl max-w-2xl w-full p-6 transform transition-all max-h-[90vh] overflow-y-auto"
        (click)="$event.stopPropagation()"
      >
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-bold text-text-primary dark:text-text-secondary">
            {{ createdDisputeId() ? 'Añadir Evidencia' : 'Crear Disputa' }}
          </h2>
          <button
            type="button"
            (click)="close()"
            class="text-text-secondary hover:text-text-primary dark:hover:text-pearl-light transition-colors"
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
          <p class="text-sm text-text-secondary dark:text-text-secondary">
            {{
              createdDisputeId()
                ? 'Ahora puedes subir archivos para respaldar tu disputa.'
                : 'Si tienes un problema con esta reserva, puedes crear una disputa. Nuestro equipo la revisará y te ayudará a resolverla.'
            }}
          </p>

          <div *ngIf="!createdDisputeId()">
            <!-- Dispute Kind Selector -->
            <div>
              <label
                class="block text-sm font-medium text-text-primary dark:text-text-secondary mb-2"
              >
                Tipo de Disputa *
              </label>
              <select
                [(ngModel)]="selectedKind"
                class="w-full px-4 py-3 rounded-xl border-2 border-border-default dark:border-border-default bg-surface-raised dark:bg-surface-secondary focus:border-cta-default focus:ring-2 focus:ring-cta-default/20 transition-all"
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
              <label
                class="block text-sm font-medium text-text-primary dark:text-text-secondary mb-2"
              >
                Descripción *
              </label>
              <textarea
                [(ngModel)]="description"
                rows="6"
                placeholder="Describe el problema en detalle..."
                class="w-full px-4 py-3 rounded-xl border-2 border-border-default dark:border-border-default bg-surface-raised dark:bg-surface-secondary focus:border-cta-default focus:ring-2 focus:ring-cta-default/20 transition-all resize-none"
                required
              ></textarea>
              <p class="text-xs text-text-secondary dark:text-text-secondary mt-1">
                Proporciona todos los detalles relevantes para ayudar a nuestro equipo a entender el
                problema.
              </p>
            </div>
          </div>

          <div *ngIf="createdDisputeId()" class_selector="mt-4">
            <app-evidence-uploader [disputeId]="createdDisputeId()"></app-evidence-uploader>
          </div>

          <!-- Error Message -->
          <div
            *ngIf="error()"
            class="p-3 bg-error-bg dark:bg-error-900/20 border border-error-border dark:border-error-800 rounded-xl text-sm text-error-strong"
          >
            {{ error() }}
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-3 mt-6">
          <button
            type="button"
            (click)="close()"
            class="flex-1 px-4 py-3 rounded-xl border-2 border-border-default dark:border-border-default text-text-secondary hover:bg-surface-raised dark:hover:bg-slate-deep transition-all font-medium"
          >
            {{ createdDisputeId() ? 'Finalizar' : 'Cancelar' }}
          </button>
          <button
            *ngIf="!createdDisputeId()"
            type="button"
            (click)="submit()"
            [disabled]="!canSubmit() || loading()"
            [class.opacity-50]="!canSubmit() || loading()"
            [class.cursor-not-allowed]="!canSubmit() || loading()"
            class="flex-1 px-4 py-3 rounded-xl bg-cta-default text-cta-text hover:bg-cta-default/90 transition-all font-medium flex items-center justify-center gap-2"
          >
            <svg
              *ngIf="loading()"
              class="animate-spin h-5 w-5 text-text-inverse"
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
  private readonly toastService = inject(NotificationManagerService);

  readonly isOpen = input.required<boolean>();
  readonly bookingId = input.required<string>();

  readonly closeModal = output<void>();
  readonly disputeCreated = output<void>();

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly createdDisputeId = signal<string | null>(null); // Para almacenar el ID de la disputa creada

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
      const newDispute: Dispute = await this.disputesService.createDispute({
        bookingId: this.bookingId(),
        kind: this.selectedKind as DisputeKind,
        description: this.description.trim(),
      });
      this.createdDisputeId.set(newDispute.id); // Almacenar el ID de la disputa creada

      this.toastService.success('Disputa creada exitosamente. Ahora puedes añadir evidencias.', '');
      // No cerramos el modal, permitimos subir evidencia
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
    this.createdDisputeId.set(null); // Resetear también el ID de disputa
  }
}
