/**
 * Stagehand E2E Test: Publish Car Flow
 *
 * Validates the complete car publication flow:
 * 1. Login with test user
 * 2. Navigate to /cars/publish
 * 3. Select brand (Toyota)
 * 4. Select year (2022)
 * 5. Select model (Corolla)
 * 6. Generate AI photos
 * 7. Continue through remaining steps
 *
 * Known Issues Found During Debug (2026-01-30):
 * - Bug #1: AI photos generate but don't display (FIXED in publish-car-v2.page.ts)
 * - Bug #2: FIPE API rate limiting (429 errors) (FIXED in pricing.service.ts)
 *   - Reduced batch size from 10 to 3
 *   - Added 500ms delay between batches
 *   - Added caching for model years
 *   - Added retry with exponential backoff for 429 responses
 *
 * Run: GEMINI_API_KEY=xxx bun test-publish-car-flow.ts
 */

import { Stagehand } from '@browserbasehq/stagehand';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:4200';
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'admin.test@autorenta.com';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'TestAdmin123!';
const HEADLESS = process.env.CI === 'true';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots', 'publish-car-flow');

// Console log capture
interface ConsoleLog {
  timestamp: string;
  type: string;
  text: string;
  location?: string;
}
const consoleLogs: ConsoleLog[] = [];

// Test result tracking
interface TestStep {
  name: string;
  status: 'pending' | 'passed' | 'failed';
  duration?: number;
  error?: string;
  screenshot?: string;
}

const testSteps: TestStep[] = [];

