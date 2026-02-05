import { chromium } from 'patchright';

const browser = await chromium.launchPersistentContext('/home/edu/.patchright-profile', {
  headless: false,
  channel: 'chrome',
  viewport: { width: 1280, height: 800 }
});

const page = browser.pages()[0] || await browser.newPage();
await page.goto('http://localhost:4200/profile');
await page.waitForTimeout(3000);

const url = page.url();
console.log('Current URL:', url);

if (url.includes('/auth')) {
  console.log('❌ Not logged in');
} else {
  console.log('✅ Session active!');
  await page.screenshot({ path: '/tmp/inspect-profile.jpg', quality: 80 });
}

await browser.close();
