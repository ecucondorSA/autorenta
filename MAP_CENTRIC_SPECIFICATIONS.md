# Map-Centric Page Specifications

## Overview

Implementación de página map-centric para AutoRenta que maximiza conversión desde el mapa, enfocando la experiencia en P2P seguro sin tarjeta obligatoria.

**Fecha**: 2025-11-08
**Versión**: 1.0
**Status**: En implementación

---

## Objetivos UX/Negocio

### Primario
- **Maximizar conversión**: CTA visible siempre (sticky-cta-mobile, urgent-rental-banner) y embudos cortos (simple-checkout)
- **Navegabilidad clara**: Base gris cálido + acentos azul petróleo solo para estados activos/CTA
- **Seguridad sin tarjeta**: Resaltar wallet-balance-card, payment-method-buttons y opciones cashless flexibles
- **100% map-centric**: Mapa ancho completo, lista flotante, filtros contextuales

### Secundario
- Transmitir confianza P2P mediante badges y verificación visual
- Reducir fricción en checkout (2-3 pasos máximo)
- Soporte in-map sin abandonar la experiencia
- Accesibilidad de Chat + WhatsApp para negociación pre-pago

---

## Arquitectura de Página

### 1. Barra Superior Fija (pwa-titlebar)
```
┌─────────────────────────────────────────┐
│ [Logo] [Status Online/Offline] [Publica tu auto CTA] │
└─────────────────────────────────────────┘
```
- **Componente**: `pwa-titlebar` (apps/web/src/app/shared/components/pwa-titlebar)
- **Responsable de**: Estado de conexión, CTA principal, logo
- **Estilo**: Base gris cálido (#f5f3f0 / smoke-light) + azul petróleo (#2c4a52) en CTA
- **Persistencia**: Siempre visible, z-index 100

### 2. Región Principal (Split Layout - Desktop)
```
┌─────────────────────────────────────────────────────────┐
│  Mapa (70%)        │  Drawer (30%)                      │
│  - cars-map        │  - car-card extendida              │
│  - user-location   │  - social-proof-indicators         │
│  - map-filters     │  - booking-chat                    │
│  overlay (móvil)   │  - simple-checkout integrado       │
└─────────────────────────────────────────────────────────┘
```

#### 2.1 Mapa Izquierdo (70% Desktop, 100% Mobile)
- **Componente principal**: `cars-map`
- **Estilo**: Mapbox light style (neutral, sin branding abrumador)
- **Markers**:
  - Círculo simple (#2c7a7b petróleo con blanco border) + precio corto
  - Hover: Escala 1.15 + tooltip dinámico con 150ms delay
  - Selected: Halo pulse animation + tooltip permanente
  - Disponibilidad inmediata: Color diferente (#10b981 verde)
- **User Location**: Círculo doble + halo pulse animado, copy "Estás aquí – verifica autos cerca"
- **Zoom/Navigation**: Controles Mapbox estándar (top-right)

#### 2.2 Drawer Derecho (30% Desktop, Full Width Mobile on Tab 2)
**Mobile**: Tab 2 en `mobile-bottom-nav`

**Contenido (stacked)**:
1. **car-card extendida** (no bordes fuertes)
   - Foto principal (aspect 16:9)
   - Distance badge (colorizado)
   - Título + ubicación
   - Review summary + rating stars
   - User badges (verificación, respuesta rápida)

2. **social-proof-indicators**
   - # de reseñas, promedio rating
   - Badges de confianza

3. **booking-chat** (opcional, collapsed por defecto)
   - Permite mensaje rápido antes de pagar
   - Toggle: "¿Preguntar algo al anfitrión?"

4. **simple-checkout** (sticky al scrollear)
   - Monto pre-cargado
   - 2-step flow:
     - Step 1: Seleccionar método pago (radio buttons)
     - Step 2: Confirmar (CTA "Reservar sin tarjeta")
   - Métodos priorizados:
     1. Wallet + balance (si disponible)
     2. Transferencia bancaria
     3. Efectivo/Billetera
     4. Tarjeta (al final)

---

## Flujo de Conversión End-to-End

### Paso 1: Geolocalización (Al cargar)
```
Usuario permite ubicación → Marker personalizado en mapa
Si no permite → City selector + location-picker fallback
```
- Service: `location.service`
- UI Feedback: Toast ("Ubicación detectada")

### Paso 2: Filtros Persistentes
```
Sobre el mapa (chips flotantes):
┌────────────────────────────────────────┐
│ [📅 Fechas] [💰 Precio] [🚙 Tipo]     │
│ (cada uno abre modal interactivo)      │
└────────────────────────────────────────┘
```
- **Componentes**: date-range-picker, price-range-slider, type-selector
- **Estado**: Guardado en sessionStorage o component signal
- **Feedback**: Mapa se actualiza en tiempo real con chips activos

### Paso 3: Interacción Marker
```
Usuario hovera marker:
  → Tooltip custom (MapCardTooltipComponent)
    ├─ Foto comprimida (88x66px)
    ├─ Precio dinámico (dynamic-price-display)
    ├─ Rating + badges
    └─ CTA "Ver detalles rápidos"

Usuario clicks marker:
  → Marker anima con halo
  → Drawer se abre/actualiza con car-card
  → Mapa flyTo car location (zoom 14, 1000ms)
```

### Paso 4: Drawer se Abre
```
Desktop: Slide-in from right (300px width, shadow)
Mobile: Bottom sheet / tab 2 en navigation

Contenido:
├─ car-card extendida
├─ social-proof-indicators
├─ booking-chat (toggle)
└─ simple-checkout (sticky)
```

### Paso 5: Checkout Modal
```
User selecciona método pago:
  [✓] Wallet + balance (si aplica)
  [ ] Transferencia bancaria
  [ ] Efectivo/Billetera
  [ ] Tarjeta de crédito

→ CTA "Reservar sin tarjeta"
→ Confirmation modal
```

### Paso 6: Post-Reserva
```
notification-toast: "Reserva en proceso"
mobile-bottom-nav badge: "1 reserva pendiente"
Oferta: booking-chat + share-button
```

---

## Componentes Clave & Personalizaciones

### 1. cars-map.component.ts
**Status**: ✅ Existe, necesita mejoras
**Cambios requeridos**:
- ✅ MapCardTooltipComponent ya integrado
- ⚠️ Mejorar `groupCarsByAvailability()` para filtrar por fecha/precio
- ⚠️ Agregar método `updateFilters(filters: FilterState)` para actualizar markers en tiempo real
- ✅ User location marker ya implementado

### 2. map-card-tooltip.component.ts
**Status**: ✅ Existe
**Personalización requerida**:
- Agregar `onReserveClick()` para disparo de checkout
- Integrar `urgent-rental-badge` si aplica
- Mejorar `isVerified()` computed signal para integración real

### 3. map-filters.component.ts
**Status**: ❌ **CREAR NUEVO**
**Responsabilidad**:
- Chips flotantes sobre mapa (desktop top-left, mobile under search)
- date-range-picker integrado
- price-range-slider
- vehicle-type selector
- Emit `filterChange` event
- Guardar estado en sessionStorage

**Inputs**:
- `userLocation?: { lat, lng }`
- `availableCars: CarMapLocation[]`

**Outputs**:
- `filterChange: EventEmitter<FilterState>`

**Interface**:
```typescript
interface FilterState {
  dateRange: { start: Date; end: Date } | null;
  priceRange: { min: number; max: number } | null;
  vehicleTypes: string[] | null;
  immediateOnly: boolean;
}
```

### 4. map-drawer.component.ts
**Status**: ❌ **CREAR NUEVO**
**Responsabilidad**:
- Contenedor del drawer derecho (desktop) / bottom-sheet (mobile)
- Gestiona state: car-card extendida, chat, checkout
- Split layout con sticky footer para checkout

**Inputs**:
- `selectedCar?: CarMapLocation`
- `userLocation?: { lat, lng }`

**Outputs**:
- `closeDrawer: EventEmitter<void>`
- `onReserveClick: EventEmitter<{ carId: string; paymentMethod: string }>`

**Estructura**:
```
┌──────────────────────────┐
│ car-card extendida       │ (scrollable)
├──────────────────────────┤
│ social-proof-indicators  │
├──────────────────────────┤
│ booking-chat (toggle)    │
├──────────────────────────┤
│ simple-checkout (sticky) │ (sticky footer)
└──────────────────────────┘
```

### 5. Refactorización: explore.page.ts
**Cambios necesarios**:
- Importar + integrar `map-filters.component`
- Integrar `map-drawer.component`
- Integrar `sticky-cta-mobile`
- Integrar `whatsapp-fab`
- Escuchar `filterChange` desde map-filters → actualizar `filteredCars` → pasar a cars-map
- Manejo de `selectedCar` state más robusto

---

## Estilos y Paleta

### Colores Base
- **Background neutral**: #f5f3f0 (smoke-light)
- **Text primary**: #141718 (smoke-black)
- **Text secondary**: #64646b (charcoal-medium)
- **Border/divider**: #e8e6e1 (pearl-gray)

### Acentos CTA
- **Activo/CTA**: #2c4a52 (accent-petrol)
- **Hover**: #1f3438 (accent-petrol oscuro)
- **Background positivo**: #10b981 (green-500 para disponibilidad)

### Sombras
- **Pequeña**: 0 2px 8px rgba(0,0,0,0.1)
- **Media**: 0 8px 24px rgba(0,0,0,0.15)
- **Grande**: 0 20px 40px rgba(0,0,0,0.2)

### Typography
- **Títulos (h3)**: 16px, font-semibold
- **Body**: 14px, font-regular
- **Small**: 12px, font-regular
- **xs**: 10px, font-regular

---

## Responsive Behavior

### Desktop (≥1024px)
- Mapa 70% izquierda, Drawer 30% derecha
- Filtros chips top-left sobre mapa
- Carousel DESHABILITADO

### Tablet (640px - 1023px)
- Mapa 60% izquierda, Drawer 40% derecha
- Bottom sheet opcional

### Mobile (<640px)
- Mapa 100%, drawer en sheet flotante
- Tab 2 en mobile-bottom-nav para drawer
- Filtros bajo searchbar (sticky)
- Full-screen sheet cuando drawer abierto

---

## Integración con Componentes Existentes

### sticky-cta-mobile
- **Ubicación**: Bottom-fixed en mobile (<640px)
- **Estado**: Vinculado a `selectedCar` ID
- **CTA**: "Rentar $XXX/día" → Abre drawer/tab 2
- **Desaparece**: Cuando checkout está activo

### whatsapp-fab
- **Ubicación**: Bottom-right (flotante)
- **Icono**: WhatsApp
- **Acción**: Abre chat directo con anfitrión
- **Integración**: Obtener número de anfitrión desde `selectedCar.ownerPhone`

### urgent-rental-banner
- **Ubicación**: Encima de car-card (si aplica)
- **Trigger**: Car tiene `immediateAvailability: true`
- **Copy**: "Disponible hoy mismo – Recoge ahora"

### simple-checkout
- **Ubicación**: Sticky footer en drawer
- **Integración**: Pre-cargado con monto de auto
- **Métodos**: Wallet → Transferencia → Efectivo → Tarjeta
- **Callback**: `onCheckoutComplete()` → navega a booking-success

---

## Optimizaciones de Conversión

### 1. Micro-copys que Resaltan P2P
```
❌ Evitar: "Pagar con tarjeta"
✅ Usar: "Reserva sin tarjeta – Transfiere o usa tu saldo"

❌ Evitar: "Depósito de seguridad"
✅ Usar: "Garantía temporal – Devuelto 7 días post-entrega"
```

### 2. Visual Hierarchy
- Precio prominente (xlarge, bold, petróleo)
- CTA siempre visible y contrastada
- Trust badges antes que detalles técnicos

### 3. Reduction de Pasos
- Pre-llenar monto y fechas desde mapa
- Método pago por defecto (Wallet si disponible)
- Skip confirmación si low-risk auto

### 4. Feedback Inmediato
- Marker anima al clickear
- Drawer slide suave
- Toast para cada acción (favorito, reserva, etc.)

---

## Performance Considerations

### Lazy Loading
- MapCardTooltip components creados on-demand (solo markers visibles)
- Drawer content lazy-loaded con `@defer`
- Chat component lazy-loaded

### Marker Clustering (Future)
- Si >100 cars en viewport, agrupar por zona
- Show cluster count + average price
- Expand cluster on click

### Caching
- Cache `filteredCars` en sessionStorage
- Cache user location por 10 minutos
- Cache filter state per session

---

## Testing Strategy

### Unit Tests
- MapCardTooltipComponent: distancia cálculo, inputs
- map-filters: estado filtrado, eventos
- map-drawer: state management, emitters

### E2E Tests (Playwright)
- User selecciona car → drawer abre
- Cambiar filtros → mapa actualiza
- Checkout flow: seleccionar método → confirmación
- Mobile: Tab switching drawer

### Accessibility
- ARIA labels en markers
- Keyboard nav: Tab entre cards/buttons
- Touch targets mínimo 44x44px

---

## Métricas de Éxito

1. **Conversion Rate**: X% de browse → reserve (vs. Y% current)
2. **Time to First Interaction**: <2s desde load
3. **Drawer Open Rate**: X% de map visits
4. **Checkout Completion**: Y% de abiertos completan
5. **Payment Method Distribution**: Z% sin tarjeta vs. con tarjeta

---

## Timeline & Phases

### Phase 1 (v1.0 - Current)
- ✅ Audit componentes existentes
- ⏳ Crear map-filters
- ⏳ Crear map-drawer
- ⏳ Refactorizar explore.page
- ⏳ Integrar sticky-cta + whatsapp-fab

### Phase 2 (v1.1 - Post-launch)
- Marker clustering
- Chat in-map
- Payment method analytics
- A/B testing copy variants

### Phase 3 (v2.0 - Future)
- Dynamic pricing visualization
- Availability calendar in-map
- Urgent rental heat map
- Social sharing integrations

---

## References

- **cars-map.component.ts**: L24, MapCardTooltipComponent integration
- **explore.page.ts**: L32, Cars map binding + filter state
- **simple-checkout.component.ts**: Reuse for drawer integration
- **payment-method-selector.component.ts**: Icons + styling para métodos

---

**Next Steps**: Iniciar Phase 1, empezando por map-filters.component
