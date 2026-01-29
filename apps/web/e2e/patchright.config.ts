/**
 * Patchright E2E Test Configuration
 *
 * Uses Patchright (patched Chromium) to bypass anti-bot detection
 * especially for MercadoPago payment testing.
 */
import { chromium, type BrowserContext, type Page } from 'patchright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface TestConfig {
  baseUrl: string;
  timeout: number;
  headless: boolean;
  slowMo: number;
  screenshotOnFailure: boolean;
  videoRecording: boolean;
  reportsDir: string;
  browserProfile: string;
}

export const config: TestConfig = {
  baseUrl: process.env.BASE_URL || 'http://localhost:4200',
  timeout: 30000,
  headless: process.env.HEADLESS !== 'false',
  slowMo: parseInt(process.env.SLOW_MO || '0', 10),
  screenshotOnFailure: true,
  videoRecording: process.env.RECORD_VIDEO === 'true',
  reportsDir: path.join(__dirname, 'reports'),
  browserProfile: process.env.BROWSER_PROFILE || path.join(__dirname, '.browser-profile'),
};

// Ensure reports directory exists
if (!fs.existsSync(config.reportsDir)) {
  fs.mkdirSync(config.reportsDir, { recursive: true });
}

/**
 * Create browser context with Patchright
 */
export async function createBrowserContext(): Promise<BrowserContext> {
  const context = await chromium.launchPersistentContext(config.browserProfile, {
    headless: config.headless,
    slowMo: config.slowMo,
    viewport: { width: 1280, height: 720 },
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Buenos_Aires',
  });

  return context;
}

/**
 * Create new page with debug enabled
 */
export async function createPage(context: BrowserContext): Promise<Page> {
  const page = await context.newPage();

  // Enable debug mode via localStorage
  await page.addInitScript(() => {
    localStorage.setItem('autorentar_debug', 'true');
  });

  return page;
}

/**
 * Navigate with debug enabled
 */
export async function navigateTo(page: Page, path: string): Promise<void> {
  const url = `${config.baseUrl}${path}${path.includes('?') ? '&' : '?'}debug=1`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: config.timeout });
}

/**
 * Take screenshot on test failure
 */
export async function screenshotOnFail(page: Page, testName: string): Promise<string | null> {
  if (!config.screenshotOnFailure) return null;

  const screenshotPath = path.join(
    config.reportsDir,
    `${testName}-${Date.now()}.png`
  );

  await page.screenshot({ path: screenshotPath, fullPage: true });
  return screenshotPath;
}

/**
 * Save test logs to file
 */
export async function saveTestLogs(page: Page, testName: string): Promise<string> {
  const logs = await page.evaluate(() => {
    const debug = (window as Window & { __AR_DEBUG__?: { exportLogs: () => string } }).__AR_DEBUG__;
    return debug?.exportLogs() || '{}';
  });

  const logPath = path.join(config.reportsDir, `${testName}-logs.json`);
  fs.writeFileSync(logPath, logs);
  return logPath;
}

/**
 * Close browser context
 */
export async function closeBrowser(context: BrowserContext): Promise<void> {
  await context.close();
}
