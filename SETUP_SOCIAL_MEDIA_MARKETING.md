# 📱 Setup de Marketing en Redes Sociales

Sistema automático para publicar campañas de marketing simultáneamente en **4 plataformas**:
- ✅ Facebook
- ✅ Instagram
- ✅ LinkedIn
- ✅ TikTok

---

## 🎯 Objetivo

Publicar **4 posts al mismo tiempo** en diferentes redes sociales, programados automáticamente o bajo demanda.

---

## 📋 PASO 1: Obtener Access Tokens

### 1.1 Facebook & Instagram

**Obtener Facebook Page Token:**

1. Ir a https://developers.facebook.com/apps/
2. Crear nueva app (tipo "Business")
3. Agregar producto "Conversions API"
4. En Settings > Basic, obtener:
   - `App ID`
   - `App Secret`
5. Generar Page Access Token en "Tools > Access Token Debugger"
6. Copiar el token que comienza con `EAAJ4...`

**Tus credenciales:**
```
FACEBOOK_PAGE_ID = xxxxxx
FACEBOOK_ACCESS_TOKEN = EAAJ4...xxxxx
```

**Para Instagram (igual página de Facebook):**
```
INSTAGRAM_BUSINESS_ID = xxxxxx  (obtener de Facebook App)
INSTAGRAM_ACCESS_TOKEN = IGQVJYd3F0...xxxxx  (mismo proceso)
```

---

### 1.2 LinkedIn

**Obtener LinkedIn Access Token:**

1. Ir a https://www.linkedin.com/developers/apps
2. Crear nueva app
3. Agregar permission: `w_member_social`
4. Generar Access Token en "Auth" tab
5. Copiar token que comienza con `AQVk...`

**Tus credenciales:**
```
LINKEDIN_PAGE_ID = xxxxxx  (tu organization ID)
LINKEDIN_ACCESS_TOKEN = AQVkXy...xxxxx
```

---

### 1.3 TikTok

**Obtener TikTok Business Token:**

1. Ir a https://business.tiktok.com/
2. Crear Business Account
3. Ir a Settings > Apps & Integrations
4. Crear nueva aplicación
5. Generar Access Token
6. Copiar token que comienza con `act_...`

**Tus credenciales:**
```
TIKTOK_BUSINESS_ID = xxxxxx
TIKTOK_ACCESS_TOKEN = act_...xxxxx
```

---

## 🔐 PASO 2: Guardar Tokens en Supabase Secrets

**NUNCA guardes tokens en código.** Usa Supabase Secrets.

### En tu terminal local:

```bash
cd /home/edu/autorentar

# Instalar supabase CLI si no lo tienes
brew install supabase/tap/supabase
# o en Linux: curl -fsSL https://install.supabase.tech | bash

# Login en Supabase
supabase login

# Agregar secrets
supabase secrets set FACEBOOK_PAGE_ID="xxxxx"
supabase secrets set FACEBOOK_ACCESS_TOKEN="EAAJ4...xxxxx"
supabase secrets set INSTAGRAM_BUSINESS_ID="xxxxx"
supabase secrets set INSTAGRAM_ACCESS_TOKEN="IGQVJYd3F0...xxxxx"
supabase secrets set LINKEDIN_PAGE_ID="xxxxx"
supabase secrets set LINKEDIN_ACCESS_TOKEN="AQVkXy...xxxxx"
supabase secrets set TIKTOK_BUSINESS_ID="xxxxx"
supabase secrets set TIKTOK_ACCESS_TOKEN="act_...xxxxx"

# Verificar que se guardaron
supabase secrets list
```

---

## 🗄️ PASO 3: Aplicar Migraciones

Las migraciones crean las tablas necesarias:

```bash
# Aplicar todas las migraciones
supabase db push

# Verificar que se aplicaron
supabase db list
```

**Tablas creadas:**
- ✅ `social_media_credentials` - Almacena credenciales de plataformas
- ✅ `campaign_schedules` - Campañas programadas
- ✅ `social_publishing_log` - Log de publicaciones
- ✅ `campaign_events` - Tracking de eventos (impressions, clicks, etc)

---

## 🚀 PASO 4: Deploy

```bash
# Hacer commit y push
git add .
git commit -m "feat: add social media marketing system"
git push origin main

# GitHub Actions ejecutará automáticamente
# Esperar a que las migraciones se apliquen en producción
```

---

## 📊 PASO 5: Usar el Dashboard

### URL del Dashboard
```
https://autorentar.app/admin/social-campaigns
```

### Crear Nueva Campaña

1. **Título**: "¡Gana dinero con tu auto!"
2. **Descripción**: "Alquila tu auto en AutoRenta y obtén hasta $500 USD mensuales"
3. **Imagen**: Subir foto promocional
4. **CTA Texto**: "Registrate ahora"
5. **CTA URL**: `https://autorentar.app/signup`
6. **Plataformas**: Seleccionar Facebook, Instagram, LinkedIn, TikTok
7. **Fecha/Hora**: Elegir cuándo publicar
8. **Clic en "Programar Publicación"**

