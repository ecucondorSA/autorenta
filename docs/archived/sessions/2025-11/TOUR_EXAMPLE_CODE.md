# 📝 Código de Ejemplo - Implementación Rápida

## 🚀 Opción 1: Integración Mínima (5 minutos)

### 1. En tu `app.component.ts`

```typescript
import { Component, AfterViewInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TourService } from './core/services/tour.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <router-outlet></router-outlet>
  `
})
export class AppComponent implements AfterViewInit {
  private tourService = inject(TourService);

  ngAfterViewInit() {
    // Esperar a que el DOM esté listo
    setTimeout(() => {
      this.initWelcomeTour();
    }, 1500);
  }

  private initWelcomeTour(): void {
    const hasSeenTour = localStorage.getItem('autorenta:tour:welcome');
    const isHomePage = window.location.pathname === '/' || window.location.pathname === '/cars';

    if (!hasSeenTour && isHomePage) {
      this.tourService.startWelcomeTour();
    }
  }
}
```

---

## 🎯 Opción 2: Con Botón de Ayuda (Recomendado)

### 1. Crear componente de ayuda

```typescript
// help-button.component.ts
import { Component, inject } from '@angular/core';
import { TourService } from '@core/services/tour.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-help-button',
  standalone: true,
  template: `
    <div class="relative">
      <button
        id="help-center"
        class="icon-button"
        (click)="toggleMenu()"
        aria-label="Ayuda"
        type="button"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      @if (showMenu) {
        <div class="absolute right-0 mt-2 w-64 card-premium shadow-elevated p-4 z-50">
          <h3 class="text-sm font-semibold mb-3">¿Necesitás ayuda?</h3>

          <button
            (click)="showTour('welcome')"
            class="w-full text-left px-3 py-2 rounded-lg hover:bg-sand-light text-sm mb-2"
          >
            🎯 Ver tour de bienvenida
          </button>

          <button
            (click)="showTour('renter')"
            class="w-full text-left px-3 py-2 rounded-lg hover:bg-sand-light text-sm mb-2"
          >
            🔍 Cómo buscar autos
          </button>

          <button
            (click)="showTour('owner')"
            class="w-full text-left px-3 py-2 rounded-lg hover:bg-sand-light text-sm mb-2"
          >
            💸 Cómo publicar mi auto
          </button>

          <hr class="my-2 divider-horizontal">

          <a
            href="mailto:soporte@autorenta.com"
            class="w-full text-left px-3 py-2 rounded-lg hover:bg-sand-light text-sm flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Contactar soporte
          </a>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: inline-block;
    }
  `]
})
export class HelpButtonComponent {
  private tourService = inject(TourService);
  private router = inject(Router);

  showMenu = false;

  toggleMenu(): void {
    this.showMenu = !this.showMenu;
  }

  showTour(tourType: 'welcome' | 'renter' | 'owner'): void {
    this.showMenu = false;

    // Navegar a la ruta correcta si es necesario
    if (tourType === 'renter' && !this.router.url.includes('/cars')) {
      this.router.navigate(['/cars']).then(() => {
        setTimeout(() => this.tourService.restartTour('renter'), 500);
      });
    } else if (tourType === 'owner' && !this.router.url.includes('/publish')) {
      this.router.navigate(['/cars/publish']).then(() => {
        setTimeout(() => this.tourService.restartTour('owner'), 500);
      });
    } else {
      this.tourService.restartTour(tourType);
    }
  }
}
```

### 2. Agregar en tu header

```typescript
// header.component.ts
import { Component } from '@angular/core';
import { HelpButtonComponent } from '../help-button/help-button.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [HelpButtonComponent],
  template: `
    <header class="sticky top-0 z-40 bg-ivory-soft/95 backdrop-blur">
      <div class="container-page px-container py-4 flex items-center justify-between">
        <!-- Logo -->
        <a routerLink="/" class="flex items-center">
          <img src="assets/logo.svg" alt="Autorentar" class="h-10">
        </a>

        <!-- Navigation -->
        <nav class="hidden md:flex items-center gap-6">
          <a routerLink="/cars" class="nav-link">Buscar autos</a>
          <a routerLink="/cars/publish" class="nav-link">Publicar mi auto</a>
        </nav>

        <!-- Right actions -->
        <div class="flex items-center gap-3">
          <!-- Botón de ayuda -->
          <app-help-button />

          <!-- Login/Profile -->
          <a routerLink="/auth/login" class="btn-primary">Ingresar</a>
        </div>
      </div>
    </header>
  `
})
export class HeaderComponent {}
```

---

## 🏠 Opción 3: Tour Automático en Homepage

```typescript
// features/home/home.component.ts
import { Component, AfterViewInit, inject } from '@angular/core';
import { TourService } from '@core/services/tour.service';

