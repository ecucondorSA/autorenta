import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth/auth.service';
import { FavoritesService } from '@core/services/cars/favorites.service';
import { FavoriteButtonComponent } from '../../shared/components/favorite-button/favorite-button.component';

/**
 * Tipo específico para autos favoritos con información del propietario
 * Refleja la estructura exacta retornada por la consulta de Supabase
 */
interface CarWithOwner {
  id: string;
  brand: string;
  model: string;
  year: number;
  price_per_day: number;
  location_city?: string | null;
  location_state?: string | null;
  location_province?: string | null;
  location_formatted_address?: string | null;
  car_photos?: Array<{
    id: string;
    url: string;
    position: number;
  }> | null;
  photos?: Array<{
    id: string;
    url: string;
    position: number;
  }> | null;
  profiles?: {
    full_name: string;
    avatar_url?: string | null;
    is_superhost?: boolean | null;
  } | null;
}

@Component({
  selector: 'app-favorites-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FavoriteButtonComponent],
  template: `
    <div class="favorites-page pt-[env(safe-area-inset-top)]">
      <!-- Compact Header -->
      <header class="compact-header">
        <div class="header-content">
          <button (click)="goBack()" class="back-button" aria-label="Volver">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h1 class="header-title">Mis Favoritos</h1>
          <span class="header-count">{{ favoriteCount() }}</span>
        </div>
      </header>

      <!-- Loading State -->
      @if (isLoading()) {
        <div class="loading-container">
          <div class="spinner"></div>
          <p>Cargando favoritos...</p>
        </div>
      }

      <!-- Empty State -->
      @else if (favoriteCars().length === 0) {
        <div class="empty-state">
          <img
            src="/assets/images/illustrations/empty-favorites.png"
            alt="Sin favoritos"
            class="w-48 h-auto mx-auto mb-4"
          />
          <h2>Aún no tienes favoritos</h2>
          <p>Guarda autos que te interesen para encontrarlos fácilmente después</p>
          <button (click)="goToMarketplace()" class="cta-button">Explorar autos</button>
        </div>
      }

      <!-- Favorites Grid -->
      @else {
        <div class="favorites-grid">
          @for (car of favoriteCars(); track car.id) {
            <div class="car-card" (click)="goToCar(car.id)">
              <!-- Image -->
              <div class="car-image-container">
                <img
                  [src]="
                    car.car_photos?.[0]?.url ||
                    car.photos?.[0]?.url ||
                    '/assets/placeholder-car.jpg'
                  "
                  [alt]="car.brand + ' ' + car.model"
                  class="car-image"
                  loading="lazy"
                />
                <div class="favorite-overlay">
                  <app-favorite-button [carId]="car.id" />
                </div>
              </div>

              <!-- Details -->
              <div class="car-details">
                <h3 class="car-title">{{ car.brand }} {{ car.model }}</h3>
                <p class="car-year">{{ car.year }}</p>

                <!-- Price -->
                <div class="car-price">
                  <span class="price">\${{ car.price_per_day }}</span>
                  <span class="price-label">/día</span>
                </div>

                <!-- Location -->
                @if (car.location_formatted_address || car.location_city) {
                  <div class="car-location">
                    <span class="icon">📍</span>
                    <span class="text">{{
                      car.location_formatted_address || car.location_city
                    }}</span>
                  </div>
                }

                <!-- Owner -->
                @if (car.profiles) {
                  <div class="car-owner">
                    @if (car.profiles.avatar_url) {
                      <img
                        [src]="car.profiles.avatar_url"
                        class="owner-avatar"
                        [alt]="'Foto de ' + car.profiles.full_name"
                      />
                    }
                    <span class="owner-name">{{ car.profiles.full_name }}</span>
                    @if (car.profiles.is_superhost) {
                      <span class="superhost-badge">⭐</span>
                    }
                  </div>
                }

                <!-- CTA -->
                <button class="reserve-button">Ver detalles</button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .favorites-page {
        min-height: 100vh;
        background: var(--surface-base, #f3f4f6);
        padding-bottom: 5rem;
      }

      .compact-header {
        position: sticky;
        top: 0;
        z-index: 40;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(8px);
        border-bottom: 1px solid rgba(0, 0, 0, 0.1);
      }

      .header-content {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem 1rem;
        max-width: 1200px;
        margin: 0 auto;
      }

      .back-button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        background: transparent;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        transition: background 0.2s;

        &:hover {
          background: rgba(0, 0, 0, 0.05);
        }
      }

      .header-title {
        flex: 1;
        font-size: 1.125rem;
        font-weight: 600;
        color: #111827;
        margin: 0;
      }

      .header-count {
        padding: 0.25rem 0.75rem;
        background: rgba(59, 130, 246, 0.1);
        color: #3b82f6;
        font-size: 0.875rem;
        font-weight: 600;
        border-radius: 9999px;
      }

      .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 400px;
        gap: 1rem;
      }

      .spinner {
        width: 48px;
        height: 48px;
        border: 4px solid #e5e7eb;
        border-top-color: #3b82f6;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      .empty-state {
        max-width: 500px;
        margin: 4rem auto;
        text-align: center;
        background: white;
        padding: 3rem 2rem;
        border-radius: 16px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      .empty-icon {
        font-size: 4rem;
        margin-bottom: 1.5rem;
      }

      .empty-state h2 {
        font-size: 1.5rem;
        font-weight: 600;
        color: #111827;
        margin-bottom: 0.75rem;
      }

      .empty-state p {
        color: #6b7280;
        margin-bottom: 2rem;
      }

      .cta-button {
        background: #3b82f6;
        color: white;
        border: none;
        padding: 0.75rem 2rem;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;

        &:hover {
          background: #2563eb;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }
      }

      .favorites-grid {
        max-width: 1200px;
        margin: 0 auto;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 1.5rem;
      }

      .car-card {
        background: white;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        cursor: pointer;
        transition: all 0.2s;

        &:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
        }
      }

      .car-image-container {
        position: relative;
        width: 100%;
        height: 200px;
        overflow: hidden;
      }

      .car-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .favorite-overlay {
        position: absolute;
        top: 0.75rem;
        right: 0.75rem;
      }

      .car-details {
        padding: 1.25rem;
      }

      .car-title {
        font-size: 1.25rem;
        font-weight: 600;
        color: #111827;
        margin-bottom: 0.25rem;
      }

      .car-year {
        color: #6b7280;
        font-size: 0.875rem;
        margin-bottom: 0.75rem;
      }

      .car-price {
        margin-bottom: 0.75rem;
      }

      .price {
        font-size: 1.5rem;
        font-weight: 700;
        color: #3b82f6;
      }

      .price-label {
        color: #6b7280;
        font-size: 0.875rem;
      }

      .car-location {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: #6b7280;
        font-size: 0.875rem;
        margin-bottom: 0.75rem;
      }

      .car-owner {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 1rem;
      }

      .owner-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        object-fit: cover;
      }

      .owner-name {
        font-size: 0.875rem;
        color: #374151;
      }

      .superhost-badge {
        font-size: 0.875rem;
      }

      .reserve-button {
        width: 100%;
        background: #3b82f6;
        color: white;
        border: none;
        padding: 0.75rem;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;

        &:hover {
          background: #2563eb;
        }
      }

      /* Mobile */
      @media (max-width: 768px) {
        .favorites-page {
          padding: 1rem 0.5rem;
        }

        h1 {
          font-size: 2rem;
        }

        .favorites-grid {
          grid-template-columns: 1fr;
          gap: 1rem;
        }
      }
    `,
  ],
})
export class FavoritesPage implements OnInit {
  private favoritesService = inject(FavoritesService);
  private authService = inject(AuthService);
  private router = inject(Router);

  favoriteCars = signal<CarWithOwner[]>([]);
  isLoading = signal(true);
  favoriteCount = signal(0);

  async ngOnInit() {
    await this.loadFavorites();
  }

  async loadFavorites() {
    this.isLoading.set(true);
    try {
      await this.favoritesService.loadFavorites();
      const cars = await this.favoritesService.getFavoriteCars();

      // Double type assertion necesaria porque Supabase retorna tipos anidados
      // que TypeScript no puede inferir correctamente. Primero convertimos a unknown
      // y luego al tipo específico que sabemos que tiene la estructura.
      this.favoriteCars.set(cars as unknown as CarWithOwner[]);
      this.favoriteCount.set(cars.length);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  goBack() {
    window.history.back();
  }

  goToMarketplace() {
    this.router.navigate(['/']);
  }

  goToCar(carId: string) {
    this.router.navigate(['/cars', carId]);
  }
}
