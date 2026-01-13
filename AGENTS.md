# 🤖 AGENTS.md: Reglas de Comportamiento y Desarrollo para IA

> **Manual de Operaciones para Agentes Autónomos en Autorenta**
> Este archivo define las leyes inquebrantables, convenciones y flujos de trabajo que todo agente de IA debe seguir al interactuar con este repositorio.

---

## 1. Convenciones Técnicas (Non-Negotiable)

*   **Gestor de Paquetes:** Usa `pnpm` para todo: `pnpm install`, `pnpm add`, `pnpm dev`, `pnpm build`. **NUNCA** uses `npm` ni `yarn`.
*   **Lenguaje:** TypeScript es obligatorio en modo estricto.
*   **Framework:** Angular 18+ (Standalone Components).
*   **Estilos:** Tailwind CSS es la única solución de estilos. No uses SCSS puro salvo para configuración global.
*   **Iconos:** Usa el componente `<app-icon name="...">` (wrapper interno). Evita importar SVGs o librerías de iconos directamente en los componentes.
*   **Sintaxis:** Preferir sintaxis moderna de Angular (`@if`, `@for`, `@defer`) y ES2022+.

---

## 2. Creación y Estructura de Componentes

*   **Scaffolding:** Si hay que crear un componente nuevo, usa el patrón Standalone.
    *   No crees módulos (`NgModule`) a menos que sea estrictamente necesario para compatibilidad legacy.
*   **Organización:**
    *   Componentes pequeños con una sola responsabilidad (principio SRP).
    *   **Features:** `apps/web/src/app/features/<feature>/...`
    *   **Shared:** `apps/web/src/app/shared/components/...` (Solo si se usa en 2+ features).
    *   **Core:** `apps/web/src/app/core/...` (Servicios singleton, modelos, guards).
*   **Inyección de Dependencias:** Usa la función `inject()` en lugar de la inyección por constructor.
    ```typescript
    // ✅ Correcto
    private authService = inject(AuthService);
    
    // ❌ Evitar
    constructor(private authService: AuthService) {}
    ```

---

## 3. Reglas de TypeScript y Estado

*   **Tipado Estricto:**
    *   Evita `any` y `unknown` a toda costa.
    *   Si los tipos no están claros, detente y analiza los modelos en `core/models/` o `types/database.types.ts`.
    *   Prefiere inferencia cuando sea obvio, pero sé explícito en límites públicos (API responses, @Input).
*   **Reactividad:**
    *   Usa **Signals** (`signal`, `computed`, `effect`) para el estado local y derivado.
    *   Usa **RxJS** (`Observable`, `pipe`) solo para flujos asíncronos complejos o eventos del DOM.
    *   Convierte Observables a Signals con `toSignal` en la vista.

---

## 4. UI y Estilos (Tailwind + Ionic)

*   **Mobile-First:** Diseña pensando en pantallas táctiles y pequeñas.
*   **No Duplicar:** Si un conjunto de clases se repite 3 veces, extrae un componente o usa `@apply` con moderación en `styles.css`.
*   **Legibilidad:** Prioriza clases de Tailwind legibles frente a trucos oscuros.
*   **Accesibilidad (a11y):**
    *   No es opcional. Usa HTML semántico.
    *   Asegura `aria-label` en botones que solo tienen iconos.
    *   Gestiona el foco correctamente en modales y paneles laterales.

---

## 5. Testing y Calidad

*   **Validación Continua:** No se acepta código con errores de tipos, lint o tests fallidos.
*   **Comandos de Prueba:**
    *   Unitarios (Vitest): `pnpm test:unit` o `pnpm vitest run -t "<nombre>"`
    *   E2E (Playwright): `pnpm test:e2e`
*   **Linting:** Tras mover archivos o refactorizar, ejecuta `pnpm lint`.
*   **Cobertura:** Si cambias lógica de negocio (especialmente precios o pagos), añade o actualiza el test correspondiente en `*.spec.ts`.

