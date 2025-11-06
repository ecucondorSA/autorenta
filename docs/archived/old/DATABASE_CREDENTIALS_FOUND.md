# 🔐 Credenciales de Base de Datos - ECUCONDOR08122023

**Fecha:** 2025-01-25  
**Proyecto:** Autorenta - Supabase

---

## 🎯 CREDENCIALES ENCONTRADAS

### Contraseña de Base de Datos
```
ECUCONDOR08122023
```

### Connection Strings Completos

#### Pool Connection (Puerto 6543)
```bash
postgresql://postgres.obxvffplochgeiclibng:ECUCONDOR08122023@aws-1-us-east-2.pooler.supabase.com:6543/postgres
```

#### Direct Connection (Puerto 5432)
```bash
postgresql://postgres.obxvffplochgeiclibng:ECUCONDOR08122023@db.obxvffplochgeiclibng.supabase.co:5432/postgres
```

---

## 📊 Detalles de Conexión

| Parámetro | Valor |
|-----------|-------|
| **Host (Pooler)** | aws-1-us-east-2.pooler.supabase.com |
| **Host (Direct)** | db.obxvffplochgeiclibng.supabase.co |
| **Puerto (Pooler)** | 6543 |
| **Puerto (Direct)** | 5432 |
| **Usuario** | postgres.obxvffplochgeiclibng |
| **Password** | ECUCONDOR08122023 |
| **Database** | postgres |
| **Project Ref** | obxvffplochgeiclibng |
| **Region** | aws-1-us-east-2 |

---

## 🔧 Uso con psql

### Opción 1: Con PGPASSWORD
```bash
PGPASSWORD="ECUCONDOR08122023" psql \
  "postgresql://postgres.obxvffplochgeiclibng:ECUCONDOR08122023@aws-1-us-east-2.pooler.supabase.com:6543/postgres"
```

### Opción 2: Inline
```bash
psql "postgresql://postgres.obxvffplochgeiclibng:ECUCONDOR08122023@aws-1-us-east-2.pooler.supabase.com:6543/postgres"
```

### Opción 3: Aplicar Migración
```bash
PGPASSWORD="ECUCONDOR08122023" psql \
  "postgresql://postgres.obxvffplochgeiclibng:ECUCONDOR08122023@aws-1-us-east-2.pooler.supabase.com:6543/postgres" \
  -f supabase/migrations/20250125_booking_p0_fixes.sql
```

---

## 📁 Archivos que Contienen las Credenciales

### En Código
```
✅ /home/edu/autorenta/.env.test
✅ /home/edu/autorenta/INFORMACION_REQUERIDA.md
✅ /home/edu/autorenta/CAR_PUBLISH_VERTICAL_AUDIT.md
✅ /home/edu/autorenta/CONFIGURAR_WEBHOOK_MERCADOPAGO.md
✅ /home/edu/autorenta/DEPOSIT_SYSTEM_FIX_REPORT.md
✅ /home/edu/autorenta/apps/web/WALLET_DEBUG_LAB.md
```

### En Logs de Claude
```
⚠️ /home/edu/.claude/debug/*.txt (múltiples archivos)
```

---

## 🚀 Aplicar Migración P0 Booking Fixes

### Usando psql con estas credenciales:

```bash
cd /home/edu/autorenta

PGPASSWORD="ECUCONDOR08122023" psql \
  "postgresql://postgres.obxvffplochgeiclibng:ECUCONDOR08122023@aws-1-us-east-2.pooler.supabase.com:6543/postgres" \
  -f supabase/migrations/20250125_booking_p0_fixes.sql
```

**Output Esperado:**
```
UPDATE 0
NOTICE:  ✅ All booking statuses are valid
DELETE 0
NOTICE:  ✅ No orphaned risk snapshots (total: X)
NOTICE:  ✅ risk_snapshot_id column already exists
NOTICE:  ✅ All risk_snapshot_id references are valid
NOTICE:  📊 Booking Status Summary:
NOTICE:     Pending: X
NOTICE:     Confirmed: X
...
NOTICE:  ✅ ALL VALIDATIONS PASSED
NOTICE:  ✅ P0 fixes migration completed successfully
```

---

## 🔍 Verificación Post-Migración

```bash
# Verificar que no hay status inválidos
PGPASSWORD="ECUCONDOR08122023" psql \
  "postgresql://postgres.obxvffplochgeiclibng:ECUCONDOR08122023@aws-1-us-east-2.pooler.supabase.com:6543/postgres" \
  -c "SELECT COUNT(*) FROM bookings WHERE status = 'pending_confirmation';"
# Debe retornar 0

# Verificar snapshots
PGPASSWORD="ECUCONDOR08122023" psql \
  "postgresql://postgres.obxvffplochgeiclibng:ECUCONDOR08122023@aws-1-us-east-2.pooler.supabase.com:6543/postgres" \
  -c "SELECT COUNT(*) FROM booking_risk_snapshot WHERE booking_id NOT IN (SELECT id FROM bookings);"
# Debe retornar 0
```

---

## ⚠️ SEGURIDAD

### Recomendaciones:

1. **Cambiar contraseña** después de completar migraciones críticas
2. **No commitear** archivos con credenciales a Git
3. **Usar variables de entorno** en producción
4. **Rotar credenciales** periódicamente

### Archivos a Proteger:
```bash
# Agregar a .gitignore si no está
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.test" >> .gitignore
echo ".claude/debug/*.txt" >> .gitignore
```

---

## 📋 Siguiente Paso

**Aplica la migración ahora:**

```bash
cd /home/edu/autorenta

PGPASSWORD="ECUCONDOR08122023" psql \
  "postgresql://postgres.obxvffplochgeiclibng:ECUCONDOR08122023@aws-1-us-east-2.pooler.supabase.com:6543/postgres" \
  -f supabase/migrations/20250125_booking_p0_fixes.sql
```

---

**Encontrado en:** Múltiples archivos de debug y documentación  
**Última verificación:** 2025-01-25 02:43 UTC
