# n8n Workflows para AutoRenta

Workflows de automatización para n8n, diseñados para complementar las Edge Functions de Supabase.

## Workflows Disponibles

### 1. WhatsApp OTP Sender (`whatsapp-otp-sender.json`)

Envía códigos OTP via WhatsApp con fallback automático a SMS.

**Flujo:**
```
Edge Function (auth + genera OTP)
       │
       ▼
    n8n Webhook
       │
       ├──▶ WhatsApp (Twilio)
       │         │
       │         ├── ✓ Success → Log → 200 OK
       │         │
       │         └── ✗ Error → Fallback SMS → Log → 200 OK
       │
       └──▶ SMS (si channel=sms) → Log → 200 OK
```

**Variables de entorno requeridas en n8n:**

| Variable | Descripción |
|----------|-------------|
| `WEBHOOK_SECRET` | Secreto para validar requests |
| `TWILIO_ACCOUNT_SID` | Account SID de Twilio |
| `TWILIO_WHATSAPP_NUMBER` | `whatsapp:+14155238886` (sandbox) o tu número |
| `TWILIO_SMS_NUMBER` | Número SMS de Twilio |
| `SUPABASE_URL` | URL de tu proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key |

**Credenciales requeridas en n8n:**
- `httpBasicAuth` llamado "Twilio Auth":
  - Username: `TWILIO_ACCOUNT_SID`
  - Password: `TWILIO_AUTH_TOKEN`

**Secrets en Supabase Edge Function:**
```bash
supabase secrets set N8N_OTP_WEBHOOK_URL="https://tu-n8n.com/webhook/send-otp"
supabase secrets set N8N_WEBHOOK_SECRET="tu-secreto-seguro"
```

---

### 2. WhatsApp Outreach (`whatsapp-outreach-workflow.json`)

Campaña de outreach para propietarios potenciales.

Ver: `tools/whatsapp-outreach/N8N_SETUP.md`

---

## Instalación

### 1. Configurar n8n

```bash
# Self-hosted con Docker
docker run -it --rm \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n

# O usar n8n Cloud: https://n8n.io/cloud
```

### 2. Importar Workflows

1. Ir a n8n → Workflows → Import
2. Seleccionar el archivo JSON del workflow
3. Configurar variables en Settings → Variables
4. Configurar credenciales en Settings → Credentials
5. Activar el workflow

### 3. Configurar Edge Functions

```bash
# Aplicar migración
supabase db push

# Deploy de la nueva Edge Function
supabase functions deploy send-otp-via-n8n

# Configurar secrets
supabase secrets set N8N_OTP_WEBHOOK_URL="https://..."
supabase secrets set N8N_WEBHOOK_SECRET="..."
```

### 4. Actualizar Frontend

Cambiar la llamada de `send-whatsapp-otp` a `send-otp-via-n8n`:

```typescript
// Antes
const { data } = await supabase.functions.invoke('send-whatsapp-otp', {
  body: { phone, channel: 'whatsapp' }
});

// Después
const { data } = await supabase.functions.invoke('send-otp-via-n8n', {
  body: { phone, channel: 'whatsapp' }
});
```

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ARQUITECTURA HÍBRIDA                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Frontend (Angular)                                                 │
│       │                                                             │
│       ▼                                                             │
│  Edge Functions (Supabase)                                          │
│  ├── Auth validation ✓                                              │
│  ├── Business logic ✓                                               │
│  ├── Generate OTP ✓                                                 │
│  └── Call n8n webhook ────────────────────┐                         │
│                                           ▼                         │
│                                    n8n (Automations)                │
│                                    ├── Send WhatsApp                │
│                                    ├── Fallback to SMS              │
│                                    ├── Log delivery                 │
│                                    └── Return result                │
│                                           │                         │
│       ◄───────────────────────────────────┘                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Beneficios de esta arquitectura

| Aspecto | Edge Function sola | Edge Function + n8n |
|---------|-------------------|---------------------|
| Fallback WhatsApp→SMS | Manual, código complejo | Automático, visual |
| Logging | Console.log | Tabla dedicada |
| Retry | Manual | Automático |
| Cambiar mensaje | Redeploy | Click en n8n |
| Monitoreo | Supabase logs | Dashboard n8n |
| A/B testing | Código | Visual |

---

## Troubleshooting

### "Unauthorized" en n8n
- Verificar que `X-Webhook-Secret` coincida con `WEBHOOK_SECRET`

### WhatsApp no envía
- Verificar número en formato `whatsapp:+549XXXXXXXXXX`
- Twilio sandbox requiere que el usuario haya enviado "join" primero

### SMS no envía
- Verificar que `TWILIO_SMS_NUMBER` esté configurado
- Verificar saldo en Twilio
