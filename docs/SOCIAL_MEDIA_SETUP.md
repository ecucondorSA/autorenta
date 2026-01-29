# ✅ SISTEMA DE MARKETING EN REDES SOCIALES - LISTO PARA ACTIVAR

Tu sistema automático para publicar **4 posts simultáneamente** a diferentes redes sociales está **100% listo**. Solo falta activarlo con tus credenciales.

---

## 🎯 ¿QUÉ SE CREÓ?

### 📊 Base de Datos
```
✅ social_media_credentials      - Almacena tokens de plataformas
✅ campaign_schedules             - Campañas programadas
✅ social_publishing_log          - Log de publicaciones
✅ campaign_events                - Tracking de eventos (impressions, clicks, etc)
✅ Cron job automático (pg_cron)  - Ejecuta cada minuto
```

### 🚀 Edge Functions
```
✅ publish-to-social-media/
   └─ Publica EN PARALELO a 4 plataformas
```

### 📱 Admin Dashboard
```
✅ /admin/social-campaigns
   └─ Interfaz para crear/gestionar campañas
```

### 📄 Documentación
```
✅ SETUP_SOCIAL_MEDIA_MARKETING.md
✅ scripts/setup-social-media-auto.sh  (SCRIPT AUTOMÁTICO)
```

---

## 🚀 ACTIVACIÓN RÁPIDA (5 MINUTOS)

### Opción A: AUTOMÁTICO (RECOMENDADO)

```bash
cd /home/edu/autorentar

# Ejecutar script que lo hace TODO
./scripts/setup-social-media-auto.sh

# Te pedirá los tokens de:
# - Facebook Page ID & Access Token
# - Instagram Business ID & Access Token
# - LinkedIn Page ID & Access Token
# - TikTok Business ID & Access Token

# El script hará:
# 1. Guardar tokens en Supabase Secrets
# 2. Aplicar migraciones a BD
# 3. Hacer git commit y push
# 4. Monitorear GitHub Actions
```

### Opción B: Manual (si prefieres más control)

1. **Obtener tokens:**
   - Facebook: https://developers.facebook.com
   - Instagram: https://developers.facebook.com
   - LinkedIn: https://www.linkedin.com/developers/apps
   - TikTok: https://business.tiktok.com

2. **Guardar en Supabase:**
   ```bash
   supabase secrets set FACEBOOK_PAGE_ID="xxxxx"
   supabase secrets set FACEBOOK_ACCESS_TOKEN="EAAJ4...xxxxx"
   supabase secrets set INSTAGRAM_BUSINESS_ID="xxxxx"
   supabase secrets set INSTAGRAM_ACCESS_TOKEN="IGQVJYd3F0...xxxxx"
   supabase secrets set LINKEDIN_PAGE_ID="xxxxx"
   supabase secrets set LINKEDIN_ACCESS_TOKEN="AQVkXy...xxxxx"
   supabase secrets set TIKTOK_BUSINESS_ID="xxxxx"
   supabase secrets set TIKTOK_ACCESS_TOKEN="act_...xxxxx"
   ```

3. **Aplicar migraciones:**
   ```bash
   supabase db push --linked
   ```

4. **Hacer commit:**
   ```bash
   git add . && git commit -m "feat: activate social media marketing" && git push
   ```

---

## 📱 USAR EL SISTEMA

### 1. Ir al Dashboard

```
https://autorentar.app/admin/social-campaigns
```

### 2. Crear Campaña

**Formulario:**
- ✏️ Título: `¡Gana dinero alquilando tu auto!`
- 📝 Descripción: `Alquila tu auto en AutoRenta y obtén hasta $500 USD mensuales`
- 🖼️ Imagen: URL de imagen promocional
- 🔘 CTA Texto: `Registrate ahora`
- 🔗 CTA URL: `https://autorentar.app/signup`
- ☑️ Plataformas: Facebook, Instagram, LinkedIn, TikTok
- 📅 Fecha/Hora: Ahora o fecha específica

### 3. Publicar

**Automático:**
```
Cron job ejecuta cada minuto
→ Detecta campañas listas
→ Publica a 4 plataformas EN PARALELO
→ Registra resultados
```

**Bajo demanda:**
```
Dashboard → Botón "Publicar Ahora"
```

---

## 📊 ARQUITECTURA

