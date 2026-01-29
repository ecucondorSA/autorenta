#!/usr/bin/env node

/**
 * Cookie Extractor - Abre browser, esperá login, guarda cookies al cerrar
 * 
 * USO: node extract-cookies.js autorentar
 */

import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const accountName = process.argv[2] || 'autorentar';
const cookiesPath = path.join(__dirname, '../cookies', `${accountName}.json`);

console.log(`
🔐 EXTRACTOR DE COOKIES
=======================

1. Se va a abrir Facebook
2. Logueate con la cuenta: ${accountName}
3. Cuando estés en el feed, CERRÁ el browser (click en X)
4. Las cookies se guardarán automáticamente

`);

(async () => {
    await fs.mkdir(path.join(__dirname, '../cookies'), { recursive: true });

    const browser = await chromium.launch({
        headless: false,
        args: ['--start-maximized']
    });

    const context = await browser.newContext({
        locale: 'es-AR',
        timezoneId: 'America/Argentina/Buenos_Aires',
        viewport: null // Usar tamaño de ventana
    });

    const page = await context.newPage();
    await page.goto('https://www.facebook.com/');

    console.log('👀 Browser abierto. Logueate y después CERRÁ el browser...\n');

    // Esperar a que el browser se cierre
    await new Promise(resolve => {
        browser.on('disconnected', resolve);
    });

    // Guardar cookies antes de terminar
    try {
        const cookies = await context.cookies();
        await fs.writeFile(cookiesPath, JSON.stringify(cookies, null, 2));
        console.log(`\n✅ Cookies guardadas en: ${cookiesPath}`);
        console.log(`   Total: ${cookies.length} cookies`);
    } catch (e) {
        console.log('\n⚠️ No se pudieron guardar cookies (browser cerrado antes de tiempo)');
    }
})();
