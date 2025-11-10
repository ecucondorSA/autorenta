# Plano Detallado de Componentes — AutoRenta

**Fecha:** 2025-11-07  
**Objetivo:** Reordenar los componentes críticos (chat, datos, comunicación y flujo locatario ↔ locador) para que la experiencia completa se pueda evolucionar sin romper la cadena UI → Servicios → Supabase.

---

## 0. Resumen Ejecutivo

- **Comunicación unificada.** Formalizamos una capa `experiences/communication` que abstrae `BaseChatComponent` (`apps/web/src/app/shared/components/base-chat/base-chat.component.ts:1`) y sus wrappers (`booking-chat` y futuros `car-chat`), incorpora el indicador offline y conecta con `UnreadMessagesService` y `NotificationSoundService`.
- **Datos orquestados.** Los servicios que hoy viven planos en `core/services` (e.g. `MessagesService`, `BookingsService`, `RealtimeConnectionService`) se reorganizan en dominios (`communication`, `bookings`, `wallet`) con repositorios dedicados (`messages.repository.ts:1`) y fuentes únicas (views `my_bookings`, `owner_bookings` y tabla `messages`).
- **Flujo locador↔locatario trazable.** Encadenamos los estados documentados en `docs/prd/owner-flow-locador.md:1` con las pantallas Angular (`owner-bookings.page.ts:1`, `booking-detail`), los componentes de chat y los triggers de notificación (`supabase/migrations/20251027_trigger_chat_notifications.sql:1`).
- **Plan en 4 fases.** Empezamos por aislar el chat, seguimos con la capa de datos, luego alineamos los flujos y finalmente endurecemos observabilidad/métricas.

---

## 1. Mapa en Capas

```
┌──────────────────────────────────────────────┐
│ Experiencia (Angular standalone)             │
│ - features/*                                 │
│ - shared/components/*                        │
├──────────────────────────────────────────────┤
│ Servicios de Dominio (core/services)         │
│ - communication/: messages, realtime, offline│
│ - bookings/: bookings, approvals, timeline   │
│ - wallet/: payouts, balances, analytics      │
├──────────────────────────────────────────────┤
│ Repositorios + Vistas                        │
│ - core/repositories/messages.repository.ts   │
│ - Supabase views: my_bookings, owner_bookings│
│ - RPCs: create_booking_atomic, pricing_*     │
├──────────────────────────────────────────────┤
│ Datos & Señales de Sistema                   │
│ - tables: messages, notifications, cars      │
│ - triggers: notify_new_chat_message          │
│ - storage: offline IndexedDB queue           │
└──────────────────────────────────────────────┘
```

---

## 2. Capa de Comunicación (Chat + Contacto)

### 2.1 Componentes UI Reordenados

| Nuevo bloque | Componentes existentes | Acción |
|--------------|-----------------------|--------|
| `chat-shell` | `BaseChatComponent` (`apps/web/src/app/shared/components/base-chat/base-chat.component.ts:1`) | Extraer layout/estado compartido y exponer outputs tipados (`messageSent`, `typing`, `menu`). |
| `chat-context-wrappers` | `booking-chat.component.ts:1`, futuro `car-chat` | Convertirlos en funciones puras que construyen `ChatContext` y definen copy (subtitle, reglas de permisos). |
| `conversation-surfaces` | `owner-bookings` preview (`apps/web/src/app/features/bookings/owner-bookings/owner-bookings.page.ts:18-197`), `my-bookings` cards | Crear `ConversationBadgeComponent` para mostrar badges/unread y un `ConversationDrawerComponent` para abrir el chat sin salir del listado. |
| `contact-bridge` | `WhatsappFabComponent` (`apps/web/src/app/shared/components/whatsapp-fab/whatsapp-fab.component.ts:1`) | Moverlo al mismo paquete para centralizar fallback hacia WhatsApp y analíticas. |
| `offline/notification` widgets | `offline-messages-indicator`, `notification-toast` | Encadenarlos para que las alertas salgan del mismo módulo y consuman `OfflineMessagesService`. |

