#!/usr/bin/env node

/**
 * Supply Hunter - Automated Facebook supply acquisition for AutoRenta
 *
 * Searches Facebook for car owner posts and comments with AutoRenta offers.
 * Uses Patchright with persistent profile (already logged into Facebook).
 *
 * Usage:
 *   node supply-hunter.mjs scan                    # Search & extract prospects (no commenting)
 *   node supply-hunter.mjs engage                  # Search, extract & comment on top posts
 *   node supply-hunter.mjs engage --dry-run        # Preview without commenting
 *   node supply-hunter.mjs engage --max-comments 5 # Limit comments per run
 *   node supply-hunter.mjs stats                   # Show engagement statistics
 */

import { chromium } from 'patchright';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from marketing-automation root (override shell env vars)
config({ path: path.join(__dirname, '../.env'), override: true });

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  profileDir: process.env.PATCHRIGHT_PROFILE || '/home/edu/.patchright-profile',
  stateFile: path.join(__dirname, '../config/supply-hunter-state.json'),
  prospectsFile: path.join(__dirname, '../config/prospects-latest.json'),

  // Search keywords ranked by supply signal strength
  keywords: [
    'busco chofer auto',
    'auto a cargo alquiler',
    'alquilo auto particular',
    'auto disponible uber cabify',
    'tengo auto disponible',
    'vendo auto buenos aires',
  ],

  // Scoring weights for post relevance
  scoring: {
    carBrand: 3,
    yearMention: 2,
    priceMention: 2,
    photoPresent: 2,
    gnc: 1,
    rideshareApp: 1,
    chofer: 2,
    alquilo: 2,
    disponible: 1,
    vendo: 1,
    contactInfo: 1,
  },

  // Anti-spam limits
  limits: {
    maxCommentsPerRun: parseInt(process.env.MAX_COMMENTS || '8', 10),
    minSecondsBetweenComments: 120,
    minScoreToEngage: 3,
    maxScrollsPerSearch: 3,
  },

  // Human behavior delays (ms)
  delays: {
    betweenSearches: { min: 5000, max: 10000 },
    betweenScrolls: { min: 1500, max: 3000 },
    beforeComment: { min: 3000, max: 8000 },
    typingPerChar: { min: 40, max: 120 },
    afterComment: { min: 5000, max: 15000 },
    thinkingPause: { min: 500, max: 2000 },
  },
};

// Argentine car brands
const CAR_BRANDS = [
  'toyota', 'corolla', 'hilux', 'etios', 'yaris',
  'volkswagen', 'vw', 'gol', 'polo', 'virtus', 'amarok',
  'ford', 'focus', 'fiesta', 'ranger', 'ecosport', 'ka',
  'chevrolet', 'cruze', 'onix', 'tracker', 's10', 'spin',
  'fiat', 'cronos', 'argo', 'mobi', 'strada', 'palio',
  'renault', 'sandero', 'logan', 'duster', 'kangoo', 'clio',
  'peugeot', '208', '308', '2008', '3008', '207',
  'citroen', 'c3', 'c4', 'berlingo',
  'honda', 'civic', 'hrv', 'crv', 'fit', 'city',
  'nissan', 'kicks', 'frontier', 'sentra', 'versa',
  'hyundai', 'tucson', 'creta',
  'kia', 'rio', 'sportage', 'seltos',
  'jeep', 'renegade', 'compass',
];

// Comment templates - 2026 tone: low-key, process-focused, zero salesy
// Based on research: authenticity > ads, process > slogans, address deductible fear
const COMMENT_TEMPLATES = {
  owner_with_car: [
    'Dato por si te sirve: hay dueños que en vez de depender de un solo chofer, publican el auto por día y eligen quién lo usa. Verifican identidad del conductor, hacen check-in con fotos y tienen reglas claras de cobertura. Si querés te cuento cómo es el proceso por privado.',
    'Yo estuve en una situación parecida. Lo que me cerró fue ver el proceso: verificación del que maneja, check-in con fotos antes y después, y reglas claras sobre qué pasa si hay un golpe (franquicia cubierta). Si te interesa te paso cómo funciona.',
    'Un dato: conozco dueños que publican su auto algunos días al mes solo para cubrir gastos fijos (seguro, patente, cochera). No es plata fácil, pero ayuda. Lo clave es que verifican al conductor antes. Te cuento por DM si querés.',
  ],
  already_renting: [
    'Buen auto. Una pregunta genuina: tenés cubierto el tema franquicia/daños? Hay plataformas que manejan verificación de conductor + check-in con fotos + cobertura. Si te interesa comparar te cuento cómo funciona el proceso.',
    'Dato: hay dueños que además de alquilar directo, lo publican en una plataforma para tener más demanda y tener respaldo (verificación de quien lo alquila, fotos del check-in, cobertura). Si querés te paso info por privado.',
  ],
  selling_car: [
    'Éxitos con la venta. Dato cortito: mientras esperás comprador (a veces tarda), algunos dueños lo publican por día para cubrir gastos fijos. Si se vende, se pausa y listo. Te paso cómo es el proceso si te interesa.',
    'Lindo auto. Mientras buscás comprador, hay gente que lo publica por día solo para cubrir seguro y patente. Verifican al que lo usa, hacen check-in con fotos. Si querés te cuento cómo funciona, sin compromiso.',
  ],
  car_available: [
    'Dato por si a alguien le sirve: si tenés el auto parado varios días, hay gente que lo publica por día para cubrir seguro y patente. Si querés, pasame modelo y te digo cuánto se está pagando aprox.',
    'Un dato: entre seguro, patente y cochera, tener el auto parado sale caro. Hay dueños que lo publican algunos días al mes para cubrir esos gastos fijos. Si querés te cuento cómo es el proceso (verificación, check-in, cobertura).',
  ],
};

