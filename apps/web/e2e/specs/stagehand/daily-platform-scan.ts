import { Stagehand } from '@browserbasehq/stagehand';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

import { TestData, UserCredentials } from '../../fixtures/test-data';
import { Selectors } from '../../utils/selectors';

// JSON value helpers (avoid any/unknown)
type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
interface JsonObject {
  [key: string]: JsonValue;
}
interface JsonArray extends Array<JsonValue> {}

type StepStatus = 'ok' | 'failed' | 'skipped';
interface StepResult {
  status: StepStatus;
  error?: string;
  notes?: string[];
  url?: string;
  screenshotPath?: string;
  observationsPath?: string;
}

interface FlowResult {
  name: string;
  steps: Record<string, StepResult>;
}

interface LocatorLike {
  count(): Promise<number>;
  first(): LocatorLike;
  nth(index: number): LocatorLike;
  locator(selector: string): LocatorLike;
  fill(value: string): Promise<void>;
  click(options?: { timeout?: number }): Promise<void>;
}

interface PageLike {
  goto(url: string, options?: { waitUntil?: 'domcontentloaded' | 'load' | 'networkidle'; timeout?: number }): Promise<void>;
  url(): string;
  locator(selector: string): LocatorLike;
  evaluate<T>(pageFunction: (...args: JsonValue[]) => T, ...args: JsonValue[]): Promise<T>;
  screenshot(options: { path: string; fullPage?: boolean }): Promise<void>;
  addInitScript(script: () => void): Promise<void>;
}

interface PageCheck {
  key: string;
  path: string;
  observe?: boolean;
  instruction?: string;
  expectAuth?: boolean;
  skipIfBlocked?: boolean;
}

interface TermsCheckResult {
  found: boolean;
  checked: boolean | null;
}

const BASE_URL = process.env.BASE_URL || 'https://autorentar.com';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const E2E_ROOT = path.resolve(__dirname, '..', '..');
const REPO_ROOT = path.resolve(E2E_ROOT, '..', '..', '..');
const REPORT_DIR = process.env.STAGEHAND_REPORT_DIR || path.join(E2E_ROOT, 'reports', 'stagehand');
const FAIL_ON_ERROR = process.env.STAGEHAND_FAIL_ON_ERROR !== '0';

dotenv.config({ path: path.join(REPO_ROOT, '.env') });
dotenv.config({ path: path.join(REPO_ROOT, '.env.local'), override: true });

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function nowStamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForSelector(page: PageLike, selector: string, timeoutMs = 15000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const found = await page.evaluate((sel) => !!document.querySelector(sel), selector);
    if (found) return;
    await sleep(250);
  }
  throw new Error(`Timeout waiting for selector: ${selector}`);
}

async function hasSelector(page: PageLike, selector: string): Promise<boolean> {
  try {
    return await page.evaluate((sel) => !!document.querySelector(sel), selector);
  } catch {
    return false;
  }
}

