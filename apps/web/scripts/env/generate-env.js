#!/usr/bin/env node

/**
 * Generates public/env.json with runtime environment variables
 * This allows Angular to read config in the browser via window.__env
 */

const fs = require('fs');
const path = require('path');

// Detect if this is a production build
const isProduction = process.env.NODE_ENV === 'production' ||
  process.env.CI === 'true' ||
  process.env.GITHUB_ACTIONS === 'true';

// Load environment variables from root .env.local (single source of truth)
// Use absolute path to ensure it works regardless of cwd
// SKIP loading .env.local in production/CI to avoid dev values
const envPath = path.resolve(__dirname, '../../../.env.local');

if (!isProduction && fs.existsSync(envPath)) {
  console.log(`Loading environment from: ${envPath}`);
  const result = require('dotenv').config({ path: envPath });
  if (result.error) {
    console.error('❌ Error parsing .env.local:', result.error);
  } else {
    console.log(`✅ Loaded ${Object.keys(result.parsed || {}).length} variables from .env.local`);
  }
} else if (isProduction) {
  console.log('🚀 Production build detected, using process.env only (skipping .env.local)');
} else {
  console.log('ℹ️ .env.local not found, relying on process.env (CI/CD)');
}

/**
 * Sanitize URL - remove localhost URLs in production to prevent app crashes
 */
function sanitizeUrl(url, varName) {
  if (!url) return '';
  if (isProduction && (url.includes('localhost') || url.includes('127.0.0.1'))) {
    console.warn(`⚠️ WARNING: ${varName} contains localhost URL in production, removing: ${url}`);
    return '';
  }
  return url;
}

const envVars = {
  NG_APP_SUPABASE_URL: process.env.NG_APP_SUPABASE_URL || '',
  NG_APP_SUPABASE_ANON_KEY: process.env.NG_APP_SUPABASE_ANON_KEY || '',
  NG_APP_DEFAULT_CURRENCY: process.env.NG_APP_DEFAULT_CURRENCY || 'ARS',
  NG_APP_PAYMENTS_WEBHOOK_URL: sanitizeUrl(process.env.NG_APP_PAYMENTS_WEBHOOK_URL || '', 'NG_APP_PAYMENTS_WEBHOOK_URL'),
  NG_APP_MAPBOX_ACCESS_TOKEN: process.env.NG_APP_MAPBOX_ACCESS_TOKEN || '',
  NG_APP_CAR_LOCATIONS_EDGE_FUNCTION: process.env.NG_APP_CAR_LOCATIONS_EDGE_FUNCTION || '',
  NG_APP_MERCADOPAGO_PUBLIC_KEY:
    process.env.NG_APP_MERCADOPAGO_PUBLIC_KEY ||
    process.env.MERCADOPAGO_PUBLIC_KEY ||
    '',
  NG_APP_CLOUDFLARE_WORKER_URL: sanitizeUrl(
    process.env.NG_APP_CLOUDFLARE_WORKER_URL || 'https://autorent-ai-car-generator.marques-eduardo95466020.workers.dev',
    'NG_APP_CLOUDFLARE_WORKER_URL'
  ),
  // Gemini Text Worker
  NG_APP_GEMINI_TEXT_WORKER_URL: sanitizeUrl(process.env.NG_APP_GEMINI_TEXT_WORKER_URL || '', 'NG_APP_GEMINI_TEXT_WORKER_URL'),
  // TikTok
  NG_APP_TIKTOK_CLIENT_ID: process.env.NG_APP_TIKTOK_CLIENT_ID || '',
  // Google Calendar
  NG_APP_GOOGLE_CALENDAR_ID: process.env.NG_APP_GOOGLE_CALENDAR_ID || '',
  NG_APP_GOOGLE_CALENDAR_API_KEY: process.env.NG_APP_GOOGLE_CALENDAR_API_KEY || '',
  NG_APP_GOOGLE_CALENDAR_CLIENT_ID: process.env.NG_APP_GOOGLE_CALENDAR_CLIENT_ID || '',
  // PayPal
  NG_APP_PAYPAL_CLIENT_ID: process.env.NG_APP_PAYPAL_CLIENT_ID || '',
  // Sentry
  NG_APP_SENTRY_DSN: process.env.NG_APP_SENTRY_DSN || '',
  NG_APP_SENTRY_ENVIRONMENT: process.env.NG_APP_SENTRY_ENVIRONMENT || (isProduction ? 'production' : 'development')
};

// Use compact JSON to avoid line breaks in long tokens
const envJsContent = JSON.stringify(envVars);


const outputPath = path.join(__dirname, '../../public/env.json');
fs.writeFileSync(outputPath, envJsContent);

console.log('✅ Generated public/env.json with environment configuration');
console.log('Environment variables:');
Object.entries(envVars).forEach(([key, value]) => {
  const maskedValue = key.includes('KEY') || key.includes('TOKEN')
    ? value ? `${value.substring(0, 10)}...` : '(empty)'
    : value || '(empty)';
  console.log(`  - ${key}: ${maskedValue}`);
});
