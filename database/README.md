# Database - AutoRenta

Este directorio contiene las migraciones SQL y scripts de base de datos del proyecto AutoRenta.

## 📁 Estructura

```
database/
├── migrations/           # Migraciones oficiales (aplicar en orden)
├── seed-data/           # Datos de prueba y ejemplos
├── obsolete/            # Archivos históricos archivados
│   ├── diagnostic/      # Scripts de diagnóstico temporal
│   ├── experimental/    # Pruebas y experimentos
│   ├── test-scripts/    # Scripts de testing
│   ├── ad-hoc-schema/   # Cambios de esquema ad-hoc (ya aplicados)
│   ├── ad-hoc-fixes/    # Fixes puntuales (ya aplicados)
│   └── rpc-functions/   # Funciones RPC standalone
└── README.md           # Este archivo
```

## 🔢 Secuencia de Migraciones

### Migración 003: Wallet Ledger System
**Archivo**: `003-wallet-ledger-system.sql` (16KB)
**Fecha**: 2025-10-21
**Propósito**: Implementa sistema de contabilidad de doble partida (double-entry ledger)

**Tablas creadas**:
- `wallet_ledger` - Registro contable principal
- `wallet_transfers` - Transferencias entre usuarios

**Funciones RPC**:
- `transfer_between_users()` - Transferencia P2P
- `get_user_balance_from_ledger()` - Balance desde ledger

**Triggers**:
- `tg_apply_ledger` - Aplica movimientos contables automáticamente

---

### Migración 004: Exchange Rates and USD Migration
**Archivo**: `004-exchange-rates-and-usd-migration.sql` (9.1KB)
**Fecha**: 2025-10-21
**Propósito**: Sistema de tasas de cambio con integración Binance API

**Tablas creadas**:
- `exchange_rates` - Tasas USDTARS con margen de plataforma

**Funciones**:
- Conversión ARS ↔ USD
- Actualización automática desde Binance
- Margin de seguridad (10%-20%)

---

### Migración 005: Mark wallet_transactions as DEPRECATED
**Archivo**: `005-mark-wallet-transactions-deprecated.sql` (3.5KB)
**Fecha**: 2025-10-22
**Propósito**: Marcar tabla legacy como deprecated, documentar migración

**Cambios**:
- COMMENT en tabla `wallet_transactions` con plan de migración
- Vista de compatibilidad `v_wallet_transactions_legacy_compat`
- Flag `migrated_to_ledger` para tracking

**Plan de migración**:
- ✅ **Fase 1 (ACTUAL)**: Lectura desde ambas tablas
- ⏳ **Fase 2**: Solo lectura desde `wallet_ledger`
- ⏳ **Fase 3**: Eliminar `wallet_transactions` (después de 3 meses)

---

### Migración 006: Wallet Ledger Performance Indexes
**Archivo**: `006-wallet-ledger-performance-indexes.sql` (4.7KB)
**Fecha**: 2025-10-22
**Propósito**: Optimización de performance con índices críticos

**Índices creados**:
1. `idx_wallet_ledger_transaction_id` - Reverse lookup desde legacy table
2. `idx_wallet_ledger_user_kind_ts` - Historial filtrado por tipo
3. `idx_wallet_ledger_meta_gin` - Búsquedas JSONB en metadata

**Mejoras de performance**:
- Historial de usuario filtrado: ~10x más rápido
- Búsqueda por payment_id: ~100x más rápido
- Compatibilidad con vista legacy: index scan en vez de seq scan

---

### Migración 007: Wallet Account Numbers
**Archivo**: `007-wallet-account-numbers.sql` (5.3KB)
**Fecha**: 2025-10-21
**Propósito**: Números de cuenta únicos para transferencias P2P

**Cambios**:
- Columna `wallet_account_number` en `profiles` (formato: AR + 14 dígitos)
- Función `generate_wallet_account_number()` con retry logic
- Trigger auto-assign al crear wallet
- RPC `search_users_by_wallet_number()` para búsquedas

**Ejemplo**: `AR12345678901234`

---

### Migración 008: Add Region to Cars
**Archivo**: `008-add-region-to-cars.sql` (1.3KB)
**Fecha**: 2025-10-21
**Propósito**: Soporte para pricing dinámico por región

**Cambios**:
- Columna `region_id` en `cars` (FK a `pricing_regions`)
- Backfill de región default para autos existentes
- Índice para lookups rápidos

---

### Migración 009: Consolidated Wallet History View ⭐ NEW
**Archivo**: `009-create-consolidated-wallet-history-view.sql` (8.6KB)
**Fecha**: 2025-10-22
**Propósito**: Vista unificada que combina `wallet_transactions` (legacy) y `wallet_ledger` (nuevo)

**Recursos creados**:
- Vista `v_wallet_history` - Combina ambos sistemas automáticamente
- Función `get_user_wallet_history()` - API paginada para historial de usuario
- Función `get_wallet_migration_stats()` - Métricas de progreso de migración
- Función `search_transactions_by_payment_id()` - Búsqueda por MercadoPago payment_id

