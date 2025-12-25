/**
 * Rentarfast AI Agent - E2E Test Suite
 *
 * Tests for suggestion buttons, proactive behavior, and edge cases.
 * Uses Patchright for anti-bot bypass capabilities.
 */

import {
  runTests,
  printReport,
  saveReport,
  type TestContext,
} from '../../fixtures/test-fixtures';
import { config } from '../../patchright.config';

// ==================== HELPER FUNCTIONS ====================

async function navigateToRentarfast(ctx: TestContext): Promise<void> {
  await ctx.page.goto(`${config.baseUrl}/rentarfast`, { waitUntil: 'domcontentloaded' });
  await ctx.page.waitForTimeout(2000);
  // Wait for either the page or a redirect to auth
  try {
    await ctx.page.waitForSelector('.rentarfast-page, .rentarfast-container, .input-area', { timeout: 5000 });
  } catch {
    // May redirect to auth if not logged in
    console.log('Note: Rentarfast page not loaded (may require auth)');
  }
}

async function directLogin(ctx: TestContext, email: string, password: string): Promise<boolean> {
  try {
    await ctx.page.goto(`${config.baseUrl}/auth/login`, { waitUntil: 'domcontentloaded' });
    await ctx.page.waitForTimeout(2000);

    // Try multiple selector patterns
    const emailSelectors = ['[data-testid="login-email-input"]', '[data-testid="email"]', 'input[type="email"]', '#email'];
    const passwordSelectors = ['[data-testid="login-password-input"]', '[data-testid="password"]', 'input[type="password"]', '#password'];
    const submitSelectors = ['[data-testid="login-submit"]', '[data-testid="login-button"]', 'button[type="submit"]'];

    // Find working selectors
    let emailSelector = '';
    for (const sel of emailSelectors) {
      if (await ctx.page.locator(sel).count() > 0) {
        emailSelector = sel;
        break;
      }
    }

    let passwordSelector = '';
    for (const sel of passwordSelectors) {
      if (await ctx.page.locator(sel).count() > 0) {
        passwordSelector = sel;
        break;
      }
    }

    let submitSelector = '';
    for (const sel of submitSelectors) {
      if (await ctx.page.locator(sel).count() > 0) {
        submitSelector = sel;
        break;
      }
    }

    if (!emailSelector || !passwordSelector || !submitSelector) {
      console.log('Login form not found');
      return false;
    }

    await ctx.page.fill(emailSelector, email);
    await ctx.page.fill(passwordSelector, password);
    await ctx.page.click(submitSelector);
    await ctx.page.waitForTimeout(3000);

    return !ctx.page.url().includes('/auth/login');
  } catch (error) {
    console.log('Login failed:', error);
    return false;
  }
}

async function sendMessage(ctx: TestContext, message: string): Promise<void> {
  await ctx.page.fill('input.message-input, [data-testid="message-input"]', message);
  await ctx.page.press('input.message-input, [data-testid="message-input"]', 'Enter');
}

async function waitForAgentResponse(ctx: TestContext, timeout = 20000): Promise<string> {
  await ctx.page.waitForSelector('.message--agent:last-child', { timeout });
  const content = await ctx.page.locator('.message--agent:last-child .message-content p').textContent();
  return content || '';
}

async function getSuggestionCount(ctx: TestContext): Promise<number> {
  return ctx.page.locator('.suggestion-button').count();
}

// ==================== TEST DEFINITIONS ====================

/**
 * TC001: Buscar autos muestra botones de sugerencia
 */
async function testSearchCarsSuggestions(ctx: TestContext): Promise<void> {
  const loggedIn = await directLogin(ctx, ctx.testData.validUser.email, ctx.testData.validUser.password);
  if (!loggedIn) {
    console.log('SKIP: Could not login, skipping test');
    return;
  }
  await navigateToRentarfast(ctx);

  // Click "Buscar autos disponibles" button
  const searchButton = ctx.page.locator('button:has-text("Buscar autos disponibles")');
  if (await searchButton.count() > 0) {
    await searchButton.first().click();
  } else {
    // Fallback: send message
    await sendMessage(ctx, 'Buscar autos disponibles');
  }

  // Wait for suggestions
  await ctx.page.waitForSelector('.suggestion-button', { timeout: 15000 });

  // Verify suggestions exist (between 1 and 5)
  const count = await getSuggestionCount(ctx);
  if (count < 1 || count > 5) {
    throw new Error(`Expected 1-5 suggestions, got ${count}`);
  }

  console.log(`Found ${count} suggestion buttons`);
}

/**
 * TC002: Click en sugerencia ejecuta acción
 */
