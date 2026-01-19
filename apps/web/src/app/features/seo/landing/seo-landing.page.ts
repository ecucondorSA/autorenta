
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MetaService } from '@core/services/ui/meta.service';
import { CarsService } from '@core/services/cars/cars.service';
import { Car } from '@core/models/car.model';
import { IonicModule } from '@ionic/angular';

@Component({
  standalone: true,
  selector: 'app-seo-landing',
  imports: [CommonModule, RouterLink, IonicModule],
  template: `
    <ion-content>
      <!-- Hero Section -->
      <div class="relative h-[40vh] min-h-[300px] w-full overflow-hidden">
        <img
          [src]="heroImage()"
          class="absolute inset-0 h-full w-full object-cover"
          alt="Alquiler de autos"
        />
        <div class="absolute inset-0 bg-black/40"></div>
        <div class="absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-white">
          <h1 class="text-4xl font-bold md:text-5xl lg:text-6xl">
            {{ title() }}
          </h1>
          <p class="mt-4 text-lg font-medium text-gray-200 md:text-xl">
            {{ subtitle() }}
          </p>
          <a
            routerLink="/cars/list"
            class="mt-8 rounded-full bg-brand-primary px-8 py-3 font-semibold text-white transition-transform hover:scale-105"
          >
            Ver Disponibilidad
          </a>
        </div>
      </div>

      <!-- Content Section -->
      <div class="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <!-- Breadcrumbs -->
        <div class="mb-8 flex items-center gap-2 text-sm text-gray-500">
          <a routerLink="/" class="hover:text-brand-primary">Inicio</a>
          <span>/</span>
          <span class="font-medium text-gray-900">{{ title() }}</span>
        </div>

        <!-- Inventory Grid -->
        <div class="mb-12">
          <h2 class="mb-6 text-2xl font-bold text-gray-900">Vehículos Destacados</h2>
          
          @if (loading()) {
            <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              @for (i of [1,2,3]; track i) {
                <div class="h-80 animate-pulse rounded-xl bg-gray-100"></div>
              }
            </div>
          } @else if (cars().length > 0) {
            <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              @for (car of cars(); track car.id) {
                <div class="group relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                  <div class="aspect-[4/3] w-full overflow-hidden bg-gray-100">
                    <img
                      [src]="car.images?.[0] || '/assets/placeholder-car.webp'"
                      class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      [alt]="car.brand + ' ' + car.model"
                    />
                  </div>
                  <div class="p-4">
                    <h3 class="text-lg font-bold text-gray-900">
                      {{ car.brand }} {{ car.model }}
                    </h3>
                    <p class="text-sm text-gray-500">{{ car.year }} • {{ car.transmission }}</p>
                    <div class="mt-4 flex items-center justify-between">
                      <span class="text-lg font-bold text-brand-primary">
                        {{ car.price_per_day | currency }} / día
                      </span>
                      <a
                        [routerLink]="['/cars', car.id]"
                        class="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
                      >
                        Reservar
                      </a>
                    </div>
                  </div>
                </div>
              }
            </div>
          } @else {
            <div class="rounded-xl bg-gray-50 p-8 text-center">
              <p class="text-gray-500">No hay vehículos disponibles para esta categoría en este momento.</p>
              <a routerLink="/cars/list" class="mt-4 inline-block text-brand-primary hover:underline">
                Ver todo el catálogo
              </a>
            </div>
          }
        </div>

        <!-- SEO Text (Important for ranking) -->
        <div class="prose max-w-none rounded-2xl bg-gray-50 p-8">
          <h3>¿Por qué alquilar {{ contextLabel() }} en Autorentar?</h3>
          <p>
            En Autorentar ofrecemos la mejor selección de vehículos {{ contextLabel() }}. 
            Nuestra plataforma conecta a propietarios locales con conductores como tú, 
            garantizando precios justos y una experiencia sin complicaciones.
          </p>
          <ul>
            <li>Seguro incluido en todos los alquileres</li>
            <li>Sin costos ocultos</li>
            <li>Verificación de identidad rápida</li>
            <li>Soporte 24/7</li>
          </ul>
        </div>
      </div>
    </ion-content>
  `,
})
export class SeoLandingPage {
  // Route params input (Angular 16+)
  readonly city = input<string>(); // from /alquiler-autos/:city
  readonly brand = input<string>(); // from /rentar/:brand
  
  private readonly router = inject(Router);
  private readonly metaService = inject(MetaService);
  private readonly carService = inject(CarsService);

  readonly loading = signal(true);
  readonly cars = signal<Car[]>([]);

  // Derived state
  readonly isCityPage = computed(() => !!this.city());
  readonly contextLabel = computed(() => {
    if (this.city()) return `en ${this.formatText(this.city()!)}`;
    if (this.brand()) return `marca ${this.formatText(this.brand()!)}`;
    return 'con nosotros';
  });

  readonly title = computed(() => {
    if (this.city()) return `Alquiler de autos en ${this.formatText(this.city()!)}`;
    if (this.brand()) return `Rentar ${this.formatText(this.brand()!)}`;
    return 'Alquiler de autos';
  });

  readonly subtitle = computed(() => {
    if (this.city()) return `Encuentra el auto perfecto para tu viaje en ${this.formatText(this.city()!)}`;
    if (this.brand()) return `Los mejores modelos ${this.formatText(this.brand()!)} al mejor precio`;
    return 'La mejor plataforma de carsharing';
  });

  readonly heroImage = computed(() => {
    // Placeholder - in production use specific images per city/brand
    return 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=2070&auto=format&fit=crop';
  });

  constructor() {
    // Update SEO Meta Tags
    effect(() => {
      const currentTitle = this.title();
      const currentDesc = `Reserva online ${this.subtitle()}. Seguro incluido y cancelación flexible.`;
      const currentImage = this.heroImage();
      const currentUrl = `https://autorentar.com${this.router.url}`;

      this.metaService.updateMeta({
        title: `${currentTitle} | Autorentar`,
        description: currentDesc,
        ogImage: currentImage,
        ogUrl: currentUrl,
        canonical: currentUrl
      });
      
      // 🚀 WORLD CLASS SEO: Add Structured Data (Schema.org)
      // This tells Google explicitly "This is a Service for Car Rental"
      this.metaService.addStructuredData('WebSite', {
        '@type': 'SearchResultsPage',
        name: currentTitle,
        description: currentDesc,
        image: currentImage,
        url: currentUrl,
        provider: {
          '@type': 'Organization',
          name: 'Autorentar',
          image: 'https://autorentar.com/assets/icon/favicon.png'
        }
      });

      this.loadInventory();
    });
  }

  private async loadInventory() {
    this.loading.set(true);
    try {
      // In a real implementation, call a service method filter by metadata
      // For now, we fetch recent cars and client-side filter as a POC
      const allCars = await this.carService.listActiveCars({});
      
      let filtered = allCars;
      if (this.brand()) {
        const brandTerm = this.brand()!.toLowerCase();
        filtered = allCars.filter((c: Car) => (c.brand || '').toLowerCase().includes(brandTerm));
      }
      // City filtering would require location data in the car model or a geo-query
      
      this.cars.set(filtered.slice(0, 9));
    } catch (err) {
      console.error('Failed to load cars', err);
    } finally {
      this.loading.set(false);
    }
  }

  private formatText(slug: string): string {
    return slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
