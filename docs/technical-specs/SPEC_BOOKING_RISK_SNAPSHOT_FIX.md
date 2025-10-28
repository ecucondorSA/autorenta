# SPEC: Booking Risk Snapshot Fix

**Ticket ID**: FASE2-001  
**Prioridad**: P1 - CRÍTICO  
**Estimación**: 2-3 horas  
**Responsable**: Copilot (implementación)  
**Creado**: 2025-10-28

---

## 🎯 Problema Actual

### Descripción
El código intenta leer de tabla `booking_risk_snapshots` (plural) pero la tabla real se llama `booking_risk_snapshot` (singular).

### Ubicación del Bug
- **Archivo**: `apps/web/src/app/core/services/risk.service.ts` (líneas 114-139 aproximadamente)
- **Operación**: Query de lectura después de INSERT

### Comportamiento Actual
```typescript
// INSERT usa tabla singular (correcto)
await supabase
  .from('booking_risk_snapshot')
  .insert(snapshot);

// SELECT usa tabla plural (incorrecto)
const { data } = await supabase
  .from('booking_risk_snapshots')  // ❌ Esta tabla NO existe
  .select('*')
  .eq('booking_id', bookingId);
```

### Impacto
- ❌ Queries fallan con error "relation does not exist"
- ❌ Success page no puede mostrar datos de riesgo
- ❌ Histórico de snapshots inaccesible
- ⚠️ En base limpia, el flujo revienta completamente

### Evidencia en Database
```sql
-- Tabla existente
postgres=# \dt public.booking_risk*
List of relations
 Schema |         Name          | Type  |  Owner   
--------+-----------------------+-------+----------
 public | booking_risk_snapshot | table | postgres
```

---

## ✅ Solución Propuesta

### Opción 1: Renombrar Código (RECOMENDADO)
**Por qué**: La tabla ya tiene datos y está siendo usada por otros servicios.

**Cambios requeridos**:
1. Buscar TODAS las referencias a `booking_risk_snapshots` (plural)
2. Reemplazar por `booking_risk_snapshot` (singular)
3. Verificar archivos TypeScript generados (types)

### Opción 2: Renombrar Tabla
**Por qué NO**: Requiere migración de datos y puede romper edge functions.

---

## 🔧 Cambios Requeridos

### 1. Auditar Referencias
```bash
# Buscar todos los usos del plural
cd /home/edu/autorenta
grep -r "booking_risk_snapshots" apps/web/src --include="*.ts" --include="*.service.ts"
grep -r "booking_risk_snapshots" supabase/functions --include="*.ts"
```

**Archivos probables**:
- `apps/web/src/app/core/services/risk.service.ts`
- `apps/web/src/app/core/models/*.ts` (types generados)
- `apps/web/src/app/features/bookings/**/risk-*.ts`

### 2. Fix en risk.service.ts

#### Antes (Incorrecto):
```typescript
async getRiskSnapshot(bookingId: string): Promise<BookingRiskSnapshot | null> {
  const { data, error } = await this.supabase
    .from('booking_risk_snapshots')  // ❌ Plural
    .select('*')
    .eq('booking_id', bookingId)
    .single();
    
  if (error) {
    console.error('Error fetching risk snapshot:', error);
    return null;
  }
  
  return data;
}

async getAllRiskSnapshots(bookingId: string): Promise<BookingRiskSnapshot[]> {
  const { data, error } = await this.supabase
    .from('booking_risk_snapshots')  // ❌ Plural
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching risk snapshots:', error);
    return [];
  }
  
  return data || [];
}
```

#### Después (Correcto):
```typescript
async getRiskSnapshot(bookingId: string): Promise<BookingRiskSnapshot | null> {
  const { data, error } = await this.supabase
    .from('booking_risk_snapshot')  // ✅ Singular
    .select('*')
    .eq('booking_id', bookingId)
    .single();
    
  if (error) {
    console.error('Error fetching risk snapshot:', error);
    return null;
  }
  
  return data;
}

async getAllRiskSnapshots(bookingId: string): Promise<BookingRiskSnapshot[]> {
  const { data, error } = await this.supabase
    .from('booking_risk_snapshot')  // ✅ Singular
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching risk snapshots:', error);
    return [];
  }
  
  return data || [];
}
```

