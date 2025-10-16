# 🔧 Instrucciones para Agregar 'both' al Enum user_role

## Problema
El enum `user_role` en Supabase solo tiene los valores `'owner'` y `'renter'`, pero el código necesita también `'both'`.

Error actual:
```
invalid input value for enum user_role: "both"
```

## Solución: Ejecutar SQL en Supabase Dashboard

### Opción 1: Agregar valor al enum existente (MÁS SIMPLE) ✅

Ve a **Supabase Dashboard → SQL Editor** y ejecuta:

```sql
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'both';
```

**Nota**: PostgreSQL 9.1+ soporta agregar valores a enums. Este es el método más simple y seguro.

---

### Opción 2: Si la Opción 1 no funciona (Recrear enum)

Si por alguna razón la Opción 1 falla, usa este método:

```sql
-- Paso 1: Crear nuevo enum con todos los valores
CREATE TYPE user_role_new AS ENUM ('owner', 'renter', 'both');

-- Paso 2: Actualizar la columna para usar el nuevo enum
ALTER TABLE profiles
  ALTER COLUMN role TYPE user_role_new
  USING role::text::user_role_new;

-- Paso 3: Eliminar el enum viejo
DROP TYPE user_role;

-- Paso 4: Renombrar el nuevo enum
ALTER TYPE user_role_new RENAME TO user_role;
```

---

### Opción 3: Crear función RPC reutilizable

Si prefieres tener una función que puedas llamar desde Node.js:

```sql
-- Crear función RPC
CREATE OR REPLACE FUNCTION add_both_to_user_role()
RETURNS void AS $$
BEGIN
  -- Verificar si 'both' ya existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'both'
    AND enumtypid = 'user_role'::regtype
  ) THEN
    ALTER TYPE user_role ADD VALUE 'both';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ejecutar la función
SELECT add_both_to_user_role();
```

Luego puedes llamarla desde Node.js:
```javascript
await supabase.rpc('add_both_to_user_role');
```

---

## Verificación

Después de ejecutar el SQL, verifica que funcionó:

```sql
-- Ver todos los valores del enum
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'user_role'::regtype
ORDER BY enumsortorder;
```

Deberías ver:
```
owner
renter
both
```

---

## Probar la actualización

Una vez completado, puedes probar desde la aplicación web o desde Node.js:

```bash
node scripts/test-profile-update.mjs
```

O directamente en el navegador: ir a **Mi Perfil** y cambiar el rol a **"Ambos"**.
