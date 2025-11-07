# 🚀 PWA FEATURES - GUÍA COMPLETA

## ✅ Implementado y Activo

### 1. 📦 Service Worker con Cache Avanzado
- ✅ Configurado en `ngsw-config.json`
- ✅ Estrategias de cache:
  - **Performance**: Cars, profiles (cache-first)
  - **Freshness**: Bookings, payments (network-first)
  - **Lazy**: Images, media
- ✅ Offline support completo

### 2. 🔔 Push Notifications
- ✅ Servicio creado: `push-notification.service.ts`
- ✅ Integración con Angular SwPush
- ✅ Soporte para:
  - Booking confirmations
  - New messages
  - Payment received
  - Review requests

### 3. 📤 Share API
- ✅ Servicio creado: `share.service.ts`
- ✅ Funciones:
  - Compartir autos específicos
  - Compartir la app
  - Compartir reservas
  - Fallback a clipboard

### 4. 📲 Install Prompt Personalizado
- ✅ Servicio: `pwa-install.service.ts`
- ✅ Componente: `pwa-install-banner.component.ts`
- ✅ Features:
  - Detecta si es instalable
  - Prompt personalizado después de 30s
  - Instrucciones por navegador
  - Detecta si ya está instalada

---

## 📚 CÓMO USAR

### Push Notifications

#### Paso 1: Generar VAPID Keys

```bash
npx web-push generate-vapid-keys
```

Obtendrás:
```
Public Key: BEl62iUYgUivxIkv69yViEuiBIa-Ib37J8-gSpN1fPQ...
Private Key: y-BKLJYm...
```

#### Paso 2: Actualizar el servicio

```typescript
// push-notification.service.ts
private readonly VAPID_PUBLIC_KEY = 'TU_PUBLIC_KEY_AQUI';
```

#### Paso 3: Usar en componentes

```typescript
import { PushNotificationService } from '../services/push-notification.service';

export class MyComponent {
  private pushService = inject(PushNotificationService);

  async enableNotifications() {
    // Solicitar permiso
    const permission = await this.pushService.requestPermission();
    
    if (permission === 'granted') {
      // Suscribir
      await this.pushService.requestSubscription();
      
      // Escuchar clicks
      this.pushService.notificationClicks$.subscribe(click => {
        console.log('Usuario hizo click en:', click);
        // Navegar a la página correspondiente
      });
    }
  }

  async testNotification() {
    await this.pushService.testNotification();
  }
}
```

#### Paso 4: Backend (Enviar notificaciones)

```typescript
// Node.js con web-push
const webpush = require('web-push');

webpush.setVapidDetails(
  'mailto:tu@email.com',
  'PUBLIC_KEY',
  'PRIVATE_KEY'
);

// Enviar notificación
const subscription = {
  // Obtenido del frontend
};

webpush.sendNotification(subscription, JSON.stringify({
  title: 'Nueva reserva confirmada!',
  body: 'Tu auto está listo para retirar',
  icon: '/icons/icon-192x192.png',
  badge: '/icons/icon-72x72.png',
  data: {
    url: '/bookings/123',
    bookingId: '123'
  }
}));
```

---

### Share API

```typescript
import { ShareService } from '../services/share.service';

export class CarDetailComponent {
  private shareService = inject(ShareService);

  async shareCar() {
    const success = await this.shareService.shareCar(
      this.car.id,
      `${this.car.brand} ${this.car.model}`,
      this.car.price_per_day
    );

    if (success) {
      console.log('✅ Compartido!');
    }
  }

  async shareApp() {
    await this.shareService.shareApp();
  }
}
```

**HTML:**
```html
<button (click)="shareCar()">
  <svg><!-- share icon --></svg>
  Compartir
</button>
```

---

### PWA Install

El banner se muestra automáticamente después de 30 segundos si la app es instalable.

**Personalizar trigger:**

```typescript
import { PwaInstallService } from '../services/pwa-install.service';

export class HomeComponent {
  private installService = inject(PwaInstallService);

  async promptInstallNow() {
    if (this.installService.canInstall()) {
      const installed = await this.installService.promptInstall();
      
      if (installed) {
        console.log('✅ App instalada!');
      }
    }
  }

  // Verificar si ya está instalada
  get isInstalled() {
    return this.installService.isInstalled();
  }

  // Obtener instrucciones
  getInstructions() {
    return this.installService.getInstallInstructions();
  }
}
```

---

## 🎯 BACKEND NECESARIO

### 1. Endpoint para guardar subscriptions

