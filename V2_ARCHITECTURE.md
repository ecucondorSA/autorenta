# AutoRenta V2 - Arquitectura PWA Móvil Innovadora 🚀

## Visión General

AutoRenta V2 es una reimaginación completa de la plataforma como una **Progressive Web App (PWA) móvil-first** que aprovecha los componentes existentes de v1 pero con una arquitectura moderna, innovadora y optimizada para dispositivos móviles.

## 🎯 Objetivos Clave

1. **Mobile-First Experience**: Diseño centrado en móvil con gestos nativos e interacciones fluidas
2. **Offline-First Architecture**: Funcionalidad completa sin conexión con sincronización inteligente
3. **Performance Extremo**: Carga instantánea (<1s), transiciones fluidas (60 FPS), bundle optimizado
4. **UX Innovadora**: Micro-interacciones, animaciones contextuales, feedback háptico
5. **Accesibilidad Total**: WCAG 2.1 AAA, navegación por voz, soporte para lectores de pantalla

## 🏗️ Arquitectura Técnica

### Stack Tecnológico

```
Frontend:
├── Angular 17+ (Standalone Components)
├── Signals API (State Management)
├── Service Workers (Offline + Caching)
├── Web Animations API (Smooth transitions)
├── Intersection Observer API (Lazy loading)
├── Web Share API (Compartir nativo)
├── Vibration API (Feedback háptico)
├── Geolocation API (Ubicación en tiempo real)
└── WebRTC (Video chat para inspecciones)

Backend:
├── Supabase (Auth + Database + Storage)
├── Cloudflare Workers (Edge Computing)
├── Realtime Subscriptions (Live updates)
└── Edge Functions (Serverless logic)

PWA Features:
├── Service Worker Strategy: Network First + Cache Fallback
├── IndexedDB: Local data persistence
├── Background Sync: Queue offline actions
├── Push Notifications: Engagement proactivo
├── Install Prompt: Native-like installation
└── App Shortcuts: Quick actions desde home screen
```

### Estructura de Carpetas V2

