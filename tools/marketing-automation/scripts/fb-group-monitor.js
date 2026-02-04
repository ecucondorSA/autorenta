#!/usr/bin/env node

/**
 * Facebook Group Monitor for Edison
 *
 * Monitors Facebook groups for car owner posts and:
 * - Extracts vehicle information (model, year, photos)
 * - Saves prospects to Supabase
 * - Queues comment and DM actions
 *
 * Uses Patchright for anti-bot detection
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

// Supabase
const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null;

// Keywords that indicate a car owner post
const CAR_OWNER_KEYWORDS = [
    'alquilo',
    'disponible',
    'vendo',
    'mi auto',
    'mi vehiculo',
    'gnc',
    'nafta',
    'diesel',
    'km',
    'modelo',
    'año',
    'ano',
    'chofer',
    'conductor',
    'uber',
    'cabify',
    'didi'
];

// Car brands to detect
const CAR_BRANDS = [
    'toyota', 'corolla', 'hilux', 'etios', 'yaris',
    'volkswagen', 'vw', 'gol', 'polo', 'virtus', 'amarok',
    'ford', 'focus', 'fiesta', 'ranger', 'ecosport',
    'chevrolet', 'cruze', 'onix', 'tracker', 's10',
    'fiat', 'cronos', 'argo', 'mobi', 'strada',
    'renault', 'sandero', 'logan', 'duster', 'kangoo',
    'peugeot', '208', '308', '2008', '3008',
    'citroen', 'c3', 'c4', 'berlingo',
    'honda', 'civic', 'hrv', 'crv', 'fit',
    'nissan', 'kicks', 'frontier', 'sentra', 'versa',
    'hyundai', 'hb20', 'tucson', 'creta',
    'kia', 'rio', 'sportage', 'seltos',
    'jeep', 'renegade', 'compass',
    'byd', 'dolphin', 'seal', 'atto3'
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

function randomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function extractYear(text) {
    // Match years like 2018, 2019, 2020, etc.
    const yearMatch = text.match(/\b(201[0-9]|202[0-6])\b/);
    return yearMatch ? parseInt(yearMatch[1]) : null;
}

function extractBrand(text) {
    const lowerText = text.toLowerCase();
    for (const brand of CAR_BRANDS) {
        if (lowerText.includes(brand)) {
            return brand;
        }
    }
    return null;
}

function isCarOwnerPost(text) {
    const lowerText = text.toLowerCase();
    let score = 0;

    for (const keyword of CAR_OWNER_KEYWORDS) {
        if (lowerText.includes(keyword)) {
            score++;
        }
    }

    // Also check for brand mentions
    if (extractBrand(text)) {
        score += 2;
    }

    // Check for year
    if (extractYear(text)) {
        score += 2;
    }

    // Threshold: at least 3 indicators
    return score >= 3;
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

    console.log('[Monitor] Launching browser...');

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
// GROUP MONITORING
// ============================================

async function loadGroups() {
    const groupsPath = path.join(CONFIG_DIR, 'fb-groups.json');
    try {
        const data = await fs.readFile(groupsPath, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        console.error('[Monitor] Could not load groups:', e.message);
        return { groups: [] };
    }
}

async function monitorGroup(groupUrl, groupName) {
    const page = await getPage();
    const prospects = [];

    try {
        console.log(`[Monitor] Scanning: ${groupName}`);
        await page.goto(groupUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(randomDelay(2000, 4000));

        // Scroll to load more posts
        for (let i = 0; i < 3; i++) {
            await page.mouse.wheel(0, 800);
            await page.waitForTimeout(randomDelay(1500, 2500));
        }

        // Find all posts
        const postElements = await page.$$('div[data-ad-preview="message"]');
        console.log(`[Monitor] Found ${postElements.length} posts`);

        for (const postEl of postElements.slice(0, 10)) { // Limit to 10 posts
            try {
                // Get post text
                const textContent = await postEl.textContent();
                if (!textContent) continue;

                // Check if it's a car owner post
                if (!isCarOwnerPost(textContent)) {
                    continue;
                }

                // Try to get poster name
                const nameEl = await postEl.evaluateHandle(el => {
                    const link = el.closest('[role="article"]')?.querySelector('a[role="link"] strong');
                    return link?.textContent || null;
                });
                const posterName = await nameEl.jsonValue();

                // Try to get post URL
                const postUrl = await postEl.evaluate(el => {
                    const article = el.closest('[role="article"]');
                    const links = article?.querySelectorAll('a[href*="/posts/"], a[href*="/permalink/"]');
                    return links?.[0]?.href || null;
                });

                // Extract vehicle info
                const brand = extractBrand(textContent);
                const year = extractYear(textContent);

                // Count photos (look for images in the post)
                const photoCount = await postEl.evaluate(el => {
                    const article = el.closest('[role="article"]');
                    const images = article?.querySelectorAll('img[src*="scontent"]');
                    return images?.length || 0;
                });

                const prospect = {
                    facebook_name: posterName,
                    source_group: groupName,
                    source_post_url: postUrl,
                    car_brand: brand,
                    car_year: year,
                    photos_count: photoCount,
                    raw_text: textContent.substring(0, 500),
                    detected_at: new Date().toISOString()
                };

                console.log(`[Monitor] Found prospect: ${posterName || 'Unknown'} - ${brand || 'Unknown brand'} ${year || ''}`);
                prospects.push(prospect);

            } catch (e) {
                // Skip problematic posts
                continue;
            }
        }

    } catch (error) {
        console.error(`[Monitor] Error scanning ${groupName}:`, error.message);
    }

    return prospects;
}

async function saveProspects(prospects) {
    if (!supabase || prospects.length === 0) {
        return;
    }

    try {
        // Check for existing prospects to avoid duplicates
        for (const prospect of prospects) {
            if (!prospect.source_post_url) continue;

            const { data: existing } = await supabase
                .from('fb_prospects')
                .select('id')
                .eq('source_post_url', prospect.source_post_url)
                .single();

            if (!existing) {
                const { error } = await supabase
                    .from('fb_prospects')
                    .insert({
                        facebook_name: prospect.facebook_name,
                        source_group: prospect.source_group,
                        source_post_url: prospect.source_post_url,
                        car_brand: prospect.car_brand,
                        car_year: prospect.car_year,
                        photos_count: prospect.photos_count,
                        notes: prospect.raw_text,
                        status: 'new'
                    });

                if (error) {
                    console.error('[Monitor] DB insert error:', error.message);
                } else {
                    console.log(`[Monitor] Saved prospect: ${prospect.facebook_name}`);
                }
            }
        }
    } catch (e) {
        console.error('[Monitor] Save error:', e.message);
    }
}

// ============================================
// MAIN MONITORING LOOP
// ============================================

async function runMonitoring() {
    console.log('\n[Monitor] === FACEBOOK GROUP MONITORING ===\n');

    const config = await loadGroups();
    const groups = config.groups.filter(g =>
        g.status === 'joined' || g.status === 'active'
    );

    if (groups.length === 0) {
        console.log('[Monitor] No groups configured');
        return;
    }

    await launchBrowser();

    let allProspects = [];

    for (const group of groups) {
        const prospects = await monitorGroup(group.url, group.name);
        allProspects = allProspects.concat(prospects);

        // Delay between groups
        if (groups.indexOf(group) < groups.length - 1) {
            const delay = randomDelay(10000, 20000);
            console.log(`[Monitor] Waiting ${Math.round(delay / 1000)}s before next group...\n`);
            await new Promise(r => setTimeout(r, delay));
        }
    }

    // Save to database
    await saveProspects(allProspects);

    console.log('\n[Monitor] === MONITORING COMPLETE ===');
    console.log(`[Monitor] Groups scanned: ${groups.length}`);
    console.log(`[Monitor] Prospects found: ${allProspects.length}`);

    // Save to local file as backup
    const outputPath = path.join(CONFIG_DIR, 'prospects-latest.json');
    await fs.writeFile(outputPath, JSON.stringify(allProspects, null, 2));
    console.log(`[Monitor] Saved to: ${outputPath}`);
}

async function getProspectStats() {
    if (!supabase) {
        console.log('[Monitor] Supabase not configured');
        return;
    }

    const { data, error } = await supabase
        .from('fb_prospects')
        .select('status')
        .then(res => {
            const stats = {};
            for (const row of res.data || []) {
                stats[row.status] = (stats[row.status] || 0) + 1;
            }
            return { data: stats, error: res.error };
        });

    if (error) {
        console.error('[Monitor] Stats error:', error.message);
        return;
    }

    console.log('\n[Monitor] Prospect Statistics:');
    console.log(JSON.stringify(data, null, 2));
}

// ============================================
// CLI
// ============================================

async function main() {
    const command = process.argv[2];

    switch (command) {
        case 'scan':
            await runMonitoring();
            break;

        case 'stats':
            await getProspectStats();
            break;

        case 'test':
            console.log('[Monitor] Testing keyword detection...');
            const testTexts = [
                'Alquilo mi Toyota Corolla 2020 con GNC, excelente estado',
                'Busco chofer para Uber en CABA',
                'Vendo VW Gol 2018 nafta 80000km',
                'Hola a todos, buen dia',
                'Disponible mi auto para Uber/Cabify, modelo 2019'
            ];
            for (const text of testTexts) {
                console.log(`"${text.substring(0, 50)}..." => ${isCarOwnerPost(text) ? 'CAR OWNER' : 'skip'}`);
            }
            break;

        default:
            console.log(`
Facebook Group Monitor for Edison
==================================

Usage:
  bun fb-group-monitor.js scan      Scan all configured groups for car owners
  bun fb-group-monitor.js stats     Show prospect statistics from database
  bun fb-group-monitor.js test      Test keyword detection logic

Environment:
  PATCHRIGHT_PROFILE    Browser profile dir (default: /home/edu/.patchright-profile)
  SUPABASE_URL          Supabase URL
  SUPABASE_SERVICE_ROLE_KEY  Supabase service key

The monitor will:
1. Open each configured Facebook group
2. Scan recent posts for car owner indicators
3. Extract vehicle info (brand, year, photos)
4. Save prospects to Supabase fb_prospects table
5. Output results to config/prospects-latest.json
            `);
    }

    await closeBrowser();
}

main().catch(console.error);

export { monitorGroup, isCarOwnerPost, runMonitoring };
