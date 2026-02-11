/**
 * AutoRenta - Test de Estrés de Reservas con k6
 *
 * Objetivo: Validar la capacidad del backend para manejar creación concurrente de reservas.
 * Flujo:
 * 1. Login (obtener token)
 * 2. Buscar autos disponibles
 * 3. Crear reserva (RPC request_booking)
 * 4. Cancelar reserva (para limpiar)
 *
 * Ejecutar:
 *   k6 run tools/load-test/k6-booking-stress-test.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { randomItem } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const BASE_URL = __ENV.SUPABASE_URL || 'https://aceacpaockyxgogxsfyc.supabase.co';
const ANON_KEY = __ENV.SUPABASE_ANON_KEY;
if (!ANON_KEY) throw new Error('SUPABASE_ANON_KEY env var is required');

// Credenciales de prueba (Usuario existente)
const TEST_USER = {
  email: 'eduardomarques@campus.fmed.uba.ar',
  password: 'Ab.12345',
};

// ============================================================================
// MÉTRICAS
// ============================================================================

const bookingSuccessRate = new Rate('booking_success_rate');
const bookingLatency = new Trend('booking_latency');
const loginLatency = new Trend('login_latency');

// ============================================================================
// OPCIONES DE CARGA
// ============================================================================

export const options = {
  scenarios: {
    // Escenario: Creación de reservas concurrentes
    booking_stress: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '30s', target: 5 },   // Warm-up: 5 usuarios simultáneos
        { duration: '1m', target: 20 },   // Load: 20 usuarios creando reservas
        { duration: '30s', target: 0 },   // Cool-down
      ],
      gracefulStop: '30s',
    },
  },
  thresholds: {
    booking_success_rate: ['rate>0.95'], // 95% de éxito mínimo
    booking_latency: ['p(95)<3000'],     // Latencia de creación < 3s
  },
};

// ============================================================================
// SETUP
// ============================================================================

export function setup() {
  console.log('🚀 Iniciando Stress Test de Reservas');
  
  // 1. Obtener Token de Auth
  const loginRes = http.post(
    `${BASE_URL}/auth/v1/token?grant_type=password`,
    JSON.stringify({
      email: TEST_USER.email,
      password: TEST_USER.password,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY,
      },
    }
  );

  check(loginRes, { 'Login status 200': (r) => r.status === 200 });

  if (loginRes.status !== 200) {
    throw new Error(`Login failed: ${loginRes.body}`);
  }

  const auth = JSON.parse(loginRes.body);
  const token = auth.access_token;
  const userId = auth.user.id;

  console.log(`✅ Login OK. User ID: ${userId}`);

  // 2. Obtener lista de autos validos para reservar
  // Remove status filter to debug enum issue
  const carsRes = http.get(
    `${BASE_URL}/rest/v1/cars?select=id,status&limit=10`,
    {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  console.log(`Cars Response: ${carsRes.status} ${carsRes.body}`);

  if (carsRes.status !== 200) {
    throw new Error(`Failed to fetch cars: ${carsRes.body}`);
  }

  const carsList = JSON.parse(carsRes.body);
  console.log(`First car status: ${carsList[0]?.status}`);
  const cars = carsList.map(c => c.id);
  console.log(`✅ Autos disponibles para test: ${cars.length}`);

  return { token, cars, userId };
}

// ============================================================================
// ESCENARIO PRINCIPAL
// ============================================================================

export default function (data) {
  const { token, cars } = data;
  const carId = randomItem(cars);

  const headers = {
    'Content-Type': 'application/json',
    'apikey': ANON_KEY,
    'Authorization': `Bearer ${token}`,
  };

  group('Booking Flow', () => {
    // 1. Definir fechas (futuras para evitar colisiones pasadas)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + Math.floor(Math.random() * 30) + 1); // 1-30 días en el futuro
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 3); // 3 días de duración

    // 2. Crear Reserva (RPC request_booking)
    const payload = {
      p_car_id: carId,
      p_start: startDate.toISOString(),
      p_end: endDate.toISOString(),
      p_pickup_lat: null,
      p_pickup_lng: null,
      p_dropoff_lat: null,
      p_dropoff_lng: null,
      p_delivery_required: false,
      p_use_dynamic_pricing: false,
      p_price_lock_token: null,
      p_dynamic_price_snapshot: null
    };

    const bookingRes = http.post(
      `${BASE_URL}/rpc/request_booking`,
      JSON.stringify(payload),
      { headers }
    );

    bookingLatency.add(bookingRes.timings.duration);
    const success = check(bookingRes, {
      'Booking created (200)': (r) => r.status === 200,
      'Response has booking_id': (r) => r.body && r.body.includes('booking_id'),
    });
    bookingSuccessRate.add(success);

    if (!success) {
      console.log(`❌ Booking failed: ${bookingRes.status} ${bookingRes.body}`);
      return;
    }

    // Parsear respuesta para obtener ID
    let bookingId;
    try {
      const body = JSON.parse(bookingRes.body);
      // RPC puede devolver array o objeto simple
      bookingId = Array.isArray(body) ? body[0].booking_id : body.booking_id;
      // Si retorna null ID (ej. fallo silencioso del RPC)
      if (!bookingId && body.id) bookingId = body.id; 
    } catch (e) {
      console.log('Error parsing booking response');
    }

    if (bookingId) {
      // 3. Cancelar la reserva inmediatamente para limpiar
      // Usamos un UPDATE directo ya que somos el dueño de la reserva
      // Nota: En producción esto debería ser via RPC o endpoint especifico
      const cancelRes = http.patch(
        `${BASE_URL}/rest/v1/bookings?id=eq.${bookingId}`,
        JSON.stringify({ status: 'cancelled_renter' }),
        { headers }
      );
      
      check(cancelRes, {
        'Booking cancelled cleanup': (r) => r.status === 200 || r.status === 204
      });
    }

    sleep(1);
  });
}
