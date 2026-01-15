
import * as fs from 'fs';
import { chromium } from 'playwright';

// Config
const BASE_URL = 'http://localhost:4200';
const OUTPUT_DIR = '/home/edu/.gemini/antigravity/brain/e28c1f42-a3d1-4cfb-81ae-b8fa36c56690/artifacts/pitch-deck';
// Using a known robust car ID if possible, or we will pick the first one from the list
const CAR_ID_FALLBACK = '4da4c7ed-33e9-4a30-92b8-342332d660a9';
const VIEWPORT = { width: 390, height: 844 }; // iPhone 13/14 Pro

// Credentials
const CREDENTIALS = {
  email: 'eduardomarques@campus.fmed.uba.ar',
  password: 'Ab.12345'
};

async function capture() {
  console.log('🚀 Starting Pitch Deck Asset Generator (Retry)...');

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: true, // Keep headless true unless debugging explicitly requested, but rely on robust selectors
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2, // Retina quality
    isMobile: true,
    hasTouch: true,
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Buenos_Aires',
    permissions: ['geolocation'],
    geolocation: { latitude: -34.6037, longitude: -58.3816 } // Buenos Aires
  });

  const page = await context.newPage();

  // Helper to clean UI before shot
  const cleanUI = async () => {
    await page.addStyleTag({
      content: `
      app-pwa-update-prompt, app-offline-banner, .debug-badge, .toast-container { display: none !important; }
      /* Hide scrollbars for clean shots */
      ::-webkit-scrollbar { display: none; }
    `});
    // Wait for animations to settle
    await page.waitForTimeout(1000);
  };

  try {
    // --- SHOT 1: Home / Search (Map or List) ---
    console.log('📸 1. Home/Search');
    await page.goto(`${BASE_URL}/cars/list`);
    await page.waitForLoadState('networkidle');
    await cleanUI();
    await page.screenshot({ path: `${OUTPUT_DIR}/01_home_search.png` });

    // --- SHOT 2: Car Detail (Photos + Specs + Price) ---
    console.log('📸 2. Car Detail');
    // Try to click first car if possible, else fallback
    try {
      await page.waitForSelector('app-car-card', { timeout: 5000 });
      await page.locator('app-car-card').first().click();
    } catch {
      await page.goto(`${BASE_URL}/cars/${CAR_ID_FALLBACK}`);
    }
    await page.waitForLoadState('networkidle');
    await cleanUI();
    await page.screenshot({ path: `${OUTPUT_DIR}/02_car_detail.png` });

    // --- SHOT 3: Selection de fechas + precio total (Booking Flow) ---
    console.log('📸 3. Booking Selection');
    // Clicking "Reservar" or selecting dates
    const reserveBtn = page.getByRole('button', { name: /Reservar|Continuar/i }).first();
    if (await reserveBtn.isVisible()) {
      await reserveBtn.click();
      await page.waitForTimeout(2000);
      await cleanUI();
      await page.screenshot({ path: `${OUTPUT_DIR}/03_booking_selection.png` });
    } else {
      console.log('Skipping 03 (Button not found)');
    }

    // --- LOGIN SEQUENCE (CONFIRMED) ---
    console.log('🔑 Authenticating...');
    await page.goto(`${BASE_URL}/auth/login`);
    // Relaxed load state, sometimes networkidle is too strict for long polling connections
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000); // Allow Ionic to hydrate

    // Selectors confirmed by browser agent
    const emailSelector = '#login-email';
    const passwordSelector = '#login-password';
    const loginBtnSelector = 'button:has-text("Ingresar")';

    try {
      console.log('Waiting for email input...');
      await page.waitForSelector(emailSelector, { state: 'visible', timeout: 30000 });
      await page.fill(emailSelector, CREDENTIALS.email);

      console.log('Waiting for password input...');
      await page.waitForSelector(passwordSelector, { state: 'visible', timeout: 10000 });
      await page.fill(passwordSelector, CREDENTIALS.password);

      console.log('Clicking login...');
      await page.waitForSelector(loginBtnSelector, { state: 'visible' });
      await page.click(loginBtnSelector);
    } catch (e) {
      console.error('❌ Login selectors failed:', e);
      await page.screenshot({ path: `${OUTPUT_DIR}/debug_login_selector_fail.png` });
      throw e;
    }

    // VERIFY LOGIN
    console.log('⏳ Waiting for post-login redirect...');
    try {
      // Wait for URL change to NOT be login
      await page.waitForURL((url) => !url.href.includes('/auth/login'), { timeout: 20000 });
      console.log('✅ Logged in successfully (URL changed)');
    } catch (e) {
      console.error('❌ Login Verification Failed: Still on login page or timeout.');
      await page.screenshot({ path: `${OUTPUT_DIR}/debug_login_failed.png` });
      throw new Error('Login failed - cannot capture authenticated screenshots');
    }

    // --- SHOT 4: Deposit / Warranty Presentation ---
    console.log('📸 4. Deposit / Warranty Presentation');
    // Check if we ended up on home or a specific page
    // Navigate to a relevant wallet/deposit page demonstrating "funds held"
    await page.goto(`${BASE_URL}/wallet`);
    await page.waitForLoadState('networkidle');
    await cleanUI();
    // Try to click "Garantia" tab if it exists
    const depositTab = page.locator('ion-segment-button', { hasText: /garantía|depósito/i }).first();
    if (await depositTab.isVisible()) {
      await depositTab.click();
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: `${OUTPUT_DIR}/04_deposit_warranty.png` });


    // --- SHOT 5: Checkout / Confirmation ---
    console.log('📸 5. Checkout / Confirmation (Booking Detail)');
    await page.goto(`${BASE_URL}/bookings`);
    await page.waitForLoadState('networkidle');

    // Click first booking if exists
    try {
      await page.waitForSelector('app-booking-card, ion-card', { timeout: 10000 });
      await page.locator('app-booking-card, ion-card').first().click();
      await page.waitForLoadState('networkidle');
      await cleanUI();
      await page.screenshot({ path: `${OUTPUT_DIR}/05_checkout_confirmation.png` });
    } catch {
      console.log('No bookings found for confirmation shot, taking booking list fallback');
      await cleanUI();
      await page.screenshot({ path: `${OUTPUT_DIR}/05_checkout_confirmation_fallback.png` });
    }

    // --- SHOT 6: Wallet / Ledger ---
    console.log('📸 6. Wallet / Ledger');
    await page.goto(`${BASE_URL}/wallet`);
    await page.waitForLoadState('networkidle');
    // Ensure "Saldo" tab is active
    const balanceTab = page.locator('ion-segment-button', { hasText: /saldo|billetera/i }).first();
    if (await balanceTab.isVisible()) {
      await balanceTab.click();
      await page.waitForTimeout(500);
    }
    await cleanUI();
    await page.screenshot({ path: `${OUTPUT_DIR}/06_wallet_ledger.png` });

    // --- SHOT 7: Check-in/out Evidence ---
    console.log('📸 7. Check-in/out Evidence');
    // Placeholder: We can't easily stage a checkin. We will capture the "My Bookings" list again but maybe scrolled or different view
    // Or try to hit a generic inspection route?
    // Let's capture the Booking Detail again but focused on the bottom where "Inspeccion" buttons usually are
    await page.goto(`${BASE_URL}/bookings`);
    try {
      await page.locator('app-booking-card, ion-card').first().click();
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
    } catch { }
    await cleanUI();
    await page.screenshot({ path: `${OUTPUT_DIR}/07_checkin_evidence_placeholder.png` });

    // --- SHOT 8: Incident / Resolution ---
    console.log('📸 8. Incident / Resolution');
    await page.goto(`${BASE_URL}/disputes`);
    await page.waitForLoadState('networkidle');
    await cleanUI();
    await page.screenshot({ path: `${OUTPUT_DIR}/08_incident_resolution.png` });


    // --- OPTIONAL 9: KYC ---
    console.log('📸 9. KYC (Optional)');
    await page.goto(`${BASE_URL}/verification`);
    await cleanUI();
    await page.screenshot({ path: `${OUTPUT_DIR}/09_kyc_verification.png` });

    // --- OPTIONAL 10: Membership ---
    console.log('📸 10. Memberships (Optional)');
    await page.goto(`${BASE_URL}/subscriptions`);
    await cleanUI();
    await page.screenshot({ path: `${OUTPUT_DIR}/10_memberships.png` });

    console.log(`✨ All assets saved to ${OUTPUT_DIR}`);

  } catch (error) {
    console.error('❌ Error capturing assets:', error);
    await page.screenshot({ path: `${OUTPUT_DIR}/debug_error.png` });
  } finally {
    await browser.close();
  }
}

capture();
