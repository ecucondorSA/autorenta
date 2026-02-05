
import 'dotenv/config';
import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';

const COOKIES_PATH = 'cookies/persona-001.json';

(async () => {
    console.log('🚀 Iniciando escáner de grupos...');
    
    // Cargar cookies
    let cookies;
    try {
        const cookiesData = await fs.readFile(COOKIES_PATH, 'utf-8');
        cookies = JSON.parse(cookiesData);
        console.log('✅ Cookies cargadas.');
    } catch (e) {
        console.error('❌ Error cargando cookies:', e.message);
        process.exit(1);
    }

    const browser = await chromium.launch({ headless: true }); // Headless para rapidez
    const context = await browser.newContext();
    await context.addCookies(cookies);
    const page = await context.newPage();

    try {
        console.log('📍 Navegando a Facebook Grupos...');
        await page.goto('https://www.facebook.com/groups/?category=membership', { waitUntil: 'networkidle' });
        
        // Verificar login
        if (await page.$('input[name="email"]')) {
            console.error('❌ Login falló. Las cookies expiraron.');
            await page.screenshot({ path: 'screenshots/login-fail.png' });
            process.exit(1);
        }

        console.log('✅ Login exitoso. Escaneando lista...');
        
        // Esperar a que cargue la lista
        await page.waitForSelector('div[role="feed"], div[aria-label="Grupos"], a[href*="/groups/"]');
        
        // Scroll para cargar más
        for (let i = 0; i < 5; i++) {
            await page.mouse.wheel(0, 1000);
            await page.waitForTimeout(1000);
        }

        // Extraer grupos
        const groups = await page.$$eval('a[href*="/groups/"]', anchors => {
            return anchors
                .filter(a => a.innerText.length > 3) // Filtrar enlaces vacíos
                .map(a => ({
                    name: a.innerText.split('\n')[0], // Tomar solo la primera línea (nombre)
                    url: a.href.split('?')[0] // Limpiar parámetros
                }));
        });

        // Filtrar duplicados
        const uniqueGroups = [...new Map(groups.map(item => [item.url, item])).values()];

        console.log(`\n🎉 ¡Encontrados ${uniqueGroups.length} grupos!`);
        console.log('===========================================');
        uniqueGroups.forEach((g, i) => console.log(`${i+1}. ${g.name} (${g.url})`));

    } catch (error) {
        console.error('❌ Error durante el escaneo:', error);
        await page.screenshot({ path: 'screenshots/scan-error.png' });
    } finally {
        await browser.close();
    }
})();
