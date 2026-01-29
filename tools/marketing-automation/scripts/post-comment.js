#!/usr/bin/env node

/**
 * Playwright Script: Post Comment with Human Behavior
 * 
 * Automatiza el posting de comentarios en Facebook con comportamiento humano
 * para evitar detección de bots.
 */

import { chromium } from 'playwright';
import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';

// Configuración
const HEADLESS = process.env.HEADLESS !== 'false'; // Default: headless
const SCREENSHOT_DIR = process.env.SCREENSHOT_DIR || './screenshots';
const COOKIES_DIR = process.env.COOKIES_DIR || './cookies';

/**
 * Simula delays humanos con variación
 */
function humanDelay(min = 100, max = 300) {
    const delay = Math.floor(Math.random() * (max - min) + min);
    return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Simula typing humano con velocidad variable
 */
async function humanType(page, selector, text) {
    await page.click(selector);
    await humanDelay(200, 500);

    for (const char of text) {
        await page.type(selector, char, { delay: Math.random() * 100 + 50 });

        // Pausas ocasionales (como si estuvieras pensando)
        if (Math.random() < 0.1) {
            await humanDelay(500, 1500);
        }
    }

    await humanDelay(300, 800);
}

/**
 * Simula scroll humano
 */
async function humanScroll(page, distance = 300) {
    await page.mouse.wheel(0, distance);
    await humanDelay(500, 1000);
}

/**
 * Carga cookies de sesión desde archivo
 */
async function loadCookies(personaId) {
    const cookiesPath = path.join(COOKIES_DIR, `${personaId}.json`);
    try {
        const cookiesData = await fs.readFile(cookiesPath, 'utf-8');
        return JSON.parse(cookiesData);
    } catch (error) {
        throw new Error(`Cookies not found for persona ${personaId}: ${error.message}`);
    }
}

/**
 * Guarda cookies de sesión
 */
async function saveCookies(context, personaId) {
    const cookies = await context.cookies();
    const cookiesPath = path.join(COOKIES_DIR, `${personaId}.json`);
    await fs.writeFile(cookiesPath, JSON.stringify(cookies, null, 2));
}

/**
 * Guarda screenshot de evidencia
 */
async function saveScreenshot(page, personaId, actionType) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${personaId}_${actionType}_${timestamp}.png`;
    const filepath = path.join(SCREENSHOT_DIR, filename);

    await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
    await page.screenshot({ path: filepath, fullPage: true });

    return filepath;
}

/**
 * Configura navegador con fingerprinting anti-detección
 */
async function launchBrowserWithProxy(proxyConfig = null) {
    const args = [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
    ];

    const launchOptions = {
        headless: HEADLESS,
        args,
    };

    // Agregar proxy si existe
    if (proxyConfig) {
        launchOptions.proxy = {
            server: proxyConfig.server,
            username: proxyConfig.username,
            password: proxyConfig.password,
        };
    }

    const browser = await chromium.launch(launchOptions);

    // Crear contexto con user agent realista
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1366, height: 768 },
        locale: 'es-AR',
        timezoneId: 'America/Argentina/Buenos_Aires',
        deviceScaleFactor: 1,
        hasTouch: false,
        isMobile: false,
    });

    // Inyectar scripts anti-detección
    await context.addInitScript(() => {
        // Ocultar webdriver
        Object.defineProperty(navigator, 'webdriver', {
            get: () => false,
        });

        // Mock plugins y mimetypes
        Object.defineProperty(navigator, 'plugins', {
            get: () => [1, 2, 3, 4, 5],
        });

        Object.defineProperty(navigator, 'languages', {
            get: () => ['es-AR', 'es', 'en-US', 'en'],
        });

        // Override permissions
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
            parameters.name === 'notifications'
                ? Promise.resolve({ state: Notification.permission })
                : originalQuery(parameters)
        );
    });

    return { browser, context };
}

/**
 * Login a Facebook con cookies
 */
async function loginWithCookies(context, personaId) {
    const cookies = await loadCookies(personaId);
    await context.addCookies(cookies);
}

/**
 * Navega al post objetivo
 */
async function navigateToPost(page, postUrl) {
    await page.goto(postUrl, { waitUntil: 'networkidle' });
    await humanDelay(2000, 4000);

    // Scroll aleatorio para simular lectura
    await humanScroll(page, 200);
    await humanDelay(1000, 2000);
    await humanScroll(page, 300);
    await humanDelay(1500, 3000);
}

/**
 * Encuentra el campo de comentario
 */
async function findCommentBox(page) {
    // Selectores comunes de Facebook (pueden variar)
    const selectors = [
        'div[aria-label="Escribe un comentario..."]',
        'div[aria-label="Write a comment..."]',
        'div[contenteditable="true"][role="textbox"]',
        'textarea[placeholder*="comentario"]',
    ];

    for (const selector of selectors) {
        try {
            const element = await page.$(selector);
            if (element) {
                return selector;
            }
        } catch (error) {
            // Continuar con siguiente selector
        }
    }

    throw new Error('Comment box not found');
}

/**
 * Publica el comentario
 */
async function postComment(page, content) {
    const commentBoxSelector = await findCommentBox(page);

    // Click en el campo de comentario
    await page.click(commentBoxSelector);
    await humanDelay(500, 1000);

    // Typing humano
    await humanType(page, commentBoxSelector, content);

    // Pausa antes de publicar (como si estuvieras revisando)
    await humanDelay(2000, 4000);

    // Buscar botón de publicar
    const submitSelectors = [
        'div[aria-label="Comentar"]',
        'div[aria-label="Comment"]',
        'button:has-text("Comentar")',
        'button:has-text("Comment")',
    ];

    let submitted = false;
    for (const selector of submitSelectors) {
        try {
            const button = await page.$(selector);
            if (button) {
                await button.click();
                submitted = true;
                break;
            }
        } catch (error) {
            // Intentar siguiente selector
        }
    }

    if (!submitted) {
        // Fallback: Enter key
        await page.keyboard.press('Enter');
    }

    // Esperar confirmación
    await humanDelay(2000, 3000);
}

/**
 * Verifica si el comentario fue publicado exitosamente
 */
async function verifyCommentPosted(page, content) {
    try {
        // Buscar el contenido del comentario en la página
        const commentText = content.substring(0, 50); // Primeros 50 chars
        await page.waitForSelector(`:text("${commentText}")`, { timeout: 5000 });
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * MAIN: Ejecuta el posting de comentario
 */
export async function executeCommentPosting({
    personaId,
    postUrl,
    content,
    proxyConfig = null,
}) {
    let browser, context, page;

    try {
        console.log(`[${personaId}] Iniciando posting de comentario...`);

        // Delay aleatorio inicial (15-60 min ya pasó en n8n, este es micro delay)
        await humanDelay(5000, 15000);

        // Launch browser
        ({ browser, context } = await launchBrowserWithProxy(proxyConfig));
        page = await context.newPage();

        // Login con cookies
        console.log(`[${personaId}] Cargando sesión...`);
        await loginWithCookies(context, personaId);

        // Navegar al post
        console.log(`[${personaId}] Navegando a: ${postUrl}`);
        await navigateToPost(page, postUrl);

        // Screenshot pre-comment
        const screenshotPre = await saveScreenshot(page, personaId, 'pre-comment');
        console.log(`[${personaId}] Screenshot pre: ${screenshotPre}`);

        // Publicar comentario
        console.log(`[${personaId}] Publicando comentario...`);
        await postComment(page, content);

        // Verificar
        const success = await verifyCommentPosted(page, content);

        // Screenshot post-comment
        const screenshotPost = await saveScreenshot(page, personaId, 'post-comment');
        console.log(`[${personaId}] Screenshot post: ${screenshotPost}`);

        // Guardar cookies actualizadas
        await saveCookies(context, personaId);

        // Resultado
        const result = {
            success,
            persona_id: personaId,
            post_url: postUrl,
            content,
            screenshots: {
                pre: screenshotPre,
                post: screenshotPost,
            },
            timestamp: new Date().toISOString(),
        };

        console.log(`[${personaId}] Resultado:`, success ? 'SUCCESS' : 'FAILED');

        return result;
    } catch (error) {
        console.error(`[${personaId}] Error:`, error.message);

        // Screenshot de error
        if (page) {
            try {
                const screenshotError = await saveScreenshot(page, personaId, 'error');
                console.log(`[${personaId}] Screenshot error: ${screenshotError}`);
            } catch (screenshotError) {
                // Ignore screenshot error
            }
        }

        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
    const args = process.argv.slice(2);

    if (args.length < 3) {
        console.log(`
Usage:
  node post-comment.js <persona-id> <post-url> <content> [proxy-server]

Example:
  node post-comment.js persona-001 "https://facebook.com/..." "Buen punto! Yo..." "http://proxy:8080"
    `);
        process.exit(1);
    }

    const [personaId, postUrl, content, proxyServer] = args;
    const proxyConfig = proxyServer ? { server: proxyServer } : null;

    executeCommentPosting({ personaId, postUrl, content, proxyConfig })
        .then(result => {
            console.log('\nResult:', JSON.stringify(result, null, 2));
            process.exit(result.success ? 0 : 1);
        })
        .catch(error => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}
