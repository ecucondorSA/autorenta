# 🔧 Configuración de Variables de Entorno en Supabase

## ⚠️ IMPORTANTE: Activar Verificación con IA

Para que el sistema de verificación de documentos use **Cloudflare AI** en lugar del modo auto-aprobación, debes configurar las siguientes variables de entorno en Supabase Dashboard.

---

## 📍 Dónde Configurar

**Supabase Dashboard:**
1. Ve a: https://supabase.com/dashboard/project/obxvffplochgeiclibng
2. Navega a: **Edge Functions → Settings → Secrets**
3. Agrega las variables listadas abajo

---

## 🔑 Variables Requeridas

### 1. URL del Worker de Verificación

**Variable:**
```
DOC_VERIFIER_URL=https://autorent-doc-verifier.marques-eduardo95466020.workers.dev
```

**Propósito:**
- Activa la verificación con IA real
- Reemplaza el modo auto-aprobación de desarrollo

**Sin esta variable:**
- ❌ Sistema usa auto-aprobación (modo desarrollo)
- ❌ No hay análisis real de documentos
- ❌ No se detectan falsificaciones

**Con esta variable:**
- ✅ Cloudflare AI analiza cada documento
- ✅ OCR extrae datos (nombre, número, vencimiento)
- ✅ Detecta documentos falsificados
- ✅ Valida fecha de vencimiento

---

### 2. Token de Seguridad (Opcional pero Recomendado)

**Variable:**
```
DOC_VERIFIER_TOKEN=tu-token-secreto-aqui
```

**Propósito:**
- Evita que terceros llamen directamente al worker
- Solo el Edge Function puede hacer requests

**Cómo generar el token:**
```bash
# Opción 1: Token aleatorio seguro
openssl rand -base64 32

# Opción 2: UUID
uuidgen

# Ejemplo de resultado:
# DOC_VERIFIER_TOKEN=8f3a9b2c1d4e5f6g7h8i9j0k1l2m3n4o
```

**⚠️ Importante:**
- Usa el **mismo token** en Cloudflare Worker (ver sección siguiente)
- Guárdalo en un lugar seguro (1Password, Bitwarden, etc.)

---

## 🔐 Configurar Token en Cloudflare Worker

Si decides usar `DOC_VERIFIER_TOKEN`, también debes configurarlo en el worker:

```bash
cd /home/edu/autorenta/functions/workers/doc-verifier
npx wrangler secret put VERIFICATION_TOKEN
# Cuando te pida el valor, ingresa el mismo token que usaste en Supabase
```

**Ejemplo:**
```
Enter a secret value: 8f3a9b2c1d4e5f6g7h8i9j0k1l2m3n4o
✨ Success! Uploaded secret VERIFICATION_TOKEN
```

---

## 🧪 Verificar Configuración

### Opción 1: Desde Supabase Dashboard

1. Ve a: **Edge Functions → verify-user-docs → Invocations**
2. Verifica que los logs NO digan:
   - ❌ "Validación automática (modo desarrollo)"
3. Verifica que los logs SÍ digan:
   - ✅ "Llamando al verificador externo..."
   - ✅ "Respuesta del verificador recibida"

### Opción 2: Testear End-to-End

Sube una licencia desde el frontend:

1. Ir a: https://autorenta-web.pages.dev/profile
2. Subir una foto de licencia de conducir
3. Hacer clic en "Re-evaluar ahora"
4. Verificar el resultado:
   - **VERIFICADO**: Licencia válida y clara
   - **PENDIENTE**: Imagen no clara o sospechosa
   - **RECHAZADO**: Documento inválido o vencido

---

## 📊 Estado Actual

| Variable | Configurada | Valor Actual |
|----------|-------------|--------------|
| `DOC_VERIFIER_URL` | ❌ No | (ninguno) |
| `DOC_VERIFIER_TOKEN` | ❌ No | (ninguno) |

**Resultado Actual:**
- Sistema usa modo auto-aprobación
- No hay verificación con IA

**Después de Configurar:**
- ✅ Verificación con IA activada
- ✅ Cloudflare AI analiza documentos
- ✅ Seguridad mejorada con token

---

## 🔗 Links Útiles

- **Supabase Dashboard**: https://supabase.com/dashboard/project/obxvffplochgeiclibng/settings/functions
- **Worker URL**: https://autorent-doc-verifier.marques-eduardo95466020.workers.dev
- **Documentación Completa**: `/home/edu/autorenta/DOC_VERIFICATION_SETUP.md`
- **Edge Function Code**: `/home/edu/autorenta/supabase/functions/verify-user-docs/index.ts`

---

## ✅ Checklist de Activación

- [ ] Generar token secreto con `openssl rand -base64 32`
- [ ] Ir a Supabase Dashboard → Edge Functions → Secrets
- [ ] Agregar `DOC_VERIFIER_URL=https://autorent-doc-verifier.marques-eduardo95466020.workers.dev`
- [ ] Agregar `DOC_VERIFIER_TOKEN=<tu-token-aqui>`
- [ ] Ir a terminal: `cd /home/edu/autorenta/functions/workers/doc-verifier`
- [ ] Configurar token en worker: `npx wrangler secret put VERIFICATION_TOKEN`
- [ ] Testear subiendo una licencia desde el frontend
- [ ] Verificar logs en Supabase Dashboard (debería llamar al worker)
- [ ] Verificar que el estado sea VERIFICADO/PENDIENTE/RECHAZADO (no auto-aprobado)

---

**Última actualización:** 2025-10-23
**Worker desplegado:** ✅ https://autorent-doc-verifier.marques-eduardo95466020.workers.dev
**Configuración en Supabase:** ❌ Pendiente