**Beneficios**:
- ✅ **Sin cambios en código**: Misma interfaz que `wallet_transactions`
- ✅ **Datos completos**: Incluye transacciones de ambos sistemas
- ✅ **Performance mejorado**: Usa índices optimizados de migration 006
- ✅ **Preparado para migración**: Field `source_system` indica origen

**Estadísticas actuales**:
- Total registros: 108 (96 legacy + 12 ledger + 0 migradas)
- Migración completada: 0%

**Frontend actualizado** (2025-10-22):
- ✅ `wallet.service.ts` - getTransactions() usa `v_wallet_history`
- ✅ `bookings.service.ts` - Query de locked_amount usa `v_wallet_history`
- ✅ `wallet.model.ts` - Tipos agregados: `WalletHistoryEntry`, `WalletMigrationStats`

---

## 🚀 Cómo Aplicar Migraciones

### Opción 1: psql directo
```bash
PGPASSWORD="..." psql "postgresql://..." -f database/migrations/XXX-name.sql
```

### Opción 2: Supabase SQL Editor
1. Abrir Supabase Dashboard → SQL Editor
2. Copiar contenido de migración
3. Ejecutar

### Opción 3: Supabase CLI (recomendado para producción)
```bash
supabase db push
```

## 📊 Estado Actual del Sistema

### Wallet System (Doble Arquitectura)

**Sistema Legacy** (en deprecación):
- ⚠️ `wallet_transactions` - 96 transacciones históricas
- ⚠️ Estados: pending, completed, failed
- ⚠️ NO usar para nuevo código

**Sistema Nuevo** (producción):
- ✅ `wallet_ledger` - 12 entries actuales
- ✅ Double-entry bookkeeping
- ✅ Idempotencia con campo `ref`
- ✅ 9 índices optimizados
- ✅ Vista consolidada `v_wallet_history` (Migration 009)

### Exchange Rates
- ✅ Tasa activa: 1748.01 ARS/USD (10% margin)
- ✅ Source: Binance API
- ✅ Última actualización: 2025-10-22 00:46:11

### Cuenta de Usuarios
- ✅ Todos los usuarios con wallet tienen número de cuenta
- ✅ Formato: AR + 14 dígitos
- ✅ Búsqueda por número implementada

## 📦 Datos de Prueba

### Seed Data Disponible
- `seed-data/seed-latam-cars.sql` - Autos de ejemplo para LATAM

Para cargar seed data:
```bash
psql ... -f database/seed-data/seed-latam-cars.sql
```

## 🗂️ Archivos Obsoletos

Los archivos en `obsolete/` son históricos y YA FUERON APLICADOS o son experimentales.

**NO ejecutar** estos archivos directamente:
- `obsolete/diagnostic/*` - Scripts de debugging temporal
- `obsolete/experimental/*` - Iteraciones de features
- `obsolete/test-scripts/*` - Testing durante desarrollo
- `obsolete/ad-hoc-schema/*` - Cambios manuales ya aplicados
- `obsolete/ad-hoc-fixes/*` - Fixes puntuales ya resueltos

Se mantienen por:
1. Documentación histórica
2. Reference para entender decisiones pasadas
3. Rollback en caso de emergencia

## 🔍 Troubleshooting

### Verificar migraciones aplicadas

```sql
-- Ver todas las tablas wallet
SELECT table_name
FROM information_schema.tables
WHERE table_name LIKE '%wallet%';

-- Ver índices en wallet_ledger
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'wallet_ledger';

-- Verificar tasa de cambio activa
SELECT * FROM exchange_rates
WHERE is_active = true
ORDER BY last_updated DESC
LIMIT 1;
```

### Rollback de migración

Si una migración causa problemas:

1. Verificar comentarios ROLLBACK en el archivo
2. Crear migration de rollback
3. Aplicar cambios inversos manualmente

**Ejemplo** (migration 006):
```sql
-- Rollback indexes
DROP INDEX IF EXISTS idx_wallet_ledger_transaction_id;
DROP INDEX IF EXISTS idx_wallet_ledger_user_kind_ts;
DROP INDEX IF EXISTS idx_wallet_ledger_meta_gin;
```

## 📝 Notas Importantes

### Convenciones de Nomenclatura

- **Migraciones**: `XXX-descriptive-name.sql` (números secuenciales)
- **Seed data**: `seed-{category}.sql`
- **Obsolete**: mantener nombre original

### Antes de Crear Nueva Migración

1. ✅ Verificar que no exista archivo similar en `obsolete/`
2. ✅ Asignar siguiente número secuencial
3. ✅ Incluir comentarios ROLLBACK
4. ✅ Documentar en este README
5. ✅ Probar en ambiente de desarrollo primero

### Política de Migrations

- **NUNCA** modificar migraciones ya aplicadas
- **SIEMPRE** crear nueva migración para cambios
- **DOCUMENTAR** el propósito y fecha
- **INCLUIR** queries de verificación

---

**Última actualización**: 2025-10-22
**Mantenedor**: Equipo AutoRenta
**Contacto**: autorentardev@gmail.com
