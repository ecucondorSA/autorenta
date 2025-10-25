# 🧭 Reescritura del Sistema de Tour Guiado como Servicio

## 1. Contexto actual

- El tour se maneja desde `TourService` con lógica monolítica (router hooks, timeouts, waits, instanciación Shepherd) `apps/web/src/app/core/services/tour.service.ts:28`.
- Se inicializa automáticamente en múltiples puntos (ej. `AppComponent.initializeWelcomeTour()` y `CarsListPage.ngOnInit()`) sin coordinación central `apps/web/src/app/app.component.ts:240`, `apps/web/src/app/features/cars/list/cars-list.page.ts:368`.
- El servicio fuerza `setTimeout` + polling de selectores. Cuando los nodos no están disponibles, Shepherd lanza excepciones (`Timeout waiting for selector: [data-tour-step="guided-search"]`), visibles en consola y en Analytics de errores.
- No existe una capa declarativa de configuración; cada tour se arma hardcodeando pasos y selectores en codebase `apps/web/src/app/core/services/tour.service.ts:116`.
- No hay awareness de layout/responsive; el carrusel económico y el mapa pueden desplazar elementos fuera de viewport provocando que los selectores definidos no estén donde Shepherd espera.
- Persistencia: se gestiona con `localStorage` clave por tour pero no hay expiración elegante ni telemetry centralizada `apps/web/src/app/core/services/tour.service.ts:152`.

## 2. Objetivos de la reescritura

1. **Separar responsabilidades** en un servicio modular, orientado a eventos, con API declarativa.
2. **Evitar timeouts ciegos**, privilegiando un sistema de espera reactivo (MutationObserver, IntersectionObserver, Angular Signals/Observables).
3. **Configurar tours como data**, permitiendo almacenar definiciones en JSON/DB o feature flags.
4. **Soportar responsive / cambios de layout**, con reglas por breakpoint.
5. **Telemetry centralizada**: inyectar tracking standar para start/step/complete y errores.
6. **Control de concurrencia**: garantizar que solo un tour activo corra a la vez, con queue y prioridades.
7. **API amigable** para módulos (ej. `HelpButton`, `AppComponent`, páginas) para solicitar tours sin replicar lógica.

## 3. Alcance y no-objetivos

### Alcance
- Reemplazar la clase `TourService` por un paquete `GuidedTour` con capas bien definidas.
- Migrar tours existentes: Welcome, GuidedBooking, Renter, Owner, CarDetail.
- Introducir contratos para tours configurables (ej. JSON, Supabase table en futuro cercano).
- Añadir telemetría y resiliencia (retry, fallback de pasos inexistentes).

### Fuera de alcance
- Cambiar librería de rendering de tours (Shepherd sigue siendo la base en esta fase).
- Diseñar nuevos tours/UX (el equipo de producto proveerá contenido).
- Soporte offline / SSR (los tours seguirán siendo client-only).

## 4. Arquitectura propuesta

### 4.1 Capas
1. **TourRegistry** – Contiene las definiciones (`TourDefinition`) en formato declarativo (id, pasos, triggers, guardas). Carga inicial en memoria y exponer API `getDefinition(id)`.
2. **TourOrchestratorService** – Control de estado global: cola, locking, listeners de router, persistencia (storage + TTL). Implementa `requestTour(options)` y resuelve colisiones entre tours solicitados en paralelo.
3. **StepResolver** – Recibe `StepDefinition` y garantiza elementos disponibles (observa DOM, optional `waitForCondition`). Dispara fallback si el elemento no aparece (skip o reintento configurable).
4. **RendererAdapter** – Wrapper independiente de Shepherd. Abstrae creación/ destrucción y permite testear sin la librería (adapter con interface `start()`, `addStep()`, `complete()`).
5. **TelemetryBridge** – Interface para emitir eventos (`tour_started`, `tour_step_shown`, `tour_error`, `tour_completed`) hacia Analytics central (mismo mecanismo que `trackAnalytics` en `CarsListPage` `apps/web/src/app/features/cars/list/cars-list.page.ts:100`).

### 4.2 Modelo de datos (conceptual)

```ts
interface TourDefinition {
  id: TourId;
  priority?: number;           // Mayor = más urgente
  autoStart?: boolean;         // true => se inicia con trigger runtime
  throttleHours?: number;      // TTL para no repetir
  steps: StepDefinition[];
  triggers?: TourTrigger[];    // Router, evento, manual
  guards?: TourGuard[];        // Condiciones (ej. inventory >= 6)
}

type StepTarget = {
  selector: string;
  required?: boolean;          // Si false se puede saltar
  altSelectors?: string[];     // Para responsive/variaciones
};

interface StepDefinition {
  id: TourStepId;
  content: TourContent;        // Texto, rich content ID o i18n key
  position?: 'top'|'bottom'|'left'|'right'|'center';
  target?: StepTarget;
  onBefore?: StepHook;         // Async/Observable hook (ej. expand panel)
  onAfter?: StepHook;
  analytics?: AnalyticsPayload;
  responsive?: Partial<Record<'desktop'|'tablet'|'mobile', StepTarget>>;
}
```