### 2.2 Servicios y Repositorios

- **MessagesService** (`apps/web/src/app/core/services/messages.service.ts:1-200`): quedará como fachada del dominio con tres responsabilidades claras: historial (`listByBooking`, `listByCar`), envío resiliente (`sendMessage` con IndexedDB) y suscripción (`subscribeToBooking`, `subscribeToCar`).  
- **RealtimeConnectionService** (`apps/web/src/app/core/services/realtime-connection.service.ts:1-120`) se vuelve interno al dominio `communication` para que otras features no creen canales duplicados.  
- **OfflineMessagesService** (`apps/web/src/app/core/services/offline-messages.service.ts:1-120`) expone `queue`, `retry` y `pendingCount` y se conecta a `OfflineMessagesIndicatorComponent`.  
- **UnreadMessagesService** (`apps/web/src/app/core/services/unread-messages.service.ts:1-120`) alimenta badges en `my-bookings`, `owner-bookings`, `tabs` y la futura `inbox`.  
- **MessagesRepository** (`apps/web/src/app/core/repositories/messages.repository.ts:1-140`): se mantiene como única capa que conoce joins (`profiles`, `cars`) y filtros; se amplía con métodos `listByUser`, `markAsRead`, `archive`.

### 2.3 Integraciones de Notificación

- **Trigger `notify_new_chat_message`** (`supabase/migrations/20251027_trigger_chat_notifications.sql:1-88`) ya inserta en `notifications`. El blueprint añade métricas (CTA click) y asegura que los metadatos incluyan `conversation_type` para abrir automáticamente booking o auto.  
- **WhatsApp fallback**: cuando `messages` esté caído o haya usuarios sin onboarding, `WhatsappFab` se muestra como acción secundaria alineada con el chat (mismo panel).  
- **Push + Email**: `UserNotificationsService` orquesta plantillas; se definen plantillas compartidas para `new_chat_message`.

### 2.4 Flujo de Mensajes (Secuencia)

1. Usuario abre `owner-bookings` o `booking-detail`; wrapper crea `ChatContext`.  
2. `chat-shell` inicializa `MessagesService.listByBooking` y suscribe en realtime.  
3. Cada `INSERT` en `messages` llega vía `RealtimeConnectionService`; se actualiza la señal `messages`.  
4. `UnreadMessagesService` escucha las mismas filas (filtro `recipient_id`) y actualiza `totalUnreadCount`, alimentando badges en tabs y dashboards.  
5. Si el receptor está offline, `notify_new_chat_message` dispara una notificación persistente y `WhatsappFab` permanece disponible como fallback.  
6. En caso de falla de red, `sendMessage` encola en IndexedDB y `OfflineMessagesService` vuelve a intentar cuando `navigator.onLine` cambie a `true`.

---

## 3. Capa de Datos y Orquestación

### 3.1 Mapa de Entidades

| Dominio | Fuente Supabase | Servicio Angular | Consumidores principales |
|---------|-----------------|------------------|-------------------------|
| Mensajería | `messages`, `notifications`, `profiles` | `MessagesService`, `UnreadMessagesService` | `BaseChat`, `OwnerBookings`, `MyBookings`, `tabs` |
| Reservas (locador) | Vista `owner_bookings` | `BookingsService.getOwnerBookings()` (`apps/web/src/app/core/services/bookings.service.ts:213-220`) | `OwnerBookingsPage`, `dashboard owner`, `wallet` |
| Reservas (locatario) | Vista `my_bookings` | `BookingsService.getMyBookings()` (`apps/web/src/app/core/services/bookings.service.ts:186-207`) | `MyBookingsPage`, `booking-detail`, `chat` |
| Flujo financiero | Tablas `wallet_*`, `payments`, RPC `create_booking_atomic` (`apps/web/src/app/core/services/bookings.service.ts:253-330`) | `WalletService`, `PaymentsService` | `booking-detail-payment`, `owner dashboard` |
| Contacto alterno | `profiles`, `users`, `analytics` | `BookingsService.getOwnerContact()` (`apps/web/src/app/core/services/bookings.service.ts:295-319`), `AnalyticsService` | `WhatsappFab`, emails |

