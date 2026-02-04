#!/usr/bin/env node

/**
 * Edison Facebook Agent for Autorentar
 *
 * Uses Patchright (anti-bot Playwright) with persistent profile to:
 * - Post in Facebook groups
 * - Comment on car owner posts
 * - Send DMs to prospects
 *
 * Based on scheduled-publisher.js but migrated to Patchright
 */

import { chromium } from 'patchright';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// CONFIGURATION
// ============================================

const USER_DATA_DIR = process.env.PATCHRIGHT_PROFILE || '/home/edu/.patchright-profile';
const CONFIG_DIR = path.join(__dirname, '../config');
const PROMPTS_DIR = path.join(__dirname, '../prompts');

// Supabase for logging
const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null;

// ============================================
// EDISON CONTENT TEMPLATES
// ============================================

const EDISON_POSTS = [
    {
        type: 'direct',
        text: 'Duenos de autos en Buenos Aires! Desde Autorentar estamos sumando vehiculos para alquiler turistico. Si tu auto esta parado, hacelo producir. Publicalo en autorentar.com/cars/publish o pasame modelo, ano y fotos. Te generamos reservas con turistas. Dale! ⚡'
    },
    {
        type: 'urgency',
        text: 'Hay demanda de autos para turistas y faltan vehiculos. Si tenes auto, es el momento. Publicalo en autorentar.com/cars/publish o pasame modelo, ano y fotos que lo subimos hoy mismo. Dale que hay demanda! ⚡'
    },
    {
        type: 'social_proof',
        text: 'Ya tenemos vehiculos generando ingresos para sus duenos con turistas. Si tenes un auto, sumate en autorentar.com/cars/publish o pasame modelo, ano y fotos. Todo el resto lo hacemos nosotros. ⚡'
    },
    {
        type: 'call',
        text: 'Autorentar busca vehiculos para turismo en Buenos Aires. Si tenes auto, publicalo en autorentar.com/cars/publish o pasame modelo, ano y fotos. Verificamos turistas y te generamos reservas. Mandale! ⚡'
    },
    {
        type: 'direct_v2',
        text: 'Che! Tenes un auto que puede generar ingresos? Desde Autorentar estamos sumando vehiculos para turistas. Publicalo en autorentar.com/cars/publish o pasame modelo, ano y fotos. ⚡'
    },
    {
        type: 'urgency_v2',
        text: 'Turistas buscando autos y no hay suficientes vehiculos. Si tenes uno, publicalo en autorentar.com/cars/publish o mandame modelo, ano y fotos. Te generamos reservas. No te duermas! ⚡'
    }
];

const EDISON_COMMENTS = [
    'Che {nombre}! Lindo {auto}. Desde Autorentar estamos sumando vehiculos para turismo. Publicalo en autorentar.com/cars/publish o pasame fotos por privado. ⚡',
    '{nombre}, si buscas poner tu auto a generar con turistas, publicalo en autorentar.com/cars/publish. Nosotros te generamos reservas. ⚡',
    'Che, desde Autorentar estamos sumando vehiculos. Publicalo en autorentar.com/cars/publish o pasame modelo, ano y fotos. ⚡',
    'Buenas {nombre}! Vi tu publicacion. Desde Autorentar buscamos vehiculos para turismo. Publicalo en autorentar.com/cars/publish o mandame datos por privado. ⚡'
];

const EDISON_DMS = {
    initial: 'Buenas {nombre}! Vi tu {auto} en {grupo}. Desde Autorentar estamos sumando vehiculos para alquiler turistico. Publicalo vos mismo en autorentar.com/cars/publish o pasame modelo, ano y fotos que lo subimos nosotros. Te generamos reservas con turistas. Dale! ⚡',
    followup_3: '{nombre}, te escribi hace unos dias. Si queres sumar tu auto a Autorentar, publicalo en autorentar.com/cars/publish o pasame modelo, ano y fotos. ⚡',
    followup_7: '{nombre}, ultimo mensaje. Si tu auto puede generar ingresos con turistas, publicalo en autorentar.com/cars/publish. Si no te interesa, tranqui. ⚡'
};

