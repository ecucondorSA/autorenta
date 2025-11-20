# Workflow de Desarrollo de Features (Anti-Deuda Técnica)

Este documento define el "Golden Path" para desarrollar nuevas funcionalidades en AutoRenta. Seguir este orden garantiza estabilidad, reduce la deuda técnica y asegura que la calidad esté integrada desde el principio.

## 🏆 Filosofía: "Calidad por Diseño"

La deuda técnica se genera cuando saltamos pasos (ej. codear UI sin tener el esquema de DB listo) o cuando posponemos la calidad (ej. "hago los tests luego"). Este workflow invierte eso: **construimos sobre cimientos sólidos**.

---

## 1. Fase de Diseño (Spec) 📝
*Antes de escribir una sola línea de código.*

1.  **Definir Requerimientos**: ¿Qué problema resuelve? ¿Quién lo usa?
2.  **Modelo de Datos**: Diseñar las tablas y relaciones en papel/diagrama.
3.  **Seguridad (RLS)**: Definir quién puede ver/editar qué. (Ej. "¿Un usuario puede ver las reservas de otro? No").
4.  **UI Mockup**: Un boceto rápido de qué componentes se necesitan.

---

## 2. Fase de Cimientos (Database) 🗄️
*La base de datos es la fuente de la verdad.*

1.  **Crear Migración SQL**:
    ```bash
    supabase migration new add_my_feature
    ```
2.  **Escribir SQL**:
    *   Tablas (`CREATE TABLE`)
    *   Índices (`CREATE INDEX`)
    *   **Row Level Security (RLS)**: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`. **Obligatorio**.
3.  **Aplicar Localmente**:
    ```bash
    supabase db reset # O supabase migration up
    ```
4.  **Generar Tipos TypeScript**:
    *   Esto es CRÍTICO para evitar errores de tipo en el frontend.
    ```bash
    npm run sync:types
    ```

---

## 3. Fase de Lógica (Core & TDD) 🧠
*Implementar la lógica de negocio sin preocuparse por la UI.*

1.  **Edge Functions / RPCs** (Si es lógica compleja):
    *   Escribir la función en PL/pgSQL o Deno.
    *   Crear un test SQL para verificarla.
2.  **Angular Service**:
    *   Crear el servicio: `ng g s features/my-feature/services/my-feature`
    *   Implementar métodos usando el cliente Supabase tipado.
3.  **Unit Tests (TDD)**:
    *   Escribir el test `.spec.ts` *antes* o *junto* con el código.
    *   Verificar que el servicio maneja errores correctamente.

---

## 4. Fase de UI (Frontend) 🎨
*Ahora que los datos y la lógica existen, la UI es fácil.*

1.  **Componentes**:
    *   Usar componentes Standalone.
    *   Separar lógica (Service) de presentación (Component).
2.  **Integración**:
    *   Conectar el componente al servicio.
    *   Manejar estados de carga (`loading`, `error`, `success`).
3.  **Validación Visual**:
    *   Verificar que se ve bien en móvil y desktop.

---

## 5. Fase de Verificación (E2E) 🛡️
*La prueba de fuego.*

1.  **Crear Test E2E**:
    *   Crear archivo en `tests/my-feature.spec.ts`.
    *   Simular el flujo completo del usuario (Click -> Request -> DB Update -> UI Update).
2.  **Ejecutar Test**:
    ```bash
    npm run test:e2e -- tests/my-feature.spec.ts
    ```
3.  **Validar**:
    *   El test debe pasar consistentemente (no ser "flaky").

---

## 6. Fase de Merge (Review) ✅

1.  **Lint & Format**:
    ```bash
    npm run lint:fix
    ```
2.  **Commit**:
    *   Mensajes claros (Conventional Commits): `feat: add booking cancellation`.
3.  **Pull Request**:
    *   Verificar que CI pase (Tests + Build).

---

## Resumen del Orden Ideal

1.  **SQL** (Tablas + RLS)
2.  **Types** (`npm run sync:types`)
3.  **Service** (Lógica + Unit Tests)
4.  **Component** (UI)
5.  **E2E** (Playwright)

*Si sigues este orden, es casi imposible generar deuda técnica grave, porque el sistema te obliga a definir la estructura antes de construir la fachada.*