### 3.2 Reordenamiento de Datos

1. **DTO únicas por vista.** `owner_bookings` y `my_bookings` se mapean a `BookingCardView` para evitar `any` en componentes (`owner-bookings.page.ts:87-125`).  
2. **Pipelines declarativos.** Cada vista `features/*` consume `signals` derivados (`bookings$`, `conversation$`); la lógica de formateo (status label, hints) se mueve a `BookingStatusPresenter`.  
3. **Repositorios por dominio.**  
   - `communication.repository.ts`: wraps `messages`, `notifications`.  
   - `booking.repository.ts`: wraps `bookings`, `owner_bookings`, `my_bookings`.  
   - `contact.repository.ts`: reusa `profiles`, `users` para WhatsApp/email.  
4. **Normalización de IDs.** Se estandariza `contextId = booking_id ?? car_id`. Todos los componentes utilizan `ChatContext` para pasar ese ID, evitando condicionales duplicados.  
5. **Supabase policies revisadas.** Se documenta RLS para `messages` y `notifications` en este plano para que QA pueda validar permisos en modo auditoría.

### 3.3 Observabilidad & Datos Derivados

- **Métricas Realtime.** `analytics.service` registra `chat_message_sent`, `chat_message_delivered`, `offline_message_retry`.  
- **Backfill de lectura.** Se implementa `markAsRead(conversationId)` en `MessagesService` y se invoca cuando el usuario enfoca la ventana del chat.  
- **Cache local.** Se usa `signalStore`/`computed` para cachear `ConversationDTO` (repositorio ya devuelve datos enriquecidos `messages.repository.ts:70-140`).  
- **Alertas.** Cloudflare Function de health-check (ver `supabase/functions/monitoring-health-check/index.ts:25`) recibe hooks cuando el `messages` channel entra en `error`.

---

## 4. Flujo Locatario ↔ Locador Reordenado

### 4.1 Cronología de Estados

| Paso | Estado Booking | UX Locatario | UX Locador | Comunicación |
|------|----------------|--------------|------------|--------------|
| 0. Lead | — | Explora `marketplace` y usa `WhatsappFab` (`apps/web/src/app/shared/components/whatsapp-fab/whatsapp-fab.component.ts:1-67`) si necesita contacto rápido. | Recibe leads vía `carLeads` (`owner-bookings.page.ts:18-97`). | WhatsApp o chat por `car_id`. |
| 1. Solicitud | `pending` (`Booking.status`) | Completa checkout, ve `booking-detail` con chat activo (`docs/reports/analysis/ANALISIS_SISTEMA_MENSAJERIA.md:120-139`). | Recibe alerta en `owner-bookings`, badges se actualizan vía `UnreadMessagesService`. | Chat + notificación `new_chat_message`. |
| 2. Confirmación | `confirmed` | Sigue conversación para coordinar entrega. | Ejecuta acciones (check-in/out) con ayuda de `OwnerBookingsPage.canStartRental()` (`apps/web/src/app/features/bookings/owner-bookings/owner-bookings.page.ts:180-199`). | Chat principal, fallback WhatsApp. |
| 3. En curso | `in_progress` | Reporta incidentes con `booking-chat`. | Supervisa desde dashboard; comunicación continúa. | Chat + claims/disputes. |
| 4. Cierre | `completed` / `cancelled` | Chat se vuelve read-only (mostrar historial). | Puede archivar conversación, iniciar reclamo si hay daños. | Notificación final + e-mail resumen. |
| 5. Post | — | Deja review; recibe push si locador responde. | Revisa `wallet`, inicia retiro. | Email + push, chat archivado pero accesible. |

### 4.2 Puntos de Integración