// ============================================
// HUMAN-LIKE BEHAVIOR
// ============================================

function randomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

async function humanType(page, text) {
    for (const char of text) {
        await page.keyboard.type(char, { delay: randomDelay(50, 150) });
        // Occasional pause to simulate thinking
        if (Math.random() < 0.1) {
            await page.waitForTimeout(randomDelay(200, 500));
        }
    }
}

async function humanScroll(page, direction = 'down', amount = 300) {
    const scrollAmount = direction === 'down' ? amount : -amount;
    await page.mouse.wheel(0, scrollAmount);
    await page.waitForTimeout(randomDelay(500, 1500));
}

async function humanMove(page, x, y) {
    // Bezier curve movement
    const current = { x: 0, y: 0 };
    const steps = 20;

    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const cx = current.x + (x - current.x) * t + Math.sin(t * Math.PI) * randomDelay(-20, 20);
        const cy = current.y + (y - current.y) * t + Math.sin(t * Math.PI) * randomDelay(-10, 10);
        await page.mouse.move(cx, cy);
        await page.waitForTimeout(randomDelay(5, 15));
    }

    await page.mouse.move(x, y);
}

// ============================================
// BROWSER MANAGEMENT
// ============================================

let browserContext = null;
let activePage = null;

async function launchBrowser() {
    if (browserContext) {
        return browserContext;
    }

    console.log('[Edison] Launching browser with persistent profile...');
    console.log(`[Edison] Profile dir: ${USER_DATA_DIR}`);

    browserContext = await chromium.launchPersistentContext(USER_DATA_DIR, {
        headless: false,
        channel: 'chrome',
        viewport: { width: 1366, height: 768 },
        locale: 'es-AR',
        timezoneId: 'America/Argentina/Buenos_Aires',
        args: [
            '--disable-blink-features=AutomationControlled',
            '--no-first-run',
            '--no-default-browser-check'
        ]
    });

    activePage = browserContext.pages()[0] || await browserContext.newPage();

    console.log('[Edison] Browser ready!');
    return browserContext;
}

async function closeBrowser() {
    if (browserContext) {
        await browserContext.close();
        browserContext = null;
        activePage = null;
    }
}

async function getPage() {
    if (!activePage) {
        await launchBrowser();
    }
    return activePage;
}

// ============================================
// FACEBOOK ACTIONS
// ============================================

