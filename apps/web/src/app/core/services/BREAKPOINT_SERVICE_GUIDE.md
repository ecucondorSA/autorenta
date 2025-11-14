# 📱 BreakpointService - Guía de Uso

## 🎯 Resumen

Servicio centralizado para manejo de breakpoints responsivos alineado con Tailwind CSS.

## 📦 Instalación

```typescript
import { BreakpointService } from '@core/services/breakpoint.service';

export class MyComponent {
  private breakpoint = inject(BreakpointService);
}
```

## 🚀 Uso Básico

### En TypeScript

```typescript
export class MyComponent {
  private breakpoint = inject(BreakpointService);
  
  // Usar signals directamente
  isMobile = this.breakpoint.isMobile;
  isDesktop = this.breakpoint.isDesktop;
  
  // Computed basado en breakpoint
  showMobileNav = computed(() => this.isMobile() && this.hasUser());
}
```

### En Templates

```html
<!-- Condicional simple -->
@if (breakpoint.isMobile()) {
  <app-mobile-nav />
} @else {
  <app-desktop-nav />
}

<!-- Múltiples breakpoints -->
@if (breakpoint.isSmallMobile()) {
  <app-compact-view />
} @else if (breakpoint.isMobile()) {
  <app-mobile-view />
} @else if (breakpoint.isTablet()) {
  <app-tablet-view />
} @else {
  <app-desktop-view />
}
```

## 📊 Signals Disponibles

| Signal | Condición | Uso |
|--------|-----------|-----|
| `isMobile` | < 768px | Teléfonos |
| `isTablet` | 768px - 1023px | Tablets |
| `isDesktop` | ≥ 1024px | Desktop |
| `isSmallMobile` | < 640px | iPhone SE, Mini |
| `isLargeDesktop` | ≥ 1280px | Monitores grandes |
| `isPortrait` | height > width | Orientación vertical |
| `isLandscape` | height ≤ width | Orientación horizontal |
| `width` | number | Ancho actual |
| `current` | Breakpoint | Breakpoint actual ('sm', 'md', 'lg', 'xl', '2xl') |

## 🔧 Métodos Helper

### isAtLeast()
```typescript
// ¿Es tablet o mayor?
if (this.breakpoint.isAtLeast('md')) {
  // Código para tablet y desktop
}
```

### isBelow()
```typescript
// ¿Es menor que desktop?
if (this.breakpoint.isBelow('lg')) {
  // Código para mobile y tablet
}
```

### isBetween()
```typescript
// ¿Está entre tablet y desktop?
if (this.breakpoint.isBetween('md', 'xl')) {
  // Código específico para este rango
}
```

### observe()
```typescript
ngOnInit() {
  // Observar cambios en breakpoint
  this.cleanup = this.breakpoint.observe('md', (isMobileOrAbove) => {
    console.log('Mobile o mayor:', isMobileOrAbove);
  });
}

ngOnDestroy() {
  this.cleanup?.(); // Limpiar observador
}
```

## 📋 Ejemplos Reales

### Ejemplo 1: Carrusel Adaptativo

```typescript
export class ProductCarousel {
  private breakpoint = inject(BreakpointService);
  
  itemsPerView = computed(() => {
    if (this.breakpoint.isSmallMobile()) return 1;
    if (this.breakpoint.isMobile()) return 2;
    if (this.breakpoint.isTablet()) return 3;
    return 4;
  });
}
```

### Ejemplo 2: Navegación Responsiva

```typescript
export class HeaderComponent {
  private breakpoint = inject(BreakpointService);
  
  showMobileMenu = this.breakpoint.isMobile;
  showDesktopNav = this.breakpoint.isDesktop;
  
  // Computed para mostrar menú hamburguesa
  showHamburger = computed(() => 
    this.breakpoint.isMobile() || this.breakpoint.isTablet()
  );
}
```

```html
@if (showHamburger()) {
  <button (click)="toggleMenu()">
    <ion-icon name="menu"></ion-icon>
  </button>
} @else {
  <nav class="desktop-nav">
    <a routerLink="/cars">Autos</a>
    <a routerLink="/bookings">Reservas</a>
  </nav>
}
```

### Ejemplo 3: Grids Responsivos

```typescript
export class CarGrid {
  private breakpoint = inject(BreakpointService);
  
  gridCols = computed(() => {
    const current = this.breakpoint.current();
    const cols = {
      'sm': 1,
      'md': 2,
      'lg': 3,
      'xl': 4,
      '2xl': 5
    };
    return cols[current];
  });
}
```

```html
<div [class]="'grid gap-4 grid-cols-' + gridCols()">
  @for (car of cars; track car.id) {
    <app-car-card [car]="car" />
  }
</div>
```

### Ejemplo 4: Modal Fullscreen en Mobile

```typescript
export class BookingModal {
  private breakpoint = inject(BreakpointService);
  
  modalClass = computed(() => 
    this.breakpoint.isMobile() 
      ? 'modal-fullscreen' 
      : 'modal-centered max-w-2xl'
  );
}
```

## ⚠️ Migración desde window.innerWidth

### ❌ Antes (No usar)
```typescript
// Hardcoded - NO USAR
if (window.innerWidth < 768) {
  // Mobile code
}

// Computed duplicado - NO USAR
readonly isMobile = computed(() => window.innerWidth < 1024);
```

### ✅ Después (Usar)
```typescript
private breakpoint = inject(BreakpointService);

// Usar signal del servicio
isMobile = this.breakpoint.isMobile;

// O computed basado en el servicio
showCompactView = computed(() => 
  this.breakpoint.isMobile() && this.hasData()
);
```

## 🎯 Breakpoints Estándar

```typescript
export const BREAKPOINTS = {
  sm: 640,   // iPhone SE, Android pequeños
  md: 768,   // iPad Mini, tablets pequeñas
  lg: 1024,  // iPad, laptops
  xl: 1280,  // Desktops, monitores
  '2xl': 1536 // Monitores grandes, 4K
};
```

## 📱 Casos de Uso Comunes

### Mostrar diferentes componentes
```html
@if (breakpoint.isMobile()) {
  <app-mobile-header />
  <app-mobile-content />
} @else {
  <app-desktop-header />
  <app-desktop-sidebar />
  <app-desktop-content />
}
```

### Adaptar funcionalidad
```typescript
onCardClick(car: Car) {
  if (this.breakpoint.isMobile()) {
    // En mobile, ir a página completa
    this.router.navigate(['/cars', car.id]);
  } else {
    // En desktop, abrir modal
    this.openCarModal(car);
  }
}
```

### Scroll behavior
```typescript
scrollBehavior = computed(() => 
  this.breakpoint.isMobile() ? 'smooth' : 'auto'
);
```

## 🔥 Performance

- **Throttle de 150ms** en resize events
- **Signals** para actualizaciones reactivas eficientes
- **Single source of truth** - un solo listener para toda la app
- **Tree-shakeable** - solo se importa lo que se usa

## ✅ Testing

```typescript
it('should detect mobile viewport', () => {
  Object.defineProperty(window, 'innerWidth', {
    value: 375,
    writable: true,
  });
  
  const service = new BreakpointService();
  expect(service.isMobile()).toBe(true);
});
```

## 📚 Referencias

- Breakpoints: `apps/web/tailwind.config.js`
- CSS: `apps/web/src/styles/mobile-optimizations.css`
- Documentación: `.github/copilot-instructions.md`
