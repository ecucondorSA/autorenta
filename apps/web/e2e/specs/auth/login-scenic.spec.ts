/**
 * Login Scenic E2E Test
 *
 * Validates the immersive login background (HDRI) loads and animates.
 * Does NOT require credentials.
 */

import {
  runTests,
  printReport,
  saveReport,
  clearSession,
  type TestContext,
} from '../../fixtures/test-fixtures';

async function testScenicBackgroundAnimates(ctx: TestContext): Promise<void> {
  // Ensure GuestGuard doesn't redirect due to persistent auth
  await ctx.loginPage.navigate('/');
  await clearSession(ctx);

  await ctx.loginPage.goto();

  // Scenic CTAs visible
  await ctx.page.locator('[data-testid="login-scenic-signin"]').waitFor({ state: 'visible', timeout: 15000 });
  await ctx.page.locator('[data-testid="login-scenic-register"]').waitFor({ state: 'visible', timeout: 15000 });

  // Canvas is present
  await ctx.page.locator('app-hdri-background canvas').waitFor({ state: 'visible', timeout: 15000 });

  // Verify WebGL loop is running by checking rotation values (debug dataset)
  const r1 = await ctx.page.evaluate(() => {
    const canvas = document.querySelector('app-hdri-background canvas');
    if (!(canvas instanceof HTMLCanvasElement)) return null;
    return {
      rotationY: canvas.dataset.rotationY ? Number(canvas.dataset.rotationY) : null,
      highRes: canvas.dataset.highRes || null,
    };
  });

  await ctx.page.waitForTimeout(1400);

  const r2 = await ctx.page.evaluate(() => {
    const canvas = document.querySelector('app-hdri-background canvas');
    if (!(canvas instanceof HTMLCanvasElement)) return null;
    return {
      rotationY: canvas.dataset.rotationY ? Number(canvas.dataset.rotationY) : null,
      highRes: canvas.dataset.highRes || null,
    };
  });

  if (!r1 || !r2) {
    throw new Error('Could not read HDRI debug state');
  }

  if (r1.rotationY === null || r2.rotationY === null) {
    throw new Error('HDRI debug rotationY not available (autorentar_debug missing?)');
  }

  if (r1.rotationY === r2.rotationY) {
    throw new Error('HDRI rotationY did not change over time (rotation may be stalled)');
  }
}

const tests = [{ name: 'login-scenic-background-animates', fn: testScenicBackgroundAnimates }];

async function main(): Promise<void> {
  console.log('\n========== LOGIN SCENIC E2E TEST ==========\n');
  console.log(`Base URL: ${process.env.BASE_URL || 'http://localhost:4200'}`);
  console.log(`Headless: ${process.env.HEADLESS !== 'false'}`);

  const results = await runTests(tests, {
    suite: 'auth',
    screenshotOnFailure: true,
    saveLogsOnFailure: true,
  });

  printReport(results);
  const reportPath = saveReport(results, 'login-scenic-tests-report.json');
  console.log(`\nReport saved to: ${reportPath}`);

  const failed = results.filter((r) => !r.passed).length;
  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
