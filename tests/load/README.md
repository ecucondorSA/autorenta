# Load Testing - AutoRenta

Pruebas de carga y estrés usando [k6](https://k6.io/).

## Instalación

```bash
# macOS
brew install k6

# Linux (Debian/Ubuntu)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Docker
docker pull grafana/k6
```

## Scripts Disponibles

| Script | Descripción | Escenario |
|--------|-------------|-----------|
| `marketplace-browse.js` | Navegación del catálogo de autos | 50 VUs, 5 min |
| `booking-flow.js` | Flujo completo de reserva | 20 VUs, 3 min |
| `wallet-operations.js` | Operaciones de wallet | 30 VUs, 3 min |

## Ejecución

### Local

```bash
# Ejecutar script individual
k6 run tests/load/scripts/marketplace-browse.js

# Con variables de entorno
k6 run -e BASE_URL=https://autorenta.com tests/load/scripts/marketplace-browse.js

# Con output a JSON
k6 run --out json=results.json tests/load/scripts/marketplace-browse.js
```

### Via npm

```bash
# Ejecutar todos los tests de carga
npm run test:load

# Ejecutar test específico
npm run test:load:marketplace
npm run test:load:booking
npm run test:load:wallet
```

### Docker

```bash
docker run -i grafana/k6 run - < tests/load/scripts/marketplace-browse.js
```

## Thresholds

Los tests fallan si no cumplen estos criterios:

| Métrica | Threshold | Descripción |
|---------|-----------|-------------|
| `http_req_duration` | p95 < 500ms | 95% de requests < 500ms |
| `http_req_failed` | < 1% | Menos de 1% de errores |
| `http_req_duration` | p99 < 1500ms | 99% de requests < 1.5s |
| `vus` | max 100 | Máximo 100 usuarios virtuales |

## Escenarios de Carga

### Smoke Test
Verificación básica con carga mínima.
```bash
k6 run -e SCENARIO=smoke tests/load/scripts/marketplace-browse.js
```

### Load Test
Carga normal esperada.
```bash
k6 run -e SCENARIO=load tests/load/scripts/marketplace-browse.js
```

### Stress Test
Carga por encima de lo normal para encontrar límites.
```bash
k6 run -e SCENARIO=stress tests/load/scripts/marketplace-browse.js
```

### Spike Test
Picos repentinos de tráfico.
```bash
k6 run -e SCENARIO=spike tests/load/scripts/marketplace-browse.js
```

## Configuración

### Variables de Entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `BASE_URL` | `https://autorenta.com` | URL base para tests |
| `SCENARIO` | `load` | Tipo de escenario |
| `SUPABASE_URL` | - | URL de Supabase para API calls |
| `SUPABASE_ANON_KEY` | - | Anon key para autenticación |

### Archivo de Configuración

Ver `k6.config.js` para configuración detallada de escenarios.

## CI/CD Integration

Los tests de carga se ejecutan:
- **Manual**: Workflow `load-test.yml` con `workflow_dispatch`
- **Semanal**: Domingos a las 3:00 AM UTC

## Resultados

### Output Local

```
          /\      |‾‾| /‾‾/   /‾‾/
     /\  /  \     |  |/  /   /  /
    /  \/    \    |     (   /   ‾‾\
   /          \   |  |\  \ |  (‾)  |
  / __________ \  |__| \__\ \_____/

     execution: local
        script: tests/load/scripts/marketplace-browse.js
        output: -

     scenarios: (100.00%) 1 scenario, 50 max VUs, 5m30s max duration
                default: 50 looping VUs for 5m0s

     data_received..................: 12 MB  40 kB/s
     data_sent......................: 1.2 MB 4.0 kB/s
     http_req_blocked...............: avg=1.2ms   min=0s     med=0s     max=120ms  p(90)=0s     p(95)=0s
     http_req_connecting............: avg=0.8ms   min=0s     med=0s     max=80ms   p(90)=0s     p(95)=0s
     http_req_duration..............: avg=120ms   min=50ms   med=100ms  max=800ms  p(90)=200ms  p(95)=300ms
     http_req_failed................: 0.50%  ✓ 15       ✗ 2985
     http_reqs......................: 3000   10/s
     iteration_duration.............: avg=1.2s    min=500ms  med=1s     max=3s     p(90)=2s     p(95)=2.5s
     iterations.....................: 2500   8.33/s
     vus............................: 50     min=50     max=50
     vus_max........................: 50     min=50     max=50
```

### Grafana Cloud (Opcional)

Para visualización avanzada:

```bash
k6 run --out cloud tests/load/scripts/marketplace-browse.js
```

## Troubleshooting

### Error: "too many open files"
```bash
ulimit -n 65536
```

### Error: "connection refused"
- Verificar que el servidor está corriendo
- Verificar `BASE_URL` es correcta
- Verificar firewall/network

### Tests muy lentos
- Reducir número de VUs
- Verificar latencia de red
- Ejecutar desde ubicación más cercana al servidor

## Recursos

- [k6 Documentation](https://k6.io/docs/)
- [k6 Examples](https://github.com/grafana/k6/tree/master/examples)
- [High Traffic Runbook](../../docs/runbooks/high-traffic.md)