### 4.3 Ciclo de vida
1. Módulo solicita tour `GuidedTour.request({ id: TourId.GuidedBooking, reason: 'cars-list' })`.
2. `TourOrchestrator` evalúa guardas (ej. inventario premium) y throttle (referencia `localStorage` clave `autorenta:tour:guided-booking`).
3. Si no hay tour activo, obtiene definición del registry; si hay, lo encola según prioridad.
4. Por cada paso, `StepResolver` espera target (MutationObserver + timer de seguridad). Si no aparece y `required` es false, salta con log; si es true, aborta con analytics y fallback (mostrar tip general, notificar al módulo).
5. `RendererAdapter` (Shepherd) muestra el paso; telemetry se emite (`tour_step_shown` con metadata).
6. Al finalizar/completar/dismiss, el orchestrator actualiza storage (TTL) y procesa la cola.

### 4.4 Integración con UI existente
- `HelpButtonComponent` pasa a llamar `GuidedTour.request` con `mode: 'user-triggered'` y sin auto-start `apps/web/src/app/shared/components/help-button/help-button.component.ts:103`.
- `CarsListPage` deberá emitir evento `InventoryReady` cuando premium/economy estén calculados; el orchestrator escuchará vía `GuidedTourEvents` para disparar pasos que dependan de `data-tour-step="guided-search"`.
- `AppComponent` solo registrará `autoStart` tours según definición (`Welcome` se marca `autoStart: true` con guard `isHomePage`).

## 5. Migración y plan de trabajo

1. **Fase 0 – Preparación**
   - Crear carpeta `apps/web/src/app/core/guided-tour/` con módulos descritos.
   - Redactar contrato TypeScript para definiciones y exponer `GuidedTourService`.
   - Añadir utilidades Observables (`waitForElement$`, `waitForRoute$`).

2. **Fase 1 – Infraestructura**
   - Implementar `TourRegistry` con definiciones actuales (pueden mantenerse en código inicialmente).
   - Crear `RendererAdapter` con tests unitarios (mock de Shepherd) para validar que se respete API.
   - Implementar `TourOrchestrator` con cola FIFO + prioridad, guardas y persistencia (storage + TTL).

3. **Fase 2 – Migración de tours existentes**
   - Migrar Welcome (más simple) → validación de autoStart + throttle.
   - Migrar GuidedBooking introduciendo `InventoryReady` como trigger / guard.
   - Migrar Renter/Owner/CarDetail.
   - Reemplazar llamadas directas por nueva API en `AppComponent`, `CarsListPage`, `HelpButton`.

4. **Fase 3 – Telemetry & QA**
   - Enlazar con sistema de analytics (`window.dispatchEvent` actual u otra capa) para tours.
   - Agregar logs estructurados en `TelemetryBridge`.
   - Tests manuales en desktop/mobile; asegurarse que fallback de selectores funciona.

5. **Fase 4 – Limpieza**
   - Eliminar viejo `TourService` y helpers redundantes.
   - Documentar uso del nuevo servicio en `docs` o `README` interno.

## 6. Sugerencias adicionales

- Considerar definir `TourDefinition` en Supabase (tabla `guided_tours`) para habilitar toggles/experimentos sin desplegar código.
- Incluir modo “dry-run” en dev (`GuidedTourService.enableDebugOverlay()`) que muestre por qué se saltó un step.
- Utilizar Angular Signals o RxJS `Computed` para exponer estado del tour (activo, paso actual) y permitir que componentes cambien UI cuando el tour está en progreso (ej. bloquear scroll).
- Exponer un hook `onTourStateChange` para integrar con QA automatizado (Playwright e2e pueden esperar `tour_completed`).
- Añadir verificación de accesibilidad (foco, tab order) en cada paso. El adapter puede forzar `focus()` en el elemento target cuando sea posible.

## 7. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Seletores inestables (DOM dinamico) | Usar `StepTarget.altSelectors` + guards basados en eventos de componente y no solo en CSS.| 
| Shepherd sigue siendo dependencia externa | Encapsular completamente detrás de `RendererAdapter` para poder swappear a otra librería en el futuro. |
| Tours en conflicto (usuario abre tour manual durante autoStart) | `TourOrchestrator` maneja prioridades y notifica al usuario cuando se encola uno manual. |
| Rendimiento en móviles (observadores permanentes) | Registrar observers sólo cuando haya tour solicitado; liberar en `complete/cancel`. |
| Persistencia inconsistente | Guardar `tourHistory` (hash `tourId + version + locale`) para invalidar TTL automáticamente tras cambios de contenido. |

---
**Próximo paso inmediato**: crear la carpeta `core/guided-tour` e implementar interfaz de definiciones + orchestrator skeleton. Luego migrar Welcome tour como MVP para validar la arquitectura antes de mover los tours complejos.
