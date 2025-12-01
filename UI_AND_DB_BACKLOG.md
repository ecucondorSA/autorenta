# Backlog de Funcionalidades Pendientes (UI y BD)

Este documento detalla las funcionalidades identificadas durante la auditoría del proyecto Autorenta que aún no tienen una implementación completa en la Interfaz de Usuario (UI) o requieren mejoras/creación en la Base de Datos (BD).

---

## 1. Módulo de Administración: Visor de Logs de Pagos (MercadoPago Webhooks)

*   **Descripción:** Existe la tabla `mp_webhook_logs` en la BD que registra todos los eventos de los webhooks de MercadoPago. Esta tabla es crucial para la depuración y auditoría de pagos, pero actualmente no hay una interfaz visual para consultarla.
*   **GAP:** UI Faltante.
*   **Funcionalidad Deseada:**
    *   Una página en el panel de administración (`/admin/logs/mercadopago`) para listar y filtrar los logs.
    *   Posibilidad de ver el payload completo de cada evento.
    *   Filtros por `event_type`, `resource_id`, `status`, rango de fechas.
*   **Justificación:** Herramienta esencial para el equipo de soporte y desarrolladores para diagnosticar problemas de pagos y reconciliación.

---

## 2. Módulo de Contabilidad (Accounting)

*   **Descripción:** La base de datos contiene un sistema de contabilidad robusto con tablas como `accounting_accounts`, `accounting_ledger`, `accounting_journal_entries`, etc. Esto permite llevar un registro financiero detallado del negocio.
*   **GAP:** UI Faltante (posiblemente).
*   **Funcionalidad Deseada:**
    *   Dashboards de contabilidad (`/admin/accounting/dashboard`).
    *   Vistas para el Plan de Cuentas (Chart of Accounts).
    *   Generación de reportes financieros (Balance Sheet, Income Statement).
    *   Funcionalidad para cerrar periodos contables.
*   **Justificación:** Convertir la inteligencia contable de la BD en una herramienta operativa para la gestión financiera de la plataforma. (Prioridad media si ya existen herramientas externas de exportación/análisis).

---

## 3. Módulo de KYC: Mejora de Flujo y Subida de DNI

*   **Descripción:** Implementamos la subida de licencia de conducir, pero el flujo completo de verificación puede requerir más.
*   **GAP:** UI Parcial (DNI faltante, feedback de estado mejorable).
*   **Funcionalidad Deseada:**
    *   Integrar subida de **DNI (Documento Nacional de Identidad)** en la `ProfileVerificationPage`.
    *   Mostrar el estado actual de la verificación (PENDIENTE, VERIFICADO, RECHAZADO) directamente en la UI.
    *   Proveer feedback claro si una verificación es `RECHAZADA` (usando el campo `notes` de `user_verifications`).
    *   Posibilidad de reintentar la subida o contactar a soporte si hay un problema.
*   **Justificación:** Optimizar la experiencia del usuario para completar su perfil y cumplir con las regulaciones de identidad.

---

## 4. Módulo de Flotas/Organizaciones: Expansión de UI

*   **Descripción:** Creamos el dashboard de organizaciones, pero es un punto de partida.
*   **GAP:** UI Básico.
*   **Funcionalidad Deseada:**
    *   Página de detalle de la organización (`/admin/organizations/:id`).
    *   CRUD para gestionar miembros de la organización (invitar, cambiar rol, eliminar).
    *   Listado de vehículos asociados a una organización.
    *   Edición de datos de la organización (tax_id, logo, website).
*   **Justificación:** Permitir a los administradores de flotas gestionar sus recursos y personal de manera efectiva desde la plataforma.

---

## 5. Módulo de Disputas: Detalle Completo y Gestión de Evidencia

*   **Descripción:** Se creó la página de detalle, pero necesita ser más rica.
*   **GAP:** UI Básica.
*   **Funcionalidad Deseada:**
    *   Visualizar todas las evidencias subidas (`dispute_evidence`) con miniaturas si son imágenes.
    *   Historial de comentarios o acciones sobre la disputa (si se implementa un sistema de comentarios).
    *   Mostrar información del `opened_by` y `resolved_by`.
*   **Justificación:** Dar al equipo de soporte y a las partes involucradas una visión completa de la disputa.

---

## 6. Módulo de Precios y Promociones: Panel de Administración

*   **Descripción:** Se integró el cupón en el checkout, pero la creación y gestión de promociones aún no tiene UI.
*   **GAP:** UI Faltante (Admin).
*   **Funcionalidad Deseada:**
    *   Página en el panel de administración (`/admin/pricing/promotions`) para crear, editar, activar/desactivar códigos de promoción.
    *   Establecer porcentajes/montos de descuento, fechas de validez y límites de uso.
*   **Justificación:** Permitir al equipo de marketing y administración lanzar campañas promocionales sin intervención manual en BD.

---

Este backlog te servirá como una hoja de ruta para futuras sesiones de desarrollo.
