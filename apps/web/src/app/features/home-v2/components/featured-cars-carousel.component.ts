import { Component, input, output, signal, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { GestureService, type SwipeEvent } from '../../../core/services/gesture.service';

export interface FeaturedCar {
  id: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  image: string;
  rating: number;
  trips: number;
  location: string;
  features: string[];
  isInstantBook?: boolean;
  discount?: number;
}

/**
 * Featured Cars Carousel Component V2
 * Horizontal scrolling carousel with featured vehicles
 * 
 * Features:
 * - Smooth swipe navigation
 * - Lazy image loading
 * - Instant book badges
 * - Discount indicators
 * - Skeleton loading states
 * - Responsive card sizes
 */
@Component({
  selector: 'app-featured-cars-carousel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="featured-cars-carousel">
      <!-- Header -->
      <div class="carousel-header">
        <div>
          <h2 class="carousel-title">{{ title() }}</h2>
          <p class="carousel-subtitle">{{ subtitle() }}</p>
        </div>
        <button class="view-all-btn" (click)="viewAll.emit()">
          Ver todos
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M7 5L12 10L7 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>

      <!-- Carousel Container -->
      <div class="carousel-container" #carouselContainer>
        <div class="carousel-track">
          @if (isLoading()) {
            <!-- Skeleton Cards -->
            @for (i of [1,2,3]; track i) {
              <div class="car-card skeleton">
                <div class="skeleton-image"></div>
                <div class="skeleton-content">
                  <div class="skeleton-line" style="width: 60%"></div>
                  <div class="skeleton-line" style="width: 40%"></div>
                  <div class="skeleton-line" style="width: 80%"></div>
                </div>
              </div>
            }
          } @else {
            <!-- Car Cards -->
            @for (car of cars(); track car.id) {
              <div 
                class="car-card"
                (click)="carClick.emit(car)"
              >
                <!-- Image -->
                <div class="car-image-wrapper">
                  <img 
                    [src]="car.image" 
                    [alt]="car.brand + ' ' + car.model"
                    class="car-image"
                    loading="lazy"
                  />
                  
                  <!-- Badges -->
                  <div class="badges">
                    @if (car.discount) {
                      <span class="badge discount">-{{ car.discount }}%</span>
                    }
                    @if (car.isInstantBook) {
                      <span class="badge instant-book">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M7 1L8.5 5H13L9.5 8L11 12L7 9L3 12L4.5 8L1 5H5.5L7 1Z" fill="currentColor"/>
                        </svg>
                        Reserva instantánea
                      </span>
                    }
                  </div>

                  <!-- Favorite Button -->
                  <button 
                    class="favorite-btn"
                    (click)="handleFavorite($event, car)"
                    [class.active]="isFavorite(car.id)"
                    [attr.aria-label]="'Agregar a favoritos'"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" [attr.fill]="isFavorite(car.id) ? 'currentColor' : 'none'">
                      <path d="M10 17L3.5 11C1.5 9 1.5 6 3.5 4C5.5 2 8 2 10 4C12 2 14.5 2 16.5 4C18.5 6 18.5 9 16.5 11L10 17Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
                    </svg>
                  </button>
                </div>

                <!-- Content -->
                <div class="car-content">
                  <!-- Title -->
                  <h3 class="car-title">{{ car.brand }} {{ car.model }}</h3>
                  <p class="car-year">{{ car.year }}</p>

                  <!-- Rating & Trips -->
                  <div class="car-meta">
                    <div class="rating">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M8 1L10 5.5H14.5L11 8.5L12.5 13L8 10L3.5 13L5 8.5L1.5 5.5H6L8 1Z" fill="#FBBF24"/>
                      </svg>
                      <span>{{ car.rating.toFixed(1) }}</span>
                    </div>
                    <span class="trips">{{ car.trips }} viajes</span>
                  </div>

                  <!-- Location -->
                  <div class="car-location">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M8 8C8.82843 8 9.5 7.32843 9.5 6.5C9.5 5.67157 8.82843 5 8 5C7.17157 5 6.5 5.67157 6.5 6.5C6.5 7.32843 7.17157 8 8 8Z" stroke="currentColor" stroke-width="1.5"/>
                      <path d="M8 14C8 14 12 10 12 6.5C12 3.73858 10.2091 1.5 8 1.5C5.79086 1.5 4 3.73858 4 6.5C4 10 8 14 8 14Z" stroke="currentColor" stroke-width="1.5"/>
                    </svg>
                    <span>{{ car.location }}</span>
                  </div>

                  <!-- Features -->
                  <div class="car-features">
                    @for (feature of car.features.slice(0, 3); track feature) {
                      <span class="feature-tag">{{ feature }}</span>
                    }
                  </div>

                  <!-- Price -->
                  <div class="car-price">
                    <span class="price-amount">\${{ car.price }}</span>
                    <span class="price-period">/día</span>
                  </div>
                </div>
              </div>
            }
          }
        </div>
      </div>

      <!-- Scroll Indicators (optional) -->
      @if (!isLoading() && cars().length > 1) {
        <div class="scroll-indicators">
          <button 
            class="scroll-btn prev"
            (click)="scrollPrev()"
            [disabled]="!canScrollLeft()"
            [attr.aria-label]="'Anterior'"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <button 
            class="scroll-btn next"
            (click)="scrollNext()"
            [disabled]="!canScrollRight()"
            [attr.aria-label]="'Siguiente'"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .featured-cars-carousel {
      padding: 32px 0;
      position: relative;
    }

    .carousel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 20px 20px;
    }

    .carousel-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: #1a1a1a;
      margin: 0 0 4px 0;
    }

    .carousel-subtitle {
      font-size: 0.875rem;
      color: #6b7280;
      margin: 0;
    }

    .view-all-btn {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 8px 16px;
      font-size: 0.875rem;
      font-weight: 600;
      color: #4F46E5;
      background: transparent;
      border: 2px solid #4F46E5;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .view-all-btn:hover {
      background: #4F46E5;
      color: white;
    }

    .view-all-btn:active {
      transform: scale(0.95);
    }

    .carousel-container {
      overflow-x: auto;
      overflow-y: hidden;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }

    .carousel-container::-webkit-scrollbar {
      display: none;
    }

    .carousel-track {
      display: flex;
      gap: 16px;
      padding: 0 20px 16px;
    }

    .car-card {
      flex-shrink: 0;
      width: 280px;
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 
        0 4px 12px rgba(0, 0, 0, 0.08),
        0 1px 3px rgba(0, 0, 0, 0.06);
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .car-card:hover {
      transform: translateY(-4px);
      box-shadow: 
        0 12px 24px rgba(0, 0, 0, 0.12),
        0 4px 8px rgba(0, 0, 0, 0.08);
    }

    .car-card:active {
      transform: translateY(-2px);
    }

    .car-image-wrapper {
      position: relative;
      width: 100%;
      height: 180px;
      overflow: hidden;
      background: #f3f4f6;
    }

    .car-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }

    .car-card:hover .car-image {
      transform: scale(1.05);
    }

    .badges {
      position: absolute;
      top: 12px;
      left: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      font-size: 0.75rem;
      font-weight: 600;
      border-radius: 6px;
      backdrop-filter: blur(8px);
    }

    .badge.discount {
      background: rgba(239, 68, 68, 0.95);
      color: white;
    }

    .badge.instant-book {
      background: rgba(16, 185, 129, 0.95);
      color: white;
    }

    .favorite-btn {
      position: absolute;
      top: 12px;
      right: 12px;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.95);
      color: #6b7280;
      border: none;
      border-radius: 50%;
      cursor: pointer;
      backdrop-filter: blur(8px);
      transition: all 0.2s ease;
    }

    .favorite-btn:hover {
      background: white;
      color: #EF4444;
      transform: scale(1.1);
    }

    .favorite-btn.active {
      color: #EF4444;
    }

    .car-content {
      padding: 16px;
    }

    .car-title {
      font-size: 1.125rem;
      font-weight: 700;
      color: #1a1a1a;
      margin: 0 0 4px 0;
    }

    .car-year {
      font-size: 0.875rem;
      color: #6b7280;
      margin: 0 0 12px 0;
    }

    .car-meta {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }

    .rating {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.875rem;
      font-weight: 600;
      color: #1a1a1a;
    }

    .trips {
      font-size: 0.875rem;
      color: #6b7280;
    }

    .car-location {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 12px;
      font-size: 0.875rem;
      color: #6b7280;
    }

    .car-features {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 16px;
    }

    .feature-tag {
      padding: 4px 8px;
      font-size: 0.75rem;
      color: #4F46E5;
      background: rgba(79, 70, 229, 0.1);
      border-radius: 4px;
    }

    .car-price {
      display: flex;
      align-items: baseline;
      gap: 4px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
    }

    .price-amount {
      font-size: 1.5rem;
      font-weight: 700;
      color: #4F46E5;
    }

    .price-period {
      font-size: 0.875rem;
      color: #6b7280;
    }

    /* Skeleton Loading */
    .car-card.skeleton {
      pointer-events: none;
    }

    .skeleton-image {
      width: 100%;
      height: 180px;
      background: linear-gradient(
        90deg,
        #f3f4f6 0%,
        #e5e7eb 50%,
        #f3f4f6 100%
      );
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }

    .skeleton-content {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .skeleton-line {
      height: 16px;
      background: linear-gradient(
        90deg,
        #f3f4f6 0%,
        #e5e7eb 50%,
        #f3f4f6 100%
      );
      background-size: 200% 100%;
      border-radius: 4px;
      animation: shimmer 1.5s infinite;
    }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* Scroll Indicators */
    .scroll-indicators {
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      display: flex;
      justify-content: space-between;
      pointer-events: none;
      padding: 0 8px;
    }

    .scroll-btn {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: white;
      color: #1a1a1a;
      border: none;
      border-radius: 50%;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      cursor: pointer;
      pointer-events: auto;
      transition: all 0.2s ease;
    }

    .scroll-btn:hover:not(:disabled) {
      background: #4F46E5;
      color: white;
      transform: scale(1.1);
    }

    .scroll-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    /* Responsive */
    @media (min-width: 768px) {
      .carousel-header {
        padding: 0 32px 24px;
      }

      .carousel-track {
        padding: 0 32px 16px;
        gap: 20px;
      }

      .car-card {
        width: 320px;
      }

      .car-image-wrapper {
        height: 200px;
      }
    }
  `]
})
export class FeaturedCarsCarouselComponent implements AfterViewInit, OnDestroy {
  @ViewChild('carouselContainer') carouselContainer!: ElementRef<HTMLElement>;

  private gestureService = inject(GestureService);
  private platformId = inject(PLATFORM_ID);
  private cleanupGesture?: () => void;

  // Inputs
  title = input('Autos destacados');
  subtitle = input('Los más populares esta semana');
  cars = input<FeaturedCar[]>([]);
  isLoading = input(false);

  // Outputs
  carClick = output<FeaturedCar>();
  viewAll = output<void>();
  favoriteToggle = output<string>(); // car ID

  // State
  canScrollLeft = signal(false);
  canScrollRight = signal(true);
  private favorites = signal<Set<string>>(new Set());

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const container = this.carouselContainer.nativeElement;

    // Setup swipe gesture
    this.cleanupGesture = this.gestureService.onSwipe(
      container,
      (event: SwipeEvent) => {
        if (event.direction === 'left') {
          this.scrollNext();
        } else if (event.direction === 'right') {
          this.scrollPrev();
        }
      }
    );

    // Update scroll indicators
    container.addEventListener('scroll', this.updateScrollIndicators);
    this.updateScrollIndicators();
  }

  ngOnDestroy(): void {
    this.cleanupGesture?.();
    if (isPlatformBrowser(this.platformId)) {
      this.carouselContainer?.nativeElement.removeEventListener('scroll', this.updateScrollIndicators);
    }
  }

  private updateScrollIndicators = (): void => {
    const container = this.carouselContainer.nativeElement;
    this.canScrollLeft.set(container.scrollLeft > 0);
    this.canScrollRight.set(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 10
    );
  };

  scrollPrev(): void {
    const container = this.carouselContainer.nativeElement;
    container.scrollBy({ left: -320, behavior: 'smooth' });
  }

  scrollNext(): void {
    const container = this.carouselContainer.nativeElement;
    container.scrollBy({ left: 320, behavior: 'smooth' });
  }

  handleFavorite(event: Event, car: FeaturedCar): void {
    event.stopPropagation();
    
    const favs = new Set(this.favorites());
    if (favs.has(car.id)) {
      favs.delete(car.id);
    } else {
      favs.add(car.id);
    }
    this.favorites.set(favs);
    
    this.favoriteToggle.emit(car.id);

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }

  isFavorite(carId: string): boolean {
    return this.favorites().has(carId);
  }
}