async function saveScreenshot(page: PageLike, name: string): Promise<string> {
  ensureDir(REPORT_DIR);
  const filePath = path.join(REPORT_DIR, `${name}-${nowStamp()}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  return filePath;
}

async function saveObservations(name: string, data: JsonObject[]): Promise<string> {
  ensureDir(REPORT_DIR);
  const filePath = path.join(REPORT_DIR, `${name}-${nowStamp()}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  return filePath;
}

async function runObserve(
  stagehand: Stagehand,
  page: PageLike,
  name: string,
  instruction: string,
  selector?: string
): Promise<StepResult> {
  const result: StepResult = { status: 'ok', notes: [] };
  try {
    const observations = (await stagehand.observe({
      instruction,
      page,
      selector,
    })) as JsonObject[];
    result.observationsPath = await saveObservations(name, observations);
    result.screenshotPath = await saveScreenshot(page, name);
    result.url = page.url();
  } catch (error) {
    const err = error as Error;
    result.status = 'failed';
    result.error = err.message;
    try {
      result.screenshotPath = await saveScreenshot(page, name);
    } catch {
      // ignore
    }
  }
  return result;
}

async function isLoginPage(page: PageLike): Promise<boolean> {
  if (page.url().includes('/auth/login')) return true;
  if (await hasSelector(page, Selectors.login.emailInput)) return true;
  if (await hasSelector(page, Selectors.login.emailInputAlt)) return true;
  return false;
}

async function detectBlockingState(page: PageLike): Promise<string | null> {
  const currentUrl = page.url();
  if (currentUrl.includes('/onboarding')) return 'Blocked by onboarding';
  if (currentUrl.includes('/profile/verification')) return 'Blocked by verification';
  if (currentUrl.includes('/verification/')) return 'Blocked by verification';
  return null;
}

async function detectHardError(page: PageLike): Promise<string | null> {
  const hasLoadError = await hasSelector(page, Selectors.marketplace.loadError);
  if (hasLoadError) return 'Detected load error state';

  const snapshot = await page.evaluate(() => {
    const title = document.title || '';
    const h1 = document.querySelector('h1')?.textContent || '';
    const h2 = document.querySelector('h2')?.textContent || '';
    return {
      title: title.slice(0, 200),
      h1: h1.slice(0, 200),
      h2: h2.slice(0, 200),
    };
  });

  const text = `${snapshot.title} ${snapshot.h1} ${snapshot.h2}`.toLowerCase();
  const notFound = ['404', 'not found', 'no encontrado', 'page not found'];
  const forbidden = ['forbidden', 'no autorizado', 'acceso denegado', 'sin permisos'];
  if (notFound.some((token) => text.includes(token))) return 'Page not found';
  if (forbidden.some((token) => text.includes(token))) return 'Access denied';
  return null;
}

async function checkPage(
  stagehand: Stagehand,
  page: PageLike,
  name: string,
  url: string,
  options: {
    observe?: boolean;
    instruction?: string;
    expectAuth?: boolean;
    skipIfBlocked?: boolean;
  } = {}
): Promise<StepResult> {
  const result: StepResult = { status: 'ok', notes: [] };
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await sleep(1500);
    result.url = page.url();

    if (options.expectAuth && (await isLoginPage(page))) {
      result.status = 'failed';
      result.error = 'Redirected to login';
    }

    const blocked = await detectBlockingState(page);
    if (blocked && options.skipIfBlocked) {
      result.status = 'skipped';
      result.notes?.push(blocked);
    } else if (blocked && options.expectAuth) {
      result.status = 'failed';
      result.error = blocked;
    }

    const hardError = await detectHardError(page);
    if (hardError && result.status === 'ok') {
      result.status = 'failed';
      result.error = hardError;
    }

    if (options.observe && options.instruction) {
      const observed = await runObserve(stagehand, page, name, options.instruction);
      if (result.status === 'failed') {
        observed.status = 'failed';
        observed.error = result.error || observed.error;
      }
      if (result.status === 'skipped') {
        observed.status = 'skipped';
        observed.notes = [...(observed.notes || []), ...(result.notes || [])];
      }
      observed.url = result.url || observed.url;
      return observed;
    }

    result.screenshotPath = await saveScreenshot(page, name);
    result.url = page.url();
  } catch (error) {
    const err = error as Error;
    result.status = 'failed';
    result.error = err.message;
    try {
      result.screenshotPath = await saveScreenshot(page, name);
    } catch {
      // ignore
    }
  }
  return result;
}

