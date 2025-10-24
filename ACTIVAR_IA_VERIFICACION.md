# 🔄 Activación de IA - Pasos de Verificación

## 📊 Estado Actual Detectado

Según la consulta a la base de datos, el sistema **TODAVÍA está usando auto-aprobación**:

```
Notas: "Validación automática (modo desarrollo)."
Última verificación: 2025-10-23 05:02:23
```

Esto significa que la configuración de `DOC_VERIFIER_URL` puede no estar siendo leída por el Edge Function.

---

## ✅ Checklist de Configuración

### 1. Verificar Variables en Supabase Dashboard

**Ir a:**
```
https://supabase.com/dashboard/project/obxvffplochgeiclibng/settings/functions
```

**En la pestaña "Secrets", verificar que existan:**

- ✅ `DOC_VERIFIER_URL` = `https://autorent-doc-verifier.marques-eduardo95466020.workers.dev`
- ✅ (Opcional) `DOC_VERIFIER_TOKEN` = `<tu-token-secreto>`

**IMPORTANTE:** Asegúrate que el nombre sea exactamente `DOC_VERIFIER_URL` (sin espacios, todo en mayúsculas).

---

### 2. Verificar que el Edge Function Está Actualizado

El Edge Function `verify-user-docs` necesita estar desplegado con el código que lee la variable `DOC_VERIFIER_URL`.

**Verificar en el código del Edge Function:**

Archivo: `supabase/functions/verify-user-docs/index.ts`

Buscar estas líneas (aproximadamente línea 333-337):

```typescript
} else if (!DOC_VERIFIER_URL && missing.length === 0) {
  // Auto-aprobar en entornos de desarrollo sin verificador externo.
  status = 'VERIFICADO';
  notes = 'Validación automática (modo desarrollo).';
}
```

**Explicación:**
- Si `DOC_VERIFIER_URL` NO está configurada → Auto-aprobación
- Si `DOC_VERIFIER_URL` SÍ está configurada → Llama al worker de IA

---

### 3. Re-Desplegar el Edge Function (Si es Necesario)

Si modificaste el Edge Function recientemente, necesitas re-desplegarlo para que lea las nuevas variables de entorno:

```bash
cd /home/edu/autorenta
npx supabase functions deploy verify-user-docs
```

**NOTA:** Solo necesitas hacer esto si modificaste el código. Las variables de entorno se leen automáticamente sin re-deploy.

---

### 4. Forzar Nueva Verificación desde el Frontend

Para testear que la IA esté funcionando:

**Opción A: Re-evaluar Usuario Existente**

1. Ir a: https://99020fad.autorenta-web.pages.dev/admin
2. Buscar un usuario con documentos subidos
3. Hacer clic en "Re-evaluar ahora"
4. Verificar el resultado

**Opción B: Subir Nuevo Documento**

1. Ir a: https://99020fad.autorenta-web.pages.dev/profile
2. Subir una nueva licencia de conducir (foto clara)
3. El sistema debería automáticamente llamar al verificador
4. Esperar resultado (3-5 segundos)

---

## 🧪 Test Manual desde Terminal

Puedes testear directamente el Edge Function para ver si está leyendo la variable:

```bash
# Test llamando al Edge Function
curl -X POST 'https://obxvffplochgeiclibng.supabase.co/functions/v1/verify-user-docs' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHZmZnBsb2NoZ2VpY2xpYm5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjg1NDQyMjgsImV4cCI6MjA0NDEyMDIyOH0.dIAIg5rmV6OtpU_hqVYn2PVmhGlwGObVdO4SJHOplIo' \
  -H 'Content-Type: application/json' \
  -d '{
    "user_id": "b8cf21c8-c024-4067-9477-3cf7de1d5a60",
    "roles": ["driver"]
  }'
```

**Resultado esperado SI está configurado:**
```json
{
  "driver": {
    "status": "VERIFICADO|PENDIENTE|RECHAZADO",
    "notes": "Licencia verificada con confianza del XX%",
    "missing_docs": [],
    "extracted_data": { ... }
  }
}
```

