
const { chromium } = require('patchright');
const path = require('path');

(async () => {
  try {
    console.log('🚀 Iniciando navegador...');
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    const filePath = 'file://' + path.join(__dirname, 'logo-preview.html');
    console.log(`📂 Abriendo archivo: ${filePath}`);
    
    await page.goto(filePath);
    
    // Ajustar viewport para que se vea bien
    await page.setViewportSize({ width: 800, height: 400 });
    
    console.log('📸 Tomando captura de pantalla...');
    // Esperar un poco para asegurar renderizado
    await page.waitForTimeout(1000);
    
    // Hover sobre el logo para mostrar el efecto interactivo (opcional)
    // await page.hover('svg'); 
    
    await page.screenshot({ path: 'logo-capture.png' });
    
    console.log('✅ Captura guardada en: logo-capture.png');
    await browser.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
})();
