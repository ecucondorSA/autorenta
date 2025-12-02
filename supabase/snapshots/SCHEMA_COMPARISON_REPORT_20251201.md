# Reporte de Comparación de Schema - Autorenta
**Fecha:** 2025-12-01

## Resumen Ejecutivo

| Elemento | Estado |
|----------|--------|
| Tablas en producción | 104 |
| Tablas críticas verificadas | 9 |
| RLS habilitado | ✅ Todas las tablas críticas |
| Funciones wallet/booking/payment | ✅ 50+ funciones presentes |

## Estado General: ✅ SCHEMA SINCRONIZADO

El schema de producción contiene todos los elementos críticos esperados.

---

## 1. Tablas Críticas

| Tabla | Columnas | Estado |
|-------|----------|--------|
| `bookings` | 82 | ✅ Completa |
| `cars` | 69 | ✅ Completa |
| `profiles` | 41 | ✅ Completa |
| `payment_intents` | 24 | ✅ Completa |
| `payments` | 23 | ✅ Completa |
| `wallet_transactions` | 15 | ✅ Completa |
| `feature_flags` | 11 | ✅ Completa |
| `disputes` | 9 | ✅ Completa |
| `user_wallets` | 9 | ✅ Completa |

---

## 2. Seguridad (RLS)

### Tablas con RLS Habilitado
- ✅ `bookings` - 4 políticas
- ✅ `cars` - 7 políticas
- ✅ `profiles` - 3 políticas
- ✅ `payments` - 6 políticas
- ✅ `payment_intents` - 6 políticas
- ✅ `user_wallets` - 2 políticas
- ✅ `wallet_transactions` - 2 políticas
- ✅ `disputes` - 3 políticas
- ✅ `feature_flags` - 4 políticas
- ✅ `organizations` - 3 políticas
- ✅ `messages` - Habilitado

---

## 3. Funciones Críticas Presentes

### Wallet
- `wallet_get_balance` ✅
- `wallet_initiate_deposit` ✅
- `wallet_confirm_deposit_admin` ✅
- `wallet_lock_funds` ✅
- `wallet_charge_rental` ✅
- `wallet_debit_for_damage` ✅
- `wallet_deposit_ledger` ✅

### Booking
- `request_booking` ✅
- `quote_booking` ✅
- `approve_booking` ✅
- `lock_price_for_booking` ✅
- `preview_booking_pricing` ✅
- `prepare_booking_payment` ✅

### Payments
- `create_payment_authorization` ✅
- `capture_payment_authorization` ✅
- `cancel_payment_authorization` ✅
- `process_split_payment` ✅
- `calculate_payment_split` ✅
- `register_payment_split` ✅

---

## 4. Divergencia de Versiones

### Problema
Las versiones de migraciones locales (ej: `20251016`, `20251022`) no coinciden con las versiones en producción (ej: `20251115074136`).

### Causa
Se aplicaron migraciones directamente en producción con timestamps diferentes a los archivos locales.

### Impacto
- **Schema**: Sincronizado (no hay diferencias funcionales)
- **Historial**: Divergente (versiones diferentes)

### Recomendación
No es necesario tomar acción inmediata. El schema está sincronizado. La divergencia de historial no afecta la funcionalidad.

---

## 5. Nuevas Funcionalidades Aplicadas (2025-12-01)

- ✅ Sistema de Feature Flags (`feature_flags`, `feature_flag_overrides`)
- ✅ Módulo de Disputas (`disputes`, `dispute_evidence`)
- ✅ Contratos y Geofencing (`booking_contracts`, `car_tracking_*`)
- ✅ Cancelaciones con Fee (`fees`, `compute_cancel_fee`, `cancel_with_fee`)
- ✅ Vista de ubicación actualizada (`car_latest_location`)
- ✅ Configuración de notificaciones (`notification_settings`)

---

## Conclusión

El schema de producción está **completo y sincronizado** con la funcionalidad esperada. La divergencia está solo en el historial de versiones de migraciones, no en la estructura real del schema.

**No se requieren acciones adicionales.**
