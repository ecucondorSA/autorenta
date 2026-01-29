import { chromium } from 'patchright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:4200/auth/login');
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'reports/login-local.png', fullPage: true });
  
  // Get page HTML
  const html = await page.content();
  console.log('Page URL:', page.url());
  console.log('HTML length:', html.length);
  console.log('Contains login form:', html.includes('login') || html.includes('email') || html.includes('password'));
  
  // Check for ionic inputs
  const ionInputs = await page.locator('ion-input').count();
  console.log('Ion inputs:', ionInputs);
  
  // Check for any inputs including shadow DOM
  const allInputs = await page.locator('input').count();
  console.log('All inputs:', allInputs);
  
  // Look for form elements
  const forms = await page.locator('form').count();
  console.log('Forms:', forms);
  
  await browser.close();
}

main().catch(console.error);