### 3. Verificar Schema Types

**Archivo**: `apps/web/src/app/core/models/database.types.ts` (o similar)

Asegurar que el type apunta al nombre correcto:
```typescript
export interface Database {
  public: {
    Tables: {
      booking_risk_snapshot: {  // ✅ Debe ser singular
        Row: BookingRiskSnapshot;
        Insert: BookingRiskSnapshotInsert;
        Update: BookingRiskSnapshotUpdate;
      };
      // NO debe existir booking_risk_snapshots (plural)
    };
  };
}
```

Si los types fueron auto-generados con Supabase CLI:
```bash
# Regenerar types
supabase gen types typescript --project-id obxvffplochgeiclibng > apps/web/src/app/core/models/database.types.ts
```

---

## 🧪 Tests Requeridos

### Unit Tests
**Archivo**: `apps/web/src/app/core/services/risk.service.spec.ts`

```typescript
describe('RiskService', () => {
  let service: RiskService;
  let supabaseMock: jest.Mocked<SupabaseClient>;

  beforeEach(() => {
    supabaseMock = createSupabaseMock();
    service = new RiskService(supabaseMock);
  });

  it('should use singular table name for getRiskSnapshot', async () => {
    const bookingId = 'test-booking-123';
    
    await service.getRiskSnapshot(bookingId);
    
    expect(supabaseMock.from).toHaveBeenCalledWith('booking_risk_snapshot');
    // NOT 'booking_risk_snapshots'
  });

  it('should return snapshot data when found', async () => {
    const mockSnapshot = {
      id: 'snap-1',
      booking_id: 'booking-1',
      risk_score: 75,
      created_at: new Date().toISOString()
    };
    
    supabaseMock.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockSnapshot, error: null })
        })
      })
    });
    
    const result = await service.getRiskSnapshot('booking-1');
    
    expect(result).toEqual(mockSnapshot);
  });

  it('should handle error gracefully', async () => {
    supabaseMock.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ 
            data: null, 
            error: { message: 'Table not found' } 
          })
        })
      })
    });
    
    const result = await service.getRiskSnapshot('booking-1');
    
    expect(result).toBeNull();
  });
});
```

### Integration Tests
**Archivo**: `tests/integration/risk-snapshot.spec.ts`

```typescript
test('should save and retrieve risk snapshot', async () => {
  // Setup
  const bookingId = await createTestBooking();
  const riskData = {
    booking_id: bookingId,
    risk_score: 80,
    factors: { age: 25, experience: 2 }
  };
  
  // Insert
  await riskService.saveRiskSnapshot(riskData);
  
  // Retrieve
  const snapshot = await riskService.getRiskSnapshot(bookingId);
  
  // Assert
  expect(snapshot).toBeDefined();
  expect(snapshot.booking_id).toBe(bookingId);
  expect(snapshot.risk_score).toBe(80);
});
```

### E2E Test
**Archivo**: `tests/renter/booking/booking-flow.spec.ts`

```typescript
test('complete booking flow shows risk data on success page', async ({ page }) => {
  // ... booking flow hasta payment approved ...
  
  // Navigate to success page
  await page.waitForURL('**/booking-success**');
  
  // Verify risk snapshot is displayed
  const riskSection = page.locator('[data-testid="risk-snapshot"]');
  await expect(riskSection).toBeVisible();
  
  const riskScore = await riskSection.locator('[data-testid="risk-score"]').textContent();
  expect(parseInt(riskScore)).toBeGreaterThan(0);
});
```

---

## 📋 Rollout Plan

### Step 1: Pre-Deployment Checklist
```bash
# 1. Backup current data
pg_dump "postgresql://..." -t booking_risk_snapshot > backup_risk_snapshots.sql

# 2. Count records
psql "postgresql://..." -c "SELECT COUNT(*) FROM booking_risk_snapshot;"

# 3. Verify no plural table exists
psql "postgresql://..." -c "\dt public.booking_risk_snapshots"
# Should show: "Did not find any relation named..."
```

