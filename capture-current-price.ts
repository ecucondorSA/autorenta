import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Script para capturar screenshot del precio actual en la página de autos
 * Genera evidencia visual del estado actual antes de cambios
 */

async function captureCurrentPrice() {
  console.log('🚀 Iniciando captura de precios actuales...');
  
  const browser = await chromium.launch({
    headless: true,
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  
  const page = await context.newPage();
  
  try {
    console.log('📡 Navegando a http://localhost:4200/cars...');
    
    // Navegar a la página de autos
    await page.goto('http://localhost:4200/cars', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    
    console.log('⏳ Esperando a que carguen las tarjetas de autos...');
    
    // Esperar a que aparezcan las tarjetas de autos
    await page.waitForSelector('app-car-card', { timeout: 15000 });
    
    // Esperar un poco más para que se carguen los precios dinámicos
    await page.waitForTimeout(2000);
    
    // Capturar screenshot de toda la página
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotPath = path.join(process.cwd(), `price-screenshot-${timestamp}.png`);
    
    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
    });
    
    console.log(`✅ Screenshot guardado en: ${screenshotPath}`);
    
    // Extraer información de precios visible en la página
    const priceData = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('app-car-card'));
      
      return cards.slice(0, 5).map((card, index) => {
        const carName = card.querySelector('h3, .car-name, [class*="name"]')?.textContent?.trim() || 'Unknown';
        const priceElement = card.querySelector('[class*="price"], .price, [class*="precio"]');
        const priceText = priceElement?.textContent?.trim() || 'No price found';
        
        return {
          index: index + 1,
          carName,
          priceText,
        };
      });
    });
    
    console.log('\n📊 Precios capturados:');
    console.log('━'.repeat(60));
    priceData.forEach(car => {
      console.log(`${car.index}. ${car.carName}`);
      console.log(`   💰 ${car.priceText}`);
    });
    console.log('━'.repeat(60));
    
    // Guardar datos en JSON
    const dataPath = path.join(process.cwd(), `price-data-${timestamp}.json`);
    fs.writeFileSync(dataPath, JSON.stringify(priceData, null, 2));
    console.log(`\n📝 Datos guardados en: ${dataPath}`);
    
    // Capturar screenshot de la primera tarjeta específicamente
    const firstCard = await page.locator('app-car-card').first();
    if (firstCard) {
      const cardScreenshotPath = path.join(process.cwd(), `price-first-card-${timestamp}.png`);
      await firstCard.screenshot({ path: cardScreenshotPath });
      console.log(`🎯 Screenshot de primera tarjeta: ${cardScreenshotPath}`);
    }
    
  } catch (error) {
    console.error('❌ Error al capturar screenshot:', error);
    throw error;
  } finally {
    await browser.close();
    console.log('\n✨ Captura completada');
  }
}

captureCurrentPrice().catch(console.error);
