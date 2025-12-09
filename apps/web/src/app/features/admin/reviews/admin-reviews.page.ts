import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ReviewsService } from '../../../core/services/reviews.service';
import { Review } from '../../../core/models';

interface ModerationStatusOption {
  value: string;
  label: string;
}

/**
 * Admin Reviews Moderation Dashboard
 * Lists all flagged reviews with filtering by moderation status
 * Allows admin to approve or reject flagged reviews
 */
@Component({
  selector: 'app-admin-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="max-w-7xl mx-auto py-8 px-4">
      <!-- Header -->
      <div class="mb-6">
        <button
          routerLink="/admin"
          class="inline-flex items-center gap-2 text-sm font-medium text-cta-default hover:text-warning-strong transition-base mb-4"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Volver al Dashboard
        </button>

        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-text-primary dark:text-text-inverse">
              Moderación de Reseñas
            </h1>
            <p class="text-text-secondary dark:text-text-secondary mt-1">
              Gestiona reseñas reportadas por usuarios
            </p>
          </div>
          <div class="text-right">
            <p class="text-sm text-text-secondary dark:text-text-muted">Reseñas pendientes</p>
            <p class="text-2xl font-bold text-text-primary dark:text-text-inverse">
              {{ pendingCount() }}
            </p>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div
        class="bg-surface-raised dark:bg-surface-secondary rounded-lg border border-border-default dark:border-border-muted p-4 mb-6 shadow-sm"
      >
        <h3 class="text-sm font-semibold text-text-primary dark:text-text-secondary mb-3">
          Filtros
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Status Filter -->
          <div>
            <label
              class="block text-sm font-medium text-text-primary dark:text-text-secondary mb-1"
            >
              Estado de Moderación
            </label>
            <select
              [(ngModel)]="filterStatus"
              (ngModelChange)="onFilterChange()"
              class="w-full rounded-lg border border-border-muted dark:border-border-default bg-surface-raised dark:bg-surface-base px-3 py-2 text-sm"
            >
              <option value="">Todos los estados</option>
              <option *ngFor="let status of statusOptions" [value]="status.value">
                {{ status.label }}
              </option>
            </select>
          </div>

          <!-- Bulk Actions -->
          <div *ngIf="selectedReviews().length > 0" class="flex items-end gap-2">
            <button
              (click)="bulkApprove()"
              class="px-4 py-2 bg-success-light text-text-primary rounded-lg hover:bg-success-light transition-colors text-sm font-medium"
            >
              Aprobar Seleccionadas ({{ selectedReviews().length }})
            </button>
            <button
              (click)="bulkReject()"
              class="px-4 py-2 bg-error-600 text-text-inverse rounded-lg hover:bg-error-700 transition-colors text-sm font-medium"
            >
              Rechazar Seleccionadas ({{ selectedReviews().length }})
            </button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading()" class="text-center py-12">
        <div
          class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-cta-default border-r-transparent"
        ></div>
        <p class="mt-4 text-text-secondary dark:text-text-muted">Cargando reseñas...</p>
      </div>

      <!-- Error State -->
      <div
        *ngIf="error() && !loading()"
        class="bg-error-bg dark:bg-error-bg0/15 border border-error-border dark:border-error-400/40 rounded-lg p-6 text-center"
      >
        <p class="text-error-strong">{{ error() }}</p>
        <button
          (click)="loadReviews()"
          class="mt-4 px-4 py-2 bg-error-600 text-text-inverse rounded-lg hover:bg-error-700 transition-colors"
        >
          Reintentar
        </button>
      </div>

      <!-- Reviews List -->
      <div *ngIf="!loading() && !error()" class="space-y-4">
        <!-- Empty State -->
        <div
          *ngIf="filteredReviews().length === 0"
          class="bg-surface-raised dark:bg-surface-secondary rounded-lg border border-border-default dark:border-border-muted p-12 text-center"
        >
          <svg
            class="mx-auto h-12 w-12 text-text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 class="mt-2 text-sm font-medium text-text-primary dark:text-text-inverse">
            No hay reseñas reportadas
          </h3>
          <p class="mt-1 text-sm text-text-secondary dark:text-text-muted">
            Todas las reseñas están en buen estado.
          </p>
        </div>

        <!-- Review Cards -->
        <div
          *ngFor="let review of filteredReviews()"
          class="bg-surface-raised dark:bg-surface-secondary rounded-lg border border-border-default dark:border-border-muted p-6 shadow-sm hover:shadow-md transition-shadow"
        >
          <!-- Header with Checkbox -->
          <div class="flex items-start gap-4">
            <input
              type="checkbox"
              [checked]="isSelected(review.id)"
              (change)="toggleSelection(review.id)"
              class="mt-1 h-4 w-4 rounded border-border-muted"
            />

            <div class="flex-1">
              <!-- Review Info -->
              <div class="flex items-start justify-between mb-4">
                <div class="flex items-center gap-3">
                  <img
                    [src]="review.reviewer_avatar || '/assets/avatar-placeholder.png'"
                    [alt]="review.reviewer_name"
                    class="h-10 w-10 rounded-full object-cover"
                  />
                  <div>
                    <p class="font-semibold text-text-primary dark:text-text-inverse">
                      {{ review.reviewer_name }}
                    </p>
                    <p class="text-xs text-text-secondary dark:text-text-muted">
                      Reseña para: {{ review.reviewee_name }}
                    </p>
                  </div>
                </div>

                <!-- Moderation Status Badge -->
                <span
                  [class]="getModerationBadgeClass(review.moderation_status)"
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                >
                  {{ getModerationStatusLabel(review.moderation_status) }}
                </span>
              </div>

              <!-- Rating -->
              <div class="flex items-center gap-2 mb-2">
                <span class="text-lg font-bold text-text-primary dark:text-text-inverse">
                  {{ getOverallRating(review).toFixed(1) }}
                </span>
                <div class="flex gap-0.5">
                  <svg
                    *ngFor="let _ of [1, 2, 3, 4, 5]"
                    class="h-4 w-4 text-warning-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                    />
                  </svg>
                </div>
                <span class="text-sm text-text-secondary dark:text-text-muted">
                  {{ review.created_at | date: 'short' }}
                </span>
              </div>

              <!-- Category Ratings -->
              <div class="grid grid-cols-3 gap-2 mb-4">
                <div
                  *ngFor="let category of getCategoryRatings(review)"
                  class="flex items-center justify-between text-xs"
                >
                  <span class="text-text-secondary dark:text-text-muted"
                    >{{ category.label }}:</span
                  >
                  <span class="font-semibold text-text-primary dark:text-text-inverse">
                    {{ category.value.toFixed(1) }}
                  </span>
                </div>
              </div>

              <!-- Public Comment -->
              <div class="bg-surface-base dark:bg-surface-base rounded-lg p-3 mb-4">
                <p class="text-sm font-medium text-text-primary dark:text-text-secondary mb-1">
                  Comentario Público:
                </p>
                <p class="text-sm text-text-primary dark:text-text-inverse">
                  {{ review.comment_public || '(Sin comentario público)' }}
                </p>
              </div>

              <!-- Flag Reason -->
              <div class="bg-error-bg dark:bg-error-bg0/10 rounded-lg p-3 mb-4">
                <p class="text-sm font-medium text-error-strong mb-1">Motivo del Reporte:</p>
                <p class="text-sm text-error-strong">{{ review.flag_reason }}</p>
                <p class="text-xs text-error-text mt-1">
                  Reportado por: {{ review.flagged_by_name || 'Usuario' }} el
                  {{ review.flagged_at | date: 'short' }}
                </p>
              </div>

              <!-- Moderation Notes (if moderated) -->
              <div
                *ngIf="review.moderation_notes"
                class="bg-cta-default/10 dark:bg-cta-default/10 rounded-lg p-3 mb-4"
              >
                <p class="text-sm font-medium text-cta-default dark:text-cta-default mb-1">
                  Notas de Moderación:
                </p>
                <p class="text-sm text-cta-default dark:text-cta-default">
                  {{ review.moderation_notes }}
                </p>
                <p class="text-xs text-cta-default dark:text-cta-default mt-1">
                  Moderado por: {{ review.moderated_by_name || 'Usuario' }} el
                  {{ review.moderated_at | date: 'short' }}
                </p>
              </div>

              <!-- Action Buttons -->
              <div *ngIf="review.moderation_status === 'pending'" class="flex gap-2">
                <button
                  (click)="openModerationModal(review, 'approved')"
                  class="flex-1 px-4 py-2 bg-success-light text-text-primary rounded-lg hover:bg-success-light transition-colors text-sm font-medium"
                >
                  ✓ Aprobar
                </button>
                <button
                  (click)="openModerationModal(review, 'rejected')"
                  class="flex-1 px-4 py-2 bg-error-600 text-text-inverse rounded-lg hover:bg-error-700 transition-colors text-sm font-medium"
                >
                  ✗ Rechazar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Moderation Modal -->
    <div
      *ngIf="showModal()"
      class="fixed inset-0 z-50 flex items-center justify-center bg-surface-overlay bg-opacity-50 p-4"
      (click)="closeModal()"
    >
      <div
        class="bg-surface-raised dark:bg-surface-secondary rounded-lg shadow-xl max-w-md w-full p-6"
        (click)="$event.stopPropagation()"
      >
        <h3 class="text-lg font-semibold text-text-primary dark:text-text-inverse mb-4">
          {{ modalAction() === 'approved' ? 'Aprobar' : 'Rechazar' }} Reseña
        </h3>

        <p class="text-sm text-text-secondary dark:text-text-muted mb-4">
          ¿Estás seguro de que deseas {{ modalAction() === 'approved' ? 'aprobar' : 'rechazar' }}
          esta reseña?
          {{
            modalAction() === 'rejected'
              ? 'La reseña será ocultada y no será visible públicamente.'
              : ''
          }}
        </p>

        <!-- Notes Input -->
        <div class="mb-4">
          <label class="block text-sm font-medium text-text-primary dark:text-text-secondary mb-2">
            Notas de moderación (opcional):
          </label>
          <textarea
            [(ngModel)]="moderationNotes"
            rows="3"
            class="w-full rounded-lg border border-border-muted dark:border-border-default bg-surface-raised dark:bg-surface-base px-3 py-2 text-sm"
            placeholder="Agrega notas sobre esta decisión..."
          ></textarea>
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-2">
          <button
            (click)="closeModal()"
            class="flex-1 px-4 py-2 bg-surface-hover dark:bg-surface-base text-text-primary dark:text-text-secondary rounded-lg hover:bg-surface-pressed dark:hover:bg-gray-600 transition-colors text-sm font-medium"
          >
            Cancelar
          </button>
          <button
            (click)="confirmModeration()"
            [disabled]="processing()"
            [class]="
              modalAction() === 'approved'
                ? 'bg-success-light hover:bg-success-light'
                : 'bg-error-600 hover:bg-error-700'
            "
            class="flex-1 px-4 py-2 text-text-inverse rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
          >
            {{ processing() ? 'Procesando...' : 'Confirmar' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class AdminReviewsPage implements OnInit {
  private readonly reviewsService = inject(ReviewsService);

  // State
  readonly reviews = signal<Review[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly processing = signal(false);

  // Filters
  filterStatus = '';

  // Moderation modal
  readonly showModal = signal(false);
  readonly selectedReview = signal<Review | null>(null);
  readonly modalAction = signal<'approved' | 'rejected'>('approved');
  moderationNotes = '';

  // Bulk actions
  readonly selectedReviews = signal<string[]>([]);

  // Options
  readonly statusOptions: ModerationStatusOption[] = [
    { value: 'pending', label: 'Pendiente' },
    { value: 'approved', label: 'Aprobado' },
    { value: 'rejected', label: 'Rechazado' },
  ];

  // Computed
  readonly filteredReviews = computed(() => {
    const reviews = this.reviews();
    if (!this.filterStatus) return reviews;
    return reviews.filter((r) => r.moderation_status === this.filterStatus);
  });

  readonly pendingCount = computed(() => {
    return this.reviews().filter((r) => r.moderation_status === 'pending').length;
  });

  ngOnInit(): void {
    this.loadReviews();
  }

  async loadReviews(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const reviews = await this.reviewsService.getFlaggedReviews();
      this.reviews.set(reviews);
    } catch (err) {
      this.error.set('Error al cargar las reseñas reportadas');
      console.error(err);
    } finally {
      this.loading.set(false);
    }
  }

  onFilterChange(): void {
    // Filter is computed automatically
  }

  openModerationModal(review: Review, action: 'approved' | 'rejected'): void {
    this.selectedReview.set(review);
    this.modalAction.set(action);
    this.moderationNotes = '';
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedReview.set(null);
    this.moderationNotes = '';
  }

  async confirmModeration(): Promise<void> {
    const review = this.selectedReview();
    if (!review) return;

    this.processing.set(true);

    try {
      const result = await this.reviewsService.moderateReview(
        review.id,
        this.modalAction(),
        this.moderationNotes || undefined,
      );

      if (result.success) {
        await this.loadReviews();
        this.closeModal();
      } else {
        this.error.set(result.error || 'Error al moderar la reseña');
      }
    } catch (err) {
      this.error.set('Error al moderar la reseña');
      console.error(err);
    } finally {
      this.processing.set(false);
    }
  }

  toggleSelection(reviewId: string): void {
    const selected = this.selectedReviews();
    if (selected.includes(reviewId)) {
      this.selectedReviews.set(selected.filter((id) => id !== reviewId));
    } else {
      this.selectedReviews.set([...selected, reviewId]);
    }
  }

  isSelected(reviewId: string): boolean {
    return this.selectedReviews().includes(reviewId);
  }

  async bulkApprove(): Promise<void> {
    if (this.selectedReviews().length === 0) return;

    if (!confirm(`¿Aprobar ${this.selectedReviews().length} reseñas seleccionadas?`)) return;

    this.processing.set(true);

    try {
      const result = await this.reviewsService.bulkModerateReviews(
        this.selectedReviews(),
        'approved',
      );

      if (result.success) {
        await this.loadReviews();
        this.selectedReviews.set([]);
      } else {
        this.error.set(result.error || 'Error al aprobar las reseñas');
      }
    } catch (err) {
      this.error.set('Error al aprobar las reseñas');
      console.error(err);
    } finally {
      this.processing.set(false);
    }
  }

  async bulkReject(): Promise<void> {
    if (this.selectedReviews().length === 0) return;

    if (!confirm(`¿Rechazar ${this.selectedReviews().length} reseñas seleccionadas?`)) return;

    this.processing.set(true);

    try {
      const result = await this.reviewsService.bulkModerateReviews(
        this.selectedReviews(),
        'rejected',
      );

      if (result.success) {
        await this.loadReviews();
        this.selectedReviews.set([]);
      } else {
        this.error.set(result.error || 'Error al rechazar las reseñas');
      }
    } catch (err) {
      this.error.set('Error al rechazar las reseñas');
      console.error(err);
    } finally {
      this.processing.set(false);
    }
  }

  getModerationStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      approved: 'Aprobado',
      rejected: 'Rechazado',
    };
    return labels[status] || status;
  }

  getModerationBadgeClass(status: string): string {
    const classes: Record<string, string> = {
      pending:
        'bg-warning-bg-hover text-warning-strong dark:bg-warning-bg0/20 dark:text-warning-300',
      approved:
        'bg-success-light/20 text-success-700 dark:bg-success-light/20 dark:text-success-strong',
      rejected: 'bg-error-bg-hover text-error-strong dark:bg-error-bg0/20 dark:text-error-300',
    };
    return classes[status] || 'bg-surface-raised text-text-primary';
  }

  getOverallRating(review: Review): number {
    return (
      (review.rating_cleanliness +
        review.rating_communication +
        review.rating_accuracy +
        review.rating_location +
        review.rating_checkin +
        review.rating_value) /
      6
    );
  }

  getCategoryRatings(review: Review): Array<{ label: string; value: number }> {
    return [
      { label: 'Limpieza', value: review.rating_cleanliness },
      { label: 'Comunicación', value: review.rating_communication },
      { label: 'Precisión', value: review.rating_accuracy },
      { label: 'Ubicación', value: review.rating_location },
      { label: 'Check-in', value: review.rating_checkin },
      { label: 'Valor', value: review.rating_value },
    ];
  }
}
