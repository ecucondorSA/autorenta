# 🔧 Guía de Arreglo: Supabase Linter Issues

**Fecha**: 2025-11-24
**Database**: pisqjmoklivzpwufhscx
**Issues a Arreglar**: 2 (onboarding_plan_templates, outbound_requests)
**Tiempo Estimado**: 5 minutos

---

## 📋 Resumen Rápido

Necesitamos habilitar RLS (Row Level Security) en 2 tablas:
- ✅ `onboarding_plan_templates` (CRÍTICO)
- ✅ `outbound_requests` (RECOMENDADO)

---

## 🚀 Pasos para Arreglar

### Paso 1: Ir al SQL Editor de Supabase

1. Abre: https://supabase.com/dashboard/project/pisqjmoklivzpwufhscx/sql
2. Haz clic en **"New Query"** (botón verde)
3. Dale un nombre: `Fix RLS Issues`

---

### Paso 2: Copiar y Ejecutar el Script SQL

Copia **TODO** el siguiente código SQL:

```sql
-- ============================================================================
-- SUPABASE LINTER FIX - RLS Configuration
-- Database: pisqjmoklivzpwufhscx
-- ============================================================================

-- STEP 1: Check RLS status BEFORE
SELECT
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('onboarding_plan_templates', 'outbound_requests')
ORDER BY tablename;

-- STEP 2: Enable RLS for onboarding_plan_templates (CRITICAL)
ALTER TABLE public.onboarding_plan_templates ENABLE ROW LEVEL SECURITY;

-- STEP 3: Create public read policy for onboarding_plan_templates
CREATE POLICY "public_read_onboarding_templates"
  ON public.onboarding_plan_templates
  FOR SELECT
  USING (true);

-- STEP 4: Enable RLS for outbound_requests
ALTER TABLE public.outbound_requests ENABLE ROW LEVEL SECURITY;

-- STEP 5: Create public read policy for outbound_requests
CREATE POLICY "public_read_outbound_requests"
  ON public.outbound_requests
  FOR SELECT
  USING (true);

-- STEP 6: Check RLS status AFTER
SELECT
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('onboarding_plan_templates', 'outbound_requests')
ORDER BY tablename;

-- STEP 7: Verify policies were created
SELECT
    tablename,
    policyname,
    qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('onboarding_plan_templates', 'outbound_requests')
ORDER BY tablename;
```

Pega el código en el editor SQL.

---

### Paso 3: Ejecutar el Script

1. Haz clic en el botón **"▶ Run"** (arriba a la derecha)
2. Espera a que se ejecute (5-10 segundos)
3. Deberías ver:
   - ✅ `ALTER TABLE` success
   - ✅ `CREATE POLICY` success (x2)
   - ✅ Resultados de las consultas SELECT

---

### Paso 4: Verificar que Funcionó

En el resultado de las consultas deberías ver:

**BEFORE:**
```
tablename | rls_enabled
-----------+-----------
onboarding_plan_templates | f
outbound_requests | f
```

**AFTER:**
```
tablename | rls_enabled
-----------+-----------
onboarding_plan_templates | t
outbound_requests | t
```

Y las políticas creadas:

```
tablename | policyname | qual
-----------|--------------------------|------
onboarding_plan_templates | public_read_onboarding_templates | true
outbound_requests | public_read_outbound_requests | true
```

---

### Paso 5: Re-ejecutar el Linter de Supabase

1. Ve a: https://supabase.com/dashboard/project/pisqjmoklivzpwufhscx/
2. En el menú lateral, busca **"Linter"** o **"Database"** → **"Linter"**
3. Haz clic en **"Re-run"** (botón verde)
4. Espera a que se recalcule

**Resultado esperado:**
- Issues: 22 → 20 ✅
- Las 18 vistas con SECURITY_DEFINER seguirán (son falsos positivos)
- Los 2 sistemas internos (cron, PostGIS) seguirán (son normales)

---

## 🐛 Solución de Problemas

### Si obtienes error: "permission denied"
**Solución**: Necesitas estar logueado como admin en Supabase.
- Verifica que estés usando la cuenta correcta
- Cierra sesión y vuelve a entrar

### Si obtienes error: "policy already exists"
**Solución**: Es normal si ejecutas el script 2 veces. El script usa `CREATE POLICY IF NOT EXISTS` para evitar esto.
- No hay problema, solo ignora el error

### Si los cambios no aparecen en el linter
**Solución**:
- Espera 30 segundos
- Recarga la página (F5)
- Re-ejecuta el linter manualmente

---

## 📝 Referencia: Qué Hace Cada Comando

| Comando | Propósito |
|---------|-----------|
| `SELECT tablename, rowsecurity FROM pg_tables` | Ver estado actual de RLS |
| `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` | Activar protección de filas |
| `CREATE POLICY "name" ON table FOR SELECT USING (true)` | Permitir lectura a todos |
| `SELECT * FROM pg_policies` | Ver políticas creadas |

---

## ✅ Checklist Final

- [ ] Copié el script SQL completo
- [ ] Fui a Supabase SQL Editor
- [ ] Pegué el script en un "New Query"
- [ ] Ejecuté el script (botón ▶ Run)
- [ ] Verifiqué que no hubo errores
- [ ] Vi `rls_enabled = t` en los resultados
- [ ] Fui al Linter y hice "Re-run"
- [ ] Los issues bajaron de 22 a 20 ✅

---

## 🎯 Resultado Final

**Antes**: 22 issues
```
✅ 18 SECURITY_DEFINER Views (falsos positivos - ignorar)
⚠️ 2 RLS disabled (onboarding_plan_templates, outbound_requests) ← ARREGLADO
✅ 2 Sistemas internos (cron, PostGIS - ignorar)
```

**Después**: 20 issues
```
✅ 18 SECURITY_DEFINER Views (falsos positivos - ignorar)
✅ 2 RLS disabled PERO SIN LAS NUESTRAS (arregladas)
✅ 2 Sistemas internos (cron, PostGIS - ignorar)
```

---

## 📚 Recursos Adicionales

- [Supabase Database Linter Docs](https://supabase.com/docs/guides/database/database-linter)
- [Row Level Security Guide](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [SQL Script saved in repo](./supabase/fix-linter-issues.sql)

---

**¿Necesitas ayuda?** Todas las instrucciones están en este documento. Si tienes problemas, revisa la sección de "Solución de Problemas".