---

## 6. Rendimiento y Arquitectura

*   **Medir antes de Optimizar:** No adivines cuellos de botella.
*   **Lazy Loading:** Todas las rutas de features deben cargarse perezosamente con `loadComponent` o `loadChildren`.
*   **Detección de Cambios:** Usa `ChangeDetectionStrategy.OnPush` en **todos** los componentes nuevos.
*   **Validación Progresiva:** Valida cambios en pequeño antes de escalar a toda la app.

---

## 7. Commits y Pull Requests

*   **Convencional:** Usa Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`).
*   **Verificación Pre-Commit:**
    1.  `pnpm lint` (Sin errores)
    2.  `pnpm test:unit` (Verdes)
    3.  `pnpm build:web` (Compila correctamente)
*   **Claridad:** Explica qué ha cambiado y por qué. Si introduces una nueva dependencia, justifícala.

---

## 8. Comportamiento del Agente

*   **Claridad ante todo:** Si una petición es ambigua ("arregla el bug"), pide detalles concretos (logs, pasos de reproducción) antes de ejecutar.
*   **Acción Directa:** Tareas simples y bien definidas ejecútalas directamente.
*   **Confirmación:** Cambios complejos (refactor masivo, migración de base de datos) requieren plan y confirmación del usuario.
*   **Contexto:** No asumas requisitos implícitos. Lee la documentación en `docs/` antes de asumir cómo funciona el sistema de pagos o reservas.
*   **Autonomía general ante dificultades (intentar antes de preguntar):** Frente a cualquier bloqueo o problema, primero investiga y prueba caminos razonables dentro del repo y el entorno local. Solo después de agotar opciones, informa el resultado y solicita ayuda si es imprescindible. No pidas rutas al usuario: búscalas tú.
    *   **Descubrimiento de rutas y archivos:** usa búsquedas (`rg`, `find`) y lectura de estructura (`ls`, `tree`) para localizar lo necesario.
    *   **Revisión de documentación:** lee `README.md`, `docs/`, `CHANGELOG.md`, `MIGRATION_GUIDE_TO_POOL.md`, `SUPABASE_ACCESS.md` y archivos guía existentes.
    *   **Revisión de configuración:** inspecciona `package.json`, `pnpm-workspace.yaml`, `tsconfig*.json`, `ionic.config.json`, `capacitor.config.js`, `supabase/config.toml` si existe.
    *   **Evidencia explícita:** al fallar, enumera qué revisaste, qué intentaste y por qué no funcionó, antes de pedir datos adicionales.
*   **Autonomía con credenciales (no detenerse de inmediato):** Si un problema parece de credenciales, primero investiga y agota las fuentes locales antes de concluir que faltan.
    *   **Buscar en archivos de entorno:** `.env`, `.env.*`, `.env.local`, `.env.development`, `.env.production`, `.env.example`, `.envrc`.
    *   **Buscar en código/config local:** `apps/**/src/environments/`, `supabase/**`, `tools/`, `scripts/`, `mcp_config.json`, `mcp/`, `mcp-server/`, `workers/`, `deploy/`.
    *   **Buscar en docs y setup:** `README.md`, `docs/`, `SUPABASE_ACCESS.md`, `MIGRATION_GUIDE_TO_POOL.md`.
    *   **Buscar en CI/CD:** revisar `.github/workflows` para nombres de `secrets.*` y variables de entorno esperadas.
    *   **Buscar en configuración del proyecto:** `package.json` (scripts), `pnpm-workspace.yaml`, `ionic.config.json`, `capacitor.config.js`, `supabase/config.toml` si existe.
    *   **Aclaración obligatoria:** Los GitHub Secrets no son accesibles desde el repo; deben verificarse en la UI de GitHub. Indicar explícitamente que se buscó en el repo y no se encontraron credenciales.
    *   **Resultado:** Si no existen, reportar que faltan y enumerar dónde se buscó.

---

**© 2026 Autorenta AI Operations**
