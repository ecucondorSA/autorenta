# Analisis: verificacion facial bloqueada tras subir documentos

## Sintoma reportado
- Se suben documentos y licencia.
- La UI muestra licencia "verificada", pero el paso 3 (verificacion facial) sigue bloqueado.
- En la UI aparecen warnings: "No se encontro fecha de vencimiento" y "No se pudieron guardar los datos extraidos".

## Ruta UI involucrada
- `/profile/verification` en `apps/web/src/app/app.routes.ts:386-390`.

## Flujo real (codigo)
1) El uploader llama OCR + upload:
   - `apps/web/src/app/core/services/verification/verification.service.ts:447-500`
2) OCR se procesa en edge function y se intenta guardar en DB:
   - Upsert en `user_identity_levels`: `supabase/functions/verify-document/index.ts:149-167`
   - Campos que se intentan guardar: `supabase/functions/verify-document/index.ts:247-333`
3) El bloqueo/desbloqueo del paso 3 depende de `get_verification_progress`:
   - Reglas de Level 2 y `can_access_level_3`: `supabase/migrations/20251202010000_get_verification_progress.sql:42-76` y `147-148`
   - La pagina usa esto para habilitar o bloquear: `apps/web/src/app/features/profile/verification-page/profile-verification.page.ts:815-818`
4) El selfie tambien se bloquea por `current_level`:
   - `requiresLevel2` depende de `current_level`: `apps/web/src/app/core/services/verification/face-verification.service.ts:103-110`
   - Si `current_level < 2`, el upload de selfie falla: `apps/web/src/app/core/services/verification/face-verification.service.ts:145-155`
5) La UI local de licencia decide "verificado" sin leer el estado real de DB:
   - `isVerified()` usa `success` o `confidence >= 70`: `apps/web/src/app/features/profile/verification-page/components/license-uploader.component.ts:563-567`
   - Mensaje "Licencia verificada correctamente": `apps/web/src/app/features/profile/verification-page/components/license-uploader.component.ts:623-629`

## Warnings explicados (coinciden con la captura)
- "No se encontro fecha de vencimiento":
  - Validator de licencia AR: `supabase/functions/_shared/validators/argentina.ts:453-465`
- "No se pudieron guardar los datos extraidos":
  - Se agrega cuando el upsert falla: `supabase/functions/verify-document/index.ts:152-167`

## Por que la UI dice "verificada" pero no avanza
- El uploader marca "verificada" por OCR local, no por DB.
- Si el upsert falla o `validation.isValid` es false, **no** se setea `driver_license_verified_at`.
- `get_verification_progress` requiere `driver_license_verified_at` + `id_verified_at` para habilitar Level 3.

## Posibles causas (orden probable)
1) **Migracion de columnas no aplicada en la DB**:
   - Snapshot remoto muestra `user_identity_levels` sin columnas OCR: `supabase/snapshots/remote-schema-20251201.sql:21828-21836`
   - Edge function intenta escribir columnas nuevas: `supabase/functions/verify-document/index.ts:247-333`
   - La migracion que agrega esas columnas existe: `supabase/migrations/20251225_add_document_verification_fields.sql:7-65`
   - Si la DB sigue con el schema viejo, el upsert falla y aparece el warning.
2) **Desalineacion de columnas para DNI**:
   - OCR escribe `document_verified_at`, pero `get_verification_progress` lee `id_verified_at`:
     `supabase/functions/verify-document/index.ts:283-285` vs
     `supabase/migrations/20251202010000_get_verification_progress.sql:43-65`
   - Si no esta aplicada la migracion/trigger que sincroniza `profiles.id_verified`, Level 2 queda incompleto.
3) **`current_level` no sube a 2**:
   - El selfie se bloquea por `current_level`: `apps/web/src/app/core/services/verification/face-verification.service.ts:103-110`
   - No hay actualizacion explicita de `current_level` en el flujo de OCR.
4) **UI basada en confianza OCR**:
   - Si `confidence` es alta pero `validation.isValid` es false, la UI puede decir "verificado" sin que el backend lo valide.

## Realtime / refresh (fluidez)
- La pagina de verificacion solo carga el progreso una vez:
  - `apps/web/src/app/features/profile/verification-page/profile-verification.page.ts:739-754`
- Hay un servicio con Realtime para refrescar `get_verification_progress` cuando cambia `user_identity_levels`:
  - `apps/web/src/app/core/services/verification/verification-state.service.ts:62-158`
- La pagina no usa ese servicio, por eso no avanza sin recargar.

## Dato tecnico a confirmar (diagnostico)
Revisar en DB (para el usuario afectado):
- `user_identity_levels.driver_license_verified_at`
- `user_identity_levels.document_verified_at` o `user_identity_levels.id_verified_at`
- `user_identity_levels.current_level`
- Respuesta de `get_verification_progress`

## Nota extra: progreso de Level 3
- En `get_verification_progress` el selfie esta hardcodeado como false:
  - `supabase/migrations/20251202010000_get_verification_progress.sql:69-77`
- Aun con selfie completado, el progreso nunca llega a 100% hasta actualizar esa funcion.