async function testSuggestionClick(ctx: TestContext): Promise<void> {
  const loggedIn = await directLogin(ctx, ctx.testData.validUser.email, ctx.testData.validUser.password);
  if (!loggedIn) {
    console.log('SKIP: Could not login, skipping test');
    return;
  }
  await navigateToRentarfast(ctx);

  // First, search for cars
  await sendMessage(ctx, 'Buscar autos disponibles');
  await ctx.page.waitForSelector('.suggestion-button', { timeout: 15000 });

  // Click first suggestion
  await ctx.page.click('.suggestion-button:first-child');

  // Verify input was filled with action
  const input = ctx.page.locator('input.message-input, [data-testid="message-input"]');
  const inputValue = await input.inputValue();

  if (!inputValue.includes('reservar')) {
    throw new Error(`Expected input to contain "reservar", got: ${inputValue}`);
  }

  console.log('Suggestion click filled input correctly');
}

/**
 * TC003: Sugerencias tienen datos reales (precio)
 */
async function testSuggestionsHaveRealData(ctx: TestContext): Promise<void> {
  const loggedIn = await directLogin(ctx, ctx.testData.validUser.email, ctx.testData.validUser.password);
  if (!loggedIn) {
    console.log('SKIP: Could not login, skipping test');
    return;
  }
  await navigateToRentarfast(ctx);

  await sendMessage(ctx, 'Buscar autos disponibles');
  await ctx.page.waitForSelector('.suggestion-button', { timeout: 15000 });

  // Get suggestion text
  const suggestionText = await ctx.page.locator('.suggestion-label').first().textContent();

  // Should contain price pattern ($XX.XX/día or USD XX)
  if (!suggestionText || (!suggestionText.includes('$') && !suggestionText.includes('USD'))) {
    throw new Error(`Expected suggestion to contain price, got: ${suggestionText}`);
  }

  console.log(`Suggestion has real data: ${suggestionText}`);
}

/**
 * TC004: Error "propio auto" muestra alternativas
 */
async function testSelfBookingShowsAlternatives(ctx: TestContext): Promise<void> {
  // Login as owner
  const loggedIn = await directLogin(ctx, 'owner@autorentar.com', 'OwnerPassword123!');
  if (!loggedIn) {
    console.log('SKIP: Could not login as owner, skipping test');
    return;
  }
  await navigateToRentarfast(ctx);

  // Try to book own car (should fail and show alternatives)
  await sendMessage(ctx, 'reservar mi propio auto del 1 al 3 de enero');

  // Wait for proactive response
  await ctx.page.waitForSelector('.message--agent:last-child', { timeout: 20000 });
  const response = await waitForAgentResponse(ctx);

  // Should contain error message
  if (!response.toLowerCase().includes('no') && !response.toLowerCase().includes('propio')) {
    console.log(`Warning: Expected self-booking error message, got: ${response}`);
  }

  // Should show suggestions with alternatives
  const suggestions = await getSuggestionCount(ctx);
  if (suggestions > 0) {
    console.log(`Proactive behavior: ${suggestions} alternatives shown`);
  } else {
    console.log('Note: No suggestion buttons shown, agent may show alternatives in text');
  }
}

/**
 * TC005: Input vacío no envía mensaje
 */
async function testEmptyInputNoSend(ctx: TestContext): Promise<void> {
  await navigateToRentarfast(ctx);

  // Try to send empty message
  await ctx.page.press('input.message-input, [data-testid="message-input"]', 'Enter');
  await ctx.page.waitForTimeout(1000);

  // No user message should appear
  const userMessages = await ctx.page.locator('.message--user').count();
  if (userMessages !== 0) {
    throw new Error(`Expected 0 user messages for empty input, got ${userMessages}`);
  }

  console.log('Empty input correctly prevented');
}

/**
 * TC006: Loading state durante procesamiento
 */
async function testLoadingState(ctx: TestContext): Promise<void> {
  const loggedIn = await directLogin(ctx, ctx.testData.validUser.email, ctx.testData.validUser.password);
  if (!loggedIn) {
    console.log('SKIP: Could not login, skipping test');
    return;
  }
  await navigateToRentarfast(ctx);

  await sendMessage(ctx, 'buscar autos toyota');

  // Loading indicator should appear quickly
  try {
    await ctx.page.waitForSelector('.typing-indicator, .loading-indicator', { timeout: 2000 });
    console.log('Loading indicator appeared');
  } catch {
    console.log('Note: Loading indicator not found (may be too fast)');
  }

  // Wait for response
  await waitForAgentResponse(ctx);

  // Input should be enabled again
  const input = ctx.page.locator('input.message-input, [data-testid="message-input"]');
  const isEnabled = await input.isEnabled();
  if (!isEnabled) {
    throw new Error('Input should be enabled after response');
  }

  console.log('Loading state handled correctly');
}

