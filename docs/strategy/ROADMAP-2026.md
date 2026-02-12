# AutoRenta Roadmap 2026

> Guia estrategica basada en analisis competitivo de las mejores aplicaciones de car sharing del mundo (Turo, Getaround, Zipcar, SIXT).

**Ultima actualizacion:** Enero 2026
**Version:** 1.0

---

## Indice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Analisis del Mercado](#analisis-del-mercado)
3. [Estado Actual de AutoRenta](#estado-actual-de-autorentar)
4. [Gap Analysis vs Competidores](#gap-analysis-vs-competidores)
5. [Roadmap de Implementacion](#roadmap-de-implementacion)
6. [Especificaciones Tecnicas](#especificaciones-tecnicas)
7. [Metricas de Exito](#metricas-de-exito)
8. [Referencias](#referencias)

---

## Resumen Ejecutivo

AutoRenta esta bien posicionado en el mercado LATAM con features solidos de pagos, verificacion KYC, y AI. Sin embargo, para competir con lideres globales como Turo y Getaround, necesita implementar:

1. **Keyless Entry (IoT)** - Acceso sin llaves via smartphone
2. **Instant Booking** - Reserva inmediata sin aprobacion manual
3. **Alquiler por Hora** - Modelo de pricing flexible
4. **Contactless 100%** - Eliminacion total del handover fisico

---

## Analisis del Mercado

### Tamano del Mercado Global

| Segmento | 2024 | 2030-2034 | CAGR |
|----------|------|-----------|------|
| Car Rental Apps Global | $93.8B | $204.5B | 8.1% |
| P2P Car Sharing | $5.2B | $12.4B | 12.6% |
| Brasil Vehicle Rental | $8.7B | $12B | 6.6% |
| LATAM Total | 6% del global | Crecimiento 11.8% | - |

### Tendencias Clave 2026

1. **74.5% de reservas son online** - Mobile-first es obligatorio
2. **78% usuarios prefieren apps con AI** - Personalizacion inteligente
3. **Keyless entry es expectativa** - No es diferenciador, es requisito
4. **Sostenibilidad importa** - Filtros EV, carbon tracking
5. **Flexibilidad > Precio** - Cancelacion gratis gana clientes

### Competidores Principales

| Competidor | Mercado | Fortaleza Principal | Debilidad |
|------------|---------|---------------------|-----------|
| **Turo** | US, UK, CA | Brand recognition, 5M+ usuarios | No opera en LATAM |
| **Getaround** | US, EU | Keyless tech, alquiler por hora | Pricing agresivo |
| **Localiza** | Brasil | Flota propia, cobertura nacional | No es P2P |
| **Zipcar** | Global | B2B corporate, ubicaciones fijas | No es P2P |
| **AutoRenta** | LATAM | MercadoPago, AI verification | Sin keyless, sin hourly |

---

## Estado Actual de AutoRenta

### Features Implementados (Fortalezas)

#### Pagos y Finanzas
- [x] MercadoPago integration completa (pagos, pre-auth, refunds, money-out)
- [x] PayPal como alternativa internacional
- [x] Wallet virtual con ledger completo
- [x] Precios dinamicos basados en demanda
- [x] Sistema de retiros para owners
- [x] Bonus-malus para pricing personalizado

#### Verificacion y Seguridad
- [x] Face verification con liveness detection
- [x] Document analyzer con Gemini AI (CNH, CRLV)
- [x] Risk scoring automatizado
- [x] Video inspection para entrega/devolucion
- [x] Damage detection con AI

#### Bookings y Operaciones
- [x] Flujo de reserva completo con state machine
- [x] Extensiones de reserva
- [x] Sistema de disputas
- [x] Contratos digitales PDF
- [x] Mensajeria in-app
- [x] Notificaciones push

#### Subscripciones y Proteccion
- [x] Tiers: Standard, Black, Luxury
- [x] Seguros integrados
- [x] Franquicias configurables
- [x] Bonus Protector (proteccion adicional)

#### AI y Automatizacion
- [x] Recomendaciones de autos
- [x] Generacion de fotos con AI
- [x] Analisis de reputacion
- [x] Marketing content generator
- [x] SEO automation

#### Infraestructura
- [x] 129+ componentes UI reutilizables
- [x] PWA instalable
- [x] Android app (Capacitor)
- [x] Supabase backend escalable
- [x] Edge Functions para logica serverless

### Stack Tecnologico Actual

```
Frontend:     Angular 18+ (Standalone, Signals) + Ionic
Estilos:      Tailwind CSS
Backend:      Supabase (PostgreSQL, Auth, Storage, Edge Functions)
Pagos:        MercadoPago API + PayPal
AI:           Google Gemini
Mobile:       Capacitor (Android)
CI/CD:        GitHub Actions + Cloudflare Pages
Monitoring:   Sentry
```

---

## Gap Analysis vs Competidores

### Prioridad CRITICA (Rojo)

| Feature | Turo | Getaround | AutoRenta | Impacto |
|---------|------|-----------|-----------|---------|
| Keyless Entry | Si | Si | **NO** | Diferenciador clave, +30% conversiones |
| Instant Booking | Si | Si | **NO** | Reduce friccion, +40% bookings |
| Alquiler por Hora | No | Si ($5/hr) | **NO** | Mercado urbano, trips cortos |
| Contactless 100% | Parcial | Si | **PARCIAL** | Expectativa post-COVID |

### Prioridad ALTA (Amarillo)

| Feature | Competidores | AutoRenta | Impacto |
|---------|--------------|-----------|---------|
| Multi-idioma (10+) | Si | ES/PT | Expansion internacional |
| Filtros EV/Hibridos | Si | Basico | Tendencia sostenibilidad |
| Cancelacion full refund | Si | Parcial | Confianza del usuario |
| Video chat in-app | Si | No | Comunicacion rica |
| Gamification avanzada | Si | Basico | Retencion usuarios |

### Prioridad MEDIA (Verde)

| Feature | Competidores | AutoRenta | Impacto |
|---------|--------------|-----------|---------|
| Voice assistant | Algunos | No | Futuro diferenciador |
| Blockchain KYC | Emergente | No | Seguridad avanzada |
| AR car preview | Algunos | No | Wow factor |
| Carbon tracking | Si | No | ESG compliance |
| B2B Corporate portal | Si | Limitado | Nuevo revenue stream |

---

## Roadmap de Implementacion

### Fase 1: Quick Wins (Q1 2026)

**Objetivo:** Cerrar gaps criticos de conversion sin cambios mayores de arquitectura.

#### 1.1 Instant Booking Mode
**Tiempo estimado:** 2-3 semanas

```typescript
// Nuevo campo en cars table
instant_booking_enabled: boolean;
instant_booking_max_days: number; // Limite de dias para instant
instant_booking_min_rating: number; // Rating minimo del renter

// Flujo:
// 1. Owner activa instant booking en su listing
// 2. Renter con rating >= min puede reservar sin aprobacion
// 3. Booking pasa directamente a 'confirmed'
// 4. Owner recibe notificacion (no solicitud)
```

**Cambios requeridos:**
- [ ] Migration: agregar campos instant_booking a cars
- [ ] UI: Toggle en car listing para owners
- [ ] Service: Bypass approval flow si instant_booking enabled
- [ ] Notificaciones: Nuevo tipo "instant_booking_confirmed"

#### 1.2 Alquiler por Hora
**Tiempo estimado:** 3-4 semanas

```typescript
// Nuevo pricing model
interface HourlyPricing {
  enabled: boolean;
  price_per_hour_cents: number;
  minimum_hours: number; // Default: 2
  maximum_hours: number; // Default: 12
  hourly_available_start: string; // "06:00"
  hourly_available_end: string; // "22:00"
}

// Calculo:
// - Menos de 24h: precio por hora
// - 24h+: precio por dia (existente)
```

**Cambios requeridos:**
- [ ] Migration: agregar hourly pricing a cars
- [ ] UI: Selector hora inicio/fin en booking flow
- [ ] Service: pricing.service.ts - calcular hourly
- [ ] Calendario: mostrar disponibilidad por hora

#### 1.3 Cancelacion Flexible
**Tiempo estimado:** 1-2 semanas

```typescript
// Nuevas politicas de cancelacion
type CancellationPolicy =
  | 'flexible'      // 100% refund hasta 24h antes
  | 'moderate'      // 100% hasta 5 dias, 50% hasta 24h
  | 'strict'        // 50% hasta 7 dias, 0% despues
  | 'super_strict'; // 50% hasta 30 dias, 0% despues

// Owner elige politica al crear listing
// UI muestra claramente la politica al renter
```

**Cambios requeridos:**
- [ ] Migration: agregar cancellation_policy a cars
- [ ] UI: Selector de politica en car listing
- [ ] UI: Badge claro en car card y detail
- [ ] Service: refund.service.ts - aplicar politica

#### 1.4 Filtros EV/Hibridos Destacados
**Tiempo estimado:** 1 semana

**Cambios requeridos:**
- [ ] UI: Filtro "Solo electricos" en marketplace
- [ ] UI: Badge "EV" o "Hibrido" en car cards
- [ ] UI: Seccion destacada "Autos Sustentables"
- [ ] SEO: Landing page /electricos

### Fase 2: Diferenciadores Core (Q2 2026)

**Objetivo:** Implementar keyless entry y contactless para igualar a competidores lideres.

#### 2.1 Keyless Entry Integration
**Tiempo estimado:** 8-12 semanas

**Opcion A: Smartcar API (Recomendado)**
```typescript
// Smartcar soporta 40+ marcas sin hardware adicional
// https://smartcar.com/docs/api

// Flujo:
// 1. Owner conecta su vehiculo via Smartcar OAuth
// 2. AutoRenta obtiene permisos: lock/unlock, location, odometer
// 3. Renter desbloquea desde la app durante su booking
// 4. Al finalizar, se bloquea automaticamente

import Smartcar from 'smartcar';

const client = new Smartcar.AuthClient({
  clientId: process.env.SMARTCAR_CLIENT_ID,
  clientSecret: process.env.SMARTCAR_CLIENT_SECRET,
  redirectUri: 'https://autorentar.com/smartcar/callback',
});

// Unlock vehicle
async function unlockVehicle(vehicleId: string, accessToken: string) {
  const vehicle = new Smartcar.Vehicle(vehicleId, accessToken);
  await vehicle.unlock();
}
```

**Opcion B: Hardware IoT (INVERS, Geotab)**
```
- Requiere instalacion de dispositivo OBD-II
- Mayor costo inicial pero mas control
- Mejor para flotas propias
- Considerar para fase futura
```

**Cambios requeridos:**
- [ ] Edge Function: smartcar-connect, smartcar-callback
- [ ] Migration: agregar smartcar_vehicle_id a cars
- [ ] UI: Flujo de conexion Smartcar para owners
- [ ] UI: Boton "Desbloquear" en booking activo
- [ ] Service: keyless.service.ts
- [ ] Permisos: Solo durante periodo de booking

#### 2.2 Contactless 100%
**Tiempo estimado:** 4-6 semanas (depende de 2.1)

**Componentes:**
1. **Check-in digital**
   - Fotos del vehiculo obligatorias via app
   - Confirmacion de estado (combustible, kilometraje)
   - Firma digital de aceptacion

2. **Check-out digital**
   - Fotos post-uso
   - Comparacion automatica con AI (damage detection)
   - Reporte de diferencias

3. **Ubicacion del vehiculo**
   - GPS tracking durante pickup
   - Guia al vehiculo en el mapa
   - Notificacion al owner cuando renter llega

```typescript
// Digital check-in flow
interface DigitalCheckin {
  booking_id: string;
  timestamp: string;
  photos: {
    front: string;
    back: string;
    left: string;
    right: string;
    dashboard: string; // odometer, fuel
  };
  odometer_reading: number;
  fuel_level: 'empty' | 'quarter' | 'half' | 'three_quarters' | 'full';
  confirmed_condition: boolean;
  digital_signature: string;
}
```

**Cambios requeridos:**
- [ ] UI: Flujo de check-in con fotos obligatorias
- [ ] Service: Comparacion AI de fotos check-in vs check-out
- [ ] UI: Mapa con ubicacion del vehiculo
- [ ] Notificaciones: Alertas de llegada/salida

#### 2.3 Multi-idioma Completo
**Tiempo estimado:** 4-6 semanas

**Idiomas prioritarios:**
1. Espanol (actual) - 100%
2. Portugues (actual) - ~80%
3. Ingles - 0% (PRIORITARIO para turistas)

**Implementacion:**
```typescript
// Usar Angular i18n o ngx-translate
// Archivos de traduccion:
// - src/assets/i18n/es.json
// - src/assets/i18n/pt.json
// - src/assets/i18n/en.json

// Detectar idioma del navegador
// Permitir cambio manual en settings
```

### Fase 3: Innovacion (Q3-Q4 2026)

#### 3.1 B2B Corporate Portal
**Tiempo estimado:** 8-12 semanas

**Features:**
- Dashboard para empresas
- Gestion de empleados autorizados
- Facturacion consolidada mensual
- Reportes de uso y gastos
- Politicas de uso corporativas

#### 3.2 Gamification Avanzada
**Tiempo estimado:** 4-6 semanas

```typescript
// Sistema de badges y achievements
interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  criteria: AchievementCriteria;
}

// Ejemplos:
// - "First Ride" - Completar primera reserva
// - "Road Warrior" - 10 reservas completadas
// - "5 Stars" - Mantener rating 5.0 por 10 reservas
// - "Eco Driver" - 5 reservas en vehiculos electricos
// - "Super Host" - Owner con 50 reservas exitosas

// Leaderboard mensual con premios
// - Top 10 renters: descuentos
// - Top 10 owners: menor comision
```

#### 3.3 Carbon Tracking
**Tiempo estimado:** 2-3 semanas

```typescript
// Calcular huella de carbono por viaje
interface CarbonFootprint {
  booking_id: string;
  distance_km: number;
  vehicle_type: 'gasoline' | 'diesel' | 'hybrid' | 'electric';
  emissions_kg_co2: number;
  trees_equivalent: number; // Para visualizacion
}

// Mostrar en booking confirmation
// Acumular en perfil de usuario
// Opcion de compensar con donacion
```

#### 3.4 Voice Assistant Integration
**Tiempo estimado:** 6-8 semanas

**Comandos de voz:**
- "Hey AutoRenta, busca un auto para manana"
- "Desbloquea mi auto"
- "Extiende mi reserva 2 horas"
- "Contacta al dueno"

**Integracion:**
- Google Assistant Actions
- Siri Shortcuts (iOS futuro)

---

## Especificaciones Tecnicas

### Arquitectura Keyless Entry

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   AutoRenta     │     │   Smartcar      │     │   Vehicle       │
│   Mobile App    │────>│   API           │────>│   Telematics    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │                       │                       │
        v                       v                       v
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Supabase      │<────│   Edge          │<────│   Webhook       │
│   Database      │     │   Functions     │     │   Events        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Base de Datos - Nuevas Tablas

```sql
-- Instant Booking Config
ALTER TABLE cars ADD COLUMN instant_booking_enabled BOOLEAN DEFAULT false;
ALTER TABLE cars ADD COLUMN instant_booking_max_days INTEGER DEFAULT 7;
ALTER TABLE cars ADD COLUMN instant_booking_min_rating DECIMAL(2,1) DEFAULT 4.0;

-- Hourly Pricing
ALTER TABLE cars ADD COLUMN hourly_pricing_enabled BOOLEAN DEFAULT false;
ALTER TABLE cars ADD COLUMN price_per_hour_cents INTEGER;
ALTER TABLE cars ADD COLUMN hourly_min_hours INTEGER DEFAULT 2;
ALTER TABLE cars ADD COLUMN hourly_max_hours INTEGER DEFAULT 12;

-- Cancellation Policy
ALTER TABLE cars ADD COLUMN cancellation_policy TEXT DEFAULT 'moderate';

-- Keyless Entry
CREATE TABLE vehicle_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id UUID REFERENCES cars(id),
  provider TEXT NOT NULL, -- 'smartcar', 'invers', 'geotab'
  provider_vehicle_id TEXT NOT NULL,
  access_token TEXT, -- encrypted
  refresh_token TEXT, -- encrypted
  token_expires_at TIMESTAMPTZ,
  capabilities JSONB, -- ['lock', 'unlock', 'location', 'odometer']
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Digital Check-in/out
CREATE TABLE digital_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id),
  type TEXT NOT NULL, -- 'checkin', 'checkout'
  photos JSONB NOT NULL,
  odometer_reading INTEGER,
  fuel_level TEXT,
  notes TEXT,
  digital_signature TEXT,
  ai_damage_report JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Achievements/Gamification
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  points INTEGER DEFAULT 0,
  criteria JSONB NOT NULL
);

CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  achievement_id UUID REFERENCES achievements(id),
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- Carbon Tracking
CREATE TABLE carbon_footprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id),
  distance_km DECIMAL(10,2),
  vehicle_type TEXT,
  emissions_kg_co2 DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Edge Functions Nuevas

| Function | Trigger | Descripcion |
|----------|---------|-------------|
| `smartcar-connect` | Manual | Inicia OAuth con Smartcar |
| `smartcar-callback` | Webhook | Procesa conexion exitosa |
| `smartcar-refresh-token` | Cron | Renueva tokens expirados |
| `vehicle-unlock` | Manual | Desbloquea vehiculo via API |
| `vehicle-lock` | Manual | Bloquea vehiculo via API |
| `digital-checkin` | Manual | Procesa check-in digital |
| `compare-inspections` | Manual | Compara fotos check-in vs check-out |
| `calculate-carbon` | Trigger | Calcula huella de carbono post-booking |
| `check-achievements` | Trigger | Verifica y otorga achievements |

### Integraciones Externas

| Servicio | Uso | Costo Estimado |
|----------|-----|----------------|
| Smartcar | Keyless entry | $0.50/vehiculo/mes |
| Google Maps | Ubicacion vehiculos | Ya integrado |
| Gemini AI | Comparacion fotos | Ya integrado |
| Twilio | SMS internacionales | ~$0.01/SMS |

---

## Metricas de Exito

### KPIs por Fase

#### Fase 1 (Q1 2026)

| Metrica | Actual | Target | Como Medir |
|---------|--------|--------|------------|
| Conversion booking | ~15% | 25% | bookings / car_views |
| Tiempo medio reserva | ~8 min | <3 min | analytics |
| Bookings por hora | 0% | 20% | bookings con hourly=true |
| Cancelaciones | ~25% | <15% | cancelled / total |

#### Fase 2 (Q2 2026)

| Metrica | Actual | Target | Como Medir |
|---------|--------|--------|------------|
| Autos con keyless | 0% | 30% | cars con smartcar_id |
| Check-ins digitales | 0% | 80% | digital_inspections |
| NPS usuarios | ~35 | >50 | surveys |
| Disputas por danos | ~10% | <5% | disputes / bookings |

#### Fase 3 (Q3-Q4 2026)

| Metrica | Actual | Target | Como Medir |
|---------|--------|--------|------------|
| Clientes B2B | 0 | 10 | organizations activas |
| Revenue B2B | $0 | 15% total | facturacion corporativa |
| Usuarios con 5+ badges | 0% | 30% | user_achievements |
| Bookings EV | ~5% | 20% | vehicle_type='electric' |

### Dashboard de Metricas

Agregar al admin dashboard:
- Grafico: Conversion funnel (views -> bookings -> completed)
- Grafico: Instant vs Manual bookings
- Grafico: Hourly vs Daily bookings
- Tabla: Top achievements desbloqueados
- Mapa: Vehiculos con keyless activo

---

## Referencias

### Documentacion de Competidores

- [Turo 2026 Marketplace Updates](https://turo.com/blog/news/2026-marketplace-updates/)
- [Turo Host Tools](https://turo.com/us/en/car-rental/united-states/host-tools)
- [Turo Protection Plans](https://help.turo.com/en_us/protection-plans-including-insurance-or-us-guests-HkwgBNgN9)
- [Getaround How It Works](https://www.getaround.com/how-it-works)

### Tecnologia Keyless

- [Smartcar Documentation](https://smartcar.com/docs/api)
- [INVERS P2P Carsharing](https://invers.com/en/p2p-carsharing/)
- [Tapkey Car Sharing](https://tapkey.io/en/car-sharing/)
- [Geotab Keyless](https://www.geotab.com/)

### Mercado LATAM

- [Brazil Vehicle Rental Market](https://www.mordorintelligence.com/industry-reports/brazil-vehicle-rental-market)
- [LATAM Car Rental Outlook](https://www.grandviewresearch.com/horizon/outlook/car-rental-market/latin-america)
- [Localiza Company](https://en.wikipedia.org/wiki/Localiza)

### UX/UI Best Practices

- [Car Rental App Features](https://www.fitdesignldn.com/post/10-essential-car-rental-app-features-that-will-attract-users)
- [Car Rental UX Design 2025](https://medium.com/@myousufraza/car-rental-mobile-app-ui-ux-design-in-2025-0abdaf0dc80e)
- [P2P Car Sharing Features](https://www.fatbit.com/fab/peer-to-peer-car-sharing-marketplace-features-business-model/)

### Verificacion KYC

- [Biometric Verification Car Rental](https://www.togggle.io/blog/biometric-verification-revolutionizing-car-rental-kyc)
- [ID Verification Best Practices](https://www.klippa.com/en/identity-verification/car-rentals/)
- [Decentralized KYC](https://www.togggle.io/blog/enhancing-user-verification-with-decentralized-identity-in-car-rentals)

---

## Changelog

| Version | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | 2026-01-20 | Documento inicial basado en analisis competitivo |

---

**Autor:** Claude AI + Equipo AutoRenta
**Contacto:** dev@autorentar.com
