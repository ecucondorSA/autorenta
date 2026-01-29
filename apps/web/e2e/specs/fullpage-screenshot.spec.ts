import { test } from '@playwright/test';

test('capture full page', async ({ page }) => {
  await page.goto('http://localhost:4200/cars/publish', { waitUntil: 'networkidle' });
  await page.waitForTimeout(4000);
  
  await page.screenshot({ 
    path: '/home/edu/autorenta-publish-FULLPAGE.png',
    fullPage: true
  });
  
  console.log('Screenshot saved to /home/edu/autorenta-publish-FULLPAGE.png');
});
