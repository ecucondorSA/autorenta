const { chromium } = require('playwright');

(async () => {
  console.log('🔍 Starting Driver Profile Inspection...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1200, height: 800 }
  });
  const page = await context.newPage();

  // Enable console logging
  page.on('console', msg => console.log('🔊 CONSOLE:', msg.text()));
  page.on('pageerror', error => console.error('❌ PAGE ERROR:', error.message));
  page.on('requestfailed', request => console.error('🚫 REQUEST FAILED:', request.url()));

  try {
    console.log('📍 Navigating to: http://localhost:4200/profile/driver-profile');
    
    await page.goto('http://localhost:4200/profile/driver-profile', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    console.log('📸 Taking screenshot...');
    await page.screenshot({ path: 'driver-profile-debug.png', fullPage: true });

    // Get page info
    const title = await page.title();
    const url = page.url();
    console.log('📄 Page Title:', title);
    console.log('🔗 Current URL:', url);

    // Check for error messages
    const errorMessages = await page.locator('text=/error|Error|ERROR|not found|Not Found|404/i').allTextContents();
    if (errorMessages.length > 0) {
      console.log('❌ Error messages found:');
      errorMessages.forEach(msg => console.log('  -', msg));
    }

    // Check for authentication requirements
    const authElements = await page.locator('text=/login|Login|sign in|Sign In|authenticate/i').count();
    if (authElements > 0) {
      console.log('🔐 Authentication elements found:', authElements);
    }

    // Check for loading states
    const loadingElements = await page.locator('ion-spinner, .loading, text=/loading|Loading/i').count();
    console.log('⏳ Loading elements:', loadingElements);

    // Check main content visibility
    const contentElements = await page.locator('ion-content, main, .content').count();
    console.log('📋 Content elements:', contentElements);

    // Get all visible text
    const visibleText = await page.locator('body').textContent();
    console.log('📝 Page text preview:', visibleText?.substring(0, 200) + '...');

    // Check if Angular is loaded
    const angularLoaded = await page.evaluate(() => {
      return typeof window.ng !== 'undefined' ? 'Yes' : 'No';
    });
    console.log('🅰️ Angular loaded:', angularLoaded);

    // Check network responses
    const responses = [];
    page.on('response', response => {
      if (response.url().includes('localhost')) {
        responses.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
      }
    });

    await page.waitForTimeout(3000);

    console.log('🌐 Network responses:');
    responses.forEach(response => {
      console.log(`  ${response.status} - ${response.url}`);
    });

    // Try to interact with the page
    console.log('🖱️ Attempting to interact with page elements...');
    
    // Check for clickable elements
    const buttons = await page.locator('button, ion-button, [role="button"]').count();
    const links = await page.locator('a, [role="link"]').count();
    console.log('🔘 Interactive elements - Buttons:', buttons, 'Links:', links);

    console.log('✅ Inspection complete! Check driver-profile-debug.png');

  } catch (error) {
    console.error('💥 Inspection failed:', error.message);
    
    try {
      await page.screenshot({ path: 'driver-profile-error.png', fullPage: true });
      console.log('📸 Error screenshot saved: driver-profile-error.png');
    } catch (screenshotError) {
      console.error('📸 Could not take error screenshot:', screenshotError.message);
    }
  } finally {
    await browser.close();
  }
})();
