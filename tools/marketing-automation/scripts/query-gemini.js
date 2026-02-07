
import 'dotenv/config';
import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';

const USER_DATA_DIR = '/home/edu/.config/google-chrome'; // Intento usar el perfil real de Chrome

(async () => {
    console.log('🚀 Iniciando consulta a Gemini...');
    
    // Lanzar navegador persistente
    const browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
        headless: false, // Necesitamos verlo para depurar
        channel: 'chrome', // Usar Chrome real
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    try {
        console.log('📍 Navegando a Gemini...');
        await page.goto('https://gemini.google.com/app', { waitUntil: 'networkidle' });
        
        // Verificar si estamos logueados
        if (page.url().includes('accounts.google.com')) {
            console.error('❌ Requiere Login. No puedo continuar automáticamente.');
            await page.screenshot({ path: 'gemini-login-req.png' });
            process.exit(1);
        }

        console.log('✅ Sesión activa. Escribiendo prompt...');
        
        // Esperar input (el selector puede variar, busco genérico)
        const inputSelector = 'div[contenteditable="true"], textarea';
        await page.waitForSelector(inputSelector);
        
        const prompt = "Analiza la identidad personal de Eduardo: quien es, donde vive, cuales son sus redes sociales, sus intereses personales y su trayectoria profesional? Dame un perfil psicografico y biografico completo.";
        
        await page.type(inputSelector, prompt, { delay: 50 });
        await page.keyboard.press('Enter');

        console.log('⏳ Esperando respuesta...');
        await page.waitForTimeout(15000); // Esperar a que genere

        // Capturar
        await page.screenshot({ path: 'gemini-web-response.png', fullPage: true });
        console.log('📸 Captura guardada: gemini-web-response.png');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await browser.close();
    }
})();