- **PRD Owner Flow** (`docs/prd/owner-flow-locador.md:32-103`) define expectativas; cada fase mapea a features: publicación (`cars/publish`), reservas (`owner-bookings`), wallet (`wallet/*`).  
- **Datos compartidos.** `Booking` model (`apps/web/src/app/core/models/index.ts:329-420`) provee `payment_status`, `deposit_status`, `completion_status`. `ConversationDTO` añade metadata (marca/modelo) para mostrar en chat header.  
- **Comunicación cruzada.** Cuando `MessagesService.listCarLeadsForOwner` (`apps/web/src/app/core/services/messages.service.ts:72-131`) detecta mensajes sin booking, `owner-bookings` muestra `carLeads` arriba de la lista para que el locador convierta leads en reservas.  
- **Triggers y notificaciones.** `notify_new_chat_message` crea `notifications` con CTA a `/bookings/:id` o `/cars/:id`, manteniendo el flujo unido incluso si el usuario está fuera de la app.

### 4.3 Reglas de Comunicación

1. **Privacidad:** nunca se expone el teléfono real salvo que el locador lo habilite en su perfil (`apps/web/src/app/features/profile/profile-expanded.page.ts:503-579`).  
2. **Canales paralelos:** Chat (primario), WhatsApp (fallback), Email/Push (sistemas). `CommunicationPolicyService` decidirá cuál mostrar según estado y preferencia (`NotificationPrefs` en `apps/web/src/app/core/models/index.ts:57-95`).  
3. **Trazabilidad:** cada mensaje guarda `booking_id` o `car_id`, y `AnalyticsService` rastrea clics en WhatsApp para mapear conversaciones externas al histórico interno.

---

## 5. Plan de Implementación

| Fase | Objetivo | Entregables | Owners sugeridos |
|------|----------|-------------|------------------|
| **Fase 0 — Setup (0.5 sem)** | Crear `experiences/communication` y mover `BaseChat`, `BookingChat`, indicadores. | Nuevos barrels + rutas de import. | Frontend |
| **Fase 1 — Chat & Comunicación (1.5 sem)** | Refactorizar chat-shell, wrappers y conversation badges. Agregar `markAsRead`, `typing`, `attachments` backlog. | Nuevos componentes, servicios reorganizados, historias en Storybook. | Frontend + Product |
| **Fase 2 — Datos & Repositorios (2 sem)** | Introducir `booking.repository`, `communication.repository`, mappers y DTOs. | Schemas TS, hooks de pruebas unitarias para `MessagesRepository`. | Fullstack |
| **Fase 3 — Flujo Locador/Locatario (1 sem)** | Enlazar chat + badges a `owner-bookings`, `my-bookings`, `dashboard`. Agregar entrypoint `/inbox`. | Updates en features, rutas nuevas, métricas en Analytics. | Frontend |
| **Fase 4 — Observabilidad & Alerts (0.5 sem)** | Integrar métricas, health-check, dashboards Supabase/Cloudflare, QA checklist. | Panel de monitoreo, alertas Slack, pruebas manuales documentadas. | DevOps/QA |

### Dependencias Técnicas

- Confirmar migraciones RLS para `messages` (QA).  
- Verificar storage quotas IndexedDB en iOS Safari (QA).  
- Coordinar con equipo de pagos si se agregan triggers dependientes del estado del booking.

---

## 6. Métricas y Riesgos

- **Métricas clave:** tiempo medio de respuesta en chat, # de conversaciones por booking, tasa de adopción del chat vs WhatsApp, reservas recuperadas desde `carLeads`.  
- **Riesgos:** duplicación de canales Realtime (mitigado centralizando en `RealtimeConnectionService`), mensajes huérfanos (resuelto con `contextId` obligatorio), fuga de datos personales (controlado por `CommunicationPolicyService` + preferencias en perfil).  
- **Testing:** Casos E2E como `tests/whatsapp-chat-demo.spec.ts` se actualizan para cubrir `conversation drawer` y `unread badges`.

---

> Este plano consolida la estructura solicitada y sirve como blueprint para que cada squad pueda alinear entregables con los componentes existentes y su reorganización.
