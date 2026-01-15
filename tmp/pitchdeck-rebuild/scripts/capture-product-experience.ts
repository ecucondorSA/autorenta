import { chromium, type Page } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

type CaptureStep = {
  key:
    | 'booking_discovery'
    | 'booking_confirmacion'
    | 'fintech_billetera_virtual'
    | 'fintech_hold_garantia'
    | 'trust_kyc_cam'
    | 'trust_video_check';
  label: string;
  urlEnv: string;
  outFile: string;
};

const PROJECT_ROOT = new URL('..', import.meta.url).pathname;
const OUT_DIR = join(PROJECT_ROOT, 'assets', 'product-experience');

function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

const BASE_URL = normalizeBaseUrl(process.env.AUTORENTA_BASE_URL ?? 'autorentar.com');
const EMAIL = process.env.AUTORENTA_EMAIL;
const PASSWORD = process.env.AUTORENTA_PASSWORD;

const EXPLICIT_BOOKING_ID = process.env.AUTORENTA_BOOKING_ID ?? null;

const WAIT_BEFORE_SCREENSHOT_MS = Number(process.env.AUTORENTA_WAIT_BEFORE_SCREENSHOT_MS ?? 10_000);
const HEADFUL = (process.env.AUTORENTA_HEADFUL ?? '').toLowerCase() === 'true';
const SLOWMO_MS = Number(process.env.AUTORENTA_SLOWMO_MS ?? 0);

const STORAGE_STATE_PATH = process.env.AUTORENTA_STORAGE_STATE ?? null;

function joinUrl(baseUrl: string, path: string): string {
  const base = new URL(baseUrl);
  const cleanedBasePath = base.pathname.replace(/\/+$/, '');
  const cleanedPath = String(path).startsWith('/') ? path : `/${path}`;
  base.pathname = `${cleanedBasePath}${cleanedPath}`;
  return base.toString();
}

const steps: CaptureStep[] = [
  {
    key: 'booking_discovery',
    label: 'FLUJO: RESERVA / Discovery',
    urlEnv: 'AUTORENTA_URL_BOOKING_DISCOVERY',
    outFile: 'booking_discovery.png',
  },
  {
    key: 'booking_confirmacion',
    label: 'FLUJO: RESERVA / Confirmación',
    urlEnv: 'AUTORENTA_URL_BOOKING_CONFIRMACION',
    outFile: 'booking_confirmacion.png',
  },
  {
    key: 'fintech_billetera_virtual',
    label: 'FLUJO: FINTECH / Billetera Virtual',
    urlEnv: 'AUTORENTA_URL_WALLET',
    outFile: 'fintech_billetera_virtual.png',
  },
  {
    key: 'fintech_hold_garantia',
    label: 'FLUJO: FINTECH / Hold-Garantía',
    urlEnv: 'AUTORENTA_URL_HOLD_GARANTIA',
    outFile: 'fintech_hold_garantia.png',
  },
  {
    key: 'trust_kyc_cam',
    label: 'FLUJO: TRUST / KYC Cam',
    urlEnv: 'AUTORENTA_URL_KYC_CAM',
    outFile: 'trust_kyc_cam.png',
  },
  {
    key: 'trust_video_check',
    label: 'FLUJO: TRUST / Video Check',
    urlEnv: 'AUTORENTA_URL_VIDEO_CHECK',
    outFile: 'trust_video_check.png',
  },
];

async function maybeLogin(page: Page) {
  // If we have a persisted session and we're already authenticated, skip.
  const loginFormVisible =
    (await page.locator('input[type="password"], input[autocomplete="current-password"]').count()) > 0;
  if (!loginFormVisible) return;

  if (!EMAIL || !PASSWORD) {
    throw new Error(
      'Faltan credenciales: seteá AUTORENTA_EMAIL y AUTORENTA_PASSWORD para poder capturar rutas privadas.',
    );
  }

  // Go directly to login route (private routes may redirect anyway)
  const loginUrl = joinUrl(BASE_URL, '/auth/login');
  await page.goto(loginUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Check if we have the scenic login (landing page with "Ingresar" button)
  const scenicSigninButton = page.locator('button[data-testid="login-scenic-signin"]').first();
  if ((await scenicSigninButton.count()) > 0) {
    console.log('[capture] Login: pantalla scenic detectada, clickeando "Ingresar"...');
    await scenicSigninButton.click();
    await page.waitForTimeout(1500);
  }

  const emailInput = page
    .locator(
      'input[type="email"], input[name*="email" i], input[autocomplete="email"], input[placeholder*="mail" i]',
    )
    .first();
  const passwordInput = page
    .locator('input[type="password"], input[name*="pass" i], input[autocomplete="current-password"]')
    .first();

  const hasEmail = (await emailInput.count()) > 0;
  const hasPass = (await passwordInput.count()) > 0;

  if (!hasEmail || !hasPass) {
    throw new Error('No encontré el formulario de login (inputs email/password) en /auth/login.');
  }

  console.log('[capture] Login: completando credenciales…');
  await emailInput.fill(EMAIL);
  await passwordInput.fill(PASSWORD);

  const submitButton = page
    .locator(
      'button[type="submit"], button:has-text("Ingresar"), button:has-text("Entrar"), button:has-text("Iniciar sesión"), button:has-text("Login"), button:has-text("Sign in")',
    )
    .first();

  if ((await submitButton.count()) > 0) {
    await submitButton.click();
  } else {
    await page.keyboard.press('Enter');
  }

  // Wait for navigation away from login
  await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 15000 }).catch(() => {
    console.warn('[capture] Timeout esperando salir de /auth/login. Continúo...');
  });
  
  // Post-login settle
  await page.waitForTimeout(2000);
}

