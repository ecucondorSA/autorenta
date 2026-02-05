import { chromium } from 'patchright';

const browser = await chromium.launchPersistentContext('/home/edu/.patchright-profile', {
  headless: false,
  channel: 'chrome',
  viewport: { width: 1280, height: 800 }
});

const page = browser.pages()[0] || await browser.newPage();

// Clear and navigate
await page.goto('about:blank');

console.log('Navigating to /bookings...');
await page.goto('http://localhost:4200/bookings', { waitUntil: 'domcontentloaded', timeout: 60000 });

// Wait 1 second
await page.waitForTimeout(1000);

// Check if we can directly call the service
const result = await page.evaluate(async () => {
  // Try to find the splash service through Angular's injector
  const logs = [];

  // Check if splash component exists
  const splashComp = document.querySelector('app-splash-screen');
  logs.push(`Splash component exists: ${!!splashComp}`);

  // Check the fixed div
  const fixedDiv = document.querySelector('app-splash-screen .fixed.inset-0');
  logs.push(`Fixed div exists: ${!!fixedDiv}`);

  if (fixedDiv) {
    logs.push(`Fixed div classes: ${fixedDiv.className}`);
    logs.push(`Has opacity-0 class: ${fixedDiv.classList.contains('opacity-0')}`);
  }

  // Try to manually trigger hide via global exposure
  if (typeof window !== 'undefined') {
    logs.push(`Window exists: true`);

    // Check for Angular debug
    if (window.ng) {
      logs.push(`ng exists: true`);
      try {
        const appRoot = document.querySelector('app-root');
        if (appRoot) {
          const appComp = window.ng.getComponent(appRoot);
          if (appComp) {
            logs.push(`AppComponent found`);
            // Try to access splashService if it's exposed
            if (appComp.splashService) {
              logs.push(`splashService accessible`);
              logs.push(`visible: ${appComp.splashService.visible?.()}`);
              logs.push(`fadeOut: ${appComp.splashService.fadeOut?.()}`);
            } else {
              logs.push(`splashService NOT accessible from component`);
            }
          }
        }
      } catch (e) {
        logs.push(`Error accessing ng: ${e.message}`);
      }
    } else {
      logs.push(`ng NOT available`);
    }
  }

  return logs;
});

console.log('\n--- Debug Results ---');
result.forEach(log => console.log(log));

// Now try calling hide manually from console
console.log('\n--- Trying manual hide ---');
await page.waitForTimeout(500);

const afterManual = await page.evaluate(() => {
  const fixedDiv = document.querySelector('app-splash-screen .fixed.inset-0');
  return {
    exists: !!fixedDiv,
    classes: fixedDiv ? fixedDiv.className : 'N/A'
  };
});
console.log('After wait:', afterManual);

await browser.close();
