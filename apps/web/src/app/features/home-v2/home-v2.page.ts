import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeroSwiperComponent } from './components/hero-swiper.component';
import { QuickSearchCardComponent, type SearchCriteria } from './components/quick-search-card.component';
import { FeaturedCarsCarouselComponent, type FeaturedCar } from './components/featured-cars-carousel.component';
import { FacebookSidebarComponent } from '../../shared/components-v2/layout/facebook-sidebar.component';

/**
 * Home Page V2
 * Modern mobile-first home page
 * 
 * Features:
 * - Full-screen hero swiper
 * - Floating quick search
 * - Featured cars carousel
 * - Categories grid
 * - Trust indicators
 * - Bottom CTA
 */
@Component({
  selector: 'app-home-v2',
  standalone: true,
  imports: [
    CommonModule,
    HeroSwiperComponent,
    QuickSearchCardComponent,
    FeaturedCarsCarouselComponent,
    FacebookSidebarComponent,
  ],
  template: `
    <!-- Facebook Sidebar -->
    <app-facebook-sidebar #sidebar />

    <!-- Menu FAB Button -->
    <button 
      class="menu-fab"
      (click)="sidebar.open()"
      aria-label="Abrir menú"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </button>

    <div class="home-v2">
      <!-- Hero Swiper -->
      <app-hero-swiper />

      <!-- Quick Search Card (floating over hero) -->
      <app-quick-search-card 
        (search)="handleSearch($event)"
      />

      <!-- Featured Cars -->
      <section class="section">
        <app-featured-cars-carousel
          title="Autos destacados"
          subtitle="Los más populares esta semana"
          [cars]="featuredCars"
          [isLoading]="isLoadingCars"
          (carClick)="handleCarClick($event)"
          (viewAll)="navigateToAllCars()"
          (favoriteToggle)="handleFavoriteToggle($event)"
        />
      </section>

      <!-- Categories -->
      <section class="section">
        <div class="section-header">
          <h2 class="section-title">Explora por categoría</h2>
          <p class="section-subtitle">Encuentra el auto perfecto para tu viaje</p>
        </div>
        
        <div class="categories-grid">
          @for (category of categories; track category.id) {
            <button 
              class="category-card"
              (click)="handleCategoryClick(category)"
            >
              <div class="category-icon" [style.background]="category.gradient">
                <span class="icon-emoji">{{ category.emoji }}</span>
              </div>
              <h3 class="category-name">{{ category.name }}</h3>
              <p class="category-count">{{ category.count }} autos</p>
            </button>
          }
        </div>
      </section>

      <!-- More Featured Cars -->
      <section class="section">
        <app-featured-cars-carousel
          title="Cerca de ti"
          subtitle="Autos disponibles en tu zona"
          [cars]="nearbyCars"
          [isLoading]="isLoadingCars"
          (carClick)="handleCarClick($event)"
          (viewAll)="navigateToAllCars()"
        />
      </section>

      <!-- Trust Indicators -->
      <section class="section trust-section">
        <div class="section-header centered">
          <h2 class="section-title">¿Por qué Autorenta?</h2>
          <p class="section-subtitle">Miles de usuarios ya confían en nosotros</p>
        </div>

        <div class="trust-grid">
          <div class="trust-card">
            <div class="trust-icon">🛡️</div>
            <h3 class="trust-title">Seguro incluido</h3>
            <p class="trust-text">Todos los alquileres están protegidos con seguro completo</p>
          </div>
          <div class="trust-card">
            <div class="trust-icon">✅</div>
            <h3 class="trust-title">Verificación total</h3>
            <p class="trust-text">Propietarios y vehículos verificados al 100%</p>
          </div>
          <div class="trust-card">
            <div class="trust-icon">💬</div>
            <h3 class="trust-title">Soporte 24/7</h3>
            <p class="trust-text">Estamos siempre disponibles para ayudarte</p>
          </div>
          <div class="trust-card">
            <div class="trust-icon">⚡</div>
            <h3 class="trust-title">Reserva instantánea</h3>
            <p class="trust-text">Confirma tu alquiler en menos de 1 minuto</p>
          </div>
        </div>
      </section>

      <!-- CTA Section -->
      <section class="section cta-section">
        <div class="cta-card">
          <h2 class="cta-title">¿Tienes un auto?</h2>
          <p class="cta-text">Gana dinero compartiéndolo cuando no lo uses</p>
          <button class="cta-button">
            Publicar mi auto
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M7 5L12 10L7 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <p class="cta-stats">+3,500 propietarios ganando en promedio $850/mes</p>
        </div>
      </section>
    </div>
  `,
  styles: [`
    /* Menu FAB */
    .menu-fab {
      position: fixed;
      top: 20px;
      left: 20px;
      width: 56px;
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: white;
      color: #050505;
      border: none;
      border-radius: 50%;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      cursor: pointer;
      z-index: 100;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .menu-fab:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
    }

    .menu-fab:active {
      transform: scale(0.95);
    }

    .home-v2 {
      min-height: 100vh;
      background: #F8F4EC; /* Marfil Autorenta */
    }

    .section {
      padding: 0 0 48px 0;
    }

    .section-header {
      padding: 0 20px 20px;
    }

    .section-header.centered {
      text-align: center;
    }

    .section-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: #050505;
      margin: 0 0 8px 0;
    }

    .section-subtitle {
      font-size: 0.875rem;
      color: #4E4E4E;
      margin: 0;
    }

    /* Categories */
    .categories-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      padding: 0 20px;
    }

    .category-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 24px 16px;
      background: white;
      border: 1px solid #BCBCBC; /* G20 Autorenta */
      border-radius: 16px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .category-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
    }

    .category-card:active {
      transform: translateY(-2px);
    }

    .category-icon {
      width: 64px;
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 16px;
      margin-bottom: 12px;
    }

    .icon-emoji {
      font-size: 2rem;
    }

    .category-name {
      font-size: 1rem;
      font-weight: 600;
      color: #050505;
      margin: 0 0 4px 0;
    }

    .category-count {
      font-size: 0.875rem;
      color: #4E4E4E;
      margin: 0;
    }

    /* Trust Section */
    .trust-section {
      background: white;
      padding-top: 48px;
    }

    .trust-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 24px;
      padding: 0 20px;
    }

    .trust-card {
      text-align: center;
      padding: 24px;
      background: #DFD2BF; /* Beige Autorenta */
      border-radius: 16px;
    }

    .trust-icon {
      font-size: 3rem;
      margin-bottom: 16px;
    }

    .trust-title {
      font-size: 1.125rem;
      font-weight: 700;
      color: #050505;
      margin: 0 0 8px 0;
    }

    .trust-text {
      font-size: 0.875rem;
      color: #4E4E4E;
      line-height: 1.5;
      margin: 0;
    }

    /* CTA Section */
    .cta-section {
      padding: 48px 20px;
    }

    .cta-card {
      background: linear-gradient(135deg, #A7D8F4 0%, #8EC9EC 100%);
      padding: 48px 32px;
      border-radius: 24px;
      text-align: center;
      color: white;
    }

    .cta-title {
      font-size: 2rem;
      font-weight: 800;
      margin: 0 0 12px 0;
    }

    .cta-text {
      font-size: 1.125rem;
      margin: 0 0 32px 0;
      opacity: 0.95;
    }

    .cta-button {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 16px 32px;
      font-size: 1.125rem;
      font-weight: 600;
      color: #A7D8F4;
      background: white;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .cta-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 24px rgba(0, 0, 0, 0.3);
    }

    .cta-button:active {
      transform: translateY(0);
    }

    .cta-stats {
      font-size: 0.875rem;
      margin: 24px 0 0 0;
      opacity: 0.9;
    }

    /* Responsive */
    @media (min-width: 768px) {
      .section-header {
        padding: 0 32px 24px;
      }

      .categories-grid {
        grid-template-columns: repeat(4, 1fr);
        gap: 20px;
        padding: 0 32px;
      }

      .trust-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 32px;
        padding: 0 32px;
      }

      .cta-section {
        padding: 64px 32px;
      }

      .cta-card {
        max-width: 800px;
        margin: 0 auto;
        padding: 64px 48px;
      }
    }

    @media (min-width: 1024px) {
      .categories-grid {
        max-width: 1200px;
        margin: 0 auto;
      }

      .trust-grid {
        grid-template-columns: repeat(4, 1fr);
        max-width: 1200px;
        margin: 0 auto;
      }
    }
  `]
})
export class HomeV2Page implements OnInit {
  isLoadingCars = false;

