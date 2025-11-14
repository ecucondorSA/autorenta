import { test, expect } from '@playwright/test';

test.describe('Driver Profile Page Inspection', () => {
  test('inspect driver profile page accessibility and content', async ({ page }) => {
    // Enable verbose logging
    page.on('console', msg => console.log('CONSOLE:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
    page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url()));

    console.log('Navigating to driver profile page...');
    
    try {
      // Navigate to the page
      await page.goto('http://localhost:4200/profile/driver-profile', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });

      // Wait for page to load
      await page.waitForTimeout(2000);

      // Take screenshot
      await page.screenshot({ path: 'driver-profile-inspection.png', fullPage: true });
      console.log('Screenshot taken: driver-profile-inspection.png');

      // Check page title
      const title = await page.title();
      console.log('Page title:', title);

      // Check URL
      const url = page.url();
      console.log('Current URL:', url);

      // Get page content
      const content = await page.content();
      console.log('Page HTML length:', content.length);

      // Check for error messages
      const errorElements = await page.locator('[class*="error"], .error, [aria-live="polite"]').all();
      for (const element of errorElements) {
        const text = await element.textContent();
        if (text && text.trim()) {
          console.log('Error element found:', text);
        }
      }

      // Check for loading states
      const loadingElements = await page.locator('[class*="loading"], .loading, ion-spinner').all();
      console.log('Loading elements found:', loadingElements.length);

      // Check for main content
      const mainContent = await page.locator('main, ion-content, .main-content').first();
      const hasMainContent = await mainContent.isVisible().catch(() => false);
      console.log('Main content visible:', hasMainContent);

      // Check network requests
      const responses = [];
      page.on('response', response => {
        responses.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
      });

      // Wait for any pending requests
      await page.waitForTimeout(3000);

      // Log responses
      console.log('Network responses:');
      responses.forEach(response => {
        console.log(`  ${response.status} ${response.statusText} - ${response.url}`);
      });

      // Check for authentication state
      const authElements = await page.locator('[class*="login"], [class*="auth"], .login-required').all();
      console.log('Auth-related elements found:', authElements.length);

      // Check console logs
      const logs = [];
      page.on('console', msg => logs.push(msg.text()));
      
      // Get computed styles for body
      const bodyStyles = await page.evaluate(() => {
        const body = document.body;
        const computed = window.getComputedStyle(body);
        return {
          display: computed.display,
          visibility: computed.visibility,
          opacity: computed.opacity,
          backgroundColor: computed.backgroundColor
        };
      });
      console.log('Body styles:', bodyStyles);

      // Check viewport
      const viewport = page.viewportSize();
      console.log('Viewport:', viewport);

      // Check for Angular errors
      const angularErrors = await page.evaluate(() => {
        return (window as any).ng?.probe ? 'Angular detected' : 'Angular missing';
      });
      console.log('Angular status:', angularErrors);

    } catch (error) {
      console.error('Error during inspection:', error.message);
      
      // Still try to take a screenshot of the error state
      try {
        await page.screenshot({ path: 'driver-profile-error.png', fullPage: true });
        console.log('Error screenshot taken: driver-profile-error.png');
      } catch (screenshotError) {
        console.error('Could not take error screenshot:', screenshotError.message);
      }
    }
  });

  test('check page accessibility with detailed analysis', async ({ page }) => {
    console.log('Starting accessibility analysis...');
    
    try {
      await page.goto('http://localhost:4200/profile/driver-profile', { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });

      // Check for ARIA attributes
      const ariaElements = await page.locator('[aria-*]').all();
      console.log('ARIA elements found:', ariaElements.length);

      // Check for semantic HTML
      const semanticElements = await page.locator('main, nav, header, footer, section, article, aside').all();
      console.log('Semantic elements found:', semanticElements.length);

      // Check for images without alt text
      const imagesWithoutAlt = await page.locator('img:not([alt])').all();
      console.log('Images without alt text:', imagesWithoutAlt.length);

      // Check for buttons and links
      const buttons = await page.locator('button, [role="button"]').all();
      const links = await page.locator('a, [role="link"]').all();
      console.log('Interactive elements - Buttons:', buttons.length, 'Links:', links.length);

      // Check color contrast (basic)
      const contrastInfo = await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        const colorData = [];
        for (let i = 0; i < Math.min(elements.length, 50); i++) {
          const element = elements[i];
          const computed = window.getComputedStyle(element);
          if (computed.color && computed.backgroundColor) {
            colorData.push({
              tag: element.tagName,
              color: computed.color,
              backgroundColor: computed.backgroundColor
            });
          }
        }
        return colorData;
      });
      console.log('Color contrast data collected for', contrastInfo.length, 'elements');

    } catch (error) {
      console.error('Accessibility analysis error:', error.message);
    }
  });
});
