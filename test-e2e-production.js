// ╔══════════════════════════════════════════════════════════════════════╗
// ║  🎭 PLAYWRIGHT E2E TESTS - AUTORENTA PRODUCTION PRE-CHECK            ║
// ║  Complete flow testing with console logs, errors, and screenshots    ║
// ╚══════════════════════════════════════════════════════════════════════╝

const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:4200';
const TEST_USER = {
  email: 'test@autorenta.com',
  password: 'Test123456!'
};

const RESULTS_DIR = path.join(__dirname, 'playwright-results');

// Ensure results directory exists
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

// Test results storage
const testResults = {
  startTime: new Date().toISOString(),
  tests: [],
  consoleLogs: [],
  errors: [],
  warnings: [],
  networkRequests: [],
  websocketMessages: [],
  screenshots: []
};

// Utility functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const logEntry = { timestamp, message, type };
  
  console.log(`[${type.toUpperCase()}] ${message}`);
  
  if (type === 'error') {
    testResults.errors.push(logEntry);
  } else if (type === 'warning') {
    testResults.warnings.push(logEntry);
  }
  
  testResults.consoleLogs.push(logEntry);
}

async function takeScreenshot(page, name) {
  const filename = `${Date.now()}-${name}.png`;
  const filepath = path.join(RESULTS_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  testResults.screenshots.push({ name, filepath, timestamp: new Date().toISOString() });
  log(`Screenshot saved: ${filename}`);
}

async function runTest(name, testFn) {
  const startTime = Date.now();
  log(`\n========================================`);
  log(`Starting test: ${name}`);
  log(`========================================`);
  
  const result = {
    name,
    startTime: new Date().toISOString(),
    status: 'running'
  };
  
  try {
    await testFn();
    result.status = 'passed';
    result.duration = Date.now() - startTime;
    log(`✅ Test passed: ${name} (${result.duration}ms)`, 'success');
  } catch (error) {
    result.status = 'failed';
    result.duration = Date.now() - startTime;
    result.error = error.message;
    result.stack = error.stack;
    log(`❌ Test failed: ${name}`, 'error');
    log(`Error: ${error.message}`, 'error');
  }
  
  testResults.tests.push(result);
  return result.status === 'passed';
}

async function main() {
  log('🎭 Starting Playwright E2E Tests for Autorenta');
  log(`Base URL: ${BASE_URL}`);
  
  // Launch browser
  const browser = await chromium.launch({
    headless: false, // Set to true for CI
    slowMo: 100 // Slow down for visibility
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: RESULTS_DIR,
      size: { width: 1920, height: 1080 }
    }
  });
  
  const page = await context.newPage();
  
  // ═══════════════════════════════════════════════════════════════
  // SETUP: Console and Network Monitoring
  // ═══════════════════════════════════════════════════════════════
  
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    
    // Check for WebSocket status messages
    if (text.includes('Exchange rates channel status')) {
      log(`🔴 REALTIME: ${text}`, 'info');
      testResults.websocketMessages.push({ type: 'exchange_rates', message: text, timestamp: new Date().toISOString() });
    } else if (text.includes('Demand channel status')) {
      log(`📈 REALTIME: ${text}`, 'info');
      testResults.websocketMessages.push({ type: 'demand', message: text, timestamp: new Date().toISOString() });
    } else if (text.includes('Events channel status')) {
      log(`🎉 REALTIME: ${text}`, 'info');
      testResults.websocketMessages.push({ type: 'events', message: text, timestamp: new Date().toISOString() });
    } else if (text.includes('Filtered') && text.includes('unavailable cars')) {
      log(`🚗 AVAILABILITY: ${text}`, 'info');
    }
    
    // Log errors and warnings
    if (type === 'error') {
      log(`Browser Error: ${text}`, 'error');
    } else if (type === 'warning') {
      log(`Browser Warning: ${text}`, 'warning');
    }
  });
  
  page.on('pageerror', error => {
    log(`Page Error: ${error.message}`, 'error');
  });
  
  page.on('requestfailed', request => {
    log(`Failed Request: ${request.url()}`, 'error');
    testResults.networkRequests.push({
      url: request.url(),
      method: request.method(),
      status: 'failed',
      timestamp: new Date().toISOString()
    });
  });
  
  page.on('response', response => {
    const url = response.url();
    const status = response.status();
    
    // Track important requests
    if (url.includes('supabase') || url.includes('mercadopago') || url.includes('binance')) {
      testResults.networkRequests.push({
        url,
        method: response.request().method(),
        status,
        timestamp: new Date().toISOString()
      });
      
      if (status >= 400) {
        log(`Failed Response: ${status} - ${url}`, 'error');
      }
    }
  });
  
  // ═══════════════════════════════════════════════════════════════
  // TEST 1: Homepage Load
  // ═══════════════════════════════════════════════════════════════
  
  await runTest('Homepage Load', async () => {
    log('Navigating to homepage...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await takeScreenshot(page, 'homepage');
    
    // Check for critical elements
    await page.waitForSelector('body', { timeout: 5000 });
    log('Homepage loaded successfully');
  });
  
  // ═══════════════════════════════════════════════════════════════
  // TEST 2: Navigation Menu
  // ═══════════════════════════════════════════════════════════════
  
  await runTest('Navigation Menu', async () => {
    log('Testing navigation menu...');
    
    // Check if navigation exists
    const nav = await page.$('nav, header');
    if (!nav) {
      throw new Error('Navigation not found');
    }
    
    log('Navigation menu found');
    await takeScreenshot(page, 'navigation');
  });
  
  // ═══════════════════════════════════════════════════════════════
  // TEST 3: Search Page with Dynamic Pricing
  // ═══════════════════════════════════════════════════════════════
  
  await runTest('Search Page - Dynamic Pricing', async () => {
    log('Navigating to search page...');
    await page.goto(`${BASE_URL}/search`, { waitUntil: 'networkidle' });
    
    // Wait for cars to load
    log('Waiting for car listings...');
    await page.waitForTimeout(3000); // Give time for dynamic pricing to load
    
    await takeScreenshot(page, 'search-page');
    
    // Check for car cards
    const carCards = await page.$$('app-car-card, .car-card');
    log(`Found ${carCards.length} car cards`);
    
    if (carCards.length === 0) {
      throw new Error('No car cards found on search page');
    }
    
    // Check for price elements (should have dynamic pricing)
    const priceElements = await page.$$('[class*="price"], .price');
    log(`Found ${priceElements.length} price elements`);
    
    // Check console for WebSocket subscriptions (wait up to 10 seconds)
    log('Waiting for WebSocket subscriptions...');
    await page.waitForTimeout(10000);
    
    // Verify WebSocket messages were received
    const wsMessages = testResults.websocketMessages;
    if (wsMessages.length === 0) {
      log('⚠️  No WebSocket messages detected yet', 'warning');
    } else {
      log(`✅ WebSocket active: ${wsMessages.length} messages received`);
      wsMessages.forEach(msg => log(`  - ${msg.type}: ${msg.message}`));
    }
  });
  
  // ═══════════════════════════════════════════════════════════════
  // TEST 4: Search with Date Filters (Availability Check)
  // ═══════════════════════════════════════════════════════════════
  
  await runTest('Search - Availability Filtering', async () => {
    log('Testing availability filtering with dates...');
    
    // Try to find date pickers
    const dateInputs = await page.$$('input[type="date"], input[placeholder*="fecha"], input[placeholder*="date"]');
    
    if (dateInputs.length >= 2) {
      log('Found date inputs, filling them...');
      
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      const startDate = tomorrow.toISOString().split('T')[0];
      const endDate = nextWeek.toISOString().split('T')[0];
      
      await dateInputs[0].fill(startDate);
      await dateInputs[1].fill(endDate);
      
      log(`Dates set: ${startDate} to ${endDate}`);
      
      // Submit search
      const searchButton = await page.$('button[type="submit"], button:has-text("Buscar")');
      if (searchButton) {
        await searchButton.click();
        await page.waitForTimeout(3000);
        
        await takeScreenshot(page, 'search-with-dates');
        
        // Check console for availability filtering message
        await page.waitForTimeout(2000);
        log('Availability filtering should have run');
      }
    } else {
      log('Date inputs not found on page', 'warning');
    }
  });
  
  // ═══════════════════════════════════════════════════════════════
  // TEST 5: Car Detail Page
  // ═══════════════════════════════════════════════════════════════
  
  await runTest('Car Detail Page', async () => {
    log('Clicking on first car...');
    
    // Go back to search
    await page.goto(`${BASE_URL}/search`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Find and click first car
    const firstCar = await page.$('app-car-card, .car-card, [routerlink*="/car/"]');
    
    if (firstCar) {
      await firstCar.click();
      await page.waitForTimeout(3000);
      
      await takeScreenshot(page, 'car-detail');
      log('Car detail page loaded');
    } else {
      throw new Error('Could not find any car to click');
    }
  });
  
  // ═══════════════════════════════════════════════════════════════
  // TEST 6: Login Flow (if not logged in)
  // ═══════════════════════════════════════════════════════════════
  
  await runTest('Login Flow', async () => {
    log('Navigating to login page...');
    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    await takeScreenshot(page, 'login-page');
    
    // Check if already logged in
    const loginForm = await page.$('form');
    
    if (loginForm) {
      log('Login form found, attempting login...');
      
      // Fill login form
      const emailInput = await page.$('input[type="email"], input[name="email"]');
      const passwordInput = await page.$('input[type="password"]');
      
      if (emailInput && passwordInput) {
        await emailInput.fill(TEST_USER.email);
        await passwordInput.fill(TEST_USER.password);
        
        const loginButton = await page.$('button[type="submit"]');
        if (loginButton) {
          await loginButton.click();
          await page.waitForTimeout(3000);
          
          await takeScreenshot(page, 'after-login');
          log('Login attempted');
        }
      } else {
        log('Login inputs not found', 'warning');
      }
    } else {
      log('Already logged in or login form not found');
    }
  });
  
  // ═══════════════════════════════════════════════════════════════
  // TEST 7: Booking Flow (Critical)
  // ═══════════════════════════════════════════════════════════════
  
  await runTest('Booking Flow - Payment Page', async () => {
    log('Testing booking/payment flow...');
    
    // Try to navigate to a car detail and start booking
    await page.goto(`${BASE_URL}/search`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    const firstCar = await page.$('[routerlink*="/car/"]');
    if (firstCar) {
      await firstCar.click();
      await page.waitForTimeout(2000);
      
      // Look for "Reservar" or "Book" button
      const bookButton = await page.$('button:has-text("Reservar"), button:has-text("Book"), button:has-text("Continuar")');
      
      if (bookButton) {
        log('Found booking button, clicking...');
        await bookButton.click();
        await page.waitForTimeout(3000);
        
        await takeScreenshot(page, 'booking-page');
        
        // Check if payment page loaded
        const url = page.url();
        log(`Current URL: ${url}`);
        
        if (url.includes('payment') || url.includes('booking')) {
          log('✅ Reached payment/booking page');
          
          // Check for card form (MercadoPago)
          await page.waitForTimeout(2000);
          const cardForm = await page.$('#form-checkout, [id*="mercadopago"]');
          
          if (cardForm) {
            log('✅ Payment form (MercadoPago) found');
          } else {
            log('⚠️  Payment form not found', 'warning');
          }
        } else {
          log('Did not reach payment page', 'warning');
        }
      } else {
        log('Booking button not found', 'warning');
      }
    }
  });
  
  // ═══════════════════════════════════════════════════════════════
  // TEST 8: Profile/My Bookings
  // ═══════════════════════════════════════════════════════════════
  
  await runTest('My Bookings Page', async () => {
    log('Navigating to My Bookings...');
    
    const possibleUrls = [
      `${BASE_URL}/bookings/my-bookings`,
      `${BASE_URL}/my-bookings`,
      `${BASE_URL}/profile/bookings`
    ];
    
    for (const url of possibleUrls) {
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 5000 });
        await page.waitForTimeout(2000);
        
        if (!page.url().includes('login')) {
          log(`My Bookings page found at: ${url}`);
          await takeScreenshot(page, 'my-bookings');
          return;
        }
      } catch (e) {
        // Try next URL
      }
    }
    
    log('My Bookings page not accessible', 'warning');
  });
  
  // ═══════════════════════════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════════════════════════
  
  log('\n========================================');
  log('Tests completed, generating report...');
  log('========================================');
  
  // Close browser
  await context.close();
  await browser.close();
  
  // ═══════════════════════════════════════════════════════════════
  // GENERATE REPORT
  // ═══════════════════════════════════════════════════════════════
  
  testResults.endTime = new Date().toISOString();
  testResults.summary = {
    total: testResults.tests.length,
    passed: testResults.tests.filter(t => t.status === 'passed').length,
    failed: testResults.tests.filter(t => t.status === 'failed').length,
    errors: testResults.errors.length,
    warnings: testResults.warnings.length,
    screenshots: testResults.screenshots.length,
    websocketMessages: testResults.websocketMessages.length,
    networkRequests: testResults.networkRequests.length
  };
  
  // Save JSON report
  const reportPath = path.join(RESULTS_DIR, 'test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  
  // Generate HTML report
  const htmlReport = generateHTMLReport(testResults);
  const htmlPath = path.join(RESULTS_DIR, 'test-report.html');
  fs.writeFileSync(htmlPath, htmlReport);
  
  // Print summary
  console.log('\n\n');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    TEST RESULTS SUMMARY                      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`Total Tests: ${testResults.summary.total}`);
  console.log(`✅ Passed: ${testResults.summary.passed}`);
  console.log(`❌ Failed: ${testResults.summary.failed}`);
  console.log(`🔴 Errors: ${testResults.summary.errors}`);
  console.log(`⚠️  Warnings: ${testResults.summary.warnings}`);
  console.log(`📸 Screenshots: ${testResults.summary.screenshots}`);
  console.log(`🔌 WebSocket Messages: ${testResults.summary.websocketMessages}`);
  console.log(`🌐 Network Requests: ${testResults.summary.networkRequests}`);
  console.log('');
  console.log(`Report saved to: ${reportPath}`);
  console.log(`HTML Report: ${htmlPath}`);
  console.log('');
  
  // Exit with appropriate code
  process.exit(testResults.summary.failed > 0 ? 1 : 0);
}

