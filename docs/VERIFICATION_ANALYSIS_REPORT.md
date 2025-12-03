# Reporte de Análisis: Sistema de Verificación de Identidad

**Fecha:** 2025-12-02
**Analista:** Claude Code
**Usuario de prueba:** ecucondor@gmail.com (ID: 9dbf3b85-b085-44c9-ad07-51605af6d726)

---

## Resumen Ejecutivo

Se realizó un análisis completo del sistema de verificación de identidad de AutoRenta, identificando **8 problemas críticos** entre el frontend y la base de datos que afectan la experiencia del usuario y la integridad de los datos.

---

## 1. Análisis del Frontend

### 1.1 Páginas y Componentes Analizados

| Componente | Ruta | Estado |
|------------|------|--------|
| `ProfilePage` | `/profile` | Funcional |
| `ProfileVerificationPage` | `/profile/verification` | Con errores |
| `VerificationProgressComponent` | Shared | Inconsistente |
| `PhoneVerificationComponent` | Shared | DEBUG visible |
| `EmailVerificationComponent` | Shared | Funcional |
| `LicenseUploaderComponent` | Profile | Funcional |

### 1.2 Problemas Encontrados en Frontend

#### BUG-FE-001: RouterModule faltante
- **Archivo:** `apps/web/src/app/features/profile/verification-page/profile-verification.page.ts`
- **Línea:** 26-34
- **Descripción:** El componente usa `routerLink` en el template pero no importa `RouterModule`
- **Impacto:** El botón "Subir DNI" no navega a ningún lado
- **Estado:** ✅ ARREGLADO

```typescript
// ANTES (líneas 26-34)
imports: [
  CommonModule,
  IonicModule,
  // ... RouterModule faltaba
]

// DESPUÉS
imports: [
  CommonModule,
  RouterModule,  // Agregado
  IonicModule,
  // ...
]
```

#### BUG-FE-002: Ruta inexistente para subir DNI
- **Archivo:** `apps/web/src/app/features/profile/verification-page/profile-verification.page.ts`
- **Línea:** 122-124
- **Descripción:** El link apunta a `/verification/upload-documents` pero esa ruta no existe
- **Impacto:** Al hacer clic en "Subir DNI", no pasa nada (ruta no encontrada)
- **Estado:** ❌ PENDIENTE

```html
<!-- Código actual -->
<a routerLink="/verification/upload-documents">Subir DNI</a>
```

**Rutas disponibles en `verification.routes.ts`:**
```typescript
export const VERIFICATION_ROUTES: Routes = [
  {
    path: '',  // Solo existe /verification, NO /verification/upload-documents
    loadComponent: () => import('./verification.page').then((m) => m.VerificationPage),
  },
];
```

#### BUG-FE-003: Level 1 muestra "Completado" incorrectamente
- **Archivo:** `apps/web/src/app/shared/components/verification-progress/verification-progress.component.ts`
- **Descripción:** El indicador de Level 1 muestra "Completado" con check verde, pero los items internos (Email, Teléfono) muestran círculos vacíos
- **Impacto:** Confusión al usuario sobre su estado real de verificación
- **Estado:** ❌ PENDIENTE

**Evidencia visual:**
```
✓ Level 1: Explorador     [Completado]  ← Incorrecto
  ○ Email verificado                     ← Muestra vacío
  ○ Teléfono verificado                  ← Muestra vacío
```

#### BUG-FE-004: DEBUG info visible en producción
- **Archivo:** `apps/web/src/app/shared/components/phone-verification/phone-verification.component.ts`
- **Descripción:** Se muestra información de DEBUG en la UI que debería estar oculta
- **Impacto:** Mala experiencia de usuario, expone información técnica
- **Estado:** ❌ PENDIENTE

**Debug visible en UI:**
```
📞 DEBUG - Estado del componente:
isVerified: false
phone: null
otpSent: false
verifiedAt: null
canResend: true
cooldownSeconds: 0
```

#### BUG-FE-005: Error 404 en consulta user_stats
- **Archivo:** Servicio que consulta `user_stats`
- **Descripción:** Se intenta consultar la tabla `user_stats` que no existe
- **Impacto:** Error 404 en consola, posible degradación de funcionalidad
- **Estado:** ❌ PENDIENTE

