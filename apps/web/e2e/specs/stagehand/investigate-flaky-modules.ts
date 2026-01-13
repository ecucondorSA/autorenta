import { Stagehand } from '@browserbasehq/stagehand';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

import { TestData } from '../../fixtures/test-data';
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

const BASE_URL = process.env.BASE_URL || 'http://localhost:4200';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const E2E_ROOT = path.resolve(__dirname, '..', '..');
const REPO_ROOT = path.resolve(E2E_ROOT, '..', '..', '..');
const REPORT_DIR = path.join(E2E_ROOT, 'reports', 'stagehand');

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

async function hasSelector(page: PageLike, selector: string): Promise<boolean> {
  try {
    return await page.evaluate((sel) => !!document.querySelector(sel), selector);
  } catch {
    return false;
  }
}

async function waitForUrl(
  page: PageLike,
  predicate: (url: string) => boolean,
  timeoutMs = 15000
): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const url = page.url();
    if (predicate(url)) return url;
    await sleep(300);
  }
  throw new Error('Timeout waiting for URL condition');
}

async function getLoginErrorMessage(page: PageLike): Promise<string | null> {
  try {
    return await page.evaluate((selector) => {
      const el = document.querySelector(selector);
      return el?.textContent?.trim() || null;
    }, Selectors.login.errorMessage);
  } catch {
    return null;
  }
}

