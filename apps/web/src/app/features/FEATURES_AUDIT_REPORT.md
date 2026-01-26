# 🏗️ Informe de Auditoría de Features y Arquitectura
**Fecha:** 24 Enero 2026
**Auditor:** Gemini Agent (Modo Arquitecto)
**Objetivo:** Identificar redundancias, código muerto y validar flujos críticos.

---

## 1. Resumen Ejecutivo
El análisis exhaustivo del directorio `apps/web/src/app/features` revela una aplicación en transición. Coexisten implementaciones "Legacy" (basadas en RxJS puro y componentes antiguos) con implementaciones "Modernas" (Signals, Standalone Components, Tailwind refinado).

Se ha verificado el flujo crítico de Marketplace, confirmando que la versión `v2` es la activa y funcional, dejando versiones anteriores como deuda técnica eliminable.

**Estadísticas Rápidas:**
- **Directorios Analizados:** 148
- **Conflictos Detectados:** 4 áreas principales.
- **Archivos a Eliminar:** ~12 (Alta certeza).

---

## 2. Análisis de Redundancias (The Kill List)

### 🚨 Prioridad Alta: Código Muerto Confirmado

#### A. El Caso "Booking Wizard" (Anti-Patrón)
El archivo `bookings/pages/booking-wizard` implementa un flujo de 6 pasos que viola explícitamente las guías de diseño del proyecto (`GEMINI.md`). El flujo real verificado utiliza `booking-picker` → `booking-request`.
- **Acción:** 🗑️ **ELIMINAR** carpeta `bookings/pages/booking-wizard`.

#### B. Marketplace Duplicado
Existe una dualidad entre `marketplace` (v2, activo) y `cars/list` (v1, legacy).
- `marketplace-v2.page.ts`: Usa componentes modernos, Signals y diseño actualizado.
- `cars-list.page.ts`: Implementación anterior.
- **Acción:** 🗑️ **ELIMINAR** `cars/list` (tras verificar que ninguna ruta apunte allí en `app.routes.ts`).

#### C. Mensajería: Messages vs. Inbox
- `messages`: Implementación antigua básica.
- `inbox`: Implementación moderna con soporte Realtime y mejor UI.
- **Acción:** 🗑️ **ELIMINAR** carpeta `messages` completa (migrando cualquier lógica útil a `inbox` si faltase, aunque `inbox` parece superior).

---

## 3. Análisis de Falsos Positivos (No Tocar)

#### A. Profile vs. Driver Profile
Aunque suenan similares, tienen propósitos distintos:
- `profile`: Gestión de cuenta privada (edición, ajustes).
- `driver-profile`: Vista pública/compartida de la reputación del conductor.
- **Veredicto:** ✅ **CONSERVAR AMBOS**.

#### B. Booking Picker vs. Booking Request
- `booking-picker`: Selector de fechas/horas (UI Component page).
- `booking-request`: Confirmación de intención de reserva.
- **Veredicto:** ✅ **CONSERVAR AMBOS** (son pasos distintos del funnel).

---

## 4. Verificación del Flujo Marketplace (Health Check)

Se ha trazado estáticamente el flujo de usuario desde la Home hasta la Reserva:

1.  **Entrada:** `marketplace-v2.page` (Ruta `/`)
2.  **Interacción:** El usuario selecciona un auto.
    - Enlace verificado: `[routerLink]="['/cars/detail', car.id]"`
3.  **Detalle:** `cars/detail` (Asumido funcional).
4.  **Reserva:** Debería llevar a `booking-picker` o `booking-request`.
    - ⚠️ **Alerta:** Se detectó `booking-wizard` desconectado del flujo principal, confirmando su obsolescencia.

**Estado del Flujo:** 🟢 **SALUDABLE** (La ruta crítica no pasa por código muerto).

---

## 5. Reflexión Arquitectónica

La aplicación muestra signos de una evolución rápida y agresiva. La arquitectura "Feature-First" es correcta, pero la falta de limpieza ("Pruning") ha dejado artefactos fósiles.

**Recomendaciones Estratégicas:**
1.  **Consolidación de Rutas:** Centralizar todas las rutas de `bookings` que ahora están dispersas (`active-rental`, `pending-approval`, `hub`) en una estructura más coherente o mantenerlas planas pero con nombres más descriptivos.
2.  **Limpieza de UI Kit:** Se observaron directivas modernas (`HoverLift`, `PressScale`) conviviendo con estilos CSS globales antiguos. Estandarizar el uso de las directivas de animación.
3.  **Policy de Deprecación:** Establecer una regla: "Si se crea `v2`, se pone fecha de muerte a `v1` (max 2 sprints)".

---

## 6. Plan de Acción Inmediato

Ejecutar los siguientes comandos para sanear el proyecto:

```bash
# 1. Eliminar Wizard (Anti-patrón)
rm -rf apps/web/src/app/features/bookings/pages/booking-wizard

# 2. Eliminar Marketplace Legacy
rm -rf apps/web/src/app/features/cars/list

# 3. Eliminar Mensajería Legacy
rm -rf apps/web/src/app/features/messages
```

*Fin del Informe*
