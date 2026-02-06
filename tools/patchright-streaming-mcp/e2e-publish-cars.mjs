/**
 * Minimal E2E: Login → Brand → Year → Model Search test
 */
import { chromium } from 'patchright';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('🚀 Testing model search fix\n');

  const browser = await chromium.launchPersistentContext('/home/edu/.patchright-profile', {
    headless: false, channel: 'chrome',
    viewport: { width: 1280, height: 800 },
    args: ['--no-first-run', '--disable-blink-features=AutomationControlled'],
  });

  const page = browser.pages()[0] || await browser.newPage();

  try {
    // 1. Go to publish page
    console.log('1. Navigate to /cars/publish');
    await page.goto('http://localhost:4200/cars/publish', { timeout: 30000 });
    await sleep(4000);

    // 2. Handle login if needed
    const loginModal = page.locator('input[placeholder*="email"]');
    if (await loginModal.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('2. Logging in...');
      await loginModal.fill('ecucondor@gmail.com');
      await page.locator('input[type="password"]').fill('Ab.12345');
      await sleep(300);
      await page.locator('input[type="password"]').press('Enter');
      await sleep(5000);
      // Re-navigate after login
      await page.goto('http://localhost:4200/cars/publish', { timeout: 30000 });
      await sleep(4000);
    } else {
      console.log('2. Already logged in');
    }

    await page.screenshot({ path: '/tmp/e2e-step1.png', timeout: 5000 }).catch(() => {});

    // 3. Select brand (or continue if already past it)
    const toyotaBtn = page.locator('button:has-text("Toyota")').first();
    if (await toyotaBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('3. Selecting Toyota');
      await toyotaBtn.click();
      await sleep(1000);
      // Click Continuar
      await page.locator('button:has-text("Continuar"):not([disabled])').first().click({ timeout: 10000 });
      await sleep(2000);
    } else {
      console.log('3. Brand already selected, checking for year/model step');
    }

    // 4. Select year (or continue if already past it)
    const yearBtn = page.locator('button:has-text("2022")').first();
    if (await yearBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('4. Selecting 2022');
      await yearBtn.click();
      await sleep(1000);
      await page.locator('button:has-text("Continuar"):not([disabled])').first().click({ timeout: 10000 });
      await sleep(2000);
    } else {
      console.log('4. Year already selected');
    }

    // 5. Model search test!
    console.log('5. Waiting for model search input...');
    const searchInput = page.locator('input[placeholder*="Buscar modelo"]');
    await searchInput.waitFor({ state: 'visible', timeout: 30000 });

    // Wait for models to load
    console.log('   Waiting for models to load from FIPE...');
    const loadingSpinner = page.locator('.animate-pulse, .animate-spin');
    await loadingSpinner.first().waitFor({ state: 'hidden', timeout: 30000 }).catch(() => console.log('   (spinner timeout, proceeding)'));
    await sleep(2000);

    // Count models before search
    const modelBtns = page.locator('.max-h-80 button, .space-y-2.max-h-80 button');
    const beforeCount = await modelBtns.count();
    console.log(`   Models loaded: ${beforeCount}`);

    // Type search
    console.log('   Typing "Corolla"...');
    await searchInput.fill('Corolla');
    await sleep(1500);

    // Count models after search
    const afterCount = await modelBtns.count();
    console.log(`   Models after filter: ${afterCount}`);

    await page.screenshot({ path: '/tmp/e2e-model-search.png', timeout: 5000 }).catch(() => {});

    // Verdict
    if (beforeCount > 0 && afterCount < beforeCount && afterCount > 0) {
      console.log('\n✅✅✅ MODEL SEARCH WORKS! Filtered from ' + beforeCount + ' → ' + afterCount);
    } else if (afterCount === beforeCount && beforeCount > 0) {
      console.log('\n❌ SEARCH NOT FILTERING: count unchanged at ' + afterCount);
    } else if (afterCount === 0 && beforeCount > 0) {
      console.log('\n⚠️ 0 results (might be naming difference, try checking "COROLLA" vs lowercase)');
    } else {
      console.log(`\n⚠️ Unexpected: before=${beforeCount}, after=${afterCount}`);
    }

    // Select the model and continue publishing
    const corollaBtn = page.locator('.max-h-80 button:has-text("COROLLA"), .max-h-80 button:has-text("Corolla"), .space-y-2 button:has-text("COROLLA"), .space-y-2 button:has-text("Corolla")').first();
    if (await corollaBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      const modelName = await corollaBtn.textContent();
      await corollaBtn.click();
      console.log(`\n6. Selected: ${modelName?.trim()}`);
    } else if (afterCount > 0) {
      const first = modelBtns.first();
      const name = await first.textContent();
      await first.click();
      console.log(`\n6. Selected first match: ${name?.trim()}`);
    }

    await sleep(2000);
    await page.screenshot({ path: '/tmp/e2e-model-selected.png', timeout: 5000 }).catch(() => {});

    // Continue with publishing - Continuar
    const contBtn = page.locator('button:has-text("Continuar"):not([disabled])').first();
    if (await contBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await contBtn.click();
      await sleep(2000);
    }

    // Photos step
    console.log('7. Photos step...');
    await page.screenshot({ path: '/tmp/e2e-photos.png', timeout: 5000 }).catch(() => {});
    await sleep(1000);

    // Keep clicking continuar through remaining steps
    for (let i = 0; i < 10; i++) {
      // Fill any number inputs
      const numInput = page.locator('input[type="number"]').first();
      if (await numInput.isVisible({ timeout: 1500 }).catch(() => false)) {
        const ph = await numInput.getAttribute('placeholder') || '';
        const val = ph.toLowerCase().includes('km') ? '45000' : '35';
        await numInput.fill(val);
        console.log(`   Filled: ${val} (${ph || 'number input'})`);
        await sleep(300);
      }

      // Fill textareas
      const ta = page.locator('textarea').first();
      if (await ta.isVisible({ timeout: 1000 }).catch(() => false)) {
        await ta.fill('Auto en excelente estado.');
        console.log('   Filled description');
        await sleep(300);
      }

      // Click map if visible
      const map = page.locator('.mapboxgl-map').first();
      if (await map.isVisible({ timeout: 1000 }).catch(() => false)) {
        const box = await map.boundingBox();
        if (box) {
          await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
          console.log('   Clicked map center');
          await sleep(2000);
        }
      }

      // Try publish/confirm first
      const pubBtn = page.locator('button:has-text("Publicar"):not([disabled])').first();
      if (await pubBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await pubBtn.click();
        console.log('   🎯 PUBLISHED!');
        await sleep(3000);
        await page.screenshot({ path: '/tmp/e2e-published.png', timeout: 5000 }).catch(() => {});
        break;
      }

      // Otherwise continuar
      const next = page.locator('button:has-text("Continuar"):not([disabled])').first();
      if (await next.isVisible({ timeout: 2000 }).catch(() => false)) {
        await next.click();
        console.log(`   → Step ${i + 1}`);
        await sleep(2000);
      } else {
        await page.screenshot({ path: `/tmp/e2e-stuck-step${i}.png`, timeout: 5000 }).catch(() => {});
        console.log(`   ⚠️ No enabled button at iteration ${i}`);
        await sleep(2000);
      }

      if (!page.url().includes('/publish')) break;
    }

    // Check marketplace
    console.log('\n8. Checking marketplace for grey overlay...');
    await page.goto('http://localhost:4200/marketplace', { timeout: 30000 });
    await sleep(6000);
    await page.screenshot({ path: '/tmp/e2e-marketplace.png', timeout: 5000 }).catch(() => {});

    const stats = await page.evaluate(() => ({
      total: document.querySelectorAll('[data-testid="car-card"]').length,
      grey: document.querySelectorAll('article.grayscale').length,
      pendiente: [...document.querySelectorAll('span')].filter(s => s.textContent?.includes('Pendiente')).length,
    }));

    console.log(`   Cards: ${stats.total} total, ${stats.grey} grey, ${stats.pendiente} badges`);
    console.log('\n✅ Done! Screenshots in /tmp/e2e-*.png');

  } catch (err) {
    console.error('\n❌', err.message);
    await page.screenshot({ path: '/tmp/e2e-error.png', timeout: 5000 }).catch(() => {});
  } finally {
    await sleep(2000);
    await browser.close();
  }
}

main();
