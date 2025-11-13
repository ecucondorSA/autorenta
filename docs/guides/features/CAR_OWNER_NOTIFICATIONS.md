# 🔔 Notificaciones para Locadores (Dueños de Autos)

## 📋 Resumen

Este documento describe todos los tipos de notificaciones que podemos generar para usuarios que tienen autos publicados en AutoRenta.

## 🎯 Tipos de Notificaciones Disponibles

### 1. 💬 Nuevo Mensaje en Chat

**Cuándo**: Cuando alguien envía un mensaje sobre el auto del locador.

**Ejemplo de uso**:
```typescript
import { CarOwnerNotificationsService } from '@core/services/car-owner-notifications.service';

// En el componente o servicio que maneja mensajes
constructor(private carOwnerNotifications: CarOwnerNotificationsService) {}

// Cuando llega un mensaje nuevo (via Realtime)
onNewMessage(message: Message, car: Car, sender: UserProfile) {
  this.carOwnerNotifications.notifyNewChatMessage(
    sender.full_name || sender.email,
    `${car.brand} ${car.model}`,
    message.body, // Preview del mensaje
    `/messages?carId=${car.id}&userId=${sender.id}`
  );
}
```

**Características**:
- ✅ Muestra nombre del remitente
- ✅ Muestra nombre del auto
- ✅ Preview del mensaje (primeros 50 caracteres)
- ✅ Botón para ir al chat directamente
- ✅ Sonido de notificación
- ✅ Duración: 8 segundos

---

### 2. 🎉 Nueva Solicitud de Reserva

**Cuándo**: Cuando alguien solicita alquilar el auto.

**Ejemplo de uso**:
```typescript
onNewBookingRequest(booking: Booking, car: Car, renter: UserProfile) {
  this.carOwnerNotifications.notifyNewBookingRequest(
    renter.full_name || renter.email,
    `${car.brand} ${car.model}`,
    booking.price_per_day,
    `/bookings/${booking.id}`
  );
}
```

**Características**:
- ✅ Muestra nombre del locatario
- ✅ Muestra precio por día
- ✅ Botón para ver y aprobar/rechazar la reserva
- ✅ Sonido de notificación
- ✅ Prioridad alta (10 segundos)
- ✅ Tipo: success (verde)

---

### 3. 👀 Vistas del Auto

**Cuándo**: Cuando múltiples personas están viendo el auto simultáneamente.

**Ejemplo de uso**:
```typescript
// En un servicio que trackea vistas en tiempo real
onCarViewersUpdate(carId: string, viewerCount: number) {
  const car = this.getCar(carId);
  this.carOwnerNotifications.notifyCarViews(
    `${car.brand} ${car.model}`,
    viewerCount
  );
}
```

**Características**:
- ✅ Solo notifica si hay vistas (no molesta si es 0)
- ✅ Mensaje dinámico (singular/plural)
- ✅ Tipo: info (azul)
- ✅ Duración: 5 segundos
- ✅ Sin sonido (no invasivo)

---

### 4. ✅ Reserva Confirmada

**Cuándo**: Cuando una reserva se confirma y se procesa el pago.

**Ejemplo de uso**:
```typescript
onBookingConfirmed(booking: Booking, car: Car, renter: UserProfile) {
  this.carOwnerNotifications.notifyBookingConfirmed(
    renter.full_name || renter.email,
    `${car.brand} ${car.model}`,
    booking.total_amount,
    `/bookings/${booking.id}`
  );
}
```

**Características**:
- ✅ Muestra monto total de la reserva
- ✅ Botones para ver detalles o ir al wallet
- ✅ Sonido de notificación
- ✅ Prioridad alta
- ✅ Tipo: success

---

### 5. 💰 Pago Recibido

**Cuándo**: Cuando se recibe el pago de una reserva en el wallet.

**Ejemplo de uso**:
```typescript
onPaymentReceived(payment: Payment, booking: Booking) {
  this.carOwnerNotifications.notifyPaymentReceived(
    payment.amount,
    booking.id,
    `/bookings/${booking.id}`
  );
}
```

**Características**:
- ✅ Muestra monto recibido formateado
- ✅ Muestra ID de reserva (cortado)
- ✅ Botones para ver wallet o reserva
- ✅ Sonido de notificación
- ✅ Prioridad alta

