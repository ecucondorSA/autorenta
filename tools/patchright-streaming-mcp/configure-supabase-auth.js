/**
 * Configure Supabase Authentication Settings
 * Uses Patchright with persistent Chrome profile
 */

import { chromium } from 'patchright';

const SUPABASE_PROJECT_ID = 'aceacpaockyxgogxsfyc';
const SUPABASE_AUTH_URL = `https://supabase.com/dashboard/project/${SUPABASE_PROJECT_ID}/auth/providers`;
const SUPABASE_URL_CONFIG = `https://supabase.com/dashboard/project/${SUPABASE_PROJECT_ID}/auth/url-configuration`;

// Site URLs to configure
const SITE_URL = 'https://autorentar.com';
const REDIRECT_URLS = [
  'https://autorentar.com/**',
  'https://www.autorentar.com/**',
  'https://autorenta.com/**',
  'https://www.autorenta.com/**',
  'https://autorenta-web.pages.dev/**',
  'https://*.autorentar.pages.dev/**',
  'http://localhost:4200/**',
  'http://127.0.0.1:4200/**',
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('🚀 Starting Supabase Auth Configuration...');

  // Use persistent profile so user is already logged in
  const userDataDir = '/home/edu/.patchright-profile';

  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    channel: 'chrome',
    viewport: { width: 1400, height: 900 },
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-first-run',
    ],
  });

  const page = browser.pages()[0] || await browser.newPage();

  try {
    // Step 1: Navigate to URL Configuration
    console.log('\n📍 Step 1: Configuring Site URL and Redirect URLs...');
    await page.goto(SUPABASE_URL_CONFIG, { waitUntil: 'networkidle' });
    await sleep(2000);

    // Take screenshot
    await page.screenshot({ path: '/tmp/supabase-url-config.png' });
    console.log('📸 Screenshot saved: /tmp/supabase-url-config.png');

    // Check if we need to login
    const loginButton = await page.$('button:has-text("Sign in")');
    if (loginButton) {
      console.log('⚠️ Not logged in! Please login manually in the browser window.');
      console.log('   After logging in, press Enter to continue...');
      await new Promise(resolve => {
        process.stdin.once('data', resolve);
      });
      await page.goto(SUPABASE_URL_CONFIG, { waitUntil: 'networkidle' });
      await sleep(2000);
    }

    // Step 2: Navigate to Auth Providers
    console.log('\n📍 Step 2: Navigating to Auth Providers...');
    await page.goto(SUPABASE_AUTH_URL, { waitUntil: 'networkidle' });
    await sleep(2000);

    await page.screenshot({ path: '/tmp/supabase-auth-providers.png' });
    console.log('📸 Screenshot saved: /tmp/supabase-auth-providers.png');

    // Print current page content for debugging
    const title = await page.title();
    console.log(`📄 Page title: ${title}`);

    console.log('\n✅ Browser is open. Configure the following manually:');
    console.log('\n1. URL Configuration (/auth/url-configuration):');
    console.log(`   - Site URL: ${SITE_URL}`);
    console.log('   - Redirect URLs:');
    REDIRECT_URLS.forEach(url => console.log(`     • ${url}`));

    console.log('\n2. Auth Providers (/auth/providers):');
    console.log('   - Email: Enable (confirm email: optional)');
    console.log('   - Phone: Enable if needed');
    console.log('   - Google: Configure with OAuth credentials');
    console.log('   - Apple: Configure if needed');

    console.log('\n3. Email Templates (/auth/templates):');
    console.log('   - Customize confirmation email');
    console.log('   - Customize password reset email');

    console.log('\n⏳ Keeping browser open for manual configuration...');
    console.log('   Press Ctrl+C when done.\n');

    // Keep browser open
    await new Promise(() => {});

  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: '/tmp/supabase-error.png' });
  }
}

main().catch(console.error);