**Error en consola:**
```
Failed to load resource: 404
GET /rest/v1/user_stats?select=*&user_id=eq.9dbf3b85-...

⚠️ Error loading user stats: {
  code: PGRST205,
  message: Could not find the table 'public.user_stats' in the schema cache
}
```

---

## 2. Análisis de Base de Datos

### 2.1 Tablas Relacionadas con Verificación

| Tabla | Propósito | Registros Usuario |
|-------|-----------|-------------------|
| `profiles` | Datos del perfil y flags de verificación | 1 |
| `auth.users` | Autenticación Supabase | 1 |
| `user_identity_levels` | Niveles de verificación | 1 |
| `user_verifications` | Historial de verificaciones | 0 |
| `user_documents` | Documentos subidos | 0 |
| `user_stats` | Estadísticas del usuario | **NO EXISTE** |

### 2.2 Estructura de Tablas Clave

#### Tabla: `profiles`
```sql
-- Campos de verificación relevantes
email_verified      BOOLEAN  -- Flag de email verificado
phone_verified      BOOLEAN  -- Flag de teléfono verificado
id_verified         BOOLEAN  -- Flag de identidad verificada
phone               TEXT     -- Número de teléfono
```

#### Tabla: `user_identity_levels`
```sql
user_id                    UUID
current_level              INTEGER   -- Nivel actual (1-3)
email_verified_at          TIMESTAMP
phone_verified_at          TIMESTAMP
id_verified_at             TIMESTAMP
driver_license_verified_at TIMESTAMP
```

### 2.3 Estado Actual del Usuario de Prueba

#### En `auth.users` (Supabase Auth):
```sql
SELECT email, email_confirmed_at, phone, phone_confirmed_at
FROM auth.users WHERE id = '9dbf3b85-b085-44c9-ad07-51605af6d726';

-- Resultado:
email               | email_confirmed_at          | phone | phone_confirmed_at
--------------------+-----------------------------+-------+-------------------
ecucondor@gmail.com | 2025-11-07 05:02:23.446529  | NULL  | NULL
                      ↑ EMAIL CONFIRMADO EN AUTH
```

#### En `profiles`:
```sql
SELECT email_verified, phone_verified, id_verified, phone
FROM profiles WHERE id = '9dbf3b85-b085-44c9-ad07-51605af6d726';

-- Resultado:
email_verified | phone_verified | id_verified | phone
---------------+----------------+-------------+------
FALSE          | FALSE          | TRUE        | NULL
↑ DESINCRONIZADO (debería ser TRUE)
```

#### En `user_identity_levels`:
```sql
SELECT current_level, email_verified_at, phone_verified_at
FROM user_identity_levels WHERE user_id = '9dbf3b85-b085-44c9-ad07-51605af6d726';

-- Resultado:
current_level | email_verified_at | phone_verified_at
--------------+-------------------+------------------
1             | NULL              | NULL
              ↑ DEBERÍA TENER FECHA
```

### 2.4 Problemas Encontrados en Base de Datos

#### BUG-DB-001: `profiles.email_verified` desincronizado
- **Descripción:** El campo `email_verified` en `profiles` es `FALSE`, pero `auth.users.email_confirmed_at` tiene fecha (2025-11-07)
- **Causa probable:** No existe trigger para sincronizar estos valores
- **Impacto:** La UI puede mostrar estado incorrecto
- **Estado:** ❌ PENDIENTE

#### BUG-DB-002: `user_identity_levels.email_verified_at` es NULL
- **Descripción:** El email está verificado en `auth.users` pero `email_verified_at` es NULL
- **Causa probable:** No se actualizó al verificar el email
- **Impacto:** Cálculo incorrecto del nivel de verificación
- **Estado:** ❌ PENDIENTE

#### BUG-DB-003: Tabla `user_stats` no existe
- **Descripción:** El frontend intenta consultar `user_stats` pero la tabla no existe
- **Impacto:** Error 404 en cada carga del perfil
- **Estado:** ❌ PENDIENTE

**Opciones de solución:**
1. Crear la tabla `user_stats`
2. Remover la consulta del frontend
3. Usar una vista que calcule las estadísticas

---