---

### 6. ⭐ Nueva Reseña

**Cuándo**: Cuando alguien deja una reseña del auto.

**Ejemplo de uso**:
```typescript
onNewReview(review: Review, car: Car, reviewer: UserProfile) {
  this.carOwnerNotifications.notifyNewReview(
    reviewer.full_name || reviewer.email,
    review.rating,
    `${car.brand} ${car.model}`,
    `/cars/${car.id}/reviews`
  );
}
```

**Características**:
- ✅ Muestra estrellas visuales (⭐ y ☆)
- ✅ Botón para ver la reseña completa
- ✅ Tipo: info
- ✅ Sin sonido (no urgente)

---

### 7. ⚠️ Reserva Cancelada

**Cuándo**: Cuando un locatario cancela una reserva.

**Ejemplo de uso**:
```typescript
onBookingCancelled(booking: Booking, car: Car, renter: UserProfile, reason?: string) {
  this.carOwnerNotifications.notifyBookingCancelled(
    renter.full_name || renter.email,
    `${car.brand} ${car.model}`,
    reason
  );
}
```

**Características**:
- ✅ Muestra razón de cancelación si está disponible
- ✅ Tipo: warning (amarillo)
- ✅ Duración: 8 segundos

---

### 8. 🔧 Auto Necesita Atención

**Cuándo**: Cuando el auto necesita algo (inspección, documentos, etc.).

**Ejemplo de uso**:
```typescript
// Ejemplo: Inspección próxima
onInspectionDue(car: Car, daysUntil: number) {
  this.carOwnerNotifications.notifyCarNeedsAttention(
    `${car.brand} ${car.model}`,
    `La inspección vence en ${daysUntil} días.`,
    `/cars/${car.id}/documents`
  );
}
```

**Características**:
- ✅ Mensaje personalizable
- ✅ Botón para ver detalles/realizar acción
- ✅ Tipo: warning
- ✅ Sin sonido (no urgente a menos que sea crítico)

---

### 9. 🎯 Logro/Milestone

**Cuándo**: Cuando se alcanza un hito (ej: 100 vistas, 10 reservas, etc.).

**Ejemplo de uso**:
```typescript
onCarMilestone(car: Car, milestone: string) {
  this.carOwnerNotifications.notifyAchievement(
    milestone, // ej: "Tu auto ha sido visto 100 veces"
    `${car.brand} ${car.model}`
  );
}
```

**Características**:
- ✅ Mensaje motivacional
- ✅ Tipo: success
- ✅ Prioridad baja (no invasivo)
- ✅ Sin sonido

---

### 10. ❓ Preguntas Sin Responder

**Cuándo**: Cuando hay mensajes sin responder por un tiempo.

**Ejemplo de uso**:
```typescript
onUnansweredQuestions(car: Car, questionCount: number) {
  this.carOwnerNotifications.notifyUnansweredQuestions(
    questionCount,
    `${car.brand} ${car.model}`,
    `/messages?carId=${car.id}`
  );
}
```

**Características**:
- ✅ Mensaje dinámico (singular/plural)
- ✅ Botón para ir al chat y responder
- ✅ Sonido de notificación
- ✅ Tipo: info

---

### 11. ⭐ Auto Destacado

**Cuándo**: Cuando el auto está siendo promocionado o destacado.

**Ejemplo de uso**:
```typescript
onCarFeatured(car: Car, promotionDetails: string) {
  this.carOwnerNotifications.notifyCarFeatured(
    `${car.brand} ${car.model}`,
    promotionDetails // ej: "Aparece en la página principal esta semana"
  );
}
```

**Características**:
- ✅ Mensaje positivo
- ✅ Tipo: success
- ✅ Sin sonido

---

## 🔌 Integración con Sistema Existente

### Integrar en UnreadMessagesService

Para que las notificaciones se muestren automáticamente cuando llega un mensaje:

