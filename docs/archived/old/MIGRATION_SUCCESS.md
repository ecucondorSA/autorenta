# ✅ Migración de Base de Datos Completada

**Fecha**: 2025-10-16
**Base de Datos**: Supabase PostgreSQL
**Estado**: ✅ EXITOSO

---

## 📊 Resumen de Migraciones Ejecutadas

### 1. expand-profiles-fixed.sql

✅ **Tipos Enumerados Creados**:
- `kyc_status` - Estados de verificación KYC
- `onboarding_status` - Estados de onboarding
- `document_kind` - Tipos de documentos

✅ **Columnas Agregadas a `profiles` (30+ campos)**:
- Información de contacto: `phone`, `whatsapp`
- Documentos de identidad: `gov_id_type`, `gov_id_number`, `driver_license_*`
- Dirección: `address_line1`, `address_line2`, `city`, `state`, `postal_code`, `country`
- Preferencias: `timezone`, `locale`, `currency`
- Estados: `kyc`, `onboarding`
- Términos: `tos_accepted_at`, `marketing_opt_in`
- Notificaciones: `notif_prefs` (JSONB)
- Métricas: `rating_avg`, `rating_count`
- Verificaciones: `is_email_verified`, `is_phone_verified`, `is_driver_verified`
- Admin: `is_admin`

✅ **Tablas Creadas**:
- `user_documents` - Documentos de verificación KYC
- `profile_audit` - Auditoría de cambios en perfil

✅ **Funciones/RPCs Creadas**:
- `update_profile_safe(_payload JSONB)` - Actualización segura con whitelist
- `set_avatar(_public_url TEXT)` - Actualizar URL de avatar
- `is_admin()` - Verificar si usuario es admin

✅ **Vistas Creadas**:
- `me_profile` - Perfil enriquecido con permisos derivados (`can_publish_cars`, `can_book_cars`)

✅ **Políticas RLS**:
- `user_documents`: Usuario puede ver/insertar sus documentos, admin puede gestionar todos
- `profile_audit`: Usuario puede ver su auditoría, admin puede ver todas

### 2. setup-storage-documents.sql

✅ **Bucket de Storage Creado**:
- `documents` (privado) - Para documentos de verificación KYC

✅ **Políticas RLS para Storage**:
- `owner read own documents` - Usuario lee sus documentos
- `owner upload own documents` - Usuario sube sus documentos
- `owner update own documents` - Usuario actualiza sus documentos
- `owner delete own documents` - Usuario elimina sus documentos
- `admin read all documents` - Admin lee todos los documentos
- `admin manage all documents` - Admin gestiona todos los documentos

---

## 🔍 Verificación de Estructura

### Tabla `profiles` - Verificado ✅

```
Total de columnas: 38
Nuevas columnas agregadas: 30+
Tipos enumerados: user_role, kyc_status, onboarding_status
Índices: profiles_pkey, idx_profiles_role, profiles_dni_key
```

### Tabla `user_documents` - Verificado ✅

```
Columnas: id, user_id, kind, storage_path, status, notes, created_at, reviewed_by, reviewed_at
Índices: idx_user_documents_user_id, idx_user_documents_status
RLS: Habilitado
```

### Tabla `profile_audit` - Verificado ✅

```
Columnas: id, user_id, changed_by, changes (JSONB), created_at
Índices: idx_profile_audit_user_id, idx_profile_audit_created_at
RLS: Habilitado
```

### Vista `me_profile` - Verificado ✅

```sql
SELECT p.*,
  (p.role IN ('owner', 'both')) AS can_publish_cars,
  (p.role IN ('renter', 'both')) AS can_book_cars
FROM public.profiles p
WHERE p.id = auth.uid();
```

### Funciones RPC - Verificado ✅

1. ✅ `update_profile_safe(_payload JSONB)` → RETURNS profiles
2. ✅ `set_avatar(_public_url TEXT)` → RETURNS VOID
3. ✅ `is_admin()` → RETURNS BOOLEAN

---

## 📋 Compatibilidad con Código TypeScript

### Tipos Alineados ✅

**Base de Datos (SQL)**:
```sql
user_role ENUM ('renter', 'owner', 'admin', 'both')
kyc_status ENUM ('not_started', 'pending', 'verified', 'rejected')
onboarding_status ENUM ('incomplete', 'complete')
document_kind ENUM ('gov_id_front', 'gov_id_back', 'driver_license', 'utility_bill', 'selfie')
```

