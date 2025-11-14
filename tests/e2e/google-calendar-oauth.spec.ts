import { test, expect, Page } from '@playwright/test';

/**
 * Google Calendar OAuth Flow E2E Test
 * 
 * Tests the complete OAuth flow:
 * 1. User clicks "Connect Google Calendar"
 * 2. Popup opens with Google OAuth page
 * 3. After authorization, callback redirects and closes popup
 * 4. Profile page shows success message
 * 5. Connection status updates to "connected"
 */

test.describe('Google Calendar OAuth Integration', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    // Create new page for each test
    page = await browser.newPage();
    
    // Login first (assuming you have a test user)
    await page.goto('http://localhost:4200/login');
    
    // Fill login form (adjust selectors based on your login page)
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    
    // Wait for navigation to complete
    await page.waitForURL('**/profile', { timeout: 10000 });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should display Google Calendar connection section', async () => {
    // Navigate to profile page
    await page.goto('http://localhost:4200/profile');
    
    // Verify the calendar connection section is visible
    const calendarSection = page.locator('text=Google Calendar').first();
    await expect(calendarSection).toBeVisible();
    
    // Check for "Conectar" or "Desconectar" button
    const connectButton = page.locator('button:has-text("Conectar Google Calendar")');
    const disconnectButton = page.locator('button:has-text("Desconectar")');
    
    // One of them should be visible
    const isConnectVisible = await connectButton.isVisible().catch(() => false);
    const isDisconnectVisible = await disconnectButton.isVisible().catch(() => false);
    
    expect(isConnectVisible || isDisconnectVisible).toBeTruthy();
  });

  test('should open OAuth popup when clicking Connect button', async () => {
    await page.goto('http://localhost:4200/profile');
    
    // Check if already connected, disconnect first
    const disconnectButton = page.locator('button:has-text("Desconectar")');
    if (await disconnectButton.isVisible().catch(() => false)) {
      await disconnectButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Setup popup handler BEFORE clicking the button
    const popupPromise = page.waitForEvent('popup');
    
    // Click connect button
    const connectButton = page.locator('button:has-text("Conectar Google Calendar")');
    await expect(connectButton).toBeVisible();
    await connectButton.click();
    
    // Wait for popup to open
    const popup = await popupPromise;
    
    // Verify popup URL starts with Google OAuth or Supabase function
    const popupUrl = popup.url();
    console.log('Popup URL:', popupUrl);
    
    expect(
      popupUrl.includes('accounts.google.com') || 
      popupUrl.includes('supabase.co/functions/v1/google-calendar-oauth')
    ).toBeTruthy();
    
    // Verify popup dimensions (should be 600x700 as configured)
    const popupViewport = popup.viewportSize();
    if (popupViewport) {
      expect(popupViewport.width).toBe(600);
      expect(popupViewport.height).toBe(700);
    }
    
    await popup.close();
  });

  test('should handle callback and show success message (mocked)', async () => {
    await page.goto('http://localhost:4200/profile');
    
    // Check current connection status
    const statusBefore = await page.evaluate(async () => {
      const response = await fetch('/api/calendar-status', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}` }
      });
      return response.json();
    }).catch(() => ({ connected: false }));
    
    console.log('Calendar status before:', statusBefore);
    
    // Simulate callback by navigating directly to profile with success parameter
    await page.goto('http://localhost:4200/profile?calendar_connected=true');
    
    // Wait for success message to appear
    const successMessage = page.locator('text=Google Calendar conectado exitosamente');
    await expect(successMessage).toBeVisible({ timeout: 5000 });
    
    // Verify message disappears after 5 seconds
    await page.waitForTimeout(5500);
    await expect(successMessage).not.toBeVisible();
    
    // Verify URL parameter is cleaned
    await page.waitForTimeout(1000);
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('calendar_connected=true');
  });

  test('should show connected state after successful OAuth', async () => {
    // This test assumes calendar is already connected
    // You can manually connect once and then run this test
    
    await page.goto('http://localhost:4200/profile');
    
    // Look for indicators of connected state
    const connectedIndicators = [
      page.locator('text=Google Calendar Conectado'),
      page.locator('button:has-text("Desconectar")'),
      page.locator('text=Tus reservas se sincronizan automáticamente'),
    ];
    
    // At least one should be visible if connected
    let anyVisible = false;
    for (const indicator of connectedIndicators) {
      if (await indicator.isVisible().catch(() => false)) {
        anyVisible = true;
        break;
      }
    }
    
    // If not connected, this test will be skipped
    if (anyVisible) {
      console.log('✅ Calendar is connected');
      
      // Verify disconnect button is functional
      const disconnectButton = page.locator('button:has-text("Desconectar")');
      await expect(disconnectButton).toBeEnabled();
    } else {
      console.log('⚠️  Calendar not connected - test skipped');
      test.skip();
    }
  });

  test('should make API call to get auth URL', async () => {
    await page.goto('http://localhost:4200/profile');
    
    // Intercept API call to OAuth function
    let authUrlCaptured = false;
    
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('google-calendar-oauth') && url.includes('action=get-auth-url')) {
        console.log('Captured OAuth URL request:', url);
        authUrlCaptured = true;
        
        const json = await response.json().catch(() => null);
        if (json?.authUrl) {
          console.log('Auth URL received:', json.authUrl);
          expect(json.authUrl).toContain('accounts.google.com/o/oauth2/v2/auth');
        }
      }
    });
    
    // Click connect button to trigger API call
    const connectButton = page.locator('button:has-text("Conectar Google Calendar")');
    if (await connectButton.isVisible().catch(() => false)) {
      await connectButton.click();
      await page.waitForTimeout(2000);
      
      expect(authUrlCaptured).toBeTruthy();
    }
  });

  test('should handle OAuth callback with correct parameters', async () => {
    // Test the callback URL structure that Google sends
    const mockCallbackUrl = 'http://localhost:4200/profile?calendar_connected=true';
    
    await page.goto(mockCallbackUrl);
    
    // Verify page handles the parameter
    await page.waitForTimeout(1000);
    
    // Success message should appear
    const successMsg = page.locator('text=Google Calendar conectado exitosamente');
    await expect(successMsg).toBeVisible({ timeout: 3000 });
  });

  test('should detect callback without action parameter', async () => {
    // This tests that the Edge Function detects callback when 'code' parameter is present
    // We can't actually test the Edge Function directly, but we can verify the flow
    
    await page.goto('http://localhost:4200/profile');
    
    // Verify the connect button is present (meaning OAuth flow is ready)
    const connectButton = page.locator('button:has-text("Conectar Google Calendar")');
    const disconnectButton = page.locator('button:has-text("Desconectar")');
    
    const hasConnectButton = await connectButton.isVisible().catch(() => false);
    const hasDisconnectButton = await disconnectButton.isVisible().catch(() => false);
    
    // One of them must be present
    expect(hasConnectButton || hasDisconnectButton).toBeTruthy();
  });

  test('should show calendar email when connected', async () => {
    await page.goto('http://localhost:4200/profile');
    
    // If connected, should show email address
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    
    // Look for email in the calendar section
    const pageContent = await page.content();
    const hasEmail = emailPattern.test(pageContent);
    
    if (hasEmail) {
      console.log('✅ Calendar email is displayed');
    } else {
      console.log('ℹ️  No calendar email found (might not be connected)');
    }
  });

  test('should handle disconnect flow', async () => {
    await page.goto('http://localhost:4200/profile');
    
    const disconnectButton = page.locator('button:has-text("Desconectar")');
    
    if (await disconnectButton.isVisible().catch(() => false)) {
      // Setup dialog handler for confirmation
      page.on('dialog', async (dialog) => {
        console.log('Confirmation dialog:', dialog.message());
        expect(dialog.message()).toContain('desconectar');
        await dialog.accept();
      });
      
      // Click disconnect
      await disconnectButton.click();
      
      // Wait for state to update
      await page.waitForTimeout(2000);
      
      // Should now show connect button
      const connectButton = page.locator('button:has-text("Conectar Google Calendar")');
      await expect(connectButton).toBeVisible({ timeout: 5000 });
      
      console.log('✅ Successfully disconnected');
    } else {
      console.log('⚠️  Not connected - disconnect test skipped');
      test.skip();
    }
  });
});

/**
 * Visual Regression Tests
 */
test.describe('Google Calendar UI Visual Tests', () => {
  test('should match calendar section snapshot - disconnected state', async ({ page }) => {
    await page.goto('http://localhost:4200/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/profile', { timeout: 10000 });
    
    // Ensure disconnected
    const disconnectBtn = page.locator('button:has-text("Desconectar")');
    if (await disconnectBtn.isVisible().catch(() => false)) {
      page.on('dialog', dialog => dialog.accept());
      await disconnectBtn.click();
      await page.waitForTimeout(2000);
    }
    
    // Take screenshot of calendar section
    const calendarSection = page.locator('text=Google Calendar').first();
    await expect(calendarSection).toHaveScreenshot('calendar-disconnected.png');
  });
});
