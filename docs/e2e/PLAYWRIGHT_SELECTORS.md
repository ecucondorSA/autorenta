# 🎯 Playwright E2E Test Selectors Guide

> **Última actualización**: 2025-01-17
> **Versión**: 1.0.0

Guía completa de selectores CSS y `data-testid` para testing E2E con Playwright en AutoRenta.

## 📋 Tabla de Contenidos

- [Header/Navigation](#headernavigation)
- [Marketplace/Home](#marketplacehome)
- [Car Cards](#car-cards)
- [Search & Filters](#search--filters)
- [Quick Booking](#quick-booking)
- [Car Detail Page](#car-detail-page)
- [Auth](#authentication)

---

## Header/Navigation

### Elementos Principales

| Elemento | Selector | data-testid | Descripción |
|----------|----------|-------------|-------------|
| **Header** | `header.app-header` | `app-header` | Header principal (fixed) |
| **Logo Link** | `header a[aria-label="Ir al inicio"]` | `header-logo-link` | Link al home |
| **Search Container** | `header .flex-1.max-w-md` | `header-search-container` | Container de búsqueda |
| **Search Input** | `header input[type="text"]` | `header-search-input` | Input de búsqueda |
| **"Cómo funciona" Button** | `button:has-text("¿Cómo funciona?")` | `header-how-it-works-button` | Botón info |
| **"Publica" Button** | `button:has-text("Publica")` | `header-publish-car-button` | CTA principal |

### Ejemplo Playwright

```typescript
// Navigation
await page.click('[data-testid="header-logo-link"]');

// Search
await page.fill('[data-testid="header-search-input"]', 'Mercedes');
await page.press('[data-testid="header-search-input"]', 'Enter');

// Actions
await page.click('[data-testid="header-publish-car-button"]');
await page.click('[data-testid="header-how-it-works-button"]');
```

---

## Marketplace/Home

### Hero Section

| Elemento | Selector | data-testid | Descripción |
|----------|----------|-------------|-------------|
| **Hero Container** | `.hero-header` | - | Hero principal con gradiente |
| **Hero Title** | `.hero-header h2` | - | "Encuentra tu auto ideal" |
| **Logo** | `.hero-header img[alt="Autorentar Logo"]` | - | Logo en hero |
| **Quick Search** | `.hero-header input[placeholder*="Dónde necesitas"]` | - | Buscador de ubicación |
| **Search Button** | `.hero-header button:has-text("Buscar autos")` | - | Botón de búsqueda |

### Quick Filters

| Elemento | Selector | data-testid | Descripción |
|----------|----------|-------------|-------------|
| **Filters Container** | `.scrollbar-hide.snap-x` | - | Container de filtros horizontales |
| **Filter Button (generic)** | `.scrollbar-hide button` | - | Botón de filtro individual |
| **Filter "Inmediato"** | `button:has-text("Reserva inmediata")` | - | Filtro de disponibilidad inmediata |
| **Filter "Verificado"** | `button:has-text("Solo verificados")` | - | Filtro de verificados |
| **Filter "Sin tarjeta"** | `button:has-text("Sin tarjeta")` | - | Filtro sin tarjeta de crédito |
| **Filter "Cerca de mí"** | `button:has-text("Cerca de mí")` | - | Filtro por cercanía |

### Ejemplo Playwright

```typescript
// Apply filters
await page.click('button:has-text("Reserva inmediata")');
await page.click('button:has-text("Solo verificados")');

// Search by location
await page.fill('input[placeholder*="Dónde necesitas"]', 'Palermo, Buenos Aires');
await page.click('button:has-text("Buscar autos")');
```

---

## Car Cards

### Estructura del Card

| Elemento | Selector | data-testid | Descripción |
|----------|----------|-------------|-------------|
| **Card Container** | `article.car-card` | `car-card-{id}` | Card completo (clickable) |
| **Image Container** | `article.car-card > div.aspect-\[4\/3\]` | `car-card-image-container` | Container de imagen |
| **Image** | `article.car-card img` | - | Imagen del auto |
| **Content** | `article.car-card > div[data-testid]` | `car-card-content` | Contenido del card |
| **Title** | `article.car-card h3` | `car-card-title` | Título del auto |
| **Rating** | `.flex.items-center.gap-2:has(svg[fill="currentColor"])` | `car-card-rating` | Rating con estrellas |
| **Price Section** | `.price-actions` | `car-card-price-section` | Sección de precio |
| **Price** | `p.text-2xl.font-bold` | `car-card-price` | Precio por día |
| **Footer** | `.flex.items-center.justify-between.mt-auto` | `car-card-footer` | Footer con CTA |

### Atributos Dinámicos

Los cards incluyen atributos `data-*` dinámicos muy útiles:

```html
<article
  data-testid="car-card-550e8400-e29b-41d4-a716-446655440000"
  data-car-status="active"
  aria-label="Mercedes-Benz C-Class - 15000 ARS por día">
</article>
```

### Ejemplo Playwright

```typescript
// Find car by ID
const carId = '550e8400-e29b-41d4-a716-446655440000';
await page.click(`[data-testid="car-card-${carId}"]`);

// Filter by status
const activeCars = page.locator('[data-car-status="active"]');
await expect(activeCars).toHaveCount(await activeCars.count());

// Get car info
const carCard = page.locator('[data-testid^="car-card-"]').first();
const title = await carCard.locator('[data-testid="car-card-title"]').textContent();
const price = await carCard.locator('[data-testid="car-card-price"]').textContent();

// Click on first available car
await page.locator('[data-testid^="car-card-"]').first().click();
```

---

## Search & Filters

### Location Search

| Elemento | Selector | data-testid | Descripción |
|----------|----------|-------------|-------------|
| **Location Input** | `input[placeholder*="Dónde necesitas"]` | - | Input de ubicación |
| **Suggestions Dropdown** | `.absolute.z-50.bg-white` | - | Dropdown de sugerencias |
| **Suggestion Item** | `.absolute.z-50 button` | - | Item de sugerencia |

### Date Picker

| Elemento | Selector | data-testid | Descripción |
|----------|----------|-------------|-------------|
| **Date Input Start** | `input[placeholder="Desde"]` | - | Fecha inicio |
| **Date Input End** | `input[placeholder="Hasta"]` | - | Fecha fin |

### Ejemplo Playwright

```typescript
// Select location from suggestions
await page.fill('input[placeholder*="Dónde necesitas"]', 'Palermo');
await page.waitForSelector('.absolute.z-50.bg-white');
await page.click('.absolute.z-50 button:has-text("Palermo")');

// Select dates
await page.fill('input[placeholder="Desde"]', '2025-01-20');
await page.fill('input[placeholder="Hasta"]', '2025-01-25');
```

---

## Quick Booking

### Modal Elements

| Elemento | Selector | data-testid | Descripción |
|----------|----------|-------------|-------------|
| **Modal Container** | `.modal-container` | `quick-booking-modal` | Modal de reserva rápida |
| **Close Button** | `button[aria-label="Cerrar"]` | `modal-close-button` | Botón cerrar |
| **Confirm Button** | `button:has-text("Confirmar reserva")` | `confirm-booking-button` | Confirmar reserva |

---

## Car Detail Page

### Page Elements

| Elemento | Selector | data-testid | Descripción |
|----------|----------|-------------|-------------|
| **Car Title** | `h1.text-3xl` | `car-detail-title` | Título del auto |
| **Price Display** | `.text-4xl.font-bold` | `car-detail-price` | Precio principal |
| **Book Now Button** | `button#book-now` | `book-now-button` | Botón principal de reserva |
| **Gallery** | `.car-gallery` | `car-gallery` | Galería de imágenes |
| **Owner Info** | `.owner-card` | `owner-info-section` | Info del propietario |

### Ejemplo Playwright

```typescript
// Navigate to car detail
await page.goto(`/cars/${carId}`);

// Get car info
const title = await page.locator('[data-testid="car-detail-title"]').textContent();
const price = await page.locator('[data-testid="car-detail-price"]').textContent();

// Book car
await page.click('[data-testid="book-now-button"]');
```

---

## Authentication

### Login/Register

| Elemento | Selector | data-testid | Descripción |
|----------|----------|-------------|-------------|
| **Email Input** | `input[type="email"]` | `auth-email-input` | Email |
| **Password Input** | `input[type="password"]` | `auth-password-input` | Contraseña |
| **Login Button** | `button[type="submit"]` | `auth-login-button` | Botón login |
| **Register Link** | `a:has-text("Registrarse")` | `auth-register-link` | Link a registro |

---

## 🎨 Best Practices

### 1. Prioridad de Selectors

```typescript
// ✅ PREFERIR: data-testid (más estable)
await page.click('[data-testid="header-publish-car-button"]');

// ✅ BUENO: Atributos semánticos
await page.click('button[aria-label="Publicar tu auto"]');

// ⚠️ USAR CON CUIDADO: Texto (puede cambiar)
await page.click('button:has-text("Publica tu auto")');

// ❌ EVITAR: Clases CSS (pueden cambiar)
await page.click('.px-4.py-2.text-sm');
```

### 2. Esperar elementos antes de interactuar

```typescript
// ✅ Esperar que el elemento sea visible
await page.waitForSelector('[data-testid="car-card-price"]', { state: 'visible' });
await page.click('[data-testid="car-card-price"]');

// ✅ Usar auto-waiting de Playwright
await page.locator('[data-testid="car-card-price"]').click();
```

### 3. Usar filtros dinámicos

```typescript
// ✅ Combinar data attributes
const activeCars = page.locator('[data-testid^="car-card-"][data-car-status="active"]');

// ✅ Filtrar por contenido
const expensiveCars = page.locator('[data-testid^="car-card-"]')
  .filter({ hasText: /\$[0-9]{5,}/ });
```

---

## 🔄 Actualización

Este documento debe actualizarse cuando:
- Se agregan nuevos `data-testid`
- Se modifican componentes clave
- Se agregan nuevas features
- Se detectan selectores obsoletos

**Última revisión**: 2025-01-17
**Próxima revisión**: 2025-02-17