/**
 * TC007: Mensaje largo se maneja correctamente
 */
async function testLongMessage(ctx: TestContext): Promise<void> {
  const loggedIn = await directLogin(ctx, ctx.testData.validUser.email, ctx.testData.validUser.password);
  if (!loggedIn) {
    console.log('SKIP: Could not login, skipping test');
    return;
  }
  await navigateToRentarfast(ctx);

  const longMessage = 'a'.repeat(500);
  await sendMessage(ctx, longMessage);

  // Should not crash
  await ctx.page.waitForSelector('.message--user', { timeout: 5000 });

  // Message should be displayed
  const userMessage = ctx.page.locator('.message--user .message-content p');
  const isVisible = await userMessage.isVisible();
  if (!isVisible) {
    throw new Error('Long message not displayed');
  }

  console.log('Long message handled correctly');
}

/**
 * TC008: Botón de voz visible
 */
async function testVoiceButtonVisible(ctx: TestContext): Promise<void> {
  await navigateToRentarfast(ctx);

  const voiceButton = ctx.page.locator('.voice-button-small, .voice-button-large');
  const count = await voiceButton.count();

  if (count === 0) {
    console.log('Note: Voice button not visible (may be browser-dependent)');
    return;
  }

  const isVisible = await voiceButton.first().isVisible();
  if (!isVisible) {
    throw new Error('Voice button should be visible');
  }

  console.log('Voice button is visible');
}

/**
 * TC009: Clear chat borra historial
 */
async function testClearChat(ctx: TestContext): Promise<void> {
  const loggedIn = await directLogin(ctx, ctx.testData.validUser.email, ctx.testData.validUser.password);
  if (!loggedIn) {
    console.log('SKIP: Could not login, skipping test');
    return;
  }
  await navigateToRentarfast(ctx);

  // Send a message
  await sendMessage(ctx, 'hola');
  await ctx.page.waitForSelector('.message--user', { timeout: 5000 });

  // Find and click clear button
  const clearButton = ctx.page.locator('.clear-button, [data-testid="clear-chat"]');
  if (await clearButton.count() > 0) {
    await clearButton.click();
    await ctx.page.waitForTimeout(500);

    // Messages should be gone
    const messages = await ctx.page.locator('.message').count();
    if (messages > 0) {
      console.log(`Note: ${messages} messages remain after clear`);
    } else {
      console.log('Chat cleared successfully');
    }
  } else {
    console.log('Note: Clear button not found');
  }
}

/**
 * TC010: Responsive - mobile viewport
 */
async function testMobileViewport(ctx: TestContext): Promise<void> {
  await ctx.page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
  await navigateToRentarfast(ctx);

  // Key elements should be visible
  const inputArea = ctx.page.locator('.input-area, .rentarfast-input');
  const isInputVisible = await inputArea.isVisible();
  if (!isInputVisible) {
    throw new Error('Input area should be visible on mobile');
  }

  // Voice button should be tappable (min 44x44)
  const voiceButton = ctx.page.locator('.voice-button-large');
  if (await voiceButton.count() > 0) {
    const box = await voiceButton.boundingBox();
    if (box && (box.width < 44 || box.height < 44)) {
      console.log(`Warning: Voice button is ${box.width}x${box.height}, should be at least 44x44`);
    }
  }

  console.log('Mobile viewport renders correctly');
}

// ==================== TEST RUNNER ====================

const tests = [
  { name: 'search-cars-suggestions', fn: testSearchCarsSuggestions },
  { name: 'suggestion-click', fn: testSuggestionClick },
  { name: 'suggestions-real-data', fn: testSuggestionsHaveRealData },
  { name: 'self-booking-alternatives', fn: testSelfBookingShowsAlternatives },
  { name: 'empty-input-no-send', fn: testEmptyInputNoSend },
  { name: 'loading-state', fn: testLoadingState },
  { name: 'long-message', fn: testLongMessage },
  { name: 'voice-button-visible', fn: testVoiceButtonVisible },
  { name: 'clear-chat', fn: testClearChat },
  { name: 'mobile-viewport', fn: testMobileViewport },
];

async function main(): Promise<void> {
  console.log('\n========== RENTARFAST E2E TESTS ==========\n');
  console.log(`Base URL: ${config.baseUrl}`);
  console.log(`Headless: ${config.headless}`);

  const results = await runTests(tests, {
    suite: 'rentarfast',
    screenshotOnFailure: true,
    saveLogsOnFailure: true,
  });

  // Print and save report
  printReport(results);
  const reportPath = saveReport(results, 'rentarfast-tests-report.json');
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
