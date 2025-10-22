# 🚀 Plan de Optimización Lighthouse - AutoRenta

**Fecha:** 2025-10-18
**Scores Actuales:**
- Performance: 83/100 (bueno pero mejorable)
- Accessibility: 74/100 (necesita mejoras)
- Best Practices: 92/100 (muy bueno)
- SEO: Error en robots.txt

**Meta:** Alcanzar 90+ en todas las categorías

---

## 🎯 Problemas Prioritarios (Orden de Impacto)

### 1. **CRÍTICO: Performance - Imágenes** 📸
**Impacto:** Savings de 1,593 KiB (1.3 MB + 314 KB)
**Métricas afectadas:** LCP (2.9s → objetivo <2.5s)

#### Problema:
- Imágenes sin optimizar (1,279 KiB)
- Imágenes offscreen no lazy-loaded (314 KiB)
- Total network payload: 3,822 KiB

#### Solución:

**A. Optimizar imágenes de autos**

```typescript
// apps/web/src/app/core/services/cars.service.ts

async uploadPhoto(file: File, carId: string, position = 0): Promise<CarPhoto> {
  // ANTES: Subir imagen sin optimizar

  // DESPUÉS: Optimizar antes de subir
  const optimizedFile = await this.optimizeImage(file, {
    maxWidth: 1200,
    maxHeight: 900,
    quality: 0.85,
    format: 'webp' // Cambiar a WebP
  });

  const extension = 'webp'; // Forzar WebP
  const filePath = `${userId}/${carId}/${uuidv4()}.${extension}`;

  // Resto del código igual...
}

private async optimizeImage(file: File, options: ImageOptimizeOptions): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    img.onload = () => {
      // Calcular dimensiones manteniendo aspect ratio
      let width = img.width;
      let height = img.height;

      if (width > options.maxWidth) {
        height = (height * options.maxWidth) / width;
        width = options.maxWidth;
      }

      if (height > options.maxHeight) {
        width = (width * options.maxHeight) / height;
        height = options.maxHeight;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: 'image/webp' }));
          } else {
            reject(new Error('Failed to optimize image'));
          }
        },
        'image/webp',
        options.quality
      );
    };

    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
```

**B. Lazy loading de imágenes**

```html
<!-- apps/web/src/app/shared/components/car-card/car-card.component.html -->

<!-- ANTES -->
<img [src]="car.photo_url" alt="{{car.make}} {{car.model}}">

<!-- DESPUÉS -->
<img
  [src]="car.photo_url"
  alt="{{car.make}} {{car.model}}"
  loading="lazy"
  decoding="async"
  width="400"
  height="300">
```

**C. Usar NgOptimizedImage (Angular 17)**

```typescript
// apps/web/src/app/shared/components/car-card/car-card.component.ts
import { NgOptimizedImage } from '@angular/common';

@Component({
  imports: [CommonModule, NgOptimizedImage],
  // ...
})
```

```html
<!-- apps/web/src/app/shared/components/car-card/car-card.component.html -->
<img
  [ngSrc]="car.photo_url"
  alt="{{car.make}} {{car.model}}"
  width="400"
  height="300"
  priority="false"> <!-- Solo true en hero images -->
```

**Impacto esperado:** LCP 2.9s → 1.8s, Savings ~1.5 MB

---

### 2. **ALTO: Performance - JavaScript** 📦
**Impacto:** Savings de 281 KiB + reducir execution time 6.2s → 3s
**Métricas afectadas:** TBT, Main-thread work

#### Problema:
- Unused JavaScript: 281 KiB
- JavaScript execution time: 6.2s
- Main-thread work: 9.1s

#### Solución:

**A. Lazy load Mapbox (chunk más grande: 1.61 MB)**

```typescript
// apps/web/src/app/shared/components/cars-map/cars-map.component.ts

// ANTES: Import directo
import mapboxgl from 'mapbox-gl';

// DESPUÉS: Import dinámico
private async loadMapbox() {
  const mapboxgl = await import('mapbox-gl');
  this.initMap(mapboxgl.default);
}

ngOnInit() {
  // Solo cargar Mapbox si el mapa es visible
  if (this.isMapVisible) {
    this.loadMapbox();
  }
}
```

**B. Code splitting agresivo**