@Component({
  selector: 'app-home',
  standalone: true,
  template: `
    <!-- Hero Section -->
    <section class="hero-section" id="hero">
      <div class="container-page px-container py-section">
        <h1 class="text-display mb-6">
          Alquilá o publicá tu auto en minutos
        </h1>
        <p class="text-lead mb-8">
          La plataforma de confianza para alquileres entre particulares
        </p>

        <div class="flex gap-4">
          <a routerLink="/cars" class="btn-primary">
            🔍 Buscar autos
          </a>
          <a routerLink="/cars/publish" class="btn-secondary">
            💸 Publicar mi auto
          </a>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section class="py-section">
      <!-- Tu contenido -->
    </section>
  `
})
export class HomeComponent implements AfterViewInit {
  private tourService = inject(TourService);

  ngAfterViewInit() {
    // Esperar a que todo esté renderizado
    setTimeout(() => {
      this.checkAndStartTour();
    }, 1000);
  }

  private checkAndStartTour(): void {
    const hasSeenTour = localStorage.getItem('autorenta:tour:welcome');

    if (!hasSeenTour) {
      this.tourService.startWelcomeTour();
    }
  }
}
```

---

## 🚗 Opción 4: Tour de Renter en Búsqueda

```typescript
// features/cars/list/cars-list.component.ts
import { Component, AfterViewInit, inject } from '@angular/core';
import { TourService } from '@core/services/tour.service';

