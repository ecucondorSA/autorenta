# 💳 Sistema de Números de Cuenta Wallet (WAN)

## 📋 Overview

Sistema de números de cuenta únicos para el wallet de AutoRenta, similar a CVU/CBU en Argentina. Cada usuario tiene un número único de 16 caracteres que permite transferencias seguras sin confusión de nombres.

**Fecha de implementación**: 2025-10-21

---

## 🔢 Formato del Número

```
ARXXXXXXXXXXXXXX
```

- **AR**: Prefijo del país (Argentina)
- **14 dígitos**: Número aleatorio único
- **Total**: 16 caracteres

**Ejemplos reales**:
- `AR30511463023136`
- `AR42739476745757`
- `AR02178970598803`

---

## ✅ Ventajas del Sistema

### Antes (búsqueda por nombre)
❌ Problema: "Juan Propietario" puede haber 10 personas diferentes  
❌ Problema: Búsqueda ambigua, errores de transferencia  
❌ Problema: No hay unicidad garantizada

### Ahora (búsqueda por WAN)
✅ **Único por usuario**: 1 número = 1 persona  
✅ **Sin ambigüedad**: No hay confusión posible  
✅ **Verificable**: El sistema muestra nombre + email al ingresar el número  
✅ **Seguro**: No puedes transferir a la persona equivocada

---

## 🗄️ Base de Datos

### Migración Aplicada

**Archivo**: `/home/edu/autorenta/apps/web/database/migrations/004-wallet-account-numbers.sql`

**Cambios realizados**:
1. ✅ Agregada columna `wallet_account_number` a tabla `profiles`
2. ✅ Índice único para búsquedas rápidas
3. ✅ Función `generate_wallet_account_number()` para generar números
4. ✅ Función `assign_wallet_account_number(user_id)` para asignar números
5. ✅ Trigger automático al crear wallet
6. ✅ RPC function `search_users_by_wallet_number(query)`
7. ✅ Backfill de números para usuarios existentes

### Queries Útiles

**Ver números asignados**:
```sql
SELECT 
  full_name,
  wallet_account_number,
  created_at
FROM profiles
WHERE wallet_account_number IS NOT NULL
ORDER BY created_at DESC;
```

**Buscar usuario por número**:
```sql
SELECT * FROM search_users_by_wallet_number('AR12345678901234');
```

**Asignar número manualmente**:
```sql
SELECT assign_wallet_account_number('user-uuid-here');
```

**Verificar que todos tienen número**:
```sql
SELECT 
  COUNT(*) as total_wallets,
  COUNT(p.wallet_account_number) as with_numbers
FROM user_wallets uw
LEFT JOIN profiles p ON p.id = uw.user_id;
```

---

## 💻 Frontend - Componentes Actualizados

### 1. WalletLedgerService

**Nuevo método**: `searchUserByWalletNumber(query: string)`

```typescript
// Buscar usuario por WAN
const user = await walletLedgerService.searchUserByWalletNumber('AR12345678901234');

if (user) {
  console.log(user.full_name);  // "EDUARDO MARQUES DA ROSA"
  console.log(user.email);       // "eduardo@example.com"
  console.log(user.wallet_account_number); // "AR12345678901234"
}
```

**Validaciones implementadas**:
- ✅ Debe comenzar con "AR"
- ✅ Debe tener exactamente 16 caracteres
- ✅ Auto-uppercase de la query
- ✅ Trim de espacios

### 2. TransferFundsComponent

**URL**: `/wallet/transfer`

**Cambios visuales**:
- Input con placeholder `"Ej: AR12345678901234"`
- Máximo 16 caracteres
- Font monospace para mejor lectura
- Validación en tiempo real con feedback
- Auto-selección del usuario al ingresar número completo

**Estados del input**:
1. **Vacío**: Sin mensajes
2. **< 2 caracteres**: Sin validación
3. **No empieza con AR**: ⚠️ "El número debe comenzar con AR"
4. **< 16 caracteres**: ⚠️ "Faltan X caracteres"
5. **16 caracteres válidos**: 
   - ✅ Usuario encontrado → Muestra card verde
   - ❌ Usuario no encontrado → ⚠️ "Número de cuenta no encontrado"

