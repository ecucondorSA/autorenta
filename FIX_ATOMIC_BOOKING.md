# 🔧 Fix Crítico: Atomicidad en Creación de Reservas

## 📋 Problema Identificado

**Severidad**: 🔴 CRÍTICO  
**Impacto**: Alto riesgo de "reservas fantasma"  
**Ubicación**: `booking-detail-payment.page.ts` método `createNewBooking()`

### Descripción del Problema

El flujo actual crea reservas en **3 pasos no transaccionales**:

```typescript
// ❌ ANTES (NO ATÓMICO)
1. Crear booking          → INSERT INTO bookings
2. Crear risk snapshot    → INSERT INTO risk_snapshots  
3. Actualizar booking     → UPDATE bookings SET risk_snapshot_id

// Si falla el paso 2 o 3 → RESERVA FANTASMA
```

**Consecuencias**:
- Booking queda en BD sin datos de pago/riesgo
- Auto bloqueado innecesariamente
- Pérdidas económicas
- Mala experiencia de usuario

---

## ✅ Solución Implementada

### 1. Función RPC Atómica en Supabase

**Archivo**: `/home/edu/autorenta/database/fix-atomic-booking.sql`

```sql
CREATE OR REPLACE FUNCTION create_booking_atomic(...)
RETURNS TABLE (
  success BOOLEAN,
  booking_id UUID,
  risk_snapshot_id UUID,
  error_message TEXT
)
```

**Características**:
- ✅ Una sola transacción de BD
- ✅ Validación de disponibilidad incluida
- ✅ Rollback automático si falla cualquier paso
- ✅ Retorno de IDs para seguimiento
- ✅ Seguridad con `SECURITY DEFINER`

### 2. Nuevo Método en BookingsService

**Archivo**: `apps/web/src/app/core/services/bookings.service.ts`

```typescript
async createBookingAtomic(params: {
  carId: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  currency: string;
  paymentMode: string;
  coverageUpgrade?: string;
  authorizedPaymentId?: string;
  walletLockId?: string;
  riskSnapshot: { ... };
}): Promise<{
  success: boolean;
  bookingId?: string;
  riskSnapshotId?: string;
  error?: string;
}>
```

### 3. Componente Actualizado

**Archivo**: `apps/web/src/app/features/bookings/booking-detail-payment/booking-detail-payment.page.ts`

```typescript
// ✅ AHORA (ATÓMICO)
private async createNewBooking(): Promise<void> {
  const result = await this.bookingsService.createBookingAtomic({
    // ... todos los parámetros en un solo objeto
  });

  if (!result.success) {
    throw new Error(result.error);
  }

  // Todo se creó exitosamente o nada se creó
}
```

---

## 🚀 Instalación

### Paso 1: Aplicar Script SQL

```bash
# Opción A: Con psql
psql -U postgres -d autorenta < database/fix-atomic-booking.sql

# Opción B: Supabase Dashboard
# 1. Ir a SQL Editor
# 2. Copiar contenido de fix-atomic-booking.sql
# 3. Ejecutar
```

### Paso 2: Verificar Función

```sql
-- Verificar que la función existe
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_name = 'create_booking_atomic'
  AND routine_schema = 'public';

-- Debe retornar 1 fila
```

### Paso 3: Compilar Aplicación

```bash
cd /home/edu/autorenta/apps/web
npm run build

# O en desarrollo
npm start
```

---

## 🧪 Testing

### Test 1: Reserva Exitosa

```typescript
// En el navegador, abrir DevTools Console
const result = await bookingsService.createBookingAtomic({
  carId: 'uuid-auto-disponible',
  startDate: '2025-11-01T00:00:00Z',
  endDate: '2025-11-05T00:00:00Z',
  totalAmount: 50000,
  currency: 'ARS',
  paymentMode: 'card',
  riskSnapshot: {
    dailyPriceUsd: 50,
    securityDepositUsd: 500,
    vehicleValueUsd: 15000,
    driverAge: 30,
    coverageType: 'full',
    paymentMode: 'card',
    totalUsd: 200,
    totalArs: 50000,
    exchangeRate: 250
  }
});

console.log(result);
// ✅ Debe retornar: { success: true, bookingId: 'uuid', riskSnapshotId: 'uuid' }
```

### Test 2: Auto No Disponible

```typescript
const result = await bookingsService.createBookingAtomic({
  carId: 'uuid-auto-con-reserva-existente',
  startDate: '2025-11-01T00:00:00Z',
  endDate: '2025-11-05T00:00:00Z',
  // ... resto de parámetros
});

console.log(result);
// ✅ Debe retornar: { success: false, error: 'El vehículo no está disponible...' }
```

### Test 3: Verificar No Hay Reservas Fantasma

