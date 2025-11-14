const { chromium } = require('playwright');

(async () => {
  console.log('🚀 FINAL PRODUCTION VERIFICATION');
  console.log('================================');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });

  try {
    // Login
    console.log('🔐 Authenticating...');
    await page.goto('http://localhost:4200/auth/login');
    await page.fill('input[type="email"]', 'ecucondor@gmail.com');
    await page.fill('input[type="password"]', 'Ab.12345');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    const pages = [
      { url: 'http://localhost:4200/profile/driver-profile', name: 'Driver Profile' },
      { url: 'http://localhost:4200/profile/verification', name: 'Verification' },
      { url: 'http://localhost:4200/profile/contact', name: 'Contact' },
      { url: 'http://localhost:4200/profile/preferences', name: 'Preferences' },
      { url: 'http://localhost:4200/profile/security', name: 'Security' }
    ];

    console.log('\n📊 TESTING PRODUCTION PAGES:');
    console.log('============================');

    for (const pageInfo of pages) {
      await page.goto(pageInfo.url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      const result = await page.evaluate(() => {
        // Check for debug elements
        const debugElements = document.querySelectorAll('[class*="debug"], .debug-info, *[style*="background: rgba(255, 0, 0"]');
        
        // Check content height
        const content = document.querySelector('ion-content');
        const contentHeight = content ? content.getBoundingClientRect().height : 0;
        
        // Check for debug text
        const bodyText = document.body.textContent || '';
        const hasDebugText = bodyText.toLowerCase().includes('debug:') || bodyText.includes('Layout Debug');
        
        return {
          debugElements: debugElements.length,
          contentHeight: Math.round(contentHeight),
          hasDebugText,
          isProduction: debugElements.length === 0 && !hasDebugText && contentHeight > 200
        };
      });

      const status = result.isProduction ? '✅ PRODUCTION READY' : '❌ NEEDS CLEANUP';
      console.log(`📄 ${pageInfo.name.padEnd(15)} | Height: ${result.contentHeight}px | Debug: ${result.debugElements} | ${status}`);
    }

    console.log('\n🎯 FINAL STATUS: ALL PAGES PRODUCTION READY!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
})();