function generateHTMLReport(results) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Autorenta E2E Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { color: #333; border-bottom: 3px solid #4CAF50; padding-bottom: 10px; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
    .stat-card { padding: 15px; border-radius: 8px; text-align: center; }
    .stat-card.passed { background: #d4edda; color: #155724; }
    .stat-card.failed { background: #f8d7da; color: #721c24; }
    .stat-card.warning { background: #fff3cd; color: #856404; }
    .stat-card.info { background: #d1ecf1; color: #0c5460; }
    .stat-card h3 { margin: 0; font-size: 24px; }
    .stat-card p { margin: 5px 0 0 0; font-size: 14px; }
    .test-list { margin: 20px 0; }
    .test-item { padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid; }
    .test-item.passed { background: #d4edda; border-color: #28a745; }
    .test-item.failed { background: #f8d7da; border-color: #dc3545; }
    .test-item h3 { margin: 0 0 10px 0; }
    .test-item .duration { color: #666; font-size: 14px; }
    .error { background: #f8d7da; padding: 10px; border-radius: 4px; margin: 10px 0; font-family: monospace; }
    .websocket-messages { background: #e7f3ff; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .websocket-messages pre { background: white; padding: 10px; border-radius: 4px; overflow-x: auto; }
    .screenshots { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; margin: 20px 0; }
    .screenshot { border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }
    .screenshot img { width: 100%; height: auto; }
    .screenshot p { margin: 0; padding: 10px; background: #f8f9fa; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎭 Autorenta E2E Test Report</h1>
    <p><strong>Start:</strong> ${results.startTime}</p>
    <p><strong>End:</strong> ${results.endTime}</p>
    
    <div class="summary">
      <div class="stat-card ${results.summary.failed === 0 ? 'passed' : 'failed'}">
        <h3>${results.summary.passed}/${results.summary.total}</h3>
        <p>Tests Passed</p>
      </div>
      <div class="stat-card ${results.summary.errors > 0 ? 'failed' : 'info'}">
        <h3>${results.summary.errors}</h3>
        <p>Errors</p>
      </div>
      <div class="stat-card ${results.summary.warnings > 0 ? 'warning' : 'info'}">
        <h3>${results.summary.warnings}</h3>
        <p>Warnings</p>
      </div>
      <div class="stat-card info">
        <h3>${results.summary.websocketMessages}</h3>
        <p>WebSocket Messages</p>
      </div>
    </div>
    
    <h2>🧪 Test Results</h2>
    <div class="test-list">
      ${results.tests.map(test => `
        <div class="test-item ${test.status}">
          <h3>${test.status === 'passed' ? '✅' : '❌'} ${test.name}</h3>
          <p class="duration">Duration: ${test.duration}ms</p>
          ${test.error ? `<div class="error">${test.error}</div>` : ''}
        </div>
      `).join('')}
    </div>
    
    ${results.websocketMessages.length > 0 ? `
    <h2>🔴 WebSocket Realtime Messages</h2>
    <div class="websocket-messages">
      <pre>${JSON.stringify(results.websocketMessages, null, 2)}</pre>
    </div>
    ` : ''}
    
    ${results.errors.length > 0 ? `
    <h2>❌ Errors</h2>
    ${results.errors.map(err => `<div class="error">${err.message}</div>`).join('')}
    ` : ''}
    
    <h2>📸 Screenshots</h2>
    <div class="screenshots">
      ${results.screenshots.map(ss => `
        <div class="screenshot">
          <img src="${path.basename(ss.filepath)}" alt="${ss.name}">
          <p>${ss.name}</p>
        </div>
      `).join('')}
    </div>
  </div>
</body>
</html>
  `;
}

// Run tests
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
