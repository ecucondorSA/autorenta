import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Review } from '../../../core/models';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-review-card',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './review-card.component.html',
  styleUrls: ['./review-card.component.css'],
})
export class ReviewCardComponent {
  @Input() review!: Review;
  @Input() showCarTitle: boolean = false;
  @Input() currentUserId?: string;

  @Output() flagReview = new EventEmitter<string>();

  categoryLabels: Record<string, string> = {
    rating_cleanliness: 'Limpieza',
    rating_communication: 'Comunicación',
    rating_accuracy: 'Precisión',
    rating_location: 'Ubicación',
    rating_checkin: 'Check-in',
    rating_value: 'Valor',
  };

  getOverallRating(): number {
    if (!this.review) return 0;

    const avg =
      (this.review.rating_cleanliness +
        this.review.rating_communication +
        this.review.rating_accuracy +
        this.review.rating_location +
        this.review.rating_checkin +
        this.review.rating_value) /
      6;

    return Number(avg.toFixed(1));
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
    if (this.review?.id) {
      this.flagReview.emit(this.review.id);
    }
  }

  get canFlag(): boolean {
    return !!this.currentUserId && this.currentUserId !== this.review.reviewer_id;
  }
}
