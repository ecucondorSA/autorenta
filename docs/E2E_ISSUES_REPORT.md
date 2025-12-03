# Reporte de Problemas E2E - AutoRenta

**Fecha:** 2025-12-03
**Ambiente:** Development (localhost:4200)
**Usuario de prueba:** admin-test@autorenta.com

---

## 1. Problemas de Verificación de Identidad

### 1.1 Inconsistencia entre Enum de BD y Código Frontend

**Severidad:** Alta
**Ubicación:** `apps/web/src/app/features/profile/verification-page/components/license-uploader.component.ts`

**Problema:**
El componente `LicenseUploaderComponent` intenta guardar documentos con kinds `license_front` y `license_back`, pero el enum `document_kind` en la base de datos solo acepta:
- `gov_id_front`
- `gov_id_back`
- `driver_license`
- `utility_bill`
- `selfie`

**Código afectado:**
```typescript
// license-uploader.component.ts:42
(change)="onFileSelected($event, 'license_front')"

// license-uploader.component.ts:78
(change)="onFileSelected($event, 'license_back')"
```

**Error en BD:**
```sql
ERROR: invalid input value for enum document_kind: "license_front"
```

**Solución sugerida:**
Opción A: Agregar `license_front` y `license_back` al enum en BD
Opción B: Cambiar el código para usar `driver_license` y manejar frente/dorso con metadata

---

### 1.2 Múltiples Fuentes de Estado de Verificación

**Severidad:** Media
**Ubicación:** UI de perfil vs header de navegación

**Problema:**
El header muestra "Verificado para alquiler" (badge verde) pero el panel de "Estado de Verificación" en el perfil muestra todo como "Sin verificar".

**Causa:**
- El header lee de `user_verifications` (status = 'VERIFICADO')
- El panel de perfil lee de campos individuales en `profiles` (email_verified, phone_verified, id_verified)
- Ambos no están sincronizados

**Tablas involucradas:**
- `profiles.email_verified` → false (no se actualiza automáticamente)
- `profiles.phone_verified` → false
- `profiles.id_verified` → false (lo actualizamos manualmente a true)
- `user_verifications.status` → 'VERIFICADO'

**Solución sugerida:**
Crear un trigger o función que sincronice ambas fuentes, o unificar la lógica de verificación en un solo lugar.

---

### 1.3 Configuración de Documentos Desincronizada

**Severidad:** Media
**Ubicación:** `apps/web/src/app/core/config/document-types.config.ts`

**Problema:**
El archivo de configuración define `driver_license` como un solo documento, pero la UI de verificación espera frente y dorso separados.

**Configuración actual:**
```typescript
driver_license: {
  id: 'driver_license',
  label: 'Licencia de Conducir',
  // ... solo un registro
}
```

**Pero la UI espera:**
- `license_front` → Frente de licencia
- `license_back` → Dorso de licencia

---

## 2. Problemas de Formularios

### 2.1 Teléfono - Validación de Formato

**Severidad:** Baja
**Ubicación:** `/profile/contact` - Formulario de contacto

**Problema:**
El campo de teléfono muestra "Número de teléfono inválido" cuando se ingresan espacios en el número (ej: "11 5555 1234").

**Comportamiento esperado:**
El formulario debería aceptar formatos comunes como:
- 11 5555 1234
- 11-5555-1234
- (11) 5555-1234

**Comportamiento actual:**
Solo acepta números sin espacios: `1155551234`

---

### 2.2 Auto-guardado sin Feedback Visual

**Severidad:** Baja
**Ubicación:** `/profile/contact`

**Problema:**
El formulario de contacto tiene auto-guardado, pero no muestra ningún indicador visual de que los datos se están guardando o se guardaron correctamente.

**Mejora sugerida:**
Agregar un toast o indicador de "Guardando..." / "Guardado" como en otras aplicaciones modernas.

---

## 3. Problemas de Base de Datos

### 3.1 Falta de Constraint UNIQUE en user_documents

**Severidad:** Media
**Ubicación:** Tabla `user_documents`

**Problema:**
No existe un constraint único para `(user_id, kind)`, lo que permite documentos duplicados del mismo tipo para un usuario.