```
apps/web-v2/
├── src/
│   ├── app/
│   │   ├── core-v2/              # Core modules refactorizados
│   │   │   ├── services/
│   │   │   │   ├── offline.service.ts
│   │   │   │   ├── sync.service.ts
│   │   │   │   ├── haptic.service.ts
│   │   │   │   ├── gesture.service.ts
│   │   │   │   └── animation.service.ts
│   │   │   ├── stores/           # Signal-based stores
│   │   │   │   ├── app.store.ts  # Global app state
│   │   │   │   ├── offline.store.ts
│   │   │   │   └── ui.store.ts
│   │   │   ├── guards/           # Reusados de v1
│   │   │   ├── interceptors/
│   │   │   └── models/
│   │   │
│   │   ├── features-v2/          # Features mobile-first
│   │   │   ├── home/             # Landing + marketplace híbrido
│   │   │   │   ├── home.page.ts
│   │   │   │   ├── components/
│   │   │   │   │   ├── hero-swiper.component.ts
│   │   │   │   │   ├── quick-search-card.component.ts
│   │   │   │   │   ├── featured-cars-carousel.component.ts
│   │   │   │   │   ├── trust-indicators.component.ts
│   │   │   │   │   └── bottom-nav-cta.component.ts
│   │   │   │   └── home.page.html
│   │   │   │
│   │   │   ├── discover/         # Búsqueda + filtros con mapa
│   │   │   │   ├── discover.page.ts
│   │   │   │   ├── components/
│   │   │   │   │   ├── map-search.component.ts
│   │   │   │   │   ├── filter-chips.component.ts
│   │   │   │   │   ├── car-grid.component.ts
│   │   │   │   │   ├── list-map-toggle.component.ts
│   │   │   │   │   └── search-bar-advanced.component.ts
│   │   │   │   └── discover.page.html
│   │   │   │
│   │   │   ├── car-detail-v2/    # Detalle inmersivo
│   │   │   │   ├── car-detail-v2.page.ts
│   │   │   │   ├── components/
│   │   │   │   │   ├── photo-gallery-fullscreen.component.ts
│   │   │   │   │   ├── specs-accordion.component.ts
│   │   │   │   │   ├── host-card-mini.component.ts
│   │   │   │   │   ├── reviews-carousel.component.ts
│   │   │   │   │   ├── availability-quick-view.component.ts
│   │   │   │   │   └── sticky-book-button.component.ts
│   │   │   │   └── car-detail-v2.page.html
│   │   │   │
│   │   │   ├── booking-flow-v2/  # Checkout simplificado
│   │   │   │   ├── booking-wizard.page.ts
│   │   │   │   ├── steps/
│   │   │   │   │   ├── dates-selection.component.ts
│   │   │   │   │   ├── protections-step.component.ts
│   │   │   │   │   ├── payment-step.component.ts
│   │   │   │   │   └── confirmation-step.component.ts
│   │   │   │   └── booking-wizard.page.html
│   │   │   │
│   │   │   ├── trips/            # Mis viajes (renter)
│   │   │   │   ├── trips.page.ts
│   │   │   │   ├── components/
│   │   │   │   │   ├── trip-card-timeline.component.ts
│   │   │   │   │   ├── trip-detail-panel.component.ts
│   │   │   │   │   ├── checkin-checklist.component.ts
│   │   │   │   │   └── trip-actions-fab.component.ts
│   │   │   │   └── trips.page.html
│   │   │   │
│   │   │   ├── hosting/          # Mis publicaciones (owner)
│   │   │   │   ├── hosting.page.ts
│   │   │   │   ├── components/
│   │   │   │   │   ├── earnings-dashboard.component.ts
│   │   │   │   │   ├── calendar-availability.component.ts
│   │   │   │   │   ├── car-performance-card.component.ts
│   │   │   │   │   └── quick-publish-fab.component.ts
│   │   │   │   └── hosting.page.html
│   │   │   │
│   │   │   ├── inbox-v2/         # Mensajería mejorada
│   │   │   │   ├── inbox-v2.page.ts
│   │   │   │   ├── components/
│   │   │   │   │   ├── conversation-list.component.ts
│   │   │   │   │   ├── chat-thread.component.ts
│   │   │   │   │   ├── quick-replies.component.ts
│   │   │   │   │   └── voice-message.component.ts
│   │   │   │   └── inbox-v2.page.html
│   │   │   │
│   │   │   ├── wallet-v2/        # Wallet rediseñado
│   │   │   │   ├── wallet-v2.page.ts
│   │   │   │   ├── components/
│   │   │   │   │   ├── balance-card-animated.component.ts
│   │   │   │   │   ├── transaction-feed.component.ts
│   │   │   │   │   ├── quick-actions-grid.component.ts
│   │   │   │   │   └── crypto-converter.component.ts
│   │   │   │   └── wallet-v2.page.html
│   │   │   │
│   │   │   ├── profile-v2/       # Perfil gamificado
│   │   │   │   ├── profile-v2.page.ts
│   │   │   │   ├── components/
│   │   │   │   │   ├── profile-header-hero.component.ts
│   │   │   │   │   ├── achievements-grid.component.ts
│   │   │   │   │   ├── trust-score-widget.component.ts
│   │   │   │   │   └── settings-menu.component.ts
│   │   │   │   └── profile-v2.page.html
│   │   │   │
│   │   │   └── notifications-v2/ # Centro de notificaciones
│   │   │       ├── notifications-v2.page.ts
│   │   │       ├── components/
│   │   │       │   ├── notification-card.component.ts
│   │   │       │   ├── notification-filters.component.ts
│   │   │       │   └── notification-preferences.component.ts
│   │   │       └── notifications-v2.page.html
│   │   │
│   │   ├── shared-v2/            # Componentes compartidos V2
│   │   │   ├── ui/               # Sistema de diseño
│   │   │   │   ├── button/
│   │   │   │   │   ├── button.component.ts
│   │   │   │   │   └── button.variants.ts
│   │   │   │   ├── card/
│   │   │   │   ├── input/
│   │   │   │   ├── modal/
│   │   │   │   ├── bottom-sheet/
│   │   │   │   ├── fab/
│   │   │   │   ├── chip/
│   │   │   │   ├── badge/
│   │   │   │   ├── skeleton/
│   │   │   │   └── toast/
│   │   │   │
│   │   │   ├── layout/           # Layouts mobile
│   │   │   │   ├── mobile-shell.component.ts
│   │   │   │   ├── bottom-nav.component.ts
│   │   │   │   ├── top-bar.component.ts
│   │   │   │   ├── tab-bar.component.ts
│   │   │   │   └── safe-area.directive.ts
│   │   │   │
│   │   │   ├── animations/       # Biblioteca de animaciones
│   │   │   │   ├── fade.animation.ts
│   │   │   │   ├── slide.animation.ts
│   │   │   │   ├── scale.animation.ts
│   │   │   │   ├── bounce.animation.ts
│   │   │   │   └── gesture.animation.ts
│   │   │   │
│   │   │   ├── directives/       # Directivas útiles
│   │   │   │   ├── swipe.directive.ts
│   │   │   │   ├── long-press.directive.ts
│   │   │   │   ├── lazy-load.directive.ts
│   │   │   │   ├── haptic-feedback.directive.ts
│   │   │   │   └── infinite-scroll.directive.ts
│   │   │   │
│   │   │   └── pipes/            # Pipes personalizados
│   │   │       ├── currency-format.pipe.ts
│   │   │       ├── relative-time.pipe.ts
│   │   │       ├── truncate.pipe.ts
│   │   │       └── highlight.pipe.ts
│   │   │
│   │   ├── app.config.v2.ts      # Configuración V2
│   │   ├── app.routes.v2.ts      # Rutas V2
│   │   └── app.component.v2.ts   # Root component V2
│   │
│   ├── styles/
│   │   ├── v2/
│   │   │   ├── _tokens.scss      # Design tokens
│   │   │   ├── _animations.scss  # Animaciones globales
│   │   │   ├── _utilities.scss   # Utilidades custom
│   │   │   └── theme-v2.scss     # Tema principal
│   │   └── global-v2.scss
│   │
│   ├── assets/
│   │   ├── animations/           # Lottie files
│   │   ├── icons-v2/             # Iconos optimizados
│   │   └── illustrations/        # Ilustraciones SVG
│   │
│   ├── service-worker.js         # SW custom
│   ├── manifest-v2.webmanifest   # PWA manifest
│   └── index.html
│
├── cypress/                      # E2E tests
├── playwright/                   # Integration tests
└── package.json
```

