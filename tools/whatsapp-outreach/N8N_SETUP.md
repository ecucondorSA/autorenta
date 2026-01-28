# n8n WhatsApp Outreach - Setup

## Variables de Entorno Requeridas

Configurar en n8n Settings > Variables:

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `SUPABASE_URL` | URL de tu proyecto Supabase | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (NO anon key) | `eyJhbG...` |
| `WAHA_API_KEY` | API key para WAHA (WhatsApp HTTP API) | `your-secret-key` |

## Configuración en n8n

1. Ir a **Settings** > **Variables**
2. Agregar cada variable con su valor
3. Importar el workflow `n8n-outreach-workflow.json`

## Arquitectura

```
n8n (cada 5 min)
    │
    ├─▶ GET outreach_contacts (status=new, limit=1)
    │
    ├─▶ Prepare message (personalizado con nombre)
    │
    ├─▶ POST WAHA /api/sendText (enviar WhatsApp)
    │
    └─▶ PATCH outreach_contacts (status=contacted)
        POST outreach_messages (log)
```

## Tablas Supabase Requeridas

- `outreach_contacts` - Contactos a contactar
- `outreach_messages` - Log de mensajes enviados

## Seguridad

- NUNCA commitear keys en el JSON
- Usar variables de entorno de n8n
- Rotar keys si fueron expuestas
