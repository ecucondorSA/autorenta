#!/usr/bin/env node
/**
 * Create AutoRentar Facebook Page - Direct Patchright Script
 * Uses existing browser profile to maintain login session
 */

import { chromium } from 'patchright';
import { setTimeout } from 'timers/promises';

const PROFILE_PATH = '/home/edu/.patchright-profile';

async function createPage() {
  console.log('🚀 Launching Patchright with existing profile...');

  const context = await chromium.launchPersistentContext(PROFILE_PATH, {
    headless: false,
    viewport: { width: 1400, height: 900 },
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
    ],
    ignoreDefaultArgs: ['--enable-automation'],
  });

  const page = context.pages()[0] || await context.newPage();

  try {
    // 1. Go to Pages settings
    console.log('📍 Navigating to Pages settings...');
    await page.goto('https://business.facebook.com/latest/settings/pages?business_id=2790781111081252', {
      waitUntil: 'networkidle',
      timeout: 60000,
    });
    await setTimeout(3000);
    console.log('✅ Page loaded');

    // 2. Take initial screenshot
    await page.screenshot({ path: '/tmp/fb-step1-pages.png' });
    console.log('📸 Screenshot: /tmp/fb-step1-pages.png');

    // 3. Click Add button
    console.log('➕ Looking for Add button...');
    const addBtn = page.locator('[aria-label="Adicionar"]').or(page.getByRole('button', { name: /adicionar/i })).or(page.locator('button:has-text("Adicionar")'));

    if (await addBtn.count() > 0) {
      await addBtn.first().click();
      await setTimeout(2000);
      console.log('✅ Clicked Add button');
      await page.screenshot({ path: '/tmp/fb-step2-add-menu.png' });
    } else {
      console.log('⚠️ Add button not found, looking for alternatives...');
      // Try clicking by text
      await page.click('text=Adicionar').catch(() => { });
      await setTimeout(2000);
    }

    // 4. Click "Create new page" option
    console.log('📄 Looking for Create Page option...');
    const createOption = page.locator('text=Criar uma nova Página').or(page.locator('text=Create a new Facebook Page'));

    if (await createOption.count() > 0) {
      await createOption.first().click();
      await setTimeout(3000);
      console.log('✅ Clicked Create Page option');
      await page.screenshot({ path: '/tmp/fb-step3-create-form.png' });
    }

    // 5. Fill page name
    console.log('📝 Filling page name...');
    const nameInput = page.locator('input[placeholder*="nome"]').or(page.locator('input[name*="name"]')).or(page.locator('input').first());

    if (await nameInput.count() > 0) {
      await nameInput.first().fill('AutoRentar');
      await setTimeout(1000);
      console.log('✅ Entered name: AutoRentar');
    }

    // 6. Look for category input
    console.log('🏷️ Looking for category...');
    const categoryInput = page.locator('input[placeholder*="categoria"]').or(page.locator('[aria-label*="categoria"]'));

    if (await categoryInput.count() > 0) {
      await categoryInput.first().click();
      await setTimeout(500);
      await categoryInput.first().fill('Aluguel de carros');
      await setTimeout(2000);

      // Click first suggestion
      const suggestion = page.locator('[role="option"]').first();
      if (await suggestion.count() > 0) {
        await suggestion.click();
        console.log('✅ Selected category');
      }
    }

    await page.screenshot({ path: '/tmp/fb-step4-filled.png' });

    // 7. Wait for user to complete manually if needed
    console.log('\n' + '═'.repeat(60));
    console.log('📋 BROWSER IS OPEN - Complete the page creation if needed');
    console.log('═'.repeat(60));
    console.log('\nScreenshots saved to /tmp/fb-step*.png');
    console.log('\nThe browser will stay open for 3 minutes.');
    console.log('Once done, note the Page ID from the URL.\n');

    // Keep browser open
    await setTimeout(180000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: '/tmp/fb-error.png' });
  } finally {
    await context.close();
    console.log('🔚 Browser closed');
  }
}

createPage().catch(console.error);
