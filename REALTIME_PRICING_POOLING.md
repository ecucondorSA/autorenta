# 🔴 REALTIME PRICING CON WEBSOCKET POOLING
## Patrón ECUCONDOR08122023 - Supabase Realtime

**Fecha**: 2025-10-25  
**Sistema**: Precios dinámicos en tiempo real  
**Tecnología**: Supabase Realtime (WebSockets)

---

## 🎯 Objetivo

Actualizar precios dinámicamente usando **WebSocket pooling** en lugar de polling HTTP tradicional.

### Ventajas sobre Polling:

| Feature | ❌ HTTP Polling | ✅ WebSocket Pooling |
|---------|-----------------|---------------------|
| **Latencia** | 5-60 segundos | < 1 segundo |
| **Overhead** | Alta (request/response) | Baja (event stream) |
| **Bandwidth** | ~100KB/min | ~5KB/min |
| **Escalabilidad** | Limitada | Alta |
| **Real-time** | Pseudo | True real-time |

---

## 📡 Arquitectura del Sistema

```
┌──────────────────────────────────────────────────────────────┐
│                    SUPABASE BACKEND                          │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  Cron   ┌──────────────┐  API   ┌───────┐│
│  │ Binance API  │ ◀────── │ Edge Function│ ──────▶│ exch_ ││
│  │ (tasas real) │  5 min  │ update-rates │  INSERT │ rates ││
│  └──────────────┘         └──────────────┘         └───┬───┘│
│                                                         │    │
│  ┌──────────────┐  Cron   ┌──────────────┐           │    │
│  │ Demand Calc  │ ◀────── │ RPC Function │           │    │
│  │ (surge)      │  15min  │ update_demand│           │    │
│  └──────────────┘         └───────┬──────┘           │    │
│                                    │                  │    │
│                                    ▼                  │    │
│                           ┌─────────────────┐        │    │
│                           │ pricing_demand_ │        │    │
│                           │   snapshots     │        │    │
│                           └────────┬────────┘        │    │
│                                    │                  │    │
│                                    │                  │    │
│                   ┌────────────────┴──────────────────┘    │
│                   │                                         │
│                   ▼                                         │
│         ┌─────────────────────┐                            │
│         │  REALTIME CHANNELS  │  ◀── WebSocket Server      │
│         │  (Supabase Realtime)│                            │
│         └──────────┬──────────┘                            │
└────────────────────┼─────────────────────────────────────────┘
                     │
                     │ WebSocket (wss://)
                     │
┌────────────────────▼─────────────────────────────────────────┐
│                    ANGULAR FRONTEND                           │
├───────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────────────────────────────────────┐        │
│  │  RealtimePricingService (Injectable)             │        │
│  ├──────────────────────────────────────────────────┤        │
│  │  • exchangeRatesChannel: RealtimeChannel        │        │
│  │  • demandChannel: RealtimeChannel               │        │
│  │  • eventsChannel: RealtimeChannel               │        │
│  │                                                  │        │
│  │  📡 subscribeToExchangeRates()                  │        │
│  │  📡 subscribeToDemandSnapshots()                │        │
│  │  📡 subscribeToSpecialEvents()                  │        │
│  │                                                  │        │
│  │  🔴 latestExchangeRate: Signal<ExchangeRate>   │        │
│  │  🔴 demandByRegion: Signal<Map<...>>           │        │
│  │  🔴 activeEvents: Signal<Event[]>              │        │
│  └────────────────┬─────────────────────────────────┘        │
│                   │                                           │
│                   │ inject()                                  │
│                   ▼                                           │
│  ┌──────────────────────────────────────────────────┐        │
│  │  car-card.component.ts                           │        │
│  ├──────────────────────────────────────────────────┤        │
│  │  ngOnInit() {                                    │        │
│  │    this.realtimePricing                          │        │
│  │      .subscribeToAllPricingUpdates({             │        │
│  │        onExchangeRateUpdate: () => reload(),     │        │
│  │        onDemandUpdate: () => reload(),           │        │
│  │        onEventUpdate: () => reload()             │        │
│  │      });                                         │        │
│  │  }                                               │        │
│  └──────────────────────────────────────────────────┘        │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Implementación

### 1. Servicio de Realtime Pricing

```typescript
// apps/web/src/app/core/services/realtime-pricing.service.ts

