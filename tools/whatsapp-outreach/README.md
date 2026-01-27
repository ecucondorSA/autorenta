# Sistema Girard - WhatsApp Outreach autorentar

> "Every sale is a relationship, not a transaction" - Joe Girard

Sistema automatizado de outreach estilo **Joe Girard** (el vendedor de autos #1 de la historia) usando WAHA + n8n + Supabase.

## El Método Girard

Joe Girard vendió **13,001 autos en 15 años** (~6/día) con estos principios:

1. **La Ley de los 250** - Cada persona conoce ~250 personas. Un cliente feliz = 250 potenciales
2. **Tarjetas mensuales** - Enviaba 13,000 tarjetas/mes (cumpleaños, fiestas, "solo pensaba en vos")
3. **Libreta de notas** - Apuntaba todo: hijos, trabajo, gustos, fechas importantes
4. **Seguimiento obsesivo** - No vendía, construía relaciones
5. **Escuchar primero** - Entender qué necesita el cliente antes de vender

## Arquitectura

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Supabase      │◀───▶│      n8n        │◀───▶│      WAHA       │
│   (CRM Girard)  │     │  (Workflows)    │     │ (WhatsApp API)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                        │
        ▼                       ▼                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ outreach_contacts│     │ Auto-respuestas │     │  Tu WhatsApp    │
│ outreach_messages│     │ Followups prog. │     │    Personal     │
│ outreach_campaigns│    │ Detección intent│     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Setup Rápido

### 1. Crear tablas en Supabase

```bash
# En el dashboard de Supabase > SQL Editor, ejecutar:
cat migrations/001_girard_crm.sql | pbcopy
# Pegar y ejecutar
```

### 2. Filtrar e importar contactos

```bash
cd /home/edu/autorenta/tools/whatsapp-outreach

# Filtrar contactos de Argentina + USA
bun run filter-argentina-contacts.ts

# Importar a Supabase
export SUPABASE_SERVICE_ROLE_KEY="tu-service-role-key"
bun run import-contacts-to-supabase.ts
```

### 3. Levantar WAHA + n8n

```bash
docker compose up -d
```

### 4. Configurar n8n

1. Abrir http://localhost:5678
2. Login: `autorenta` / `autorentar2026!`
3. **Crear credencial** "Supabase Service Key":
   - Settings → Credentials → Add → Header Auth
   - Name: `Supabase Service Key`
   - Header Name: `apikey`
   - Header Value: `tu-service-role-key`
4. **Importar workflow**: `n8n-girard-workflow.json`
5. Activar el workflow

### 5. Vincular WhatsApp

1. Abrir http://localhost:3000/dashboard
2. Login: `autorenta` / `autorentar2026!`
3. Start New Session → Escanear QR

## Flujos del Sistema

### 1. Outreach Inicial (cada hora, 9am-9pm)

```
Obtener 5 contactos nuevos
    ↓
Generar mensaje personalizado (3 templates rotativos)
    ↓
Enviar por WhatsApp
    ↓
Actualizar status → "contacted"
    ↓
Programar followup → 3 días
    ↓
Esperar 45s → siguiente contacto
```

### 2. Seguimiento Girard (cada 2hs)

```
Obtener contactos con followup pendiente
    ↓
Determinar tipo de followup:
    - 3 días: Mensaje suave
    - 7 días: Mensaje de valor
    - 14 días: Último intento
    - 60 días: Reactivación
    ↓
Enviar mensaje personalizado
    ↓
Programar siguiente followup
```

### 3. Procesamiento de Respuestas (webhook)

```
Recibir mensaje entrante
    ↓
Detectar intención:
    - interested → Responder con detalles
    - question_commission → FAQ comisión
    - question_insurance → FAQ seguro
    - question_payment → FAQ pagos
    - question_howto → FAQ cómo empezar
    - not_interested → Marcar y no molestar
    ↓
Actualizar notas (libreta Girard)
    ↓
Calcular engagement score
    ↓
Auto-responder si aplica
```

## Base de Datos (CRM Girard)

### Tabla: `outreach_contacts`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `phone` | TEXT | Número de WhatsApp |
| `first_name`, `last_name` | TEXT | Nombre |
| `city`, `province`, `region` | TEXT | Ubicación |
| `status` | TEXT | new, contacted, responded, interested, qualified, registered, active, not_interested |
| `messages_sent/received` | INT | Contadores |
| `birthday`, `anniversary` | DATE | Fechas especiales (Girard) |
| `occupation`, `company` | TEXT | Info laboral |
| `interests` | TEXT[] | Intereses detectados |
| `family_notes` | TEXT | Notas de familia |
| `notes` | TEXT | Libreta de notas (estilo Girard) |
| `next_followup_at` | TIMESTAMPTZ | Próximo seguimiento |
| `engagement_score` | INT | Score 0-100 |

### Tabla: `outreach_messages`

Historial completo de conversaciones con análisis de intención y sentimiento.

### Tabla: `outreach_campaigns`

Campañas pre-configuradas estilo Girard:
- Seguimiento 3 días
- Seguimiento 7 días (valor)
- Seguimiento 14 días (último intento)
- Pedir referidos
- Mantenimiento mensual
- Cumpleaños
- Fin de año
- Reactivación 60 días

## Templates de Mensajes

### Mensaje Inicial (3 variantes)

**Directo:**
```
Hola {nombre}!

Vi que alquilás tu auto. Te escribo porque estamos
lanzando autorentar, una app con mejor comisión
(solo 15% vs 25-30% de otras).

Estamos sumando propietarios en {región}. ¿Te interesa?

Eduardo - autorentar
```

**Feedback:**
```
Hola {nombre}, cómo estás?

Soy Eduardo. Te contacto porque sos propietario que
alquila su auto.

¿Qué es lo que más te molesta de las apps de alquiler
actuales?

Estamos desarrollando algo diferente y tu feedback
me ayudaría mucho.
```

**Valor:**
```
Hola {nombre}!

3 razones por las que propietarios eligen autorentar:

1. Comisión 15% (vs 25-30%)
2. Cobrás en 24hs
3. Vos controlás precios

¿Te cuento más?

Eduardo
```

### Followups

**3 días:**
```
Hola {nombre}! Te escribí hace unos días sobre
autorentar. ¿Pudiste verlo? Cualquier duda estoy acá.
```

**7 días (valor):**
```
Hola {nombre}! Dato rápido: propietarios en {región}
generan $150-300k/mes extra alquilando su auto.
Si te interesa saber cómo, avisame.
```

**14 días (último):**
```
Hola {nombre}, último mensaje, no quiero molestarte.
Si en algún momento te interesa poner tu auto a
trabajar, acá estoy. Éxitos!
```

## Métricas a Trackear

| Métrica | Target | Cómo Joe lo hacía |
|---------|--------|-------------------|
| Tasa de respuesta | >20% | "Si no responden, algo hice mal" |
| Tasa de interés | >10% | "El producto se vende solo si escuchás" |
| Referidos por cliente | >1 | "250 personas conoce cada uno" |
| Tiempo a primera respuesta | <1hr | "El follow-up es todo" |

## Comandos Útiles

```bash
# Ver contactos en Supabase
curl "https://pisqjmoklivzpwufhscx.supabase.co/rest/v1/outreach_contacts?select=first_name,status,messages_sent,engagement_score&limit=20" \
  -H "apikey: TU_KEY" | jq

# Ver estadísticas por status
curl "https://pisqjmoklivzpwufhscx.supabase.co/rest/v1/rpc/get_outreach_stats" \
  -H "apikey: TU_KEY" | jq

# Logs de WAHA
docker logs waha -f

# Logs de n8n
docker logs n8n -f
```

## Archivos

```
whatsapp-outreach/
├── docker-compose.yaml           # WAHA + n8n
├── contacts/
│   └── argentina_owners.csv      # 203 contactos filtrados
├── migrations/
│   └── 001_girard_crm.sql        # Schema del CRM
├── filter-argentina-contacts.ts   # Filtrar CSV
├── import-contacts-to-supabase.ts # Importar a Supabase
├── message-templates.ts           # Templates de mensajes
├── n8n-girard-workflow.json       # Workflow completo
└── README.md                      # Este archivo
```

## Costos

| Servicio | Costo |
|----------|-------|
| WAHA Core | $0 |
| n8n Self-hosted | $0 |
| Supabase Free Tier | $0 |
| **Total** | **$0/mes** |

---

*"I send out over 13,000 cards every month. I want my customers to think of me when they think of cars."* - Joe Girard

**autorentar Sistema Girard v1.0**
