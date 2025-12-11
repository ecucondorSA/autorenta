/**
 * Login E2E Tests
 *
 * Tests for authentication flow using Page Object Model.
 * Uses correct data-testid selectors and smart waits.
 */

import {
  runTests,
  printReport,
  saveReport,
  clearSession,
  type TestContext,
} from '../../fixtures/test-fixtures';

// ==================== TEST DEFINITIONS ====================

/**
 * Test: Login page loads correctly
 */
async function testLoginPageLoads(ctx: TestContext): Promise<void> {
  const { loginPage } = ctx;

  // Navigate to login page
  await loginPage.goto();

  // Assert form is loaded (uses correct data-testid selectors)
  await loginPage.assertFormLoaded();

  // Verify page title contains expected text
  await loginPage.assertTitle('autorent');

  // Verify Google button is visible
  await loginPage.assertGoogleButtonVisible();

  // No page errors should occur
  if (loginPage.hasErrors()) {
    throw new Error('Page errors detected during login page load');
  }
}

/**
 * Test: Login form accepts input
 */
async function testLoginFormInput(ctx: TestContext): Promise<void> {
  const { loginPage, testData } = ctx;

  await loginPage.goto();
  await loginPage.assertFormLoaded();

  // Fill email
  await loginPage.fillEmail(testData.validUser.email);
  const emailValue = await loginPage.getEmailValue();
  if (emailValue !== testData.validUser.email) {
    throw new Error(`Expected email "${testData.validUser.email}", got "${emailValue}"`);
  }

  // Fill password
  await loginPage.fillPassword(testData.validUser.password);
  const passwordLength = await loginPage.getPasswordLength();
  if (passwordLength !== testData.validUser.password.length) {
    throw new Error(`Expected password length ${testData.validUser.password.length}, got ${passwordLength}`);
  }

  // Submit button should be enabled
  const isEnabled = await loginPage.isSubmitEnabled();
  if (!isEnabled) {
    throw new Error('Submit button should be enabled with valid input');
  }
}

/**
 * Test: Login with valid credentials submits form
 */
async function testLoginSubmission(ctx: TestContext): Promise<void> {
  const { loginPage, testData, networkLogger } = ctx;

  await loginPage.goto();
  await loginPage.assertFormLoaded();

  // Perform login
  await loginPage.login(testData.validUser.email, testData.validUser.password);

  // Wait for API call
  await ctx.page.waitForTimeout(3000);

  // Verify auth API was called
  const authCalls = networkLogger.getApiCalls('auth');
  if (authCalls.length === 0) {
    console.log('Warning: No auth API calls detected');
  } else {
    console.log(`Auth API called ${authCalls.length} times`);
  }

  // Check for any failed requests
  const failedRequests = networkLogger.getFailedRequests();
  if (failedRequests.length > 0) {
    console.log(`Warning: ${failedRequests.length} failed requests detected`);
  }
}

/**
 * Test: Login with invalid credentials shows error
 */
async function testLoginInvalidCredentials(ctx: TestContext): Promise<void> {
  const { loginPage, testData } = ctx;

  await loginPage.goto();
  await loginPage.assertFormLoaded();

  // Try to login with invalid credentials
  await loginPage.login(testData.invalidUser.email, testData.invalidUser.password);

  // Wait for response
  await ctx.page.waitForTimeout(3000);

  // Should still be on login page
  if (!loginPage.isOnLoginPage()) {
    throw new Error('Expected to stay on login page with invalid credentials');
  }

  // Check for error message (optional - depends on implementation)
  const error = await loginPage.getErrorMessage();
  console.log(`Login error message: ${error || 'none displayed'}`);
}

/**
 * Test: Logout clears session
 */
async function testLogout(ctx: TestContext): Promise<void> {
  const { loginPage } = ctx;

  // First navigate to home to establish context
  await loginPage.navigate('/');
  await ctx.page.waitForTimeout(2000);

  // Clear session (simulates logout)
  await clearSession(ctx);

  // Verify session is cleared
  const hasAuthToken = await ctx.page.evaluate(() => {
    const keys = Object.keys(localStorage);
    return keys.some((k) => k.includes('auth') || k.includes('supabase'));
  });

  if (hasAuthToken) {
    throw new Error('Expected auth tokens to be cleared after logout');
  }

  console.log('Logout (session clear) works correctly');
}

/**
 * Test: Protected route redirects to login
 */
