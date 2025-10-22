# Plan de Migración: wallet_transactions → wallet_ledger

**Fecha**: 2025-10-22
**Estado**: FASE 1 - Análisis Completado
**Objetivo**: Migrar sistema legacy de `wallet_transactions` a sistema moderno de doble partida `wallet_ledger`

---

## 📊 Estado Actual

### Datos en Producción
- **Legacy (`wallet_transactions`)**: 96 transacciones históricas
- **Ledger (`wallet_ledger`)**: 12 entries modernos
- **Migradas**: 0 transacciones (0%)

### Dependencias en Código TypeScript

| Archivo | Línea | Método | Uso |
|---------|-------|--------|-----|
| `wallet.service.ts` | 541 | `getTransactions()` | Query directo a `wallet_transactions` con filtros |
| `bookings.service.ts` | ~línea | Unlock deposit | Query para obtener `locked_amount` de transacción |

**Total**: 2 archivos afectados, 2 queries a refactorizar

---

## 🎯 Fases de Migración

### FASE 1: Preparación (✅ COMPLETADA)

- [x] Marcar `wallet_transactions` como DEPRECATED (Migration 005)
- [x] Crear vista de compatibilidad `v_wallet_transactions_legacy_compat`
- [x] Crear índices de performance en `wallet_ledger` (Migration 006)
- [x] Crear vista consolidada `v_wallet_history` (Migration 009)
- [x] Crear funciones RPC helper:
  - `get_user_wallet_history()`
  - `get_wallet_migration_stats()`
  - `search_transactions_by_payment_id()`
- [x] Analizar dependencias en código TypeScript

### FASE 2: Migración Gradual del Frontend (ACTUAL)

**Objetivo**: Migrar queries del frontend sin romper funcionalidad existente

#### Tarea 2.1: Actualizar wallet.service.ts

**Archivo**: `apps/web/src/app/core/services/wallet.service.ts`
**Método**: `getTransactions()`
**Líneas**: 535-594

**Cambio Propuesto**:
```typescript
// ANTES (línea 540)
async getTransactions(filters?: WalletTransactionFilters): Promise<WalletTransaction[]> {
  this.setLoadingState('transactions', true);
  this.clearError();

  try {
    let query = this.supabase.getClient()
      .from('wallet_transactions')  // ← DEPRECATED
      .select('*')
      .order('created_at', { ascending: false });

// DESPUÉS (usando vista consolidada)
async getTransactions(filters?: WalletTransactionFilters): Promise<WalletTransaction[]> {
  this.setLoadingState('transactions', true);
  this.clearError();

  try {
    // Opción A: Usar RPC function (recomendado)
    const { data, error } = await this.supabase.getClient()
      .rpc('get_user_wallet_history', {
        p_user_id: (await this.supabase.getClient().auth.getUser()).data.user?.id,
        p_limit: 100,
        p_offset: 0
      });

    // Opción B: Query directo a vista (si necesitas filtros custom)
    // const query = this.supabase.getClient()
    //   .from('v_wallet_history')
    //   .select('*')
    //   .order('transaction_date', { ascending: false });
```

**Ventajas**:
- ✅ Sin cambios en la interfaz pública del servicio
- ✅ Datos de ambos sistemas (legacy + ledger)
- ✅ Mejor performance (usa índices optimizados)
- ✅ Preparado para eliminar `wallet_transactions` en futuro

**Testing Required**:
- Verificar que historial se muestra correctamente
- Probar filtros (tipo, status, fechas)
- Validar que transacciones pending aparecen
- Confirmar que deposits completados se muestran

**Estimado**: 2 horas

---

#### Tarea 2.2: Actualizar bookings.service.ts

**Archivo**: `apps/web/src/app/core/services/bookings.service.ts`
**Uso**: Obtener `locked_amount` de transacción

**Cambio Propuesto**:
```typescript
// ANTES
const { data: lockTx, error: lockTxError } = await this.supabase
  .from('wallet_transactions')  // ← DEPRECATED
  .select('amount')
  .eq('id', booking.wallet_lock_transaction_id)
  .eq('type', 'lock')
  .single();

// DESPUÉS (usando vista consolidada)
const { data: lockTx, error: lockTxError } = await this.supabase
  .from('v_wallet_history')  // ← Vista consolidada
  .select('amount_cents, currency')
  .eq('id', booking.wallet_lock_transaction_id)
  .in('transaction_type', ['lock', 'rental_payment_lock', 'security_deposit_lock'])
  .single();

// Convertir centavos a decimales (si el campo legacy usa decimales)
const lockedAmount = (lockTx?.amount_cents ?? 0) / 100;
```

**Consideraciones**:
- ⚠️ `wallet_transactions.amount` es DECIMAL (dollars)
- ⚠️ `wallet_ledger.amount_cents` es BIGINT (cents)
- ⚠️ Vista `v_wallet_history.amount_cents` normaliza a centavos
- ✅ Necesita conversión `/100` para mantener compatibilidad

**Testing Required**:
- Verificar que unlock de deposits funciona
- Confirmar que cálculos de refund son correctos
- Validar múltiples tipos de lock (rental, deposit)

**Estimado**: 1 hora

---

#### Tarea 2.3: Actualizar Modelos TypeScript (opcional)

**Archivo**: `apps/web/src/app/core/models/wallet.model.ts`

