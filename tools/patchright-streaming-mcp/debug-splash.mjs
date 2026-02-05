import { chromium } from 'patchright';

const browser = await chromium.launchPersistentContext('/home/edu/.patchright-profile', {
  headless: false,
  channel: 'chrome',
  viewport: { width: 1280, height: 800 }
});

const page = browser.pages()[0] || await browser.newPage();

// Navigate and check state over time
await page.goto('http://localhost:4200/bookings', { waitUntil: 'domcontentloaded', timeout: 60000 });

console.log('--- Checking splash state over time ---');

for (let i = 0; i < 6; i++) {
  await page.waitForTimeout(500);

  const state = await page.evaluate(() => {
    // Check DOM state
    const splashElement = document.querySelector('app-splash-screen');
    const fixedDiv = document.querySelector('app-splash-screen .fixed.inset-0');

    // Try to access Angular's internal state via ng.getComponent
    let serviceState = null;
    try {
      const appRoot = document.querySelector('app-root');
      if (appRoot && window.ng) {
        const component = window.ng.getComponent(appRoot);
        if (component && component.splashService) {
          serviceState = {
            visible: component.splashService.visible?.() ?? 'unknown',
            fadeOut: component.splashService.fadeOut?.() ?? 'unknown'
          };
        }
      }
    } catch (e) {
      serviceState = { error: e.message };
    }

    return {
      time: Date.now(),
      hasSplashElement: !!splashElement,
      hasFixedDiv: !!fixedDiv,
      serviceState,
      innerHTML: fixedDiv ? 'exists' : 'not found'
    };
  });

  console.log(`[${(i+1)*500}ms]`, JSON.stringify(state, null, 2));
}

await page.screenshot({ path: '/tmp/debug-splash.jpg', quality: 85 });
console.log('Screenshot saved to /tmp/debug-splash.jpg');

await browser.close();
