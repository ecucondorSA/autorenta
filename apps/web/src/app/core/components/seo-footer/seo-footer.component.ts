import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-seo-footer',
  imports: [CommonModule, RouterLink],
  template: `
    <div class="border-t border-gray-200 bg-white py-12">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <!-- Top Cities -->
          <div>
            <h3 class="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-900">
              Ciudades Populares
            </h3>
            <ul class="space-y-3">
              @for (city of cities; track city.slug) {
                <li>
                  <a
                    [routerLink]="['/alquiler-autos', city.slug]"
                    class="text-sm text-gray-500 hover:text-brand-primary"
                  >
                    Alquiler en {{ city.name }}
                  </a>
                </li>
              }
            </ul>
          </div>

          <!-- Top Brands -->
          <div>
            <h3 class="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-900">
              Marcas Destacadas
            </h3>
            <ul class="space-y-3">
              @for (brand of brands; track brand.slug) {
                <li>
                  <a
                    [routerLink]="['/rentar', brand.slug]"
                    class="text-sm text-gray-500 hover:text-brand-primary"
                  >
                    Rentar {{ brand.name }}
                  </a>
                </li>
              }
            </ul>
          </div>

          <!-- Categories -->
          <div>
            <h3 class="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-900">
              Categorías
            </h3>
            <ul class="space-y-3">
              <li><a routerLink="/cars/list" class="text-sm text-gray-500 hover:text-brand-primary">SUVs y Camionetas</a></li>
              <li><a routerLink="/cars/list" class="text-sm text-gray-500 hover:text-brand-primary">Autos Económicos</a></li>
              <li><a routerLink="/cars/list" class="text-sm text-gray-500 hover:text-brand-primary">Autos de Lujo</a></li>
            </ul>
          </div>

          <!-- About -->
          <div>
            <h3 class="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-900">
              Autorentar
            </h3>
            <p class="mb-4 text-sm text-gray-500">
              La plataforma líder de carsharing en Latinoamérica. Alquila autos de personas reales a precios increíbles.
            </p>
            <div class="flex space-x-4">
              <!-- Social Icons could go here -->
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class SeoFooterComponent {
  // Static lists for now - ideally fetched from API or config
  readonly cities = [
    { name: 'Buenos Aires', slug: 'buenos-aires' },
    { name: 'Mendoza', slug: 'mendoza' },
    { name: 'Córdoba', slug: 'cordoba' },
    { name: 'Bariloche', slug: 'bariloche' },
    { name: 'Montevideo', slug: 'montevideo' },
    { name: 'Punta del Este', slug: 'punta-del-este' },
    { name: 'Cancún', slug: 'cancun' },
    { name: 'Tulum', slug: 'tulum' },
  ];

  readonly brands = [
    { name: 'Toyota', slug: 'toyota' },
    { name: 'Volkswagen', slug: 'volkswagen' },
    { name: 'Chevrolet', slug: 'chevrolet' },
    { name: 'Nissan', slug: 'nissan' },
    { name: 'Ford', slug: 'ford' },
    { name: 'Fiat', slug: 'fiat' },
    { name: 'Peugeot', slug: 'peugeot' },
    { name: 'Renault', slug: 'renault' },
  ];
}