**Agregar tipo para vista consolidada**:
```typescript
/**
 * Entry de vista consolidada wallet_history
 * Combina wallet_transactions (legacy) y wallet_ledger (nuevo)
 */
export interface WalletHistoryEntry {
  id: string;
  user_id: string;
  transaction_date: string;
  transaction_type: WalletTransactionType | string;
  status: WalletTransactionStatus | 'completed';
  amount_cents: number;
  currency: string;
  metadata: Record<string, unknown>;
  booking_id?: string;
  source_system: 'legacy' | 'ledger' | 'both';
  legacy_transaction_id?: string;
  ledger_entry_id?: string;
  ledger_ref?: string;
}
```

**Estimado**: 30 minutos

---

### FASE 3: Migración de Datos Históricos (FUTURO)

**Objetivo**: Migrar las 96 transacciones legacy a wallet_ledger

#### Tarea 3.1: Crear script de migración SQL

**Requisitos**:
- Generar `ref` único para cada transacción (usando UUID)
- Convertir `amount` (decimal) → `amount_cents` (bigint)
- Mapear `type` → `kind` (enum)
- Preservar `transaction_id` para mantener referencia
- Copiar metadata relevante a `meta` (JSONB)

**Complejidad**: ALTA
- ⚠️ 96 transacciones con estados mixtos (pending, completed, failed)
- ⚠️ Algunas tienen `booking_id`, otras no
- ⚠️ Metadata variada (MercadoPago, internal, etc.)

**Estimado**: 4-6 horas

---

#### Tarea 3.2: Testing de Migración

**Checklist**:
- [ ] Verificar balance antes/después de migración
- [ ] Confirmar que transacciones pending NO se migran (solo completed)
- [ ] Validar que bookings antiguos siguen funcionando
- [ ] Probar rollback en caso de error
- [ ] Comparar balance legacy vs ledger (debe ser igual)

**Estimado**: 2-3 horas

---

#### Tarea 3.3: Cleanup Final

**Después de 3 meses** de migración exitosa:
- [ ] Eliminar tabla `wallet_transactions`
- [ ] Eliminar vista `v_wallet_transactions_legacy_compat`
- [ ] Actualizar `v_wallet_history` para solo usar `wallet_ledger`
- [ ] Remover código deprecated del frontend

**Estimado**: 1-2 horas

---

## 📈 Métricas de Éxito

### Objetivos de FASE 2 (Frontend Migration)
- ✅ 0 regresiones en funcionalidad de wallet
- ✅ Balance se calcula correctamente desde ambos sistemas
- ✅ Historial muestra transacciones completas (legacy + ledger)
- ✅ Performance igual o mejor que antes
- ✅ Tests E2E pasan sin cambios

### Objetivos de FASE 3 (Data Migration)
- ✅ 100% de transacciones completed migradas a ledger
- ✅ Balance legacy = Balance ledger (diferencia < $0.01)
- ✅ 0 datos perdidos en migración
- ✅ Metadata preservada correctamente

---

## 🚨 Riesgos Identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Diferencias de redondeo (cents vs decimals) | Media | Alto | Validar conversión, tests exhaustivos |
| Transacciones pending se pierden | Baja | Medio | Solo migrar `completed`, mantener pending en legacy |
| Performance degradada con JOIN | Baja | Medio | Índices ya creados, monitorear query plans |
| Rollback difícil después de migration | Alta | Alto | NO eliminar `wallet_transactions` hasta 3 meses después |

---

## 🔄 Rollback Plan

### Si FASE 2 falla:
1. Revertir cambios en `wallet.service.ts`
2. Revertir cambios en `bookings.service.ts`
3. Volver a query directo a `wallet_transactions`
4. Vista consolidada sigue disponible para debugging

**Impacto**: BAJO (cambios solo en frontend)

### Si FASE 3 falla:
1. NO eliminar tabla `wallet_transactions`
2. Rollback de migration script
3. Verificar balance desde RPC `wallet_get_balance()` (usa `user_wallets`, no afectado)
4. Investigar inconsistencias en staging

**Impacto**: MEDIO (requiere investigación manual)

---

## 📅 Timeline Propuesto

| Fase | Duración | Fecha Inicio | Fecha Fin |
|------|----------|--------------|-----------|
| **FASE 1** | ✅ Completado | 2025-10-22 | 2025-10-22 |
| **FASE 2** | 1 semana | 2025-10-23 | 2025-10-30 |
| **FASE 3** | 2 semanas | 2025-11-01 | 2025-11-15 |
| **Monitoreo** | 3 meses | 2025-11-15 | 2026-02-15 |
| **Cleanup** | 1 día | 2026-02-16 | 2026-02-16 |

**Total**: ~4 meses desde inicio a cleanup completo

---

## ✅ Próximos Pasos Inmediatos

### Para FASE 2 (Migración de Frontend)
1. ✅ Revisar este documento con el equipo
2. ⏳ Crear branch `feature/wallet-ledger-migration`
3. ⏳ Actualizar `wallet.service.ts` con vista consolidada
4. ⏳ Actualizar `bookings.service.ts` con vista consolidada
5. ⏳ Testing exhaustivo en ambiente de desarrollo
6. ⏳ Code review
7. ⏳ Deploy a staging
8. ⏳ Monitoreo 1 semana en staging
9. ⏳ Deploy a producción

### Recursos Necesarios
- **Developer**: 1 persona, 1 semana
- **QA**: 2 días de testing exhaustivo
- **DevOps**: 1 día para monitoreo de performance

---

**Documento creado**: 2025-10-22
**Última actualización**: 2025-10-22
**Responsable**: Equipo Wallet AutoRenta
**Contacto**: autorentardev@gmail.com
