#!/usr/bin/env node

/**
 * Scheduled Publisher for Autorentar
 * 
 * Publica contenido de marketing de forma espaciada para evitar spam detection.
 * 
 * Estrategia:
 * - 10-15 posts por día máximo
 * - Espaciados cada 1-2 horas
 * - Contenido variado (no repetitivo)
 * - Horarios óptimos (9am-10pm)
 */

import 'dotenv/config';
import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración
const COOKIES_DIR = process.env.COOKIES_DIR || path.join(__dirname, '../cookies');
const MAX_POSTS_PER_DAY = 12;
const MIN_DELAY_BETWEEN_POSTS_MS = 60 * 60 * 1000; // 1 hora mínimo
const MAX_DELAY_BETWEEN_POSTS_MS = 2 * 60 * 60 * 1000; // 2 horas máximo

// Grupos de Facebook para publicar (Argentina - autos)
const TARGET_GROUPS = [
    // Estos son ejemplos - Eduardo debe agregar los grupos reales
    { name: 'Compra Venta Autos CABA', url: 'https://www.facebook.com/groups/compraventaautoscaba' },
    { name: 'Autos Usados Argentina', url: 'https://www.facebook.com/groups/autosusadosargentina' },
    { name: 'Venta de Autos Buenos Aires', url: 'https://www.facebook.com/groups/ventaautosba' },
    // Agregar más grupos aquí...
];

// ============================================
// GENERADOR DE CONTENIDO VARIADO
// ============================================

const CONTENT_TEMPLATES = [
    {
        type: 'question',
        templates: [
            '¿Alguna vez pensaste en poner tu auto a trabajar mientras no lo usás? 🚗💰',
            '¿Tu auto pasa más tiempo estacionado que en la calle? Tengo una idea para vos...',
            '¿Cuánto te cuesta mantener un auto que usás solo los fines de semana? 🤔',
            '¿Sabías que podés generar ingresos extras con tu auto sin venderlo?',
        ]
    },
    {
        type: 'testimonial',
        templates: [
            'Mi vecino empezó a alquilar su auto y ya recuperó el seguro del año 📈',
            'Un amigo gana $200.000/mes extra alquilando su auto los días que no lo usa',
            'Increíble: conocí gente que paga la cuota del auto alquilándolo 3 días al mes',
        ]
    },
    {
        type: 'info',
        templates: [
            '🚙 El argentino promedio usa su auto solo 4% del tiempo. El resto... estacionado.',
            'Dato: Un auto pierde 20% de su valor por año. ¿Y si lo pusieras a generar?',
            '📊 Más de 500.000 autos en CABA pasan +20 horas al día sin moverse.',
        ]
    },
    {
        type: 'call_to_action',
        templates: [
            '🔥 Nueva plataforma de alquiler de autos entre particulares. Seguro incluido, pagos garantizados.',
            'Buscamos propietarios de autos en AMBA para nueva plataforma de alquiler P2P 🚗',
            '¿Tenés un auto 2018 o más nuevo? Podés generar hasta $300.000/mes extra 💵',
        ]
    },
    {
        type: 'fear_solution',
        templates: [
            '¿Miedo a prestar tu auto? Con AutoRenta tenés: seguro total, depósito, verificación del conductor.',
            'El problema de prestar el auto: no sabés quién lo maneja. La solución: verificación biométrica + seguimiento GPS.',
            '¿Y si te chocan el auto? Con nosotros: seguro todo riesgo + depósito bloqueado + video inspección.',
        ]
    }
];

function generateVariedContent(index) {
    // Rotar entre tipos de contenido
    const typeIndex = index % CONTENT_TEMPLATES.length;
    const contentType = CONTENT_TEMPLATES[typeIndex];

    // Seleccionar template dentro del tipo
    const templateIndex = Math.floor(index / CONTENT_TEMPLATES.length) % contentType.templates.length;
    let content = contentType.templates[templateIndex];

    // Agregar variación
    const variations = [
        '\n\n¿Qué opinan?',
        '\n\n👇 Comenten si les interesa',
        '\n\nMás info en bio',
        '\n\n#autos #argentina #ingresos',
        '',
        '\n\n🔗 AutoRenta.app',
    ];

    content += variations[index % variations.length];

    return {
        text: content,
        type: contentType.type,
        index
    };
}

// ============================================
// PUBLICADOR
// ============================================