**Card de confirmación** (cuando se encuentra usuario):
```
┌─────────────────────────────────────────┐
│ ✅ EDUARDO MARQUES DA ROSA         [X]  │
│ Cuenta: AR30511463023136                │
│ eduardo@example.com                     │
└─────────────────────────────────────────┘
```

### 3. UserProfile Model

**Actualización**: Agregado campo `wallet_account_number`

```typescript
interface UserProfile {
  id: string;
  full_name: string;
  wallet_account_number?: string | null; // NUEVO
  // ... otros campos
}
```

---

## 🎯 Flujo de Uso

### Como Usuario (Enviando Transferencia)

1. Ir a `/wallet/transfer`
2. Pedir al destinatario su **Wallet Account Number**
3. Ingresar el número completo (16 caracteres)
4. Verificar que aparezca el nombre correcto
5. Ingresar monto y descripción
6. Confirmar transferencia

### Como Usuario (Recibiendo Transferencia)

1. Ir a `/wallet` o `/profile`
2. Copiar tu **Wallet Account Number**
3. Compartirlo con quien te va a transferir
4. Esperar la transferencia

---

## 🔐 Seguridad

### Validaciones Implementadas

1. **Formato estricto**: Solo AR + 14 dígitos
2. **Unicidad garantizada**: No pueden existir 2 números iguales
3. **Búsqueda exacta**: Match completo de 16 caracteres
4. **No auto-transferencia**: No puedes buscarte a ti mismo
5. **Índice único en DB**: Constraint a nivel base de datos

### Generación Segura

```typescript
// Función genera 10^14 combinaciones posibles
// Probabilidad de colisión: 0.00000001%
// Retry automático en caso de colisión (máx 10 intentos)
```

---

## 📱 UX/UI

### Mejoras Visuales

**Input del número**:
- Font monospace para mejor legibilidad
- Auto-uppercase
- Máximo 16 caracteres
- Validación inline

**Feedback en tiempo real**:
- ⚠️ Amarillo: Formato incorrecto o incompleto
- ✅ Verde: Usuario encontrado
- ❌ Rojo: Usuario no encontrado (error)

**Card de usuario encontrado**:
- Checkmark grande ✅
- Nombre en bold
- Número de cuenta en monospace
- Email como verificación adicional
- Botón X para limpiar y buscar otro

---

## 🚀 Próximos Pasos

### Fase 1: Display del Número ✅ COMPLETO

Agregar display del WAN en:
- ✅ Componente de transferencias (`/wallet/transfer`)
- ✅ Página principal del wallet (`/wallet`)
- ✅ Perfil del usuario (`/profile`)

**Implementación en WalletPage** (`/wallet`):
- Card dedicado con gradiente petrol
- Número en font monospace, tamaño grande
- Botón "Copiar" con feedback visual (cambia a "Copiado!" por 2 segundos)
- Mensaje explicativo: "Comparte este número para recibir transferencias"
- Ubicado en la columna izquierda, debajo del balance card

**Implementación en ProfilePage** (`/profile`):
- Sección en el sidebar con avatar e info básica
- Número en font monospace dentro de un box con borde petrol
- Botón "Copiar" compacto
- Mensaje: "Para recibir transferencias"
- Solo visible si el usuario tiene WAN asignado

**Botón Transferir**:
- Agregado en la sección "Acciones Rápidas" de WalletPage
- Junto a botones "Depositar" y "Retirar"
- Navega a `/wallet/transfer`

### Fase 2: QR Code (Opcional)

Generar QR con formato:
```json
{
  "type": "autorenta_wallet_transfer",
  "account_number": "AR30511463023136",
  "name": "EDUARDO MARQUES DA ROSA",
  "version": "1.0"
}
```

### Fase 3: Alias (Opcional)

Permitir crear alias personalizados:
- `eduardo.autorent`
- `juan.propietario`
- Único por usuario
- Más fácil de recordar que 16 dígitos

---

## 🧪 Testing

### Test Manual

**Paso 1: Obtener tu número**
```sql
SELECT wallet_account_number 
FROM profiles 
WHERE id = (SELECT auth.uid());
```