  featuredCars: FeaturedCar[] = [
    {
      id: '1',
      brand: 'Toyota',
      model: 'Corolla',
      year: 2023,
      price: 45,
      image: 'https://images.unsplash.com/photo-1623869675781-80aa31012a5a?w=600&auto=format&fit=crop',
      rating: 4.9,
      trips: 127,
      location: 'Quito, Pichincha',
      features: ['Automático', 'A/C', '5 asientos'],
      isInstantBook: true,
    },
    {
      id: '2',
      brand: 'Mazda',
      model: 'CX-5',
      year: 2022,
      price: 65,
      image: 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=600&auto=format&fit=crop',
      rating: 4.8,
      trips: 89,
      location: 'Guayaquil, Guayas',
      features: ['SUV', 'Automático', 'GPS'],
      discount: 15,
      isInstantBook: true,
    },
    {
      id: '3',
      brand: 'Chevrolet',
      model: 'Sail',
      year: 2021,
      price: 35,
      image: 'https://images.unsplash.com/photo-1583267746897-2cf415887f51?w=600&auto=format&fit=crop',
      rating: 4.7,
      trips: 156,
      location: 'Cuenca, Azuay',
      features: ['Económico', 'A/C', 'Bluetooth'],
    },
  ];

  nearbyCars: FeaturedCar[] = [
    {
      id: '4',
      brand: 'Nissan',
      model: 'Versa',
      year: 2023,
      price: 42,
      image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=600&auto=format&fit=crop',
      rating: 4.9,
      trips: 98,
      location: 'Quito, Pichincha',
      features: ['Automático', 'A/C', 'USB'],
      isInstantBook: true,
    },
    {
      id: '5',
      brand: 'Hyundai',
      model: 'Tucson',
      year: 2022,
      price: 70,
      image: 'https://images.unsplash.com/photo-1606016159991-62e6d9e4f5e4?w=600&auto=format&fit=crop',
      rating: 4.8,
      trips: 134,
      location: 'Quito, Pichincha',
      features: ['SUV', '4x4', 'Cuero'],
      discount: 20,
    },
  ];

