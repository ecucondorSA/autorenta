import { CommonModule, NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MetaService } from '@core/services/ui/meta.service';
import { CarCardComponent } from '@shared/components/car-card/car-card.component';
import { SeoPageData } from '@core/services/seo/seo-landing.service';
import { Car } from '@core/models';

@Component({
  selector: 'app-seo-landing-page',
  standalone: true,
  imports: [CommonModule, RouterLink, NgOptimizedImage, CarCardComponent],
  template: `
    <!-- 🟢 HERO SECTION -->
    <header class="relative min-h-[50vh] flex items-center justify-center overflow-hidden bg-black text-white">
      <!-- Background Image (Contextual) -->
      <div class="absolute inset-0 z-0">
        @if (pageData(); as data) {
          <img 
            [ngSrc]="getHeroImage(data)" 
            alt="Alquiler de autos"
            fill
            priority
            class="object-cover opacity-50"
          />
        }
        <div class="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
      </div>

      <!-- Content -->
      <div class="relative z-10 container mx-auto px-4 text-center mt-16">
        @if (pageData(); as data) {
          <h1 class="text-4xl md:text-6xl font-black mb-4 tracking-tight leading-tight">
            {{ data.h1 }}
          </h1>
          <p class="text-xl md:text-2xl text-gray-200 mb-8 max-w-2xl mx-auto font-light">
            {{ data.meta_description }}
          </p>

          <!-- Breadcrumbs -->
          <nav class="flex justify-center items-center gap-2 text-sm text-gray-400 mb-8">
            @for (crumb of data.breadcrumbs; track crumb.label; let last = $last) {
              @if (crumb.url) {
                <a [routerLink]="crumb.url" class="hover:text-white transition-colors">{{ crumb.label }}</a>
              } @else {
                <span class="text-white font-bold">{{ crumb.label }}</span>
              }
              @if (!last) {
                <span>/</span>
              }
            }
          </nav>

          <!-- CTA / Search (Fake) -->
          <div class="bg-white/10 backdrop-blur-md p-2 rounded-full inline-flex items-center gap-2 max-w-md w-full border border-white/20">
            <span class="pl-4 text-gray-300 text-sm flex-1 text-left">Fechas flexibles</span>
            <button class="bg-white text-black px-6 py-2.5 rounded-full font-bold hover:bg-gray-100 transition-colors">
              Buscar
            </button>
          </div>
        } @else {
          <!-- Skeleton -->
          <div class="animate-pulse">
            <div class="h-12 bg-gray-700 w-3/4 mx-auto rounded-lg mb-4"></div>
            <div class="h-6 bg-gray-700 w-1/2 mx-auto rounded-lg"></div>
          </div>
        }
      </div>
    </header>

    <!-- 📊 STATS BAR -->
    <section class="border-b border-gray-100 bg-white py-4 sticky top-0 z-20 shadow-sm">
      <div class="container mx-auto px-4 flex justify-between items-center overflow-x-auto">
        @if (pageData(); as data) {
          <div class="flex items-center gap-6 text-sm whitespace-nowrap">
            <div class="flex items-center gap-2">
              <span class="font-bold text-black">{{ data.stats.count }}</span>
              <span class="text-gray-500">autos disponibles</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-gray-500">Desde</span>
              <span class="font-bold text-green-600">\${{ data.stats.min_price }} USD</span>
              <span class="text-gray-500">/día</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span class="text-gray-500">Reserva inmediata</span>
            </div>
          </div>
        }
      </div>
    </section>

    <!-- 🚗 CAR GRID -->
    <main class="bg-gray-50 py-12">
      <div class="container mx-auto px-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          @if (pageData(); as data) {
            @for (car of data.cars; track car.id) {
              <app-car-card [car]="mapToCarModel(car)" />
            }
          }
        </div>

        @if (pageData()?.cars?.length === 0) {
          <div class="text-center py-20">
            <h3 class="text-2xl font-bold text-gray-900 mb-2">No encontramos autos exactos</h3>
            <p class="text-gray-500">Intenta buscar en una zona cercana.</p>
          </div>
        }
      </div>
    </main>

    <!-- 📝 SEO CONTENT (Generated) -->
    <section class="bg-white py-16">
      <div class="container mx-auto px-4 max-w-3xl prose lg:prose-xl">
        @if (pageData(); as data) {
          <h2>¿Por qué alquilar un {{ data.type === 'brand' ? data.h1.replace('Alquiler de ', '') : 'auto' }} en AutoRenta?</h2>
          <p>
            Si estás buscando <strong>{{ data.h1 }}</strong>, llegaste al lugar correcto. 
            En AutoRenta conectamos a dueños verificados con conductores como vos.
          </p>
          <ul>
            <li>Sin trámites burocráticos.</li>
            <li>Seguro total incluido en cada viaje.</li>
            <li>Precios hasta 30% más bajos que un Rent a Car tradicional.</li>
          </ul>
        }
      </div>
    </section>
  `,
  styles: [`
    :host {
      display: block;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeoLandingPageComponent {
  private readonly metaService = inject(MetaService);
  
  // Input from Router Resolve
  readonly pageData = input<SeoPageData | null>(null);

  constructor() {
    // Update Meta Tags when data changes
    const data = this.pageData();
    if (data) {
      this.metaService.updateTitle(data.meta_title);
      this.metaService.updateDescription(data.meta_description);
      // Canonical URL logic would go here
    }
  }

  getHeroImage(data: SeoPageData): string {
    // Return a contextual image or a high-quality fallback
    if (data.cars.length > 0 && data.cars[0].image_url) {
      return data.cars[0].image_url;
    }
    return '/assets/images/hero-bg.jpg'; // Fallback
  }

  // Adapter to match CarCardComponent Input
  mapToCarModel(seoCar: SeoPageData['cars'][number]): Car {
    return {
      ...seoCar,
      // Default missing fields for card display
      rating_avg: 5.0,
      rating_count: 1,
      status: 'active',
      photos: [{ url: seoCar.image_url }]
    } as unknown as Car;
  }
}