// ============================================
// UTILITIES
// ============================================

function rand(range) {
  return Math.floor(Math.random() * (range.max - range.min + 1) + range.min);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function extractYear(text) {
  const match = text.match(/\b(201[0-9]|202[0-6])\b/);
  return match ? parseInt(match[1]) : null;
}

function extractBrand(text) {
  const lower = text.toLowerCase();
  for (const brand of CAR_BRANDS) {
    if (lower.includes(brand)) return brand;
  }
  return null;
}

function scorePost(text) {
  const lower = text.toLowerCase();
  let score = 0;

  if (extractBrand(text)) score += CONFIG.scoring.carBrand;
  if (extractYear(text)) score += CONFIG.scoring.yearMention;
  if (/\$[\d.,]+|usd|ars|pesos/i.test(text)) score += CONFIG.scoring.priceMention;
  if (lower.includes('gnc')) score += CONFIG.scoring.gnc;
  if (/uber|cabify|didi|indrive|beat/i.test(lower)) score += CONFIG.scoring.rideshareApp;
  if (/chofer|conductor/i.test(lower)) score += CONFIG.scoring.chofer;
  if (/alquilo|alquiler/i.test(lower)) score += CONFIG.scoring.alquilo;
  if (lower.includes('disponible')) score += CONFIG.scoring.disponible;
  if (/vendo|venta/i.test(lower)) score += CONFIG.scoring.vendo;
  if (/whatsapp|contacto|\d{10,}/i.test(text)) score += CONFIG.scoring.contactInfo;

  return score;
}

const SEARCH_STOPWORDS = new Set([
  'para', 'con', 'sin', 'por', 'que', 'como', 'una', 'unos', 'unas', 'este', 'esta', 'esto',
  'hola', 'buen', 'buenas', 'buenos', 'dias', 'tarde', 'tardes', 'noche', 'noches', 'ayer', 'hoy',
  'auto', 'autos', 'carro', 'carros', 'coche', 'coches', 'vehiculo', 'vehiculos',
  'grupo', 'grupos', 'publicacion', 'publicaciones', 'post', 'posts',
  'busco', 'buscando', 'vendo', 'venta', 'alquilo', 'alquiler', 'tengo', 'disponible',
  'comentario', 'comentarios', 'compartir', 'compartido', 'curtir', 'compartilhar',
  'ver', 'mas', 'más', 'vermais', 'vermas', 'vermás',
  'whatsapp', 'wpp', 'contacto', 'telefono', 'tel', 'cel', 'celular',
]);

function buildSearchTokens(text) {
  if (!text) return [];
  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const words = normalized
    .split(/\s+/)
    .map(w => w.replace(/[^a-z0-9]+/g, ''))
    .filter(w => w.length > 4 && !SEARCH_STOPWORDS.has(w));
  const unique = [];
  for (const w of words) {
    if (!unique.includes(w)) unique.push(w);
    if (unique.length >= 8) break;
  }
  return unique;
}

function cleanPostText(text, groupName) {
  if (!text) return '';
  const group = (groupName || '').toLowerCase().trim();
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const cleaned = [];

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (group && (lower === group || lower.startsWith(group))) continue;
    if (lower.includes('participar')) continue;
    if (lower.includes('comentario') || lower.includes('comentário')) continue;
    if (lower.includes('curtir') || lower.includes('me gusta')) continue;
    if (lower.includes('comentar')) continue;
    if (lower.includes('compartilhar') || lower.includes('compartir')) continue;
    if (lower.includes('todas as reações') || lower.includes('todas las reacciones')) continue;
    if (lower.includes('ver mais') || lower.includes('ver más') || lower.includes('ver mas') ||
        lower.includes('see more')) continue;
    if (/^\d+\s+de\s+\w+/.test(lower)) continue;
    if (line.length < 6) continue;
    cleaned.push(line);
  }

  const out = cleaned.join(' ').replace(/\s+/g, ' ').trim();
  return out;
}

function categorizePost(text, keyword) {
  const lower = text.toLowerCase();
  if (keyword.includes('busco chofer') || lower.includes('busco chofer')) return 'owner_with_car';
  if (keyword.includes('vendo') || lower.includes('vendo')) return 'selling_car';
  if (keyword.includes('alquilo') || lower.includes('alquilo')) return 'already_renting';
  return 'car_available';
}

function pickComment(category) {
  const templates = COMMENT_TEMPLATES[category] || COMMENT_TEMPLATES.car_available;
  return templates[Math.floor(Math.random() * templates.length)];
}

// ============================================
// GEMINI AI - Contextual comment generation
// ============================================

const GEMINI_SYSTEM_PROMPT = `Sos un usuario argentino que comenta en grupos de Facebook sobre autos.
Tu objetivo: dejar un comentario útil y genuino que responda al contexto específico del post.

REGLAS ESTRICTAS:
- Máximo 2 oraciones (40-60 palabras)
- Tono: consejo de par, como si fueras otro dueño de auto hablando en un asado
- Si el post menciona un auto específico (marca/modelo/año), mencionalo
- Si el post menciona una zona, referenciala
- CTA suave al final: "si te interesa te cuento por privado" o "te paso info por DM"

PROHIBIDO (si violás alguna, tu respuesta será descartada):
- Nombrar ninguna plataforma, app, URL, marca comercial o "autorentar"
- Decir "comodato", "Airbnb de autos", "ingreso pasivo", "plata fácil", "oportunidad"
- Emojis de cualquier tipo
- Links o URLs
- Sonar como publicidad, spam, o bot
- Empezar con "Hola!" o saludos genéricos

CATEGORÍAS:
- owner_with_car: Tienen auto y buscan chofer → consejo entre pares
- already_renting: Ya alquilan directo → pregunta genuina sobre cobertura
- selling_car: Están vendiendo → dato para mientras esperan comprador
- car_available: Auto parado → dato sobre cubrir gastos

Respondé SOLO con el texto del comentario, sin comillas, sin prefijos.`;

