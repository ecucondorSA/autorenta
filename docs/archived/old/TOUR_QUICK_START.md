# 🚀 Tour System - Quick Start (5 minutos)

## 1. Instalar Dependencia

```bash
npm install shepherd.js
```

## 2. Importar en Componente

```typescript
import { Component, inject } from '@angular/core';
import { GuidedTourService, TourId } from '@core/guided-tour';

@Component({
  selector: 'app-my-component',
  template: `
    <button (click)="startTour()">
      Show Welcome Tour
    </button>
  `
})
export class MyComponent {
  private guidedTour = inject(GuidedTourService);

  startTour() {
    this.guidedTour.request({ 
      id: TourId.Welcome,
      mode: 'user-triggered'
    });
  }
}
```

## 3. Agregar Marcadores HTML

```html
<div class="hero" data-tour-step="welcome-hero">
  <h1>¡Bienvenido!</h1>
</div>

<nav data-tour-step="welcome-nav">
  <a routerLink="/cars">Autos</a>
</nav>

<button data-tour-step="welcome-help">
  <ion-icon name="help-circle"></ion-icon>
</button>
```

## 4. Probar

```typescript
// En browser console:
const guidedTour = inject(GuidedTourService);
guidedTour.enableDebug();
guidedTour.reset(TourId.Welcome);
guidedTour.request({ id: TourId.Welcome, force: true });
```

## 5. Ver Documentación Completa

- **Docs**: `apps/web/src/app/core/guided-tour/README.md`
- **Ejemplos**: `apps/web/src/app/core/guided-tour/EXAMPLES.ts`
- **Migración**: `TOUR_MIGRATION_GUIDE.md`

¡Listo! 🎉