### Sistema de Programación

```
┌─────────────────────────────┐
│  Cron Job (cada minuto)     │
└──────────┬──────────────────┘
           │
           ├─→ ¿Hay campañas listas?
           │
           └─→ Sí: Llamar Edge Function
                  │
                  ├─→ Publicar a Facebook
                  ├─→ Publicar a Instagram
                  ├─→ Publicar a LinkedIn
                  └─→ Publicar a TikTok

                  (TODO EN PARALELO - 4 plataformas a la vez)
```

---

## ✅ Verificar que Funciona

### 1. Ver logs de ejecución

```sql
-- Conectar a Supabase SQL
SELECT * FROM public.social_publishing_scheduler_log
ORDER BY execution_time DESC
LIMIT 10;
```

### 2. Ver publicaciones realizadas

```sql
SELECT * FROM public.social_publishing_log
WHERE status = 'success'
ORDER BY attempted_at DESC;
```

### 3. Ver campañas próximas

```sql
SELECT * FROM public.upcoming_scheduled_campaigns
ORDER BY scheduled_for ASC;
```

### 4. Publicar manualmente (sin esperar)

Usa el botón **"Publicar Ahora"** en el dashboard

---

## 📈 Monitorear Rendimiento

### Dashboard de Métricas (future implementation)

```sql
-- Ver rendimiento de campañas
SELECT
  c.name,
  COUNT(CASE WHEN ce.event_type = 'impression' THEN 1 END) as impressions,
  COUNT(CASE WHEN ce.event_type = 'click' THEN 1 END) as clicks,
  COUNT(CASE WHEN ce.event_type = 'conversion' THEN 1 END) as conversions,
  SUM(ce.value) as revenue
FROM public.marketing_campaigns c
LEFT JOIN public.campaign_events ce ON c.id = ce.campaign_id
WHERE c.status = 'running'
GROUP BY c.id, c.name;
```

---

## 🔧 Troubleshooting

### Error: "Token Expirado"

Los tokens de acceso tienen vencimiento. Para renovar:

```bash
# Para Facebook/Instagram:
# Generar nuevo token en https://developers.facebook.com
# Ejecutar: supabase secrets set FACEBOOK_ACCESS_TOKEN="nuevo_token"

# Para LinkedIn:
# Token dura 2 meses, renovar en https://www.linkedin.com/developers/apps

# Para TikTok:
# Renovar en https://business.tiktok.com/
```

### Error: "Cannot publish to Instagram - requires image"

Instagram requiere imagen. Asegúrate de:
1. Incluir URL de imagen en el formulario
2. Que la URL sea válida (comience con https://)
3. Que sea una imagen real, no placeholder

### Cron job no se ejecuta

Verificar:
```bash
# Ver status de pg_cron
supabase db execute "SELECT jobname, schedule, active FROM cron.job WHERE jobname LIKE 'publish%';"

# Si no aparece, ejecutar migración nuevamente
supabase db push
```

---

## 📚 Archivos Creados

```
supabase/migrations/
├─ 20260116_create_social_credentials_table.sql
└─ 20260116_setup_social_media_cron.sql

supabase/functions/
└─ publish-to-social-media/
   └─ index.ts

apps/web/src/app/features/admin/
└─ social-media-campaigns/
   └─ social-campaigns.page.ts
```

---

## 🎬 Ejemplo Completo

### Paso a Paso

1. **Obtener tokens** de Facebook, Instagram, LinkedIn, TikTok
2. **Guardar en Supabase Secrets** via CLI
3. **Aplicar migraciones** con `supabase db push`
4. **Hacer deploy** a producción
5. **Ir al dashboard**: `/admin/social-campaigns`
6. **Crear campaña**:
   - Título: "¡GANA DINERO!"
   - Descripción: "Alquila tu auto..."
   - Imagen: URL válida
   - Plataformas: Todas
   - Hora: Hoy en 5 minutos
7. **Clic en "Programar"**
8. **Esperar** a que el cron job ejecute (máximo 1 minuto)
9. **Ver posts publicados** en las 4 plataformas

---

## 🚀 SIGUIENTE: Automación Avanzada

Después de esto, puedes implementar:

- ✨ A/B Testing automático
- 📊 Analytics en tiempo real
- 🤖 AI para generar copy automáticamente
- 📅 Plantillas de campañas recurrentes
- 🎯 Segmentación de audiencia por región

---

## ❓ Preguntas Frecuentes

**P: ¿Qué pasa si una plataforma falla?**
R: Se registra el error en `social_publishing_log`. Las demás continúan publicándose.

**P: ¿Puedo editar una campaña después de programarla?**
R: No, pero puedes cancelarla y crear una nueva.

**P: ¿Qué pasa con los tokens si vencen?**
R: El cron job registrará un error. Debes renovar el token en Supabase Secrets.

**P: ¿Puedo publicar solo en algunas plataformas?**
R: Sí, el formulario permite seleccionar cuáles incluir.

---

**¡Listo! Tu sistema de marketing automático está configurado.** 🎉