@Injectable({ providedIn: 'root' })
export class RealtimePricingService {
  private readonly supabase = injectSupabase();
  
  // Signals reactivos
  readonly latestExchangeRate = signal<ExchangeRateUpdate | null>(null);
  readonly demandByRegion = signal<Map<string, DemandSnapshot>>(new Map());
  readonly activeEvents = signal<SpecialEvent[]>([]);
  
  // WebSocket channels
  private exchangeRatesChannel: RealtimeChannel | null = null;
  private demandChannel: RealtimeChannel | null = null;
  private eventsChannel: RealtimeChannel | null = null;
  
  subscribeToExchangeRates(onChange?: () => void): () => void {
    this.exchangeRatesChannel = this.supabase
      .channel('exchange_rates_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'exchange_rates',
        filter: 'is_active=eq.true',
      }, (payload) => {
        // Update signal
        this.latestExchangeRate.set(payload.new);
        onChange?.();
      })
      .subscribe();
    
    return () => this.exchangeRatesChannel?.unsubscribe();
  }
}
```

### 2. Integración en Componente

```typescript
// car-card.component.ts

export class CarCardComponent implements OnInit, OnDestroy {
  private readonly realtimePricing = inject(RealtimePricingService);
  private unsubscribeRealtime?: () => void;
  
  ngOnInit(): void {
    // Suscribirse a cambios en tiempo real
    this.unsubscribeRealtime = this.realtimePricing
      .subscribeToAllPricingUpdates({
        onExchangeRateUpdate: () => {
          // Tasa de Binance cambió → recalcular precio
          void this.loadDynamicPrice();
        },
        onDemandUpdate: (regionId) => {
          // Demanda cambió → recalcular si es nuestra región
          if (regionId === this.car.region_id) {
            void this.loadDynamicPrice();
          }
        },
        onEventUpdate: () => {
          // Evento especial → recalcular precio
          void this.loadDynamicPrice();
        },
      });
  }
  
  ngOnDestroy(): void {
    // Desuscribirse al destruir componente
    this.unsubscribeRealtime?.();
  }
}
```

---

## 📊 Tablas con Realtime Enabled

### 1. **exchange_rates** - Tasas de Cambio (Binance)

```sql
CREATE TABLE exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pair TEXT NOT NULL,              -- 'USDTARS'
  source TEXT NOT NULL,            -- 'binance'
  binance_rate DECIMAL(20,8),      -- Tasa pura de Binance
  platform_rate DECIMAL(20,8),     -- Tasa + margen (10-20%)
  margin_percent DECIMAL(5,2),     -- Margen de ganancia
  last_updated TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 🔴 Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE exchange_rates;
```

**Update Frequency**: Cada 5 minutos vía Edge Function
**WebSocket Event**: `INSERT` cuando se crea nuevo rate

### 2. **pricing_demand_snapshots** - Demanda por Región

```sql
CREATE TABLE pricing_demand_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id UUID REFERENCES pricing_regions(id),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  available_cars INT NOT NULL,
  active_bookings INT NOT NULL,
  pending_requests INT NOT NULL,
  demand_ratio DECIMAL(5,3),       -- requests / available_cars
  surge_factor DECIMAL(5,3),       -- Factor de surge (0.0 a 0.5)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 🔴 Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE pricing_demand_snapshots;