async function checkPublicPages(stagehand: Stagehand, page: PageLike): Promise<FlowResult> {
  const flow: FlowResult = { name: 'public-pages', steps: {} };

  const pages: PageCheck[] = [
    {
      key: 'home',
      path: '/',
      observe: true,
      instruction: 'Identify main navigation, hero CTAs, and search entry points.',
    },
    { key: 'explore', path: '/explore' },
    {
      key: 'rentarfast',
      path: '/rentarfast',
      observe: true,
      instruction: 'Identify the chat input and any suggested prompts or actions.',
    },
    { key: 'become-renter', path: '/become-renter' },
    { key: 'cars-conversion', path: '/cars' },
    {
      key: 'cars-list',
      path: '/cars/list',
      observe: true,
      instruction: 'Identify car cards, filters, and any empty state message.',
    },
    { key: 'cars-compare', path: '/cars/compare' },
    { key: 'auth-register', path: '/auth/register', observe: true, instruction: 'Identify registration inputs and guidance text.' },
    { key: 'auth-reset', path: '/auth/reset-password' },
    { key: 'help', path: '/help' },
    { key: 'aircover', path: '/aircover' },
    { key: 'safety', path: '/safety' },
    { key: 'cancellation', path: '/cancellation' },
    { key: 'community', path: '/community' },
    { key: 'rent-your-car', path: '/rent-your-car' },
    { key: 'owner-resources', path: '/owner-resources' },
    { key: 'resources', path: '/resources' },
    { key: 'newsroom', path: '/newsroom' },
    { key: 'about', path: '/about' },
    { key: 'careers', path: '/careers' },
    { key: 'investors', path: '/investors' },
    { key: 'sitemap', path: '/sitemap' },
    { key: 'company-data', path: '/company-data' },
    { key: 'terms', path: '/terminos' },
    { key: 'privacy', path: '/privacy' },
    { key: 'insurance-policy', path: '/politica-seguros' },
    { key: 'delete-account', path: '/delete-account' },
  ];

  for (const entry of pages) {
    flow.steps[entry.key] = await checkPage(stagehand, page, `public-${entry.key}`, `${BASE_URL}${entry.path}`, {
      observe: entry.observe,
      instruction: entry.instruction,
    });
  }

  return flow;
}

async function checkLogin(
  stagehand: Stagehand,
  page: PageLike,
  credentials: UserCredentials
): Promise<FlowResult> {
  const flow: FlowResult = { name: 'auth-login', steps: {} };

  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'domcontentloaded' });
  await sleep(1000);

  flow.steps.open = await runObserve(
    stagehand,
    page,
    'auth-login-open',
    'Identify the login form fields and any error messages on the page.'
  );

  const email = credentials.email;
  const password = credentials.password;

  if (!email || !password) {
    flow.steps.login = {
      status: 'skipped',
      notes: ['Login credentials missing; login was not attempted.'],
      url: page.url(),
    };
    return flow;
  }

  try {
    const scenicButton = '[data-testid="login-scenic-signin"]';
    if (!(await hasSelector(page, Selectors.login.emailInput)) && (await hasSelector(page, scenicButton))) {
      await page.locator(scenicButton).click({ timeout: 15000 });
      await sleep(500);
    }

    const emailSelector = (await hasSelector(page, Selectors.login.emailInput))
      ? Selectors.login.emailInput
      : Selectors.login.emailInputAlt;
    const passwordSelector = (await hasSelector(page, Selectors.login.passwordInput))
      ? Selectors.login.passwordInput
      : Selectors.login.passwordInputAlt;

    await page.locator(emailSelector).fill(email);
    await page.locator(passwordSelector).fill(password);
    await page.locator(Selectors.login.submitButton).click({ timeout: 15000 });
    await sleep(2500);

    const errorMessage = await page.evaluate((selector) => {
      const el = document.querySelector(selector);
      return el?.textContent?.trim() || null;
    }, Selectors.login.errorMessage);

    if (errorMessage) {
      flow.steps.login = {
        status: 'failed',
        error: `Login error: ${errorMessage}`,
        url: page.url(),
      };
    } else if (!page.url().includes('/auth/login')) {
      flow.steps.login = { status: 'ok', url: page.url() };
    } else {
      flow.steps.login = {
        status: 'failed',
        error: 'Login did not redirect away from /auth/login.',
        url: page.url(),
      };
    }
  } catch (error) {
    const err = error as Error;
    flow.steps.login = { status: 'failed', error: err.message, url: page.url() };
  }

  flow.steps.post_login = await runObserve(
    stagehand,
    page,
    'auth-login-post',
    'Identify any login errors, warnings, or next step UI after submitting the form.'
  );

  return flow;
}

