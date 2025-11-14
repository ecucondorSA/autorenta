# AutoRenta V2 🚀

> **Nueva generación** de la plataforma de alquiler P2P de autos. Progressive Web App móvil-first con arquitectura offline-first y experiencia nativa.

[![PWA](https://img.shields.io/badge/PWA-Ready-success)](https://web.dev/progressive-web-apps/)
[![Angular 17+](https://img.shields.io/badge/Angular-17+-red)](https://angular.dev)
[![Offline First](https://img.shields.io/badge/Offline-First-blue)](https://web.dev/offline-cookbook/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)](https://www.typescriptlang.org/)

---

## 🎯 Qué hay de nuevo en V2

### ✨ Features Principales

- **🔥 PWA Completa**: Instalable, offline-ready, notificaciones push
- **⚡ Performance Extremo**: <1s First Contentful Paint, 60 FPS constantes
- **📱 Mobile-First**: Diseñado desde cero para móvil con gestos nativos
- **🎨 Sistema de Diseño Moderno**: Design tokens, componentes reutilizables
- **🔄 Offline-First**: Funciona completamente sin internet con sincronización automática
- **🎮 Micro-interacciones**: Animaciones fluidas y feedback háptico
- **♿ Accesibilidad AAA**: WCAG 2.1 Level AAA compliant
- **🌐 i18n Ready**: Soporte multi-idioma desde el inicio

### 🆕 Nuevas Funcionalidades

| Feature | Descripción | Estado |
|---------|-------------|--------|
| **Búsqueda por Voz** | "Necesito un SUV este fin de semana en Palermo" | ✅ Diseñado |
| **Video Inspection** | Inspección guiada con detección de daños por IA | ✅ Diseñado |
| **Live Tracking** | Ubicación en tiempo real durante viajes | ✅ Diseñado |
| **Instant Booking** | Reserva sin aprobación para hosts verificados | ✅ Diseñado |
| **Smart Pricing** | Sugerencias dinámicas con ML | ✅ Diseñado |
| **Wallet Crypto** | Soporte para USDT/USDC | ✅ Diseñado |
| **Gamificación** | Sistema de niveles, logros y leaderboards | ✅ Diseñado |
| **Chat Mejorado** | Quick replies, templates, mensajes de voz | ✅ Diseñado |

---

## 🏗️ Arquitectura

### Stack Tecnológico

```
Frontend
├── Angular 17+ (Standalone Components)
├── Signals API (State Management)
├── TypeScript 5+
├── SCSS Modules
├── Service Workers (Offline + Caching)
└── Web APIs (Animations, Share, Vibration, etc.)

Backend
├── Supabase (Auth, Database, Storage, Realtime)
├── Cloudflare Workers (Edge Computing)
└── Edge Functions (Serverless Logic)

PWA Stack
├── Workbox (Service Worker toolkit)
├── IndexedDB (Local persistence)
├── Background Sync (Offline actions)
└── Push Notifications
```

### Estructura del Proyecto

```
apps/web-v2/
├── src/
│   ├── app/
│   │   ├── core-v2/              # Services, stores, guards
│   │   ├── features-v2/          # Feature modules (pages)
│   │   ├── shared-v2/            # Shared components, directives, pipes
│   │   ├── app.config.v2.ts
│   │   ├── app.routes.v2.ts
│   │   └── app.component.v2.ts
│   ├── styles/
│   │   └── v2/
│   │       ├── _tokens.scss      # Design tokens
│   │       ├── _animations.scss  # Animation library
│   │       ├── _utilities.scss   # Utility classes
│   │       └── theme-v2.scss     # Main theme
│   ├── assets/
│   ├── manifest-v2.webmanifest
│   ├── service-worker.js
│   ├── offline.html
│   └── index.html
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8+
- Angular CLI 17+

### Instalación

```bash
# Clonar el repo (si aún no lo tienes)
git clone https://github.com/ecucondorSA/autorenta.git
cd autorenta

# Cambiar a la rama v2
git checkout v2

# Instalar dependencias
pnpm install

# Configurar variables de entorno
cp .env.v2.example .env.v2.local
# Editar .env.v2.local con tus credenciales

# Iniciar dev server
pnpm run dev:v2
```

La aplicación estará disponible en `http://localhost:4200`

### Comandos Principales

```bash
# Desarrollo
pnpm run dev:v2              # Start dev server
pnpm run dev:v2:open         # Start + open browser

# Testing
pnpm run test:v2             # Run unit tests
pnpm run test:v2:coverage    # Run tests with coverage
pnpm run e2e:v2              # Run E2E tests

# Linting & Formatting
pnpm run lint:v2             # Lint code
pnpm run lint:v2:fix         # Fix lint errors
pnpm run format:v2           # Format code

# Build
pnpm run build:v2            # Production build
pnpm run build:v2:stats      # Build with bundle analyzer

# PWA
pnpm run pwa:audit           # Lighthouse PWA audit
pnpm run pwa:test            # Test service worker

# Deployment
pnpm run deploy:v2:staging   # Deploy to staging
pnpm run deploy:v2:prod      # Deploy to production
```

---

## 📱 PWA Features

### Capacidades Offline

La aplicación funciona completamente offline con estas capacidades:

- ✅ Ver reservas activas
- ✅ Acceder a detalles de autos guardados
- ✅ Completar check-in/check-out
- ✅ Enviar mensajes (se sincronizan después)
- ✅ Ver wallet y transacciones
- ✅ Navegar por el perfil

### Estrategias de Caching

```javascript
// API Calls: Network First con timeout
fetch('/api/cars') → Network (3s timeout) → Cache fallback

// Imágenes: Stale While Revalidate
fetch('/uploads/car.jpg') → Cache first → Update in background

// Assets: Cache First
fetch('/main.js') → Cache → Network if not found
```

### Instalación PWA

La app solicita instalación automáticamente después de:
- 2 visitas al sitio
- 30 segundos de navegación activa
- Al realizar una acción significativa (ej: guardar un auto favorito)

---

## 🎨 Sistema de Diseño

### Design Tokens

Todos los valores de diseño están centralizados en `_tokens.scss`:

```scss
// Colors
$primary-500: #4F46E5;
$success-500: #10b981;
$error-500: #ef4444;

// Spacing
$space-4: 1rem;  // 16px
$space-6: 1.5rem; // 24px

// Typography
$text-base: 1rem; // 16px
$font-semibold: 600;

// Shadows
$shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
```

### Componentes UI

Todos los componentes base están en `shared-v2/ui/`:

```typescript
// Button
<app-button variant="primary" size="lg">
  Reservar ahora
</app-button>

// Card
<app-card elevated>
  <app-card-header>Título</app-card-header>
  <app-card-content>Contenido</app-card-content>
</app-card>

// Bottom Sheet
<app-bottom-sheet [isOpen]="showSheet">
  Contenido del sheet
</app-bottom-sheet>
```

### Animaciones

Biblioteca completa de animaciones en `_animations.scss`:

```html
<!-- Fade in -->
<div class="animate-fade-in">Aparece gradualmente</div>

<!-- Slide up -->
<div class="animate-slide-up">Sube desde abajo</div>

<!-- Scale in -->
<button class="animate-scale-in">Botón con escala</button>
```

---

## 🧪 Testing

### Unit Tests

```bash
# Ejecutar todos los tests
pnpm run test:v2

# Ejecutar con coverage
pnpm run test:v2:coverage

# Watch mode
pnpm run test:v2:watch

# Test específico
pnpm run test:v2 -- --include="**/home.page.spec.ts"
```

### E2E Tests

```bash
# Run all E2E
pnpm run e2e:v2

# Run specific suite
pnpm run e2e:v2:booking
pnpm run e2e:v2:wallet

# Debug mode
pnpm run e2e:v2:debug

# UI mode
pnpm run e2e:v2:ui
```

---

## 📊 Performance

### Targets

| Métrica | Target | Actual |
|---------|--------|--------|
| First Contentful Paint | <1s | 🎯 TBD |
| Time to Interactive | <2s | 🎯 TBD |
| Lighthouse Performance | 95+ | 🎯 TBD |
| Lighthouse PWA | 100 | 🎯 TBD |
| Bundle size (gzipped) | <300KB | 🎯 TBD |

### Optimizaciones

- ✅ Code splitting por ruta
- ✅ Lazy loading de módulos
- ✅ Image optimization (WebP + lazy load)
- ✅ Tree shaking agresivo
- ✅ CSS purging
- ✅ Service Worker caching
- ✅ Preload critical resources

---

## 🚢 Deployment

### Staging

```bash
pnpm run deploy:v2:staging
```

Deploy automático a Cloudflare Pages (staging):
- URL: `https://v2-staging.autorenta.com`
- Branch: `v2`
- Auto-deploy on push

### Production

```bash
pnpm run deploy:v2:prod
```

Deploy a producción:
- URL: `https://app.autorenta.com`
- Branch: `v2` (después de merge a `main`)
- Manual trigger required

---

## 🤝 Contributing

### Branching Strategy

```
v2 (base)
├── feature/v2-home-page
├── feature/v2-booking-flow
├── feature/v2-wallet
└── fix/v2-offline-sync
```

### Commit Convention

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(v2): add voice search to home page
fix(v2): resolve offline sync for bookings
perf(v2): optimize image loading
docs(v2): update architecture diagram
```

### PR Process

1. Crear feature branch desde `v2`
2. Implementar cambios + tests
3. Asegurar que pasen todos los checks (lint, test, build)
4. Crear PR hacia `v2` con descripción detallada
5. Code review by 1+ team member
6. Merge con squash

---

## 📖 Documentación

### Guías Principales

- [V2_ARCHITECTURE.md](../V2_ARCHITECTURE.md) - Arquitectura completa
- [CLAUDE.md](../CLAUDE.md) - Referencia general del proyecto
- [CLAUDE_WORKFLOWS.md](../CLAUDE_WORKFLOWS.md) - Workflows y comandos

### Tutoriales

- [ ] Crear nuevo feature module
- [ ] Agregar componente al design system
- [ ] Implementar estrategia de caching
- [ ] Configurar push notifications
- [ ] Testing con Playwright

---

## 🐛 Known Issues & Roadmap

### Known Issues

- [ ] Service Worker no se actualiza en dev hot reload
- [ ] IndexedDB quota exceeded en algunos dispositivos
- [ ] Push notifications no funcionan en iOS Safari

### Roadmap Q1 2026

- [ ] Dark mode
- [ ] Soporte multi-idioma (PT-BR, EN)
- [ ] Integración con Google Calendar
- [ ] Video call para inspecciones
- [ ] AR view de autos

---

## 📞 Soporte

- **Email**: dev@autorenta.com
- **Slack**: #autorenta-v2-dev
- **GitHub Issues**: [Crear issue](https://github.com/ecucondorSA/autorenta/issues/new)

---

## 📄 Licencia

Proprietary - © 2025 AutoRenta SA

---

**🎉 Bienvenido a AutoRenta V2!** Si tenés dudas, consultá la documentación o contactanos en Slack.
