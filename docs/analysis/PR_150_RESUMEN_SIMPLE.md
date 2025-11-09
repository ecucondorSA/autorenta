# 📋 PR #150 - Resumen Simple

## ¿Qué hace este PR?
Corrige **errores de TypeScript** que impiden compilar el proyecto.

## ¿Debo mergearlo?
⚠️ **NO todavía** - Tiene 1 problema que hay que arreglar primero.

---

## ❌ Problema Encontrado

El PR **remueve el email** de las consultas de withdrawal/refund requests porque Supabase no permite hacer queries anidadas a `auth.users`.

**PERO** el frontend **SÍ necesita el email** para mostrarlo en la pantalla de admin.

**Resultado**: Si merges así, la pantalla de admin mostrará "N/A" en lugar del email del usuario.

---

## ✅ Solución Rápida

Tienes 2 opciones:

### Opción 1: Agregar email a la tabla profiles (Recomendada)
```sql
-- 1. Agregar columna email a profiles
ALTER TABLE profiles ADD COLUMN email TEXT;

-- 2. Sincronizar emails desde auth.users
UPDATE profiles 
SET email = (
  SELECT email FROM auth.users WHERE auth.users.id = profiles.id
);

-- 3. Crear trigger para mantener sincronizado
CREATE OR REPLACE FUNCTION sync_profile_email()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles SET email = NEW.email WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER sync_email_on_auth_update
AFTER UPDATE OF email ON auth.users
FOR EACH ROW
EXECUTE FUNCTION sync_profile_email();
```

Luego actualizar el PR para incluir `email` en las queries:
```typescript
user:profiles!withdrawal_requests_user_id_fkey(full_name, email)
```

### Opción 2: Obtener email en el frontend (Más simple, menos eficiente)
En lugar de obtener el email en la query, hacer una query separada después:

```typescript
// En admin.service.ts, después de obtener withdrawal_requests
const userIds = withdrawals.map(w => w.user_id);
const { data: users } = await supabase.auth.admin.listUsers();
// Mapear emails a withdrawals
```

---

## 📝 Checklist Simple

Antes de mergear:

- [ ] **Arreglar el problema del email** (elegir Opción 1 o 2)
- [ ] **Verificar que compila**: `npm run build`
- [ ] **Verificar que funciona**: Probar pantalla de admin withdrawals/refunds

---

## 🎯 Recomendación

1. **Aplicar Opción 1** (agregar email a profiles)
2. **Actualizar el PR** para incluir `email` en las queries
3. **Mergear**

¿Quieres que prepare la migración SQL para la Opción 1?