## 🎨 Sistema de Diseño V2

### Design Tokens

```scss
// _tokens.scss
$colors-v2: (
  // Primary palette
  'primary-50': #f0f4ff,
  'primary-100': #e0e9ff,
  'primary-500': #4F46E5,  // Brand color
  'primary-600': #4338ca,
  'primary-900': #312e81,
  
  // Semantic colors
  'success': #10b981,
  'warning': #f59e0b,
  'error': #ef4444,
  'info': #3b82f6,
  
  // Grays
  'gray-50': #f9fafb,
  'gray-100': #f3f4f6,
  'gray-900': #111827,
  
  // Surfaces
  'surface-base': #ffffff,
  'surface-elevated': #f9fafb,
  'surface-overlay': rgba(0, 0, 0, 0.5)
);

$spacing-v2: (
  'xs': 4px,
  'sm': 8px,
  'md': 16px,
  'lg': 24px,
  'xl': 32px,
  'xxl': 48px
);

$typography-v2: (
  'display': (font-size: 40px, line-height: 1.2, weight: 700),
  'h1': (font-size: 32px, line-height: 1.25, weight: 700),
  'h2': (font-size: 24px, line-height: 1.3, weight: 600),
  'h3': (font-size: 20px, line-height: 1.4, weight: 600),
  'body-lg': (font-size: 18px, line-height: 1.5, weight: 400),
  'body': (font-size: 16px, line-height: 1.5, weight: 400),
  'body-sm': (font-size: 14px, line-height: 1.5, weight: 400),
  'caption': (font-size: 12px, line-height: 1.4, weight: 400)
);

$shadows-v2: (
  'sm': 0 1px 2px rgba(0, 0, 0, 0.05),
  'md': 0 4px 6px rgba(0, 0, 0, 0.07),
  'lg': 0 10px 15px rgba(0, 0, 0, 0.1),
  'xl': 0 20px 25px rgba(0, 0, 0, 0.15)
);

$radius-v2: (
  'sm': 4px,
  'md': 8px,
  'lg': 16px,
  'xl': 24px,
  'full': 9999px
);
```

