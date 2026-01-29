/**
 * AutoRenta - Test de Saturación con k6
 *
 * Objetivo: Encontrar el punto de saturación del sistema
 * Estrategia: Ramp-up gradual hasta encontrar degradación
 *
 * Ejecutar:
 *   k6 run tools/load-test/k6-saturation-test.js
 *
 * Con output a JSON:
 *   k6 run --out json=results.json tools/load-test/k6-saturation-test.js
 *
 * Con Grafana Cloud:
 *   K6_CLOUD_TOKEN=xxx k6 cloud tools/load-test/k6-saturation-test.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { randomItem, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const BASE_URL = __ENV.SUPABASE_URL || 'https://pisqjmoklivzpwufhscx.supabase.co';
const ANON_KEY = __ENV.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpc3FqbW9rbGl2enB3dWZoc2N4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0ODI3ODMsImV4cCI6MjA3ODA1ODc4M30.wE2jTut2JSexoKFtHdEaIpl9MZ0sOHy9zMYBbhFbzt4';

// Headers base para todas las requests
const BASE_HEADERS = {
  'Content-Type': 'application/json',
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
};

// ============================================================================
// MÉTRICAS CUSTOM
// ============================================================================

// Contadores por endpoint
const marketplaceRequests = new Counter('marketplace_requests');
const carDetailRequests = new Counter('car_detail_requests');
const searchRequests = new Counter('search_requests');
const authRequests = new Counter('auth_requests');
const edgeFunctionRequests = new Counter('edge_function_requests');

// Tasas de error por tipo
const marketplaceErrors = new Rate('marketplace_errors');
const carDetailErrors = new Rate('car_detail_errors');
const searchErrors = new Rate('search_errors');
const edgeFunctionErrors = new Rate('edge_function_errors');

// Latencias por endpoint
const marketplaceLatency = new Trend('marketplace_latency', true);
const carDetailLatency = new Trend('car_detail_latency', true);
const searchLatency = new Trend('search_latency', true);
const edgeFunctionLatency = new Trend('edge_function_latency', true);

// ============================================================================
// ESCENARIOS DE CARGA
// ============================================================================

export const options = {
  // Test de saturación: incrementar hasta encontrar límites
  scenarios: {
    // Escenario 1: Ramp-up gradual para encontrar punto de quiebre
    saturation_test: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        // Warm-up
        { duration: '1m', target: 10 },     // 1 min: 1→10 VUs
        { duration: '2m', target: 25 },     // 2 min: 10→25 VUs
        { duration: '2m', target: 50 },     // 2 min: 25→50 VUs
        { duration: '3m', target: 100 },    // 3 min: 50→100 VUs
        { duration: '3m', target: 150 },    // 3 min: 100→150 VUs
        { duration: '3m', target: 200 },    // 3 min: 150→200 VUs
        { duration: '3m', target: 250 },    // 3 min: 200→250 VUs
        { duration: '2m', target: 300 },    // 2 min: 250→300 VUs
        // Sostener máximo
        { duration: '5m', target: 300 },    // 5 min: mantener 300 VUs
        // Cool-down
        { duration: '2m', target: 0 },      // 2 min: 300→0 VUs
      ],
      gracefulStop: '30s',
    },
  },

  // Umbrales para determinar "fallo"
  thresholds: {
    // Latencia general
    http_req_duration: [
      'p(95)<2000',   // 95% bajo 2s (warn)
      'p(99)<5000',   // 99% bajo 5s (critical)
    ],

    // Tasa de errores
    http_req_failed: ['rate<0.05'],  // Menos del 5% de errores

    // Latencias por endpoint
    marketplace_latency: ['p(95)<1500'],
    car_detail_latency: ['p(95)<2000'],
    search_latency: ['p(95)<1000'],
    edge_function_latency: ['p(95)<3000'],

    // Errores por endpoint
    marketplace_errors: ['rate<0.05'],
    car_detail_errors: ['rate<0.05'],
    search_errors: ['rate<0.10'],  // Búsquedas pueden ser más lentas
    edge_function_errors: ['rate<0.05'],
  },
};

// ============================================================================
// DATOS DE PRUEBA
// ============================================================================

// IDs de autos reales (reemplazar con IDs de tu BD)
const CAR_IDS = [
  'car-uuid-1',
  'car-uuid-2',
  'car-uuid-3',
  // Agregar más IDs reales
];

// Ciudades para búsqueda
const CITIES = [
  'São Paulo',
  'Rio de Janeiro',
  'Belo Horizonte',
  'Curitiba',
  'Porto Alegre',
  'Salvador',
  'Fortaleza',
  'Brasília',
];

// Categorías de vehículos
const CATEGORIES = ['economy', 'compact', 'suv', 'luxury', 'pickup'];

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

function supabaseRest(path, options = {}) {
  const url = `${BASE_URL}/rest/v1/${path}`;
  const headers = { ...BASE_HEADERS, ...options.headers };

  const response = http.get(url, { headers, tags: options.tags });
  return response;
}

function supabaseEdgeFunction(functionName, payload = {}, options = {}) {
  const url = `${BASE_URL}/functions/v1/${functionName}`;
  const headers = { ...BASE_HEADERS, ...options.headers };

  const response = http.post(url, JSON.stringify(payload), {
    headers,
    tags: { name: `edge_${functionName}`, ...options.tags }
  });
  return response;
}

// ============================================================================
// FLUJOS DE USUARIO
// ============================================================================

/**
 * Flujo 1: Usuario explorando marketplace (70% del tráfico)
 * - Ver listado de autos
 * - Filtrar por ciudad/categoría
 * - Ver detalles de 2-3 autos
 */