// Different "hooks" to alternate between - keeps comments varied
const GEMINI_HOOKS = [
  'ENFOQUE: Mencioná la verificación de identidad (DNI + licencia) como algo que da tranquilidad.',
  'ENFOQUE: Hablá del check-in con fotos antes y después como forma de protegerse.',
  'ENFOQUE: Tocá el tema franquicia/cobertura de daños, que es el miedo principal.',
  'ENFOQUE: Usá el pain point de "gastos fijos" (seguro, patente, cochera) que se comen la guita.',
  'ENFOQUE: Comentá desde tu experiencia personal, como si vos ya hicieras esto.',
  'ENFOQUE: Hacé una pregunta genuina sobre cómo manejan el tema confianza/riesgo.',
];

async function generateComment(post) {
  var apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    log('warn', 'GEMINI_API_KEY not set, falling back to templates');
    return null;
  }

  // Pick a random hook to vary comment style
  var hook = GEMINI_HOOKS[Math.floor(Math.random() * GEMINI_HOOKS.length)];

  var userPrompt = `POST EN GRUPO DE FACEBOOK:
Grupo: ${post.group || 'N/A'}
Categoría: ${post.category}
Auto: ${post.brand || 'no especificado'} ${post.year || ''}
Autor: ${post.author || 'anónimo'}

Texto del post:
${post.text.substring(0, 400)}

${hook}

Generá un comentario contextual para este post.`;

  try {
    var controller = new AbortController();
    var timeout = setTimeout(function() { controller.abort(); }, 15000);

    var response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          system_instruction: { parts: [{ text: GEMINI_SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 2048,  // gemini-2.5-flash uses ~300 tokens for "thinking" internally
          },
        }),
      }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      log('warn', `Gemini API error: ${response.status} ${response.statusText}`);
      return null;
    }

    var data = await response.json();

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      log('warn', 'Gemini returned no candidates');
      return null;
    }

    var comment = data.candidates[0].content.parts[0].text.trim();

    // Validation: reject if it contains banned words
    var banned = [
      'autorentar', 'autorentar.com', 'autorenta',
      'comodato', 'airbnb de autos', 'airbnb',
      'ingreso pasivo', 'plata fácil', 'plata facil', 'oportunidad única',
      'no te pierdas', 'registrate', 'registrarse', 'descargar',
      'link en bio', 'más info en', 'mas info en',
      'http', 'www.', '.com.ar',
      'plataforma', 'aplicación', 'aplicacion',
    ];
    var lower = comment.toLowerCase();
    for (var word of banned) {
      if (lower.includes(word)) {
        log('warn', `Gemini comment contains banned word "${word}", falling back to template`);
        return null;
      }
    }

    // Validation: reject emojis
    if (/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}]/u.test(comment)) {
      log('warn', 'Gemini comment contains emojis, falling back to template');
      return null;
    }

    // Validation: reject if too short or too long
    if (comment.length < 30 || comment.length > 400) {
      log('warn', `Gemini comment length ${comment.length} out of range (30-400), falling back`);
      return null;
    }

    // Strip quotes if Gemini wrapped the response
    comment = comment.replace(/^["']|["']$/g, '');

    log('ok', `Gemini generated comment (${comment.length} chars)`);
    return comment;
  } catch (e) {
    if (e.name === 'AbortError') {
      log('warn', 'Gemini API timeout (15s), falling back to template');
    } else {
      log('warn', `Gemini error: ${e.message}, falling back to template`);
    }
    return null;
  }
}

// Validates that a URL points to a specific post, not just a group page or user page
function isValidPostUrl(url) {
  if (!url) return false;
  // Reject known non-post patterns
  if (url.includes('/user/') || url.includes('/profile.php')) return false;
  // Direct post identifiers
  if (url.includes('/posts/') || url.includes('/permalink/') || url.includes('/videos/') ||
      url.includes('/reel/') || url.includes('pfbid') || url.includes('story_fbid')) return true;
  return false;
}

function log(level, msg) {
  const ts = new Date().toISOString().substring(11, 19);
  const icons = { info: 'ℹ️', ok: '✅', warn: '⚠️', err: '❌', act: '🎯', search: '🔍' };
  console.log(`[${ts}] ${icons[level] || ''} ${msg}`);
}

// ============================================
// STATE
// ============================================

async function loadState() {
  try {
    const data = await fs.readFile(CONFIG.stateFile, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { commentedPosts: {}, lastRun: null, totalComments: 0 };
  }
}

async function saveState(state) {
  state.lastRun = new Date().toISOString();
  await fs.writeFile(CONFIG.stateFile, JSON.stringify(state, null, 2));
}

// ============================================
// GROUP FILTER - Only engage in user's groups
// ============================================

const GROUPS_FILE = path.join(__dirname, '../config/fb-groups.json');
let myGroups = null;

async function loadMyGroups() {
  try {
    var data = await fs.readFile(GROUPS_FILE, 'utf-8');
    var parsed = JSON.parse(data);
    var groups = parsed.groups || [];

    var nameSet = new Set();
    var idSet = new Set();

    groups.forEach(function(g) {
      nameSet.add(g.name.toLowerCase().trim());
      idSet.add(String(g.id).toLowerCase().trim());
    });

    myGroups = { nameSet, idSet, count: groups.length };
    log('ok', `Loaded ${groups.length} groups for filtering`);
    return myGroups;
  } catch (e) {
    log('warn', `Could not load groups file: ${e.message}. Group filtering disabled.`);
    return null;
  }
}

function isMyGroup(groupName, groupUrl) {
  if (!myGroups) return true; // No filter if groups not loaded

  // Check by exact name (normalized)
  if (groupName) {
    var normalized = groupName.toLowerCase().trim();
    if (myGroups.nameSet.has(normalized)) return true;

    // Fuzzy: partial match (group names can be truncated in search results)
    for (var name of myGroups.nameSet) {
      if (normalized.length > 10 && (normalized.includes(name) || name.includes(normalized))) return true;
    }
  }

  // Check by group ID in URL
  if (groupUrl) {
    var urlLower = groupUrl.toLowerCase();
    for (var id of myGroups.idSet) {
      if (urlLower.includes('/groups/' + id)) return true;
    }
  }

  return false;
}

// ============================================
// BROWSER
// ============================================

let browser = null;
let page = null;

async function launchBrowser() {
  log('info', 'Launching Patchright with persistent profile...');
  browser = await chromium.launchPersistentContext(CONFIG.profileDir, {
    headless: false,
    channel: 'chrome',
    viewport: { width: 1366, height: 768 },
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Buenos_Aires',
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-first-run',
      '--no-default-browser-check',
    ],
  });
  page = browser.pages()[0] || await browser.newPage();
  log('ok', 'Browser ready');
}

