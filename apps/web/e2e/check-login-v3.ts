import { chromium } from 'patchright';
import * as path from 'path';

async function main() {
  // Use fresh temp profile
  const tempProfile = '/tmp/patchright-test-profile-' + Date.now();
  
  const browser = await chromium.launchPersistentContext(tempProfile, { 
    headless: true,
    viewport: { width: 1280, height: 720 }
  });
  
  const page = browser.pages()[0] || await browser.newPage();
  
  // Clear any existing storage
  await page.goto('http://localhost:4200');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  
  // Now go to login
  await page.goto('http://localhost:4200/auth/login');
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'reports/login-fresh.png', fullPage: true });
  
  console.log('Page URL:', page.url());
  
  // Look for input elements with different strategies
  const inputs = await page.locator('input').count();
  console.log('Regular inputs:', inputs);
  
  // Try to find email field by text
  const emailByPlaceholder = await page.locator('[placeholder*="email" i], [placeholder*="correo" i]').count();
  console.log('Email by placeholder:', emailByPlaceholder);
  
  // Check visible buttons
  const buttons = await page.locator('button').count();
  console.log('Buttons:', buttons);
  
  await browser.close();
}

main().catch(console.error);