async function checkAuthenticatedPages(
  stagehand: Stagehand,
  page: PageLike,
  loggedIn: boolean
): Promise<FlowResult> {
  const flow: FlowResult = { name: 'authenticated-pages', steps: {} };

  const pages: PageCheck[] = [
    { key: 'favorites', path: '/favorites', expectAuth: true },
    { key: 'referrals', path: '/referrals', expectAuth: true },
    { key: 'wallet', path: '/wallet', expectAuth: true },
    { key: 'bookings', path: '/bookings/my-bookings', expectAuth: true },
    { key: 'profile', path: '/profile', expectAuth: true },
    { key: 'profile-personal', path: '/profile/personal', expectAuth: true },
    { key: 'profile-contact', path: '/profile/contact', expectAuth: true },
    { key: 'profile-preferences', path: '/profile/preferences', expectAuth: true },
    { key: 'profile-security', path: '/profile/security', expectAuth: true },
    { key: 'profile-verification', path: '/profile/verification', expectAuth: true },
    { key: 'notifications', path: '/notifications', expectAuth: true },
    { key: 'notifications-preferences', path: '/notifications/preferences', expectAuth: true },
    { key: 'messages', path: '/messages', expectAuth: true },
    { key: 'messages-chat', path: '/messages/chat', expectAuth: true },
    { key: 'support', path: '/support', expectAuth: true },
    { key: 'protections', path: '/protections', expectAuth: true, skipIfBlocked: true },
    { key: 'reviews-pending', path: '/reviews/pending', expectAuth: true },
    { key: 'calendar-demo', path: '/calendar-demo', expectAuth: true },
    { key: 'payouts', path: '/payouts', expectAuth: true, skipIfBlocked: true },
  ];

  if (!loggedIn) {
    for (const entry of pages) {
      flow.steps[entry.key] = { status: 'skipped', notes: ['Login failed; skipping auth-only pages.'] };
    }
    return flow;
  }

  for (const entry of pages) {
    flow.steps[entry.key] = await checkPage(stagehand, page, `auth-${entry.key}`, `${BASE_URL}${entry.path}`, {
      expectAuth: entry.expectAuth,
      skipIfBlocked: entry.skipIfBlocked,
    });
  }

  return flow;
}

async function extractAnyCarId(page: PageLike): Promise<string | null> {
  return page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a[href*="/cars/"]'));
    const link = anchors.find((anchor) => {
      const href = anchor.getAttribute('href') || '';
      if (href.includes('/cars/list')) return false;
      if (href.includes('/cars/compare')) return false;
      if (href.includes('/cars/publish')) return false;
      return /\/cars\/[^/]+$/.test(href);
    });
    if (!link) return null;
    const href = link.getAttribute('href') || '';
    const match = href.match(/\/cars\/([^/]+)$/);
    return match?.[1] || null;
  });
}

async function checkOwnerPages(
  stagehand: Stagehand,
  page: PageLike,
  loggedIn: boolean
): Promise<FlowResult> {
  const flow: FlowResult = { name: 'owner-pages', steps: {} };

  const pages: PageCheck[] = [
    { key: 'cars-my', path: '/cars/my', expectAuth: true, skipIfBlocked: true },
    { key: 'cars-publish', path: '/cars/publish', expectAuth: true, skipIfBlocked: true, observe: true, instruction: 'Identify the publish car steps and required fields.' },
    { key: 'cars-bulk-blocking', path: '/cars/bulk-blocking', expectAuth: true, skipIfBlocked: true },
    { key: 'dashboard', path: '/dashboard', expectAuth: true, skipIfBlocked: true },
    { key: 'dashboard-earnings', path: '/dashboard/earnings', expectAuth: true, skipIfBlocked: true },
    { key: 'dashboard-stats', path: '/dashboard/stats', expectAuth: true, skipIfBlocked: true },
    { key: 'dashboard-reviews', path: '/dashboard/reviews', expectAuth: true, skipIfBlocked: true },
    { key: 'dashboard-insurance', path: '/dashboard/insurance', expectAuth: true, skipIfBlocked: true },
    { key: 'dashboard-calendar', path: '/dashboard/calendar', expectAuth: true, skipIfBlocked: true },
  ];

  if (!loggedIn) {
    for (const entry of pages) {
      flow.steps[entry.key] = { status: 'skipped', notes: ['Login failed; skipping owner pages.'] };
    }
    return flow;
  }

  let ownerCarId: string | null = null;
  for (const entry of pages) {
    flow.steps[entry.key] = await checkPage(stagehand, page, `owner-${entry.key}`, `${BASE_URL}${entry.path}`, {
      expectAuth: entry.expectAuth,
      skipIfBlocked: entry.skipIfBlocked,
      observe: entry.observe,
      instruction: entry.instruction,
    });
    if (entry.key === 'cars-my' && flow.steps[entry.key]?.status === 'ok') {
      ownerCarId = await extractAnyCarId(page);
    }
  }

  if (flow.steps['cars-my']?.status === 'ok') {
    if (ownerCarId) {
      flow.steps['car-availability'] = await checkPage(
        stagehand,
        page,
        'owner-car-availability',
        `${BASE_URL}/cars/${ownerCarId}/availability`,
        { expectAuth: true, skipIfBlocked: true }
      );
      flow.steps['car-documents'] = await checkPage(
        stagehand,
        page,
        'owner-car-documents',
        `${BASE_URL}/cars/${ownerCarId}/documents`,
        { expectAuth: true, skipIfBlocked: true }
      );
    } else {
      flow.steps['car-availability'] = {
        status: 'skipped',
        notes: ['No car id found in owner inventory; availability check skipped.'],
      };
      flow.steps['car-documents'] = {
        status: 'skipped',
        notes: ['No car id found in owner inventory; documents check skipped.'],
      };
    }
  }

  return flow;
}

