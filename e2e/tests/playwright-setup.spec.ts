import { test, expect } from '@playwright/test';

/**
 * Basic Playwright functionality test
 * 
 * This test verifies that Playwright is correctly installed and configured
 * without requiring the Angular dev server or external network access.
 */

test.describe('Playwright Setup Verification', () => {
  test('playwright can open a data URL page', async ({ page }) => {
    // Navigate to a simple HTML page using data URL
    await page.goto('data:text/html,<html><body><h1>Test Page</h1><p>Hello World</p></body></html>');
    
    // Check that we can interact with the page
    const heading = await page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText('Test Page');
  });
  
  test('playwright can take screenshots', async ({ page }) => {
    await page.goto('data:text/html,<html><body><h1>Screenshot Test</h1></body></html>');
    
    // Take a screenshot (just to verify the feature works)
    const screenshot = await page.screenshot();
    
    // Verify screenshot was taken
    expect(screenshot).toBeTruthy();
    expect(screenshot.length).toBeGreaterThan(0);
  });
  
  test('playwright can execute JavaScript', async ({ page }) => {
    await page.goto('data:text/html,<html><head><title>JS Test</title></head><body>Content</body></html>');
    
    // Execute JavaScript in the page context
    const title = await page.evaluate(() => document.title);
    
    // Verify we got the expected title
    expect(title).toBe('JS Test');
  });
  
  test('playwright can wait for elements', async ({ page }) => {
    await page.goto('data:text/html,<html><body><div id="test">Initial</div></body></html>');
    
    // Update element after a delay
    await page.evaluate(() => {
      setTimeout(() => {
        const elem = document.getElementById('test');
        if (elem) elem.textContent = 'Updated';
      }, 100);
    });
    
    // Wait for the text to change
    const testDiv = page.locator('#test');
    await expect(testDiv).toHaveText('Updated');
  });
  
  test('playwright can interact with forms', async ({ page }) => {
    const html = `
      <html>
        <body>
          <form id="testForm">
            <input type="text" id="name" name="name" />
            <button type="submit">Submit</button>
          </form>
          <div id="result"></div>
        </body>
      </html>
    `;
    
    await page.goto(`data:text/html,${encodeURIComponent(html)}`);
    
    // Fill the form
    await page.fill('#name', 'Test User');
    
    // Verify the input value
    const nameInput = page.locator('#name');
    await expect(nameInput).toHaveValue('Test User');
  });
});