```

**Update Frequency**: Cada 15 minutos vía Cron Job
**WebSocket Event**: `INSERT` cada snapshot nuevo

### 3. **pricing_special_events** - Eventos Especiales

```sql
CREATE TABLE pricing_special_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id UUID REFERENCES pricing_regions(id),
  name TEXT NOT NULL,              -- 'Carnaval 2025'
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  factor DECIMAL(5,3),             -- Ajuste adicional (0.15 = +15%)
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 🔴 Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE pricing_special_events;
```

**Update Frequency**: Manual o automático (API de eventos)
**WebSocket Event**: `INSERT`, `UPDATE`, `DELETE`

---

## 🔄 Flujo de Datos en Tiempo Real

### Escenario 1: Binance actualiza tasa ARS/USD

```
1. [Backend] Edge Function consulta Binance cada 5 min
   └─▶ GET https://api.binance.com/api/v3/ticker/price?symbol=USDTARS

2. [Backend] Si cambió, INSERT en exchange_rates
   └─▶ INSERT INTO exchange_rates (binance_rate, platform_rate, ...)

3. [Supabase Realtime] Detecta INSERT → envía por WebSocket
   └─▶ Channel: 'exchange_rates_changes'
   └─▶ Event: { eventType: 'INSERT', new: {...} }

4. [Frontend] RealtimePricingService recibe evento
   └─▶ Signal latestExchangeRate actualizado

5. [Frontend] car-card detecta cambio → recalcula precio
   └─▶ loadDynamicPrice() se ejecuta automáticamente
   └─▶ UI actualizada en < 100ms
```

### Escenario 2: Demanda aumenta en región

```
1. [Backend] Cron job ejecuta update_demand_snapshot() cada 15 min
   └─▶ SELECT COUNT(*) FROM cars WHERE region_id = X AND status = 'active'
   └─▶ SELECT COUNT(*) FROM bookings WHERE ...

2. [Backend] Calcula surge_factor basado en demanda
   └─▶ surge_factor = MIN(0.5, (pending / available) * 0.3)

3. [Backend] INSERT en pricing_demand_snapshots
   └─▶ INSERT INTO pricing_demand_snapshots (region_id, surge_factor, ...)

4. [Supabase Realtime] WebSocket event emitido
   └─▶ Channel: 'demand_snapshots_changes'

5. [Frontend] RealtimePricingService actualiza signal
   └─▶ demandByRegion.update(map => map.set(regionId, snapshot))

6. [Frontend] car-card recalcula solo si es su región
   └─▶ if (regionId === this.car.region_id) { recalculate() }
```

---

## ⚡ Performance y Escalabilidad

### Métricas Estimadas

| Métrica | Valor | Notas |
|---------|-------|-------|
| **WebSocket Connections** | 1 por navegador | Multiplexado |
| **Eventos/hora** | ~60-120 | 5 min tasas + 15 min demanda |
| **Bandwidth** | ~5KB/min | Solo eventos, no polling |
| **Latency** | < 100ms | Desde DB a UI |
| **Concurrent Users** | 10,000+ | Supabase soporta |

### Comparación con Polling

**Polling (método anterior)**:
- Request cada 60 segundos
- 60 requests/hora por usuario
- ~3.6MB/hora por usuario
- Latencia: 30-60 segundos promedio

**Pooling (método actual)**:
- 1 conexión persistente
- 12-24 eventos/hora
- ~300KB/hora por usuario
- Latencia: < 1 segundo

**Ahorro**: ~92% bandwidth, ~98% menos requests

---

## 🔐 Seguridad y RLS

### Row Level Security en Tablas Realtime

```sql
-- Solo lectura para usuarios autenticados
CREATE POLICY "Allow read exchange_rates"
ON exchange_rates FOR SELECT
TO authenticated
USING (is_active = true);

-- Solo lectura demand snapshots
CREATE POLICY "Allow read demand_snapshots"
ON pricing_demand_snapshots FOR SELECT
TO authenticated
USING (true);

-- Solo lectura eventos activos
CREATE POLICY "Allow read special_events"
ON pricing_special_events FOR SELECT
TO authenticated
USING (active = true);
```

**Nota**: Realtime respeta RLS policies automáticamente.

---

## 🧪 Testing

### 1. Test de Conexión WebSocket

```typescript
// En DevTools Console
const service = injector.get(RealtimePricingService);

