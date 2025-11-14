const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 }, // iPhone X dimensions
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
  });
  
  const page = await context.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    console.log(`🖥️  CONSOLE [${msg.type()}]:`, msg.text());
  });
  
  // Log errors
  page.on('pageerror', error => {
    console.error('❌ PAGE ERROR:', error.message);
  });
  
  console.log('📱 Navegando a http://localhost:4200/home-v2');
  await page.goto('http://localhost:4200/home-v2', { 
    waitUntil: 'networkidle',
    timeout: 30000 
  });
  
  console.log('⏳ Esperando 2 segundos para que cargue completamente...');
  await page.waitForTimeout(2000);
  
  // Take full page screenshot
  console.log('📸 Tomando captura de pantalla completa...');
  await page.screenshot({ 
    path: 'screenshot-home-v2-full.png',
    fullPage: true 
  });
  
  // Take viewport screenshot (what user sees)
  console.log('📸 Tomando captura del viewport...');
  await page.screenshot({ 
    path: 'screenshot-home-v2-viewport.png',
    fullPage: false 
  });
  
  // Get bottom nav bar element info
  console.log('\n🔍 Inspeccionando elementos de la barra de navegación...');
  const bottomNavExists = await page.locator('.bottom-nav').count() > 0;
  console.log('Bottom nav encontrado:', bottomNavExists);
  
  if (bottomNavExists) {
    const navItemsCount = await page.locator('.bottom-nav .nav-item').count();
    console.log('Número de items de navegación:', navItemsCount);
    
    const navLabels = await page.locator('.bottom-nav .nav-label').allTextContents();
    console.log('Labels de navegación:', navLabels);
    
    // Get bottom nav dimensions and position
    const bottomNavBox = await page.locator('.bottom-nav').boundingBox();
    console.log('Posición y dimensiones de bottom-nav:', bottomNavBox);
    
    // Highlight bottom nav and take screenshot
    await page.evaluate(() => {
      const bottomNav = document.querySelector('.bottom-nav');
      if (bottomNav) {
        bottomNav.style.outline = '3px solid red';
      }
    });
    
    console.log('📸 Tomando captura con bottom-nav resaltado...');
    await page.screenshot({ 
      path: 'screenshot-bottom-nav-highlighted.png',
      fullPage: false 
    });
  } else {
    console.log('⚠️  Bottom nav NO encontrado en la página');
  }
  
  // Scroll to bottom to see the nav bar
  console.log('\n📜 Scrolling hacia abajo...');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1000);
  
  console.log('📸 Tomando captura después del scroll...');
  await page.screenshot({ 
    path: 'screenshot-bottom-after-scroll.png',
    fullPage: false 
  });
  
  // Get all elements info
  console.log('\n🔍 Estructura de elementos:');
  const structure = await page.evaluate(() => {
    const getElementInfo = (selector) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const styles = window.getComputedStyle(el);
      return {
        exists: true,
        tagName: el.tagName,
        className: el.className,
        position: styles.position,
        display: styles.display,
        zIndex: styles.zIndex,
        bottom: styles.bottom,
        left: styles.left,
        right: styles.right,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        top: `${rect.top}px`,
        bottom: `${rect.bottom}px`,
        visible: rect.width > 0 && rect.height > 0
      };
    };
    
    return {
      appRoot: getElementInfo('app-root'),
      bottomNav: getElementInfo('app-bottom-nav-bar'),
      bottomNavInside: getElementInfo('.bottom-nav'),
      homeV2: getElementInfo('.home-v2')
    };
  });
  
  console.log('Estructura:', JSON.stringify(structure, null, 2));
  
  // Take screenshot of bottom portion
  console.log('\n📸 Tomando captura de la parte inferior...');
  await page.screenshot({ 
    path: 'screenshot-bottom-portion.png',
    clip: { x: 0, y: 600, width: 375, height: 212 }
  });
  
  console.log('\n✅ Capturas completadas:');
  console.log('   - screenshot-home-v2-full.png (página completa)');
  console.log('   - screenshot-home-v2-viewport.png (viewport inicial)');
  console.log('   - screenshot-bottom-nav-highlighted.png (con resaltado)');
  console.log('   - screenshot-bottom-after-scroll.png (después de scroll)');
  console.log('   - screenshot-bottom-portion.png (porción inferior)');
  
  await browser.close();
})();