  categories = [
    { id: '1', name: 'Económicos', count: 340, emoji: '🚗', gradient: 'linear-gradient(135deg, #A7D8F4 0%, #75BAE4 100%)' },
    { id: '2', name: 'SUVs', count: 180, emoji: '🚙', gradient: 'linear-gradient(135deg, #DFD2BF 0%, #8B7355 100%)' },
    { id: '3', name: 'Camionetas', count: 95, emoji: '🚚', gradient: 'linear-gradient(135deg, #E0F3FB 0%, #A7D8F4 100%)' },
    { id: '4', name: 'Lujo', count: 42, emoji: '✨', gradient: 'linear-gradient(135deg, #F8F4EC 0%, #DFD2BF 100%)' },
  ];

  ngOnInit(): void {
    // In production, load from API
    console.log('HomeV2Page initialized');
  }

  handleSearch(criteria: SearchCriteria): void {
    console.log('Search criteria:', criteria);
    // Navigate to /cars with filters
  }

  handleCarClick(car: FeaturedCar): void {
    console.log('Car clicked:', car);
    // Navigate to /cars/:id
  }

  handleCategoryClick(category: any): void {
    console.log('Category clicked:', category);
    // Navigate to /cars?category=:id
  }

  navigateToAllCars(): void {
    console.log('Navigate to /cars');
  }

  handleFavoriteToggle(carId: string): void {
    console.log('Favorite toggled:', carId);
  }
}