**Paso 2: Obtener número de otro usuario**
```sql
SELECT full_name, wallet_account_number
FROM profiles
WHERE wallet_account_number IS NOT NULL
ORDER BY RANDOM()
LIMIT 1;
```

**Paso 3: Probar búsqueda**
1. Ir a `/wallet/transfer`
2. Ingresar el número del otro usuario
3. Verificar que aparezca correctamente
4. Intentar transferencia

### Test Unitario (Sugerido)

```typescript
describe('WalletAccountNumber', () => {
  it('should search user by valid WAN', async () => {
    const result = await service.searchUserByWalletNumber('AR12345678901234');
    expect(result).toBeTruthy();
    expect(result.wallet_account_number).toBe('AR12345678901234');
  });

  it('should return null for invalid WAN', async () => {
    const result = await service.searchUserByWalletNumber('INVALID');
    expect(result).toBeNull();
  });

  it('should auto-uppercase query', async () => {
    const result = await service.searchUserByWalletNumber('ar12345678901234');
    // Should work the same as uppercase
  });
});
```

---

## 📊 Estadísticas (2025-10-21)

```sql
-- 5 usuarios con números asignados
SELECT COUNT(*) FROM profiles WHERE wallet_account_number IS NOT NULL;
-- Resultado: 5

-- Distribución de números
SELECT 
  SUBSTRING(wallet_account_number, 1, 4) as prefix,
  COUNT(*) as count
FROM profiles
WHERE wallet_account_number IS NOT NULL
GROUP BY prefix;
```

---

## 📞 Archivos Clave

| Archivo | Propósito |
|---------|-----------|
| `database/migrations/004-wallet-account-numbers.sql` | Migración de DB, RPC functions |
| `app/core/models/index.ts` | Interfaz UserProfile actualizada |
| `app/core/services/wallet-ledger.service.ts` | Método searchUserByWalletNumber() |
| `app/features/wallet/components/transfer-funds.component.ts` | UI de búsqueda por WAN |
| `app/features/wallet/wallet.page.ts` | Display de WAN propio + botón transferir |
| `app/features/wallet/wallet.page.html` | Card WAN + botón transferir |
| `app/features/profile/profile.page.ts` | Display de WAN en perfil |
| `app/features/profile/profile.page.html` | Sección WAN en sidebar |
| `WALLET_ACCOUNT_NUMBERS.md` | Este documento |

---

## 🐛 Historial de Bugs y Fixes

### Bug #1: RPC Function Type Mismatch (2025-10-21)

**Síntoma**: "Número de cuenta no encontrado" en frontend, error en función RPC

**Error**:
```
ERROR: structure of query does not match function result type
DETAIL: Returned type character varying(255) does not match expected type text in column 3.
```

**Root Cause**:
- Función declaraba `email TEXT` en RETURNS TABLE
- Columna real `auth.users.email` es `character varying(255)`
- PostgreSQL rechaza el type mismatch

**Fix Aplicado** (2025-10-21 15:45):
```sql
-- ANTES
RETURNS TABLE(
  id UUID,
  full_name TEXT,
  email TEXT,  -- ❌ Tipo incorrecto
  ...
)

-- DESPUÉS
RETURNS TABLE(
  id UUID,
  full_name TEXT,
  email VARCHAR(255),  -- ✅ Tipo correcto
  ...
)
```

**Pasos del fix**:
1. ✅ Actualizado migration file `004-wallet-account-numbers.sql`
2. ✅ DROP FUNCTION `search_users_by_wallet_number(TEXT)`
3. ✅ CREATE FUNCTION con tipo correcto
4. ✅ GRANT EXECUTE a authenticated
5. ✅ Verificado con query directa

**Verificación**:
```sql
-- Esta query ahora funciona correctamente
SELECT * FROM search_users_by_wallet_number('AR86996451050916');
-- Retorna: Eduardo Marques da Rosa
```

**Estado**: ✅ RESUELTO

---

**Última actualización**: 2025-10-21
**Versión**: 1.0.1
**Estado**: ✅ Implementado y funcional en producción