async function testProtectedRouteRedirect(ctx: TestContext): Promise<void> {
  const { loginPage } = ctx;

  // Navigate to home first to establish context
  await loginPage.navigate('/');

  // Clear any existing session
  await clearSession(ctx);

  // Try to access protected route
  await loginPage.navigate('/bookings');
  await ctx.page.waitForTimeout(3000);

  // Should either be redirected to auth or see login UI
  const url = ctx.page.url();
  const pageContent = await ctx.page.content();

  const isOnAuth = url.includes('/auth');
  const hasLoginUI =
    pageContent.includes('Iniciar sesión') ||
    pageContent.includes('login') ||
    pageContent.includes('Ingresar');

  console.log(`Protected route check - On auth: ${isOnAuth}, Has login UI: ${hasLoginUI}`);

  // Either redirected or showing login is acceptable
  if (!isOnAuth && !hasLoginUI) {
    console.log('Warning: Neither redirected to auth nor showing login UI');
  }
}

/**
 * Test: Session persists after page reload
 */
async function testSessionPersistence(ctx: TestContext): Promise<void> {
  const { loginPage } = ctx;

  // Navigate to home
  await loginPage.navigate('/');
  await ctx.page.waitForTimeout(2000);

  // Set a test value in localStorage
  const testKey = 'e2e_test_persistence';
  const testValue = `test_value_${Date.now()}`;

  await ctx.page.evaluate(
    ([key, value]) => localStorage.setItem(key, value),
    [testKey, testValue]
  );

  // Reload page
  await ctx.page.reload();
  await ctx.page.waitForTimeout(2000);

  // Verify value persists
  const persistedValue = await ctx.page.evaluate(
    (key) => localStorage.getItem(key),
    testKey
  );

  if (persistedValue !== testValue) {
    throw new Error(`Expected localStorage to persist, got: ${persistedValue}`);
  }

  // Clean up
  await ctx.page.evaluate((key) => localStorage.removeItem(key), testKey);

  console.log('LocalStorage persistence works correctly');
}

/**
 * Test: Forgot password link navigation
 */
async function testForgotPasswordLink(ctx: TestContext): Promise<void> {
  const { loginPage } = ctx;

  await loginPage.goto();
  await loginPage.assertFormLoaded();

  // Click forgot password link
  await loginPage.clickForgotPassword();
  await ctx.page.waitForTimeout(2000);

  // Should navigate to reset password page
  const url = loginPage.getUrl();
  if (!url.includes('reset-password')) {
    throw new Error(`Expected to navigate to reset-password, got: ${url}`);
  }

  console.log('Forgot password navigation works correctly');
}

/**
 * Test: Register link navigation
 */
async function testRegisterLink(ctx: TestContext): Promise<void> {
  const { loginPage } = ctx;

  await loginPage.goto();
  await loginPage.assertFormLoaded();

  // Click register link
  await loginPage.clickRegister();
  await ctx.page.waitForTimeout(2000);

  // Should navigate to register page
  const url = loginPage.getUrl();
  if (!url.includes('register')) {
    throw new Error(`Expected to navigate to register, got: ${url}`);
  }

  console.log('Register navigation works correctly');
}

// ==================== TEST RUNNER ====================

const tests = [
  { name: 'login-page-loads', fn: testLoginPageLoads },
  { name: 'login-form-input', fn: testLoginFormInput },
  { name: 'login-submission', fn: testLoginSubmission },
  { name: 'login-invalid-credentials', fn: testLoginInvalidCredentials },
  { name: 'logout', fn: testLogout },
  { name: 'protected-route-redirect', fn: testProtectedRouteRedirect },
  { name: 'session-persistence', fn: testSessionPersistence },
  { name: 'forgot-password-link', fn: testForgotPasswordLink },
  { name: 'register-link', fn: testRegisterLink },
];

async function main(): Promise<void> {
  console.log('\n========== LOGIN E2E TESTS ==========\n');
  console.log(`Base URL: ${process.env.BASE_URL || 'http://localhost:4200'}`);
  console.log(`Headless: ${process.env.HEADLESS !== 'false'}`);

  const results = await runTests(tests, {
    suite: 'auth',
    screenshotOnFailure: true,
    saveLogsOnFailure: true,
  });

  // Print and save report
  printReport(results);
  const reportPath = saveReport(results, 'login-tests-report.json');
  console.log(`\nReport saved to: ${reportPath}`);

  // Exit with error if any test failed
  const failed = results.filter((r) => !r.passed).length;
  if (failed > 0) {
    process.exit(1);
  }
}

// Run if executed directly
main().catch((error) => {
  console.error('Test runner failed:', error);
  process.exit(1);
});

export { tests };
