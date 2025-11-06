# 📱 Guía de Responsive Design centrada en iPhone (iOS)

Documento para QA/Desarrollo que detalla cómo responde la interfaz de AutoRenta en dispositivos iOS, qué breakpoints usamos y qué componentes requieren atención especial.

---

## 1. Breakpoints y tokens relevantes

| Alias Tailwind | px | Dispositivos objetivo | Referencias en código |
|----------------|----|------------------------|-----------------------|
| `sm` | 640px | iPhone 13/14 en modo portrait (≈390 CSS px @2x) | `@media (min-width: 640px)` en múltiples componentes (`apps/web/src/app/features/bookings/checkout/checkout.page.css:37`) |
| `md` | 768px | iPad mini / iPhone landscape | Pocos usos directos, se privilegia `sm` vs `lg` |
| `lg` | 1024px | iPad landscape / desktop | `CarsListPage` cambia layout map/list (`apps/web/src/app/features/cars/list/cars-list.page.css:15`) |
| `xl` | 1280px | Desktop amplio | Fuertemente usado en dashboards admin |

Además definimos `:root` custom properties en `styles.css` para `--header-height`, etc. Deben recalcularse en mobile cuando el header se contrae (`apps/web/src/app/app.component.css`).

---

## 2. Layouts críticos en iPhone

### 2.1 Listado de autos (`CarsListPage`)
- En **desktop**: grid 2 columnas (mapa + listado). En iPhone (`<lg`) el layout se apila.
- Carrusel “Cercanos y económicos” se vuelve un scroll horizontal bajo el mapa (`apps/web/src/app/features/cars/list/cars-list.page.html:96`).
- Riesgo: carrusel + filtros ocupan gran parte del viewport inicial; CTA de tarjetas premium requiere scroll extra.
- **QA**: verificar en iPhone 13/14 Safari que el carrusel no tape los filtros, y que `map-controls` sean tocables (`apps/web/src/app/features/cars/list/cars-list.page.css:40`).

### 2.2 Detalle de auto (`CarDetailPage`)
- Galería usa `object-fit: cover` y `aspect-ratio` controlado via CSS; en iPhone se limita a 320px de alto (`apps/web/src/app/features/cars/detail/car-detail.page.css`).
- Se detecta iOS para abrir navegación con `maps://` (`apps/web/src/app/features/cars/detail/car-detail.page.ts:345`).
- F&Qs, tabla de specs colapsables; en `sm` se convierten en acordeones (ver `car-detail.page.css`).

### 2.3 Checkout / Pago (`BookingDetailPaymentPage`)
- Layout columnar con bloques (resumen, cobertura, métodos). En `sm` se utiliza `flex-direction: column` (`apps/web/src/app/features/bookings/booking-detail-payment/booking-detail-payment.page.css`).
- Botón CTA sticky al final (`position: sticky; bottom: 16px`) con `env(safe-area-inset-bottom)` para notch.
- Safari iOS maneja `position: sticky` diferente, revisar `z-index` para evitar que overlays (ej. modales) queden ocultos.

### 2.4 Wallet & Dashboard
- `WalletPage`: se colapsa a tarjetas 100% ancho; las tablas se convierten en listas (`apps/web/src/app/features/wallet/wallet.page.css:68`).
- Admin dashboards no están optimizados para iPhone; se recomienda restringir acceso en mobile (ya existe flag en `AdminGuard`).

---

## 3. Controles y componentes sensibles

| Componente | Comportamiento en iPhone | Archivo |
|------------|-------------------------|---------|
| **Mapa (Mapbox GL)** | Mapbox en Safari iOS dispara warning `mapbox-gl` CommonJS. Pinch zoom funcional, pero `ResizeObserver disconnected` aparece al rotar (`chunk-FUU3KMDH.js`). | `apps/web/src/app/shared/components/cars-map/cars-map.component.ts` |
| **Carrusel económico** | `overflow-x: auto; scroll-snap` (CSS). En iOS, el rebote puede mostrar fondo; se aplica `-webkit-overflow-scrolling: touch`. | `apps/web/src/app/features/cars/list/cars-list.page.css:90` |
| **Formularios (input/keyboard)** | Safari en iPhone ajusta viewport al abrir teclado, desplazando contenido. Uso de `viewport-fit=cover` + `safe-area`. Revisar `TermsAndConsentsComponent` con listas largas. | `apps/web/src/app/features/bookings/booking-detail-payment/components/terms-and-consents.component.ts` |
| **Modales (Bottom sheet)** | `app-bottom-sheet` usa `position: fixed`. En iOS Safari, `100dvh` vs `100vh` difieren; se recomienda usar `height: 100dvh`. | `apps/web/src/app/shared/components/bottom-sheet/bottom-sheet.component.css` |
| **Botones CTA sticky** | Se respetan `env(safe-area-inset-bottom)`. En iPhone con notch, el padding inferior evita que el CTA quede tapado. | `apps/web/src/app/features/bookings/booking-detail-payment/booking-detail-payment.page.css` |
| **Header/Nav** | Usa `backdrop-filter` (no soportado en versiones antiguas iOS < 15). Degradado: se mantiene legible (`apps/web/src/app/shared/components/navbar/navbar.component.css`). |

