import { chromium } from 'patchright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => {
    if (msg.text().includes('AUTOS EN GRID')) {
      console.log(msg.text());
    }
  });

  await page.goto('http://localhost:4200');
  await page.waitForTimeout(5000); // Esperar carga de datos
  await browser.close();
})();
