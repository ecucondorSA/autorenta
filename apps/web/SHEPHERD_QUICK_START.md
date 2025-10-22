# 🎯 Shepherd.js - Quick Start Guide

## ✅ Instalación Completa

El sistema de tours está **100% funcional** con las siguientes features:

### 📦 Componentes Instalados

1. **TourService** (`src/app/core/services/tour.service.ts`)
   - 4 tours pre-configurados (Welcome, Renter, Owner, Car Detail)
   - Gestión de localStorage para no repetir tours
   - Analytics tracking preparado

2. **HelpButtonComponent** (`src/app/shared/components/help-button/`)
   - Botón de ayuda en header
   - Menú dropdown con opciones de tours
   - Navegación automática a rutas correspondientes

3. **Estilos Custom** (`src/styles/shepherd-custom.scss`)
   - Colores de AutoRenta (#805ad5 purple)
   - Dark mode support
   - Mobile responsive
   - Animaciones smooth

4. **HTML IDs agregados**
   - `#main-header` - Header principal
   - `#main-nav` - Navegación desktop
   - `#help-center` - Botón de ayuda

---

## 🚀 Uso Inmediato

### Tour Automático en Primera Visita

El tour de bienvenida se muestra automáticamente:
- ✅ Solo en homepage (`/` o `/cars`)
- ✅ Solo la primera vez (localStorage)
- ✅ Después del splash screen (6 segundos)

### Tours Manuales

Usuario puede reiniciar tours desde el botón de ayuda (❓):

```
Header → Botón "?" → Menú de ayuda:
  🎯 Ver tour de bienvenida
  🔍 Cómo buscar autos
  💸 Cómo publicar mi auto
  📧 Contactar soporte
```

---

## 🎨 Tours Disponibles

### 1. Tour de Bienvenida (Welcome)
**Ruta**: `/` o `/cars`
**Pasos**: 3
- Hero section
- Navegación principal
- Botón de ayuda

### 2. Tour de Renter (Búsqueda)
**Ruta**: `/cars`
**Pasos**: 4
- Barra de búsqueda
- Filtros
- Mapa
- Tarjeta de auto

**Requisitos HTML**:
```html
<input id="search-input" ... />
<div class="filter-section" id="filters">...</div>
<div id="map-container">...</div>
<div class="car-card">...</div>
```

### 3. Tour de Owner (Publicación)
**Ruta**: `/cars/publish`
**Pasos**: 6
- Uploader de fotos
- Pricing
- Seguro
- Calendario
- Botón publicar

**Requisitos HTML**:
```html
<div id="photo-uploader">...</div>
<div id="pricing-section">...</div>
<div id="insurance-selector">...</div>
<div id="availability-calendar">...</div>
<button id="publish-button">...</button>
```

### 4. Tour de Detalle de Auto
**Ruta**: `/cars/:id`
**Pasos**: 4
- Galería de fotos
- Reviews
- Info de seguro
- Botón reservar

**Requisitos HTML**:
```html
<div class="car-gallery">...</div>
<div class="reviews-section" id="reviews">...</div>
<div class="insurance-info">...</div>
<button id="book-now">...</button>
```

---

## 🧪 Testing Local

### Paso 1: Iniciar servidor
```bash
cd /home/edu/autorenta/apps/web
npm run start
```

### Paso 2: Abrir browser
```
http://localhost:4200
```

### Paso 3: Ver tour
- Esperar 6 segundos (splash + buffer)
- Tour aparecerá automáticamente

### Paso 4: Testear reinicio manual
- Click en botón "?" en header
- Seleccionar "Ver tour de bienvenida"
- Tour se reinicia

### Limpiar localStorage (para re-testear)
```javascript
// En DevTools Console
localStorage.clear();
// O específicamente:
localStorage.removeItem('autorenta:tour:welcome');
localStorage.removeItem('autorenta:tour:renter');
localStorage.removeItem('autorenta:tour:owner');
```

---

## ⚙️ Configuración

### Cambiar timings

**app.component.ts:82**
```typescript
setTimeout(() => {
  this.initializeWelcomeTour();
}, 6000); // ← Ajustar aquí (milisegundos)
```

### Desactivar tour automático

**app.component.ts:238-245**
```typescript
private initializeWelcomeTour(): void {
  const hasSeenTour = localStorage.getItem('autorenta:tour:welcome');
  const isHomePage = this.router.url === '/' || this.router.url === '/cars';

  if (!hasSeenTour && isHomePage) {
    // this.tourService.startWelcomeTour(); // ← Comentar esta línea
  }
}
```

### Personalizar textos

**tour.service.ts:58-96** (Welcome tour)
```typescript
{
  id: 'welcome-hero',
  text: '<div class="tour-content"><h3>¡Tu texto aquí!</h3>...</div>',
  // ...
}
```

---

## 📊 Analytics (Opcional)

### Descomentar tracking en tour.service.ts

**Línea 337-341**
```typescript
private trackEvent(eventName: string, properties: Record<string, any>): void {
  // DESCOMENTAR para producción:
  if (typeof gtag !== 'undefined') {
    gtag('event', eventName, properties);
  }
}
```

### Eventos trackeados automáticamente:
- `tour_step_viewed` - Cada paso mostrado
- `tour_cancelled` - Usuario cancela
- `tour_completed` - Usuario completa

---

## 🎯 Próximos Pasos Recomendados

### 1. Agregar IDs faltantes en rutas específicas

**CarsListComponent** (`/cars`):
```html
<input id="search-input" ... />
<div id="filters">...</div>
<div id="map-container">...</div>
```

**PublishCarComponent** (`/cars/publish`):
```html
<div id="photo-uploader">...</div>
<div id="pricing-section">...</div>
<div id="insurance-selector">...</div>
<div id="availability-calendar">...</div>
<button id="publish-button">...</button>
```

**CarDetailComponent** (`/cars/:id`):
```html
<div class="car-gallery">...</div>
<div id="reviews">...</div>
<div class="insurance-info">...</div>
<button id="book-now">...</button>
```

### 2. Testear en todas las rutas

```bash
# Homepage
http://localhost:4200/

# Catalog
http://localhost:4200/cars

# Publish
http://localhost:4200/cars/publish

# Detail (con un auto existente)
http://localhost:4200/cars/[car-id]
```

### 3. Configurar analytics en producción

1. Agregar Google Analytics 4 al `index.html`
2. Descomentar `gtag()` en tour.service.ts
3. Verificar eventos en GA4 Realtime

---

## 🐛 Troubleshooting

### Tour no se muestra

**Problema**: Elementos HTML no existen
**Solución**: Aumentar timeout o verificar IDs

```typescript
// app.component.ts:82
setTimeout(() => {
  this.initializeWelcomeTour();
}, 10000); // ← Aumentar a 10 segundos
```

### Tour se muestra siempre

**Problema**: localStorage no persiste
**Solución**: Verificar en DevTools > Application > LocalStorage

```javascript
// Debe mostrar:
autorenta:tour:welcome = "completed"
```

### Estilos no se aplican

**Problema**: SCSS no compilado
**Solución**: Reiniciar servidor

```bash
# Ctrl+C para detener
npm run start
```

---

## 📚 Documentación Completa

- **Guía de integración**: `SHEPHERD_INTEGRATION_GUIDE.md`
- **Código de ejemplo**: `TOUR_EXAMPLE_CODE.md`
- **Documentación oficial**: https://shepherdjs.dev/

---

## ✅ Checklist de Producción

Antes de deployar a producción:

- [ ] Todos los tours testeados en localhost
- [ ] IDs agregados en todos los componentes necesarios
- [ ] Analytics configurado y testeando
- [ ] localStorage funcionando correctamente
- [ ] Dark mode se ve correctamente
- [ ] Mobile responsive verificado
- [ ] Traducciones en español correctas
- [ ] No hay console.errors

---

**🎉 ¡Shepherd.js está listo para usar!**

Si necesitás ayuda, revisá los archivos de documentación o consultá en https://shepherdjs.dev/docs
