import { chromium } from 'playwright';

const url = process.argv[2] || 'http://localhost:4200';
const outputPath = process.argv[3] || '/tmp/autorenta-screenshot.png';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(url, { waitUntil: 'networkidle' });
await page.screenshot({ path: outputPath, fullPage: false });
await browser.close();

console.log(`Screenshot saved to: ${outputPath}`);
