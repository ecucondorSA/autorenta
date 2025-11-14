# Google Calendar Sync Worker

Cloudflare Worker para sincronizar Google Calendar con AutoRenta.

## Funcionalidades

- ✅ Sincronización de eventos de Google Calendar
- ✅ Webhook endpoint para notificaciones de Google Calendar
- ✅ Sincronización automática vía Cron Triggers
- ✅ API para obtener eventos manualmente

## Configuración

### 1. Instalar dependencias

```bash
cd functions/workers/google-calendar-sync
npm install
```

### 2. Configurar Secrets en Cloudflare

```bash
# API Key de Google Calendar
wrangler secret put GOOGLE_CALENDAR_API_KEY

# ID del calendario (email)
wrangler secret put GOOGLE_CALENDAR_ID

# Service Role Key de Supabase
wrangler secret put SUPABASE_SERVICE_ROLE_KEY

# (Opcional) Client ID de OAuth
wrangler secret put GOOGLE_CALENDAR_CLIENT_ID
```

### 3. Crear tabla en Supabase (si no existe)

```sql
CREATE TABLE IF NOT EXISTS calendar_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_event_id TEXT UNIQUE NOT NULL,
  calendar_id TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  summary TEXT,
  description TEXT,
  location TEXT,
  html_link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_blocks_dates 
ON calendar_blocks(start_date, end_date);
```

### 4. Desplegar el Worker

```bash
npm run deploy
```

## Endpoints

### `GET /health`
Health check del Worker.

**Response:**
```json
{
  "status": "ok",
  "service": "google-calendar-sync",
  "timestamp": "2025-01-12T10:00:00.000Z"
}
```

### `GET /sync`
Sincronización manual de eventos.

**Response:**
```json
{
  "success": true,
  "synced": 15,
  "errors": 0,
  "timestamp": "2025-01-12T10:00:00.000Z"
}
```

### `GET /events?timeMin=2025-01-01T00:00:00Z&timeMax=2025-01-31T23:59:59Z`
Obtener eventos de Google Calendar.

**Query Parameters:**
- `timeMin` (opcional): Fecha mínima en ISO 8601
- `timeMax` (opcional): Fecha máxima en ISO 8601

**Response:**
```json
{
  "success": true,
  "events": [...],
  "count": 10
}
```

### `POST /webhook`
Endpoint para recibir webhooks de Google Calendar.

**Headers requeridos:**
- `x-goog-channel-id`: ID del canal
- `x-goog-resource-state`: Estado del recurso (`sync` o `exists`)

## Configurar Webhook de Google Calendar

### 1. Crear canal de notificación

Usa la Google Calendar API para crear un canal de notificación:

```bash
curl -X POST "https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events/watch" \
  -H "Authorization: Bearer {access_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "unique-channel-id",
    "type": "web_hook",
    "address": "https://autorenta-google-calendar-sync.{account}.workers.dev/webhook"
  }'
```

### 2. Configurar Cron Trigger (Opcional)

En Cloudflare Dashboard:
1. Ve a Workers → `autorenta-google-calendar-sync`
2. Settings → Triggers → Cron Triggers
3. Agrega un trigger (ej: `0 */6 * * *` para cada 6 horas)

## Desarrollo Local

```bash
# Iniciar en modo desarrollo
npm run dev

# Build
npm run build

# Deploy
npm run deploy
```

## Variables de Entorno

| Variable | Requerido | Descripción |
|----------|-----------|-------------|
| `GOOGLE_CALENDAR_API_KEY` | ✅ | API Key de Google Cloud Console |
| `GOOGLE_CALENDAR_ID` | ✅ | ID del calendario (email) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service Role Key de Supabase |
| `GOOGLE_CALENDAR_CLIENT_ID` | ❌ | Client ID de OAuth (opcional) |
| `SUPABASE_URL` | ✅ | URL de Supabase (configurado en wrangler.toml) |

## Notas

- El Worker sincroniza eventos confirmados de los próximos 90 días
- Los eventos cancelados o tentativos no se sincronizan
- El webhook se activa cuando Google Calendar detecta cambios
- La sincronización automática vía Cron es opcional pero recomendada