```typescript
// En apps/web/src/app/core/services/unread-messages.service.ts
import { CarOwnerNotificationsService } from './car-owner-notifications.service';

export class UnreadMessagesService {
  private readonly carOwnerNotifications = inject(CarOwnerNotificationsService);

  private async handleNewMessage(message: unknown): Promise<void> {
    // ... código existente ...

    // ✅ NUEVO: Mostrar notificación si el usuario es dueño del auto
    const carId = (message as any).car_id;
    if (carId) {
      const car = await this.getCarInfo(carId);
      const sender = await this.getUserInfo((message as any).sender_id);
      
      if (car && sender) {
        this.carOwnerNotifications.notifyNewChatMessage(
          sender.full_name || sender.email,
          `${car.brand} ${car.model}`,
          (message as any).body,
          `/messages?carId=${carId}&userId=${sender.id}`
        );
      }
    }

    // ... resto del código ...
  }
}
```

### Integrar en MessagesService

Para notificar cuando se recibe un mensaje en tiempo real:

```typescript
// En apps/web/src/app/core/services/messages.service.ts
import { CarOwnerNotificationsService } from './car-owner-notifications.service';

export class MessagesService {
  private readonly carOwnerNotifications = inject(CarOwnerNotificationsService);

  subscribeToCar(
    carId: string,
    handler: (message: Message) => void,
    onConnectionChange?: (status: ConnectionStatus) => void,
  ): void {
    // ... código existente de suscripción ...

    // ✅ NUEVO: Agregar notificación cuando llega mensaje
    this.realtimeChannel = this.realtimeConnection.subscribeWithRetry<Message>(
      `car-messages-${carId}`,
      {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `car_id=eq.${carId}`,
      },
      async (payload) => {
        const message = payload.new as Message;
        
        // Verificar si el usuario actual es el dueño del auto
        const { data: { user } } = await this.supabase.auth.getUser();
        if (user && message.recipient_id === user.id) {
          // Obtener info del auto y remitente
          const [car, sender] = await Promise.all([
            this.getCarInfo(carId),
            this.getUserInfo(message.sender_id)
          ]);

          if (car && sender) {
            this.carOwnerNotifications.notifyNewChatMessage(
              sender.full_name || sender.email,
              `${car.brand} ${car.model}`,
              message.body,
              `/messages?carId=${carId}&userId=${sender.id}`
            );
          }
        }

        handler(message);
      },
      onConnectionChange,
    );
  }
}
```

---

## 🎨 Personalización

Todas las notificaciones pueden personalizarse usando el método `show()` directamente:

```typescript
this.notificationManager.show({
  title: 'Título personalizado',
  message: 'Mensaje personalizado',
  type: 'success' | 'error' | 'warning' | 'info',
  priority: 'low' | 'normal' | 'high' | 'critical',
  duration: 5000, // milisegundos
  sticky: false, // si true, no se cierra automáticamente
  sound: true, // reproducir sonido
  actions: [
    {
      label: 'Acción 1',
      icon: '🔧',
      command: () => { /* acción */ }
    }
  ]
});
```

---

## 📊 Prioridades Recomendadas

| Tipo de Notificación | Prioridad | Sonido | Duración |
|---------------------|-----------|--------|----------|
| Nuevo mensaje | normal | ✅ | 8s |
| Nueva reserva | high | ✅ | 10s |
| Reserva confirmada | high | ✅ | 10s |
| Pago recibido | high | ✅ | 10s |
| Reserva cancelada | normal | ❌ | 8s |
| Nueva reseña | normal | ❌ | 8s |
| Vistas del auto | low | ❌ | 5s |
| Logro/Milestone | low | ❌ | 6s |
| Preguntas sin responder | normal | ✅ | 8s |
| Auto necesita atención | normal | ❌ | 8s |

---

## ✅ Checklist de Implementación

- [x] Servicio `CarOwnerNotificationsService` creado
- [ ] Integrar en `UnreadMessagesService` para mensajes nuevos
- [ ] Integrar en `MessagesService` para mensajes en tiempo real
- [ ] Integrar en sistema de reservas para notificar nuevas solicitudes
- [ ] Integrar en sistema de pagos para notificar pagos recibidos
- [ ] Integrar en sistema de reseñas para notificar nuevas reseñas
- [ ] Agregar tracking de vistas para notificar cuando hay muchas vistas
- [ ] Configurar notificaciones push (opcional, futuro)

---

**Última actualización**: 2025-01-XX
**Autor**: Sistema AutoRenta

