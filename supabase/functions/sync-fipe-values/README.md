# FIPE Sync Edge Function

Sincroniza valuaciones de vehículos desde la API de FIPE Online.

## Setup

### 1. Configurar Token

```bash
# Ejecutar script de setup
./tools/setup-fipe-token.sh

# O manualmente:
supabase secrets set FIPE_API_TOKEN="your-jwt-token" --project-ref pisqjmoklivzpwufhscx
```

### 2. Deploy Edge Function

```bash
# Deploy a producción
supabase functions deploy sync-fipe-values --project-ref pisqjmoklivzpwufhscx

# O deploy local para testing
supabase functions serve sync-fipe-values
```

## Uso

### Sincronizar Manualmente

```bash
# Sync 10 vehículos (default)
curl -X POST https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/sync-fipe-values \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"limit": 10}'

# Sync 50 vehículos
curl -X POST https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/sync-fipe-values \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"limit": 50}'
```

### Response Example

```json
{
  "success": true,
  "result": {
    "total_cars": 10,
    "synced": 8,
    "skipped": 1,
    "failed": 1,
    "errors": ["Model not found in FIPE: Rare Model"]
  },
  "timestamp": "2025-11-11T10:30:00.000Z"
}
```

## Cron Job (Automatizado)

Para ejecutar automáticamente cada día:

### Opción A: GitHub Actions

Crear `.github/workflows/sync-fipe.yml`:

```yaml
name: Sync FIPE Values

on:
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM UTC
  workflow_dispatch: # Manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Call Edge Function
        run: |
          curl -X POST ${{ secrets.SUPABASE_URL }}/functions/v1/sync-fipe-values \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{"limit": 100}'
```

### Opción B: pg_cron (Supabase)

Crear cron job en Supabase:

```sql
-- Ejecutar diariamente a las 2 AM
SELECT cron.schedule(
  'sync-fipe-daily',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/sync-fipe-values',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.anon_key'),
      'Content-Type', 'application/json'
    ),
    body := '{"limit": 100}'::jsonb
  );
  $$
);
```

## Rate Limits

- **Free Tier**: 1,000 requests/day
- **Función**: 1 request cada 5 segundos = ~17,280/día (safe)
- **Recomendación**: Sync máximo 200 autos/día para estar seguro

## Lógica de Sincronización

La función sincroniza automáticamente:

1. ✅ Autos brasileños (`location_country = 'BR'`)
2. ✅ Sin `value_usd` (nunca valuados)
3. ✅ `fipe_last_sync` > 30 días (valor desactualizado)

**Prioridad:**
- Autos nuevos sin valor → PRIMERO
- Autos con sync antiguo → SEGUNDO
- Autos con valor manual del owner → SKIP (respeta owner)

## Conversión BRL → USD

La función usa la tabla `exchange_rates` para convertir:

```sql
SELECT platform_rate
FROM exchange_rates
WHERE from_currency = 'BRL' AND to_currency = 'USD'
ORDER BY created_at DESC
LIMIT 1;
```

**Fallback**: 5 BRL = 1 USD si no hay rate en DB

## Troubleshooting

### Error: "FIPE_API_TOKEN not configured"

```bash
# Verificar secret
supabase secrets list --project-ref pisqjmoklivzpwufhscx

# Reconfigurar
./tools/setup-fipe-token.sh
```

### Error: "Brand not found in FIPE"

Marca no existe en FIPE o nombre no coincide. Agregar mapping manual en `vehicle_pricing_models`:

```sql
INSERT INTO vehicle_pricing_models (brand, model, year_from, year_to, base_value_usd, category_id, data_source)
VALUES ('MarcaLocal', 'Modelo', 2020, 9999, 15000, (SELECT id FROM vehicle_categories WHERE code = 'standard'), 'manual');
```

### Monitorear Sync

```sql
-- Ver últimos syncs
SELECT
  brand_text_backup,
  model_text_backup,
  year,
  value_usd,
  value_usd_source,
  fipe_code,
  fipe_last_sync
FROM cars
WHERE value_usd_source = 'fipe'
ORDER BY fipe_last_sync DESC
LIMIT 20;

-- Contar por fuente
SELECT
  value_usd_source,
  COUNT(*) as count,
  AVG(value_usd)::INTEGER as avg_value
FROM cars
GROUP BY value_usd_source;
```

## API FIPE Info

- **Docs**: https://fipe.online/docs/api/fipe
- **Base URL**: https://fipe.parallelum.com.br/api/v2
- **Auth**: Header `X-Subscription-Token`
- **Rate Limit**: 1,000/day (free tier)
- **Data**: Valuaciones mensuales de vehículos brasileños