function marketplaceFlow() {
  group('Marketplace Flow', () => {
    // 1. Listar autos disponibles
    group('List Cars', () => {
      const city = randomItem(CITIES);
      const response = supabaseRest(
        `cars?select=id,brand,model,year,daily_rate,photos,rating&status=eq.available&city=ilike.*${encodeURIComponent(city)}*&limit=20`,
        { tags: { name: 'marketplace_list' } }
      );

      marketplaceRequests.add(1);
      marketplaceLatency.add(response.timings.duration);

      const success = check(response, {
        'marketplace list status 200': (r) => r.status === 200,
        'marketplace has cars': (r) => {
          try {
            const data = JSON.parse(r.body);
            return Array.isArray(data);
          } catch {
            return false;
          }
        },
      });

      marketplaceErrors.add(!success);
    });

    sleep(randomIntBetween(1, 3));

    // 2. Filtrar por categoría
    group('Filter Cars', () => {
      const category = randomItem(CATEGORIES);
      const response = supabaseRest(
        `cars?select=id,brand,model,year,daily_rate&status=eq.available&category=eq.${category}&limit=10`,
        { tags: { name: 'marketplace_filter' } }
      );

      searchRequests.add(1);
      searchLatency.add(response.timings.duration);

      const success = check(response, {
        'filter status 200': (r) => r.status === 200,
      });

      searchErrors.add(!success);
    });

    sleep(randomIntBetween(1, 2));

    // 3. Ver detalles de un auto
    group('Car Detail', () => {
      const carId = randomItem(CAR_IDS);
      const response = supabaseRest(
        `cars?select=*,owner:profiles(id,name,avatar_url,rating),reviews(rating,comment)&id=eq.${carId}`,
        { tags: { name: 'car_detail' } }
      );

      carDetailRequests.add(1);
      carDetailLatency.add(response.timings.duration);

      const success = check(response, {
        'car detail status 200': (r) => r.status === 200,
      });

      carDetailErrors.add(!success);
    });
  });
}

/**
 * Flujo 2: Usuario buscando precio dinámico (15% del tráfico)
 * - Llamar Edge Function de cálculo de precio
 */
