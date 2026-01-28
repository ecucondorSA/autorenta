#!/usr/bin/env node

/**
 * Warm-up Protocol for Synthetic Profiles
 * 
 * Simula comportamiento humano gradual para evitar detección:
 * - Día 1-3: Solo scroll y likes aleatorios
 * - Día 4-7: Seguir personas, unirse a grupos, comentarios genéricos
 * - Día 8+: Activar para saturación de marketing
 */

import 'dotenv/config';
import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración
const COOKIES_DIR = process.env.COOKIES_DIR || './cookies';
const HEADLESS = process.env.HEADLESS !== 'false';

// ============================================
// COMPORTAMIENTOS POR DÍA
// ============================================

const WARMUP_ACTIONS = {
    // Día 1-3: Comportamiento pasivo
    'day_1': [
        { action: 'scroll_feed', min: 3, max: 8 },
        { action: 'random_pause', min: 10000, max: 30000 },
        { action: 'scroll_feed', min: 2, max: 5 },
    ],
    'day_2': [
        { action: 'scroll_feed', min: 5, max: 10 },
        { action: 'like_random_post', count: 1 },
        { action: 'random_pause', min: 15000, max: 45000 },
        { action: 'scroll_feed', min: 3, max: 6 },
    ],
    'day_3': [
        { action: 'scroll_feed', min: 4, max: 8 },
        { action: 'like_random_post', count: 2 },
        { action: 'view_profile', count: 1 },
        { action: 'random_pause', min: 20000, max: 60000 },
    ],

    // Día 4-7: Interacción leve
    'day_4': [
        { action: 'scroll_feed', min: 5, max: 10 },
        { action: 'like_random_post', count: 3 },
        { action: 'join_group', groups: ['compra venta autos'] },
        { action: 'random_pause', min: 30000, max: 90000 },
    ],
    'day_5': [
        { action: 'scroll_feed', min: 6, max: 12 },
        { action: 'like_random_post', count: 2 },
        { action: 'comment_generic', count: 1 },
        { action: 'follow_suggested', count: 1 },
    ],
    'day_6': [
        { action: 'scroll_group_feed', group: 'joined' },
        { action: 'like_random_post', count: 3 },
        { action: 'comment_generic', count: 1 },
        { action: 'join_group', groups: ['autos usados'] },
    ],
    'day_7': [
        { action: 'scroll_feed', min: 8, max: 15 },
        { action: 'like_random_post', count: 4 },
        { action: 'comment_generic', count: 2 },
        { action: 'scroll_group_feed', group: 'joined' },
    ],

    // Día 8+: Listo para activación
    'ready': [
        { action: 'activate_for_marketing' }
    ]
};

// Comentarios genéricos que no levantan sospechas
const GENERIC_COMMENTS = [
    '👍',
    'Muy bueno!',
    'Interesante',
    'Gracias por compartir',
    'Buen dato',
    'Me sirve!',
    '💯',
    'Excelente',
    'Coincido',
    'Tal cual',
];

// ============================================
// SIMULADORES DE COMPORTAMIENTO
// ============================================

async function humanDelay(min = 500, max = 2000) {
    const delay = Math.random() * (max - min) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
}

async function humanScroll(page, times = 1) {
    for (let i = 0; i < times; i++) {
        const distance = Math.floor(Math.random() * 400) + 200;
        await page.mouse.wheel(0, distance);
        await humanDelay(800, 2000);

        // Pausa aleatoria para "leer"
        if (Math.random() > 0.7) {
            await humanDelay(3000, 8000);
        }
    }
}

async function scrollFeed(page, config) {
    const times = Math.floor(Math.random() * (config.max - config.min + 1)) + config.min;
    console.log(`  📜 Scrolling feed ${times} times...`);
    await humanScroll(page, times);
}

async function likeRandomPost(page, count = 1) {
    console.log(`  ❤️ Liking ${count} random post(s)...`);

    for (let i = 0; i < count; i++) {
        try {
            // Buscar botones de like
            const likeButtons = await page.$$('[aria-label*="like" i], [aria-label*="gusta" i]');

            if (likeButtons.length > 0) {
                const randomIndex = Math.floor(Math.random() * Math.min(likeButtons.length, 5));
                await likeButtons[randomIndex].click();
                await humanDelay(1000, 3000);
            }
        } catch (error) {
            console.log(`  ⚠️ Could not like post: ${error.message}`);
        }

        await humanScroll(page, 2);
    }
}