async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
    page = null;
  }
}

// ============================================
// SEARCH & EXTRACT
// ============================================

async function searchKeyword(keyword) {
  const url = `https://www.facebook.com/search/posts?q=${encodeURIComponent(keyword)}`;
  log('search', `Searching: "${keyword}"`);

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(rand(CONFIG.delays.betweenSearches));

  // Scroll to load more posts
  for (let i = 0; i < CONFIG.limits.maxScrollsPerSearch; i++) {
    await page.evaluate(() => window.scrollBy(0, 800));
    await sleep(rand(CONFIG.delays.betweenScrolls));
  }

  // Extract posts from DOM
  const posts = await page.evaluate(() => {
    var articles = document.querySelectorAll('[role="article"]');
    var results = [];

    articles.forEach(function(article) {
      try {
        var rawText = (article.innerText || '').substring(0, 800);
        var messageText = '';
        var textEl = article.querySelector('div[data-ad-preview="message"]');
        if (textEl) messageText = (textEl.innerText || '').trim();
        if (!messageText) {
          var best = '';
          var candidates = article.querySelectorAll('div[dir="auto"]');
          candidates.forEach(function(el) {
            var t = (el.innerText || '').trim();
            if (t.length > best.length) best = t;
          });
          messageText = best;
        }
        var text = (messageText || rawText || '').substring(0, 500);

        // Group name from first link with /groups/
        var groupLinks = article.querySelectorAll('a[href*="/groups/"]');
        var groupName = '';
        var groupUrl = '';
        groupLinks.forEach(function(gl) {
          var t = gl.innerText.trim();
          if (t.length > 5 && !groupName) {
            groupName = t;
            groupUrl = gl.href.split('?')[0];
          }
        });

        // Post permalink - try multiple methods (CRITICAL: must be post-level, not group-level)
        var postUrl = '';

        // Method 1: explicit /posts/ or /permalink/ links
        var permaLinks = article.querySelectorAll('a[href*="/posts/"], a[href*="/permalink/"]');
        if (permaLinks.length > 0) {
          postUrl = permaLinks[0].href.split('?')[0];
        }
        // Method 2: links with pfbid (Facebook's newer post ID format)
        if (!postUrl) {
          var pfbidLinks = article.querySelectorAll('a[href*="pfbid"]');
          if (pfbidLinks.length > 0) postUrl = pfbidLinks[0].href.split('?')[0];
        }
        // Method 3: links with story_fbid
        if (!postUrl) {
          var storyLinks = article.querySelectorAll('a[href*="story_fbid"]');
          if (storyLinks.length > 0) postUrl = storyLinks[0].href.split('?')[0];
        }
        // Method 4: group links that explicitly point to posts/permalink
        if (!postUrl) {
          var allGroupLinks = article.querySelectorAll('a[href*="/groups/"]');
          allGroupLinks.forEach(function(link) {
            if (postUrl) return;
            var href = (link.href || '').split('?')[0];
            if (!href) return;
            // Accept only explicit post/permalink URLs; ignore /user/ and other group subpages
            if (/\/groups\/[^/]+\/(posts|permalink)\//.test(href)) {
              postUrl = href;
            }
          });
        }
        // Method 5: timestamp-like short text links (often the post permalink)
        if (!postUrl) {
          var allLinks = article.querySelectorAll('a[role="link"]');
          allLinks.forEach(function(link) {
            if (postUrl) return;
            var text = (link.innerText || '').trim();
            var href = link.href || '';
            var hrefNoQuery = href.split('?')[0];
            // Timestamp links: short text (e.g. "2 h", "3d", "5 ene"), link to facebook
            if (text.length > 0 && text.length < 20 && href.includes('facebook.com')) {
              // Reject if it's just a group, profile, or group user URL
              if (!hrefNoQuery.match(/\/groups\/[^/]+\/?$/) &&
                  !hrefNoQuery.includes('/profile.php') &&
                  !hrefNoQuery.includes('/user/')) {
                postUrl = hrefNoQuery;
              }
            }
          });
        }

        // Capture all link hrefs for debugging extraction issues
        var debugLinks = [];
        article.querySelectorAll('a[href]').forEach(function(a) {
          var h = a.href.split('?')[0];
          if (h.length > 10 && !debugLinks.includes(h)) debugLinks.push(h.substring(0, 120));
        });

        // Author
        var authorEl = article.querySelector('strong');
        var author = authorEl ? authorEl.innerText.trim() : '';

        // Photo count
        var photos = article.querySelectorAll('img[src*="scontent"]').length;

        // Generate a hash key for dedup when postUrl is missing
        var hashKey = (author + '|' + text.substring(0, 100)).replace(/\s+/g, ' ');

        if (text.length > 30) {
          results.push({
            text: text,
            rawText: rawText,
            group: groupName.substring(0, 80),
            groupUrl: groupUrl,
            postUrl: postUrl,
            hashKey: hashKey,
            author: author.substring(0, 50),
            photos: photos,
            debugLinks: debugLinks.slice(0, 15),
          });
        }
      } catch(e) { /* skip */ }
    });

    return results;
  });

  log('info', `  → ${posts.length} posts found`);
  return posts;
}

