import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

/**
 * Marketplace Browse Load Test
 *
 * Simulates users browsing the car marketplace:
 * - Homepage load
 * - Search/filter cars
 * - View car details
 * - View map with markers
 */

// Custom metrics
const errorRate = new Rate('errors');
const searchDuration = new Trend('search_duration');
const carDetailDuration = new Trend('car_detail_duration');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'https://autorenta.com';
const SUPABASE_URL = __ENV.SUPABASE_URL || 'https://pisqjmoklivzpwufhscx.supabase.co';
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY || '';

// Scenario configurations
const scenarios = {
  smoke: {
    vus: 5,
    duration: '1m',
  },
  load: {
    stages: [
      { duration: '1m', target: 20 },  // Ramp up
      { duration: '3m', target: 50 },  // Stay at peak
      { duration: '1m', target: 0 },   // Ramp down
    ],
  },
  stress: {
    stages: [
      { duration: '2m', target: 50 },
      { duration: '3m', target: 100 },
      { duration: '2m', target: 150 },
      { duration: '2m', target: 0 },
    ],
  },
  spike: {
    stages: [
      { duration: '30s', target: 10 },
      { duration: '30s', target: 200 }, // Spike!
      { duration: '1m', target: 200 },
      { duration: '30s', target: 10 },
      { duration: '1m', target: 0 },
    ],
  },
};

const selectedScenario = __ENV.SCENARIO || 'load';

export const options = {
  ...scenarios[selectedScenario],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1500'],
    http_req_failed: ['rate<0.01'],
    errors: ['rate<0.05'],
    search_duration: ['p(95)<800'],
    car_detail_duration: ['p(95)<600'],
  },
  tags: {
    testType: 'marketplace-browse',
    scenario: selectedScenario,
  },
};

// Sample data
const cities = ['Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza', 'Tucumán'];
const carTypes = ['sedan', 'suv', 'pickup', 'hatchback', 'van'];

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_ANON_KEY,
  };

  group('Homepage', () => {
    // Load homepage
    const homeRes = http.get(`${BASE_URL}/`);
    check(homeRes, {
      'homepage status 200': (r) => r.status === 200,
      'homepage has content': (r) => r.body.length > 1000,
    }) || errorRate.add(1);

    sleep(1);
  });

  group('Search Cars', () => {
    const city = cities[Math.floor(Math.random() * cities.length)];

    // Search API call
    const startTime = Date.now();
    const searchRes = http.get(
      `${SUPABASE_URL}/rest/v1/cars?select=id,title,daily_price,city,images&city=ilike.*${city}*&status=eq.available&limit=20`,
      { headers }
    );

    searchDuration.add(Date.now() - startTime);

    check(searchRes, {
      'search status 200': (r) => r.status === 200,
      'search returns array': (r) => {
        try {
          const data = JSON.parse(r.body);
          return Array.isArray(data);
        } catch {
          return false;
        }
      },
    }) || errorRate.add(1);

    sleep(2);
  });

  group('Filter by Type', () => {
    const carType = carTypes[Math.floor(Math.random() * carTypes.length)];

    const filterRes = http.get(
      `${SUPABASE_URL}/rest/v1/cars?select=id,title,daily_price,car_type&car_type=eq.${carType}&status=eq.available&limit=10`,
      { headers }
    );

    check(filterRes, {
      'filter status 200': (r) => r.status === 200,
    }) || errorRate.add(1);

    sleep(1);
  });

  group('View Car Detail', () => {
    // First get a car ID from search
    const searchRes = http.get(
      `${SUPABASE_URL}/rest/v1/cars?select=id&status=eq.available&limit=1`,
      { headers }
    );

    let carId;
    try {
      const cars = JSON.parse(searchRes.body);
      if (cars.length > 0) {
        carId = cars[0].id;
      }
    } catch {
      errorRate.add(1);
      return;
    }

    if (!carId) {
      return;
    }

    // Load car detail
    const startTime = Date.now();
    const detailRes = http.get(
      `${SUPABASE_URL}/rest/v1/cars?select=*,owner:profiles(id,first_name,avatar_url,rating)&id=eq.${carId}`,
      { headers }
    );

    carDetailDuration.add(Date.now() - startTime);

    check(detailRes, {
      'detail status 200': (r) => r.status === 200,
      'detail has car data': (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.length === 1 && data[0].id === carId;
        } catch {
          return false;
        }
      },
    }) || errorRate.add(1);

    sleep(3);
  });

  group('Load Map Markers', () => {
    // Get cars with location for map
    const mapRes = http.get(
      `${SUPABASE_URL}/rest/v1/cars?select=id,latitude,longitude,daily_price,title&status=eq.available&latitude=not.is.null&limit=100`,
      { headers }
    );

    check(mapRes, {
      'map status 200': (r) => r.status === 200,
      'map has locations': (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.length > 0;
        } catch {
          return false;
        }
      },
    }) || errorRate.add(1);

    sleep(2);
  });

  // Random think time between iterations
  sleep(Math.random() * 3 + 1);
}

export function handleSummary(data) {
  return {
    'tests/load/results/marketplace-browse-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, opts) {
  // Simple text summary
  const metrics = data.metrics;
  let output = '\n=== Marketplace Browse Test Summary ===\n\n';

  output += `Total Requests: ${metrics.http_reqs?.values?.count || 0}\n`;
  output += `Failed Requests: ${(metrics.http_req_failed?.values?.rate * 100 || 0).toFixed(2)}%\n`;
  output += `Avg Response Time: ${(metrics.http_req_duration?.values?.avg || 0).toFixed(2)}ms\n`;
  output += `P95 Response Time: ${(metrics.http_req_duration?.values['p(95)'] || 0).toFixed(2)}ms\n`;
  output += `P99 Response Time: ${(metrics.http_req_duration?.values['p(99)'] || 0).toFixed(2)}ms\n\n`;

  output += `Search Duration P95: ${(metrics.search_duration?.values['p(95)'] || 0).toFixed(2)}ms\n`;
  output += `Car Detail Duration P95: ${(metrics.car_detail_duration?.values['p(95)'] || 0).toFixed(2)}ms\n`;

  return output;
}