### Componentes Base

Todos los componentes compartirán estos principios:

1. **Standalone**: 100% standalone components
2. **Signals**: State management con Signals API
3. **Accessibility**: ARIA attributes + keyboard navigation
4. **Animations**: Smooth transitions con Web Animations API
5. **Responsive**: Mobile-first con breakpoints definidos
6. **Dark Mode**: Soporte para tema oscuro (futuro)

## 📱 Features Innovadoras V2

### 1. **Búsqueda Inteligente con IA**

```typescript
// Búsqueda por voz natural
"Necesito un auto grande para este fin de semana en Palermo"
→ Filtra por: tipo SUV/Minivan, fechas próximo fin de semana, zona Palermo

// Búsqueda visual
Tomar foto de un auto → IA identifica modelo → Busca similares
```

### 2. **Checkout en 3 Pasos (30 segundos)**

```
Paso 1: Fechas + Ubicación (autocompletado inteligente)
Paso 2: Protecciones (recomendación basada en perfil)
Paso 3: Pago (métodos guardados, 1-click)
```

### 3. **Live Tracking Durante Viajes**

```typescript
// Para renters
- Ver ubicación actual del auto (con consentimiento)
- Alertas de velocidad excesiva
- Recordatorios de devolución

// Para owners
- Monitoreo en tiempo real
- Alertas de zonas restringidas
- Historial de rutas
```

### 4. **Video Inspection Pre/Post Rental**

```typescript
// Inspección guiada con IA
- Detecta daños automáticamente
- Genera reporte con timestamps
- Compara estado pre vs post
- Previene disputas
```

### 5. **Gamificación & Rewards**

```typescript
// Sistema de niveles
- Renter: Explorer → Adventurer → Nomad → Legend
- Owner: Host → Superhost → Elite Host → Ambassador

// Logros desbloqueables
- "Primera reserva" → Badge + 100 puntos
- "5 estrellas consecutivas" → Discount coupon
- "Eco-warrior" (10 autos eléctricos) → Premium badge

// Leaderboard mensual
- Top renters más confiables
- Top hosts con mejor servicio
```

### 6. **Instant Booking para Hosts Verificados**

```typescript
// Reserva sin aprobación manual
if (host.rating >= 4.8 && host.trips >= 20 && renter.score >= 80) {
  booking.status = 'AUTO_CONFIRMED';
  // Notificación instantánea + calendario bloqueado
}
```

### 7. **Smart Pricing con ML**

```typescript
// Sugerencias de precio dinámicas
- Análisis de competencia en zona
- Temporada alta/baja
- Eventos locales (Lollapalooza, etc.)
- Ocupación histórica

// Owner dashboard
"Tu auto está 15% por debajo del mercado en estas fechas"
```

### 8. **Chat con Quick Replies & Templates**

```typescript
// Templates pre-definidos
- "¿El auto tiene bluetooth?"
- "¿Puedo agregar un conductor adicional?"
- "¿Incluye kilometraje ilimitado?"

// IA sugiere respuestas al owner
Question: "¿Tiene bluetooth?"
Suggested: "Sí, cuenta con conexión Bluetooth y Android Auto/Apple CarPlay"
```

### 9. **Wallet con Crypto Support**

```typescript
// Conversión automática
- Depositar en USDT/USDC
- Convertir a ARS/UYU al momento de pagar
- Protección contra inflación

// P2P entre usuarios
- Transferir fondos sin comisión
- Split payment entre amigos
```

### 10. **Offline Mode Completo**

