const { chromium } = require('playwright');

(async () => {
  console.log('🔍 Simple Layout Debug...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Login
    await page.goto('http://localhost:4200/auth/login');
    await page.fill('input[type="email"]', 'ecucondor@gmail.com');
    await page.fill('input[type="password"]', 'Ab.12345');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // Go to profile
    await page.goto('http://localhost:4200/profile/driver-profile');
    await page.waitForTimeout(3000);

    // Check page structure
    const pageStructure = await page.evaluate(() => {
      const getElementInfo = (selector) => {
        const el = document.querySelector(selector);
        if (!el) return { exists: false };
        
        const rect = el.getBoundingClientRect();
        const computed = window.getComputedStyle(el);
        
        return {
          exists: true,
          tag: el.tagName,
          classes: el.className,
          rect: {
            top: Math.round(rect.top),
            left: Math.round(rect.left),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            bottom: Math.round(rect.bottom)
          },
          styles: {
            position: computed.position,
            display: computed.display,
            height: computed.height,
            maxHeight: computed.maxHeight,
            overflow: computed.overflow,
            marginTop: computed.marginTop,
            paddingTop: computed.paddingTop
          }
        };
      };

      return {
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
          scrollHeight: document.body.scrollHeight
        },
        header: getElementInfo('ion-header'),
        toolbar: getElementInfo('ion-toolbar'),
        content: getElementInfo('ion-content'),
        banner: getElementInfo('app-verification-prompt-banner'),
        footer: getElementInfo('ion-footer')
      };
    });

    console.log('📊 PAGE STRUCTURE ANALYSIS:');
    console.log('🖥️ Viewport:', pageStructure.viewport);
    console.log('');
    
    ['header', 'toolbar', 'content', 'banner', 'footer'].forEach(key => {
      const el = pageStructure[key];
      if (el.exists) {
        console.log(`📦 ${key.toUpperCase()}:`);
        console.log(`   Position: top=${el.rect.top}, height=${el.rect.height}, bottom=${el.rect.bottom}`);
        console.log(`   CSS: position=${el.styles.position}, height=${el.styles.height}, overflow=${el.styles.overflow}`);
        console.log('');
      } else {
        console.log(`❌ ${key.toUpperCase()}: Not found`);
      }
    });

    // Check what's blocking the content
    const blockingAnalysis = await page.evaluate(() => {
      const content = document.querySelector('ion-content');
      if (!content) return null;
      
      const contentRect = content.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      // Check if content is below viewport
      const isContentBelowViewport = contentRect.top > viewportHeight;
      const isContentTooSmall = contentRect.height < 200; // Reasonable content height
      
      // Find elements that might be pushing content down
      const allElements = Array.from(document.querySelectorAll('*'));
      const largeElements = allElements.filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.height > 100 && rect.top < contentRect.top;
      }).map(el => ({
        tag: el.tagName,
        classes: el.className,
        height: Math.round(el.getBoundingClientRect().height),
        top: Math.round(el.getBoundingClientRect().top)
      }));
      
      return {
        contentRect: {
          top: Math.round(contentRect.top),
          height: Math.round(contentRect.height),
          bottom: Math.round(contentRect.bottom)
        },
        viewportHeight,
        isContentBelowViewport,
        isContentTooSmall,
        largeElementsAboveContent: largeElements.slice(0, 5) // Top 5
      };
    });

    console.log('🚨 BLOCKING ANALYSIS:');
    if (blockingAnalysis) {
      console.log(`📍 Content position: top=${blockingAnalysis.contentRect.top}, height=${blockingAnalysis.contentRect.height}`);
      console.log(`🖥️ Viewport height: ${blockingAnalysis.viewportHeight}`);
      console.log(`⬇️ Content below viewport: ${blockingAnalysis.isContentBelowViewport}`);
      console.log(`📏 Content too small: ${blockingAnalysis.isContentTooSmall}`);
      console.log('');
      console.log('🔍 Large elements above content:');
      blockingAnalysis.largeElementsAboveContent.forEach((el, i) => {
        console.log(`   ${i+1}. ${el.tag} (${el.height}px high at top=${el.top})`);
      });
    }

    await page.screenshot({ path: 'layout-debug-analysis.png', fullPage: true });
    console.log('📸 Screenshot saved: layout-debug-analysis.png');

  } catch (error) {
    console.error('💥 Error:', error.message);
  } finally {
    await browser.close();
  }
})();