```sql
-- Verificar que NO existen bookings sin risk_snapshot_id
SELECT 
  id,
  car_id,
  status,
  risk_snapshot_id,
  created_at
FROM bookings
WHERE risk_snapshot_id IS NULL
  AND status != 'cancelled'
  AND created_at > NOW() - INTERVAL '1 hour';

-- ✅ Debe retornar 0 filas (ninguna reserva sin risk snapshot)
```

### Test 4: Integridad de Datos

```sql
-- Verificar que cada booking tiene su risk snapshot
SELECT 
  b.id as booking_id,
  b.status,
  rs.id as risk_snapshot_id,
  rs.total_usd,
  rs.total_ars
FROM bookings b
LEFT JOIN risk_snapshots rs ON rs.booking_id = b.id
WHERE b.created_at > NOW() - INTERVAL '1 hour'
  AND b.status != 'cancelled';

-- ✅ Todas las filas deben tener risk_snapshot_id != NULL
```

---

## 📊 Beneficios

### Antes vs Después

| Aspecto | Antes | Después |
|---------|-------|---------|
| **Pasos** | 3 operaciones separadas | 1 transacción atómica |
| **Riesgo de falla** | Alto (3 puntos de fallo) | Mínimo (1 punto de fallo) |
| **Reservas fantasma** | Posible ❌ | Imposible ✅ |
| **Consistencia** | No garantizada | Garantizada ✅ |
| **Rollback** | Manual | Automático ✅ |
| **Performance** | 3 round-trips a BD | 1 round-trip a BD |

### Métricas Esperadas

- ✅ **0** reservas fantasma
- ✅ **100%** integridad de datos
- ✅ **~60%** reducción en tiempo de creación
- ✅ **~70%** reducción en errores de estado inconsistente

---

## 🔍 Monitoreo

### Query para Detectar Anomalías

```sql
-- Ejecutar diariamente
WITH booking_health AS (
  SELECT 
    COUNT(*) FILTER (WHERE risk_snapshot_id IS NULL) as bookings_sin_risk,
    COUNT(*) FILTER (WHERE risk_snapshot_id IS NOT NULL) as bookings_con_risk,
    COUNT(*) as total_bookings
  FROM bookings
  WHERE created_at > CURRENT_DATE - INTERVAL '1 day'
    AND status != 'cancelled'
)
SELECT 
  *,
  CASE 
    WHEN bookings_sin_risk > 0 THEN '🔴 ALERTA: Reservas sin risk snapshot'
    ELSE '✅ Sistema saludable'
  END as estado
FROM booking_health;
```

### Alerta Automática (Opcional)

```sql
-- Crear trigger para alertar si se crea booking sin risk snapshot
CREATE OR REPLACE FUNCTION check_booking_integrity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.risk_snapshot_id IS NULL AND NEW.status = 'pending' THEN
    RAISE WARNING 'ALERTA: Booking % creado sin risk_snapshot_id', NEW.id;
    
    -- Opcional: Insertar en tabla de alertas
    INSERT INTO system_alerts (
      type,
      severity,
      message,
      metadata,
      created_at
    ) VALUES (
      'booking_integrity',
      'high',
      'Booking creado sin risk_snapshot_id',
      jsonb_build_object(
        'booking_id', NEW.id,
        'car_id', NEW.car_id
      ),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER booking_integrity_check
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION check_booking_integrity();
```

---

## 🎯 Próximos Pasos

Después de implementar este fix:

1. ✅ **Testing exhaustivo** (ver sección anterior)
2. ✅ **Monitorear durante 48h** en producción
3. ✅ **Eliminar código antiguo** una vez confirmado que funciona
4. 📋 **Siguiente fix**: Flujo de pago en dos pasos (ver `ANALISIS_E2E_LOCATARIO.md`)

---

## 📚 Referencias

- **Análisis original**: `/home/edu/autorenta/ANALISIS_E2E_LOCATARIO.md`
- **Código SQL**: `/home/edu/autorenta/database/fix-atomic-booking.sql`
- **Servicio actualizado**: `apps/web/src/app/core/services/bookings.service.ts`
- **Componente actualizado**: `apps/web/src/app/features/bookings/booking-detail-payment/booking-detail-payment.page.ts`

---

## ✅ Checklist de Implementación

- [ ] Script SQL aplicado en Supabase
- [ ] Función `create_booking_atomic` verificada
- [ ] Código TypeScript actualizado y compilado
- [ ] Tests manuales ejecutados
- [ ] Query de verificación ejecutada (0 reservas fantasma)
- [ ] Monitoreo configurado
- [ ] Documentación actualizada
- [ ] Equipo notificado del cambio

---

**Preparado por**: Claude Code  
**Fecha**: 2025-10-26  
**Versión**: 1.0  
**Estado**: ✅ LISTO PARA IMPLEMENTAR