**Evidencia:**
```sql
-- Esto falla porque no hay constraint único:
ON CONFLICT (user_id, kind) DO UPDATE...
ERROR: there is no unique or exclusion constraint matching the ON CONFLICT specification
```

**Solución sugerida:**
```sql
ALTER TABLE user_documents
ADD CONSTRAINT user_documents_user_kind_unique
UNIQUE (user_id, kind);
```

---

### 3.2 Campos de Verificación Redundantes

**Severidad:** Baja
**Ubicación:** Tabla `profiles`

**Problema:**
Existen campos redundantes para el estado de verificación:
- `profiles.email_verified`
- `profiles.phone_verified`
- `profiles.id_verified`
- `user_verifications.status`
- `user_documents.status`

**Impacto:**
La lógica de negocio debe consultar múltiples tablas para determinar el estado real de verificación de un usuario.

---

## 4. Problemas de UX/UI

### 4.1 Sesión Perdida sin Redirección Apropiada

**Severidad:** Media
**Ubicación:** Navegación general

**Problema:**
Durante las pruebas, la sesión se perdió y la página de `/profile/location-settings` mostró el formulario de login en lugar de redirigir a `/auth/login`.

**Comportamiento esperado:**
Redirigir a la página de login con return URL para volver después de autenticarse.

---

### 4.2 Sección de Verificación Facial Bloqueada

**Severidad:** Baja (si es intencional)
**Ubicación:** `/profile/verification`

**Problema:**
La sección "Verificación Facial" está bloqueada con el mensaje "Completa Nivel 2", pero no está claro qué pasos exactos se requieren para desbloquearla.

**Mejora sugerida:**
Mostrar tooltip o mensaje explicativo de qué requisitos faltan.

---

## 5. Resumen de Datos Guardados Correctamente

A pesar de los problemas, los siguientes datos se guardaron correctamente en la BD:

| Campo | Valor | Tabla |
|-------|-------|-------|
| phone | 1155551234 | profiles |
| address_line1 | Av. Santa Fe 1500, Recoleta, Buenos Aires... | profiles |
| city | Buenos Aires | profiles |
| state | CABA | profiles |
| postal_code | C1425 | profiles |
| home_latitude | -34.59588100 | profiles |
| home_longitude | -58.38830900 | profiles |
| gov_id_front | verified | user_documents |
| gov_id_back | verified | user_documents |
| driver_license | verified | user_documents |
| driver status | VERIFICADO | user_verifications |
| owner status | VERIFICADO | user_verifications |

---

## 6. Acciones Recomendadas

### Prioridad Alta - ✅ RESUELTOS
1. [x] Sincronizar enum `document_kind` con el código frontend
   - **Migración:** `20251203_fix_verification_issues.sql`
   - Agregados: `license_front`, `license_back`, `vehicle_registration`, `vehicle_insurance`

2. [x] Agregar constraint UNIQUE a `user_documents(user_id, kind)`
   - **Migración:** `20251203_fix_verification_issues.sql`

3. [x] Unificar lógica de estado de verificación
   - Trigger `sync_profile_verification_status()` sincroniza automáticamente

### Prioridad Media - ✅ RESUELTOS
4. [x] Agregar trigger para sincronizar `profiles.*_verified` con `user_verifications`
   - **Migración:** `20251203_fix_verification_issues.sql`
   - Trigger en `user_verifications` y `user_documents`

5. [ ] Mejorar manejo de sesión expirada (pendiente)

6. [x] Agregar feedback visual en auto-guardado
   - **Componente:** `profile-contact-section.component.ts`
   - Indicador "Guardando..." y "Guardado" con animación

### Prioridad Baja - ✅ RESUELTOS
7. [x] Flexibilizar validación de formato de teléfono
   - **Archivo:** `profile-validators.ts`
   - Ahora acepta: espacios, guiones, paréntesis (ej: "11 5555 1234")
   - También actualizado en: `register.page.ts`, `profile-wizard.component.ts`

8. [ ] Agregar tooltips explicativos en secciones bloqueadas (pendiente)

---

## 7. Gaps Críticos de Funcionalidad (Encontrados en Segunda Revisión)

