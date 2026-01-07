import {Component, Input, Output, EventEmitter, signal,
  ChangeDetectionStrategy} from '@angular/core';

import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import type { Review } from '../../../core/models';
import { FlagReviewModalComponent } from '../flag-review-modal/flag-review-modal.component';

@Component({
  selector: 'app-review-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslateModule, FlagReviewModalComponent],
  templateUrl: './review-card.component.html',
  styleUrls: ['./review-card.component.css'],
})
export class ReviewCardComponent {
  @Input() review!: Review;
  @Input() showCarTitle: boolean = false;
  @Input() currentUserId?: string;
  /** When true, shows a compact card without detailed category ratings */
  @Input() compact: boolean = false;

  @Output() flagReview = new EventEmitter<string>();

  showFlagModal = signal(false);

  // Categorías para Renter → Owner (evalúa auto/propietario)
  renterToOwnerLabels: Record<string, string> = {
    rating_cleanliness: 'Limpieza',
    rating_communication: 'Comunicación',
    rating_accuracy: 'Precisión',
    rating_location: 'Ubicación',
    rating_checkin: 'Check-in',
    rating_value: 'Valor',
  };

  // Categorías para Owner → Renter (evalúa arrendatario)
  ownerToRenterLabels: Record<string, string> = {
    rating_communication: 'Comunicación',
    rating_punctuality: 'Puntualidad',
    rating_care: 'Cuidado',
    rating_rules: 'Reglas',
    rating_recommend: 'Recomendación',
  };

  // Determinar si es una review de Owner→Renter
  get isOwnerToRenterReview(): boolean {
    // Usar review_type si existe, sino usar los flags legacy
    if (this.review.review_type) {
      return this.review.review_type === 'owner_to_renter';
    }
    return this.review.is_renter_review === true;
  }

  // Obtener las categorías activas según el tipo de review
  get activeCategories(): { key: string; label: string; value: number | null | undefined }[] {
    if (this.isOwnerToRenterReview) {
      return [
        { key: 'rating_communication', label: 'Comunicación', value: this.review.rating_communication },
        { key: 'rating_punctuality', label: 'Puntualidad', value: this.review.rating_punctuality },
        { key: 'rating_care', label: 'Cuidado', value: this.review.rating_care },
        { key: 'rating_rules', label: 'Reglas', value: this.review.rating_rules },
        { key: 'rating_recommend', label: 'Recomendación', value: this.review.rating_recommend },
      ].filter(cat => cat.value != null && cat.value > 0);
    } else {
      return [
        { key: 'rating_cleanliness', label: 'Limpieza', value: this.review.rating_cleanliness },
        { key: 'rating_communication', label: 'Comunicación', value: this.review.rating_communication },
        { key: 'rating_accuracy', label: 'Precisión', value: this.review.rating_accuracy },
        { key: 'rating_location', label: 'Ubicación', value: this.review.rating_location },
        { key: 'rating_checkin', label: 'Check-in', value: this.review.rating_checkin },
        { key: 'rating_value', label: 'Valor', value: this.review.rating_value },
      ].filter(cat => cat.value != null && cat.value > 0);
    }
  }

  getOverallRating(): number {
    if (!this.review) return 0;

    // Usar las categorías activas para calcular el promedio
    const categories = this.activeCategories;
    if (categories.length === 0) {
      // Fallback al rating legacy si existe
      return this.review.rating ?? 0;
    }

    const sum = categories.reduce((acc, cat) => acc + (cat.value ?? 0), 0);
    return Number((sum / categories.length).toFixed(1));
  }

  getRatingStars(rating: number): string[] {
    return Array(5)
      .fill('empty')
      .map((_, index) => (index < Math.round(rating) ? 'filled' : 'empty'));
  }

  getTimeSince(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Hoy';
    if (diffInDays === 1) return 'Hace 1 día';
    if (diffInDays < 7) return `Hace ${diffInDays} días`;
    if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7);
      return `Hace ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;
    }
    if (diffInDays < 365) {
      const months = Math.floor(diffInDays / 30);
      return `Hace ${months} ${months === 1 ? 'mes' : 'meses'}`;
    }

    const years = Math.floor(diffInDays / 365);
    return `Hace ${years} ${years === 1 ? 'año' : 'años'}`;
  }

  getAvatarInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  onFlagReview(): void {
    if (this.review?.['id']) {
      this.showFlagModal.set(true);
    }
  }

  onFlagged(): void {
    this.flagReview.emit(this.review['id']);
    this.showFlagModal.set(false);
  }

  onCloseFlagModal(): void {
    this.showFlagModal.set(false);
  }

  get canFlag(): boolean {
    return !!this.currentUserId && this.currentUserId !== this.review.reviewer_id;
  }

  getModerationStatusLabel(): string {
    if (!this.review.moderation_status) return 'Pendiente de moderación';

    const labels: Record<string, string> = {
      pending: 'Pendiente de moderación',
      approved: 'Aprobada por moderación',
      rejected: 'Rechazada por moderación',
    };

    return labels[this.review.moderation_status] || this.review.moderation_status;
  }

  getModerationBadgeClass(): string {
    const status = this.review.moderation_status || 'pending';

    const classes: Record<string, string> = {
      pending:
        'bg-warning-bg-hover text-warning-strong',
      approved:
        'bg-success-light/20 text-success-700',
      rejected: 'bg-error-bg-hover text-error-strong',
    };

    return classes[status] || classes['pending'];
  }
}