async function searchAllKeywords() {
  var allPosts = [];

  for (var i = 0; i < CONFIG.keywords.length; i++) {
    var keyword = CONFIG.keywords[i];
    var posts = await searchKeyword(keyword);

    posts.forEach(function(post) {
      post.rawText = post.rawText || post.text || '';
      var cleaned = cleanPostText(post.text, post.group);
      if (!cleaned) cleaned = cleanPostText(post.rawText, post.group);
      post.text = (cleaned || post.text || '').substring(0, 500);
      post.keyword = keyword;
      post.score = scorePost(post.text);
      post.category = categorizePost(post.text, keyword);
      post.brand = extractBrand(post.text);
      post.year = extractYear(post.text);
    });

    allPosts.push(...posts);

    // Delay between searches
    if (i < CONFIG.keywords.length - 1) {
      var delay = rand(CONFIG.delays.betweenSearches);
      log('info', `Waiting ${Math.round(delay / 1000)}s before next search...`);
      await sleep(delay);
    }
  }

  // Deduplicate by postUrl or hashKey fallback
  var seen = new Set();
  var unique = allPosts.filter(function(p) {
    var key = p.postUrl || p.hashKey;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort by score descending
  unique.sort(function(a, b) { return b.score - a.score; });

  log('ok', `Total unique posts: ${unique.length} (from ${allPosts.length} raw)`);
  return unique;
}

// ============================================
// NAVIGATION - Click-through from search results
// ============================================

// Facebook search results don't expose post URLs in the DOM.
// Instead, we navigate to search results, find the matching article,
// and click on the timestamp link to open the actual post.
async function navigateToPostViaSearch(post) {
  var searchUrl = `https://www.facebook.com/search/posts?q=${encodeURIComponent(post.keyword)}`;
  log('info', `  Navigating to search results for "${post.keyword}"...`);

  await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(rand({ min: 3000, max: 5000 }));

  // Scroll to load more results
  for (var i = 0; i < CONFIG.limits.maxScrollsPerSearch; i++) {
    await page.evaluate(() => window.scrollBy(0, 800));
    await sleep(rand(CONFIG.delays.betweenScrolls));
  }

  // Find the matching article and click on its timestamp to navigate to the actual post
  // Note: Patchright evaluate() doesn't support passing args like Playwright,
  // so we embed the search text directly in the function string
  var searchSnippet = '';
  var sourceText = post.rawText || post.text || '';
  var cleanedSource = cleanPostText(sourceText, post.group);
  var searchTokens = buildSearchTokens(cleanedSource);
  var postGroup = (post.group || '').trim();
  var lines = sourceText.split('\n').filter(function(l) { return l.trim().length > 10; });
  for (var li = 0; li < lines.length; li++) {
    var line = lines[li].trim();
    // Skip the group name (appears in ALL posts from same group - not distinctive!)
    if (postGroup && (line === postGroup || line.startsWith(postGroup))) continue;
    // Skip metadata lines
    if (line.includes('Participar') || line.includes('reações') || line.includes('comentário') ||
        line.includes('compartilhamento') || line.includes('Curtir') || line.includes('Comentar') ||
        line.includes('Compartilhar') || line.includes('Ver mais') || line.includes('Ver más') ||
        line.includes('Ver mas')) continue;
    // Skip very short lines and date patterns
    if (line.length < 15) continue;
    if (/^\d+\s+de\s+\w+/.test(line)) continue;
    // Skip pure author names (single line with only letters and spaces, < 30 chars)
    if (line.length < 30 && /^[A-ZÁÉÍÓÚÑa-záéíóúñ\s.]+$/.test(line)) continue;
    // This should be the actual post content
    searchSnippet = line;
    break;
  }
  if (!searchSnippet) searchSnippet = (post.text || '').substring(0, 60);
  // Take first 50 chars as search text (enough to be distinctive)
  searchSnippet = searchSnippet.substring(0, 50);

  if (searchTokens.length >= 3) {
    log('info', `  Looking for article by token match: ${searchTokens.join(', ')}`);
  } else {
    log('info', `  Looking for article containing: "${searchSnippet}"`);
  }

  var clicked = await page.evaluate(`
    (function() {
      var tokens = ${JSON.stringify(searchTokens)};
      var minMatches = Math.max(2, Math.min(3, Math.ceil(tokens.length * 0.4)));
      var group = ${JSON.stringify((post.group || '').toLowerCase().trim())};
      function normalize(s) {
        return (s || '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
      }
      var searchText = ${JSON.stringify(searchSnippet)};
      var articles = document.querySelectorAll('[role="article"]');

      var bestIdx = -1;
      var bestCount = -1;
      if (tokens && tokens.length >= 3) {
        for (var a = 0; a < articles.length; a++) {
          var articleText = normalize(articles[a].innerText || '');
          var count = 0;
          for (var t = 0; t < tokens.length; t++) {
            if (articleText.includes(tokens[t])) count++;
          }
          if (group && !articleText.includes(group)) count = Math.max(0, count - 1);
          if (count > bestCount) {
            bestCount = count;
            bestIdx = a;
          }
        }
        if (bestIdx === -1 || bestCount < minMatches) {
          return { success: false, reason: 'article_not_found', bestCount: bestCount, minMatches: minMatches, searchTokens: tokens };
        }
      }

      for (var a2 = 0; a2 < articles.length; a2++) {
        var articleText2 = articles[a2].innerText || '';
        if (!articleText2.includes(searchText)) continue;
        bestIdx = a2;
        break;
      }

      if (bestIdx === -1) {
        return { success: false, reason: 'article_not_found', searchSnippet: searchText };
      }

      var article = articles[bestIdx];

        // Found matching article! Click the timestamp link to navigate to the post.
        // Strategy 1: Links with date text patterns (Portuguese/Spanish dates)
        var links = article.querySelectorAll('a[role="link"]');
        for (var j = 0; j < links.length; j++) {
          var linkText = (links[j].innerText || '').trim();
          if (/\\d+\\s+de\\s+\\w+|\\d+\\s+h\\b|\\d+\\s*d\\b|\\d+\\s+min|às\\s+\\d+:\\d+|ontem|hoje|hora/i.test(linkText)) {
            links[j].click();
            return { success: true, method: 'timestamp_link', text: linkText };
          }
        }

        // Strategy 2: Click on "X comentários" text
        for (var k = 0; k < links.length; k++) {
          var lt = (links[k].innerText || '').trim();
          if (/\\d+\\s+comentário/i.test(lt)) {
            links[k].click();
            return { success: true, method: 'comments_count', text: lt };
          }
        }

        // Strategy 3: Click on timestamp span with closest anchor
        var spans = article.querySelectorAll('span');
        for (var s = 0; s < spans.length; s++) {
          var spanText = (spans[s].innerText || '').trim();
          if (/\\d+\\s+de\\s+\\w+\\s+de\\s+\\d{4}/i.test(spanText) && spans[s].closest('a')) {
            spans[s].closest('a').click();
            return { success: true, method: 'timestamp_span', text: spanText };
          }
        }

        return { success: false, reason: 'no_clickable_timestamp', articleFound: true };
    })()
  `);

  if (!clicked || !clicked.success) {
    log('warn', `Could not click through to post: ${clicked ? clicked.reason : 'unknown'}`);
    if (clicked && clicked.searchSnippet) log('info', `  Search snippet: "${clicked.searchSnippet}"`);
    if (clicked && clicked.searchTokens) log('info', `  Search tokens: ${clicked.searchTokens.join(', ')}`);
    if (clicked && clicked.bestCount !== undefined) log('info', `  Token matches: ${clicked.bestCount}/${clicked.minMatches}`);
    return false;
  }

  log('info', `  Clicked via ${clicked.method}: "${clicked.text}"`);

  // Wait for navigation to complete
  try {
    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 });
  } catch {
    // Navigation might already be complete or handled by SPA routing
    await sleep(3000);
  }
  await sleep(rand({ min: 2000, max: 4000 }));

  // Check if we landed on a post page
  var currentUrl = page.url();
  if (isValidPostUrl(currentUrl)) {
    log('ok', `Navigated to post: ${currentUrl.substring(0, 80)}`);
    return true;
  }

  // Even if URL doesn't look like a post URL, Facebook SPA might have loaded the post
  // We'll verify content in commentOnPost
  log('info', `  Page URL: ${currentUrl.substring(0, 80)} (will verify content)`);
  return true;
}