async function publishToGroup(page, groupUrl, content) {
    try {
        console.log(`\n📍 Navegando a grupo: ${groupUrl}`);
        await page.goto(groupUrl, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(3000 + Math.random() * 2000);

        // Buscar el campo de crear post
        const postBoxSelectors = [
            'div[role="button"]:has-text("Escribir algo")',
            'div[role="button"]:has-text("¿Qué estás pensando?")',
            'div[role="button"]:has-text("Write something")',
            'span:has-text("Escribir algo")',
        ];

        let clicked = false;
        for (const selector of postBoxSelectors) {
            try {
                const element = await page.$(selector);
                if (element && await element.isVisible()) {
                    await element.click();
                    clicked = true;
                    console.log('   ✓ Abrió cuadro de post');
                    break;
                }
            } catch (e) {
                continue;
            }
        }

        if (!clicked) {
            console.log('   ❌ No se encontró cuadro de post');
            return false;
        }

        await page.waitForTimeout(2000);

        // Escribir contenido
        const textareaSelectors = [
            'div[contenteditable="true"][role="textbox"]',
            'div[aria-label*="Escribe algo"]',
            'div[data-lexical-editor="true"]',
        ];

        let typed = false;
        for (const selector of textareaSelectors) {
            try {
                const textarea = await page.$(selector);
                if (textarea) {
                    await textarea.click();
                    await page.waitForTimeout(500);

                    // Escribir con delays humanos
                    for (const char of content.text) {
                        await page.keyboard.type(char, { delay: 30 + Math.random() * 50 });
                    }

                    typed = true;
                    console.log('   ✓ Escribió contenido');
                    break;
                }
            } catch (e) {
                continue;
            }
        }

        if (!typed) {
            console.log('   ❌ No se pudo escribir');
            return false;
        }

        await page.waitForTimeout(1500);

        // Click en Publicar
        const publishSelectors = [
            'div[aria-label="Publicar"]',
            'button:has-text("Publicar")',
            'span:has-text("Publicar")',
        ];

        for (const selector of publishSelectors) {
            try {
                const button = await page.$(selector);
                if (button && await button.isVisible()) {
                    await button.click();
                    console.log('   ✓ Click en Publicar');
                    await page.waitForTimeout(3000);
                    return true;
                }
            } catch (e) {
                continue;
            }
        }

        console.log('   ❌ No se encontró botón Publicar');
        return false;

    } catch (error) {
        console.error(`   ❌ Error:`, error.message);
        return false;
    }
}

// ============================================
// SCHEDULER
// ============================================

async function runScheduledPublishing(cookiesPath, totalPosts = 80) {
    console.log('📅 SCHEDULED PUBLISHER FOR AUTORENTAR');
    console.log('=====================================\n');

    // Cargar o crear estado
    const statePath = path.join(__dirname, '../config/publish-state.json');
    let state;

    try {
        state = JSON.parse(await fs.readFile(statePath, 'utf-8'));
    } catch {
        state = {
            postsPublished: 0,
            postsToday: 0,
            lastPostDate: null,
            lastPostTime: null,
            history: []
        };
    }

    // Verificar si es nuevo día
    const today = new Date().toISOString().split('T')[0];
    if (state.lastPostDate !== today) {
        state.postsToday = 0;
        state.lastPostDate = today;
    }

    // Verificar límite diario
    if (state.postsToday >= MAX_POSTS_PER_DAY) {
        console.log(`⏸️ Límite diario alcanzado (${MAX_POSTS_PER_DAY} posts)`);
        console.log(`   Volvé a ejecutar mañana.`);
        return;
    }

    // Verificar delay desde último post
    if (state.lastPostTime) {
        const elapsed = Date.now() - new Date(state.lastPostTime).getTime();
        if (elapsed < MIN_DELAY_BETWEEN_POSTS_MS) {
            const waitMs = MIN_DELAY_BETWEEN_POSTS_MS - elapsed;
            console.log(`⏳ Esperá ${Math.round(waitMs / 60000)} minutos antes del próximo post`);
            return;
        }
    }

    // Verificar si ya terminamos
    if (state.postsPublished >= totalPosts) {
        console.log(`✅ ¡Campaña completa! ${totalPosts} posts publicados.`);
        return;
    }

    console.log(`📊 Progreso: ${state.postsPublished}/${totalPosts} posts`);
    console.log(`📅 Hoy: ${state.postsToday}/${MAX_POSTS_PER_DAY} posts\n`);

    // Cargar cookies
    let cookies;
    try {
        cookies = JSON.parse(await fs.readFile(cookiesPath, 'utf-8'));
    } catch {
        console.log('❌ No se encontraron cookies. Ejecutá primero el login.');
        return;
    }

    // Iniciar browser
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        locale: 'es-AR',
        timezoneId: 'America/Argentina/Buenos_Aires',
    });

    await context.addCookies(cookies);
    const page = await context.newPage();

    try {
        // Calcular cuántos posts hacer en esta sesión
        const postsThisSession = Math.min(
            3, // Máximo 3 por sesión
            MAX_POSTS_PER_DAY - state.postsToday,
            totalPosts - state.postsPublished
        );

        console.log(`🎯 Posts esta sesión: ${postsThisSession}\n`);

        for (let i = 0; i < postsThisSession; i++) {
            const content = generateVariedContent(state.postsPublished + i);
            const groupIndex = (state.postsPublished + i) % TARGET_GROUPS.length;
            const group = TARGET_GROUPS[groupIndex];

            console.log(`\n📝 Post ${state.postsPublished + i + 1}/${totalPosts}`);
            console.log(`   Tipo: ${content.type}`);
            console.log(`   Grupo: ${group.name}`);
            console.log(`   Contenido: ${content.text.substring(0, 50)}...`);

            const success = await publishToGroup(page, group.url, content);

            if (success) {
                state.postsPublished++;
                state.postsToday++;
                state.lastPostTime = new Date().toISOString();
                state.history.push({
                    index: state.postsPublished,
                    group: group.name,
                    content: content.text,
                    timestamp: state.lastPostTime,
                    success: true
                });

                // Guardar estado
                await fs.writeFile(statePath, JSON.stringify(state, null, 2));
                console.log(`   ✅ Publicado! (${state.postsPublished}/${totalPosts})`);
            } else {
                console.log(`   ⚠️ Falló, continuando...`);
            }

            // Delay entre posts
            if (i < postsThisSession - 1) {
                const delay = MIN_DELAY_BETWEEN_POSTS_MS + Math.random() * (MAX_DELAY_BETWEEN_POSTS_MS - MIN_DELAY_BETWEEN_POSTS_MS);
                console.log(`\n⏳ Esperando ${Math.round(delay / 60000)} minutos...`);
                await page.waitForTimeout(delay);
            }
        }

        console.log('\n\n📊 RESUMEN DE SESIÓN');
        console.log('====================');
        console.log(`Posts esta sesión: ${postsThisSession}`);
        console.log(`Total publicados: ${state.postsPublished}/${totalPosts}`);
        console.log(`Restantes: ${totalPosts - state.postsPublished}`);
        console.log(`\n⏰ Próxima sesión: en 1-2 horas o mañana si alcanzaste el límite diario`);

    } finally {
        // Guardar cookies actualizadas
        const updatedCookies = await context.cookies();
        await fs.writeFile(cookiesPath, JSON.stringify(updatedCookies, null, 2));

        await browser.close();
    }
}

