const { chromium } = require('playwright');

(async () => {
  console.log('🔍 Analyzing Hidden Content Issue...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1200, height: 800 }
  });
  const page = await context.newPage();

  try {
    // Login first
    console.log('🔐 Logging in...');
    await page.goto('http://localhost:4200/auth/login');
    await page.fill('input[type="email"]', 'ecucondor@gmail.com');
    await page.fill('input[type="password"]', 'Ab.12345');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // Go to driver profile
    console.log('📍 Navigating to driver-profile...');
    await page.goto('http://localhost:4200/profile/driver-profile');
    await page.waitForTimeout(3000);

    console.log('📊 Analyzing layout and CSS...');

    // Get page dimensions
    const viewport = await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
      scrollHeight: document.body.scrollHeight,
      scrollTop: window.scrollY
    }));
    console.log('📐 Viewport:', viewport);

    // Analyze the toolbar
    const toolbarInfo = await page.evaluate(() => {
      const toolbar = document.querySelector('ion-toolbar');
      if (!toolbar) return null;
      
      const rect = toolbar.getBoundingClientRect();
      const computed = window.getComputedStyle(toolbar);
      
      return {
        position: computed.position,
        top: computed.top,
        zIndex: computed.zIndex,
        height: rect.height,
        rect: {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        },
        classes: toolbar.className
      };
    });
    console.log('🔧 Toolbar info:', toolbarInfo);

    // Analyze ion-content
    const contentInfo = await page.evaluate(() => {
      const content = document.querySelector('ion-content');
      if (!content) return null;
      
      const rect = content.getBoundingClientRect();
      const computed = window.getComputedStyle(content);
      
      return {
        position: computed.position,
        top: computed.top,
        marginTop: computed.marginTop,
        paddingTop: computed.paddingTop,
        height: rect.height,
        scrollHeight: content.scrollHeight,
        rect: {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        },
        overflow: computed.overflow,
        classes: content.className
      };
    });
    console.log('📄 Content info:', contentInfo);

    // Check for overlapping elements
    const overlappingElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const overlapping = [];
      
      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        const rect = el.getBoundingClientRect();
        const computed = window.getComputedStyle(el);
        
        if (computed.position === 'fixed' || computed.position === 'absolute') {
          overlapping.push({
            tag: el.tagName,
            classes: el.className,
            position: computed.position,
            top: computed.top,
            zIndex: computed.zIndex,
            rect: {
              top: rect.top,
              height: rect.height,
              width: rect.width
            }
          });
        }
      }
      
      return overlapping;
    });
    console.log('🔄 Fixed/Absolute positioned elements:', overlapping.length);
    overlappingElements.forEach((el, i) => {
      console.log(`  ${i+1}. ${el.tag} - position: ${el.position}, top: ${el.top}, z-index: ${el.zIndex}`);
    });

    // Check verification banner specifically
    const bannerInfo = await page.evaluate(() => {
      const banner = document.querySelector('app-verification-prompt-banner');
      if (!banner) return null;
      
      const rect = banner.getBoundingClientRect();
      const computed = window.getComputedStyle(banner);
      
      return {
        position: computed.position,
        top: computed.top,
        zIndex: computed.zIndex,
        height: rect.height,
        visible: computed.visibility,
        display: computed.display,
        rect: rect,
        classes: banner.className
      };
    });
    console.log('🔔 Verification banner info:', bannerInfo);

    // Take screenshot before scrolling
    await page.screenshot({ path: 'layout-analysis-before.png', fullPage: true });

    // Try scrolling to see hidden content
    console.log('📜 Testing scroll behavior...');
    const scrollInfo = await page.evaluate(() => {
      const initialScroll = window.scrollY;
      window.scrollTo(0, 100);
      const newScroll = window.scrollY;
      
      return {
        initialScroll,
        newScroll,
        canScroll: newScroll !== initialScroll,
        maxScroll: document.body.scrollHeight - window.innerHeight
      };
    });
    console.log('📜 Scroll info:', scrollInfo);

    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'layout-analysis-after-scroll.png', fullPage: true });

    // Check for CSS issues
    const cssIssues = await page.evaluate(() => {
      const issues = [];
      
      // Check for height: 100vh issues
      const elements = document.querySelectorAll('*');
      for (let el of elements) {
        const computed = window.getComputedStyle(el);
        if (computed.height === '100vh' || computed.maxHeight === '100vh') {
          issues.push({
            tag: el.tagName,
            classes: el.className,
            issue: 'height: 100vh detected',
            height: computed.height,
            maxHeight: computed.maxHeight
          });
        }
        
        if (computed.overflow === 'hidden' && el.scrollHeight > el.clientHeight) {
          issues.push({
            tag: el.tagName,
            classes: el.className,
            issue: 'overflow hidden with scrollable content',
            scrollHeight: el.scrollHeight,
            clientHeight: el.clientHeight
          });
        }
      }
      
      return issues;
    });
    
    console.log('⚠️ Potential CSS issues found:', cssIssues.length);
    cssIssues.forEach((issue, i) => {
      console.log(`  ${i+1}. ${issue.tag}: ${issue.issue}`);
    });

    // Test specific elements visibility
    const elementVisibility = await page.evaluate(() => {
      const selectors = [
        'ion-header',
        'ion-toolbar', 
        'ion-content',
        'app-verification-prompt-banner',
        'ion-footer',
        '.main-content'
      ];
      
      return selectors.map(selector => {
        const el = document.querySelector(selector);
        if (!el) return { selector, exists: false };
        
        const rect = el.getBoundingClientRect();
        const computed = window.getComputedStyle(el);
        
        return {
          selector,
          exists: true,
          visible: rect.height > 0 && computed.visibility !== 'hidden',
          rect: {
            top: rect.top,
            height: rect.height,
            bottom: rect.bottom
          }
        };
      });
    });
    
    console.log('👁️ Element visibility:');
    elementVisibility.forEach(el => {
      console.log(`  ${el.selector}: exists=${el.exists}, visible=${el.visible}`);
      if (el.exists && el.rect) {
        console.log(`    Position: top=${el.rect.top}, height=${el.rect.height}, bottom=${el.rect.bottom}`);
      }
    });

  } catch (error) {
    console.error('💥 Error:', error.message);
  }
  
  console.log('🔍 Analysis complete! Check screenshots for visual comparison.');
  console.log('Press Ctrl+C to close browser.');
  await new Promise(() => {}); // Keep alive
})();
