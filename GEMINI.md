# 🤖 GEMINI.md: Instrucciones Específicas para Gemini

> **Este documento es la referencia de identidad y comportamiento para el modelo Gemini en el proyecto Autorenta.**

## 1. Convenciones Técnicas
- **Gestión de paquetes:** Usa `pnpm` para todo: `pnpm install`, `pnpm add`, `pnpm dev`, `pnpm build`.
- **TypeScript:** Es obligatorio y en modo estricto. Evita `any` y `unknown`.
- **Estilos:** Usa siempre Tailwind CSS. No dupliques clases; si es necesario, crea un componente.
- **Iconos:** Usa el componente `<app-icon>`. Importación explícita, nunca barrels.
- **Sintaxis:** ESM y sintaxis moderna de Angular (`@if`, `@for`, `inject()`).

## 2. Creación de Proyectos y Componentes
- **Framework:** Angular 18+ (Standalone Components).
- **Comando de creación:** `ng generate component path/to/component --standalone`.
- **Configuración:** TypeScript en modo estricto desde el inicio.
- **Dependencias:** No añadir librerías hasta que sean estrictamente necesarias. Verifica `package.json` antes de sugerir instalaciones.
- **Optimización Entorno:**
  - Inicializar entorno: `./tools/setup/configure-antigravity.sh` (Tabula Rasa + Low Spec Tuning).
  - Desarrollo rápido: `pnpm dev:fast` (Desactiva SourceMaps y AOT para velocidad).

## 3. Organización y Arquitectura
- **Componentes:** Pequeños, con una sola responsabilidad (SRP).
- **Composición:** Preferir composición frente a configuraciones complejas.
- **Abstracción:** Evita abstracciones prematuras.
- **Carpetas:**
  - `src/app/core/`: Servicios singleton, guards, modelos globales.
  - `src/app/features/`: Módulos funcionales (Pages y Components).
  - `src/app/shared/`: UI Kit y componentes reusables.
  - `src/app/utils/`: Funciones puras y constantes.

## 4. Reglas de TypeScript y Estado
- **Cero 'any':** Si los tipos no están claros, detente y analiza antes de continuar.
- **Inferencia:** Preferir siempre que se pueda inferencia de tipos.
- **Signals:** Usa Angular Signals (`signal`, `computed`) para el estado reactivo local.
- **RxJS:** Solo para flujos asíncronos complejos o integración con Supabase Realtime.

## 5. UI y Estilos
- **Tailwind:** Única solución de estilos permitida.
- **Legibilidad:** Priorizar legibilidad frente a micro-optimizaciones visuales.
- **Accesibilidad (a11y):** HTML semántico, roles ARIA y gestión de foco obligatorios.

## 6. Testing y Calidad
- **CI/CD:** Revisa siempre los workflows en `.github/workflows`.
- **Ejecución:**
  - Unitarios: `pnpm test:unit`
  - E2E: `pnpm test:e2e`
- **Vitest:** Para tests unitarios rápidos.
- **Linting:** Ejecuta `pnpm lint` tras mover archivos o cambiar imports. No se acepta código con errores de tipos.
- **Proactividad:** Añade o actualiza tests cuando cambies el comportamiento de un servicio o componente.

## 7. Rendimiento
- **Medición:** No adivines rendimiento; usa métricas si algo parece lento.
- **Lazy Loading:** Obligatorio para todas las rutas principales (`loadComponent`).
- **Optimization:** Validar primero en pequeño antes de escalar cambios masivos.

## 8. Commits y Flujo
- **Formato:** Conventional Commits (`feat:`, `fix:`, `chore:`).
- **PRs:** Pequeños y enfocados.
- **Validación pre-commit:** Ejecutar lint y tests locales.

## 9. Comportamiento del Agente
- **Claridad:** Si la petición es ambigua, haz preguntas concretas antes de actuar.
- **Acción Directa:** Tareas simples se ejecutan directamente.
- **Confirmación:** Cambios complejos (refactors, migraciones de BD) requieren confirmar entendimiento y presentar un plan.
- **Contexto:** No asumas requisitos implícitos. Lee los `docs/` antes de actuar.

---
**© 2026 Autorenta | Gemini Agent Config**