// ============================================
// MODO SIMULACIÓN (sin publicar realmente)
// ============================================

async function simulateSchedule(totalPosts = 80) {
    console.log('📋 SIMULACIÓN DE SCHEDULE');
    console.log('=========================\n');

    const postsPerDay = MAX_POSTS_PER_DAY;
    const days = Math.ceil(totalPosts / postsPerDay);

    console.log(`Total posts: ${totalPosts}`);
    console.log(`Posts por día: ${postsPerDay}`);
    console.log(`Días necesarios: ${days}`);
    console.log(`\n📅 CALENDARIO:\n`);

    let postIndex = 0;
    for (let day = 1; day <= days; day++) {
        const postsThisDay = Math.min(postsPerDay, totalPosts - postIndex);
        console.log(`DÍA ${day}:`);

        for (let i = 0; i < postsThisDay; i++) {
            const content = generateVariedContent(postIndex);
            const group = TARGET_GROUPS[postIndex % TARGET_GROUPS.length];
            const hour = 9 + Math.floor(i * (12 / postsPerDay));

            console.log(`  ${hour}:00 - [${content.type}] → ${group.name}`);
            postIndex++;
        }
        console.log('');
    }
}

// CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const command = process.argv[2];
    const cookiesPath = process.argv[3] || path.join(COOKIES_DIR, 'autorentar.json');
    const totalPosts = parseInt(process.argv[4]) || 80;

    if (command === 'run') {
        runScheduledPublishing(cookiesPath, totalPosts)
            .then(() => process.exit(0))
            .catch(err => {
                console.error(err);
                process.exit(1);
            });
    } else if (command === 'simulate') {
        simulateSchedule(totalPosts);
    } else {
        console.log(`
Scheduled Publisher for Autorentar
===================================

Usage:
  node scheduled-publisher.js simulate [total]     Ver calendario sin publicar
  node scheduled-publisher.js run <cookies> [total]  Ejecutar publicación

Examples:
  node scheduled-publisher.js simulate 80
  node scheduled-publisher.js run cookies/autorentar.json 80

Configuration:
  - MAX_POSTS_PER_DAY: ${MAX_POSTS_PER_DAY}
  - Delay entre posts: 1-2 horas
  - Grupos configurados: ${TARGET_GROUPS.length}

⚠️ IMPORTANTE:
  - Primero exportá tus cookies de Autorentar
  - Ejecutá varias veces al día (cada 1-2 horas)
  - El sistema guarda el progreso automáticamente
        `);
    }
}

export { runScheduledPublishing, simulateSchedule };