async function checkAdminPages(
  stagehand: Stagehand,
  page: PageLike,
  loggedIn: boolean
): Promise<FlowResult> {
  const flow: FlowResult = { name: 'admin-pages', steps: {} };
  const pages: PageCheck[] = [
    { key: 'admin-dashboard', path: '/admin', expectAuth: true },
    { key: 'admin-withdrawals', path: '/admin/withdrawals', expectAuth: true },
    { key: 'admin-refunds', path: '/admin/refunds', expectAuth: true },
    { key: 'admin-coverage-fund', path: '/admin/coverage-fund', expectAuth: true },
    { key: 'admin-fgo', path: '/admin/fgo', expectAuth: true },
    { key: 'admin-exchange-rates', path: '/admin/exchange-rates', expectAuth: true },
    { key: 'admin-claims', path: '/admin/claims', expectAuth: true },
    { key: 'admin-reviews', path: '/admin/reviews', expectAuth: true },
    { key: 'admin-verifications', path: '/admin/verifications', expectAuth: true },
    { key: 'admin-settlements', path: '/admin/settlements', expectAuth: true },
    { key: 'admin-disputes', path: '/admin/disputes', expectAuth: true },
    { key: 'admin-deposits', path: '/admin/deposits', expectAuth: true },
    { key: 'admin-system-monitoring', path: '/admin/system-monitoring', expectAuth: true },
    { key: 'admin-analytics', path: '/admin/analytics', expectAuth: true },
    { key: 'admin-feature-flags', path: '/admin/feature-flags', expectAuth: true },
    { key: 'admin-pricing', path: '/admin/pricing', expectAuth: true },
    { key: 'admin-suspended-users', path: '/admin/suspended-users', expectAuth: true },
    { key: 'admin-traffic-infractions', path: '/admin/traffic-infractions', expectAuth: true },
    { key: 'admin-accidents', path: '/admin/accidents', expectAuth: true },
    { key: 'admin-marketing', path: '/admin/marketing', expectAuth: true },
  ];

  if (!loggedIn) {
    for (const entry of pages) {
      flow.steps[entry.key] = { status: 'skipped', notes: ['Login failed; skipping admin pages.'] };
    }
    return flow;
  }

  for (const entry of pages) {
    flow.steps[entry.key] = await checkPage(stagehand, page, `admin-${entry.key}`, `${BASE_URL}${entry.path}`, {
      expectAuth: entry.expectAuth,
    });
  }

  return flow;
}

async function acceptTermsIfPresent(page: PageLike): Promise<TermsCheckResult> {
  return page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll('label'));
    const label = labels.find((el) => el.textContent?.includes('Acepto'));
    const input = label?.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
    if (!input) return { found: false, checked: null };
    if (!input.checked) input.click();
    return { found: true, checked: input.checked };
  });
}