async function loadGroups() {
    const groupsPath = path.join(CONFIG_DIR, 'fb-groups.json');
    try {
        const data = await fs.readFile(groupsPath, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        console.error('[Edison] Could not load groups config:', e.message);
        return { groups: [], posting_rules: {} };
    }
}

async function postToGroup(groupUrl, content) {
    const page = await getPage();

    try {
        console.log(`[Edison] Navigating to group: ${groupUrl}`);
        await page.goto(groupUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(randomDelay(2000, 4000));

        // Find and click the post box
        const postBoxSelectors = [
            'div[role="button"]:has-text("Escribir algo")',
            'div[role="button"]:has-text("Qué estás pensando")',
            'div[role="button"]:has-text("Write something")',
            'span:has-text("Escribir algo")',
            '[aria-label*="Crear una publicación"]'
        ];

        let clicked = false;
        for (const selector of postBoxSelectors) {
            try {
                const element = await page.$(selector);
                if (element && await element.isVisible()) {
                    const box = await element.boundingBox();
                    if (box) {
                        await humanMove(page, box.x + box.width / 2, box.y + box.height / 2);
                        await page.waitForTimeout(randomDelay(200, 500));
                        await element.click();
                        clicked = true;
                        console.log('[Edison] Opened post dialog');
                        break;
                    }
                }
            } catch {
                continue;
            }
        }

        if (!clicked) {
            console.log('[Edison] Could not find post box');
            return { success: false, error: 'Post box not found' };
        }

        await page.waitForTimeout(randomDelay(1500, 2500));

        // Find text area and type content
        const textareaSelectors = [
            'div[contenteditable="true"][role="textbox"]',
            'div[aria-label*="Escribe algo"]',
            'div[data-lexical-editor="true"]'
        ];

        let typed = false;
        for (const selector of textareaSelectors) {
            try {
                const textarea = await page.$(selector);
                if (textarea) {
                    await textarea.click();
                    await page.waitForTimeout(randomDelay(300, 600));
                    await humanType(page, content);
                    typed = true;
                    console.log('[Edison] Typed content');
                    break;
                }
            } catch {
                continue;
            }
        }

        if (!typed) {
            console.log('[Edison] Could not type content');
            return { success: false, error: 'Textarea not found' };
        }

        await page.waitForTimeout(randomDelay(1000, 2000));

        // Click publish button
        const publishSelectors = [
            'div[aria-label="Publicar"]',
            'button:has-text("Publicar")',
            'span:has-text("Publicar")',
            '[aria-label="Post"]'
        ];

        for (const selector of publishSelectors) {
            try {
                const button = await page.$(selector);
                if (button && await button.isVisible()) {
                    await button.click();
                    console.log('[Edison] Clicked publish');
                    await page.waitForTimeout(randomDelay(3000, 5000));

                    // Log to Supabase
                    await logAction('post', groupUrl, content, true);

                    return { success: true };
                }
            } catch {
                continue;
            }
        }

        console.log('[Edison] Publish button not found');
        return { success: false, error: 'Publish button not found' };

    } catch (error) {
        console.error('[Edison] Post error:', error.message);
        await logAction('post', groupUrl, content, false, error.message);
        return { success: false, error: error.message };
    }
}

async function commentOnPost(postUrl, comment) {
    const page = await getPage();

    try {
        console.log(`[Edison] Navigating to post: ${postUrl}`);
        await page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(randomDelay(2000, 3000));

        // Scroll down to see comments
        await humanScroll(page, 'down', 400);
        await page.waitForTimeout(randomDelay(1000, 2000));

        // Find comment box
        const commentSelectors = [
            'div[aria-label*="Escribe un comentario"]',
            'div[contenteditable="true"][aria-label*="comentario"]',
            '[placeholder*="Escribe un comentario"]'
        ];

        let commentBox = null;
        for (const selector of commentSelectors) {
            try {
                const element = await page.$(selector);
                if (element && await element.isVisible()) {
                    commentBox = element;
                    break;
                }
            } catch {
                continue;
            }
        }

        if (!commentBox) {
            console.log('[Edison] Comment box not found');
            return { success: false, error: 'Comment box not found' };
        }

        await commentBox.click();
        await page.waitForTimeout(randomDelay(500, 1000));
        await humanType(page, comment);

        // Press Enter to submit
        await page.waitForTimeout(randomDelay(500, 1000));
        await page.keyboard.press('Enter');

        console.log('[Edison] Comment posted');
        await page.waitForTimeout(randomDelay(2000, 3000));

        await logAction('comment', postUrl, comment, true);
        return { success: true };

    } catch (error) {
        console.error('[Edison] Comment error:', error.message);
        await logAction('comment', postUrl, comment, false, error.message);
        return { success: false, error: error.message };
    }
}

async function sendDM(userId, message, context = {}) {
    const page = await getPage();

    try {
        // Navigate to Messenger conversation
        const messengerUrl = `https://www.facebook.com/messages/t/${userId}`;
        console.log(`[Edison] Opening Messenger: ${messengerUrl}`);

        await page.goto(messengerUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(randomDelay(2000, 4000));

        // Find message input
        const inputSelectors = [
            'div[aria-label*="Mensaje"]',
            'div[contenteditable="true"][role="textbox"]',
            '[aria-label*="Message"]'
        ];

        let inputBox = null;
        for (const selector of inputSelectors) {
            try {
                const element = await page.$(selector);
                if (element && await element.isVisible()) {
                    inputBox = element;
                    break;
                }
            } catch {
                continue;
            }
        }

        if (!inputBox) {
            console.log('[Edison] Message input not found');
            return { success: false, error: 'Message input not found' };
        }

        // Personalize message
        let personalizedMessage = message
            .replace('{nombre}', context.nombre || '')
            .replace('{auto}', context.auto || 'auto')
            .replace('{grupo}', context.grupo || 'el grupo');

        await inputBox.click();
        await page.waitForTimeout(randomDelay(500, 1000));
        await humanType(page, personalizedMessage);

        // Press Enter to send
        await page.waitForTimeout(randomDelay(500, 1000));
        await page.keyboard.press('Enter');

        console.log('[Edison] DM sent');
        await page.waitForTimeout(randomDelay(2000, 3000));

        await logAction('dm', userId, personalizedMessage, true);
        return { success: true };

    } catch (error) {
        console.error('[Edison] DM error:', error.message);
        await logAction('dm', userId, message, false, error.message);
        return { success: false, error: error.message };
    }
}

// ============================================
// LOGGING
// ============================================

async function logAction(type, target, content, success, error = null) {
    if (!supabase) return;

    try {
        await supabase.from('fb_posts_log').insert({
            post_type: type,
            group_url: target,
            post_content: content,
            success,
            error_message: error
        });
    } catch (e) {
        console.error('[Edison] Log error:', e.message);
    }
}

// ============================================
// STATE MANAGEMENT
// ============================================

async function loadState() {
    const statePath = path.join(CONFIG_DIR, 'edison-state.json');
    try {
        const data = await fs.readFile(statePath, 'utf-8');
        return JSON.parse(data);
    } catch {
        return {
            postsToday: 0,
            commentsToday: 0,
            dmsToday: 0,
            lastPostDate: null,
            lastPostTime: null,
            lastCommentTime: null,
            lastDmTime: null,
            groupPostIndex: {},
            contentIndex: 0
        };
    }
}

async function saveState(state) {
    const statePath = path.join(CONFIG_DIR, 'edison-state.json');
    await fs.writeFile(statePath, JSON.stringify(state, null, 2));
}

// ============================================
// SCHEDULED ACTIONS
// ============================================

async function runScheduledPosts(count = 2) {
    console.log('\n[Edison] === SCHEDULED POSTING ===\n');

    const config = await loadGroups();
    const state = await loadState();
    const rules = config.posting_rules;

    // Check if new day
    const today = new Date().toISOString().split('T')[0];
    if (state.lastPostDate !== today) {
        state.postsToday = 0;
        state.lastPostDate = today;
    }

    // Check daily limit
    if (state.postsToday >= rules.max_posts_per_day) {
        console.log(`[Edison] Daily limit reached (${rules.max_posts_per_day} posts)`);
        return;
    }

    // Check time since last post
    if (state.lastPostTime) {
        const elapsed = Date.now() - new Date(state.lastPostTime).getTime();
        const minDelay = rules.min_hours_between_posts * 60 * 60 * 1000;
        if (elapsed < minDelay) {
            const waitMin = Math.round((minDelay - elapsed) / 60000);
            console.log(`[Edison] Wait ${waitMin} minutes before next post`);
            return;
        }
    }

    await launchBrowser();

    // Filter available groups (joined status)
    const availableGroups = config.groups.filter(g =>
        g.status === 'joined' || g.status === 'active'
    );

    const postsToMake = Math.min(count, rules.max_posts_per_day - state.postsToday);
    console.log(`[Edison] Making ${postsToMake} posts...\n`);

    for (let i = 0; i < postsToMake; i++) {
        // Select group (round robin)
        const groupIndex = (state.contentIndex + i) % availableGroups.length;
        const group = availableGroups[groupIndex];

        // Check if we posted to this group today
        const groupKey = group.id;
        if (state.groupPostIndex[groupKey] === today) {
            console.log(`[Edison] Already posted to ${group.name} today, skipping`);
            continue;
        }

        // Select content
        const content = EDISON_POSTS[(state.contentIndex + i) % EDISON_POSTS.length];

        console.log(`[Edison] Post ${i + 1}/${postsToMake}`);
        console.log(`[Edison] Group: ${group.name}`);
        console.log(`[Edison] Type: ${content.type}`);
        console.log(`[Edison] Content: ${content.text.substring(0, 60)}...`);

        const result = await postToGroup(group.url, content.text);

        if (result.success) {
            state.postsToday++;
            state.lastPostTime = new Date().toISOString();
            state.groupPostIndex[groupKey] = today;
            state.contentIndex++;
            await saveState(state);
            console.log(`[Edison] SUCCESS!\n`);
        } else {
            console.log(`[Edison] FAILED: ${result.error}\n`);
        }

        // Delay between posts
        if (i < postsToMake - 1) {
            const delay = randomDelay(30000, 60000);
            console.log(`[Edison] Waiting ${Math.round(delay / 1000)}s...\n`);
            await new Promise(r => setTimeout(r, delay));
        }
    }

    console.log('\n[Edison] === POSTING COMPLETE ===');
    console.log(`[Edison] Posts today: ${state.postsToday}/${rules.max_posts_per_day}`);
}

// ============================================
// CLI
// ============================================

async function main() {
    const command = process.argv[2];

    switch (command) {
        case 'post':
            const count = parseInt(process.argv[3]) || 2;
            await runScheduledPosts(count);
            break;

        case 'comment':
            const postUrl = process.argv[3];
            const comment = process.argv[4];
            if (!postUrl || !comment) {
                console.log('Usage: edison-fb-agent.js comment <post-url> <comment>');
                process.exit(1);
            }
            await launchBrowser();
            await commentOnPost(postUrl, comment);
            break;

        case 'dm':
            const userId = process.argv[3];
            const message = process.argv[4];
            if (!userId || !message) {
                console.log('Usage: edison-fb-agent.js dm <user-id> <message>');
                process.exit(1);
            }
            await launchBrowser();
            await sendDM(userId, message, {});
            break;

        case 'test':
            console.log('[Edison] Testing browser launch...');
            await launchBrowser();
            const page = await getPage();
            await page.goto('https://www.facebook.com');
            console.log('[Edison] Browser test successful!');
            console.log('[Edison] Press Ctrl+C to close');
            break;

        default:
            console.log(`
Edison Facebook Agent for Autorentar
=====================================

Usage:
  bun edison-fb-agent.js post [count]     Post to Facebook groups (default: 2)
  bun edison-fb-agent.js comment <url> <text>  Comment on a post
  bun edison-fb-agent.js dm <user-id> <message>  Send DM
  bun edison-fb-agent.js test             Test browser launch

Environment:
  PATCHRIGHT_PROFILE    Browser profile dir (default: /home/edu/.patchright-profile)
  SUPABASE_URL          Supabase URL for logging
  SUPABASE_SERVICE_ROLE_KEY  Supabase key for logging

Examples:
  bun edison-fb-agent.js post 3
  bun edison-fb-agent.js comment "https://facebook.com/groups/xxx/posts/123" "Che! Lindo auto..."
  bun edison-fb-agent.js dm "100012345678" "Buenas! Vi tu auto..."
            `);
    }

    // Keep browser open for test mode
    if (command !== 'test') {
        await closeBrowser();
    }
}

main().catch(console.error);

export { postToGroup, commentOnPost, sendDM, runScheduledPosts };