function pricingFlow() {
  group('Dynamic Pricing Flow', () => {
    const carId = randomItem(CAR_IDS);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + randomIntBetween(1, 30));
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + randomIntBetween(1, 14));

    const response = supabaseEdgeFunction('calculate-dynamic-price', {
      car_id: carId,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
    });

    edgeFunctionRequests.add(1);
    edgeFunctionLatency.add(response.timings.duration);

    const success = check(response, {
      'pricing status 200': (r) => r.status === 200,
      'pricing has total': (r) => {
        try {
          const data = JSON.parse(r.body);
          return typeof data.total_price === 'number';
        } catch {
          return false;
        }
      },
    });

    edgeFunctionErrors.add(!success);
  });
}

/**
 * Flujo 3: Dashboard stats (10% del tráfico)
 * - Simula owner viendo estadísticas
 */
function dashboardFlow() {
  group('Dashboard Stats Flow', () => {
    const response = supabaseEdgeFunction('dashboard-stats', {
      period: 'month',
    });

    edgeFunctionRequests.add(1);
    edgeFunctionLatency.add(response.timings.duration);

    const success = check(response, {
      'dashboard status 200 or 401': (r) => r.status === 200 || r.status === 401,
    });

    edgeFunctionErrors.add(!success && response.status !== 401);
  });
}

/**
 * Flujo 4: FIPE Value lookup (5% del tráfico)
 * - Consulta valor FIPE de vehículo
 */
function fipeFlow() {
  group('FIPE Lookup Flow', () => {
    const response = supabaseEdgeFunction('get-fipe-value', {
      brand: 'FIAT',
      model: 'UNO',
      year: '2020',
    });

    edgeFunctionRequests.add(1);
    edgeFunctionLatency.add(response.timings.duration);

    const success = check(response, {
      'fipe status 200': (r) => r.status === 200,
    });

    edgeFunctionErrors.add(!success);
  });
}

// ============================================================================
// FUNCIÓN PRINCIPAL
// ============================================================================

export default function () {
  // Distribución de tráfico basada en uso real
  const random = Math.random();

  if (random < 0.70) {
    // 70% - Navegación marketplace
    marketplaceFlow();
  } else if (random < 0.85) {
    // 15% - Consulta de precios
    pricingFlow();
  } else if (random < 0.95) {
    // 10% - Dashboard
    dashboardFlow();
  } else {
    // 5% - FIPE lookup
    fipeFlow();
  }

  // Pausa entre iteraciones (simula tiempo de lectura)
  sleep(randomIntBetween(2, 5));
}

// ============================================================================
// LIFECYCLE HOOKS
// ============================================================================

export function setup() {
  console.log('🚀 Iniciando test de saturación AutoRenta');
  console.log(`📍 Target: ${BASE_URL}`);
  console.log('⏱️  Duración estimada: ~26 minutos');

  // Verificar conectividad
  const healthCheck = http.get(`${BASE_URL}/rest/v1/`, {
    headers: BASE_HEADERS,
  });

  if (healthCheck.status !== 200) {
    console.error('❌ No se puede conectar a Supabase');
    throw new Error('Health check failed');
  }

  console.log('✅ Conectividad OK');

  return { startTime: new Date().toISOString() };
}

export function teardown(data) {
  console.log('\n📊 Test completado');
  console.log(`⏰ Inicio: ${data.startTime}`);
  console.log(`⏰ Fin: ${new Date().toISOString()}`);
}

// ============================================================================
// HANDLE SUMMARY
// ============================================================================

export function handleSummary(data) {
  // Generar reporte en múltiples formatos
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    [`tools/load-test/results/summary-${timestamp}.json`]: JSON.stringify(data, null, 2),
    [`tools/load-test/results/summary-${timestamp}.html`]: htmlReport(data),
  };
}

// ============================================================================
// HELPERS PARA REPORTES
// ============================================================================

function textSummary(data, options) {
  // k6 usa esto por defecto, pero lo definimos para claridad
  return '';
}

