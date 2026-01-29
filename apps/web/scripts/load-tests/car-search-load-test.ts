#!/usr/bin/env npx ts-node
/**
 * Car Search Load Test Script
 *
 * Tests the get_available_cars RPC function under load to verify:
 * - Query performance with spatial filtering
 * - Response times under concurrent requests
 * - Stability of geo-queries
 *
 * Usage:
 *   npx ts-node apps/web/scripts/load-tests/car-search-load-test.ts
 *
 * Environment:
 *   SUPABASE_URL - Supabase project URL
 *   SUPABASE_ANON_KEY - Anon key for testing
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface LoadTestConfig {
  concurrentRequests: number;
  totalRequests: number;
  delayBetweenBatchesMs: number;
}

interface LoadTestResult {
  totalRequests: number;
  successCount: number;
  failureCount: number;
  averageLatencyMs: number;
  p95LatencyMs: number;
  maxLatencyMs: number;
  minLatencyMs: number;
  requestsPerSecond: number;
  avgCarsReturned: number;
  errors: { code: string; message: string; count: number }[];
}

interface RequestResult {
  success: boolean;
  latencyMs: number;
  carsReturned: number;
  errorCode?: string;
  errorMessage?: string;
}

// Sample locations around Ecuador for testing
const TEST_LOCATIONS = [
  { lat: -0.1807, lng: -78.4678, name: 'Quito Centro' },
  { lat: -2.1894, lng: -79.8891, name: 'Guayaquil' },
  { lat: -2.9001, lng: -79.0059, name: 'Cuenca' },
  { lat: 0.3517, lng: -78.1223, name: 'Ibarra' },
  { lat: -1.2491, lng: -78.6287, name: 'Ambato' },
  { lat: -0.9677, lng: -80.7089, name: 'Manta' },
  { lat: -3.2581, lng: -79.9554, name: 'Machala' },
  { lat: 0.0236, lng: -78.1476, name: 'Cayambe' },
  { lat: -1.0163, lng: -79.4622, name: 'Babahoyo' },
  { lat: -0.2299, lng: -78.5249, name: 'Quito Norte' },
];

class CarSearchLoadTest {
  private supabase: SupabaseClient;
  private config: LoadTestConfig;

  constructor(config: LoadTestConfig = {
    concurrentRequests: 20,
    totalRequests: 100,
    delayBetweenBatchesMs: 50,
  }) {
    this.config = config;
    const supabaseUrl = process.env['SUPABASE_URL'] || '';
    const supabaseKey = process.env['SUPABASE_ANON_KEY'] || process.env['SUPABASE_SERVICE_KEY'] || '';

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY environment variables required');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Run the load test
   */
  async run(): Promise<LoadTestResult> {
    console.log('\n🚀 Starting Car Search Load Test');
    console.log(`   Config: ${this.config.totalRequests} total requests`);
    console.log(`   Concurrency: ${this.config.concurrentRequests} simultaneous`);
    console.log(`   Delay between batches: ${this.config.delayBetweenBatchesMs}ms\n`);

    const results: RequestResult[] = [];
    const startTime = Date.now();

    let requestsSent = 0;
    while (requestsSent < this.config.totalRequests) {
      const batchSize = Math.min(
        this.config.concurrentRequests,
        this.config.totalRequests - requestsSent
      );

      const batch = Array(batchSize)
        .fill(null)
        .map((_, i) => this.executeSearchRequest(requestsSent + i));

      const batchResults = await Promise.all(batch);
      results.push(...batchResults);

      requestsSent += batchSize;
      console.log(`   Progress: ${requestsSent}/${this.config.totalRequests} requests`);

      if (requestsSent < this.config.totalRequests) {
        await this.sleep(this.config.delayBetweenBatchesMs);
      }
    }

    const totalTimeMs = Date.now() - startTime;

    return this.analyzeResults(results, totalTimeMs);
  }

  /**
   * Execute a single search request
   */
  private async executeSearchRequest(requestId: number): Promise<RequestResult> {
    const startTime = Date.now();

    try {
      // Pick a random location
      const location = TEST_LOCATIONS[requestId % TEST_LOCATIONS.length];

      // Generate random date range (1-7 days from now, 1-7 day duration)
      const startDaysFromNow = 1 + Math.floor(Math.random() * 7);
      const durationDays = 1 + Math.floor(Math.random() * 7);

      const startDate = new Date();
      startDate.setDate(startDate.getDate() + startDaysFromNow);

      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + durationDays);

      // Random search radius (10-100km)
      const radiusKm = 10 + Math.floor(Math.random() * 90);

      const { data, error } = await this.supabase.rpc('get_available_cars', {
        p_start_date: startDate.toISOString(),
        p_end_date: endDate.toISOString(),
        p_lat: location.lat,
        p_lng: location.lng,
        p_limit: 50,
        p_offset: 0,
      });

      const latencyMs = Date.now() - startTime;

      if (error) {
        return {
          success: false,
          latencyMs,
          carsReturned: 0,
          errorCode: error.code || 'UNKNOWN',
          errorMessage: error.message,
        };
      }

      return {
        success: true,
        latencyMs,
        carsReturned: Array.isArray(data) ? data.length : 0,
      };
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      return {
        success: false,
        latencyMs,
        carsReturned: 0,
        errorCode: 'EXCEPTION',
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Analyze results and generate report
   */
  private analyzeResults(results: RequestResult[], totalTimeMs: number): LoadTestResult {
    const latencies = results.map((r) => r.latencyMs).sort((a, b) => a - b);
    const successResults = results.filter((r) => r.success);
    const failureResults = results.filter((r) => !r.success);

    // Calculate average cars returned
    const totalCars = successResults.reduce((sum, r) => sum + r.carsReturned, 0);
    const avgCarsReturned =
      successResults.length > 0 ? Math.round(totalCars / successResults.length) : 0;

    // Group errors
    const errorGroups = new Map<string, { count: number; message: string }>();
    failureResults.forEach((r) => {
      const key = r.errorCode || 'UNKNOWN';
      const existing = errorGroups.get(key);
      if (existing) {
        existing.count++;
      } else {
        errorGroups.set(key, { count: 1, message: r.errorMessage || 'Unknown error' });
      }
    });

    const p95Index = Math.floor(latencies.length * 0.95);

    const result: LoadTestResult = {
      totalRequests: results.length,
      successCount: successResults.length,
      failureCount: failureResults.length,
      averageLatencyMs: Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length),
      p95LatencyMs: latencies[p95Index] || 0,
      maxLatencyMs: Math.max(...latencies),
      minLatencyMs: Math.min(...latencies),
      requestsPerSecond: Math.round((results.length / totalTimeMs) * 1000 * 100) / 100,
      avgCarsReturned,
      errors: Array.from(errorGroups.entries()).map(([code, data]) => ({
        code,
        message: data.message,
        count: data.count,
      })),
    };

    this.printReport(result, totalTimeMs);

    return result;
  }

  /**
   * Print formatted report
   */
  private printReport(result: LoadTestResult, totalTimeMs: number): void {
    console.log('\n' + '='.repeat(60));
    console.log('                  CAR SEARCH LOAD TEST RESULTS');
    console.log('='.repeat(60));

    console.log('\n📊 SUMMARY');
    console.log(`   Total Requests:     ${result.totalRequests}`);
    console.log(`   Successful:         ${result.successCount} (${((result.successCount / result.totalRequests) * 100).toFixed(1)}%)`);
    console.log(`   Failed:             ${result.failureCount} (${((result.failureCount / result.totalRequests) * 100).toFixed(1)}%)`);
    console.log(`   Total Time:         ${(totalTimeMs / 1000).toFixed(2)}s`);
    console.log(`   Requests/Second:    ${result.requestsPerSecond}`);

    console.log('\n⏱️  LATENCY');
    console.log(`   Average:            ${result.averageLatencyMs}ms`);
    console.log(`   P95:                ${result.p95LatencyMs}ms`);
    console.log(`   Min:                ${result.minLatencyMs}ms`);
    console.log(`   Max:                ${result.maxLatencyMs}ms`);

    console.log('\n🚗 SEARCH RESULTS');
    console.log(`   Avg Cars Found:     ${result.avgCarsReturned}`);

    if (result.errors.length > 0) {
      console.log('\n❌ ERRORS');
      result.errors.forEach((e) => {
        console.log(`   ${e.code}: ${e.count}x - ${e.message.substring(0, 50)}...`);
      });
    }

    console.log('\n' + '='.repeat(60));

    // Verdict
    const successRate = (result.successCount / result.totalRequests) * 100;
    if (successRate >= 99) {
      console.log('✅ PASS: Success rate >= 99%');
    } else if (successRate >= 95) {
      console.log('⚠️  WARN: Success rate between 95-99%');
    } else {
      console.log('❌ FAIL: Success rate < 95%');
    }

    if (result.p95LatencyMs <= 500) {
      console.log('✅ PASS: P95 latency <= 500ms');
    } else if (result.p95LatencyMs <= 1000) {
      console.log('⚠️  WARN: P95 latency between 500ms-1s');
    } else {
      console.log('❌ FAIL: P95 latency > 1s');
    }

    console.log('='.repeat(60) + '\n');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Main execution
async function main() {
  const test = new CarSearchLoadTest({
    concurrentRequests: 20,
    totalRequests: 100,
    delayBetweenBatchesMs: 50,
  });

  try {
    const results = await test.run();

    // Exit with error code if test failed
    const successRate = (results.successCount / results.totalRequests) * 100;
    process.exit(successRate >= 95 ? 0 : 1);
  } catch (error) {
    console.error('Load test failed:', error);
    process.exit(1);
  }
}

main();
