/**
 * Load Test for Edge Functions
 *
 * Tests the main Edge Functions under load to verify:
 * - Response times under stress
 * - Rate limiting works correctly
 * - No memory leaks or crashes
 *
 * Usage:
 *   npx tsx scripts/load-tests/edge-functions-load-test.ts
 *
 * Requirements:
 *   - SUPABASE_URL and SUPABASE_ANON_KEY env vars
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://aceacpaockyxgogxsfyc.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

interface LoadTestResult {
  endpoint: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rateLimitedRequests: number;
  avgResponseTimeMs: number;
  minResponseTimeMs: number;
  maxResponseTimeMs: number;
  p95ResponseTimeMs: number;
  requestsPerSecond: number;
}

interface EndpointConfig {
  name: string;
  path: string;
  method: 'GET' | 'POST';
  body?: object;
  expectedRateLimit?: number;
}

// Edge Functions to test
const ENDPOINTS: EndpointConfig[] = [
  {
    name: 'Health Check',
    path: '/functions/v1/health',
    method: 'GET',
  },
  {
    name: 'Get FX Rate',
    path: '/functions/v1/get-current-fx-rate',
    method: 'GET',
  },
  // Payment endpoints (will hit rate limits)
  {
    name: 'MercadoPago Brick (Rate Limited)',
    path: '/functions/v1/mercadopago-process-brick-payment',
    method: 'POST',
    body: { booking_id: 'test-load-test' },
    expectedRateLimit: 60,
  },
];

async function makeRequest(
  config: EndpointConfig,
): Promise<{ status: number; timeMs: number }> {
  const url = `${SUPABASE_URL}${config.path}`;
  const start = Date.now();

  try {
    const response = await fetch(url, {
      method: config.method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: config.method === 'POST' ? JSON.stringify(config.body || {}) : undefined,
    });

    return {
      status: response.status,
      timeMs: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 0,
      timeMs: Date.now() - start,
    };
  }
}

async function runLoadTest(
  config: EndpointConfig,
  concurrency: number,
  durationSeconds: number,
): Promise<LoadTestResult> {
  console.log(`\n🚀 Testing: ${config.name}`);
  console.log(`   Concurrency: ${concurrency}, Duration: ${durationSeconds}s`);

  const results: { status: number; timeMs: number }[] = [];
  const startTime = Date.now();
  const endTime = startTime + durationSeconds * 1000;

  // Create workers
  const workers: Promise<void>[] = [];
  for (let i = 0; i < concurrency; i++) {
    workers.push(
      (async () => {
        while (Date.now() < endTime) {
          const result = await makeRequest(config);
          results.push(result);

          // Small delay to prevent overwhelming
          await new Promise((r) => setTimeout(r, 50));
        }
      })(),
    );
  }

  await Promise.all(workers);

  // Calculate statistics
  const totalTime = (Date.now() - startTime) / 1000;
  const responseTimes = results.map((r) => r.timeMs).sort((a, b) => a - b);

  const stats: LoadTestResult = {
    endpoint: config.name,
    totalRequests: results.length,
    successfulRequests: results.filter((r) => r.status >= 200 && r.status < 300).length,
    failedRequests: results.filter((r) => r.status === 0 || r.status >= 500).length,
    rateLimitedRequests: results.filter((r) => r.status === 429).length,
    avgResponseTimeMs: Math.round(
      responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
    ),
    minResponseTimeMs: responseTimes[0] || 0,
    maxResponseTimeMs: responseTimes[responseTimes.length - 1] || 0,
    p95ResponseTimeMs: responseTimes[Math.floor(responseTimes.length * 0.95)] || 0,
    requestsPerSecond: Math.round(results.length / totalTime),
  };

  return stats;
}

function printResults(results: LoadTestResult[]): void {
  console.log('\n' + '='.repeat(80));
  console.log('📊 LOAD TEST RESULTS');
  console.log('='.repeat(80));

  for (const r of results) {
    console.log(`\n📌 ${r.endpoint}`);
    console.log(`   Total Requests:     ${r.totalRequests}`);
    console.log(`   Successful:         ${r.successfulRequests} (${Math.round((r.successfulRequests / r.totalRequests) * 100)}%)`);
    console.log(`   Failed:             ${r.failedRequests}`);
    console.log(`   Rate Limited:       ${r.rateLimitedRequests}`);
    console.log(`   Avg Response Time:  ${r.avgResponseTimeMs}ms`);
    console.log(`   Min Response Time:  ${r.minResponseTimeMs}ms`);
    console.log(`   Max Response Time:  ${r.maxResponseTimeMs}ms`);
    console.log(`   P95 Response Time:  ${r.p95ResponseTimeMs}ms`);
    console.log(`   Requests/Second:    ${r.requestsPerSecond}`);

    // Alerts
    if (r.p95ResponseTimeMs > 1000) {
      console.log(`   ⚠️  WARNING: P95 > 1000ms`);
    }
    if (r.failedRequests > r.totalRequests * 0.05) {
      console.log(`   ⚠️  WARNING: >5% failed requests`);
    }
  }

  console.log('\n' + '='.repeat(80));
}

async function main(): Promise<void> {
  console.log('🔧 AutoRenta Edge Functions Load Test');
  console.log(`📍 Target: ${SUPABASE_URL}`);

  if (!SUPABASE_ANON_KEY) {
    console.error('❌ SUPABASE_ANON_KEY is required');
    process.exit(1);
  }

  const results: LoadTestResult[] = [];

  // Test each endpoint
  for (const endpoint of ENDPOINTS) {
    // Light load test: 5 concurrent, 10 seconds
    const result = await runLoadTest(endpoint, 5, 10);
    results.push(result);
  }

  printResults(results);

  // Exit with error if any failures
  const hasFailures = results.some(
    (r) => r.failedRequests > r.totalRequests * 0.1,
  );
  process.exit(hasFailures ? 1 : 0);
}

main().catch(console.error);
