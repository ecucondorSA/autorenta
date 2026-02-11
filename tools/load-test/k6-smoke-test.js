/**
 * AutoRenta - Smoke Test con k6
 *
 * Test rápido para verificar que los endpoints responden antes del test completo.
 *
 * Ejecutar:
 *   k6 run tools/load-test/k6-smoke-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.SUPABASE_URL || 'https://aceacpaockyxgogxsfyc.supabase.co';
const ANON_KEY = __ENV.SUPABASE_ANON_KEY;
if (!ANON_KEY) throw new Error('SUPABASE_ANON_KEY env var is required');

const BASE_HEADERS = {
  'Content-Type': 'application/json',
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
};

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    http_req_failed: ['rate==0'],
    http_req_duration: ['p(95)<5000'],
  },
};

export default function () {
  console.log('🔍 Testing REST API...');

  // Test 1: REST API - Listar autos
  const carsRes = http.get(`${BASE_URL}/rest/v1/cars?select=id,brand,model&limit=5`, {
    headers: BASE_HEADERS,
  });

  check(carsRes, {
    '✅ REST API: status 200': (r) => r.status === 200,
    '✅ REST API: returns array': (r) => {
      try {
        return Array.isArray(JSON.parse(r.body));
      } catch {
        return false;
      }
    },
  });

  console.log(`   Status: ${carsRes.status}, Duration: ${carsRes.timings.duration}ms`);

  sleep(1);

  console.log('🔍 Testing Edge Functions...');

  // Test 2: Edge Function - Calculate Dynamic Price
  const priceRes = http.post(
    `${BASE_URL}/functions/v1/calculate-dynamic-price`,
    JSON.stringify({
      car_id: 'test-car-id',
      start_date: '2025-02-01',
      end_date: '2025-02-05',
    }),
    { headers: BASE_HEADERS }
  );

  check(priceRes, {
    '✅ Edge Function: responds (any status)': (r) => r.status > 0,
    '✅ Edge Function: duration < 5s': (r) => r.timings.duration < 5000,
  });

  console.log(`   Status: ${priceRes.status}, Duration: ${priceRes.timings.duration}ms`);

  sleep(1);

  // Test 3: Edge Function - FIPE
  console.log('🔍 Testing FIPE Edge Function...');

  const fipeRes = http.post(
    `${BASE_URL}/functions/v1/get-fipe-value`,
    JSON.stringify({
      brand: 'FIAT',
      model: 'UNO',
      year: '2020',
    }),
    { headers: BASE_HEADERS }
  );

  check(fipeRes, {
    '✅ FIPE Function: responds': (r) => r.status > 0,
  });

  console.log(`   Status: ${fipeRes.status}, Duration: ${fipeRes.timings.duration}ms`);

  console.log('\n✨ Smoke test completado!');
}

export function handleSummary(data) {
  const failed = data.metrics.checks?.values?.fails || 0;
  const passed = data.metrics.checks?.values?.passes || 0;

  console.log('\n📊 Resumen:');
  console.log(`   Checks pasados: ${passed}`);
  console.log(`   Checks fallidos: ${failed}`);

  if (failed === 0) {
    console.log('\n✅ Todos los endpoints responden. Puedes ejecutar el test completo.');
  } else {
    console.log('\n⚠️  Algunos endpoints fallaron. Revisar antes del test de carga.');
  }

  return {};
}