## 3. Flujo de Verificación Actual

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUJO DE VERIFICACIÓN                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   LEVEL 1   │───▶│   LEVEL 2   │───▶│   LEVEL 3   │         │
│  │ Explorador  │    │Participante │    │  Verificado │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│        │                  │                  │                  │
│        ▼                  ▼                  ▼                  │
│  ┌───────────┐     ┌───────────┐     ┌───────────┐             │
│  │ ○ Email   │     │ ○ DNI     │     │ ○ Selfie  │             │
│  │ ○ Teléfono│     │ ○ Licencia│     │           │             │
│  └───────────┘     └───────────┘     └───────────┘             │
│                                                                 │
│  Estado actual del usuario:                                     │
│  - Email: ✓ Verificado (en auth) / ✗ No sync (en profiles)    │
│  - Teléfono: ✗ No configurado                                  │
│  - DNI: ✗ No subido                                            │
│  - Licencia: ✗ No subida                                       │
│  - Selfie: ✗ No tomada                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Resumen de Bugs

### Frontend (5 bugs)

| ID | Severidad | Descripción | Estado |
|----|-----------|-------------|--------|
| FE-001 | Alta | RouterModule faltante | ✅ Arreglado |
| FE-002 | Alta | Ruta upload-documents no existe | ❌ Pendiente |
| FE-003 | Media | Level 1 status inconsistente | ❌ Pendiente |
| FE-004 | Baja | DEBUG visible en producción | ❌ Pendiente |
| FE-005 | Media | Error 404 user_stats | ❌ Pendiente |

### Base de Datos (3 bugs)

| ID | Severidad | Descripción | Estado |
|----|-----------|-------------|--------|
| DB-001 | Alta | profiles.email_verified desincronizado | ❌ Pendiente |
| DB-002 | Media | user_identity_levels.email_verified_at NULL | ❌ Pendiente |
| DB-003 | Media | Tabla user_stats no existe | ❌ Pendiente |

---

## 5. Plan de Acción Recomendado

### Fase 1: Arreglos Críticos (Alta prioridad)
1. ✅ ~~Agregar RouterModule~~ (HECHO)
2. Crear ruta `/verification/upload-documents` o cambiar a upload in-place
3. Crear trigger para sincronizar `auth.users.email_confirmed_at` → `profiles.email_verified`
4. Actualizar datos existentes desincronizados

### Fase 2: Arreglos Importantes (Media prioridad)
5. Corregir lógica de Level 1 status en VerificationProgressComponent
6. Crear tabla `user_stats` o vista materializada
7. Actualizar `user_identity_levels.email_verified_at` con trigger

### Fase 3: Mejoras (Baja prioridad)
8. Ocultar DEBUG info en producción (usar `environment.production`)
9. Agregar tests E2E para flujo de verificación
10. Mejorar mensajes de error al usuario

---

## 6. Queries de Diagnóstico Útiles

```sql
-- Ver estado de verificación de un usuario
SELECT
  p.id,
  p.full_name,
  p.email_verified AS profile_email_verified,
  au.email_confirmed_at IS NOT NULL AS auth_email_verified,
  p.phone_verified,
  p.id_verified,
  uil.current_level,
  uil.email_verified_at
FROM profiles p
JOIN auth.users au ON p.id = au.id
LEFT JOIN user_identity_levels uil ON p.id = uil.user_id
WHERE p.email = 'ecucondor@gmail.com';

-- Encontrar usuarios con email desincronizado
SELECT
  p.id,
  p.email,
  p.email_verified AS profile_says,
  au.email_confirmed_at IS NOT NULL AS auth_says
FROM profiles p
JOIN auth.users au ON p.id = au.id
WHERE p.email_verified != (au.email_confirmed_at IS NOT NULL);

-- Ver tablas que faltan
SELECT 'user_stats' AS missing_table
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'user_stats'
);
```

---

## 7. Archivos Modificados/A Modificar

### Ya modificados:
- `apps/web/src/app/features/profile/verification-page/profile-verification.page.ts` (RouterModule)

### Pendientes de modificar:
- `apps/web/src/app/features/verification/verification.routes.ts` (agregar ruta)
- `apps/web/src/app/shared/components/verification-progress/verification-progress.component.ts`
- `apps/web/src/app/shared/components/phone-verification/phone-verification.component.ts`
- `supabase/migrations/YYYYMMDD_sync_email_verified.sql` (nuevo)
- `supabase/migrations/YYYYMMDD_create_user_stats.sql` (nuevo)

---

*Reporte generado automáticamente por Claude Code*