### Step 2: Deploy Changes
```bash
# 1. Commit changes
git add apps/web/src/app/core/services/risk.service.ts
git commit -m "fix: use singular table name for booking_risk_snapshot"

# 2. Push to branch
git push origin fix/risk-snapshot-table-name

# 3. Create PR with tests
gh pr create --title "Fix: Booking risk snapshot table name" \
  --body "Fixes query to use singular table name matching database schema"

# 4. Wait for CI to pass
gh pr checks --watch

# 5. Merge
gh pr merge --squash
```

### Step 3: Deploy to Production
```bash
# 1. Deploy web app
cd apps/web
npm run build
# Deploy to hosting (Vercel/Netlify/etc)

# 2. Smoke test
curl https://autorenta.com/api/health
```

### Step 4: Verification
```bash
# 1. Check logs for errors
# Monitor Sentry/LogRocket for "booking_risk_snapshots" errors

# 2. Test in production
# Navigate to booking success page
# Verify risk data displays correctly

# 3. Query database
psql "postgresql://..." -c "
  SELECT 
    COUNT(*) as total_snapshots,
    MAX(created_at) as last_snapshot
  FROM booking_risk_snapshot
  WHERE created_at > NOW() - INTERVAL '1 hour';
"
```

---

## 🔙 Rollback Plan

### Si algo falla:

**Opción 1: Revert commit**
```bash
git revert <commit-hash>
git push origin main
# Redeploy
```

**Opción 2: Hotfix temporal**
Si el bug es en edge function o worker:
```bash
# Crear tabla alias temporal (NO RECOMENDADO, solo emergencia)
psql "postgresql://..." -c "
  CREATE VIEW booking_risk_snapshots AS 
  SELECT * FROM booking_risk_snapshot;
"
```

**Restaurar data si se perdió**:
```bash
psql "postgresql://..." < backup_risk_snapshots.sql
```

---

## 📊 Monitoring

### Métricas a Trackear
1. **Error rate**: Queries a `booking_risk_snapshots` (debe ser 0)
2. **Success rate**: Snapshots creados vs leídos exitosamente
3. **Latency**: Tiempo de query risk snapshot

### Alerts a Configurar
```javascript
// Sentry
if (error.message.includes('booking_risk_snapshots')) {
  Sentry.captureException(error, {
    tags: { 
      issue: 'table_name_mismatch',
      priority: 'critical'
    }
  });
}
```

### Dashboard Query
```sql
-- Daily snapshot activity
SELECT 
  DATE(created_at) as date,
  COUNT(*) as snapshots_created,
  COUNT(DISTINCT booking_id) as unique_bookings
FROM booking_risk_snapshot
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## ✅ Definition of Done

- [ ] Código usa `booking_risk_snapshot` (singular) en TODAS las referencias
- [ ] Unit tests pasan (mocks verifican tabla singular)
- [ ] Integration tests pasan (queries reales a DB)
- [ ] E2E tests pasan (booking flow completo)
- [ ] Types regenerados desde schema real
- [ ] PR aprobado por 1+ reviewer
- [ ] CI verde (lint, test, build)
- [ ] Deployed a producción
- [ ] Smoke test exitoso (risk data visible en success page)
- [ ] No errores "table not found" en logs (24h post-deploy)
- [ ] Documentación actualizada (este SPEC marcado como ✅ COMPLETADO)

---

## 📚 Referencias

- **Database Schema**: `supabase/migrations/XXX_create_booking_risk_snapshot.sql`
- **Service**: `apps/web/src/app/core/services/risk.service.ts`
- **Types**: `apps/web/src/app/core/models/database.types.ts`
- **Related Issues**: Mencionado en análisis inicial del 40% readiness

---

**Última Actualización**: 2025-10-28  
**Estado**: ⏳ PENDIENTE IMPLEMENTACIÓN  
**Blocker para**: Checkout completamente funcional (50% → 80%)
