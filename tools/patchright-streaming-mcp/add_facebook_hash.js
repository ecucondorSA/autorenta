
import { chromium } from 'patchright';

const APP_ID = '4435998730015502';
const KEY_HASH = 'tGOahaDgstWuLqnGpRrEfZhA+tM=';
const SETTINGS_URL = `https://developers.facebook.com/apps/${APP_ID}/settings/basic/`;
const PROFILE_PATH = process.env.BROWSER_PROFILE || '/home/edu/.patchright-profile';

async function run() {
  console.log('🚀 Launching Patchright to add Facebook Key Hash...');
  console.log(`📂 Profile: ${PROFILE_PATH}`);
  console.log(`🔑 Key Hash: ${KEY_HASH}`);

  const context = await chromium.launchPersistentContext(PROFILE_PATH, {
    channel: 'chrome', // Try to use installed Chrome if available for better codecs, or remove to use bundled chromium
    headless: false,
    viewport: { width: 1280, height: 800 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
  });

  const page = await context.pages()[0] || await context.newPage();

  try {
    console.log(`🌐 Navigating to: ${SETTINGS_URL}`);
    await page.goto(SETTINGS_URL, { waitUntil: 'domcontentloaded' });

    // Check login
    if (page.url().includes('login')) {
      console.log('⚠️  Login required! Please log in manually in the browser window.');
      await page.waitForTimeout(300000); // 5 minutes to login
    }

    console.log('👀 Checking for Android platform section...');
    
    // Look for Android section
    const androidHeader = page.getByText('Android', { exact: true });
    if (await androidHeader.count() === 0) {
      console.log('➕ Android platform not found. Attempting to add...');
      await page.getByText('Add Platform').click();
      await page.getByText('Android').click();
      await page.getByText('Next').click(); // Or whatever the flow is, this is brittle
    }

    console.log('✨ You should be on the settings page.');
    console.log(`📋 Please paste this Key Hash into the "Key Hashes" field under Android:\n\n${KEY_HASH}\n`);
    
    // Attempt to focus or highlight
    // Facebook's UI is complex, identifying the exact input is hard without inspecting.
    // We will keep the browser open.

    console.log('⏳ Browser will remain open for 5 minutes for you to complete the key hash addition.');
    
    // Try to find the input if possible (generic guess)
    // const inputs = await page.getByRole('textbox').all();
    // console.log(`Found ${inputs.length} textboxes.`);

    await page.waitForTimeout(300000);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await context.close();
  }
}

run();