```
┌─────────────────────────────────────────────────────────────┐
│                       USUARIO                              │
│            Crea campaña en Dashboard                       │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              SUPABASE DATABASE                              │
│  campaign_schedules → Status: scheduled                    │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼ (cada minuto)
┌─────────────────────────────────────────────────────────────┐
│              PG_CRON JOB                                    │
│  Chequea: ¿Hay campañas listas?                            │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼ Sí
┌─────────────────────────────────────────────────────────────┐
│         EDGE FUNCTION: publish-to-social-media             │
│                                                             │
│   Promise.all([                                            │
│     publishToFacebook(),      📘                          │
│     publishToInstagram(),     📷                          │
│     publishToLinkedIn(),      💼                          │
│     publishToTikTok()         🎵                          │
│   ])                                                       │
│                                                             │
│   ⏱️ TODO EN PARALELO (no secuencial)                      │
└─────────────────┬───────────────────────────────────────────┘
                  │
         ┌────────┼────────┬────────┬───────┐
         ▼        ▼        ▼        ▼       ▼
      FACEBOOK INSTAGRAM LINKEDIN TIKTOK [logs]

      Registra:
      - Post IDs
      - URLs generadas
      - Timestamps
```

---

## ✅ CHECKLIST ANTES DE EJECUTAR

- [ ] ¿Tienes cuenta developer en Facebook?
- [ ] ¿Tienes cuenta developer en Instagram (via Facebook)?
- [ ] ¿Tienes cuenta developer en LinkedIn?
- [ ] ¿Tienes cuenta business en TikTok?
- [ ] ¿Tienes los 8 tokens necesarios listos?
- [ ] ¿Git está configurado?
- [ ] ¿Supabase CLI instalado?
- [ ] ¿GitHub CLI (gh) instalado?

---

## 📈 MÉTRICAS & MONITORING

### Ver campañas próximas
```sql
SELECT * FROM public.upcoming_scheduled_campaigns;
```

### Ver campañas publicadas recientemente
```sql
SELECT * FROM public.recently_published_campaigns;
```

### Ver log de publicaciones
```sql
SELECT * FROM public.social_publishing_log
WHERE status = 'success'
ORDER BY attempted_at DESC;
```

### Ver errores de publicación
```sql
SELECT * FROM public.social_publishing_log
WHERE status = 'failed'
ORDER BY attempted_at DESC;
```

### Ver ejecuciones de cron job
```sql
SELECT * FROM public.social_publishing_scheduler_log
ORDER BY execution_time DESC;
```

---

## 🔍 TROUBLESHOOTING

| Problema | Solución |
|----------|----------|
| Token expirado | Renovar en plataforma, actualizar en Supabase Secrets |
| No publica a Instagram | Requiere imagen. Verifica URL sea válida |
| Cron no ejecuta | Ejecutar: `supabase db push --linked` nuevamente |
| Errores en Edge Function | Ver logs: `supabase functions list` |
| Posts no aparecen | Revisar permisos de token en cada plataforma |

---

## 📚 ARCHIVOS IMPORTANTES

```
/home/edu/autorentar/

├─ scripts/
│  └─ setup-social-media-auto.sh  ← EJECUTAR ESTO PRIMERO
│
├─ supabase/
│  ├─ migrations/
│  │  ├─ 20260116_create_social_credentials_table.sql
│  │  └─ 20260116_setup_social_media_cron.sql
│  │
│  └─ functions/
│     └─ publish-to-social-media/
│        └─ index.ts
│
├─ apps/web/src/app/features/admin/
│  └─ social-media-campaigns/
│     └─ social-campaigns.page.ts
│
└─ SETUP_SOCIAL_MEDIA_MARKETING.md  ← Guía completa
```

---

## 🎬 COMENZAR AHORA

### Ejecutar script de setup automático:

```bash
cd /home/edu/autorentar
./scripts/setup-social-media-auto.sh
```

### Monitorear deploy:

```bash
gh run watch
```

### Ir al dashboard:

```
https://autorentar.app/admin/social-campaigns
```

---

## ❓ FAQ

**P: ¿Qué pasa si una red social falla?**
→ Las otras 3 continúan publicándose. Se registra el error.

**P: ¿Puedo editar una campaña después de programarla?**
→ No, pero puedes cancelarla y crear una nueva.

**P: ¿Cuánto cuesta?**
→ Los tokens de las APIs son gratuitos (requieren negocio registrado).

**P: ¿Qué pasa a medianoche si hay campaña programada?**
→ El cron job detecta y publica automáticamente. No requiere que estés online.

**P: ¿Puedo ver analytics de las publicaciones?**
→ Sí, tabla `campaign_events` registra impressions, clicks, conversions.

---

## 🎉 ¡LISTO!

Tu sistema automático para publicar a **4 plataformas simultáneamente** está 100% configurado.

**Siguientes pasos:**
1. Ejecutar `./scripts/setup-social-media-auto.sh`
2. Ir a `/admin/social-campaigns`
3. Crear primera campaña
4. Ver cómo publica automáticamente en Facebook, Instagram, LinkedIn, TikTok

---

**Construido con ❤️ para Autorenta**