```typescript
// Funcionalidades sin internet
- Ver reservas activas
- Contactar host (sincroniza después)
- Completar check-in/out con fotos
- Acceder a documentos del auto

// Background sync
- Cola de acciones pendientes
- Sincroniza cuando recupera conexión
```

## 🚀 Estrategia de Migración desde V1

### Fase 1: Fundamentos (Semanas 1-2)
- ✅ Setup inicial proyecto V2
- ✅ Sistema de diseño base
- ✅ Layout mobile + navegación
- ✅ Service Worker + offline basics
- ✅ Auth integration

### Fase 2: Features Core (Semanas 3-5)
- 🔄 Home rediseñado
- 🔄 Discover (búsqueda + mapa)
- 🔄 Car detail V2
- 🔄 Booking flow simplificado
- 🔄 Profile gamificado

### Fase 3: Features Avanzadas (Semanas 6-8)
- ⏳ Live tracking
- ⏳ Video inspection
- ⏳ Chat mejorado
- ⏳ Wallet crypto
- ⏳ Smart pricing

### Fase 4: Optimización (Semanas 9-10)
- ⏳ Performance tuning
- ⏳ A/B testing
- ⏳ Analytics integration
- ⏳ SEO optimization
- ⏳ Accessibility audit

### Fase 5: Launch (Semana 11-12)
- ⏳ Beta testing con usuarios reales
- ⏳ Bug fixes + polish
- ⏳ Documentation
- ⏳ Deploy to production
- ⏳ Marketing campaign

## 📊 Métricas de Éxito

### Performance
- ✅ Lighthouse Score: 95+ en todas las categorías
- ✅ First Contentful Paint: <1s
- ✅ Time to Interactive: <2s
- ✅ Bundle size: <300KB (gzipped)

### UX
- ✅ Tasa de conversión: +40% vs V1
- ✅ Time to booking: <2min (vs 5min en V1)
- ✅ Bounce rate: <25%
- ✅ Session duration: +60%

### Engagement
- ✅ Daily Active Users: +50%
- ✅ Retention D7: >40%
- ✅ Retention D30: >20%
- ✅ Push notification CTR: >15%

### Business
- ✅ GMV (Gross Merchandise Value): +100%
- ✅ Average booking value: +25%
- ✅ Repeat bookings: +80%
- ✅ NPS (Net Promoter Score): >70

## 🔐 Seguridad & Privacidad

### Datos Sensibles
- Encriptación end-to-end para mensajes
- Tokens JWT con rotación automática
- No almacenar datos de pago localmente
- Cumplimiento GDPR/LGPD

### Permisos Móviles
- Location: Solo cuando es necesario
- Camera: Para inspecciones y perfil
- Notifications: Opt-in explícito
- Contacts: Nunca solicitado

## 🌍 Internacionalización

### Idiomas Soportados
- 🇦🇷 Español (Argentina) - Default
- 🇺🇾 Español (Uruguay)
- 🇧🇷 Português (Brasil) - Futuro
- 🇺🇸 English - Futuro

### Localización
- Formatos de fecha/hora
- Monedas (ARS, UYU, USD)
- Unidades (km vs miles)
- Contenido cultural relevante

## 🛠️ Herramientas & Comandos

```bash
# Desarrollo
pnpm run dev:v2           # Start dev server V2
pnpm run build:v2         # Build for production
pnpm run test:v2          # Run unit tests
pnpm run e2e:v2           # Run E2E tests
pnpm run lint:v2          # Lint code

# PWA
pnpm run generate:icons   # Generate PWA icons
pnpm run test:sw          # Test service worker
pnpm run audit:pwa        # PWA audit

# Deployment
pnpm run deploy:v2:staging    # Deploy to staging
pnpm run deploy:v2:prod       # Deploy to production
```

## 📚 Referencias

- [Angular Signals](https://angular.dev/guide/signals)
- [PWA Best Practices](https://web.dev/progressive-web-apps/)
- [Material Design 3](https://m3.material.io/)
- [Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API)
- [Service Worker Cookbook](https://serviceworke.rs/)

---

**Estado actual**: 🚧 En desarrollo activo
**Última actualización**: 14 de noviembre de 2025
**Maintainers**: @ecucondorSA team
