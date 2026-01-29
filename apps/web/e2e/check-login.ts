import { chromium } from 'patchright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://autorentar.pages.dev/auth/login');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'reports/login-page-check.png', fullPage: true });
  
  // Get all input elements
  const inputs = await page.locator('input').all();
  console.log('Found inputs:', inputs.length);
  
  for (const input of inputs) {
    const type = await input.getAttribute('type');
    const testid = await input.getAttribute('data-testid');
    const id = await input.getAttribute('id');
    const name = await input.getAttribute('name');
    console.log('Input:', { type, testid, id, name });
  }
  
  await browser.close();
}

main().catch(console.error);