async function commentGeneric(page, count = 1) {
    console.log(`  💬 Commenting on ${count} post(s)...`);

    for (let i = 0; i < count; i++) {
        try {
            // Buscar campos de comentario
            const commentBoxes = await page.$$('[aria-label*="comment" i], [aria-label*="comentario" i], [placeholder*="comment" i]');

            if (commentBoxes.length > 0) {
                const randomBox = commentBoxes[Math.floor(Math.random() * Math.min(commentBoxes.length, 3))];
                await randomBox.click();
                await humanDelay(500, 1500);

                const comment = GENERIC_COMMENTS[Math.floor(Math.random() * GENERIC_COMMENTS.length)];

                // Typing humano
                for (const char of comment) {
                    await page.keyboard.type(char, { delay: Math.random() * 100 + 50 });
                }

                await humanDelay(1000, 2000);
                await page.keyboard.press('Enter');
                await humanDelay(2000, 4000);
            }
        } catch (error) {
            console.log(`  ⚠️ Could not comment: ${error.message}`);
        }

        await humanScroll(page, 3);
    }
}

async function joinGroup(page, config) {
    const searchTerm = config.groups[Math.floor(Math.random() * config.groups.length)];
    console.log(`  👥 Searching for group: "${searchTerm}"...`);

    try {
        // Navegar a búsqueda de grupos
        await page.goto('https://www.facebook.com/groups/discover', { waitUntil: 'networkidle' });
        await humanDelay(2000, 4000);

        // Buscar grupo
        const searchBox = await page.$('input[type="search"], input[placeholder*="search" i]');
        if (searchBox) {
            await searchBox.click();
            await humanDelay(500, 1000);

            for (const char of searchTerm) {
                await page.keyboard.type(char, { delay: Math.random() * 100 + 50 });
            }

            await page.keyboard.press('Enter');
            await humanDelay(3000, 5000);

            // Click en primer resultado
            const joinButton = await page.$('text=Unirse, text=Join');
            if (joinButton) {
                await joinButton.click();
                console.log(`  ✅ Requested to join group`);
            }
        }
    } catch (error) {
        console.log(`  ⚠️ Could not join group: ${error.message}`);
    }
}

async function viewProfile(page, count = 1) {
    console.log(`  👤 Viewing ${count} profile(s)...`);

    try {
        const profileLinks = await page.$$('a[href*="/profile.php"], a[href*="facebook.com/"][href*="?"]');

        if (profileLinks.length > 0) {
            const randomProfile = profileLinks[Math.floor(Math.random() * Math.min(profileLinks.length, 5))];
            await randomProfile.click();
            await humanDelay(3000, 8000);
            await humanScroll(page, 2);
            await page.goBack();
        }
    } catch (error) {
        console.log(`  ⚠️ Could not view profile: ${error.message}`);
    }
}

async function followSuggested(page, count = 1) {
    console.log(`  ➕ Following ${count} suggested account(s)...`);

    try {
        const followButtons = await page.$$('text=Follow, text=Seguir, text=Add Friend, text=Agregar');

        if (followButtons.length > 0) {
            for (let i = 0; i < Math.min(count, followButtons.length); i++) {
                await followButtons[i].click();
                await humanDelay(2000, 5000);
            }
        }
    } catch (error) {
        console.log(`  ⚠️ Could not follow: ${error.message}`);
    }
}

// ============================================
// EJECUTOR DE WARM-UP
// ============================================

