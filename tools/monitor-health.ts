import { spawn } from 'child_process';

/**
 * Health Monitor Script
 * 
 * Verifies system health by calling the check-system-health Edge Function.
 * Designed to be run by CI/CD pipelines or cron jobs.
 */

const EDGE_FUNCTION_URL = process.env.SUPABASE_URL 
  ? `${process.env.SUPABASE_URL}/functions/v1/check-system-health`
  : 'http://localhost:54321/functions/v1/check-system-health'; // Local default

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkHealth() {
  console.log('🏥 Starting System Health Check...');
  console.log(`Target: ${EDGE_FUNCTION_URL}`);

  if (!SERVICE_ROLE_KEY) {
    console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not set. Check might fail if auth required.');
  }

  try {
    const start = performance.now();
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      }
    });

    const duration = Math.round(performance.now() - start);
    const status = response.status;
    
    let data;
    try {
      data = await response.json();
    } catch {
      data = await response.text();
    }

    console.log('----------------------------------------');
    console.log(`HTTP Status: ${status}`);
    console.log(`Duration: ${duration}ms`);
    console.log('Response:', JSON.stringify(data, null, 2));
    console.log('----------------------------------------');

    if (status === 200 && data.status === 'healthy') {
      console.log('✅ SYSTEM HEALTHY');
      process.exit(0);
    } else if (status === 200 && data.status === 'degraded') {
      console.warn('⚠️ SYSTEM DEGRADED');
      // Non-zero exit code for degraded? Depends on strictness. 
      // Let's pass but warn.
      process.exit(0); 
    } else {
      console.error('❌ SYSTEM UNHEALTHY');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ CHECK FAILED (Network Error)');
    console.error(error);
    process.exit(1);
  }
}

checkHealth();