async function extractCarHref(page: PageLike): Promise<string | null> {
  return page.evaluate(() => {
    const card = document.querySelector('[data-testid="car-card"], app-car-card');
    if (!card) return null;
    if (card instanceof HTMLAnchorElement) return card.getAttribute('href');
    const link = card.querySelector('a[href*="/cars/"]');
    return link?.getAttribute('href') || null;
  });
}

async function extractCarId(page: PageLike): Promise<string | null> {
  return page.evaluate(() => {
    const card = document.querySelector('[data-testid="car-card"], app-car-card');
    if (!card) return null;
    const attr = card.getAttribute('data-car-id');
    if (attr) return attr;
    const link = card.querySelector('a[href*="/cars/"]');
    const href = link?.getAttribute('href') || '';
    const match = href.match(/\/cars\/(.+)$/);
    return match?.[1] || null;
  });
}

async function checkBookingFlow(
  stagehand: Stagehand,
  page: PageLike,
  testData: TestData
): Promise<FlowResult> {
  const flow: FlowResult = { name: 'booking-reservation', steps: {} };
  const forcedCarId = process.env.TEST_CAR_ID;

  if (forcedCarId) {
    await page.goto(`${BASE_URL}/cars/${forcedCarId}`, { waitUntil: 'domcontentloaded' });
    await sleep(1500);
  } else {
    await page.goto(`${BASE_URL}/cars/list`, { waitUntil: 'domcontentloaded' });
    await sleep(1500);

    flow.steps.list = await runObserve(
      stagehand,
      page,
      'booking-cars-list',
      'Identify available car cards and any empty state message.'
    );

    const cards = page.locator('[data-testid="car-card"], app-car-card');
    const cardCount = await cards.count();
    if (cardCount === 0) {
      flow.steps.open = {
        status: 'failed',
        error: 'No car cards were found in /cars/list.',
        url: page.url(),
      };
      return flow;
    }

    const href = await extractCarHref(page);
    if (!href) {
      flow.steps.open = {
        status: 'failed',
        error: 'Could not extract car detail href from first card.',
        url: page.url(),
      };
      return flow;
    }

    await page.goto(`${BASE_URL}${href}`, { waitUntil: 'domcontentloaded' });
    await sleep(1500);
  }

  flow.steps.detail = await runObserve(
    stagehand,
    page,
    'booking-car-detail',
    'Identify the booking widget and any availability status for this car.'
  );

  const bookNowSelector = '[data-testid="book-now"]';
  try {
    await waitForSelector(page, bookNowSelector, 15000);
  } catch (error) {
    const err = error as Error;
    flow.steps.book_now_visible = { status: 'failed', error: err.message, url: page.url() };
    return flow;
  }

  const fallbackFrom = page.locator('app-date-range-picker [data-testid="date-fallback-from"]');
  const fallbackTo = page.locator('app-date-range-picker [data-testid="date-fallback-to"]');
  if ((await fallbackFrom.count()) > 0 && (await fallbackTo.count()) > 0) {
    await fallbackFrom.fill(testData.booking.dates.start);
    await fallbackTo.fill(testData.booking.dates.end);
  }

  await acceptTermsIfPresent(page);
  await sleep(500);

  try {
    await page.locator(bookNowSelector).click({ timeout: 15000 });
  } catch (error) {
    const err = error as Error;
    flow.steps.book = { status: 'failed', error: err.message, url: page.url() };
    return flow;
  }

  await sleep(2000);

  flow.steps.after_book = await runObserve(
    stagehand,
    page,
    'booking-after-book',
    'Identify booking errors or confirmation elements after clicking Book Now.'
  );

  return flow;
}

