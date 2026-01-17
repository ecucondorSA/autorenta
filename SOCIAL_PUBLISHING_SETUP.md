# 📱 Configuración de Social Publishing - AutoRenta

## ✅ Lo que hemos hecho

He actualizado y reparado el sistema de publicación social:

### 1. **Bugs Reparados**
- ✅ Instagram: Arreglado upload de media (blob → URLSearchParams)
- ✅ Facebook: Endpoint deprecado `/me/photos` → `/{pageId}/photos`
- ✅ API actualizada: v18/v19 → v20.0
- ✅ Carousel Instagram: parámetro `children` → `media_ids`

### 2. **Validación Agregada**
- ✅ Validar credenciales ANTES de publicar
- ✅ Manejo de errores mejorado
- ✅ Logging descriptivo

### 3. **Test Suite Creado**
- ✅ Script de 7 tests para verificar publicaciones
- ✅ Validación de credenciales
- ✅ Test directo en Facebook e Instagram

## 🔑 Credenciales Necesarias

### Ubicación: Meta Developers Dashboard

1. **FACEBOOK_ACCESS_TOKEN**
   - URL: https://developers.facebook.com/tools/accesstoken/
   - Tipo: User Token (de la herramienta)
   - Empieza con: `EAA...`
   - Duración: Varías (verificar en Meta)
   - Status: ✅ Visible en pantalla (ver screenshot anterior)

2. **FACEBOOK_PAGE_ID**
   - URL: https://www.facebook.com/autorentar/settings/
   - Ubicación: Información básica de la página
   - Ejemplo: `123456789012345`
   - Status: Necesita extraerse manualmente

3. **INSTAGRAM_BUSINESS_ID**
   - URL: https://business.facebook.com/latest/settings/
   - Ubicación: Instagram → Configuración
   - Ejemplo: `17841400000000000`
   - Status: Necesita extraerse manualmente

4. **INSTAGRAM_ACCESS_TOKEN**
   - Puede ser: El mismo FACEBOOK_ACCESS_TOKEN
   - O generar uno específico en Meta Developers

## 📝 Cómo Configurar

### Opción A: Usando Supabase Secrets (RECOMENDADO)

```bash
# 1. Obtén los valores de Meta Developers
# 2. Configura en Supabase

supabase secrets set FACEBOOK_ACCESS_TOKEN "tu_token_aqui"
supabase secrets set FACEBOOK_PAGE_ID "tu_page_id"
supabase secrets set INSTAGRAM_ACCESS_TOKEN "tu_token_aqui"
supabase secrets set INSTAGRAM_BUSINESS_ID "tu_business_id"

# 3. Verifica
supabase secrets list
```

### Opción B: Usando .env.local (Desarrollo)

```bash
# Copia .env.social-test como referencia
cp .env.social-test .env.local

# Edita y añade tus valores
nano .env.local
```

## 🧪 Testing

Una vez configuradas las credenciales:

```bash
cd /home/edu/autorentar

# Test completo (7 pruebas)
bun scripts/test-social-publishing.ts

# Ver logs de publicaciones
# Supabase → social_publishing_log tabla
```

## 📊 Flujo de Publicación

```
1. Usuario crea campaña en UI (social-campaigns.page)
   ↓
2. Envía a Edge Function (publish-to-social-media)
   ↓
3. Valida credenciales
   ↓
4. Publica en paralelo (Facebook, Instagram, LinkedIn, TikTok)
   ↓
5. Registra resultados en DB (social_publishing_log)
   ↓
6. Actualiza estado de campaña (campaign_schedules)
```

## 🛑 Limitaciones Actuales

- ⚠️ **Facebook Ads**: Solo publica en feed (no como anuncio pagado)
- ⚠️ **TikTok**: Aún es placeholder (requiere video)
- ⚠️ **LinkedIn**: Solo texto (sin media)

## 📚 Referencias

- [Facebook Graph API v20.0](https://developers.facebook.com/docs/graph-api)
- [Instagram Graph API](https://developers.facebook.com/docs/instagram-graph-api)
- [Meta Developers](https://developers.facebook.com/)
- [Business Suite](https://business.facebook.com/)

## 🔄 Commits

Cambios realizados en:
- `supabase/functions/publish-to-social-media/index.ts`
- `apps/social-publisher/src/services/meta.service.ts`
- `scripts/test-social-publishing.ts` (NUEVO)
- `scripts/setup-meta-credentials.ts` (NUEVO)
- `scripts/get-facebook-ids.ts` (NUEVO)

Commit: `08f1cc52` - Fix(social-publishing): actualizar API + corregir bugs

## ❓ Preguntas Frecuentes

**P: ¿Dónde obtengo el Access Token?**
R: https://developers.facebook.com/tools/accesstoken/

**P: ¿Cuánto dura el Access Token?**
R: Varía según el tipo. User Tokens suelen durar ~60 días. Ver Meta Developers Dashboard.

**P: ¿Cómo publico en Facebook Ads?**
R: Aún no implementado. Requiere crear Campaign, AdSet, y Ad en Graph API.

**P: ¿Puedo publicar sin Instagram vinculado?**
R: Sí, solo Facebook. Instagram es opcional.

---

**Próximo paso:** Obtén los IDs de Meta Developers y ejecuta `bun scripts/test-social-publishing.ts` para verificar.
