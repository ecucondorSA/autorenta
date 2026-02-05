#!/usr/bin/env bun

/**
 * Edison Autonomous - Facebook Outreach WITHOUT LLM
 *
 * Scrapes → Filters → Comments automatically
 * No tokens consumed, runs via cron
 *
 * Usage:
 *   bun edison-autonomous.ts run          # Full cycle
 *   bun edison-autonomous.ts scrape       # Only scrape
 *   bun edison-autonomous.ts stats        # Show stats
 *   bun edison-autonomous.ts test         # Test browser
 */

import { chromium, type BrowserContext, type Page } from 'patchright';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ============================================
// CONFIGURATION
// ============================================

// Use dedicated profile to avoid conflicts with MCP sessions
const USER_DATA_DIR = process.env.EDISON_PROFILE || '/home/edu/.edison-profile';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase: SupabaseClient | null = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

// ============================================
// SCORING SYSTEM (NO LLM)
// ============================================

const CAR_BRANDS = [
  'toyota', 'corolla', 'hilux', 'etios', 'yaris',
  'volkswagen', 'vw', 'gol', 'polo', 'virtus', 'amarok',
  'ford', 'focus', 'fiesta', 'ranger', 'ecosport',
  'chevrolet', 'cruze', 'onix', 'tracker', 's10',
  'fiat', 'cronos', 'argo', 'mobi', 'strada',
  'renault', 'sandero', 'logan', 'duster', 'kangoo',
  'peugeot', 'citroen', 'c3', 'c4',
  'honda', 'civic', 'hrv', 'crv', 'fit',
  'nissan', 'kicks', 'frontier', 'sentra',
  'hyundai', 'tucson', 'creta',
  'kia', 'rio', 'sportage',
  'jeep', 'renegade', 'compass',
  'byd', 'dolphin', 'seal'
];

function extractBrand(text: string): string | null {
  const lower = text.toLowerCase();
  for (const brand of CAR_BRANDS) {
    // Use word boundary to avoid "a cargo" matching "argo"
    const regex = new RegExp(`\\b${brand}\\b`, 'i');
    if (regex.test(lower)) return brand;
  }
  return null;
}

function extractYear(text: string): number | null {
  const match = text.match(/\b(201[0-9]|202[0-6])\b/);
  return match ? parseInt(match[1]) : null;
}

function extractName(text: string): string {
  // Try to extract author name from post header patterns
  const patterns = [
    /^([A-Z][a-záéíóú]+ [A-Z][a-záéíóú]+)/,  // "Juan Perez"
    /^([A-Z][a-záéíóú]+):/,                   // "Juan:"
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[1];
  }
  return '';
}

interface ScoredPost {
  text: string;
  score: number;
  authorName: string;
  brand: string | null;
  year: number | null;
  url: string;
  reasons: string[];
}

function scorePost(text: string, url: string = ''): ScoredPost {
  let score = 0;
  const reasons: string[] = [];
  const lower = text.toLowerCase();

  // === POSITIVE: Owner offering ===
  if (/\balquilo\b/.test(lower)) {
    score += 4;
    reasons.push('+4 "alquilo"');
  }
  if (/\bdisponible\b/.test(lower)) {
    score += 2;
    reasons.push('+2 "disponible"');
  }
  if (/\bmi auto\b|\bmi vehiculo\b/.test(lower)) {
    score += 3;
    reasons.push('+3 "mi auto/vehiculo"');
  }
  if (/\$\s*\d+/.test(text)) {
    score += 3;
    reasons.push('+3 precio $');
  }
  if (/por d[ií]a|por semana|diario|semanal|x\s*sem/i.test(lower)) {
    score += 3;
    reasons.push('+3 tarifa temporal');
  }

  const brand = extractBrand(text);
  if (brand) {
    score += 2;
    reasons.push(`+2 marca: ${brand}`);
  }

  const year = extractYear(text);
  if (year) {
    score += 2;
    reasons.push(`+2 año: ${year}`);
  }

  // === NEGATIVE: Driver seeking ===
  if (/\bbusco\b.*\b(auto|vehiculo|carro)\b/i.test(lower)) {
    score -= 15;
    reasons.push('-15 chofer buscando');
  }
  if (/\bnecesito\b.*\b(auto|vehiculo|alquilar)\b/i.test(lower)) {
    score -= 15;
    reasons.push('-15 chofer necesita');
  }
  if (/\bquiero alquilar\b/i.test(lower)) {
    score -= 15;
    reasons.push('-15 quiere alquilar');
  }

  // === NEGATIVE: Outside Argentina ===
  if (/\+53|\bcuba\b/i.test(lower)) {
    score -= 25;
    reasons.push('-25 Cuba');
  }
  if (/\bvenezuela\b|\bmiami\b|\bflorida\b/i.test(lower)) {
    score -= 25;
    reasons.push('-25 fuera de ARG');
  }

  // === NEGATIVE: Sale (not rental) ===
  if (/\bvendo\b/i.test(lower) && !/alquilo/i.test(lower)) {
    score -= 8;
    reasons.push('-8 venta');
  }
  if (/\bcuotas\b|\bfinanciacion\b|\bpermuto\b|\btomo menor\b/i.test(lower)) {
    score -= 8;
    reasons.push('-8 financiación/permuta');
  }

  // === POSITIVE: Argentina location ===
  if (/\bcaba\b|buenos aires|\bamba\b/i.test(lower)) {
    score += 2;
    reasons.push('+2 Buenos Aires');
  }
  if (/zona\s*(norte|sur|oeste|oeste)/i.test(lower)) {
    score += 2;
    reasons.push('+2 zona AMBA');
  }
  if (/\+54\s*\d/.test(text)) {
    score += 2;
    reasons.push('+2 tel ARG');
  }

  return {
    text: text.substring(0, 500),
    score,
    authorName: extractName(text),
    brand,
    year,
    url,
    reasons
  };
}

