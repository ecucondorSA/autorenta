const { chromium } = require('playwright');

(async () => {
  console.log('🔍 Starting Driver Profile with Real Auth...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1200, height: 800 }
  });
  const page = await context.newPage();

  // Enable logging
  page.on('console', msg => console.log('🔊 CONSOLE:', msg.text()));
  page.on('pageerror', error => console.error('❌ PAGE ERROR:', error.message));

  try {
    console.log('📍 Step 1: Going to login page');
    await page.goto('http://localhost:4200/auth/login');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'step1-login-page.png' });

    console.log('📍 Step 2: Filling login form');
    
    // Fill email
    await page.fill('input[type="email"], input[name="email"], ion-input[type="email"] input', 'ecucondor@gmail.com');
    console.log('✅ Email filled: ecucondor@gmail.com');
    
    // Fill password
    await page.fill('input[type="password"], input[name="password"], ion-input[type="password"] input', 'Ab.12345');
    console.log('✅ Password filled');
    
    await page.screenshot({ path: 'step2-form-filled.png' });
    
    // Submit form
    await page.click('button[type="submit"], ion-button:has-text("Iniciar"), ion-button:has-text("Login")');
    console.log('🔘 Login button clicked');
    
    // Wait for navigation or response
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'step3-after-login.png' });
    
    console.log('🔗 URL after login:', page.url());

    console.log('📍 Step 3: Navigating to driver-profile');
    await page.goto('http://localhost:4200/profile/driver-profile');
    await page.waitForTimeout(3000);
    
    console.log('🔗 Final URL:', page.url());
    await page.screenshot({ path: 'step4-driver-profile.png', fullPage: true });

    if (page.url().includes('/profile/driver-profile')) {
      console.log('✅ SUCCESS: Reached driver-profile page!');
      
      // Deep analysis of the page
      const title = await page.title();
      console.log('📄 Page Title:', title);
      
      // Get all headers
      const headers = await page.locator('h1, h2, h3, h4, ion-title').allTextContents();
      console.log('📋 Headers:', headers);
      
      // Check page structure
      const mainContent = await page.locator('ion-content, main').count();
      console.log('📄 Main content sections:', mainContent);
      
      // Check for forms
      const forms = await page.locator('form, ion-item').count();
      console.log('📝 Form elements:', forms);
      
      // Get all visible text
      const bodyText = await page.locator('body').textContent();
      console.log('📝 Page text (first 500 chars):', bodyText?.substring(0, 500));
      
      // Check for specific driver profile elements
      const profileElements = await page.locator('[class*="profile"], [class*="driver"], ion-avatar, ion-card').count();
      console.log('👤 Profile-related elements:', profileElements);
      
    } else if (page.url().includes('/auth/login')) {
      console.log('❌ Still on login page - authentication may have failed');
      
      // Check for error messages
      const errorMessages = await page.locator('.error, ion-toast, [class*="error"]').allTextContents();
      console.log('❌ Error messages:', errorMessages);
      
    } else {
      console.log('🔍 On different page:', page.url());
    }

    console.log('📍 Step 4: Testing page accessibility and functionality');
    
    // Test scrolling
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'step5-scrolled-bottom.png' });
    
    // Test going back to top
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1000);
    
    // Check for interactive elements
    const buttons = await page.locator('button, ion-button').count();
    const inputs = await page.locator('input, ion-input, ion-select, ion-textarea').count();
    const links = await page.locator('a').count();
    
    console.log('🎛️ Interactive elements:');
    console.log('  - Buttons:', buttons);
    console.log('  - Inputs:', inputs);
    console.log('  - Links:', links);

  } catch (error) {
    console.error('💥 Error:', error.message);
    await page.screenshot({ path: 'error-final.png' });
  }
  
  console.log('🔍 Browser staying open for manual inspection...');
  console.log('Press Ctrl+C when done.');
  await new Promise(() => {}); // Keep alive
})();