---

## 4. Safe areas y notch

- `index.html` define `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>` para usar toda el área (`apps/web/src/index.html:6`).
- Estilos base aplican `padding-bottom: env(safe-area-inset-bottom)` en contenedores con CTA (`apps/web/src/styles.css`).
- Para vistas críticas en iPhone con home indicator (X, 11+, 13+), asegurarse que `padding-bottom` incluya `env(...)` principalmente en modales y footers.

---

## 5. Recomendaciones de QA específica iPhone

1. **Dispositivos objetivo**: iPhone 12/13/14 (390×844), iPhone SE (375×667), iPhone 14 Pro (393×852 @ 3x con Dynamic Island).
2. **Escenarios claves**:
   - Carrusel económico + filtros (scroll vertical/horizontal simultáneo).
   - Opening keyboard en formularios (Terms consent, datos tarjeta).
   - Mapbox interactions (pinch/rotate) y cambio a landscape.
   - CTA sticky en Checkout y Wallet (sin que tape contenido).
   - Notificaciones/Modales (ver si cubren safe area).
3. **Herramientas**: Safari Responsive Design Mode, BrowserStack, dispositivo físico.
4. **Bugs conocidos**:
   - `ResizeObserver disconnected` log al cerrar modales → no rompe flujo pero ensucia consola.
   - `mapbox-gl` CommonJS warning (sin impacto, pero aparece en build logs).
   - Tour guiado (Shepherd) superpone overlays en notch, recomendación desactivarlo en mobile hasta reescritura.

---

## 6. Mejores prácticas a aplicar

- Usar `@media (hover: none) and (pointer: coarse)` para controles táctiles (botones más grandes). Algunos componentes aún dependen de hover (ej. tarjetas premium).
- Reemplazar alturas fijas por `min-height` + `100dvh` donde sea posible (modales, full-screen overlays).
- Revisar tamaños de fuente en iOS: Safari respeta `text-size-adjust`. Asegurar `html { -webkit-text-size-adjust: 100%; }` (ya aplicado en `styles.css`).
- Evitar unidad `vh` pura en secciones críticas; Safari reduce `vh` al abrir teclado. Preferir `min-height: calc(100dvh - header)`. | `cars-list.page.css:20` usa `height: calc(100dvh - var(--header-height))`.
- Probar `scroll-behavior: smooth` con anclas (Safari iOS < 15 no soporta). Fallback: no crítico.

---

## 7. Próximos pasos sugeridos

1. Agregar suite de `cy.viewport('iphone-13')` (o Playwright `iPhone 14`) para validar componentes clave.
2. Documentar patrones reutilizables (carousels, sticky CTA) en Storybook con knobs para breakpoints.
3. Considerar media queries específicas `@supports (-webkit-touch-callout: none)` para ajustes iOS.
4. Auditar `app_start.log` cuando se abre en iPhone real para capturar warnings específicos de WebKit.

---

## 8. Patrones de código reutilizables

### 8.1 Hook personalizado para detección de dispositivo

```typescript
// useDeviceDetection.ts
import { useMediaQuery } from './useMediaQuery';

export function useDeviceDetection() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTouch = useMediaQuery('(pointer: coarse)');
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  
  return { isMobile, isTouch, prefersReducedMotion };
}
```

### 8.2 CSS con safe areas

```css
.sticky-cta {
  position: sticky;
  bottom: 16px;
  padding-bottom: max(16px, env(safe-area-inset-bottom));
  z-index: 100;
}
```

### 8.3 Tipografía fluida con clamp

```css
h1 {
  font-size: clamp(1.5rem, 4vw + 1rem, 3rem);
}

p {
  font-size: clamp(0.875rem, 2vw + 0.5rem, 1.125rem);
}
```

---

## 9. Checklist de QA para iPhone

- [ ] **Layout**: Carrusel económico scroll horizontal funciona sin glitches
- [ ] **Layout**: Mapa + filtros no se superponen en portrait
- [ ] **Layout**: CTA sticky visible y tocable (no tapada por notch/home indicator)
- [ ] **Formularios**: Teclado no oculta inputs activos
- [ ] **Formularios**: Scroll automático al enfocar input
- [ ] **Navegación**: Transiciones respetan `prefers-reduced-motion`
- [ ] **Imágenes**: Galería carga correctamente con lazy loading
- [ ] **Imágenes**: `object-fit: cover` mantiene aspect ratio
- [ ] **Modales**: Bottom sheets cubren viewport completo (100dvh)
- [ ] **Modales**: Cierre por swipe-down funciona suavemente
- [ ] **Performance**: Time to Interactive < 3s en 4G
- [ ] **Performance**: No layout shifts (CLS < 0.1)
- [ ] **Touch**: Botones mínimo 44×44px (WCAG touch target)
- [ ] **Touch**: No hover states persistentes
- [ ] **Safari**: Backdrop-filter degradado correctamente
- [ ] **Safari**: Position sticky funciona en scroll

Última actualización: 25/10/2024.