**Resultado SI NO está configurado:**
```json
{
  "driver": {
    "status": "VERIFICADO",
    "notes": "Validación automática (modo desarrollo).",
    ...
  }
}
```

---

## 🔍 Debugging: Ver Logs del Edge Function

Para ver qué está pasando internamente:

1. Ir a: https://supabase.com/dashboard/project/obxvffplochgeiclibng/functions/verify-user-docs/logs

2. Buscar en los logs:
   - ✅ "Llamando al verificador externo..." → La IA está siendo usada
   - ❌ "Validación automática" → NO está usando la IA

3. Si ves errores, anótalos para debugging

---

## 🎯 Siguiente Paso Recomendado

**Hacer una prueba real:**

1. Ve a: https://99020fad.autorenta-web.pages.dev/profile
2. Sube una foto clara de tu licencia de conducir
3. Espera 3-5 segundos
4. Verifica en la base de datos:

```sql
-- Verificar la última verificación
SELECT
  user_id,
  role,
  status,
  notes,
  metadata,
  updated_at
FROM user_verifications
WHERE role = 'driver'
ORDER BY updated_at DESC
LIMIT 1;
```

**Si funciona correctamente, deberías ver:**
- `notes`: "Licencia verificada con confianza del XX%" (en lugar de "Validación automática")
- `metadata`: JSON con datos extraídos por la IA

**Si sigue diciendo "Validación automática":**
- La variable `DOC_VERIFIER_URL` no está configurada correctamente
- El Edge Function no está leyendo las variables de entorno

---

## 🆘 Solución Rápida si No Funciona

Si después de verificar todo sigue sin funcionar:

**Opción 1: Verificar nombre exacto de la variable**
```
Nombre correcto: DOC_VERIFIER_URL
❌ Incorrecto: doc_verifier_url
❌ Incorrecto: DOC_VERIFIER_URL (con espacios)
✅ Correcto: DOC_VERIFIER_URL
```

**Opción 2: Hardcodear temporalmente la URL en el Edge Function**

Editar `supabase/functions/verify-user-docs/index.ts`:

```typescript
// Línea ~10-15 (donde se lee la variable)
const DOC_VERIFIER_URL = Deno.env.get('DOC_VERIFIER_URL') ||
  'https://autorent-doc-verifier.marques-eduardo95466020.workers.dev';
```

Luego re-desplegar:
```bash
npx supabase functions deploy verify-user-docs
```

**Opción 3: Verificar que el proyecto de Supabase sea el correcto**

Asegúrate de estar configurando las variables en:
```
Project: obxvffplochgeiclibng
Organization: tu-organización
```

---

## ✅ Cómo Confirmar que Está Funcionando

**Señales de que la IA está activa:**

1. En la base de datos, las notas incluyen:
   - ✅ "Licencia verificada con confianza del XX%"
   - ✅ "Imagen no clara o sospechosa"
   - ✅ "Documento no válido o falsificado"

2. En los logs del Edge Function:
   - ✅ "Llamando al verificador externo..."
   - ✅ "Respuesta del verificador recibida"

3. La tabla `user_verifications` tiene `metadata` con:
   ```json
   {
     "extracted_data": {
       "name": "JUAN PEREZ",
       "document_number": "12345678",
       "expiry_date": "15/05/2026",
       ...
     },
     "confidence_score": 85
   }
   ```

**Señales de que sigue en auto-aprobación:**

1. Notas: "Validación automática (modo desarrollo)."
2. No hay metadata con datos extraídos
3. Logs no muestran llamadas al worker

---

## 📞 Si Necesitas Ayuda

Si después de seguir todos estos pasos sigue sin funcionar, proporciona:

1. Screenshot de las variables configuradas en Supabase Dashboard
2. Los últimos 10 logs del Edge Function
3. El resultado de la última consulta a `user_verifications`

---

**Última actualización:** 2025-10-23
**Worker funcionando:** ✅ https://autorent-doc-verifier.marques-eduardo95466020.workers.dev
**Configuración pendiente:** Verificar que `DOC_VERIFIER_URL` esté siendo leída correctamente