```typescript
// Supabase Function o API Route
app.post('/api/push-subscriptions', async (req, res) => {
  const { subscription, userId } = req.body;

  await supabase
    .from('push_subscriptions')
    .insert({
      user_id: userId,
      subscription: subscription,
      created_at: new Date()
    });

  res.json({ success: true });
});
```

### 2. Tabla en Supabase

```sql
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id);
```

### 3. Enviar notificación cuando se crea una reserva

```typescript
// Supabase Function o Trigger
async function notifyBookingConfirmed(bookingId: string) {
  // Obtener user y subscription
  const { data: booking } = await supabase
    .from('bookings')
    .select('*, user:profiles(*)')
    .eq('id', bookingId)
    .single();

  const { data: subscription } = await supabase
    .from('push_subscriptions')
    .select('subscription')
    .eq('user_id', booking.user_id)
    .single();

  if (subscription) {
    await sendPushNotification(subscription.subscription, {
      title: 'Reserva Confirmada! 🎉',
      body: `Tu ${booking.car.title} está listo`,
      data: { url: `/bookings/${bookingId}` }
    });
  }
}
```

---

## 📊 MÉTRICAS Y ANALYTICS

### Trackear instalaciones

```typescript
// En pwa-install.service.ts
window.addEventListener('appinstalled', () => {
  // Enviar a analytics
  gtag('event', 'pwa_installed', {
    'event_category': 'engagement',
    'event_label': 'PWA Install'
  });
});
```

### Trackear uso offline

```typescript
window.addEventListener('online', () => {
  gtag('event', 'back_online');
});

window.addEventListener('offline', () => {
  gtag('event', 'went_offline');
});
```

### Trackear shares

```typescript
async shareCar() {
  const success = await this.shareService.shareCar(...);
  
  if (success) {
    gtag('event', 'share', {
      'content_type': 'car',
      'item_id': this.car.id
    });
  }
}
```

---

## 🧪 TESTING

### 1. Test en localhost

```bash
# Build producción
npm run build

# Servir con HTTPS (requerido para PWA)
npx http-server dist -p 8080 --ssl
```

### 2. Test en dispositivo real

```bash
# Usando ngrok
npx ngrok http 4200
```

Abre la URL de ngrok en tu móvil.

### 3. Lighthouse Audit

1. Chrome DevTools > Lighthouse
2. Seleccionar "Progressive Web App"
3. Run audit
4. Objetivo: Score 90+

### 4. Test offline

1. Chrome DevTools > Network
2. Marcar "Offline"
3. Recargar página
4. Debería funcionar sin internet

---

## 🚀 FEATURES AVANZADAS (Futuro)

### Background Sync

```typescript
// Sincronizar cuando vuelve internet
if ('serviceWorker' in navigator && 'SyncManager' in window) {
  const registration = await navigator.serviceWorker.ready;
  await registration.sync.register('sync-bookings');
}
```

### Periodic Background Sync

```typescript
// Actualizar datos cada hora (solo con permiso)
const registration = await navigator.serviceWorker.ready;
await registration.periodicSync.register('update-bookings', {
  minInterval: 60 * 60 * 1000 // 1 hora
});
```

### Web Share Target

```json
// manifest.webmanifest
{
  "share_target": {
    "action": "/share",
    "method": "GET",
    "params": {
      "title": "title",
      "text": "text",
      "url": "url"
    }
  }
}
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Immediate (Hoy):
- [x] Service Worker configurado
- [x] Push notification service
- [x] Share service
- [x] Install banner component
- [x] Integrado en app

### Esta semana:
- [ ] Generar VAPID keys reales
- [ ] Crear tabla push_subscriptions
- [ ] Endpoint para guardar subscriptions
- [ ] Test en dispositivo real

### Próximo sprint:
- [ ] Backend para enviar notificaciones
- [ ] Background sync
- [ ] Analytics de PWA
- [ ] Periodic sync

---

## 📱 SOPORTE DE NAVEGADORES

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Service Worker | ✅ | ✅ | ✅ (11.1+) | ✅ |
| Push Notifications | ✅ | ✅ | ✅ (16.4+) | ✅ |
| Install Prompt | ✅ | ❌ | ❌ | ✅ |
| Share API | ✅ | ❌ | ✅ | ✅ |
| Background Sync | ✅ | ❌ | ❌ | ✅ |

---

## 🎉 ¡PWA IMPLEMENTADA!

Tu app ahora es una Progressive Web App completa con:
- ✅ Funciona offline
- ✅ Instalable como app nativa
- ✅ Push notifications listas
- ✅ Compartir contenido
- ✅ Cache inteligente

**Próximo paso:** Generar VAPID keys y probar en dispositivo real!
