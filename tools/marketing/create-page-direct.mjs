#!/usr/bin/env node
/**
 * Direct Patchright automation - no MCP server needed
 * Creates AutoRentar Facebook Page
 */

import { chromium } from 'patchright';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('🚀 Launching browser with temporary profile...');

  // Use headful browser for manual intervention if needed
  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
  });

  const page = await context.newPage();

  try {
    console.log('📍 Step 1: Login to Facebook if needed...');
    await page.goto('https://www.facebook.com', { waitUntil: 'networkidle', timeout: 60000 });
    await sleep(3000);

    // Check if logged in
    const isLoggedIn = await page.locator('[aria-label="Account"]').or(page.locator('[data-click="profile_icon"]')).count() > 0;

    if (!isLoggedIn) {
      console.log('⚠️  Not logged in. Please login manually...');
      console.log('   Browser will wait 60 seconds for you to login.\n');
      await sleep(60000);
    } else {
      console.log('✅ Already logged in');
    }

    console.log('\n📍 Step 2: Navigate to Business Suite...');
    await page.goto('https://business.facebook.com/latest/settings/pages?business_id=2790781111081252', {
      waitUntil: 'networkidle',
      timeout: 60000,
    });
    await sleep(4000);

    console.log('📸 Screenshot 1: Pages settings');
    await page.screenshot({ path: '/tmp/fb-pages-1.png', fullPage: false });

    console.log('\n📍 Step 3: Click "Adicionar" button...');

    // Try multiple selectors for the Add button
    const addButtonClicked = await (async () => {
      const selectors = [
        'button:has-text("Adicionar")',
        '[aria-label="Adicionar"]',
        'button >> text=/adicionar/i',
        'div[role="button"]:has-text("Adicionar")',
      ];

      for (const selector of selectors) {
        try {
          const locator = page.locator(selector).first();
          if (await locator.count() > 0) {
            await locator.click();
            console.log(`✅ Clicked Add button using: ${selector}`);
            return true;
          }
        } catch (e) {
          continue;
        }
      }
      return false;
    })();

    if (!addButtonClicked) {
      console.log('⚠️  Could not find Add button automatically.');
      console.log('   Please click "Adicionar" manually...\n');
      await sleep(10000);
    } else {
      await sleep(2500);
    }

    console.log('📸 Screenshot 2: After clicking Add');
    await page.screenshot({ path: '/tmp/fb-pages-2.png', fullPage: false });

    console.log('\n📍 Step 4: Click "Criar uma nova Página"...');

    const createClicked = await (async () => {
      const selectors = [
        'text=Criar uma nova Página',
        'text=/criar.*página/i',
        '[role="menuitem"]:has-text("Criar")',
      ];

      for (const selector of selectors) {
        try {
          const locator = page.locator(selector).first();
          if (await locator.count() > 0) {
            await locator.click();
            console.log(`✅ Clicked Create Page using: ${selector}`);
            return true;
          }
        } catch (e) {
          continue;
        }
      }
      return false;
    })();

    if (!createClicked) {
      console.log('⚠️  Could not find Create Page option.');
      console.log('   Please click "Criar uma nova Página do Facebook" manually...\n');
      await sleep(10000);
    } else {
      await sleep(3000);
    }

    console.log('📸 Screenshot 3: Create page form');
    await page.screenshot({ path: '/tmp/fb-pages-3.png', fullPage: true });

    console.log('\n📍 Step 5: Fill page details...');

    // Fill name
    try {
      const nameInput = page.locator('input[placeholder*="nome"]').or(page.locator('input').first());
      if (await nameInput.count() > 0) {
        await nameInput.fill('AutoRentar');
        console.log('✅ Entered page name: AutoRentar');
        await sleep(1000);
      }
    } catch (e) {
      console.log('⚠️  Could not fill name automatically');
    }

    // Fill category
    try {
      const categoryInput = page.locator('input[placeholder*="categoria"]').or(page.locator('[aria-label*="Categoria"]'));
      if (await categoryInput.count() > 0) {
        await categoryInput.click();
        await sleep(500);
        await categoryInput.fill('aluguel de carros');
        await sleep(2000);

        // Select first suggestion
        const suggestion = page.locator('[role="option"]').first();
        if (await suggestion.count() > 0) {
          await suggestion.click();
          console.log('✅ Selected category');
        }
      }
    } catch (e) {
      console.log('⚠️  Could not fill category automatically');
    }

    console.log('📸 Screenshot 4: Filled form');
    await page.screenshot({ path: '/tmp/fb-pages-4.png', fullPage: true });

    console.log('\n' + '═'.repeat(70));
    console.log('📋 MANUAL INTERVENTION REQUIRED');
    console.log('═'.repeat(70));
    console.log('\nThe browser is now open. Please:');
    console.log('  1. Verify the page name is "AutoRentar"');
    console.log('  2. Select category "Serviço de aluguel de carros" if not selected');
    console.log('  3. Click "Criar Página" / "Create Page"');
    console.log('  4. Copy the Page ID from the URL or settings');
    console.log('  5. Come back here and paste the Page ID');
    console.log('\nScreenshots saved to: /tmp/fb-pages-*.png');
    console.log('\nBrowser will remain open for 5 minutes...\n');

    await sleep(300000); // 5 minutes

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await page.screenshot({ path: '/tmp/fb-error.png' });
    console.log('Error screenshot: /tmp/fb-error.png');
  } finally {
    await browser.close();
    console.log('\n🔚 Browser closed');
  }
}

main().catch(console.error);
