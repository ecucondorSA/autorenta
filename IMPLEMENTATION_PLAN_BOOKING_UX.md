# 💎 Plan Maestro: Experiencia de Reserva Premium (USD & UX)

> **Objetivo:** Transformar `cars/list` y el inicio del flujo de reserva en una experiencia de clase mundial, operando nativamente en USD, con una interfaz "Dark Ivory" pulida y transiciones fluidas.

## 1. Diagnóstico y Estrategia

### Estado Actual
- **Arquitectura:** Split View (Lista/Mapa) correcta.
- **Tecnología:** Angular Signals + Standalone Components (¡Bien!).
- **Puntos Débiles:**
  - Lógica de conversión de moneda mezclada en la vista (`CarCard`).
  - Posible fricción al iniciar reserva (navegación completa vs. preview).
  - Estilos visuales necesitan unificación bajo el tema "Dark Ivory".

### Estrategia "Senior Architect"
1.  **USD First:** Normalizar precios a nivel de datos antes de la vista.
2.  **UI Premium:** Rediseñar `CarCard` para que parezca una tarjeta de crédito premium (negro mate, tipografía nítida, fotos inmersivas).
3.  **Flujo Sin Fricción:** Implementar "Quick View" (Bottom Sheet) real antes de la navegación.

---

## 2. Fases de Implementación

### Fase 1: La Tarjeta Perfecta (`CarCardComponent`)
*El componente más importante de la lista.*
- [ ] **Refactor Visual:** Eliminar ruido visual. Enfocarse en: Foto, Modelo, Precio (USD) y Rating.
- [ ] **Specs:** Mostrar iconos minimalistas para transmisión/pasajeros.
- [ ] **Pricing:** Mostrar precio diario en USD grande y claro.
- [ ] **Interacción:** Efecto 'Tilt' sutil o 'Scale' al hacer hover/touch.

### Fase 2: El Listado Fluido (`BrowseCarsPage`)
*El contenedor de la experiencia.*
- [ ] **Skeleton Loading:** Reemplazar spinners con esqueletos que imiten la tarjeta final.
- [ ] **Virtual Scroll:** Asegurar rendimiento si la lista crece (>50 autos).
- [ ] **Filtros Intuitivos:** Chips horizontales (Precio, Tipo, Transmisión) sticky en el top.

### Fase 3: "Quick Book" (Interacción)
*El puente entre ver y comprar.*
- [ ] **Bottom Sheet Mejorado:** Al hacer clic en un auto, abrir un sheet que muestre:
  - Desglose rápido de precio (Total estimativo).
  - Disponibilidad inmediata.
  - Botón "Reservar Ahora" (CTA principal).

### Fase 4: Estandarización de Moneda
- [ ] **Pipe de Precio:** Crear o verificar `CurrencyService` para asegurar que el usuario siempre vea USD, manejando la conversión internamente de forma transparente.

---

## 3. Instrucciones Técnicas

### Archivos Afectados
1.  `apps/web/src/app/shared/components/car-card/car-card.component.ts` (y HTML/CSS)
2.  `apps/web/src/app/features/cars/browse/browse-cars.page.ts`
3.  `apps/web/src/app/features/cars/browse/browse-cars.page.html` (o template inline)

### Convenciones
- **Colores:**
  - Fondo: `#000000` o `#09090b` (Zinc 950)
  - Tarjetas: `#18181b` (Zinc 900) con borde sutil `#27272a` (Zinc 800)
  - Acento: `#f5f5f4` (Stone 100 - "Ivory")
- **Tipografía:** Sans-serif moderna, pesos variados para jerarquía.

---

## 4. Validación (Definition of Done)
- [ ] El usuario ve precios en USD.
- [ ] La lista se siente "nativa" (scroll suave, imágenes optimizadas).
- [ ] Iniciar una reserva toma 1 click para ver detalles, 2 para confirmar intención.
