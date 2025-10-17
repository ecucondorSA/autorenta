# Auditoría: Flujo de Actualización de Fotos

**Fecha**: 2025-10-16
**Rama**: `audit/photo-update-flow`
**Error Reportado**: `new row violates row-level security policy`
**Contexto**: Usuario intenta cambiar foto de perfil (avatar)

---

## 1. Esquema de Base de Datos

### Tabla `profiles`
**Archivo**: `apps/web/database/setup-profiles.sql`

```sql
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,              -- ✅ Campo correcto
  default_currency TEXT NOT NULL DEFAULT 'ARS',
  role TEXT NOT NULL DEFAULT 'locatario' CHECK (role IN ('locador', 'locatario', 'ambos')),
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**RLS Policies**:
- ✅ `Users can view own profile` - SELECT (auth.uid() = id)
- ✅ `Users can update own profile` - UPDATE (auth.uid() = id)
- ✅ `Users can insert own profile` - INSERT (auth.uid() = id)
- ✅ `Authenticated users can view all profiles` - SELECT global

---

## 2. Supabase Storage

### Bucket `avatars`
**Archivo**: `apps/web/database/setup-profiles.sql` (líneas 69-109)

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;
```

**Storage Policies**:
- ✅ `Users can upload own avatar` - INSERT
  ✅ Valida: `bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text`

- ✅ `Users can update own avatar` - UPDATE
  ✅ Valida: `bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text`

- ✅ `Users can delete own avatar` - DELETE
  ✅ Valida: `bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text`

- ✅ `Anyone can view avatars` - SELECT (bucket público)

**Estructura de path esperada**: `avatars/{user_id}/{filename}`

---

## 3. Angular Services

### ProfileService (`apps/web/src/app/core/services/profile.service.ts`)

#### Método `uploadAvatar()` (líneas 97-140)

```typescript
async uploadAvatar(file: File): Promise<string> {
  const { data: { user } } = await this.supabase.auth.getUser();
  if (!user) throw new Error('Usuario no autenticado');

  // Validaciones
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo debe ser una imagen');
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('La imagen no debe superar 2MB');
  }

  const extension = file.name.split('.').pop() ?? 'jpg';
  const filePath = `avatars/${user.id}/${uuidv4()}.${extension}`;  // ❌ PROBLEMA DETECTADO

  // Subir archivo
  const { error: uploadError } = await this.supabase.storage
    .from('avatars')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) throw uploadError;

  // Obtener URL pública
  const { data: { publicUrl } } = this.supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);

  // Actualizar perfil
  await this.updateProfile({ avatar_url: publicUrl });

  return publicUrl;
}
```

---

## 4. Root Cause Analysis (RCA)

### 🔴 PROBLEMA IDENTIFICADO

**Línea 117** en `profile.service.ts`:
```typescript
const filePath = `avatars/${user.id}/${uuidv4()}.${extension}`;
```

**Expected by Storage Policy**:
```
{user_id}/{filename}
```

**Actual path being used**:
```
avatars/{user_id}/{filename}
```

### Explicación del Error

Las políticas RLS de Supabase Storage validan la estructura del path con:
```sql
(storage.foldername(name))[1] = auth.uid()::text
```

Esto significa:
- `foldername(name)` extrae las carpetas del path
- `[1]` toma la **primera** carpeta
- Debe coincidir con el `auth.uid()`

**Con el path actual** `avatars/123-uuid/file.jpg`:
- `foldername` devuelve: `['avatars', '123-uuid']`
- `[1]` = `'avatars'` ❌ (NO coincide con user.id)

**Con el path correcto** `123-uuid/file.jpg`:
- `foldername` devuelve: `['123-uuid']`
- `[1]` = `'123-uuid'` ✅ (coincide con user.id)

### Por Qué Falla la Policy

La policy espera que la primera carpeta sea el `user_id`, pero el código está incluyendo `avatars/` como prefijo, lo que hace que la validación falle con:

```
new row violates row-level security policy
```

---

## 5. Análisis de Inconsistencias

### 🔍 Comparación con CarsService

En `cars.service.ts` (línea 30), el path **NO** incluye el bucket:
```typescript
const filePath = `${userId}/${carId}/${uuidv4()}.${extension}`;
// ✅ Correcto: NO incluye 'car-images/' en el path
```

### 🔍 TypeScript Types

En `database.types.ts` (líneas 201-205):
```typescript
export const STORAGE_BUCKETS = {
  AVATARS: 'avatars',        // Nombre del bucket
  CAR_IMAGES: 'car-images',  // Nombre del bucket
  DOCUMENTS: 'documents',
} as const;
```