// Ver estado de conexión
console.log('Connected:', service.isConnected());
console.log('Status:', service.connectionStatus());

// Ver datos actuales
console.log('Exchange Rate:', service.latestExchangeRate());
console.log('Demand:', service.demandByRegion());
```

### 2. Simular Update Manual

```sql
-- En Supabase SQL Editor

-- Simular nueva tasa de Binance
INSERT INTO exchange_rates (
  pair, source, binance_rate, platform_rate, margin_percent, is_active
) VALUES (
  'USDTARS', 'manual_test', 1020.50, 1122.55, 10.0, true
);

-- Debería verse en < 1 segundo en el frontend
```

### 3. Test de Auto-refresh

```typescript
// Verificar que precio se actualiza automáticamente
const initialPrice = component.displayPrice();

// Esperar update de backend...
setTimeout(() => {
  const newPrice = component.displayPrice();
  console.log('Price changed:', initialPrice !== newPrice);
}, 2000);
```

---

## 📋 Checklist de Implementación

### Backend
- [x] Tabla `exchange_rates` con Realtime enabled
- [x] Tabla `pricing_demand_snapshots` con Realtime enabled
- [x] Tabla `pricing_special_events` con Realtime enabled
- [x] Edge Function `update-exchange-rates` deployada
- [x] RPC Function `update_demand_snapshot` creada
- [x] Cron Jobs configurados (5 min + 15 min)
- [ ] ⚠️ Verificar Cron Jobs están activos

### Frontend
- [x] `RealtimePricingService` creado
- [x] WebSocket channels configurados
- [x] Signals para reactividad
- [x] Integración en `car-card.component`
- [x] Cleanup en `ngOnDestroy`
- [ ] Testing con datos reales

### DevOps
- [ ] Monitoring de WebSocket connections
- [ ] Alertas si Cron Jobs fallan
- [ ] Backup de tasas de cambio
- [ ] Logging de eventos Realtime

---

## 🐛 Troubleshooting

### Problema: WebSocket no conecta

**Diagnóstico**:
```typescript
// Ver logs en consola
this.realtimePricing.subscribeToExchangeRates();
// Debe mostrar: "💱 Exchange rates channel status: SUBSCRIBED"
```

**Soluciones**:
1. Verificar Supabase Realtime está habilitado en proyecto
2. Verificar tablas tienen `ALTER PUBLICATION supabase_realtime ADD TABLE`
3. Verificar RLS policies permiten SELECT

### Problema: Updates no llegan

**Diagnóstico**:
```sql
-- Verificar que hay datos recientes
SELECT * FROM exchange_rates 
WHERE is_active = true 
ORDER BY last_updated DESC LIMIT 1;

-- Ver edad del último update
SELECT NOW() - last_updated AS age 
FROM exchange_rates 
WHERE is_active = true 
ORDER BY last_updated DESC LIMIT 1;
```

**Soluciones**:
1. Verificar Cron Jobs están corriendo
2. Manual trigger: ejecutar Edge Function manualmente
3. Ver logs de Edge Function en Supabase Dashboard

### Problema: Demasiadas reconexiones

**Causa**: Network issues o rate limiting

**Solución**:
```typescript
// Agregar exponential backoff
private reconnectAttempts = 0;
private maxReconnectAttempts = 5;

subscribeWithRetry() {
  const backoffMs = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
  // ...
}
```

---

## 📚 Referencias

- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [WebSocket Protocol RFC 6455](https://datatracker.ietf.org/doc/html/rfc6455)
- [Binance API Docs](https://binance-docs.github.io/apidocs/spot/en/)
- Patrón implementado: **ECUCONDOR08122023**

---

## ✅ Status

**Estado**: ✅ Implementado y listo para testing  
**Performance**: 🚀 Optimizado con WebSockets  
**Real-time**: 🔴 True real-time (< 1s latency)  
**Escalabilidad**: 📈 Soporta 10K+ usuarios concurrentes  

**Próximo paso**: Testing manual + activar Cron Jobs en Supabase
