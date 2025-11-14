const { chromium } = require('playwright');

(async () => {
  console.log('📸 Creating verification screenshots and videos...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--disable-web-security', '--disable-features=VizDisplayCompositor'] 
  });
  
  const context = await browser.newContext({
    viewport: { width: 1200, height: 800 },
    recordVideo: {
      dir: './debug-videos/',
      size: { width: 1200, height: 800 }
    }
  });
  
  const page = await context.newPage();

  try {
    // Login
    console.log('🔐 Logging in...');
    await page.goto('http://localhost:4200/auth/login');
    await page.fill('input[type="email"]', 'ecucondor@gmail.com');
    await page.fill('input[type="password"]', 'Ab.12345');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);
    console.log('✅ Login successful');

    const pages = [
      { 
        url: 'http://localhost:4200/profile/driver-profile', 
        name: 'driver-profile',
        title: 'Driver Profile Page' 
      },
      { 
        url: 'http://localhost:4200/profile/verification', 
        name: 'verification',
        title: 'Verification Page' 
      },
      { 
        url: 'http://localhost:4200/profile/contact', 
        name: 'contact',
        title: 'Contact Info Page' 
      },
      { 
        url: 'http://localhost:4200/profile/preferences', 
        name: 'preferences',
        title: 'Preferences Page' 
      },
      { 
        url: 'http://localhost:4200/profile/security', 
        name: 'security',
        title: 'Security Page' 
      }
    ];

    for (const pageInfo of pages) {
      console.log(`\n📍 Testing ${pageInfo.title}...`);
      
      try {
        // Navigate to page
        await page.goto(pageInfo.url, { waitUntil: 'networkidle', timeout: 20000 });
        await page.waitForTimeout(3000);

        // Get content dimensions
        const contentInfo = await page.evaluate(() => {
          const content = document.querySelector('ion-content');
          if (!content) return { exists: false };
          
          const rect = content.getBoundingClientRect();
          const body = document.body.getBoundingClientRect();
          
          return {
            exists: true,
            content: {
              height: Math.round(rect.height),
              scrollHeight: content.scrollHeight,
              top: Math.round(rect.top),
              bottom: Math.round(rect.bottom)
            },
            viewport: {
              width: window.innerWidth,
              height: window.innerHeight
            },
            body: {
              height: Math.round(body.height),
              scrollHeight: document.body.scrollHeight
            }
          };
        });

        console.log(`   📏 Content Height: ${contentInfo.content.height}px`);
        console.log(`   📜 Scroll Height: ${contentInfo.content.scrollHeight}px`);
        console.log(`   📍 Position: ${contentInfo.content.top}px to ${contentInfo.content.bottom}px`);
        
        const isHealthy = contentInfo.content.height > 200;
        console.log(`   ${isHealthy ? '✅' : '❌'} Status: ${isHealthy ? 'HEALTHY' : 'PROBLEMATIC'}`);

        // Take initial screenshot
        await page.screenshot({ 
          path: `fixed-${pageInfo.name}-initial.png`, 
          fullPage: false 
        });
        console.log(`   📸 Initial screenshot: fixed-${pageInfo.name}-initial.png`);

        // Scroll to test content visibility
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight / 2);
        });
        await page.waitForTimeout(1000);
        
        await page.screenshot({ 
          path: `fixed-${pageInfo.name}-middle.png`, 
          fullPage: false 
        });
        console.log(`   📸 Middle scroll: fixed-${pageInfo.name}-middle.png`);

        // Scroll to bottom
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });
        await page.waitForTimeout(1000);
        
        await page.screenshot({ 
          path: `fixed-${pageInfo.name}-bottom.png`, 
          fullPage: false 
        });
        console.log(`   📸 Bottom scroll: fixed-${pageInfo.name}-bottom.png`);

        // Full page screenshot
        await page.screenshot({ 
          path: `fixed-${pageInfo.name}-fullpage.png`, 
          fullPage: true 
        });
        console.log(`   📸 Full page: fixed-${pageInfo.name}-fullpage.png`);

        // Scroll back to top
        await page.evaluate(() => {
          window.scrollTo(0, 0);
        });
        await page.waitForTimeout(1000);

      } catch (error) {
        console.log(`   ❌ Error testing ${pageInfo.title}: ${error.message}`);
      }
    }

    console.log('\n🎬 Video recording will be saved when browser closes...');
    console.log('📁 Check debug-videos/ folder for recordings');
    
  } catch (error) {
    console.error('💥 Script error:', error.message);
  } finally {
    await page.close();
    await context.close();
    await browser.close();
    console.log('\n✅ Verification complete! Check the generated files:');
    console.log('   📸 Screenshots: fixed-*-*.png');
    console.log('   🎬 Videos: debug-videos/');
  }
})();
