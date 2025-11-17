# Instrucciones para Codex: Plan de Responsive Design — AutoRenta

Resumen
-------
Este documento contiene las instrucciones paso a paso que Codex debe ejecutar para aplicar el plan de responsive design a la plataforma AutoRenta.

Notas de seguridad
------------------
- Estas instrucciones asumen que el CLI/IDE de Codex se ejecuta con el perfil `autorenta-autonomous` que permite ejecución amplia. Este perfil es peligroso: revisa las acciones antes de aprobar.
- No incluir ni escribir claves secretas (API keys, service-role keys) en archivos del repo.

Criterios de aceptación (por tarea)
-----------------------------------
- Cambios únicamente en CSS/HTML/TS de componentes UI y archivos de configuración (tailwind). No tocar código backend o secrets.
- Cada cambio debe incluir tests básicos o notas de QA (Playwright snapshot o instrucciones para testear manualmente).
- No introducir dependencias nuevas a menos que estén justificadas en el comentario del commit.

Tareas ordenadas (ejecutar en el mismo orden)
---------------------------------------------
1) Infra base (ya parcialmente aplicada)
   - Verificar `apps/web/tailwind.config.js` contiene breakpoints y container.
   - Verificar existencia de `apps/web/src/styles/responsive-tokens.css`.
   - Si falta, crear los archivos o corregir imports.
   Acceptance: ambos archivos presentes y compilables.

2) Importar tokens en el global stylesheet
   - Editar el archivo de estilos global de la app (posible rutas: `apps/web/src/styles.css`, `apps/web/src/main.css`, `apps/web/src/styles/index.css`).
   - Añadir al inicio: `@import './styles/responsive-tokens.css';` (ajustar la ruta relativa si hace falta).
   Acceptance: build dev se inicia sin errores CSS.

3) Navbar responsive
   - Localizar componente `navbar` (buscar `navbar`, `header` en `apps/web/src/app/**`).
   - Implementar: hamburger menu en `md` y menor (usar `sm:hidden md:flex` patterns), `aria-*` attributes, ensure focus trap on open menu.
   - Desktop: full menu inline; Mobile: collapsible drawer.
   Acceptance: manual QA steps: viewport 390x844 -> menu visible as hamburger; 1366x768 -> full menu.

4) Car Card adaptativa
   - Editar `apps/web/src/app/shared/components/car-card/car-card.component.html` y `.css`:
     - Añadir class `cq-card` a root element para container queries.
     - Usar Tailwind responsive grid classes: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` en list views.
     - Mobile: show condensed info, collapsed meta.
   Acceptance: snapshots mobile/desktop show layout differences.

5) Listings / Grid
   - Actualizar listing pages (ej. `features/cars` o `pages/listings`) para usar responsive grid utilities y lazy-loading de imágenes.
   Acceptance: Listing muestra 1 col mobile, 2 col tablet, 3+ col desktop.

6) Booking flow (calendario y pago)
   - Reorganizar layout: stacked on mobile, two-column on desktop. Use `flex-col lg:flex-row`.
   Acceptance: booking page usable end-to-end in mobile viewport; CTA visible.

7) Tests y snapshots
   - Añadir 3 Playwright snapshots: Listing mobile (390x844), Listing tablet (768x1024), Listing desktop (1366x768).
   - Añadir accessibility assertions: buttons have accessible names, focus order.

8) Documentación
   - Crear `docs/RESPONSIVE.md` con guía de patrones, tokens y ejemplos de classes a usar.

9) PR checklist (para cada PR generada por Codex)
   - Incluir cambios en un único componente (salvo infra).
   - Agregar notas de QA y comandos para correr tests.

Comandos sugeridos para validar localmente (ejecutados por el desarrollador)
-----------------------------------------------------------------------------
# Instalar dependencias
pnpm install

# Iniciar dev (web + worker mock)
pnpm run dev:web

# Ejecutar tests / snapshots (playwright)
npx playwright test --project=chromium --config=playwright.config.ts

Cómo lanzar Codex localmente con estas instrucciones
---------------------------------------------------
1) Desde la CLI (ejemplo):

codex --profile autorenta-autonomous --config experimental_instructions_file="apps/web/CODEX_INSTRUCTIONS.md"

Explicación: esto carga el archivo experimental de instrucciones; Codex con el perfil `autorenta-autonomous` podrá ejecutar comandos/edits. Revisa y aprueba cada paso si tu approval_policy lo solicita.

2) Desde la extensión IDE:
- Abrir la extensión Codex → Gear → Codex Settings → Open config.toml y confirmar `profile = "autorenta-autonomous"` y `experimental_instructions_file` si lo deseas.
- Abrir el archivo `apps/web/CODEX_INSTRUCTIONS.md` y pedir a la extensión que "Run instructions" (según UI de la extensión).

Notas finales
-------------
- Yo (el asistente) puedo aplicar parches directamente en el repo si me indicas qué tareas quieres que haga ahora (por ejemplo, importar tokens en el stylesheet, o modificar `car-card` y `navbar`).
- Si quieres que Codex ejecute todo de manera autónoma, **ejecuta** el comando CLI anterior en tu máquina. Revisa aperturas de seguridad y ten tu shell preparado para aprobar o abortar pasos.