### 7.1 Avatar Upload - NO IMPLEMENTADO
**Archivo:** `profile-expanded.page.ts:188-191`
```typescript
onAvatarChange(_event: Event): void {
  // Placeholder - implement avatar upload logic
  console.log('Avatar upload not yet implemented');
}
```
**Impacto:** Usuario no puede subir foto de perfil desde la UI

### 7.2 Datos Personales - SIN FORMULARIO DE EDICIÓN
**Campos faltantes en UI:**
- `date_of_birth` - No hay campo para ingresar fecha de nacimiento
- `gov_id_number` - No hay campo para ingresar número de DNI
- `role` - No hay forma de cambiar entre locatario/locador/ambos

**Rutas de perfil existentes:**
- `/profile` - Solo muestra datos, no edita
- `/profile/contact` - Solo teléfono/dirección
- `/profile/preferences` - Solo idioma/zona horaria
- `/profile/verification` - Solo documentos
- `/profile/security` - Solo contraseña

**Falta:** Una ruta `/profile/personal` o similar para editar datos básicos

### 7.3 Verificación de Email - INCONSISTENCIA DE CAMPOS
**Problema:** El template usa campos diferentes a los de la BD

| Template (profile-expanded.page.html) | BD (profiles) | Match |
|---------------------------------------|---------------|-------|
| `is_email_verified` | `email_verified` | ❌ NO |
| `is_phone_verified` | `phone_verified` | ❌ NO |
| `is_driver_verified` | `id_verified` | ❌ NO |

**Resultado:** La UI siempre muestra "Sin verificar" aunque la BD tenga `true`

### 7.4 Subida Real de Documentos - NO FUNCIONA
**Problema:** Los componentes `DniUploaderComponent` y `LicenseUploaderComponent` intentan subir archivos pero:
1. El `document_kind` enum no tenía los valores correctos (CORREGIDO)
2. La subida real a Supabase Storage no fue probada
3. No hay validación de tamaño/formato de imagen

### 7.5 Verificación Facial (Selfie) - NO IMPLEMENTADO
**Archivo:** `profile-verification.page.html`
- La sección existe en la UI pero está "Bloqueada"
- No hay componente `SelfieUploaderComponent`
- El enum tiene `selfie` pero no hay uploader

### 7.6 Comprobante de Residencia - NO IMPLEMENTADO
**Enum disponible:** `utility_bill`
**UI:** No existe uploader para este documento

### 7.7 Documentos de Vehículo - NO IMPLEMENTADOS
**Enums disponibles (recién agregados):**
- `vehicle_registration`
- `vehicle_insurance`

**UI:** No existen uploaders para estos documentos

---

## 8. Estado Real del Usuario de Prueba

| Campo | Valor en BD | Mostrado en UI | Problema |
|-------|-------------|----------------|----------|
| full_name | Admin E2E Test | ✓ Correcto | - |
| email | admin-test@autorenta.com | ✓ Correcto | - |
| phone | 1155551234 | ✓ Correcto | - |
| role | `locatario` | "Ambos" | ❌ UI muestra mal |
| avatar_url | NULL | Iniciales "US" | ❌ No se puede subir |
| date_of_birth | NULL | No mostrado | ❌ No hay campo |
| gov_id_number | NULL | No mostrado | ❌ No hay campo |
| email_verified | true | "Sin verificar" | ❌ Campo incorrecto |
| phone_verified | true | "Sin verificar" | ❌ Campo incorrecto |
| id_verified | true | "Sin verificar" | ❌ Campo incorrecto |

---

## 9. Próximos Tests Pendientes

- [ ] Implementar avatar upload
- [ ] Crear página /profile/personal para datos básicos
- [ ] Corregir nombres de campos de verificación
- [ ] Implementar selfie uploader
- [ ] Implementar utility_bill uploader
- [ ] Implementar vehicle documents uploaders
- [ ] Flujo de Wallet (depósitos, retiros)
- [ ] Flujo de Reservas (búsqueda, booking, pago)
- [ ] Integración MercadoPago
- [ ] Flujo de publicación de auto
- [ ] Mensajería entre usuarios
