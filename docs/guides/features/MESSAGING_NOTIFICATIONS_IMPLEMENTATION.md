# 📬 Sistema de Notificaciones de Mensajes - Implementación

## ✅ Características Implementadas

### 1. 🔔 Badge de Mensajes No Leídos

**Ubicación:** Bottom Navigation (Navegación inferior móvil)

**Funcionalidad:**
- Muestra un badge rojo con el número total de mensajes no leídos
- Se actualiza en tiempo real cuando llegan nuevos mensajes
- Muestra "99+" si hay más de 99 mensajes no leídos
- Badge solo aparece cuando hay mensajes pendientes (se oculta cuando unreadCount = 0)

**Archivos modificados:**
- `/apps/web/src/app/shared/components/mobile-bottom-nav/mobile-bottom-nav.component.ts`
- `/apps/web/src/app/shared/components/mobile-bottom-nav/mobile-bottom-nav.component.html`

### 2. 🔊 Sonido de Notificación

**Funcionalidad:**
- Reproduce un sonido sutil cuando llega un nuevo mensaje
- Usa Web Audio API para generar un tono de 800Hz durante 0.2 segundos
- Volumen controlado (30%) para no ser intrusivo
- Falla silenciosamente en navegadores sin soporte

**Implementación:**
- En `UnreadMessagesService.playNotificationSound()`
- Se activa automáticamente al recibir un nuevo mensaje vía Realtime

### 3. 📊 Servicio de Mensajes No Leídos

**Nuevo archivo:** `/apps/web/src/app/core/services/unread-messages.service.ts`

**Características:**
- **Signals reactivos** para máxima performance
  - `unreadConversations`: Array de conversaciones con mensajes no leídos
  - `totalUnreadCount`: Computed signal con el total de mensajes no leídos
  - `isLoading`: Estado de carga

- **Inicialización automática** cuando el usuario inicia sesión
- **Subscripción en tiempo real** a la tabla `messages` via Supabase Realtime
- **Soporte para 2 tipos de conversaciones:**
  - Conversaciones de reserva (booking-based)
  - Conversaciones de auto (car-based, pre-reserva)

**Métodos principales:**
```typescript
// Inicializar el servicio
await initialize(): Promise<void>

// Marcar conversación como leída
await markConversationAsRead(conversationId: string, type: 'booking' | 'car'): Promise<void>

// Refrescar manualmente
await refresh(): Promise<void>
```

### 4. 📬 Bandeja de Entrada (Inbox)

**Ubicación:** `/messages`

**Mejoras:**
- Integración con `UnreadMessagesService`
- Marca conversaciones como leídas al abrirlas
- Muestra badge de mensajes no leídos por conversación
- Lista todas las conversaciones del usuario (booking + car)

**Archivos modificados:**
- `/apps/web/src/app/features/messages/inbox.page.ts`

## 🔄 Flujo de Datos en Tiempo Real

```
1. Usuario A envía mensaje a Usuario B
   ↓
2. Mensaje insertado en tabla `messages` (Supabase)
   ↓
3. Realtime trigger activa
   ↓
4. UnreadMessagesService (Usuario B) detecta INSERT
   ↓
5. Signal `unreadConversations` actualizado
   ↓
6. Computed signal `totalUnreadCount` recalculado
   ↓
7. Bottom Nav badge actualizado (ChangeDetection OnPush)
   ↓
8. Sonido de notificación reproducido
```

## 🎯 Cómo Funciona

### Badge en Bottom Navigation

El componente `MobileBottomNavComponent` ahora inyecta el `UnreadMessagesService` y pasa una función signal al item "Mensajes":

```typescript
{
  id: 'messages',
  label: 'Mensajes',
  icon: 'message',
  route: '/messages',
  badgeSignal: () => this.unreadMessagesService.totalUnreadCount(),
}
```

El template evalúa la función signal para mostrar el badge:

