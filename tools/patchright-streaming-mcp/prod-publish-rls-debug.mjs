import { chromium } from 'patchright';

const profileDir = process.env.PATCHRIGHT_PROFILE_DIR || '/tmp/patchright-prod-audit-profile';

function decodeJwtPayload(token) {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const padLen = (4 - (payload.length % 4)) % 4;
    const padded = payload + '='.repeat(padLen);
    const json = Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

async function main() {
  const ctx = await chromium.launchPersistentContext(profileDir, {
    headless: true,
    channel: 'chrome',
    viewport: { width: 414, height: 896 },
    args: ['--no-first-run', '--disable-blink-features=AutomationControlled'],
  });

  // Make geolocation flow deterministic
  await ctx.setGeolocation({ latitude: -34.6037, longitude: -58.3816 });
  await ctx.grantPermissions(['geolocation'], { origin: 'https://autorentar.com' });

  const page = ctx.pages()[0] || (await ctx.newPage());

  const consoleErrors = [];
  const pageErrors = [];
  const requestFailures = [];
  const badModuleResources = [];

  page.on('console', (msg) => {
    const entry = { type: msg.type(), text: msg.text() };
    if (entry.type === 'error') consoleErrors.push(entry);
  });
  page.on('pageerror', (err) => {
    pageErrors.push(String(err));
  });
  page.on('requestfailed', (req) => {
    requestFailures.push({ url: req.url(), method: req.method(), failure: req.failure()?.errorText });
  });
  page.on('response', async (resp) => {
    const url = resp.url();
    const isJs = url.includes('.js');
    const isWasm = url.includes('.wasm');
    if (!isJs && !isWasm) return;

    const ct = resp.headers()['content-type'] || '';
    if (resp.status() >= 400 || ct.includes('text/html')) {
      badModuleResources.push({ url, status: resp.status(), contentType: ct });
    }
  });

  // Reduce noise and prevent side effects/costs
  await page.route('**/ingest.us.sentry.io/**', (route) => route.abort());

  // Avoid expensive AI Vision edge-function calls during the flow.
  // Keep FIPE Edge Functions enabled (they're needed for model selection).
  await page.route('**/functions/v1/ai-vision-service/**', async (route) => {
    const url = route.request().url();

    if (url.includes('/detect-plates')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify({
          success: true,
          plates_detected: 0,
          plates: [],
          warning: false,
        }),
      });
    }

    if (url.includes('/recognize-vehicle')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify({
          success: false,
          vehicle: {
            brand: 'Desconocido',
            model: 'Desconocido',
            year_range: [2000, new Date().getFullYear()],
            color: 'desconocido',
            body_type: 'unknown',
            confidence: 0,
          },
          suggestions: [],
        }),
      });
    }

    // validate-quality + any other path
    return route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({
        success: true,
        quality: { score: 85, is_acceptable: true, issues: [] },
        content: {
          matches_subject: true,
          detected_subject: 'vehicle',
          area_coverage: 0.9,
        },
        recommendations: [],
      }),
    });
  });

  const carsInsertObservations = [];
  await page.route('**/rest/v1/cars**', async (route) => {
    const req = route.request();
    if (req.method().toUpperCase() !== 'POST') {
      return route.continue();
    }

    const headers = req.headers();
    const authHeader = headers['authorization'] || headers['Authorization'];
    const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const jwt = token ? decodeJwtPayload(token) : null;

    let ownerId = null;
    try {
      const bodyText = req.postData() || '';
      const parsed = bodyText ? JSON.parse(bodyText) : null;
      const row = Array.isArray(parsed) ? parsed[0] : parsed;
      ownerId = row && typeof row === 'object' ? row.owner_id : null;
    } catch {
      ownerId = null;
    }

    carsInsertObservations.push({
      hasApikey: !!headers['apikey'],
      hasAuthorization: !!authHeader,
      authScheme: typeof authHeader === 'string' ? authHeader.split(' ')[0] : null,
      jwtSub: jwt?.sub || null,
      jwtRole: jwt?.role || null,
      jwtExp: jwt?.exp || null,
      ownerId,
    });

    // IMPORTANT: don't create data in prod. Return the same error shape the app sees.
    return route.fulfill({
      status: 401,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({
        code: '42501',
        details: null,
        hint: null,
        message: 'new row violates row-level security policy for table "cars"',
      }),
    });
  });

  try {
    await page.goto('https://autorentar.com/cars/publish', {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });

    // Ensure logged in (prod profile should be logged in, but keep it robust)
    if (page.url().includes('/auth/login')) {
      throw new Error('Not logged in (redirected to /auth/login). Run prod-login-check.mjs first.');
    }

    // Guard against a login modal overlay (URL stays /cars/publish, but UI blocks flow).
    const hasLoginModal = await page.locator('text=Bienvenido de vuelta').isVisible().catch(() => false);
    if (hasLoginModal) {
      throw new Error('Login modal is visible. Session is not active in this profile.');
    }

    // Quick diagnostics: service worker + auth token keys
    const clientState = await page.evaluate(() => {
      const authKeys = Object.keys(localStorage).filter((k) => k.includes('auth-token'));
      const sw = navigator.serviceWorker?.controller?.scriptURL || null;
      return { authKeys, sw };
    });

    // Jump straight to Summary using a saved draft (mirrors the user screenshot).
    // This avoids brittle UI automation and lets us focus on the publish request + RLS/auth behavior.
    const nowIso = new Date().toISOString();
    const todayIso = nowIso.slice(0, 10);
    const draft = {
      currentIndex: 7,
      answers: [
        ['vehicle', { questionId: 'vehicle', value: { code: '56', name: 'Toyota' }, displayValue: 'Toyota', timestamp: nowIso }],
        ['year', { questionId: 'year', value: 2022, displayValue: '2022', timestamp: nowIso }],
        ['model', { questionId: 'model', value: { code: '1', name: 'COROLLA' }, displayValue: 'COROLLA', timestamp: nowIso }],
        ['photos', { questionId: 'photos', value: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }], displayValue: '3 fotos', timestamp: nowIso }],
        ['mileage', { questionId: 'mileage', value: 45000, displayValue: '45.000 km', timestamp: nowIso }],
        ['price', { questionId: 'price', value: 35, displayValue: 'US$ 35/día', timestamp: nowIso }],
        ['location', { questionId: 'location', value: { street: 'Av. Corrientes', streetNumber: '1234', city: 'Buenos Aires', state: 'CABA', country: 'AR', latitude: -34.6037, longitude: -58.3816 }, displayValue: 'Buenos Aires, CABA', timestamp: nowIso }],
      ],
      selectedBrand: { code: '56', name: 'Toyota' },
      selectedModel: { code: '1', name: 'COROLLA' },
      selectedYear: 2022,
      fipeValue: 15000,
      suggestedPrice: null,
      locationAddress: {
        street: 'Av. Corrientes',
        streetNumber: '1234',
        city: 'Buenos Aires',
        state: 'CABA',
        country: 'AR',
        latitude: -34.6037,
        longitude: -58.3816,
      },
      formValues: {
        brand_text_backup: 'Toyota',
        model_text_backup: 'COROLLA',
        year: 2022,
        mileage: 45000,
        transmission: 'automatic',
        fuel: 'nafta',
        color: 'Blanco',
        description: '',
        mileage_limit: 0,
        extra_km_price: 0,
        fuel_policy: 'full_to_full',
        allow_second_driver: false,
        max_anticipation_days: 90,
        pricing_strategy: 'dynamic',
        price_per_day: 35,
        currency: 'USD',
        value_usd: 15000,
        deposit_required: true,
        deposit_amount: Math.round(15000 * 0.07),
        auto_approval: false,
        location_street: 'Av. Corrientes',
        location_street_number: '1234',
        location_city: 'Buenos Aires',
        location_state: 'CABA',
        location_country: 'AR',
        availability_start_date: todayIso,
        availability_end_date: `${Number(todayIso.slice(0, 4)) + 1}${todayIso.slice(4)}`,
      },
      savedAt: nowIso,
    };

    await page.evaluate((d) => {
      localStorage.setItem('autorenta_publish_draft', JSON.stringify(d));
    }, draft);

    await page.reload({ waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(4000);

    const publishBtn = page.locator('button:has-text("Publicar"):not([disabled])').first();
    await publishBtn.waitFor({ state: 'visible', timeout: 60000 });
    await publishBtn.click();

    // Allow the publish flow to hit our mocked cars insert route
    await page.waitForTimeout(4000);

    await page.screenshot({ path: '/tmp/prod-publish-rls-debug.png', fullPage: true }).catch(() => {});

    console.log(JSON.stringify({
      url: page.url(),
      clientState,
      carsInsertObservations,
      consoleErrors: consoleErrors.slice(0, 30),
      pageErrors: pageErrors.slice(0, 10),
      requestFailures: requestFailures.slice(0, 20),
      badModuleResources: badModuleResources.slice(0, 20),
    }, null, 2));
  } catch (err) {
    console.error('ERROR', err);
    await page.screenshot({ path: '/tmp/prod-publish-rls-debug-error.png', fullPage: true }).catch(() => {});
  } finally {
    await ctx.close();
  }
}

main();
