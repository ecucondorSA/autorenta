# 📬 Sistema de Mensajería - Guía Completa

## 🔧 Solución al Error 404

### Problema
El error 404 ocurre porque:
1. La tabla `messages` no existe en Supabase
2. O las políticas RLS están mal configuradas

### Solución
1. **Ejecutar migración SQL en Supabase**:
   - Ve a https://supabase.com/dashboard/project/obxvffplochgeiclibng/editor
   - Abre el SQL Editor
   - Copia y pega el contenido de `supabase/migrations/fix_messages_table.sql`
   - Ejecuta el script

2. **Verificar tabla creada**:
   ```sql
   SELECT * FROM public.messages LIMIT 1;
   ```

3. **Verificar políticas RLS**:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'messages';
   ```

---

## 📱 Cómo Funciona el Sistema

### Para el **LOCATARIO** (quien alquila):

1. **Ver un auto** → Click en "Contactar dueño"
2. **Enviar mensaje** al dueño del auto
3. **Ver bandeja de entrada**: Menú → "Mensajes" o `/messages`
4. **Ver respuestas** del locador en tiempo real

### Para el **LOCADOR** (dueño del auto):

1. **Recibir notificación** cuando alguien pregunta por su auto
2. **Ver bandeja de entrada**: Menú → "Mensajes" o `/messages`
3. **Responder** al locatario en tiempo real
4. **Ver todos los chats** organizados por auto

---

## 🗂️ Estructura de Rutas

```
/messages              → Bandeja de entrada (inbox)
/messages/chat         → Chat específico (con queryParams)
```

### Query Parameters para `/messages/chat`:

**Para chat de auto (pre-reserva)**:
```typescript
{
  carId: string,        // ID del auto
  userId: string,       // ID del otro usuario
  userName: string,     // Nombre del otro usuario
  carName?: string      // Nombre del auto (opcional)
}
```

**Para chat de reserva**:
```typescript
{
  bookingId: string,    // ID de la reserva
  userId: string,       // ID del otro usuario
  userName: string      // Nombre del otro usuario
}
```

---

## 🎯 Casos de Uso

### 1. Locatario pregunta por un auto

```typescript
// En car-detail.component.ts
async contactOwner() {
  const session = this.authService.session$();
  if (!session) {
    this.router.navigate(['/auth/login']);
    return;
  }

  // Navegar al chat
  this.router.navigate(['/messages/chat'], {
    queryParams: {
      carId: this.car.id,
      userId: this.car.owner_id,
      userName: this.car.owner.full_name,
      carName: `${this.car.brand} ${this.car.model}`
    }
  });
}
```

### 2. Locador responde desde su inbox

```typescript
// inbox.page.ts - El locador hace click en una conversación
openConversation(conv: Conversation): void {
  this.router.navigate(['/messages/chat'], {
    queryParams: {
      carId: conv.carId,
      userId: conv.otherUserId,
      userName: conv.otherUserName,
      carName: `${conv.carBrand} ${conv.carModel}`
    }
  });
}
```

### 3. Ambos ven mensajes en tiempo real

```typescript
// messages.service.ts
subscribeToCar(carId: string, handler: (message: Message) => void) {
  // Escucha cambios en tiempo real
  // Ambos usuarios reciben notificaciones instantáneas
}
```

---

## 🔐 Seguridad (RLS)

### Políticas implementadas:

1. **SELECT**: Solo puedes ver mensajes donde eres sender o recipient
2. **INSERT**: Solo puedes enviar mensajes como sender (no puedes suplantar)
3. **UPDATE**: Solo puedes actualizar mensajes donde eres recipient (marcar como leído)

### Ejemplo de verificación:
```sql
-- Usuario A intenta ver mensaje entre B y C
-- ❌ Denegado por RLS

-- Usuario A intenta ver su mensaje con B
-- ✅ Permitido
```

---

## 📊 Base de Datos

### Tabla `messages`

```sql
id               UUID PRIMARY KEY
booking_id       UUID (nullable - referencia a bookings)
car_id           UUID (nullable - referencia a cars)
sender_id        UUID (quien envía)
recipient_id     UUID (quien recibe)
body             TEXT (contenido del mensaje)
read_at          TIMESTAMPTZ (cuando se leyó)
delivered_at     TIMESTAMPTZ (cuando se entregó)
created_at       TIMESTAMPTZ
updated_at       TIMESTAMPTZ
```

**Constraint**: Debe tener `booking_id` O `car_id`, no ambos.

---

## 🧪 Testing

### Probar localmente:

1. **Usuario 1** (Locatario):
   - Login
   - Buscar auto
   - Click "Contactar dueño"
   - Enviar mensaje

2. **Usuario 2** (Locador):
   - Login con otra cuenta
   - Ir a /messages
   - Ver mensaje del Usuario 1
   - Responder

3. **Verificar**:
   - Usuario 1 ve respuesta en tiempo real
   - Ambos pueden conversar sin recargar página

---

## 🐛 Troubleshooting

### Error: "Cannot find module '@supabase/storage-js'"
```bash
npm install @supabase/storage-js zod
```

### Error: "An API access token is required to use Mapbox GL"
```typescript
// Verificar en environment.ts
mapbox: {
  accessToken: 'pk.eyJ1IjoiZWN1Y29uZG9yIiwiYSI6ImNtZ3R0bjQ2dDA4Znkyd3B5ejkzNDFrb3IifQ.WwgMG-oIfT_9BDvwAT3nUg'
}
```

### Error 404 al enviar mensajes
1. Ejecutar migración SQL (ver arriba)
2. Verificar que la tabla existe
3. Verificar políticas RLS

### Mensajes no aparecen en tiempo real
1. Verificar que Realtime está habilitado en Supabase:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
   ```
2. Verificar conexión WebSocket en Network tab

---

## 📱 Mobile Bottom Nav

El botón "Mensajes" en la barra inferior móvil:
```typescript
// mobile-bottom-nav.component.ts
{
  route: '/messages',  // Va directo al inbox
  icon: 'chatbubbles',
  label: 'Mensajes'
}
```

---

## ✅ Checklist de Implementación

- [x] Tabla `messages` creada
- [x] Políticas RLS configuradas
- [x] Índices de performance
- [x] Realtime habilitado
- [x] Componente inbox
- [x] Componente chat (booking y car)
- [x] Servicio de mensajes
- [x] Integración con mobile nav
- [ ] Notificaciones push (pendiente)
- [ ] Indicador de "escribiendo..." (opcional)

---

## 🚀 Próximos Pasos

1. **Push Notifications**: Notificar cuando llega un mensaje nuevo
2. **Typing Indicators**: Mostrar cuando el otro usuario está escribiendo
3. **Message Reactions**: Emoji reactions a mensajes
4. **File Attachments**: Enviar fotos/documentos
5. **Message Search**: Buscar en conversaciones
6. **Archive Conversations**: Archivar chats antiguos

---

## 📚 Referencias

- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Angular Signals](https://angular.dev/guide/signals)
