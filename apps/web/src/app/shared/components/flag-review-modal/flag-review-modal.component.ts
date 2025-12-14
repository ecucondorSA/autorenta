import {Component, input, output, signal, inject,
  ChangeDetectionStrategy} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { ReviewsService } from '../../../core/services/reviews.service';
import { NotificationManagerService } from '../../../core/services/notification-manager.service';

@Component({
  selector: 'app-flag-review-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    @if (isOpen()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-surface-overlay/50 p-4"
        (click)="onBackdropClick($event)"
        >
        <div
          class="bg-surface-raised dark:bg-surface-raised rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all"
          (click)="$event.stopPropagation()"
          >
          <!-- Header -->
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-text-primary dark:text-text-secondary">
              Reportar Reseña
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
              ¿Por qué quieres reportar esta reseña? Tu reporte será revisado por nuestro equipo de
              moderación.
            </p>
            <!-- Reason Selector -->
            <div>
              <label
                class="block text-sm font-medium text-text-primary dark:text-text-secondary mb-2"
                >
                Motivo *
              </label>
              <select
                [(ngModel)]="selectedReason"
                class="w-full px-4 py-3 rounded-xl border-2 border-border-default dark:border-border-default bg-surface-raised dark:bg-surface-secondary focus:border-cta-default focus:ring-2 focus:ring-cta-default/20 transition-all"
                >
                <option value="">-- Seleccionar motivo --</option>
                <option value="inappropriate_content">Contenido inapropiado</option>
                <option value="spam">Spam o publicidad</option>
                <option value="false_information">Información falsa</option>
                <option value="harassment">Acoso o lenguaje ofensivo</option>
                <option value="off_topic">No relacionado con la experiencia</option>
                <option value="other">Otro</option>
              </select>
            </div>
            <!-- Additional Details -->
            <div>
              <label
                class="block text-sm font-medium text-text-primary dark:text-text-secondary mb-2"
                >
                Detalles adicionales (opcional)
              </label>
              <textarea
                [(ngModel)]="additionalDetails"
                rows="4"
                placeholder="Proporciona más información sobre el problema..."
                class="w-full px-4 py-3 rounded-xl border-2 border-border-default dark:border-border-default bg-surface-raised dark:bg-surface-secondary focus:border-cta-default focus:ring-2 focus:ring-cta-default/20 transition-all resize-none"
              ></textarea>
            </div>
            <!-- Error Message -->
            @if (error()) {
              <div
                class="p-3 bg-error-bg dark:bg-error-900/20 border border-error-border dark:border-error-800 rounded-xl text-sm text-error-strong"
                >
                {{ error() }}
              </div>
            }
          </div>
          <!-- Actions -->
          <div class="flex gap-3 mt-6">
            <button
              type="button"
              (click)="close()"
              class="flex-1 px-4 py-3 rounded-xl border-2 border-border-default dark:border-border-default text-text-secondary hover:bg-surface-raised dark:hover:bg-slate-deep transition-all font-medium"
              >
              Cancelar
            </button>
            <button
              type="button"
              (click)="submit()"
              [disabled]="!canSubmit() || loading()"
              [class.opacity-50]="!canSubmit() || loading()"
              [class.cursor-not-allowed]="!canSubmit() || loading()"
              class="flex-1 px-4 py-3 rounded-xl bg-cta-default text-cta-text hover:bg-cta-default/90 transition-all font-medium flex items-center justify-center gap-2"
              >
              @if (loading()) {
                <svg
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
              }
              <span>{{ loading() ? 'Enviando...' : 'Reportar' }}</span>
            </button>
          </div>
        </div>
      </div>
    }
    `,
})
export class FlagReviewModalComponent {
  private readonly reviewsService = inject(ReviewsService);
  private readonly toastService = inject(NotificationManagerService);

  readonly isOpen = input.required<boolean>();
  readonly reviewId = input.required<string>();

  readonly closeModal = output<void>();
  readonly flagged = output<void>();

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  selectedReason = '';
  additionalDetails = '';

  canSubmit(): boolean {
    return !!this.selectedReason;
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
      const reason = this.additionalDetails
        ? `${this.selectedReason}: ${this.additionalDetails}`
        : this.selectedReason;

      const success = await this.reviewsService.flagReview(this.reviewId(), reason);

      if (success) {
        this.toastService.success('Reseña reportada. Nuestro equipo la revisará pronto.', '');
        this.flagged.emit();
        this.close();
      } else {
        this.error.set('No se pudo reportar la reseña. Por favor, intenta nuevamente.');
      }
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Error al reportar la reseña');
    } finally {
      this.loading.set(false);
    }
  }

  private resetForm(): void {
    this.selectedReason = '';
    this.additionalDetails = '';
    this.error.set(null);
  }
}