// ============================================
// COMMENT TEMPLATES (ROTATED)
// ============================================

const COMMENT_TEMPLATES = [
  "Che {nombre}! Lindo auto. Desde Autorentar te conseguimos reservas con turistas. autorentar.com/cars/publish ⚡",
  "{nombre}, si querés sumar turistas además de choferes, pasame los datos. autorentar.com/cars/publish ⚡",
  "Buenas {nombre}! Desde Autorentar buscamos vehiculos para turismo. autorentar.com/cars/publish ⚡",
  "Che! Si te interesa alquiler turistico, sumalo en autorentar.com/cars/publish o pasame modelo y año. ⚡",
  "{nombre}, tenemos turistas buscando autos como el tuyo. Publicalo en autorentar.com/cars/publish ⚡",
  "Desde Autorentar estamos sumando vehiculos para turistas. autorentar.com/cars/publish Dale! ⚡"
];

function getTemplate(index: number): string {
  return COMMENT_TEMPLATES[index % COMMENT_TEMPLATES.length];
}

function personalizeTemplate(template: string, post: ScoredPost): string {
  let msg = template;
  const name = post.authorName || '';

  // If no name, remove name placeholder entirely
  if (!name) {
    msg = msg.replace(/\{nombre\}[,!]?\s*/g, '');
    msg = msg.replace(/^\s+/, '');
  } else {
    msg = msg.replace('{nombre}', name);
  }

  return msg;
}

// ============================================
// HUMAN BEHAVIOR
// ============================================

function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

async function humanType(page: Page, text: string): Promise<void> {
  for (const char of text) {
    await page.keyboard.type(char, { delay: randomDelay(50, 120) });
    if (Math.random() < 0.08) {
      await page.waitForTimeout(randomDelay(150, 400));
    }
  }
}

async function humanScroll(page: Page, amount: number = 600): Promise<void> {
  await page.mouse.wheel(0, amount);
  await page.waitForTimeout(randomDelay(800, 1500));
}

// ============================================
// BROWSER
// ============================================

let context: BrowserContext | null = null;
let page: Page | null = null;

