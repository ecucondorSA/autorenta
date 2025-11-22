const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();

  try {
    console.log('🔄 Navegando a booking-detail-payment...');
    
    const url = 'http://localhost:4200/bookings/detail-payment?carId=b288ed1c-9544-44e1-b159-8e3354250518&startDate=2025-11-19T00:00:00.000Z&endDate=2025-11-21T00:00:00.000Z';
    
    await page.goto(url, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Esperar a que cargue
    await page.waitForTimeout(5000);
    
    // Tomar screenshot
    await page.screenshot({ 
      path: '/tmp/booking-payment-snapshot.png',
      fullPage: true 
    });
    
    console.log('✅ Screenshot guardado: /tmp/booking-payment-snapshot.png');
    
    // Extraer texto de la página
    const pageText = await page.evaluate(() => document.body.innerText);
    
    // Buscar la tasa de conversión
    const rateMatch = pageText.match(/1\s*USD\s*=\s*\$?\s*([\d,\.]+)\s*ARS/i);
    const totalMatch = pageText.match(/Total.*?\$\s*([\d,\.]+)\s*ARS/i);
    
    console.log('\n📊 Información detectada:');
    console.log('Tasa de conversión:', rateMatch ? rateMatch[1] : 'NO ENCONTRADA');
    console.log('Total en ARS:', totalMatch ? totalMatch[1] : 'NO ENCONTRADO');
    
    if (!rateMatch || rateMatch[1] === '' || rateMatch[1] === 'ARS') {
      console.log('\n❌ ERROR: La tasa de conversión NO se está mostrando correctamente');
      process.exit(1);
    } else {
      console.log('\n✅ SUCCESS: La tasa de conversión se está mostrando correctamente');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: '/tmp/error-screenshot.png' });
    throw error;
  } finally {
    await browser.close();
  }
})();