@Component({
  selector: 'app-cars-list',
  standalone: true,
  template: `
    <div class="container-page px-container py-section">
      <!-- Search Bar -->
      <div class="mb-6">
        <input
          id="search-input"
          type="text"
          placeholder="Buscar por ubicación..."
          class="input-premium"
        />
      </div>

      <!-- Filters -->
      <div class="filter-section mb-6" id="filters">
        <button class="btn-secondary">Filtros</button>
      </div>

      <!-- Map -->
      <div class="grid lg:grid-cols-2 gap-6 mb-6">
        <div id="map-container" class="h-96 rounded-xl overflow-hidden">
          <!-- Mapa -->
        </div>

        <!-- Car List -->
        <div>
          @for (car of cars; track car.id) {
            <div class="car-card card-premium p-4 mb-4">
              <img [src]="car.image" [alt]="car.name" class="rounded-lg mb-3">
              <h3 class="font-semibold">{{ car.name }}</h3>
              <p class="text-caption">{{ car.price | currency:'ARS' }}</p>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class CarsListComponent implements AfterViewInit {
  private tourService = inject(TourService);

  cars = []; // Tu array de autos

  ngAfterViewInit() {
    setTimeout(() => {
      this.checkRenterTour();
    }, 800);
  }

  private checkRenterTour(): void {
    const hasSeenRenterTour = localStorage.getItem('autorenta:tour:renter');

    if (!hasSeenRenterTour && this.cars.length > 0) {
      this.tourService.startRenterTour();
    }
  }
}
```

---

## 💸 Opción 5: Tour de Owner en Publicación

```typescript
// features/cars/publish/publish-car.component.ts
import { Component, AfterViewInit, inject } from '@angular/core';
import { TourService } from '@core/services/tour.service';

@Component({
  selector: 'app-publish-car',
  standalone: true,
  template: `
    <div class="container-narrow px-container py-section">
      <h1 class="h2 mb-8">Publicar mi auto</h1>

      <form>
        <!-- Photos -->
        <div class="mb-6">
          <label class="block mb-2 font-semibold">Fotos del auto</label>
          <div id="photo-uploader" class="border-2 border-dashed rounded-xl p-8 text-center">
            <input type="file" multiple accept="image/*" (change)="onPhotosSelected($event)">
            <p class="text-caption mt-2">Arrastrá tus fotos o hacé click para seleccionar</p>
          </div>
        </div>

        <!-- Pricing -->
        <div class="mb-6" id="pricing-section">
          <label class="block mb-2 font-semibold">Precio por día</label>
          <input
            type="number"
            placeholder="$5000"
            class="input-premium"
            [(ngModel)]="car.price"
          />
          <p class="text-caption mt-1">
            💡 Precio sugerido: ${{ suggestedPrice | currency:'ARS' }}
          </p>
        </div>

        <!-- Insurance -->
        <div class="mb-6" id="insurance-selector">
          <label class="block mb-2 font-semibold">Cobertura de seguro</label>
          <select class="input-premium">
            <option>Básica - Gratis</option>
            <option>Premium - $500/día</option>
            <option>Total - $800/día</option>
          </select>
        </div>

        <!-- Availability -->
        <div class="mb-6" id="availability-calendar">
          <label class="block mb-2 font-semibold">Disponibilidad</label>
          <!-- Tu calendario -->
        </div>

        <!-- Submit -->
        <button
          id="publish-button"
          type="submit"
          class="btn-primary w-full"
        >
          🚀 Publicar ahora
        </button>
      </form>
    </div>
  `
})
export class PublishCarComponent implements AfterViewInit {
  private tourService = inject(TourService);

  car = { price: 0 };
  suggestedPrice = 5000;

  ngAfterViewInit() {
    setTimeout(() => {
      this.checkOwnerTour();
    }, 500);
  }

  private checkOwnerTour(): void {
    const hasPublishedBefore = localStorage.getItem('autorenta:has_published_car');

    if (!hasPublishedBefore) {
      this.tourService.startOwnerTour();
    }
  }

  onPhotosSelected(event: Event) {
    const files = (event.target as HTMLInputElement).files;

    if (files && files.length === 1) {
      // Mostrar quick tip después de primera foto
      this.tourService.showQuickTip(
        '#photo-uploader',
        '🎉 ¡Primera foto! Tip: +5 fotos = +60% más reservas.',
        'bottom'
      );
    }
  }
}
```

---

## 🎨 Personalización de Estilos

Si querés cambiar los colores del tour para que matcheen tu brand:

```scss
// En src/styles/shepherd-custom.scss

// Cambiar color primario del tour
$shepherd-primary: #2c4a52; // Tu color accent-petrol
$shepherd-primary-hover: #1e3339;

// Cambiar fondo en dark mode
.dark .shepherd-element {
  background: #1a202c; // Tu color anthracite
  border: 1px solid #30373b;
}
```

---

## ✅ Checklist Rápido

Antes de testear, verificá:

1. [ ] `TourService` está en `src/app/core/services/tour.service.ts`
2. [ ] Estilos importados en `src/styles.css`
3. [ ] Componente tiene `AfterViewInit`
4. [ ] `setTimeout()` con al menos 500ms
5. [ ] IDs/clases HTML matchean con el servicio
6. [ ] localStorage funciona en tu navegador

---

## 🚀 Comandos para Testear

```bash
# Iniciar servidor de desarrollo
npm run start

# Abrir en navegador
# http://localhost:4200

# Limpiar localStorage para probar de nuevo
localStorage.clear();

# Ver qué tours se guardaron
localStorage.getItem('autorenta:tour:welcome');
localStorage.getItem('autorenta:tour:renter');
localStorage.getItem('autorenta:tour:owner');
```

---

## 🎯 Próximo Paso

1. **Copiá** uno de los ejemplos de arriba
2. **Pegalo** en tu componente
3. **Ajustá** los IDs si es necesario
4. **Testeá** en http://localhost:4200
5. **¡Disfrutá tu tour!** 🎉

---

¿Necesitás ayuda con algún paso? ¡Avisame!
