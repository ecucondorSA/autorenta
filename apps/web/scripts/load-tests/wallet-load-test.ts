#!/usr/bin/env npx ts-node
/**
 * Wallet Load Test Script
 *
 * Tests concurrent wallet operations to verify:
 * - Race condition handling with FOR UPDATE NOWAIT
 * - Rate limiting behavior
 * - Performance under load
 *
 * Usage:
 *   npx ts-node apps/web/scripts/load-tests/wallet-load-test.ts
 *
 * Environment:
 *   SUPABASE_URL - Supabase project URL
 *   SUPABASE_SERVICE_KEY - Service role key for testing
 *   TEST_USER_ID - User ID to test with (optional, creates test user if not provided)
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
  rateLimit429Count: number;
  lockConflictCount: number;
  averageLatencyMs: number;
  p95LatencyMs: number;
  maxLatencyMs: number;
  minLatencyMs: number;
  requestsPerSecond: number;
  errors: { code: string; message: string; count: number }[];
}

interface RequestResult {
  success: boolean;
  latencyMs: number;
  errorCode?: string;
  errorMessage?: string;
}

class WalletLoadTest {
  private supabase: SupabaseClient;
  private testUserId: string | null = null;
  private config: LoadTestConfig;

  constructor(config: LoadTestConfig = {
    concurrentRequests: 10,
    totalRequests: 100,
    delayBetweenBatchesMs: 100,
  }) {
    this.config = config;
    const supabaseUrl = process.env['SUPABASE_URL'] || '';
    const supabaseKey = process.env['SUPABASE_SERVICE_KEY'] || '';

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables required');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.testUserId = process.env['TEST_USER_ID'] || null;
  }

  /**
   * Run the load test
   */
  async run(): Promise<LoadTestResult> {
    console.log('\n🚀 Starting Wallet Load Test');
    console.log(`   Config: ${this.config.totalRequests} total requests`);
    console.log(`   Concurrency: ${this.config.concurrentRequests} simultaneous`);
    console.log(`   Delay between batches: ${this.config.delayBetweenBatchesMs}ms\n`);

    // Setup: ensure test user has balance
    await this.setupTestUser();

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
        .map((_, i) => this.executeLockRequest(requestsSent + i));

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
   * Execute a single lock request
   */
  private async executeLockRequest(requestId: number): Promise<RequestResult> {
    const startTime = Date.now();

    try {
      // Generate unique reference ID for each request (UUID v4)
      const referenceId = crypto.randomUUID();
      const amountCents = Math.floor(1000 + Math.random() * 1000); // 10-20 USD in cents

      const { data, error } = await this.supabase.rpc('wallet_lock_funds', {
        p_user_id: this.testUserId,
        p_amount: amountCents,
        p_reference_type: 'load_test',
        p_reference_id: referenceId,
      });

      const latencyMs = Date.now() - startTime;

      if (error) {
        return {
          success: false,
          latencyMs,
          errorCode: error.code || 'UNKNOWN',
          errorMessage: error.message,
        };
      }

      // Immediately unlock to clean up
      await this.supabase.rpc('wallet_unlock_funds', {
        p_user_id: this.testUserId,
        p_reference_id: referenceId,
      });

      return {
        success: true,
        latencyMs,
      };
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      return {
        success: false,
        latencyMs,
        errorCode: 'EXCEPTION',
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Ensure test user exists and has balance
   */
  private async setupTestUser(): Promise<void> {
    if (!this.testUserId) {
      // Get any user with a wallet for testing (balance in cents)
      const { data: wallets } = await this.supabase
        .from('user_wallets')
        .select('user_id, available_balance_cents')
        .gt('available_balance_cents', 100000) // $1000 in cents
        .limit(1);

      if (wallets && wallets.length > 0) {
        this.testUserId = wallets[0].user_id;
        const balanceUsd = wallets[0].available_balance_cents / 100;
        console.log(`   Using existing user: ${this.testUserId}`);
        console.log(`   Available balance: $${balanceUsd.toFixed(2)}\n`);
      } else {
        throw new Error('No user with sufficient balance found for testing');
      }
    }
  }

  /**
   * Analyze results and generate report
   */
  private analyzeResults(results: RequestResult[], totalTimeMs: number): LoadTestResult {
    const latencies = results.map((r) => r.latencyMs).sort((a, b) => a - b);
    const successResults = results.filter((r) => r.success);
    const failureResults = results.filter((r) => !r.success);

    // Count specific error types
    const rateLimit429Count = failureResults.filter(
      (r) => r.errorCode === 'RATE_LIMITED' || r.errorMessage?.includes('429')
    ).length;

    const lockConflictCount = failureResults.filter(
      (r) =>
        r.errorMessage?.includes('NOWAIT') ||
        r.errorMessage?.includes('could not obtain lock') ||
        r.errorCode === '55P03'
    ).length;

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
      rateLimit429Count,
      lockConflictCount,
      averageLatencyMs: Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length),
      p95LatencyMs: latencies[p95Index] || 0,
      maxLatencyMs: Math.max(...latencies),
      minLatencyMs: Math.min(...latencies),
      requestsPerSecond: Math.round((results.length / totalTimeMs) * 1000 * 100) / 100,
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
    console.log('                    LOAD TEST RESULTS');
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

    console.log('\n🔒 CONCURRENCY HANDLING');
    console.log(`   Rate Limited (429): ${result.rateLimit429Count}`);
    console.log(`   Lock Conflicts:     ${result.lockConflictCount}`);

    if (result.errors.length > 0) {
      console.log('\n❌ ERRORS');
      result.errors.forEach((e) => {
        console.log(`   ${e.code}: ${e.count}x - ${e.message.substring(0, 50)}...`);
      });
    }

    console.log('\n' + '='.repeat(60));

    // Verdict
    const successRate = (result.successCount / result.totalRequests) * 100;
    if (successRate >= 95) {
      console.log('✅ PASS: Success rate >= 95%');
    } else if (successRate >= 80) {
      console.log('⚠️  WARN: Success rate between 80-95%');
    } else {
      console.log('❌ FAIL: Success rate < 80%');
    }

    if (result.p95LatencyMs <= 1000) {
      console.log('✅ PASS: P95 latency <= 1s');
    } else if (result.p95LatencyMs <= 3000) {
      console.log('⚠️  WARN: P95 latency between 1-3s');
    } else {
      console.log('❌ FAIL: P95 latency > 3s');
    }

    console.log('='.repeat(60) + '\n');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Main execution
async function main() {
  const test = new WalletLoadTest({
    concurrentRequests: 10,
    totalRequests: 50,
    delayBetweenBatchesMs: 200,
  });

  try {
    const results = await test.run();

    // Exit with error code if test failed
    const successRate = (results.successCount / results.totalRequests) * 100;
    process.exit(successRate >= 80 ? 0 : 1);
  } catch (error) {
    console.error('Load test failed:', error);
    process.exit(1);
  }
}

main();