async function saveScreenshot(page: any, name: string): Promise<string> {
  const filename = `${Date.now()}-${name}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);

  // Ensure directory exists
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  await page.screenshot({ path: filepath });
  return filepath;
}

async function runStep(
  name: string,
  fn: () => Promise<void>,
  page: any
): Promise<boolean> {
  const step: TestStep = { name, status: 'pending' };
  testSteps.push(step);

  const startTime = Date.now();
  console.log(`\n📍 Step: ${name}`);

  try {
    await fn();
    step.status = 'passed';
    step.duration = Date.now() - startTime;
    step.screenshot = await saveScreenshot(page, name.replace(/\s+/g, '-'));
    console.log(`   ✅ Passed (${step.duration}ms)`);
    return true;
  } catch (error) {
    step.status = 'failed';
    step.duration = Date.now() - startTime;
    step.error = error instanceof Error ? error.message : String(error);
    step.screenshot = await saveScreenshot(page, `${name.replace(/\s+/g, '-')}-FAILED`);
    console.log(`   ❌ Failed: ${step.error}`);
    return false;
  }
}

async function main() {
  console.log('🚗 AutoRenta E2E Test: Publish Car Flow');
  console.log('========================================');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Test User: ${TEST_USER_EMAIL}`);
  console.log(`Headless: ${HEADLESS}`);
  console.log('');

  const stagehand = new Stagehand({
    env: 'LOCAL',
    model: 'google/gemini-2.0-flash',
    headless: HEADLESS,
    verbose: 1,
  });

  try {
    await stagehand.init();
    const page = stagehand.context.pages()[0];

    // Capture console logs
    page.on('console', (msg) => {
      const log: ConsoleLog = {
        timestamp: new Date().toISOString(),
        type: msg.type(),
        text: msg.text(),
        location: msg.location()?.url,
      };
      consoleLogs.push(log);

      if (msg.type() === 'error') {
        console.log(`   🔴 Console Error: ${msg.text().slice(0, 100)}`);
      }
    });

    // =========================================================================
    // STEP 1: Navigate to Login
    // =========================================================================
    await runStep('Navigate to login page', async () => {
      await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000); // Wait for Angular CSR
    }, page);

    // =========================================================================
    // STEP 2: Login
    // =========================================================================
    await runStep('Login with test user', async () => {
      await stagehand.act(`type "${TEST_USER_EMAIL}" in the email input field`);
      await stagehand.act(`type "${TEST_USER_PASSWORD}" in the password input field`);
      await stagehand.act('click the green "Ingresar" button');
      await page.waitForTimeout(3000); // Wait for auth redirect
    }, page);

    // =========================================================================
    // STEP 3: Navigate to Publish
    // =========================================================================
    await runStep('Navigate to publish car page', async () => {
      await page.goto(`${BASE_URL}/cars/publish`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
    }, page);

    // =========================================================================
    // STEP 4: Select Brand
    // =========================================================================
    await runStep('Select Toyota brand', async () => {
      await stagehand.act('click on the Toyota brand option');
      await page.waitForTimeout(1000);
    }, page);

    // =========================================================================
    // STEP 5: Click Continue (after brand)
    // =========================================================================
    await runStep('Click Continue after brand selection', async () => {
      await stagehand.act('click the green "Continuar" button');
      await page.waitForTimeout(1000);
    }, page);

    // =========================================================================
    // STEP 6: Select Year
    // =========================================================================
    await runStep('Select year 2022', async () => {
      await stagehand.act('click on year 2022 option');
      await page.waitForTimeout(1000);
    }, page);

    // =========================================================================
    // STEP 7: Click Continue (after year)
    // =========================================================================
    await runStep('Click Continue after year selection', async () => {
      await stagehand.act('click the green "Continuar" button');
      await page.waitForTimeout(3000); // Wait for models to load
    }, page);

    // =========================================================================
    // STEP 8: Select Model
    // =========================================================================
    await runStep('Select Corolla model', async () => {
      // Wait for models to load (may have skeleton loaders)
      await page.waitForTimeout(2000);
      await stagehand.act('click on the first Corolla model option');
      await page.waitForTimeout(1000);
    }, page);

    // =========================================================================
    // STEP 9: Click Continue (after model)
    // =========================================================================
    await runStep('Click Continue after model selection', async () => {
      await stagehand.act('click the green "Continuar" button');
      await page.waitForTimeout(2000);
    }, page);

    // =========================================================================
    // STEP 10: Generate AI Photos
    // =========================================================================
    await runStep('Generate AI photos', async () => {
      await stagehand.act('click the "GENERAR" button to generate AI photos');
      // Wait for AI generation (can take up to 30 seconds)
      await page.waitForTimeout(25000);
    }, page);

    // =========================================================================
    // STEP 11: Verify Photos Displayed
    // =========================================================================
    await runStep('Verify photos are displayed', async () => {
      const photosSchema = z.object({
        photoCount: z.number(),
        hasPhotosVisible: z.boolean(),
      });

      const result = await stagehand.extract({
        instruction: 'Count how many photos are shown in the photo upload section. Look for the photo count indicator (e.g., "3/10 fotos") and check if there are visible photo thumbnails.',
        schema: photosSchema,
      });

      console.log(`   📸 Photos found: ${result.photoCount}`);

      if (result.photoCount < 3) {
        throw new Error(`Expected at least 3 photos, found ${result.photoCount}`);
      }
    }, page);

    // =========================================================================
    // STEP 12: Continue to next step (mileage, price, etc.)
    // =========================================================================
    await runStep('Click Continue to next step', async () => {
      await stagehand.act('click the green "Continuar" button');
      await page.waitForTimeout(2000);
    }, page);

    // =========================================================================
    // FINAL: Check for 429 errors (FIPE rate limiting bug)
    // =========================================================================
    const fipeErrors = consoleLogs.filter(
      log => log.text.includes('429') || log.text.includes('Too Many Requests')
    );

    if (fipeErrors.length > 0) {
      console.log('\n⚠️  WARNING: FIPE API Rate Limiting Detected');
      console.log(`   Found ${fipeErrors.length} rate limit errors (429)`);
      console.log('   This is a known bug - see Bug #2 in test comments');
    }

  } catch (error) {
    console.error('\n💥 Test failed with error:', error);
  } finally {
    // Save logs
    const logsDir = path.join(__dirname, 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(logsDir, 'publish-car-console-logs.json'),
      JSON.stringify(consoleLogs, null, 2)
    );

    fs.writeFileSync(
      path.join(logsDir, 'publish-car-test-results.json'),
      JSON.stringify({
        timestamp: new Date().toISOString(),
        steps: testSteps,
        summary: {
          total: testSteps.length,
          passed: testSteps.filter(s => s.status === 'passed').length,
          failed: testSteps.filter(s => s.status === 'failed').length,
        },
        knownBugs: [
          {
            id: 1,
            description: 'AI photos generate but dont display in PhotoUploadAIComponent',
            status: 'FIXED',
            fix: 'Added uploadedPhotosForComponent computed + initialPhotos binding',
            file: 'publish-car-v2.page.ts',
          },
          {
            id: 2,
            description: 'FIPE API rate limiting (429) when fetching models by year',
            status: 'FIXED',
            fix: 'Reduced batch size to 3, added 500ms delay, caching, and retry with backoff',
            file: 'pricing.service.ts',
          },
        ],
      }, null, 2)
    );

    // Summary
    console.log('\n========================================');
    console.log('📊 Test Summary');
    console.log('========================================');

    const passed = testSteps.filter(s => s.status === 'passed').length;
    const failed = testSteps.filter(s => s.status === 'failed').length;

    console.log(`Total Steps: ${testSteps.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Console Errors: ${consoleLogs.filter(l => l.type === 'error').length}`);
    console.log(`Screenshots: ${SCREENSHOTS_DIR}`);
    console.log(`Logs: ${path.join(__dirname, 'logs')}`);

    if (failed > 0) {
      console.log('\n❌ TEST FAILED');
      process.exit(1);
    } else {
      console.log('\n✅ TEST PASSED');
      process.exit(0);
    }

    await stagehand.close();
  }
}

main();
