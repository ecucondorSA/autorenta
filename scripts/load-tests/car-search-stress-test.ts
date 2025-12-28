/**
 * Car Search Stress Test
 *
 * Simulates high-concurrency car search requests to test:
 * - Database connection pool limits
 * - RPC function performance under load
 * - Cache effectiveness (if any)
 * - Error rates under stress
 *
 * Usage:
 *   SUPABASE_URL="..." SUPABASE_ANON_KEY="..." npx tsx scripts/load-tests/car-search-stress-test.ts
 *
 * Options (env vars):
 *   CONCURRENCY=50      # Concurrent requests (default: 50)
 *   DURATION_SECS=60    # Test duration in seconds (default: 60)
 *   RAMP_UP_SECS=10     # Ramp-up period (default: 10)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pisqjmoklivzpwufhscx.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpc3FqbW9rbGl2enB3dWZoc2N4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0ODI3ODMsImV4cCI6MjA3ODA1ODc4M30.9EtMHXlpxCyZBMmlMYxYMjS3H7wjZ2M4M9p8gIqVb3I';

// Test configuration
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '50', 10);
const DURATION_SECS = parseInt(process.env.DURATION_SECS || '60', 10);
const RAMP_UP_SECS = parseInt(process.env.RAMP_UP_SECS || '10', 10);

// Search locations (Argentina cities)
const SEARCH_LOCATIONS = [
  { name: 'Buenos Aires', lat: -34.6037, lng: -58.3816 },
  { name: 'Córdoba', lat: -31.4201, lng: -64.1888 },
  { name: 'Rosario', lat: -32.9442, lng: -60.6505 },
  { name: 'Mendoza', lat: -32.8895, lng: -68.8458 },
  { name: 'Mar del Plata', lat: -38.0055, lng: -57.5426 },
  { name: 'San Miguel de Tucumán', lat: -26.8083, lng: -65.2176 },
  { name: 'Salta', lat: -24.7821, lng: -65.4232 },
  { name: 'Bariloche', lat: -41.1335, lng: -71.3103 },
];

// Price ranges for filtering
const PRICE_RANGES = [
  { min: 0, max: 50 },
  { min: 50, max: 100 },
  { min: 100, max: 200 },
  { min: 200, max: 500 },
];

// Transmission types
const TRANSMISSIONS = ['automatic', 'manual', null];

interface RequestResult {
  success: boolean;
  latencyMs: number;
  statusCode: number;
  carsReturned: number;
  errorMessage?: string;
}

interface StressTestMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  requestsPerSecond: number;
  errorRate: number;
  avgCarsReturned: number;
}

class StressTestWorker {
  private supabase: SupabaseClient;
  private results: RequestResult[] = [];
  private isRunning = false;

  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
  }

  async executeSearch(): Promise<RequestResult> {
    const start = performance.now();

    // Random search parameters
    const location = SEARCH_LOCATIONS[Math.floor(Math.random() * SEARCH_LOCATIONS.length)];
    const priceRange = PRICE_RANGES[Math.floor(Math.random() * PRICE_RANGES.length)];
    const transmission = TRANSMISSIONS[Math.floor(Math.random() * TRANSMISSIONS.length)];

    // Random date range (1-14 days from now, 1-7 day duration)
    const daysFromNow = Math.floor(Math.random() * 14) + 1;
    const duration = Math.floor(Math.random() * 7) + 1;
    const startDate = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
    const endDate = new Date(startDate.getTime() + duration * 24 * 60 * 60 * 1000);

    try {
      const { data, error } = await this.supabase.rpc('get_available_cars', {
        p_start_date: startDate.toISOString(),
        p_end_date: endDate.toISOString(),
        p_lat: location.lat + (Math.random() - 0.5) * 0.1, // Slight variation
        p_lng: location.lng + (Math.random() - 0.5) * 0.1,
        p_limit: 50,
        p_offset: 0,
      });

      const latency = performance.now() - start;

      if (error) {
        return {
          success: false,
          latencyMs: latency,
          statusCode: 500,
          carsReturned: 0,
          errorMessage: error.message,
        };
      }

      return {
        success: true,
        latencyMs: latency,
        statusCode: 200,
        carsReturned: Array.isArray(data) ? data.length : 0,
      };
    } catch (err) {
      const latency = performance.now() - start;
      return {
        success: false,
        latencyMs: latency,
        statusCode: 0,
        carsReturned: 0,
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  async runWorker(workerId: number, durationMs: number, delayMs: number): Promise<RequestResult[]> {
    // Wait for ramp-up delay
    await new Promise((resolve) => setTimeout(resolve, delayMs));

    const endTime = Date.now() + durationMs - delayMs;
    const results: RequestResult[] = [];

    while (Date.now() < endTime && this.isRunning) {
      const result = await this.executeSearch();
      results.push(result);

      // Small delay between requests (10-50ms) to prevent overwhelming
      await new Promise((resolve) => setTimeout(resolve, 10 + Math.random() * 40));
    }

    return results;
  }

  async runStressTest(): Promise<StressTestMetrics> {
    console.log('\n🔥 CAR SEARCH STRESS TEST');
    console.log('='.repeat(60));
    console.log(`📍 Target: ${SUPABASE_URL}`);
    console.log(`👥 Concurrency: ${CONCURRENCY} workers`);
    console.log(`⏱️  Duration: ${DURATION_SECS} seconds`);
    console.log(`📈 Ramp-up: ${RAMP_UP_SECS} seconds`);
    console.log('='.repeat(60));

    this.isRunning = true;
    const durationMs = DURATION_SECS * 1000;
    const rampUpMs = RAMP_UP_SECS * 1000;

    // Start workers with staggered ramp-up
    const workerPromises: Promise<RequestResult[]>[] = [];
    for (let i = 0; i < CONCURRENCY; i++) {
      const delayMs = (i / CONCURRENCY) * rampUpMs;
      workerPromises.push(this.runWorker(i, durationMs, delayMs));
    }

    // Progress reporting
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const percent = Math.min(100, Math.round((elapsed / durationMs) * 100));
      const totalResults = this.results.length;
      process.stdout.write(`\r⏳ Progress: ${percent}% | Requests: ${totalResults}`);
    }, 1000);

    const startTime = Date.now();

    // Wait for all workers
    const allResults = await Promise.all(workerPromises);

    clearInterval(progressInterval);
    this.isRunning = false;

    // Flatten results
    this.results = allResults.flat();
    const actualDuration = (Date.now() - startTime) / 1000;

    console.log(`\n\n✅ Test completed in ${actualDuration.toFixed(1)}s`);
    console.log(`📊 Total requests: ${this.results.length}`);

    return this.calculateMetrics(actualDuration);
  }

  private calculateMetrics(durationSecs: number): StressTestMetrics {
    const successful = this.results.filter((r) => r.success);
    const failed = this.results.filter((r) => !r.success);
    const latencies = this.results.map((r) => r.latencyMs).sort((a, b) => a - b);
    const carCounts = successful.map((r) => r.carsReturned);

    const percentile = (arr: number[], p: number) => arr[Math.floor(arr.length * p)] || 0;

    return {
      totalRequests: this.results.length,
      successfulRequests: successful.length,
      failedRequests: failed.length,
      avgLatencyMs: Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length || 0),
      minLatencyMs: Math.round(latencies[0] || 0),
      maxLatencyMs: Math.round(latencies[latencies.length - 1] || 0),
      p50LatencyMs: Math.round(percentile(latencies, 0.5)),
      p95LatencyMs: Math.round(percentile(latencies, 0.95)),
      p99LatencyMs: Math.round(percentile(latencies, 0.99)),
      requestsPerSecond: Math.round((this.results.length / durationSecs) * 10) / 10,
      errorRate: Math.round((failed.length / this.results.length) * 1000) / 10,
      avgCarsReturned: Math.round((carCounts.reduce((a, b) => a + b, 0) / carCounts.length || 0) * 10) / 10,
    };
  }

  getErrorBreakdown(): Record<string, number> {
    const errors: Record<string, number> = {};
    for (const result of this.results) {
      if (!result.success && result.errorMessage) {
        const key = result.errorMessage.substring(0, 50);
        errors[key] = (errors[key] || 0) + 1;
      }
    }
    return errors;
  }

  getLatencyDistribution(): Record<string, number> {
    const buckets: Record<string, number> = {
      '0-100ms': 0,
      '100-250ms': 0,
      '250-500ms': 0,
      '500-1000ms': 0,
      '1000-2000ms': 0,
      '>2000ms': 0,
    };

    for (const result of this.results) {
      const latency = result.latencyMs;
      if (latency < 100) buckets['0-100ms']++;
      else if (latency < 250) buckets['100-250ms']++;
      else if (latency < 500) buckets['250-500ms']++;
      else if (latency < 1000) buckets['500-1000ms']++;
      else if (latency < 2000) buckets['1000-2000ms']++;
      else buckets['>2000ms']++;
    }

    return buckets;
  }
}

function printMetrics(metrics: StressTestMetrics, worker: StressTestWorker): void {
  console.log('\n' + '='.repeat(60));
  console.log('📈 STRESS TEST RESULTS');
  console.log('='.repeat(60));

  console.log('\n📊 THROUGHPUT:');
  console.log(`   Requests/sec:     ${metrics.requestsPerSecond}`);
  console.log(`   Total requests:   ${metrics.totalRequests}`);
  console.log(`   Successful:       ${metrics.successfulRequests}`);
  console.log(`   Failed:           ${metrics.failedRequests}`);
  console.log(`   Error rate:       ${metrics.errorRate}%`);

  console.log('\n⏱️  LATENCY:');
  console.log(`   Avg:              ${metrics.avgLatencyMs}ms`);
  console.log(`   Min:              ${metrics.minLatencyMs}ms`);
  console.log(`   Max:              ${metrics.maxLatencyMs}ms`);
  console.log(`   P50:              ${metrics.p50LatencyMs}ms`);
  console.log(`   P95:              ${metrics.p95LatencyMs}ms`);
  console.log(`   P99:              ${metrics.p99LatencyMs}ms`);

  console.log('\n🚗 RESULTS:');
  console.log(`   Avg cars/search:  ${metrics.avgCarsReturned}`);

  console.log('\n📊 LATENCY DISTRIBUTION:');
  const distribution = worker.getLatencyDistribution();
  const total = Object.values(distribution).reduce((a, b) => a + b, 0);
  for (const [bucket, count] of Object.entries(distribution)) {
    const percent = Math.round((count / total) * 100);
    const bar = '█'.repeat(Math.max(1, Math.round(percent / 2)));
    console.log(`   ${bucket.padEnd(12)} ${bar} ${percent}% (${count})`);
  }

  if (metrics.failedRequests > 0) {
    console.log('\n⚠️  ERROR BREAKDOWN:');
    const errors = worker.getErrorBreakdown();
    for (const [error, count] of Object.entries(errors).slice(0, 5)) {
      console.log(`   - ${error}: ${count}`);
    }
  }

  console.log('\n' + '='.repeat(60));

  // Performance assessment
  console.log('\n🎯 ASSESSMENT:');

  if (metrics.errorRate > 5) {
    console.log('   ❌ HIGH ERROR RATE - System unstable under load');
  } else if (metrics.errorRate > 1) {
    console.log('   ⚠️  Moderate error rate - Monitor closely');
  } else {
    console.log('   ✅ Low error rate - System stable');
  }

  if (metrics.p95LatencyMs > 2000) {
    console.log('   ❌ P95 LATENCY TOO HIGH - Needs optimization');
  } else if (metrics.p95LatencyMs > 1000) {
    console.log('   ⚠️  P95 latency elevated - Consider optimization');
  } else if (metrics.p95LatencyMs > 500) {
    console.log('   ✅ P95 latency acceptable');
  } else {
    console.log('   ⚡ Excellent P95 latency');
  }

  if (metrics.requestsPerSecond < 10) {
    console.log('   ⚠️  Low throughput - May need scaling');
  } else if (metrics.requestsPerSecond < 50) {
    console.log('   ✅ Acceptable throughput');
  } else {
    console.log('   ⚡ High throughput capacity');
  }

  console.log('\n' + '='.repeat(60));
}

async function main(): Promise<void> {
  const worker = new StressTestWorker();

  try {
    const metrics = await worker.runStressTest();
    printMetrics(metrics, worker);

    // Exit with error if test failed
    if (metrics.errorRate > 10) {
      console.log('\n❌ STRESS TEST FAILED: Error rate too high');
      process.exit(1);
    }

    if (metrics.p95LatencyMs > 5000) {
      console.log('\n❌ STRESS TEST FAILED: Latency too high');
      process.exit(1);
    }

    console.log('\n✅ Stress test completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Stress test failed:', error);
    process.exit(1);
  }
}

main();