async function checkLogin(page: PageLike, stagehand: Stagehand, testData: TestData): Promise<FlowResult> {
  const flow: FlowResult = { name: 'auth-login', steps: {} };

  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'domcontentloaded' });
  await sleep(1000);

  flow.steps.open = await runObserve(
    stagehand,
    page,
    'auth-login-open',
    'Identify the login form fields and any error messages on the page.'
  );

  const email = testData.validUser.email;
  const password = testData.validUser.password;

  if (!password) {
    flow.steps.login = {
      status: 'skipped',
      notes: ['TEST_USER_PASSWORD is not set; login was not attempted.'],
      url: page.url(),
    };
    return flow;
  }

  try {
    // Scenic mode: some layouts hide the form behind a CTA
    const scenicButton = '[data-testid="login-scenic-signin"]';
    if (!(await hasSelector(page, Selectors.login.emailInput)) && (await hasSelector(page, scenicButton))) {
      await page.locator(scenicButton).click({ timeout: 15000 });
      await sleep(500);
    }

    await page.locator(Selectors.login.emailInput).fill(email);
    await page.locator(Selectors.login.passwordInput).fill(password);
    await page.locator(Selectors.login.submitButton).click({ timeout: 15000 });
    await sleep(2500);

    const errorMessage = await getLoginErrorMessage(page);
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

async function observePage(
  stagehand: Stagehand,
  page: PageLike,
  name: string,
  url: string,
  instruction: string
): Promise<StepResult> {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await sleep(1500);
  return runObserve(stagehand, page, name, instruction);
}

async function checkPublicPages(page: PageLike, stagehand: Stagehand): Promise<FlowResult> {
  const flow: FlowResult = { name: 'public-pages', steps: {} };

  flow.steps.home = await observePage(
    stagehand,
    page,
    'public-home',
    `${BASE_URL}/`,
    'Identify the main navigation, search inputs, and any hero CTAs on the home page.'
  );

  flow.steps.marketplace = await observePage(
    stagehand,
    page,
    'public-marketplace',
    `${BASE_URL}/cars/list`,
    'Identify car cards, filters, and empty states in the marketplace listing.'
  );

  flow.steps.register = await observePage(
    stagehand,
    page,
    'public-register',
    `${BASE_URL}/auth/register`,
    'Identify registration form fields and any validation or guidance text.'
  );

  return flow;
}

async function checkBookingFlow(page: PageLike, stagehand: Stagehand, testData: TestData): Promise<FlowResult> {
  const flow: FlowResult = { name: 'booking-reservation', steps: {} };

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
  if (cardCount == 0) {
    flow.steps.open = {
      status: 'failed',
      error: 'No car cards were found in /cars/list.',
      url: page.url(),
    };
    return flow;
  }

  const href = await page.evaluate(() => {
    const card = document.querySelector('[data-testid="car-card"], app-car-card');
    if (!card) return null;
    if (card instanceof HTMLAnchorElement) return card.getAttribute('href');
    const link = card.querySelector('a[href*="/cars/"]');
    return link?.getAttribute('href') || null;
  });

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

async function checkPaymentFlow(page: PageLike, stagehand: Stagehand, testData: TestData): Promise<FlowResult> {
  const flow: FlowResult = { name: 'payment-flow', steps: {} };

  await page.goto(`${BASE_URL}/cars/list`, { waitUntil: 'domcontentloaded' });
  await sleep(1500);

  const cards = page.locator('[data-testid="car-card"], app-car-card');
  const cardCount = await cards.count();

  if (cardCount == 0) {
    flow.steps.marketplace = {
      status: 'failed',
      error: 'No cars available in marketplace; cannot build payment URL.',
      url: page.url(),
    };
    return flow;
  }

  const carId = await page.evaluate(() => {
    const card = document.querySelector('[data-testid="car-card"], app-car-card');
    if (!card) return null;
    const attr = card.getAttribute('data-car-id');
    if (attr) return attr;
    const link = card.querySelector('a[href*="/cars/"]');
    const href = link?.getAttribute('href') || '';
    const match = href.match(/\/cars\/(.+)$/);
    return match?.[1] || null;
  });

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

  flow.steps.payment_page = await runObserve(
    stagehand,
    page,
    'payment-page',
    'Identify payment page summary, errors, and the MercadoPago form area.'
  );

  return flow;
}

async function checkAuthenticatedPages(
  page: PageLike,
  stagehand: Stagehand,
  loggedIn: boolean
): Promise<FlowResult> {
  const flow: FlowResult = { name: 'authenticated-pages', steps: {} };

  if (!loggedIn) {
    flow.steps.wallet = { status: 'skipped', notes: ['Login failed; skipping auth-only pages.'] };
    flow.steps.bookings = { status: 'skipped', notes: ['Login failed; skipping auth-only pages.'] };
    flow.steps.profile = { status: 'skipped', notes: ['Login failed; skipping auth-only pages.'] };
    flow.steps.publish = { status: 'skipped', notes: ['Login failed; skipping auth-only pages.'] };
    return flow;
  }

  flow.steps.wallet = await observePage(
    stagehand,
    page,
    'auth-wallet',
    `${BASE_URL}/wallet`,
    'Identify wallet balance, deposit/withdraw actions, and any empty states.'
  );

  flow.steps.bookings = await observePage(
    stagehand,
    page,
    'auth-bookings',
    `${BASE_URL}/bookings/my-bookings`,
    'Identify booking list, tabs, and empty states.'
  );

  flow.steps.profile = await observePage(
    stagehand,
    page,
    'auth-profile',
    `${BASE_URL}/profile`,
    'Identify profile sections, edit controls, and verification status elements.'
  );

  flow.steps.publish = await observePage(
    stagehand,
    page,
    'auth-publish',
    `${BASE_URL}/cars/publish`,
    'Identify publish-car flow entry points or access restrictions.'
  );

  return flow;
}

async function main(): Promise<void> {
  ensureDir(REPORT_DIR);

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
  const report: FlowResult[] = [];

  try {
    report.push(await checkPublicPages(page, stagehand));

    const loginResult = await checkLogin(page, stagehand, testData);
    report.push(loginResult);

    const loggedIn = Object.values(loginResult.steps).some((step) => step.status === 'ok');
    report.push(await checkAuthenticatedPages(page, stagehand, loggedIn));

    report.push(await checkBookingFlow(page, stagehand, testData));
    report.push(await checkPaymentFlow(page, stagehand, testData));
  } finally {
    await stagehand.close();
  }

  const reportPath = path.join(REPORT_DIR, `stagehand-report-${nowStamp()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  const mdLines: string[] = [];
  mdLines.push('# Stagehand QA Investigation');
  mdLines.push('');
  mdLines.push(`Date: ${new Date().toISOString()}`);
  mdLines.push(`Base URL: ${BASE_URL}`);
  mdLines.push(`Model: ${model}`);
  mdLines.push('');

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

  const mdPath = path.join(REPORT_DIR, `stagehand-report-${nowStamp()}.md`);
  fs.writeFileSync(mdPath, mdLines.join('\n'));

  console.log(`Stagehand report saved to ${reportPath}`);
  console.log(`Stagehand report (md) saved to ${mdPath}`);
}

main().catch((error) => {
  console.error('Stagehand investigation failed:', error);
  process.exit(1);
});