async function ensureAuthenticated(page: Page) {
  const stillOnLogin = page.url().includes('/auth/login');
  const loginFormVisible =
    (await page.locator('input[type="password"], input[autocomplete="current-password"]').count()) > 0;

  if (stillOnLogin || loginFormVisible) {
    throw new Error(
      'Seguís en login (o el form sigue visible). Revisá credenciales / 2FA / redirects. Para debug: AUTORENTA_HEADFUL=true AUTORENTA_SLOWMO_MS=200.',
    );
  }
}

async function tryDiscoverBookingId(page: Page): Promise<string | null> {
  if (EXPLICIT_BOOKING_ID) return EXPLICIT_BOOKING_ID;

  const bookingsUrl = joinUrl(BASE_URL, '/bookings');
  console.log('[capture] Intento descubrir bookingId desde:', bookingsUrl);
  await page.goto(bookingsUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);

  const hrefs = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a[href]'))
      .map((a) => a.getAttribute('href'))
      .filter((v): v is string => Boolean(v));

    // Some Angular templates may use routerLink on non-anchor elements; try to collect them too.
    const routerLinks = Array.from(document.querySelectorAll('[routerlink]'))
      .map((el) => el.getAttribute('routerlink'))
      .filter((v): v is string => Boolean(v));

    return [...anchors, ...routerLinks];
  });

  for (const href of hrefs) {
    const match = href.match(/\/bookings\/([a-z0-9-]{8,})/i);
    if (match?.[1]) return match[1];
  }

  return null;
}

async function main() {
  console.log('[capture] Output dir:', OUT_DIR);
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: !HEADFUL, slowMo: SLOWMO_MS || undefined });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    deviceScaleFactor: 2,
    storageState: STORAGE_STATE_PATH && existsSync(STORAGE_STATE_PATH) ? STORAGE_STATE_PATH : undefined,
  });
  const page = await context.newPage();

  console.log('[capture] Base URL:', BASE_URL);
  console.log('[capture] Headful:', HEADFUL, 'SlowMo(ms):', SLOWMO_MS, 'WaitBeforeScreenshot(ms):', WAIT_BEFORE_SCREENSHOT_MS);
  await maybeLogin(page);
  await ensureAuthenticated(page);

  if (STORAGE_STATE_PATH) {
    await context.storageState({ path: STORAGE_STATE_PATH });
    console.log('[capture] storageState guardado en:', STORAGE_STATE_PATH);
  }

  const discoveredBookingId = await tryDiscoverBookingId(page);
  if (discoveredBookingId) {
    console.log('[capture] bookingId detectado:', discoveredBookingId);
  } else {
    console.log(
      '[capture] No pude detectar bookingId automáticamente. Podés setear AUTORENTA_BOOKING_ID para habilitar confirmación/hold/video.',
    );
  }

  const missing: string[] = [];

  for (const step of steps) {
    const envUrl = process.env[step.urlEnv];

    // Defaults (derived from Angular routes in apps/web)
    let url: string | null = envUrl ?? null;
    if (!url) {
      if (step.key === 'booking_discovery') url = joinUrl(BASE_URL, '/cars/list');
      if (step.key === 'booking_confirmacion') {
        url = discoveredBookingId ? joinUrl(BASE_URL, `/bookings/${discoveredBookingId}`) : null;
      }
      if (step.key === 'fintech_billetera_virtual') url = joinUrl(BASE_URL, '/wallet');
      if (step.key === 'fintech_hold_garantia') {
        url = discoveredBookingId
          ? joinUrl(BASE_URL, `/bookings/${discoveredBookingId}/detail-payment`)
          : joinUrl(BASE_URL, '/bookings/detail-payment');
      }
      if (step.key === 'trust_kyc_cam') url = joinUrl(BASE_URL, '/verification');
      if (step.key === 'trust_video_check') {
        url = discoveredBookingId ? joinUrl(BASE_URL, `/bookings/${discoveredBookingId}/check-in`) : null;
      }
    }

    if (!url) {
      missing.push(step.urlEnv);
      continue;
    }

    console.log(`[capture] ${step.label} → ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(WAIT_BEFORE_SCREENSHOT_MS);
    await ensureAuthenticated(page);

    const outPath = join(OUT_DIR, step.outFile);
    await page.screenshot({ path: outPath, fullPage: false });
    console.log(`[capture] Saved: ${outPath}`);
  }

  await browser.close();

  if (missing.length > 0) {
    console.log('\n[capture] Faltan variables de entorno de URLs (no se capturaron esas pantallas):');
    for (const k of missing) console.log(`- ${k}`);
    console.log('\n[capture] Nota: si no seteás URLs, el script usa defaults. Solo quedan en blanco las que dependen de bookingId.');
    process.exitCode = 2;
  }
}

main().catch((err) => {
  console.error('[capture] Error:', err);
  process.exit(1);
});