async function executeWarmup(personaId, day) {
    const dayKey = day >= 8 ? 'ready' : `day_${day}`;
    const actions = WARMUP_ACTIONS[dayKey];

    if (!actions) {
        console.log(`❌ No actions defined for day ${day}`);
        return false;
    }

    console.log(`\n🔥 Starting warm-up for ${personaId} - Day ${day}`);
    console.log(`   Actions: ${actions.map(a => a.action).join(', ')}`);

    // Cargar cookies
    const cookiesPath = path.join(COOKIES_DIR, `${personaId}.json`);
    let cookies;

    try {
        const cookiesData = await fs.readFile(cookiesPath, 'utf-8');
        cookies = JSON.parse(cookiesData);
    } catch (error) {
        console.log(`❌ No cookies found for ${personaId}`);
        return false;
    }

    // Iniciar browser
    const browser = await chromium.launch({
        headless: HEADLESS,
        args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
        ]
    });

    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        locale: 'es-AR',
        timezoneId: 'America/Argentina/Buenos_Aires',
        viewport: { width: 1366, height: 768 },
    });

    await context.addCookies(cookies);
    const page = await context.newPage();

    // Anti-detection
    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    try {
        // Ir a Facebook
        await page.goto('https://www.facebook.com/', { waitUntil: 'networkidle' });
        await humanDelay(3000, 5000);

        // Ejecutar acciones del día
        for (const actionConfig of actions) {
            switch (actionConfig.action) {
                case 'scroll_feed':
                    await scrollFeed(page, actionConfig);
                    break;
                case 'like_random_post':
                    await likeRandomPost(page, actionConfig.count);
                    break;
                case 'comment_generic':
                    await commentGeneric(page, actionConfig.count);
                    break;
                case 'join_group':
                    await joinGroup(page, actionConfig);
                    break;
                case 'view_profile':
                    await viewProfile(page, actionConfig.count);
                    break;
                case 'follow_suggested':
                    await followSuggested(page, actionConfig.count);
                    break;
                case 'random_pause':
                    const pause = Math.random() * (actionConfig.max - actionConfig.min) + actionConfig.min;
                    console.log(`  ⏸️ Pausing for ${Math.round(pause / 1000)}s...`);
                    await new Promise(r => setTimeout(r, pause));
                    break;
                case 'activate_for_marketing':
                    console.log(`  ✅ ${personaId} is ready for marketing activation!`);
                    break;
            }

            await humanDelay(2000, 5000);
        }

        // Guardar cookies actualizadas
        const updatedCookies = await context.cookies();
        await fs.writeFile(cookiesPath, JSON.stringify(updatedCookies, null, 2));

        console.log(`\n✅ Warm-up completed for ${personaId} - Day ${day}`);
        return true;

    } catch (error) {
        console.error(`❌ Warm-up error for ${personaId}:`, error.message);
        return false;
    } finally {
        await browser.close();
    }
}

// ============================================
// ORQUESTADOR
// ============================================

async function runDailyWarmup() {
    console.log('🌅 Starting daily warm-up routine...\n');

    // Cargar estado de personas
    const statusPath = path.join(__dirname, '../config/warmup-status.json');
    let status;

    try {
        status = JSON.parse(await fs.readFile(statusPath, 'utf-8'));
    } catch {
        status = {};
    }

    // Cargar identidades
    const identitiesPath = path.join(__dirname, '../config/synthetic-identities.json');
    let identities;

    try {
        identities = JSON.parse(await fs.readFile(identitiesPath, 'utf-8'));
    } catch {
        console.log('❌ No identities found. Run generate-identities.js first.');
        return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const identity of identities) {
        const personaStatus = status[identity.id] || { day: 1, lastRun: null };

        // Verificar si ya corrió hoy
        const today = new Date().toISOString().split('T')[0];
        if (personaStatus.lastRun === today) {
            console.log(`⏭️ ${identity.name} already warmed up today, skipping`);
            continue;
        }

        // Si ya está listo (day >= 8), skip
        if (personaStatus.day >= 8) {
            console.log(`✅ ${identity.name} is already ready for marketing`);
            continue;
        }

        // Ejecutar warm-up
        const success = await executeWarmup(identity.id, personaStatus.day);

        if (success) {
            status[identity.id] = {
                day: personaStatus.day + 1,
                lastRun: today
            };
            successCount++;
        } else {
            errorCount++;
        }

        // Delay entre personas (evitar patrones)
        const delay = Math.random() * 60000 + 30000; // 30-90 segundos
        console.log(`\n⏳ Waiting ${Math.round(delay / 1000)}s before next persona...\n`);
        await new Promise(r => setTimeout(r, delay));
    }

    // Guardar estado
    await fs.writeFile(statusPath, JSON.stringify(status, null, 2));

    console.log('\n📊 Daily warm-up summary:');
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
}

// CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const command = process.argv[2];
    const personaId = process.argv[3];
    const day = parseInt(process.argv[4]) || 1;

    if (command === 'run' && personaId) {
        executeWarmup(personaId, day)
            .then(() => process.exit(0))
            .catch(err => {
                console.error(err);
                process.exit(1);
            });
    } else if (command === 'daily') {
        runDailyWarmup()
            .then(() => process.exit(0))
            .catch(err => {
                console.error(err);
                process.exit(1);
            });
    } else {
        console.log(`
Usage:
  node warmup-protocol.js run <persona-id> [day]    Run warm-up for specific persona
  node warmup-protocol.js daily                     Run daily warm-up for all personas

Examples:
  node warmup-protocol.js run persona-001 1
  node warmup-protocol.js daily
        `);
    }
}

export { executeWarmup, runDailyWarmup };
