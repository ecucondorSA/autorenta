const { chromium } = require('playwright');

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch();
  const page = await browser.newPage();

  console.log('Navigating to http://localhost:4200...');
  try {
    await page.goto('http://localhost:4200', { waitUntil: 'networkidle' });
  } catch (e) {
    console.error('Error navigating:', e);
    // Fallback if networkidle is too strict due to streaming
    await page.goto('http://localhost:4200');
    await page.waitForTimeout(5000);
  }

  // Set viewport to mobile size for PWA/responsive checks
  await page.setViewportSize({ width: 375, height: 812 }); // iPhone X size

  console.log('Taking screenshot of Mobile View (Top)...');
  await page.screenshot({ path: 'visual-check-mobile-top.png' });

  // Check Header Logo Alignment
  const header = await page.$('header');
  if (header) {
    console.log('Taking screenshot of Header...');
    await header.screenshot({ path: 'visual-check-header.png' });
  }

  // Check "Ingresar" button text (Desktop view needed?)
  // Switching to desktop
  await page.setViewportSize({ width: 1280, height: 800 });
  console.log('Taking screenshot of Desktop View...');
  await page.screenshot({ path: 'visual-check-desktop.png' });

  // Check "Ver autos de vecinos" button
  // Selector might need adjustment based on actual text content
  try {
    const neighborsBtn = await page.getByText('Ver autos de vecinos');
    if (await neighborsBtn.isVisible()) {
        console.log('Taking screenshot of "Ver autos de vecinos" button...');
        await neighborsBtn.screenshot({ path: 'visual-check-neighbors-btn.png' });
    }
  } catch (e) {
      console.log('Could not find "Ver autos de vecinos" button');
  }

  // Check "Ingresar" button
  try {
    const loginBtn = await page.getByText('Ingresar');
    if (await loginBtn.isVisible()) {
        console.log('Taking screenshot of "Ingresar" button...');
        await loginBtn.screenshot({ path: 'visual-check-login-btn.png' });
    }
  } catch (e) {
      console.log('Could not find "Ingresar" button');
  }

  // PWA Banner simulation
  // This is tricky as it depends on Service Worker events.
  // We might try to manually trigger the display by setting the signal in the component if possible,
  // but access to Angular internal state from E2E is hard without special setup.
  // Alternatively, we inspect the DOM if the component is rendered but hidden?
  // Based on code: <app-pwa-install-banner> or <app-pwa-install-prompt>
  // The prompt shows after 30s or logic.
  
  // We can try to force the prompt visible via evaluating script if we knew how to reach the component instance.
  // Or just wait a bit if it was set to show. The code had `setTimeout(..., 30000)`. 30s is too long for this check.
  
  console.log('Visual checks completed. Screenshots saved.');
  await browser.close();
})();