// ============================================
// COMMENT ENGINE
// ============================================

async function commentOnPost(post, comment) {
  log('act', `Navigating to post by ${post.author || 'Unknown'} in "${post.group || '?'}"`);

  // === STEP 1: Navigate to the actual post ===
  if (isValidPostUrl(post.postUrl)) {
    // Direct navigation (rare - Facebook search results usually don't provide post URLs)
    log('info', `  Direct URL: ${post.postUrl}`);
    await page.goto(post.postUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(rand(CONFIG.delays.beforeComment));
  } else {
    // Click-through approach: navigate via search results
    log('info', `  No direct URL. Using click-through from search results...`);
    var navigated = await navigateToPostViaSearch(post);
    if (!navigated) {
      log('warn', `SKIPPING: Could not navigate to post.`);
      log('info', `  Post: "${post.text.substring(0, 60)}..."`);
      return false;
    }
  }

  // === STEP 2: Verify page content matches expected post ===
  // Facebook may show the post in a modal overlay or as a standalone page.
  // Check ALL articles and modal containers on the page.
  var pageContent = await page.evaluate(function() {
    // Check modal/dialog overlays first (Facebook opens posts in modals from search)
    var modals = document.querySelectorAll('[role="dialog"] [role="article"], [role="dialog"]');
    for (var i = 0; i < modals.length; i++) {
      var text = (modals[i].innerText || '').substring(0, 800);
      if (text.length > 50) return text;
    }
    // Then check all articles
    var articles = document.querySelectorAll('[role="article"]');
    var allText = '';
    for (var j = 0; j < articles.length; j++) {
      allText += (articles[j].innerText || '').substring(0, 500) + ' ';
    }
    if (allText.length > 50) return allText;
    return document.body.innerText.substring(0, 800);
  });

  // Extract distinctive words from the actual post content (skip group name and metadata)
  var verifySource = cleanPostText(post.rawText || post.text || '', post.group) || (post.text || '');
  var contentForVerify = verifySource;

  var postWords = contentForVerify.substring(0, 150)
    .toLowerCase()
    .split(/\s+/)
    .filter(function(w) { return w.length > 4; })
    .slice(0, 8);
  var pageContentLower = pageContent.toLowerCase();
  var matchCount = postWords.filter(function(w) { return pageContentLower.includes(w); }).length;
  var requiredMatches = Math.min(3, postWords.length);

  if (matchCount < requiredMatches) {
    log('warn', `ABORTING: Page content does NOT match expected post (${matchCount}/${postWords.length} keywords found).`);
    log('info', `  Expected words: ${postWords.join(', ')}`);
    log('info', `  Page URL: ${page.url().substring(0, 100)}`);
    log('info', `  Matched keywords: ${matchCount}/${postWords.length} (need ${requiredMatches})`);
    // Debug screenshot
    var debugPath = path.join(__dirname, '../screenshots', `debug-wrong-page-${Date.now()}.jpg`);
    try {
      await fs.mkdir(path.join(__dirname, '../screenshots'), { recursive: true });
      await page.screenshot({ path: debugPath, quality: 60, type: 'jpeg' });
      log('info', `  Debug screenshot: ${debugPath}`);
    } catch {}
    return false;
  }

  log('ok', `Page content verified (${matchCount}/${postWords.length} keywords match)`);

  // Simulate reading the post
  await page.evaluate(() => window.scrollBy(0, 300));
  await sleep(rand({ min: 1000, max: 2000 }));

  // Find comment box
  var commentBoxSelectors = [
    'div[aria-label*="omentario"]',
    'div[aria-label*="omentar como"]',
    'div[aria-label*="omment"]',
    'div[contenteditable="true"][role="textbox"]',
  ];

  var commentBox = null;
  for (var sel of commentBoxSelectors) {
    commentBox = await page.$(sel);
    if (commentBox) break;
  }

  if (!commentBox) {
    // Try clicking "Comentar" button to reveal the box
    var comentarBtn = await page.$('[aria-label="Comentar"], [aria-label="Comment"]');
    if (comentarBtn) {
      await comentarBtn.click();
      await sleep(1500);
      for (var sel2 of commentBoxSelectors) {
        commentBox = await page.$(sel2);
        if (commentBox) break;
      }
    }
  }

  if (!commentBox) {
    log('warn', 'Comment box not found - comments may be disabled for this post');
    return false;
  }

  // Click into comment box
  await commentBox.click();
  await sleep(rand(CONFIG.delays.thinkingPause));

  // Type with human-like speed and pauses
  for (var char of comment) {
    await page.keyboard.type(char, { delay: rand(CONFIG.delays.typingPerChar) });

    // Random thinking pauses (5% chance)
    if (Math.random() < 0.05) {
      await sleep(rand(CONFIG.delays.thinkingPause));
    }
  }

  // Pause before submitting (as if reviewing)
  await sleep(rand({ min: 2000, max: 5000 }));

  // Submit
  await page.keyboard.press('Enter');
  await sleep(rand(CONFIG.delays.afterComment));

  // Take screenshot as evidence
  var screenshotPath = path.join(__dirname, '../screenshots',
    `supply-${Date.now()}.jpg`);
  try {
    await fs.mkdir(path.join(__dirname, '../screenshots'), { recursive: true });
    await page.screenshot({ path: screenshotPath, quality: 60, type: 'jpeg' });
    log('info', `  Screenshot: ${screenshotPath}`);
  } catch { /* ignore screenshot errors */ }

  log('ok', `Commented on post (score: ${post.score})`);
  return true;
}

// ============================================
// MAIN COMMANDS
// ============================================

async function cmdScan() {
  await loadMyGroups();
  await launchBrowser();

  var posts = await searchAllKeywords();

  // Filter to only user's groups
  if (myGroups) {
    var beforeFilter = posts.length;
    posts = posts.filter(function(p) { return isMyGroup(p.group, p.groupUrl); });
    log('info', `Group filter: ${posts.length}/${beforeFilter} posts are from your ${myGroups.count} groups`);
  }

  // Save prospects
  await fs.writeFile(CONFIG.prospectsFile, JSON.stringify(posts, null, 2));
  log('ok', `Saved ${posts.length} prospects to ${CONFIG.prospectsFile}`);

  // Print top 20
  var validCount = posts.filter(function(p) { return isValidPostUrl(p.postUrl); }).length;
  console.log('\n📊 TOP SUPPLY PROSPECTS:');
  console.log(`📎 Posts with valid post URL: ${validCount}/${posts.length} (${posts.length - validCount} would be skipped)`);
  console.log('═'.repeat(70));
  posts.slice(0, 20).forEach(function(p, i) {
    var urlStatus = isValidPostUrl(p.postUrl) ? '✅' : '⚠️ NO VALID URL';
    console.log(`\n${i + 1}. [Score: ${p.score}] [${p.category}] ${p.brand || ''} ${p.year || ''} ${urlStatus}`);
    console.log(`   Group: ${p.group || 'N/A'}`);
    console.log(`   Author: ${p.author || 'N/A'}`);
    console.log(`   Text: ${p.text.substring(0, 120)}...`);
    console.log(`   URL: ${p.postUrl || 'N/A'}`);
    if (!isValidPostUrl(p.postUrl) && p.debugLinks && p.debugLinks.length > 0) {
      console.log(`   🔍 Debug links (${p.debugLinks.length}):`);
      p.debugLinks.slice(0, 5).forEach(function(l) { console.log(`      ${l}`); });
    }
  });
}

async function cmdEngage(dryRun) {
  var state = await loadState();
  await loadMyGroups();
  await launchBrowser();

  var posts = await searchAllKeywords();

  // Filter to only user's groups
  if (myGroups) {
    var beforeGroupFilter = posts.length;
    posts = posts.filter(function(p) { return isMyGroup(p.group, p.groupUrl); });
    log('info', `Group filter: ${posts.length}/${beforeGroupFilter} posts are from your ${myGroups.count} groups`);
  }

  // Filter already-commented
  var newPosts = posts.filter(function(p) {
    var key = p.postUrl || p.hashKey;
    return key && !state.commentedPosts[key];
  });
  log('info', `New posts: ${newPosts.length} (filtered ${posts.length - newPosts.length} already commented)`);

  // Select top-scoring posts within limits
  var toEngage = newPosts
    .filter(function(p) { return p.score >= CONFIG.limits.minScoreToEngage; })
    .slice(0, CONFIG.limits.maxCommentsPerRun);

  var withDirectUrl = toEngage.filter(function(p) { return isValidPostUrl(p.postUrl); }).length;
  log('info', `Will comment on ${toEngage.length} posts (${withDirectUrl} with direct URL, ${toEngage.length - withDirectUrl} via click-through, max: ${CONFIG.limits.maxCommentsPerRun})`);

  var commented = 0;
  for (var i = 0; i < toEngage.length; i++) {
    var post = toEngage[i];

    console.log(`\n${'─'.repeat(60)}`);
    log('act', `[${i + 1}/${toEngage.length}] Score: ${post.score} | ${post.category}`);
    log('info', `Group: ${post.group}`);
    log('info', `Author: ${post.author}`);
    log('info', `Text: ${post.text.substring(0, 100)}...`);

    // Generate contextual comment with Gemini, fallback to templates
    var comment = await generateComment(post);
    var source = 'gemini';
    if (!comment) {
      comment = pickComment(post.category);
      source = 'template';
    }
    log('info', `Comment (${source}): "${comment.substring(0, 80)}..."`);

    if (dryRun) {
      log('warn', 'DRY RUN - skipping');
      continue;
    }

    try {
      var success = await commentOnPost(post, comment);

      if (success) {
        var postKey = post.postUrl || post.hashKey;
        state.commentedPosts[postKey] = {
          date: new Date().toISOString(),
          comment: comment,
          category: post.category,
          author: post.author,
          group: post.group,
          score: post.score,
        };
        state.totalComments++;
        commented++;
        await saveState(state);

        // Wait between comments
        if (i < toEngage.length - 1) {
          var waitMs = CONFIG.limits.minSecondsBetweenComments * 1000 + rand({ min: 0, max: 30000 });
          log('info', `Waiting ${Math.round(waitMs / 1000)}s before next comment...`);
          await sleep(waitMs);
        }
      }
    } catch (e) {
      log('err', `Failed to comment: ${e.message}`);
    }
  }

  await saveState(state);
  await fs.writeFile(CONFIG.prospectsFile, JSON.stringify(posts, null, 2));

  console.log(`\n${'═'.repeat(60)}`);
  log('ok', `Run complete: ${commented} comments posted`);
  log('info', `Total comments all-time: ${state.totalComments}`);
  log('info', `Unique posts tracked: ${Object.keys(state.commentedPosts).length}`);
}

async function cmdStats() {
  var state = await loadState();
  console.log('\n📊 SUPPLY HUNTER STATS');
  console.log('═'.repeat(40));
  console.log(`Last run:       ${state.lastRun || 'Never'}`);
  console.log(`Total comments: ${state.totalComments}`);
  console.log(`Posts tracked:  ${Object.keys(state.commentedPosts).length}`);

  var cats = {};
  Object.values(state.commentedPosts).forEach(function(p) {
    cats[p.category] = (cats[p.category] || 0) + 1;
  });
  console.log('\nBy category:');
  Object.entries(cats).forEach(function(entry) {
    console.log(`  ${entry[0]}: ${entry[1]}`);
  });

  // Recent comments
  var recent = Object.entries(state.commentedPosts)
    .sort(function(a, b) { return b[1].date.localeCompare(a[1].date); })
    .slice(0, 5);
  if (recent.length > 0) {
    console.log('\nRecent comments:');
    recent.forEach(function(entry) {
      var p = entry[1];
      console.log(`  ${p.date.substring(0, 10)} | ${p.category} | ${p.group || 'N/A'} | ${p.author || 'N/A'}`);
    });
  }
}

// ============================================
// CLI ENTRYPOINT
// ============================================

async function main() {
  var args = process.argv.slice(2);
  var command = args[0] || 'help';
  var dryRun = args.includes('--dry-run');
  var noGroupFilter = args.includes('--no-group-filter');

  var maxIdx = args.indexOf('--max-comments');
  if (maxIdx !== -1 && args[maxIdx + 1]) {
    CONFIG.limits.maxCommentsPerRun = parseInt(args[maxIdx + 1], 10);
  }

  // Disable group filtering if flag is passed
  if (noGroupFilter) {
    myGroups = null;
    log('info', 'Group filtering disabled via --no-group-filter');
  }

  try {
    switch (command) {
      case 'scan':
        await cmdScan();
        break;
      case 'engage':
        await cmdEngage(dryRun);
        break;
      case 'stats':
        await cmdStats();
        break;
      default:
        console.log(`
Supply Hunter - AutoRenta Facebook Supply Acquisition
=====================================================

Usage:
  node supply-hunter.mjs scan                    Search & extract prospects (read-only)
  node supply-hunter.mjs engage                  Search, extract & comment on top posts
  node supply-hunter.mjs engage --dry-run        Preview what would be commented
  node supply-hunter.mjs engage --max-comments 5 Limit comments per run
  node supply-hunter.mjs engage --no-group-filter Comment in any group (no whitelist)
  node supply-hunter.mjs stats                   Show engagement statistics

Keywords:
${CONFIG.keywords.map(function(k) { return '  - ' + k; }).join('\n')}

Comment categories: ${Object.keys(COMMENT_TEMPLATES).join(', ')}
Max comments/run:   ${CONFIG.limits.maxCommentsPerRun}
Min delay between:  ${CONFIG.limits.minSecondsBetweenComments}s
Min score to engage: ${CONFIG.limits.minScoreToEngage}

Environment:
  PATCHRIGHT_PROFILE  Browser profile dir (default: /home/edu/.patchright-profile)
  MAX_COMMENTS        Override max comments per run
        `);
    }
  } catch (e) {
    log('err', e.message);
    console.error(e);
  } finally {
    await closeBrowser();
  }
}

main();
