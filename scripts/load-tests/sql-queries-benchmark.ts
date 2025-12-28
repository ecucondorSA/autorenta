/**
 * SQL Queries Benchmark
 *
 * Benchmarks critical SQL queries/RPCs to identify performance bottlenecks.
 *
 * Usage:
 *   SUPABASE_URL="..." SUPABASE_SERVICE_KEY="..." npx tsx scripts/load-tests/sql-queries-benchmark.ts
 *
 * Requirements:
 *   - SUPABASE_URL and SUPABASE_SERVICE_KEY env vars
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pisqjmoklivzpwufhscx.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

interface BenchmarkResult {
  queryName: string;
  iterations: number;
  avgTimeMs: number;
  minTimeMs: number;
  maxTimeMs: number;
  p50TimeMs: number;
  p95TimeMs: number;
  p99TimeMs: number;
  rowsReturned: number;
  errorCount: number;
}

interface QueryConfig {
  name: string;
  description: string;
  execute: (supabase: SupabaseClient) => Promise<{ data: unknown; error: unknown }>;
  iterations?: number;
}

// Critical queries to benchmark
const QUERIES: QueryConfig[] = [
  {
    name: 'get_available_cars',
    description: 'Main marketplace search with geo filter',
    execute: async (supabase) => {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      return supabase.rpc('get_available_cars', {
        p_start_date: tomorrow.toISOString(),
        p_end_date: nextWeek.toISOString(),
        p_lat: -34.6037, // Buenos Aires
        p_lng: -58.3816,
        p_limit: 50,
        p_offset: 0,
      });
    },
  },
  {
    name: 'get_car_details',
    description: 'Single car details with photos',
    execute: async (supabase) => {
      // Get any published car
      const { data: cars } = await supabase
        .from('cars')
        .select('id')
        .eq('status', 'published')
        .limit(1);

      if (!cars || cars.length === 0) {
        return { data: [], error: null };
      }

      return supabase
        .from('cars')
        .select(
          `
          *,
          photos:car_photos(*),
          owner:profiles!cars_user_id_fkey(id, full_name, avatar_url, rating)
        `,
        )
        .eq('id', cars[0].id)
        .single();
    },
  },
  {
    name: 'get_user_bookings',
    description: 'User booking list with car details',
    execute: async (supabase) => {
      // Get any user with bookings
      const { data: bookings } = await supabase.from('bookings').select('renter_id').limit(1);

      if (!bookings || bookings.length === 0) {
        return { data: [], error: null };
      }

      return supabase
        .from('bookings')
        .select(
          `
          *,
          car:cars(id, brand, model, year)
        `,
        )
        .eq('renter_id', bookings[0].renter_id)
        .order('created_at', { ascending: false })
        .limit(20);
    },
  },
  {
    name: 'wallet_get_balance',
    description: 'Calculate user wallet balance',
    execute: async (supabase) => {
      // Get any user with wallet transactions
      const { data: txns } = await supabase.from('wallet_transactions').select('user_id').limit(1);

      if (!txns || txns.length === 0) {
        return { data: { balance: 0 }, error: null };
      }

      return supabase.rpc('wallet_get_balance', {
        p_user_id: txns[0].user_id,
      });
    },
  },
  {
    name: 'get_owner_earnings',
    description: 'Owner earnings dashboard',
    execute: async (supabase) => {
      // Get any owner
      const { data: cars } = await supabase.from('cars').select('user_id').limit(1);

      if (!cars || cars.length === 0) {
        return { data: [], error: null };
      }

      return supabase.rpc('get_owner_earnings_summary', {
        p_owner_id: cars[0].user_id,
      });
    },
  },
  {
    name: 'fx_rates_latest',
    description: 'FX rate lookup (table query)',
    execute: async (supabase) => {
      return supabase
        .from('fx_rates')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);
    },
  },
  {
    name: 'calculate_user_bonus_malus',
    description: 'User bonus-malus calculation',
    execute: async (supabase) => {
      // Get any user with completed bookings
      const { data: users } = await supabase.from('profiles').select('id').limit(1);

      if (!users || users.length === 0) {
        return { data: null, error: null };
      }

      return supabase.rpc('calculate_user_bonus_malus', {
        p_user_id: users[0].id,
      });
    },
  },
  {
    name: 'notifications_unread_count',
    description: 'Count unread notifications',
    execute: async (supabase) => {
      const { data: users } = await supabase.from('profiles').select('id').limit(1);

      if (!users || users.length === 0) {
        return { data: 0, error: null };
      }

      return supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', users[0].id)
        .eq('is_read', false);
    },
  },
  {
    name: 'admin_verification_stats',
    description: 'Admin verification stats',
    execute: async (supabase) => {
      return supabase.rpc('admin_get_verification_stats');
    },
  },
  {
    name: 'car_availability_check',
    description: 'Check car availability for dates',
    execute: async (supabase) => {
      const { data: cars } = await supabase
        .from('cars')
        .select('id')
        .eq('status', 'published')
        .limit(1);

      if (!cars || cars.length === 0) {
        return { data: true, error: null };
      }

      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      return supabase.rpc('check_car_availability', {
        p_car_id: cars[0].id,
        p_start_date: tomorrow.toISOString(),
        p_end_date: nextWeek.toISOString(),
      });
    },
  },
];

async function runBenchmark(
  supabase: SupabaseClient,
  config: QueryConfig,
  iterations = 10,
): Promise<BenchmarkResult> {
  console.log(`\n📊 Benchmarking: ${config.name}`);
  console.log(`   ${config.description}`);

  const times: number[] = [];
  let rowsReturned = 0;
  let errorCount = 0;

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    try {
      const result = await config.execute(supabase);
      const elapsed = performance.now() - start;
      times.push(elapsed);

      if (result.error) {
        errorCount++;
        console.log(`   ⚠️ Iteration ${i + 1}: Error - ${JSON.stringify(result.error)}`);
      } else {
        // Count rows
        if (Array.isArray(result.data)) {
          rowsReturned = result.data.length;
        } else if (result.data) {
          rowsReturned = 1;
        }
      }
    } catch (error) {
      const elapsed = performance.now() - start;
      times.push(elapsed);
      errorCount++;
      console.log(`   ❌ Iteration ${i + 1}: Exception - ${error}`);
    }

    // Progress indicator
    process.stdout.write(`   Progress: ${i + 1}/${iterations}\r`);
  }

  // Calculate statistics
  times.sort((a, b) => a - b);
  const sum = times.reduce((a, b) => a + b, 0);

  const result: BenchmarkResult = {
    queryName: config.name,
    iterations,
    avgTimeMs: Math.round(sum / times.length),
    minTimeMs: Math.round(times[0] || 0),
    maxTimeMs: Math.round(times[times.length - 1] || 0),
    p50TimeMs: Math.round(times[Math.floor(times.length * 0.5)] || 0),
    p95TimeMs: Math.round(times[Math.floor(times.length * 0.95)] || 0),
    p99TimeMs: Math.round(times[Math.floor(times.length * 0.99)] || 0),
    rowsReturned,
    errorCount,
  };

  return result;
}

function printResults(results: BenchmarkResult[]): void {
  console.log('\n' + '='.repeat(100));
  console.log('📈 SQL BENCHMARK RESULTS');
  console.log('='.repeat(100));

  // Table header
  console.log(
    '\n' +
      'Query'.padEnd(30) +
      'Avg'.padStart(8) +
      'Min'.padStart(8) +
      'Max'.padStart(8) +
      'P50'.padStart(8) +
      'P95'.padStart(8) +
      'P99'.padStart(8) +
      'Rows'.padStart(8) +
      'Errors'.padStart(8),
  );
  console.log('-'.repeat(100));

  for (const r of results) {
    const status = r.errorCount > 0 ? '⚠️ ' : r.p95TimeMs > 500 ? '🐢 ' : '✅ ';
    console.log(
      status +
        r.queryName.padEnd(28) +
        `${r.avgTimeMs}ms`.padStart(8) +
        `${r.minTimeMs}ms`.padStart(8) +
        `${r.maxTimeMs}ms`.padStart(8) +
        `${r.p50TimeMs}ms`.padStart(8) +
        `${r.p95TimeMs}ms`.padStart(8) +
        `${r.p99TimeMs}ms`.padStart(8) +
        `${r.rowsReturned}`.padStart(8) +
        `${r.errorCount}`.padStart(8),
    );
  }

  console.log('-'.repeat(100));

  // Warnings
  console.log('\n📋 ANALYSIS:');

  const slow = results.filter((r) => r.p95TimeMs > 500);
  if (slow.length > 0) {
    console.log('\n🐢 SLOW QUERIES (P95 > 500ms):');
    for (const r of slow) {
      console.log(`   - ${r.queryName}: P95=${r.p95TimeMs}ms (consider optimization)`);
    }
  }

  const errors = results.filter((r) => r.errorCount > 0);
  if (errors.length > 0) {
    console.log('\n⚠️ QUERIES WITH ERRORS:');
    for (const r of errors) {
      console.log(`   - ${r.queryName}: ${r.errorCount} errors in ${r.iterations} iterations`);
    }
  }

  const fast = results.filter((r) => r.p95TimeMs <= 100 && r.errorCount === 0);
  if (fast.length > 0) {
    console.log('\n⚡ FAST QUERIES (P95 <= 100ms):');
    for (const r of fast) {
      console.log(`   - ${r.queryName}: P95=${r.p95TimeMs}ms`);
    }
  }

  console.log('\n' + '='.repeat(100));
}

async function main(): Promise<void> {
  console.log('🔧 AutoRenta SQL Queries Benchmark');
  console.log(`📍 Target: ${SUPABASE_URL}`);

  if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ SUPABASE_SERVICE_KEY is required');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const results: BenchmarkResult[] = [];
  const iterations = 10;

  for (const query of QUERIES) {
    try {
      const result = await runBenchmark(supabase, query, query.iterations || iterations);
      results.push(result);
    } catch (error) {
      console.log(`\n❌ Failed to benchmark ${query.name}: ${error}`);
      results.push({
        queryName: query.name,
        iterations: 0,
        avgTimeMs: 0,
        minTimeMs: 0,
        maxTimeMs: 0,
        p50TimeMs: 0,
        p95TimeMs: 0,
        p99TimeMs: 0,
        rowsReturned: 0,
        errorCount: iterations,
      });
    }
  }

  printResults(results);

  // Exit with error if any critical queries are too slow
  const criticalSlow = results.filter(
    (r) =>
      r.p95TimeMs > 1000 && ['get_available_cars', 'get_car_details', 'wallet_get_balance'].includes(r.queryName),
  );

  if (criticalSlow.length > 0) {
    console.log('\n❌ CRITICAL: Some core queries exceed 1000ms P95');
    process.exit(1);
  }

  console.log('\n✅ Benchmark complete');
  process.exit(0);
}

main().catch(console.error);