async function checkPaymentFlow(
  stagehand: Stagehand,
  page: PageLike,
  testData: TestData
): Promise<FlowResult> {
  const flow: FlowResult = { name: 'payment-flow', steps: {} };
  const forcedCarId = process.env.TEST_CAR_ID;

  let carId = forcedCarId || null;

  if (!carId) {
    await page.goto(`${BASE_URL}/cars/list`, { waitUntil: 'domcontentloaded' });
    await sleep(1500);

    const cards = page.locator('[data-testid="car-card"], app-car-card');
    const cardCount = await cards.count();
    if (cardCount === 0) {
      flow.steps.marketplace = {
        status: 'failed',
        error: 'No cars available in marketplace; cannot build payment URL.',
        url: page.url(),
      };
      return flow;
    }
    carId = await extractCarId(page);
  }

  if (!carId) {
    flow.steps.marketplace = {
      status: 'failed',
      error: 'Could not extract car id from marketplace.',
      url: page.url(),
    };
    return flow;
  }

  const params = new URLSearchParams({
    carId,
    startDate: new Date(testData.booking.dates.start).toISOString(),
    endDate: new Date(testData.booking.dates.end).toISOString(),
  });

  await page.goto(`${BASE_URL}/bookings/detail-payment?${params.toString()}`, {
    waitUntil: 'domcontentloaded',
  });
  await sleep(2000);

  if (page.url().includes('/profile/verification')) {
    flow.steps.payment_page = {
      status: 'failed',
      error: 'Payment flow redirected to profile verification.',
      url: page.url(),
    };
    return flow;
  }

  flow.steps.payment_page = await runObserve(
    stagehand,
    page,
    'payment-page',
    'Identify payment page summary, errors, and the MercadoPago form area.'
  );

  return flow;
}

async function runDailyScenario(options: {
  label: string;
  credentials?: UserCredentials;
  includePublic?: boolean;
  includeAuthPages?: boolean;
  includeBooking?: boolean;
  includePayment?: boolean;
  includeOwnerPages?: boolean;
  includeAdminPages?: boolean;
}): Promise<FlowResult[]> {
  const model = process.env.STAGEHAND_MODEL || 'google/gemini-2.5-flash';
  const apiKey =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    '';

  if (!apiKey) {
    console.error('Missing LLM API key for Stagehand. Set GOOGLE_GENERATIVE_AI_API_KEY or GEMINI_API_KEY.');
    process.exit(1);
  }

  const stagehand = new Stagehand({
    env: 'LOCAL',
    model,
  });

  await stagehand.init();
  const existingPages = stagehand.context.pages();
  const page = (existingPages[0] || (await stagehand.context.newPage())) as PageLike;

  await page.addInitScript(() => {
    localStorage.setItem('autorentar_debug', 'true');
  });

  const testData = new TestData();
  const loginCredentials = options.credentials || testData.validUser;
  const report: FlowResult[] = [];

  try {
    if (options.includePublic) {
      report.push(await checkPublicPages(stagehand, page));
    }

    const loginResult = await checkLogin(stagehand, page, loginCredentials);
    report.push(loginResult);

    const loggedIn = Object.values(loginResult.steps).some((step) => step.status === 'ok');
    if (options.includeAuthPages) {
      report.push(await checkAuthenticatedPages(stagehand, page, loggedIn));
    }
    if (options.includeOwnerPages) {
      report.push(await checkOwnerPages(stagehand, page, loggedIn));
    }
    if (options.includeAdminPages) {
      report.push(await checkAdminPages(stagehand, page, loggedIn));
    }

    if (options.includeBooking) {
      if (loggedIn) {
        report.push(await checkBookingFlow(stagehand, page, testData));
      } else {
        report.push({ name: 'booking-reservation', steps: { skipped: { status: 'skipped', notes: ['Login failed'] } } });
      }
    }

    if (options.includePayment) {
      if (loggedIn) {
        report.push(await checkPaymentFlow(stagehand, page, testData));
      } else {
        report.push({ name: 'payment-flow', steps: { skipped: { status: 'skipped', notes: ['Login failed'] } } });
      }
    }
  } finally {
    await stagehand.close();
  }

  return report.map((flow) => ({
    ...flow,
    name: `${options.label}-${flow.name}`,
  }));
}

function summarizeResults(report: FlowResult[]): { failures: string[]; skipped: string[]; total: number } {
  const failures: string[] = [];
  const skipped: string[] = [];
  let total = 0;

  for (const flow of report) {
    for (const [step, result] of Object.entries(flow.steps)) {
      total += 1;
      const label = `${flow.name}.${step}`;
      if (result.status === 'failed') {
        failures.push(`${label}: ${result.error || 'unknown error'}`);
      } else if (result.status === 'skipped') {
        skipped.push(label);
      }
    }
  }

  return { failures, skipped, total };
}

