import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';

import { FavoritesService } from '@core/services/cars/favorites.service';

@Component({
  selector: 'app-favorite-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <button
      (click)="onToggle($event)"
      [disabled]="isLoading()"
      class="favorite-button"
      [class.is-favorite]="isFavorite()"
      [class.is-loading]="isLoading()"
      [title]="isFavorite() ? 'Quitar de favoritos' : 'Agregar a favoritos'"
      [attr.aria-label]="isFavorite() ? 'Quitar de favoritos' : 'Agregar a favoritos'"
      type="button"
    >
      @if (isLoading()) {
        <span class="loading-spinner"></span>
      } @else {
        <span class="heart-icon">{{ isFavorite() ? '❤️' : '🤍' }}</span>
      }
    </button>
  `,
  styles: [
    `
      .favorite-button {
        position: relative;
        width: 40px;
        height: 40px;
        border: none;
        background: #e3e3e3;
        backdrop-filter: blur(8px);
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

        &:hover:not(:disabled) {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        &:active:not(:disabled) {
          transform: scale(0.95);
        }

        &:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        &.is-favorite {
          animation: heartBeat 0.3s ease;
        }
      }

      .heart-icon {
        font-size: 1.25rem;
        line-height: 1;
        transition: transform 0.2s ease;
      }

      .loading-spinner {
        width: 20px;
        height: 20px;
        border: 2px solid var(--border-default, #e5e7eb);
        border-top-color: var(--system-blue-default, #3b82f6);
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
      }

      @keyframes heartBeat {
        0%,
        100% {
          transform: scale(1);
        }
        25% {
          transform: scale(1.2);
        }
        50% {
          transform: scale(0.95);
        }
        75% {
          transform: scale(1.1);
        }
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      /* Mobile */
      @media (max-width: 768px) {
        .favorite-button {
          width: 36px;
          height: 36px;
        }

        .heart-icon {
          font-size: 1.125rem;
        }
      }
    `,
  ],
})
export class FavoriteButtonComponent {
  @Input() carId!: string;
  @Output() favoriteToggle = new EventEmitter<boolean>();

  private favoritesService = inject(FavoritesService);

  isFavorite = computed(() => this.favoritesService.isFavorite(this.carId));
  isLoading = computed(() => this.favoritesService.isLoading());

  async onToggle(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    if (!this.carId) {
      console.error('FavoriteButton: carId is required');
      return;
    }

    const newState = await this.favoritesService.toggleFavorite(this.carId);
    this.favoriteToggle.emit(newState);
  }
}