function htmlReport(data) {
  const metrics = data.metrics;
  const thresholds = data.thresholds || {};

  return `
<!DOCTYPE html>
<html>
<head>
  <title>AutoRenta Load Test Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { color: #1a1a1a; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
    h2 { color: #333; margin-top: 30px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f8f9fa; font-weight: 600; }
    .pass { color: #28a745; }
    .fail { color: #dc3545; }
    .metric-card { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 10px 0; }
    .metric-value { font-size: 2em; font-weight: bold; color: #007bff; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚗 AutoRenta - Load Test Report</h1>
    <p>Generado: ${new Date().toISOString()}</p>

    <div class="grid">
      <div class="metric-card">
        <div>Requests Totales</div>
        <div class="metric-value">${metrics.http_reqs?.values?.count || 0}</div>
      </div>
      <div class="metric-card">
        <div>Requests/segundo (avg)</div>
        <div class="metric-value">${(metrics.http_reqs?.values?.rate || 0).toFixed(2)}</div>
      </div>
      <div class="metric-card">
        <div>Latencia p95</div>
        <div class="metric-value">${(metrics.http_req_duration?.values?.['p(95)'] || 0).toFixed(0)}ms</div>
      </div>
      <div class="metric-card">
        <div>Tasa de Error</div>
        <div class="metric-value">${((metrics.http_req_failed?.values?.rate || 0) * 100).toFixed(2)}%</div>
      </div>
    </div>

    <h2>📈 Métricas por Endpoint</h2>
    <table>
      <tr>
        <th>Endpoint</th>
        <th>Requests</th>
        <th>Latencia p95</th>
        <th>Error Rate</th>
      </tr>
      <tr>
        <td>Marketplace</td>
        <td>${metrics.marketplace_requests?.values?.count || 0}</td>
        <td>${(metrics.marketplace_latency?.values?.['p(95)'] || 0).toFixed(0)}ms</td>
        <td>${((metrics.marketplace_errors?.values?.rate || 0) * 100).toFixed(2)}%</td>
      </tr>
      <tr>
        <td>Car Detail</td>
        <td>${metrics.car_detail_requests?.values?.count || 0}</td>
        <td>${(metrics.car_detail_latency?.values?.['p(95)'] || 0).toFixed(0)}ms</td>
        <td>${((metrics.car_detail_errors?.values?.rate || 0) * 100).toFixed(2)}%</td>
      </tr>
      <tr>
        <td>Search</td>
        <td>${metrics.search_requests?.values?.count || 0}</td>
        <td>${(metrics.search_latency?.values?.['p(95)'] || 0).toFixed(0)}ms</td>
        <td>${((metrics.search_errors?.values?.rate || 0) * 100).toFixed(2)}%</td>
      </tr>
      <tr>
        <td>Edge Functions</td>
        <td>${metrics.edge_function_requests?.values?.count || 0}</td>
        <td>${(metrics.edge_function_latency?.values?.['p(95)'] || 0).toFixed(0)}ms</td>
        <td>${((metrics.edge_function_errors?.values?.rate || 0) * 100).toFixed(2)}%</td>
      </tr>
    </table>

    <h2>✅ Thresholds</h2>
    <table>
      <tr>
        <th>Métrica</th>
        <th>Condición</th>
        <th>Resultado</th>
      </tr>
      ${Object.entries(thresholds).map(([name, result]) => `
        <tr>
          <td>${name}</td>
          <td>${Array.isArray(result) ? result.map(r => r.threshold).join(', ') : ''}</td>
          <td class="${result.ok !== false ? 'pass' : 'fail'}">${result.ok !== false ? '✓ PASS' : '✗ FAIL'}</td>
        </tr>
      `).join('')}
    </table>

    <h2>📋 Conclusiones</h2>
    <p>Ver análisis detallado en el archivo JSON adjunto.</p>
  </div>
</body>
</html>
  `;
}