async function main(): Promise<void> {
  ensureDir(REPORT_DIR);

  const report: FlowResult[] = [];
  report.push(
    ...(await runDailyScenario({
      label: 'renter',
      credentials: {
        email: process.env.TEST_USER_EMAIL || '',
        password: process.env.TEST_USER_PASSWORD || '',
      },
      includePublic: true,
      includeAuthPages: true,
      includeBooking: true,
      includePayment: true,
    }))
  );

  const ownerEmail = process.env.TEST_OWNER_EMAIL;
  const ownerPassword = process.env.TEST_OWNER_PASSWORD;
  if (ownerEmail && ownerPassword) {
    report.push(
      ...(await runDailyScenario({
        label: 'owner',
        credentials: { email: ownerEmail, password: ownerPassword },
        includeAuthPages: false,
        includeOwnerPages: true,
        includeBooking: false,
        includePayment: false,
      }))
    );
  } else {
    report.push({
      name: 'owner-auth',
      steps: {
        login: {
          status: 'skipped',
          notes: ['TEST_OWNER_EMAIL or TEST_OWNER_PASSWORD not set; owner checks skipped.'],
        },
      },
    });
  }

  const adminEmail = process.env.TEST_ADMIN_EMAIL;
  const adminPassword = process.env.TEST_ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    report.push(
      ...(await runDailyScenario({
        label: 'admin',
        credentials: { email: adminEmail, password: adminPassword },
        includeAuthPages: false,
        includeAdminPages: true,
        includeBooking: false,
        includePayment: false,
      }))
    );
  } else {
    report.push({
      name: 'admin-auth',
      steps: {
        login: {
          status: 'skipped',
          notes: ['TEST_ADMIN_EMAIL or TEST_ADMIN_PASSWORD not set; admin checks skipped.'],
        },
      },
    });
  }

  const summary = summarizeResults(report);

  const reportPath = path.join(REPORT_DIR, `stagehand-daily-report-${nowStamp()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  const mdLines: string[] = [];
  mdLines.push('# Stagehand Daily Platform Report');
  mdLines.push('');
  mdLines.push(`Date: ${new Date().toISOString()}`);
  mdLines.push(`Base URL: ${BASE_URL}`);
  mdLines.push(`Model: ${process.env.STAGEHAND_MODEL || 'google/gemini-2.5-flash'}`);
  mdLines.push('');
  mdLines.push(`Total steps: ${summary.total}`);
  mdLines.push(`Failures: ${summary.failures.length}`);
  mdLines.push(`Skipped: ${summary.skipped.length}`);
  mdLines.push('');

  if (summary.failures.length) {
    mdLines.push('## Failures');
    for (const failure of summary.failures) mdLines.push(`- ${failure}`);
    mdLines.push('');
  }

  if (summary.skipped.length) {
    mdLines.push('## Skipped');
    for (const skipped of summary.skipped) mdLines.push(`- ${skipped}`);
    mdLines.push('');
  }

  for (const flow of report) {
    mdLines.push(`## ${flow.name}`);
    for (const [step, result] of Object.entries(flow.steps)) {
      mdLines.push(`- ${step}: ${result.status}`);
      if (result.error) mdLines.push(`  - error: ${result.error}`);
      if (result.url) mdLines.push(`  - url: ${result.url}`);
      if (result.observationsPath) mdLines.push(`  - observations: ${result.observationsPath}`);
      if (result.screenshotPath) mdLines.push(`  - screenshot: ${result.screenshotPath}`);
      if (result.notes?.length) {
        for (const note of result.notes) mdLines.push(`  - note: ${note}`);
      }
    }
    mdLines.push('');
  }

  const mdPath = path.join(REPORT_DIR, `stagehand-daily-report-${nowStamp()}.md`);
  fs.writeFileSync(mdPath, mdLines.join('\n'));

  console.log(`Stagehand daily report saved to ${reportPath}`);
  console.log(`Stagehand daily report (md) saved to ${mdPath}`);

  if (FAIL_ON_ERROR && summary.failures.length) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Stagehand daily scan failed:', error);
  process.exit(1);
});