```html
<span *ngIf="item.badgeSignal && item.badgeSignal() > 0" class="nav-item__badge">
  {{ item.badgeSignal() > 99 ? '99+' : item.badgeSignal() }}
</span>
```

### Subscripción Realtime

El servicio se suscribe a 2 eventos de Postgres:

1. **INSERT**: Nuevo mensaje recibido
2. **UPDATE**: Mensaje marcado como leído (actualiza contador)

```typescript
this.supabase
  .channel('unread-messages')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `recipient_id=eq.${userId}`,
  }, (payload) => {
    this.handleNewMessage(payload.new);
  })
```

### Marcar como Leído

Cuando el usuario abre una conversación:

```typescript
// En inbox.page.ts
openConversation(conv: Conversation): void {
  if (conv.carId) {
    this.unreadMessagesService.markConversationAsRead(conv.carId, 'car');
  } else if (conv.bookingId) {
    this.unreadMessagesService.markConversationAsRead(conv.bookingId, 'booking');
  }
  // Navegar al chat...
}
```

## 📱 Compatibilidad

- ✅ Web (Desktop + Mobile)
- ✅ PWA
- ✅ Ionic/Capacitor (nativo)
- ✅ Todos los navegadores modernos

## 🔐 Seguridad

- Row Level Security (RLS) aplicado en Supabase
- Solo se reciben notificaciones de mensajes donde el usuario es recipient
- No se exponen mensajes de otras conversaciones

## 🎨 UI/UX

- Badge rojo brillante (#EF4444) para máxima visibilidad
- Posición absoluta top-right del icono
- Animación suave al aparecer/desaparecer
- Sonido sutil y no intrusivo
- Haptic feedback al tocar (en dispositivos compatibles)

## 🚀 Próximas Mejoras Sugeridas

### Push Notifications (PWA)
- [ ] Implementar Service Worker para notificaciones push
- [ ] Solicitar permiso de notificaciones al usuario
- [ ] Enviar notificaciones incluso cuando la app está cerrada

### Vibración Personalizada
```typescript
if ('vibrate' in navigator) {
  navigator.vibrate([100, 50, 100]); // Patrón personalizado
}
```

### Sonidos Personalizados
- [ ] Cargar archivo de audio MP3/WAV
- [ ] Permitir al usuario elegir sonido de notificación
- [ ] Diferentes sonidos para diferentes tipos de mensajes

### Notificaciones Nativas (Capacitor)
```typescript
import { LocalNotifications } from '@capacitor/local-notifications';

await LocalNotifications.schedule({
  notifications: [{
    title: 'Nuevo mensaje',
    body: message.body,
    id: 1,
    schedule: { at: new Date(Date.now() + 1000) }
  }]
});
```

## 📊 Métricas a Monitorear

- Tasa de apertura de mensajes
- Tiempo promedio de respuesta
- Mensajes no leídos promedio por usuario
- Uso de notificaciones (aceptación vs rechazo)

## 🐛 Troubleshooting

### Badge no se actualiza
- Verificar que `UnreadMessagesService` esté inicializado
- Revisar console logs en `handleNewMessage()`
- Confirmar que Realtime está conectado

### Sonido no se reproduce
- Verificar permisos de audio en el navegador
- Algunos navegadores requieren interacción del usuario primero
- Revisar consola por errores de Web Audio API

### Mensajes duplicados en inbox
- Verificar query de agrupación en `loadConversations()`
- Asegurar que `key` sea único por conversación

## 🔍 Debugging

Para ver logs de actividad:

```typescript
// En unread-messages.service.ts
private handleNewMessage(message: any): void {
  console.log('📨 Nuevo mensaje recibido:', message);
  // ...
}
```

Para testear manualmente:

```typescript
// En la consola del navegador
const service = inject(UnreadMessagesService);
await service.refresh();
console.log('Unread count:', service.totalUnreadCount());
```

## 📚 Referencias

- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Angular Signals](https://angular.io/guide/signals)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