**TypeScript (models/index.ts)**:
```typescript
export type Role = 'renter' | 'owner' | 'admin' | 'both';
export type KycStatus = 'not_started' | 'pending' | 'verified' | 'rejected';
export type OnboardingStatus = 'incomplete' | 'complete';
export type DocumentKind = 'gov_id_front' | 'gov_id_back' | 'driver_license' | 'utility_bill' | 'selfie';
```

✅ **100% compatibles**

---

## 🔐 Seguridad RLS Verificada

### Políticas Activas

| Tabla | Política | Permite |
|-------|----------|---------|
| `profiles` | Users can view own profile | SELECT (self) |
| `profiles` | Users can update own profile | UPDATE (self) |
| `profiles` | Authenticated users can view all profiles | SELECT (all) |
| `user_documents` | owner can see own documents | SELECT (self) |
| `user_documents` | owner can insert own documents | INSERT (self) |
| `user_documents` | admin can manage documents | ALL (admin) |
| `profile_audit` | user sees own audit | SELECT (self + admin) |
| `storage.objects` (documents) | owner read own documents | SELECT (self) |
| `storage.objects` (documents) | owner upload own documents | INSERT (self) |
| `storage.objects` (documents) | owner update own documents | UPDATE (self) |
| `storage.objects` (documents) | owner delete own documents | DELETE (self) |
| `storage.objects` (documents) | admin read all documents | SELECT (admin) |
| `storage.objects` (documents) | admin manage all documents | ALL (admin) |

---

## 🧪 Pruebas Sugeridas

### 1. Probar Vista `me_profile`

```sql
-- Como usuario autenticado
SELECT * FROM me_profile;

-- Debería retornar:
-- - Todos los campos de profiles
-- - can_publish_cars (boolean)
-- - can_book_cars (boolean)
```

### 2. Probar `update_profile_safe`

```sql
SELECT * FROM update_profile_safe('{
  "full_name": "Juan Pérez",
  "phone": "+5491112345678",
  "city": "Buenos Aires"
}'::jsonb);

-- Debería retornar el perfil actualizado
-- Y crear un registro en profile_audit
```

### 3. Probar Subida de Documento (desde Angular)

```typescript
// En ProfileService
const file = new File([...], 'dni-front.jpg');
const document = await profileService.uploadDocument(file, 'gov_id_front');

// Debería:
// 1. Subir archivo a storage.objects en bucket 'documents'
// 2. Crear registro en user_documents con status 'pending'
```

### 4. Verificar RLS

```sql
-- Intentar ver documentos de otro usuario (debería fallar)
SELECT * FROM user_documents WHERE user_id != auth.uid();

-- Debería retornar 0 filas (bloqueado por RLS)
```

---

## ✅ Checklist Final

- [x] Tipos enumerados creados
- [x] Columnas agregadas a `profiles`
- [x] Tabla `user_documents` creada con RLS
- [x] Tabla `profile_audit` creada con RLS
- [x] Vista `me_profile` creada
- [x] Función `update_profile_safe` creada
- [x] Función `set_avatar` creada
- [x] Función `is_admin` creada
- [x] Bucket `documents` creado
- [x] Políticas RLS para storage creadas
- [x] Índices optimizados creados
- [x] Comentarios de documentación agregados

---

## 🚀 Próximos Pasos

### 1. Frontend (Angular)

- ✅ Models actualizados (`core/models/index.ts`)
- ✅ ProfileService expandido (`core/services/profile.service.ts`)
- ✅ Guards creados (`core/guards/onboarding.guard.ts`)
- ⏳ **Pendiente**: Integrar guards en rutas
- ⏳ **Pendiente**: Reemplazar ProfilePage con ProfileExpandedPage (opcional)

### 2. Testing

1. **Crear usuario de prueba** en Supabase Auth
2. **Completar perfil** usando ProfileService
3. **Subir documentos** de verificación
4. **Probar guards** en rutas protegidas
5. **Verificar auditoría** en profile_audit

### 3. Documentación

- ✅ `PROFILE_EXPANSION_GUIDE.md` - Guía completa
- ✅ `MIGRATION_SUCCESS.md` - Este documento
- ⏳ **Pendiente**: Actualizar `CLAUDE.md` con nuevos guards

---

## 📞 Soporte

Si encuentras algún problema:

1. **Verificar logs de Supabase**: Dashboard → Database → Logs
2. **Revisar políticas RLS**: Dashboard → Authentication → Policies
3. **Consultar documentación**: `PROFILE_EXPANSION_GUIDE.md`
4. **Verificar tipos**: Asegurar que TypeScript y SQL coincidan

---

**Migración completada con éxito el 2025-10-16 23:57 UTC** ✅
