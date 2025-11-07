#!/usr/bin/env node

/**
 * Script para verificar criterios de aceptación de /profile/location
 * y tomar capturas de cada criterio
 */

import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCREENSHOT_DIR = path.join(__dirname, '../test-results/location-settings-verification');

// Crear directorio si no existe
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  console.log(`📁 Directorio creado: ${SCREENSHOT_DIR}`);
}

const BASE_URL = 'http://localhost:4200';

async function takeScreenshot(page, name, description) {
  console.log(`📸 ${description}...`);
  const filepath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`   ✅ Guardado: ${filepath}`);
  return filepath;
}

async function main() {
  console.log('🚀 Iniciando verificación de criterios de aceptación...\n');

  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 
  });

  const context = await browser.newContext({
    permissions: ['geolocation'],
    geolocation: { latitude: -34.6037, longitude: -58.3816 }, // Buenos Aires
    viewport: { width: 1920, height: 1080 },
  });

  const page = await context.newPage();

  try {
    // Login primero
    console.log('\n🔐 Haciendo login...');
    await page.goto(`${BASE_URL}/auth/login`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    await page.waitForTimeout(2000);

    // Buscar campos de login
    const emailInput = page.locator('input[type="email"], input[name="email"], #login-email').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"], #login-password').first();
    const loginButton = page.locator('button[type="submit"], button:has-text("Ingresar"), button:has-text("Login")').first();

    // Credenciales de test
    const testEmail = 'test-renter@autorenta.com';
    const testPassword = 'TestPassword123!';

    if (await emailInput.count() > 0 && await passwordInput.count() > 0) {
      await emailInput.fill(testEmail);
      await passwordInput.fill(testPassword);
      await loginButton.click();
      
      // Esperar a que se complete el login - verificar múltiples indicadores
      try {
        await page.waitForURL(/\/cars|\/profile|\//, { timeout: 20000 });
        await page.waitForTimeout(2000);
        
        // Verificar que no estamos en login
        const currentUrl = page.url();
        if (currentUrl.includes('/auth/login')) {
          console.log('   ⚠️ Aún en login, esperando más tiempo...');
          await page.waitForTimeout(5000);
        }
        
        console.log('   ✅ Login completado');
      } catch (e) {
        console.log('   ⚠️ Timeout esperando login, continuando...');
      }
    } else {
      console.log('   ⚠️ No se encontraron campos de login, continuando...');
    }

    // Criterio 1: Página accesible
    console.log('\n🔍 Criterio 1: Página accesible en /profile/location');
    
    // Si aún estamos en login, intentar navegar directamente
    const currentUrl = page.url();
    if (currentUrl.includes('/auth/login')) {
      console.log('   ⚠️ Aún en login, intentando navegar directamente...');
    }
    
    await page.goto(`${BASE_URL}/profile/location`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    
    // Esperar a que cargue completamente
    await page.waitForTimeout(5000);
    
    // Si redirigió a login, tomar captura de eso también
    const finalUrl = page.url();
    if (finalUrl.includes('/auth/login')) {
      console.log('   ⚠️ Redirigido a login - la página requiere autenticación');
    } else {
      console.log(`   ✅ Navegación exitosa a: ${finalUrl}`);
    }
    await takeScreenshot(page, '01-pagina-accesible', 'Capturando página accesible');

    // Verificar URL
    const url = page.url();
    console.log(`   URL actual: ${url}`);

    // Criterio 2: Mapa con pin
    console.log('\n🔍 Criterio 2: Mapa permite colocar pin para casa');
    await page.waitForTimeout(2000);
    
    // Buscar mapa
    const mapSelectors = [
      'app-location-map-picker',
      '.map-container',
      '[class*="map"]',
      'canvas',
    ];
    
    let mapFound = false;
    for (const selector of mapSelectors) {
      const element = page.locator(selector).first();
      if (await element.count() > 0) {
        console.log(`   ✅ Mapa encontrado con selector: ${selector}`);
        mapFound = true;
        break;
      }
    }

    await takeScreenshot(page, '02-mapa-con-pin', 'Capturando mapa con pin');

    // Criterio 3: Botón guardar coordenadas
    console.log('\n🔍 Criterio 3: Coordenadas guardadas en home_latitude/longitude');
    const saveButton = page.locator('button:has-text("Guardar"), button:has-text("Guardar Ubicación")').first();
    const saveButtonExists = await saveButton.count() > 0;
    console.log(`   ${saveButtonExists ? '✅' : '⚠️'} Botón guardar: ${saveButtonExists ? 'encontrado' : 'no encontrado'}`);
    await takeScreenshot(page, '03-boton-guardar-coordenadas', 'Capturando botón guardar');

    // Criterio 4: Botón verificación
    console.log('\n🔍 Criterio 4: Botón de verificación dispara verificación');
    const verifyButton = page.locator('button:has-text("Verificar"), button:has-text("Verificar Ubicación")').first();
    const verifyButtonExists = await verifyButton.count() > 0;
    console.log(`   ${verifyButtonExists ? '✅' : '⚠️'} Botón verificación: ${verifyButtonExists ? 'encontrado' : 'no encontrado (puede requerir ubicación guardada)'}`);
    await takeScreenshot(page, '04-boton-verificacion', 'Capturando botón verificación');

    // Criterio 5: Slider de radio
    console.log('\n🔍 Criterio 5: Slider de radio (5-100 km) guarda preferencia');
    const slider = page.locator('input[type="range"]').first();
    const sliderExists = await slider.count() > 0;
    
    if (sliderExists) {
      const min = await slider.getAttribute('min');
      const max = await slider.getAttribute('max');
      const value = await slider.getAttribute('value');
      console.log(`   ✅ Slider encontrado - min: ${min}, max: ${max}, valor: ${value}`);
      
      if (max && parseInt(max) > 100) {
        console.log(`   ⚠️ ADVERTENCIA: Slider max es ${max}, debería ser 100`);
      }
    } else {
      console.log('   ⚠️ Slider no encontrado');
    }
    await takeScreenshot(page, '05-slider-radio', 'Capturando slider de radio');

    // Criterio 6: Configuraciones de privacidad
    console.log('\n🔍 Criterio 6: Configuraciones de privacidad funcionan');
    const privacyText = page.locator('text=Privacidad, text=Ubicación Privada, text=Información Pública').first();
    const privacyExists = await privacyText.count() > 0;
    console.log(`   ${privacyExists ? '✅' : '⚠️'} Sección privacidad: ${privacyExists ? 'encontrada' : 'no encontrada'}`);
    await takeScreenshot(page, '06-configuraciones-privacidad', 'Capturando configuraciones de privacidad');

    // Captura completa final
    console.log('\n📸 Tomando captura completa...');
    await takeScreenshot(page, '00-vista-completa', 'Captura completa de la página');

    console.log('\n✅ Verificación completada!');
    console.log(`📁 Capturas guardadas en: ${SCREENSHOT_DIR}\n`);

    // Listar archivos creados
    const files = fs.readdirSync(SCREENSHOT_DIR);
    console.log('Archivos generados:');
    files.forEach(file => {
      const filepath = path.join(SCREENSHOT_DIR, file);
      const stats = fs.statSync(filepath);
      console.log(`   - ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
    });

  } catch (error) {
    console.error('❌ Error durante la verificación:', error.message);
    await takeScreenshot(page, 'error-screenshot', 'Captura de error');
  } finally {
    await browser.close();
  }
}

main().catch(console.error);