async function launchBrowser(): Promise<Page> {
  if (page) return page;

  console.log('[Edison] Launching browser...');

  context = await chromium.launchPersistentContext(USER_DATA_DIR, {
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

  page = context.pages()[0] || await context.newPage();
  console.log('[Edison] Browser ready');
  return page;
}

async function closeBrowser(): Promise<void> {
  if (context) {
    await context.close();
    context = null;
    page = null;
  }
}

// ============================================
// SCRAPING
// ============================================

interface RawPost {
  text: string;
  url: string;
  element?: any;
}

async function scrapeFacebookSearch(): Promise<RawPost[]> {
  const p = await launchBrowser();
  const posts: RawPost[] = [];

  const searchUrl = 'https://www.facebook.com/search/posts?q=alquilo%20auto%20uber%20buenos%20aires';

  console.log('[Edison] Navigating to FB Search...');
  await p.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await p.waitForTimeout(randomDelay(5000, 8000)); // Wait for JS to render

  // Scroll to load more posts
  console.log('[Edison] Scrolling to load posts...');
  for (let i = 0; i < 8; i++) {
    await humanScroll(p, 900);
    await p.waitForTimeout(randomDelay(2000, 3500));
  }

  // Extract posts - try multiple selectors
  console.log('[Edison] Extracting posts...');

  // Facebook uses different structures, try multiple approaches
  let postElements = await p.$$('div[role="article"]');
  console.log(`[Edison] Found ${postElements.length} articles`);

  // Alternative: find posts by data attribute
  if (postElements.length < 3) {
    const altPosts = await p.$$('[data-ad-preview="message"]');
    console.log(`[Edison] Alt selector found ${altPosts.length} posts`);
  }

  // Try getting posts with their parent context to find URLs
  const extractedPosts = await p.$$eval('div[dir="auto"]', (els) => {
    const results: Array<{text: string, url: string}> = [];
    for (const el of els) {
      const text = el.textContent || '';
      if (text.length < 50 || text.length > 2000) continue;
      if (!text.toLowerCase().includes('alquilo') &&
          !text.toLowerCase().includes('disponible')) continue;

      // Find parent article or container
      let container = el.parentElement;
      for (let i = 0; i < 10 && container; i++) {
        if (container.getAttribute('role') === 'article' ||
            container.getAttribute('data-pagelet')) break;
        container = container.parentElement;
      }

      // Find URL in container
      let url = '';
      if (container) {
        const links = container.querySelectorAll('a[href*="/posts/"], a[href*="/permalink/"], a[href*="story_fbid"]');
        if (links.length > 0) {
          url = (links[0] as HTMLAnchorElement).href || '';
        }
      }

      results.push({ text: text.substring(0, 600), url });
    }
    return results;
  });
  console.log(`[Edison] Posts with context: ${extractedPosts.length}`);

  // Method 1: From article elements
  for (const el of postElements.slice(0, 15)) {
    try {
      const textEl = await el.$('div[data-ad-preview="message"]');
      if (!textEl) continue;

      const text = await textEl.textContent() || '';
      if (text.length < 30) continue;

      let url = '';
      try {
        const links = await el.$$('a[href*="/posts/"], a[href*="/permalink/"]');
        if (links.length > 0) {
          url = await links[0].getAttribute('href') || '';
        }
      } catch {}

      posts.push({ text, url });
    } catch {
      continue;
    }
  }

  // Method 2: From extracted posts with context (fallback)
  if (posts.length < 5 && extractedPosts.length > 0) {
    console.log('[Edison] Using extracted posts as fallback...');
    for (const ep of extractedPosts.slice(0, 15)) {
      if (ep.text.length > 30 && !posts.some(p => p.text.includes(ep.text.substring(0, 50)))) {
        posts.push({ text: ep.text, url: ep.url });
        if (ep.url) {
          console.log(`[Edison] Found post with URL: ${ep.url.substring(0, 60)}...`);
        }
      }
    }
  }

  // Method 3: Try to find URLs for posts that don't have them
  // by searching the page for links that match post content
  if (posts.some(p => !p.url)) {
    console.log('[Edison] Looking for missing URLs...');
    const allLinks = await p.$$eval('a[href*="/posts/"], a[href*="/permalink/"], a[href*="story_fbid"]', links => {
      return links.map(l => ({
        href: (l as HTMLAnchorElement).href,
        text: l.closest('[role="article"]')?.textContent?.substring(0, 100) || ''
      }));
    });

    for (const post of posts) {
      if (!post.url && post.text) {
        // Find link whose container text matches this post
        const match = allLinks.find(link =>
          link.text && post.text.substring(0, 50).includes(link.text.substring(0, 30))
        );
        if (match) {
          post.url = match.href;
          console.log(`[Edison] Matched URL for: "${post.text.substring(0, 40)}..."`);
        }
      }
    }
  }

  console.log(`[Edison] Extracted ${posts.length} posts total`);
  console.log(`[Edison] Posts with URLs: ${posts.filter(p => p.url).length}`);
  return posts;
}

// ============================================
// COMMENTING (Direct from Search Page)
// ============================================

/**
 * Comment directly on posts from the current page (no navigation needed)
 * Senior approach: interact in-place instead of extracting URLs
 */
async function commentOnPostInPlace(
  p: Page,
  postIndex: number,
  comment: string
): Promise<boolean> {
  try {
    // Find all "Comentar" buttons on the page
    const comentarButtons = await p.$$('div[role="button"]:has-text("Comentar"), span:has-text("Comentar")');

    if (postIndex >= comentarButtons.length) {
      console.log(`[Edison] No comment button at index ${postIndex}`);
      return false;
    }

    const btn = comentarButtons[postIndex];

    // Click the Comentar button for this post
    console.log(`[Edison] Clicking Comentar button ${postIndex}...`);
    await btn.scrollIntoViewIfNeeded();
    await p.waitForTimeout(randomDelay(500, 1000));
    await btn.click();
    await p.waitForTimeout(randomDelay(1500, 2500));

    // Find the active comment input
    const commentInputs = await p.$$('div[contenteditable="true"]');
    let activeInput = null;

    for (const input of commentInputs) {
      if (await input.isVisible()) {
        const box = await input.boundingBox();
        if (box && box.y > 200) { // Must be below header
          activeInput = input;
          break;
        }
      }
    }

    if (!activeInput) {
      console.log('[Edison] Comment input not found after clicking');
      return false;
    }

    // Type comment
    await activeInput.click();
    await p.waitForTimeout(randomDelay(300, 600));
    await humanType(p, comment);

    // Send with Enter
    await p.waitForTimeout(randomDelay(500, 1000));
    await p.keyboard.press('Enter');

    console.log('[Edison] Comment sent!');
    await p.waitForTimeout(randomDelay(2000, 4000));

    // Close any modal by pressing Escape
    await p.keyboard.press('Escape');
    await p.waitForTimeout(randomDelay(1000, 2000));

    // Log to Supabase
    if (supabase) {
      await supabase.from('fb_posts_log').insert({
        post_type: 'comment',
        group_url: 'fb_search_inline',
        post_content: comment,
        success: true
      });
    }

    return true;

  } catch (e: any) {
    console.error('[Edison] Comment error:', e.message);

    if (supabase) {
      await supabase.from('fb_posts_log').insert({
        post_type: 'comment',
        group_url: 'fb_search_inline',
        post_content: comment,
        success: false,
        error_message: e.message
      });
    }

    return false;
  }
}

// Legacy function for URL-based commenting
async function commentOnPost(postUrl: string, comment: string): Promise<boolean> {
  const p = await launchBrowser();

  try {
    console.log(`[Edison] Opening post: ${postUrl.substring(0, 60)}...`);
    await p.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await p.waitForTimeout(randomDelay(2000, 4000));

    await humanScroll(p, 400);
    await p.waitForTimeout(randomDelay(1000, 2000));

    const commentSelectors = [
      'div[contenteditable="true"][aria-label*="comentario"]',
      'div[contenteditable="true"][aria-label*="Comentar"]',
      '[aria-label*="Deixe um comentário"]',
      'div[contenteditable="true"]'
    ];

    let commentBox = null;
    for (const sel of commentSelectors) {
      try {
        const el = await p.$(sel);
        if (el && await el.isVisible()) {
          commentBox = el;
          break;
        }
      } catch { continue; }
    }

    if (!commentBox) {
      try {
        const comentarBtn = await p.$('text=Comentar');
        if (comentarBtn) {
          await comentarBtn.click();
          await p.waitForTimeout(1000);
          for (const sel of commentSelectors) {
            const el = await p.$(sel);
            if (el && await el.isVisible()) {
              commentBox = el;
              break;
            }
          }
        }
      } catch {}
    }

    if (!commentBox) return false;

    await commentBox.click();
    await p.waitForTimeout(randomDelay(500, 1000));
    await humanType(p, comment);
    await p.waitForTimeout(randomDelay(500, 1000));
    await p.keyboard.press('Enter');

    console.log('[Edison] Comment sent!');
    await p.waitForTimeout(randomDelay(2000, 3000));

    if (supabase) {
      await supabase.from('fb_posts_log').insert({
        post_type: 'comment', group_url: postUrl, post_content: comment, success: true
      });
    }
    return true;

  } catch (e: any) {
    console.error('[Edison] Comment error:', e.message);
    if (supabase) {
      await supabase.from('fb_posts_log').insert({
        post_type: 'comment', group_url: postUrl, post_content: comment,
        success: false, error_message: e.message
      });
    }
    return false;
  }
}

// ============================================
// STATE MANAGEMENT
// ============================================

interface State {
  commentsToday: number;
  lastCommentTime: string | null;
  lastDate: string;
  commentedUrls: string[];
}

async function loadState(): Promise<State> {
  try {
    const file = Bun.file('./edison-state.json');
    if (await file.exists()) {
      return await file.json();
    }
  } catch {}

  return {
    commentsToday: 0,
    lastCommentTime: null,
    lastDate: new Date().toISOString().split('T')[0],
    commentedUrls: []
  };
}

async function saveState(state: State): Promise<void> {
  await Bun.write('./edison-state.json', JSON.stringify(state, null, 2));
}

// ============================================
// MAIN FLOW
// ============================================

const MAX_COMMENTS_PER_DAY = 10;
const MIN_COMMENT_SPACING_MS = 30 * 60 * 1000; // 30 minutes
const MIN_SCORE_THRESHOLD = 5;

async function run(limit: number = 3, dryRun: boolean = false): Promise<void> {
  console.log('\n[Edison] ========== AUTONOMOUS RUN ==========\n');

  // Load state
  let state = await loadState();
  const today = new Date().toISOString().split('T')[0];

  if (state.lastDate !== today) {
    console.log('[Edison] New day, resetting counters');
    state.commentsToday = 0;
    state.lastDate = today;
    state.commentedUrls = [];
  }

  // Check daily limit
  if (state.commentsToday >= MAX_COMMENTS_PER_DAY) {
    console.log(`[Edison] Daily limit reached (${MAX_COMMENTS_PER_DAY} comments)`);
    return;
  }

  // Check spacing
  if (state.lastCommentTime) {
    const elapsed = Date.now() - new Date(state.lastCommentTime).getTime();
    if (elapsed < MIN_COMMENT_SPACING_MS) {
      const waitMin = Math.ceil((MIN_COMMENT_SPACING_MS - elapsed) / 60000);
      console.log(`[Edison] Wait ${waitMin} minutes before next comment`);
      return;
    }
  }

  // 1. SCRAPE
  console.log('[Edison] Phase 1: SCRAPING...\n');
  const rawPosts = await scrapeFacebookSearch();

  if (rawPosts.length === 0) {
    console.log('[Edison] No posts found');
    await closeBrowser();
    return;
  }

  // 2. FILTER & SCORE
  console.log('\n[Edison] Phase 2: FILTERING...\n');

  // Score all posts first
  const allScored = rawPosts.map(p => scorePost(p.text, p.url));

  // Show all scores for debug
  console.log('[Edison] All post scores:');
  for (const p of allScored.slice(0, 10)) {
    console.log(`  Score ${p.score}: "${p.text.substring(0, 60)}..."`);
    if (p.reasons.length > 0) {
      console.log(`    ${p.reasons.slice(0, 3).join(', ')}`);
    }
  }

  const scoredPosts = allScored
    .filter(p => p.score >= MIN_SCORE_THRESHOLD)
    .filter(p => !state.commentedUrls.includes(p.url))
    .sort((a, b) => b.score - a.score);

  console.log(`\n[Edison] ${scoredPosts.length} posts passed filter (score >= ${MIN_SCORE_THRESHOLD})`);

  // Show top candidates
  console.log('\n[Edison] Top candidates:');
  for (const p of scoredPosts.slice(0, 5)) {
    console.log(`  Score ${p.score}: ${p.brand || '?'} ${p.year || '?'} - "${p.text.substring(0, 50)}..."`);
    console.log(`    Reasons: ${p.reasons.join(', ')}`);
  }

  if (scoredPosts.length === 0) {
    console.log('[Edison] No valid posts to comment on');
    await closeBrowser();
    return;
  }

  if (dryRun) {
    console.log('\n[Edison] DRY RUN - not commenting');
    await closeBrowser();
    return;
  }

  // 3. COMMENT (using in-place approach - no URL needed)
  console.log('\n[Edison] Phase 3: COMMENTING (in-place)...\n');

  const p = await launchBrowser();
  const toComment = scoredPosts.slice(0, Math.min(limit, MAX_COMMENTS_PER_DAY - state.commentsToday));
  let successCount = 0;

  // Map scored posts to their indices on the page
  // We need to find which "Comentar" button corresponds to each scored post
  const allPostTexts = rawPosts.map(p => p.text.substring(0, 50));

  for (let i = 0; i < toComment.length; i++) {
    const post = toComment[i];

    // Find the index of this post in the page
    const pageIndex = allPostTexts.findIndex(t =>
      post.text.substring(0, 50).includes(t.substring(0, 30)) ||
      t.includes(post.text.substring(0, 30))
    );

    if (pageIndex === -1) {
      console.log(`[Edison] Could not find post index, using fallback ${i}`);
    }

    const template = getTemplate(state.commentsToday + i);
    const comment = personalizeTemplate(template, post);

    console.log(`\n[Edison] Comment ${i + 1}/${toComment.length}`);
    console.log(`[Edison] Post: ${post.text.substring(0, 60)}...`);
    console.log(`[Edison] Comment: ${comment}`);
    console.log(`[Edison] Page index: ${pageIndex >= 0 ? pageIndex : i}`);

    // Use in-place commenting
    const success = await commentOnPostInPlace(p, pageIndex >= 0 ? pageIndex : i, comment);

    if (success) {
      successCount++;
      state.commentsToday++;
      state.lastCommentTime = new Date().toISOString();
      state.commentedUrls.push(post.text.substring(0, 100)); // Use text as ID
      await saveState(state);

      // Save prospect
      if (supabase) {
        await supabase.from('fb_prospects').insert({
          source_post_url: post.url || `inline_${Date.now()}`,
          car_brand: post.brand,
          car_year: post.year,
          notes: post.text,
          status: 'commented'
        });
      }
    }

    // Wait between comments (longer for anti-ban)
    if (i < toComment.length - 1) {
      const wait = randomDelay(45000, 70000); // 45-70 seconds
      console.log(`[Edison] Waiting ${Math.round(wait / 1000)}s...`);
      await new Promise(r => setTimeout(r, wait));
    }
  }

  // 4. SUMMARY
  console.log('\n[Edison] ========== COMPLETE ==========');
  console.log(`[Edison] Comments made: ${successCount}/${toComment.length}`);
  console.log(`[Edison] Total today: ${state.commentsToday}/${MAX_COMMENTS_PER_DAY}`);

  await closeBrowser();
}

async function showStats(): Promise<void> {
  const state = await loadState();

  console.log('\n[Edison] Stats:');
  console.log(`  Date: ${state.lastDate}`);
  console.log(`  Comments today: ${state.commentsToday}/${MAX_COMMENTS_PER_DAY}`);
  console.log(`  Last comment: ${state.lastCommentTime || 'never'}`);
  console.log(`  URLs commented: ${state.commentedUrls.length}`);

  if (supabase) {
    const { count } = await supabase
      .from('fb_posts_log')
      .select('*', { count: 'exact', head: true })
      .eq('post_type', 'comment')
      .gte('created_at', new Date().toISOString().split('T')[0]);

    console.log(`  DB comments today: ${count}`);
  }
}

async function testBrowser(): Promise<void> {
  console.log('[Edison] Testing browser...');
  const p = await launchBrowser();
  await p.goto('https://www.facebook.com');
  console.log('[Edison] Browser OK! Press Ctrl+C to close');
}

// ============================================
// CLI
// ============================================

const command = process.argv[2];
const arg = process.argv[3];

switch (command) {
  case 'run':
    const limit = parseInt(arg) || 3;
    await run(limit, false);
    break;

  case 'scrape':
    const isDry = arg === '--dry';
    await run(5, true);
    break;

  case 'stats':
    await showStats();
    break;

  case 'test':
    await testBrowser();
    break;

  default:
    console.log(`
Edison Autonomous - Facebook Outreach WITHOUT LLM
=================================================

Usage:
  bun edison-autonomous.ts run [limit]    Full cycle (scrape + filter + comment)
  bun edison-autonomous.ts scrape         Scrape only (dry run)
  bun edison-autonomous.ts stats          Show statistics
  bun edison-autonomous.ts test           Test browser launch

Examples:
  bun edison-autonomous.ts run 3          # Comment on top 3 posts
  bun edison-autonomous.ts run 1          # Comment on 1 post (testing)
  bun edison-autonomous.ts scrape         # See what posts would be selected

Limits:
  - Max ${MAX_COMMENTS_PER_DAY} comments/day
  - ${MIN_COMMENT_SPACING_MS / 60000} min spacing between comments
  - Score >= ${MIN_SCORE_THRESHOLD} to qualify

Environment:
  PATCHRIGHT_PROFILE              Browser profile (default: /home/edu/.patchright-profile)
  SUPABASE_URL                    For logging
  SUPABASE_SERVICE_ROLE_KEY       For logging
`);
}
