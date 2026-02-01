/**
 * 🩺 Health Monitor Tool
 * 
 * Validates the System Health Check Edge Function.
 * Usage: pnpm tsx tools/monitor-health.ts
 */

import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function checkHealth() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  🩺 System Health Monitor                                ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  const functionUrl = process.env.SUPABASE_URL 
    ? `${process.env.SUPABASE_URL}/functions/v1/check-system-health`
    : 'http://localhost:54321/functions/v1/check-system-health'; // Default local

  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!anonKey) {
    console.error('❌ Missing SUPABASE_ANON_KEY in .env');
    process.exit(1);
  }

  console.log(`Checking Endpoint: ${functionUrl}...`);

  try {
    const start = performance.now();
    const response = await fetch(functionUrl, {
      headers: {
        'Authorization': `Bearer ${anonKey}`
      }
    });
    const latency = Math.round(performance.now() - start);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    console.log(`\n✅ Health Check Successful (${latency}ms)`);
    console.log(`   Status: ${data.status}`);
    console.log(`   Internal Latency: ${data.latency_ms}ms`);
    console.log('\n   Checks:');
    
    Object.entries(data.checks || {}).forEach(([service, status]) => {
      const icon = status === 'up' ? '✅' : (status === 'slow' ? '⚠️' : '❌');
      console.log(`   - ${service}: ${icon} ${status}`);
    });

    if (data.status !== 'healthy') {
      console.warn('\n⚠️ System is Degraded');
      process.exit(1); // Soft fail
    }

  } catch (error) {
    console.error('\n❌ Health Check Failed');
    console.error(error);
    process.exit(1);
  }
}

checkHealth();