```typescript
// apps/web/src/app/app.routes.ts

// ANTES
{
  path: 'cars',
  loadComponent: () => import('./features/cars/list/cars-list.page')
}

// DESPUÉS - Split mapa en chunk separado
{
  path: 'cars',
  loadComponent: () => import('./features/cars/list/cars-list.page'),
  children: [
    {
      path: 'map',
      loadComponent: () => import('./shared/components/cars-map/cars-map.component')
    }
  ]
}
```

**C. Tree shaking de Supabase**

```typescript
// apps/web/src/app/core/services/supabase-client.service.ts

// ANTES
import { createClient } from '@supabase/supabase-js';

// DESPUÉS - Import solo lo necesario
import { SupabaseClient } from '@supabase/supabase-js/dist/module/SupabaseClient';
import { createClient } from '@supabase/supabase-js/dist/module/lib/fetch';
```

**Impacto esperado:** JS execution 6.2s → 3.5s, Bundle -280 KB

---

### 3. **MEDIO: Accessibility - Forms y Botones** ♿
**Impacto:** Score 74 → 90+
**Métricas afectadas:** A11y score

#### Problema:
- Botones sin nombres accesibles
- Form elements sin labels
- Contraste insuficiente
- Touch targets pequeños

#### Solución:

**A. Agregar labels a todos los forms**

```html
<!-- apps/web/src/app/shared/components/city-select/city-select.component.html -->

<!-- ANTES -->
<input
  type="text"
  [(ngModel)]="searchTerm"
  placeholder="Buscar ciudad">

<!-- DESPUÉS -->
<label for="city-search" class="sr-only">Buscar ciudad</label>
<input
  id="city-search"
  type="text"
  [(ngModel)]="searchTerm"
  placeholder="Buscar ciudad"
  aria-label="Buscar ciudad">
```

**B. Agregar aria-labels a botones de iconos**

```html
<!-- apps/web/src/app/shared/components/wallet-balance-card/wallet-balance-card.component.html -->

<!-- ANTES -->
<button (click)="loadBalance()">
  <svg>...</svg>
</button>

<!-- DESPUÉS -->
<button
  (click)="loadBalance()"
  aria-label="Refrescar balance de wallet">
  <svg aria-hidden="true">...</svg>
</button>
```

**C. Aumentar touch targets (mínimo 48x48px)**

```css
/* apps/web/src/styles.css */

/* Asegurar touch targets adecuados */
button,
a,
.clickable {
  min-height: 48px;
  min-width: 48px;
  padding: 12px;
}

/* Para iconos pequeños, aumentar área clickeable */
.icon-button {
  padding: 16px;
  min-width: 48px;
  min-height: 48px;
}
```

**D. Mejorar contraste de colores**

```typescript
// apps/web/tailwind.config.js

module.exports = {
  theme: {
    extend: {
      colors: {
        // ANTES: Colores con bajo contraste
        'gray-light': '#e5e5e5',

        // DESPUÉS: Colores con contraste WCAG AA
        'gray-light': '#d4d4d4', // Ratio 4.5:1 mínimo
      }
    }
  }
}
```

**Impacto esperado:** A11y 74 → 92

---

### 4. **BAJO: SEO - robots.txt** 🤖
**Impacto:** Arreglar 35 errores
**Métricas afectadas:** SEO score

#### Problema:
- robots.txt inválido o inexistente

#### Solución:

```bash
# apps/web/public/robots.txt

# Crear archivo robots.txt
cat > public/robots.txt << 'EOF'
# robots.txt para AutoRenta

User-agent: *
Allow: /

# Permitir todo menos páginas privadas
Disallow: /admin/
Disallow: /wallet/
Disallow: /bookings/

# Sitemap
Sitemap: https://autorenta-web.pages.dev/sitemap.xml
EOF
```

**Impacto esperado:** SEO score N/A → 100

---

### 5. **BAJO: Best Practices - Security Headers** 🔒
**Impacto:** Score 92 → 100
**Métricas afectadas:** Security

#### Problema:
- No hay CSP header
- No hay X-Frame-Options
- Third-party cookies

#### Solución:

**Cloudflare Pages Headers**

```bash
# apps/web/public/_headers

/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(self), microphone=(), camera=()
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://api.mapbox.com; style-src 'self' 'unsafe-inline' https://api.mapbox.com; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https://obxvffplochgeiclibng.supabase.co https://api.mapbox.com; frame-src 'self' https://www.mercadopago.com;
```

**Impacto esperado:** Best Practices 92 → 100

