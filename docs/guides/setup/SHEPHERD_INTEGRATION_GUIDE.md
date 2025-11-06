# 🎯 Guía de Integración - Shepherd.js Tours en AutoRenta

## 📚 Tabla de Contenidos

1. [Instalación Completada](#instalación-completada)
2. [Uso Básico](#uso-básico)
3. [Integración en Componentes](#integración-en-componentes)
4. [Tours Disponibles](#tours-disponibles)
5. [Personalización](#personalización)
6. [Analytics](#analytics)
7. [Troubleshooting](#troubleshooting)

---

## ✅ Instalación Completada

Ya se instalaron y configuraron:

- ✅ **shepherd.js** (npm package)
- ✅ **TourService** (`src/app/core/services/tour.service.ts`)
- ✅ **Estilos custom** (`src/styles/shepherd-custom.scss`)
- ✅ **Importación global** en `styles.css`

---

## 🚀 Uso Básico

### 1. Inyectar el servicio en tu componente

```typescript
import { Component, AfterViewInit } from '@angular/core';
import { TourService } from './core/services/tour.service';

@Component({
  selector: 'app-root',
  template: `
    <!-- Tu contenido -->
    <button (click)="startTour()" class="icon-button" id="help-center" aria-label="Ayuda">
      ?
    </button>
  `,
  standalone: true
})
export class AppComponent implements AfterViewInit {
  constructor(private tourService: TourService) {}

  ngAfterViewInit() {
    // Mostrar tour de bienvenida solo en primera visita
    const hasSeenWelcome = localStorage.getItem('autorenta:tour:welcome');

    if (!hasSeenWelcome) {
      // Esperar 1 segundo para que el DOM esté listo
      setTimeout(() => {
        this.tourService.startWelcomeTour();
      }, 1000);
    }
  }

  // Permitir reiniciar tour manualmente
  startTour() {
    this.tourService.restartTour('welcome');
  }
}
```

---

## 🎯 Tours Disponibles

### 1. **Tour de Bienvenida** (Homepage)

```typescript
// En tu componente principal o página de inicio
import { TourService } from '@core/services/tour.service';

constructor(private tourService: TourService) {}

ngAfterViewInit() {
  this.tourService.startWelcomeTour();
}
```

**Requisitos HTML**:
- `.hero-section` o `#hero` - Sección hero
- `header nav` o `.main-nav` - Navegación principal
- `.help-button` o `#help-center` - Botón de ayuda

---

### 2. **Tour de Renter** (Búsqueda de autos)

```typescript
// En CarsListComponent o página de búsqueda
import { TourService } from '@core/services/tour.service';

constructor(private tourService: TourService) {}

ngAfterViewInit() {
  // Mostrar solo si es la primera vez que busca
  const hasSeenRenterTour = localStorage.getItem('autorenta:tour:renter');

  if (!hasSeenRenterTour) {
    this.tourService.startRenterTour();
  }
}
```

**Requisitos HTML**:
- `#search-input` - Campo de búsqueda
- `.filter-section` o `#filters` - Sección de filtros
- `#map-container` - Contenedor del mapa
- `.car-card:first-of-type` - Primera tarjeta de auto

---

### 3. **Tour de Owner** (Publicar auto)

```typescript
// En PublishCarComponent
import { TourService } from '@core/services/tour.service';

constructor(private tourService: TourService) {}

ngAfterViewInit() {
  const isFirstPublication = !localStorage.getItem('autorenta:has_published_car');

  if (isFirstPublication) {
    setTimeout(() => {
      this.tourService.startOwnerTour();
    }, 500);
  }
}
```

**Requisitos HTML**:
- `#publish-car` o `.publish-button` - Botón de publicar
- `#photo-uploader` - Uploader de fotos
- `#pricing-section` - Sección de precio
- `#insurance-selector` - Selector de seguro
- `#availability-calendar` - Calendario
- `#publish-button` - Botón final de publicar

---

### 4. **Tour de Detalle de Auto**

```typescript
// En CarDetailComponent
import { TourService } from '@core/services/tour.service';

constructor(private tourService: TourService) {}

ngAfterViewInit() {
  // Mostrar solo si es primera vez viendo un detalle
  const hasSeenCarDetail = sessionStorage.getItem('autorenta:tour:car-detail');

  if (!hasSeenCarDetail) {
    setTimeout(() => {
      this.tourService.startCarDetailTour();
      sessionStorage.setItem('autorenta:tour:car-detail', 'true');
    }, 1000);
  }
}
```

**Requisitos HTML**:
- `.car-gallery` - Galería de fotos
- `.reviews-section` o `#reviews` - Reseñas
- `.insurance-info` - Información de seguro
- `#book-now` - Botón de reservar

---

## 💡 Quick Tips (Tooltips contextuales)

Para mostrar tips rápidos sin overlay completo:

```typescript
import { TourService } from '@core/services/tour.service';

constructor(private tourService: TourService) {}

// Ejemplo: Mostrar tip cuando usuario sube primera foto
onPhotoUploaded() {
  const photoCount = this.photos.length;

  if (photoCount === 1) {
    this.tourService.showQuickTip(
      '#photo-uploader',
      '🎉 ¡Primera foto subida! Tip: +5 fotos = +60% de reservas.',
      'bottom'
    );
  }
}

// Ejemplo: Tip de precio inteligente
onPriceChanged(newPrice: number) {
  const suggestedPrice = this.calculateSuggestedPrice();

  if (Math.abs(newPrice - suggestedPrice) > suggestedPrice * 0.2) {
    this.tourService.showQuickTip(
      '#price-input',
      '💡 Precio 20% diferente al sugerido. Podés afectar tus reservas.',
      'top'
    );
  }
}
```

---

## 🎨 Personalización de Selectores

Si tus elementos HTML tienen diferentes IDs/clases, podés:

### Opción 1: Actualizar tus IDs para que matcheen

```html
<!-- Ejemplo: Asegurate que tu botón de ayuda tenga este ID -->
<button id="help-center" class="icon-button">?</button>

<!-- O este -->
<button class="help-button">?</button>
```

### Opción 2: Modificar el TourService

Editá `/src/app/core/services/tour.service.ts` y cambiá los selectores:

```typescript
// En startWelcomeTour(), línea ~60
attachTo: {
  element: '.tu-clase-custom, #tu-id-custom', // ← Agregá tus selectores
  on: 'bottom'
}
```

---

## 📊 Analytics Integration

El `TourService` ya tiene un método `trackEvent()` preparado. Para integrarlo con Google Analytics 4:

```typescript
// En tour.service.ts, línea ~337
private trackEvent(eventName: string, properties: Record<string, any>): void {
  // Descomentar para producción:
  if (typeof gtag !== 'undefined') {
    gtag('event', eventName, properties);
  }

  // O si usás Mixpanel:
  // if (typeof mixpanel !== 'undefined') {
  //   mixpanel.track(eventName, properties);
  // }
}
```

**Eventos que se trackean automáticamente**:
- `tour_step_viewed` - Cada paso mostrado
- `tour_cancelled` - Usuario cancela el tour
- `tour_completed` - Usuario completa el tour

---

## 🔄 Reiniciar Tours Manualmente

Botón de "?" en header para que usuarios puedan ver tours de nuevo:

```html
<!-- En tu header component -->
<div class="flex items-center gap-2">
  <!-- ... otros botones ... -->

  <button
    id="help-center"
    class="icon-button"
    (click)="showHelpMenu()"
    aria-label="Ayuda"
  >
    <svg><!-- ícono ? --></svg>
  </button>
</div>
```

```typescript
// En el componente
import { TourService } from '@core/services/tour.service';

constructor(private tourService: TourService) {}

showHelpMenu() {
  // Opción 1: Menú simple
  const option = confirm('¿Querés ver el tour de bienvenida de nuevo?');
  if (option) {
    this.tourService.restartTour('welcome');
  }

  // Opción 2: Modal con opciones (recomendado)
  this.openHelpModal();
}

openHelpModal() {
  // Mostrar modal con opciones:
  // - Ver tour de bienvenida
  // - Ver tour de búsqueda
  // - Ver tour de publicación
  // - Contactar soporte
}
```

---

## 🎯 Estrategias de Activación

### Estrategia 1: Primera visita (recomendada)

```typescript
ngAfterViewInit() {
  const hasSeenTour = localStorage.getItem('autorenta:tour:welcome');

  if (!hasSeenTour) {
    setTimeout(() => {
      this.tourService.startWelcomeTour();
    }, 1000);
  }
}
```

### Estrategia 2: Después de registro

```typescript
// En auth/register.component.ts
onRegistrationSuccess(user: User) {
  // Redirigir al home
  this.router.navigate(['/']);

  // Mostrar tour después del redirect
  setTimeout(() => {
    this.tourService.startWelcomeTour();
  }, 1500);
}
```

### Estrategia 3: Por rol detectado

```typescript
ngOnInit() {
  this.authService.currentUser$.subscribe(user => {
    if (user && !user.hasSeenTour) {
      if (user.role === 'locador') {
        this.tourService.startOwnerTour();
      } else if (user.role === 'locatario') {
        this.tourService.startRenterTour();
      }

      // Marcar como visto en BD
      this.userService.updateProfile({ hasSeenTour: true });
    }
  });
}
```

### Estrategia 4: Tours progresivos

```typescript
// Día 1: Tour básico
if (daysSinceSignup === 0 && !user.tours.basic) {
  this.tourService.startWelcomeTour();
}

// Día 3: Features avanzados
if (daysSinceSignup === 3 && !user.tours.advanced) {
  this.showAdvancedFeaturesTour();
}

// Después de primera reserva
if (user.bookings.length === 1 && !user.tours.postBooking) {
  this.showPostBookingTips();
}
```

---

## 🛠️ Troubleshooting

### Problema 1: Tour no se muestra

**Causa**: Elementos HTML no existen cuando se inicia el tour

**Solución**:
```typescript
ngAfterViewInit() {
  // Esperar a que el DOM esté listo
  setTimeout(() => {
    this.tourService.startWelcomeTour();
  }, 1000); // Aumentar si es necesario
}
```

### Problema 2: Tour se muestra siempre

**Causa**: localStorage no se está guardando

**Solución**:
```typescript
// Verificar en DevTools > Application > LocalStorage
// Debe aparecer: autorenta:tour:welcome = "completed"

// Si no funciona, usar manualmente:
localStorage.setItem('autorenta:tour:welcome', 'completed');
```

### Problema 3: Estilos no se aplican

**Causa**: SCSS no se importó correctamente

**Solución**:
```bash
# Verificar que styles.css tenga:
@import './styles/shepherd-custom.scss';

# Si no funciona, reiniciar servidor:
npm run start
```

### Problema 4: Tours se solapan

**Causa**: Múltiples tours iniciándose al mismo tiempo

**Solución**:
```typescript
// Usar un solo tour por página
ngAfterViewInit() {
  const isFirstVisit = !localStorage.getItem('autorenta:tour:any');

  if (isFirstVisit && this.router.url === '/') {
    this.tourService.startWelcomeTour();
  }
}
```

---

## 📝 Checklist de Implementación

Antes de ir a producción, verificar:

- [ ] Todos los selectores HTML matchean con el TourService
- [ ] Tours se muestran solo en primera visita
- [ ] Botón "?" permite reiniciar tours
- [ ] localStorage persiste correctamente
- [ ] Analytics está trackeando eventos
- [ ] Tours funcionan en mobile
- [ ] Dark mode se ve correctamente
- [ ] Accesibilidad (keyboard navigation funciona)
- [ ] Textos en español correctos
- [ ] No hay console.errors

---

## 🚀 Próximos Pasos Recomendados

1. **Implementar en Homepage primero**
   ```bash
   # Editar src/app/features/home/home.component.ts
   # Agregar TourService y startWelcomeTour()
   ```

2. **Agregar IDs a elementos clave**
   ```html
   <!-- En tu header -->
   <nav id="main-nav">
     <button id="help-center">?</button>
   </nav>

   <!-- En tu hero section -->
   <section class="hero-section" id="hero">
     <!-- contenido -->
   </section>
   ```

3. **Testear en diferentes rutas**
   - `/` → Welcome tour
   - `/cars` → Renter tour
   - `/cars/publish` → Owner tour
   - `/cars/:id` → Car detail tour

4. **Configurar Analytics**
   - Agregar tracking code de GA4
   - Descomentar `gtag()` en tour.service.ts
   - Verificar eventos en GA4 Realtime

5. **A/B Testing (opcional)**
   - Crear variante con 3 pasos vs 5 pasos
   - Medir completion rate
   - Ajustar según métricas

---

## 📚 Recursos Adicionales

- **Documentación oficial**: https://shepherdjs.dev/
- **Ejemplos**: https://shepherdjs.dev/examples/
- **API Reference**: https://shepherdjs.dev/api/

---

## 💬 Soporte

Si tenés dudas o problemas:

1. Revisar esta guía primero
2. Checkear console de DevTools
3. Verificar que elementos HTML existan
4. Probar con `setTimeout()` más largo

---

**¡Listo para empezar! 🎉**

Empezá integrando el tour de bienvenida en tu homepage y luego expandí a los otros flujos.
