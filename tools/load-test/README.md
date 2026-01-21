# AutoRenta - Test de Carga y Saturación

Test de rendimiento con [k6](https://k6.io/) para encontrar el punto de saturación del sistema.

## Requisitos

```bash
# Instalar k6 (macOS)
brew install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Docker
docker pull grafana/k6
```

## Tests Disponibles

### 1. Smoke Test (Verificación rápida)

Ejecutar primero para verificar que los endpoints responden:

```bash
k6 run tools/load-test/k6-smoke-test.js
```

### 2. Test de Saturación (Completo)

Test principal que incrementa usuarios gradualmente hasta encontrar el límite:

```bash
# Básico
k6 run tools/load-test/k6-saturation-test.js

# Con output JSON detallado
k6 run --out json=tools/load-test/results/raw.json tools/load-test/k6-saturation-test.js

# Con variables de entorno custom
SUPABASE_URL=https://xxx.supabase.co k6 run tools/load-test/k6-saturation-test.js
```

## Escenarios del Test

El test simula el comportamiento real de usuarios:

| Flujo | % Tráfico | Descripción |
|-------|-----------|-------------|
| Marketplace | 70% | Listado, filtros, navegación |
| Pricing | 15% | Cálculo de precio dinámico |
| Dashboard | 10% | Stats de propietarios |
| FIPE | 5% | Consulta de valores |

## Fases del Test

```
VUs
300 |                    ████████████
250 |                ████
200 |            ████
150 |        ████
100 |    ████
 50 |  ██
 10 |██
  0 |________________________________
    0   5   10   15   20   25 minutos
```

- **0-1 min**: Warm-up (1→10 VUs)
- **1-10 min**: Ramp-up progresivo (10→200 VUs)
- **10-18 min**: Máxima carga (200→300 VUs)
- **18-23 min**: Sostener máximo (300 VUs)
- **23-25 min**: Cool-down

## Métricas Clave

### Umbrales de Éxito

| Métrica | Umbral | Significado |
|---------|--------|-------------|
| `http_req_duration p(95)` | < 2000ms | 95% de requests bajo 2s |
| `http_req_duration p(99)` | < 5000ms | 99% de requests bajo 5s |
| `http_req_failed` | < 5% | Menos de 5% de errores |

### Indicadores de Saturación

El sistema está saturado cuando:

1. **Latencia p95 > 3000ms** - Degradación notable
2. **Error rate > 5%** - Sistema rechazando requests
3. **Throughput (req/s) no aumenta** con más VUs

## Interpretación de Resultados

### Resultados Esperados

```
     ✓ http_req_duration..............: avg=245ms min=50ms med=180ms max=4500ms p(90)=450ms p(95)=800ms
     ✓ http_req_failed................: 0.02%   ✓ 15       ✗ 78542
     ✓ http_reqs......................: 78557   49.12/s
```

### Punto de Saturación

Buscar el momento donde:
- Latencia empieza a crecer exponencialmente
- Error rate supera umbral
- VUs activos en ese momento = capacidad máxima

## Análisis Post-Test

```bash
# Analizar resultados
bun run tools/load-test/analyze-results.ts tools/load-test/results/summary-*.json

# Ver HTML report
open tools/load-test/results/summary-*.html
```

## Grafana Cloud (Opcional)

Para visualización en tiempo real:

```bash
# Registrarse en https://grafana.com/products/cloud/k6/
# Obtener token

K6_CLOUD_TOKEN=your-token k6 cloud tools/load-test/k6-saturation-test.js
```

## Troubleshooting

### Error: "No se puede conectar a Supabase"

```bash
# Verificar conectividad
curl -I https://pisqjmoklivzpwufhscx.supabase.co/rest/v1/
```

### Error: "Too many requests"

Supabase tiene rate limiting. Opciones:
- Reducir VUs máximos
- Usar proyecto de staging
- Solicitar aumento de límites

### Métricas no se guardan

```bash
# Asegurar que existe el directorio
mkdir -p tools/load-test/results
```

## Comparativa con Benchmarks

| Plan Supabase | Esperado req/s | VUs Concurrentes |
|---------------|----------------|------------------|
| Free | ~50 | 20-30 |
| Pro | ~500 | 100-150 |
| Team | ~2000 | 300-500 |

> Nota: Estos son estimados. El resultado real depende de la complejidad de queries y Edge Functions.