---

## 📊 Resumen de Mejoras Esperadas

| Métrica | Actual | Objetivo | Mejora |
|---------|--------|----------|--------|
| **Performance** | 83 | 90+ | +7 |
| **FCP** | 1.5s | <1.5s | ✅ |
| **LCP** | 2.9s | <2.5s | -0.4s |
| **TBT** | Error | <200ms | ✅ |
| **Speed Index** | 4.3s | <3.4s | -0.9s |
| **JS Size** | 703 KB | 420 KB | -283 KB |
| **Network Payload** | 3,822 KB | 2,300 KB | -1,522 KB |
| **Accessibility** | 74 | 92 | +18 |
| **Best Practices** | 92 | 100 | +8 |
| **SEO** | Error | 100 | ✅ |

---

## 🎯 Plan de Implementación (Priorizado)

### Fase 1: Quick Wins (1-2 horas) 🚀

**Prioridad CRÍTICA:**

1. ✅ Agregar `loading="lazy"` a todas las imágenes de cars
2. ✅ Crear `robots.txt`
3. ✅ Crear `_headers` con security headers
4. ✅ Agregar `aria-label` a botones de iconos
5. ✅ Agregar labels a forms

**Comandos:**

```bash
cd apps/web

# 1. Buscar todas las imágenes sin lazy loading
grep -r '<img' src/ | grep -v 'loading="lazy"'

# 2. Crear robots.txt
cat > public/robots.txt << 'EOF'
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /wallet/
Disallow: /bookings/
Sitemap: https://autorenta-web.pages.dev/sitemap.xml
EOF

# 3. Crear _headers
cat > public/_headers << 'EOF'
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://api.mapbox.com; img-src 'self' data: https: blob:;
EOF

# 4. Build y deploy
npm run build
npm run deploy:pages
```

**Impacto esperado:** Performance +3, A11y +10, SEO ✅

---

### Fase 2: Optimización de Imágenes (2-4 horas) 📸

**Prioridad ALTA:**

1. Implementar función `optimizeImage()` en `CarsService`
2. Migrar a NgOptimizedImage en `CarCardComponent`
3. Configurar responsive images con srcset
4. Convertir imágenes existentes a WebP

**Impacto esperado:** Performance +4, LCP -1s

---

### Fase 3: Code Splitting (3-5 horas) 📦

**Prioridad MEDIA:**

1. Lazy load Mapbox dinámicamente
2. Split mapa en chunk separado
3. Tree shaking de Supabase
4. Analizar bundle con webpack-bundle-analyzer

**Impacto esperado:** Performance +3, JS -280 KB

---

### Fase 4: Accessibility Completa (2-3 horas) ♿

**Prioridad MEDIA:**

1. Audit completo con aXe DevTools
2. Aumentar touch targets
3. Mejorar contraste de colores
4. Agregar skip links
5. Keyboard navigation testing

**Impacto esperado:** A11y +8

---

## 🧪 Testing

**Después de cada fase:**

```bash
# 1. Build local
npm run build

# 2. Servir localmente
npx http-server dist/web/browser -p 8080

# 3. Lighthouse CLI
npx lighthouse http://localhost:8080 \
  --view \
  --output=html \
  --output-path=./lighthouse-report.html

# 4. Comparar scores
```

---

## 📈 Métricas de Éxito

**Objetivos finales:**

- ✅ Performance: 90+
- ✅ LCP: <2.5s
- ✅ FCP: <1.5s
- ✅ TBT: <200ms
- ✅ CLS: <0.1 (ya cumplido: 0)
- ✅ Accessibility: 90+
- ✅ Best Practices: 100
- ✅ SEO: 100

---

## 🚀 ¿Qué Hacer AHORA?

**Recomendación:** Empezar con Fase 1 (Quick Wins)

```bash
cd /home/edu/autorenta/apps/web

# 1. Crear robots.txt
cat > public/robots.txt << 'EOF'
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /wallet/
Disallow: /bookings/
Sitemap: https://autorenta-web.pages.dev/sitemap.xml
EOF

# 2. Crear _headers
cat > public/_headers << 'EOF'
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
EOF

# 3. Build y deploy
npm run build
npm run deploy:pages
```

**Tiempo estimado:** 10 minutos
**Impacto:** SEO 100, Best Practices +5

---

**¿Quieres que implemente alguna de estas fases ahora?**