Estos son solo los **nombres de los buckets**, no deben ser parte del **path** del archivo.

---

## 6. Solución Propuesta

### Fix para ProfileService.uploadAvatar()

**Cambiar línea 117**:
```typescript
// ❌ ANTES (incorrecto)
const filePath = `avatars/${user.id}/${uuidv4()}.${extension}`;

// ✅ DESPUÉS (correcto)
const filePath = `${user.id}/${uuidv4()}.${extension}`;
```

### Fix para ProfileService.deleteAvatar()

**Revisar línea 156** (extracción del path):
```typescript
// ❌ ANTES (puede fallar si la URL tiene estructura incorrecta)
const pathParts = url.pathname.split('/avatars/');
if (pathParts.length > 1) {
  const storagePath = `avatars/${pathParts[1]}`;  // ❌ Añade prefijo innecesario
  await this.supabase.storage.from('avatars').remove([storagePath]);
}

// ✅ DESPUÉS (correcto)
const pathParts = url.pathname.split('/avatars/');
if (pathParts.length > 1) {
  const storagePath = pathParts[1];  // ✅ Sin prefijo de bucket
  await this.supabase.storage.from('avatars').remove([storagePath]);
}
```

---

## 7. Testing Plan

### Tests a Ejecutar

1. **Upload Avatar**:
   - ✅ Subir imagen nueva (usuario sin avatar)
   - ✅ Reemplazar imagen existente (upsert: true)
   - ✅ Validar que la URL se guarda correctamente en profiles.avatar_url

2. **Delete Avatar**:
   - ✅ Eliminar avatar existente
   - ✅ Verificar que el archivo se elimina del storage
   - ✅ Verificar que el campo avatar_url se limpia

3. **RLS Policies**:
   - ✅ Usuario solo puede subir a su propia carpeta
   - ✅ Usuario no puede acceder a carpetas de otros usuarios
   - ✅ Todos pueden ver avatares (bucket público)

### Casos Edge

- ❌ Archivo > 2MB (debe rechazar)
- ❌ Archivo no es imagen (debe rechazar)
- ❌ Usuario no autenticado (debe rechazar)
- ✅ Usuario con sesión válida

---

## 8. Files to Modify

| Archivo | Líneas | Cambio |
|---------|--------|--------|
| `apps/web/src/app/core/services/profile.service.ts` | 117 | Remover prefijo `avatars/` del filePath |
| `apps/web/src/app/core/services/profile.service.ts` | 156 | Remover prefijo `avatars/` del storagePath |

---

## 9. Verification Checklist

- [x] Fix aplicado en profile.service.ts (líneas 117 y 156)
- [x] Verificar que CarsService usa el mismo patrón (sin prefijo de bucket) ✅
- [ ] Probar upload de avatar en desarrollo
- [ ] Probar delete de avatar en desarrollo
- [ ] Verificar que las URLs públicas funcionan
- [ ] Commit con mensaje descriptivo
- [ ] Merge a main

## 10. Changes Applied

### File: `apps/web/src/app/core/services/profile.service.ts`

**Change 1 - uploadAvatar() method (line 117)**:
```diff
- const filePath = `avatars/${user.id}/${uuidv4()}.${extension}`;
+ const filePath = `${user.id}/${uuidv4()}.${extension}`;
```

**Change 2 - deleteAvatar() method (line 156)**:
```diff
- const storagePath = `avatars/${pathParts[1]}`;
+ const storagePath = pathParts[1];
```

### Verification

✅ **CarsService already uses correct pattern**:
```typescript
// Line 30 in cars.service.ts
const filePath = `${userId}/${carId}/${uuidv4()}.${extension}`;
// ✅ No bucket prefix
```

The fix aligns ProfileService with the existing CarsService implementation.

---

## 10. Prevention

### Lessons Learned

1. **Storage paths NO deben incluir el nombre del bucket**
   - El bucket se especifica en `.from('nombre-bucket')`
   - El path solo debe contener la estructura interna

2. **Documentar convenciones de paths**
   - Crear guía de Storage en CLAUDE.md
   - Agregar ejemplos de paths correctos

3. **Agregar tests unitarios para Storage**
   - Validar estructura de paths
   - Mockear Supabase Storage client

### Future Improvements

- [ ] Agregar constantes para path patterns
- [ ] Crear helper functions para construir paths
- [ ] Agregar validaciones de path en compile-time (TypeScript)
- [ ] Documentar Storage architecture en CLAUDE.md

---

**Status**: ✅ Root cause identified
**Next Action**: Implement fixes
