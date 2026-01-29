#!/usr/bin/env node

/**
 * Facebook Account Creator
 * 
 * Automatiza la creación de cuentas de Facebook con comportamiento humano.
 * 
 * IMPORTANTE: 
 * - Ejecutar máximo 2-3 cuentas por día
 * - Rotar IP entre cada cuenta (Modo Avión o proxy)
 * - Esperar mínimo 30 minutos entre cuentas
 */

import 'dotenv/config';
import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración
const COOKIES_DIR = process.env.COOKIES_DIR || path.join(__dirname, '../cookies');
const SCREENSHOTS_DIR = process.env.SCREENSHOT_DIR || path.join(__dirname, '../screenshots');
const HEADLESS = process.env.HEADLESS === 'true';

// ============================================
// UTILIDADES HUMANAS
// ============================================

async function humanDelay(min = 500, max = 2000) {
    const delay = Math.random() * (max - min) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
}

async function humanType(page, selector, text) {
    await page.click(selector);
    await humanDelay(300, 600);

    for (const char of text) {
        await page.keyboard.type(char, {
            delay: Math.random() * 150 + 50 // 50-200ms entre teclas
        });

        // Pausa ocasional (como si pensara)
        if (Math.random() > 0.9) {
            await humanDelay(500, 1500);
        }
    }
}

async function humanClick(page, selector) {
    const element = await page.$(selector);
    if (!element) {
        throw new Error(`Element not found: ${selector}`);
    }

    const box = await element.boundingBox();
    if (!box) {
        throw new Error(`Element has no bounding box: ${selector}`);
    }

    // Click con offset aleatorio (no siempre en el centro exacto)
    const x = box.x + box.width * (0.3 + Math.random() * 0.4);
    const y = box.y + box.height * (0.3 + Math.random() * 0.4);

    await page.mouse.move(x, y, { steps: Math.floor(Math.random() * 10) + 5 });
    await humanDelay(100, 300);
    await page.mouse.click(x, y);
}

function generatePassword() {
    const words = ['Auto', 'Renta', 'Car', 'Drive', 'Road', 'Trip'];
    const word1 = words[Math.floor(Math.random() * words.length)];
    const word2 = words[Math.floor(Math.random() * words.length)];
    const number = Math.floor(Math.random() * 9000) + 1000;
    const special = ['!', '@', '#', '$'][Math.floor(Math.random() * 4)];
    return `${word1}${word2}${number}${special}`;
}

function generateBirthdate(age) {
    const currentYear = new Date().getFullYear();
    const birthYear = currentYear - age;
    const month = Math.floor(Math.random() * 12) + 1;
    const day = Math.floor(Math.random() * 28) + 1;
    return { day, month, year: birthYear };
}

// ============================================
// ANTI-DETECTION
// ============================================

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
];

const VIEWPORTS = [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 1536, height: 864 },
    { width: 1440, height: 900 },
];

async function setupAntiDetection(context) {
    // Añadir scripts anti-detección
    await context.addInitScript(() => {
        // Ocultar webdriver
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

        // Falsear plugins
        Object.defineProperty(navigator, 'plugins', {
            get: () => [1, 2, 3, 4, 5]
        });

        // Falsear languages
        Object.defineProperty(navigator, 'languages', {
            get: () => ['es-AR', 'es', 'en-US', 'en']
        });

        // Ocultar automation
        delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
        delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
        delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;

        // Chrome específico
        window.chrome = { runtime: {} };

        // Permissions
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
            parameters.name === 'notifications' ?
                Promise.resolve({ state: Notification.permission }) :
                originalQuery(parameters)
        );
    });
}

// ============================================
// CREADOR DE CUENTAS
// ============================================

async function createFacebookAccount(identity, emailConfig) {
    console.log(`\n🚀 Creating account for: ${identity.name}`);
    console.log(`   Email: ${emailConfig.email}`);

    // Crear directorios si no existen
    await fs.mkdir(COOKIES_DIR, { recursive: true });
    await fs.mkdir(SCREENSHOTS_DIR, { recursive: true });

    // Configuración de browser
    const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    const viewport = VIEWPORTS[Math.floor(Math.random() * VIEWPORTS.length)];

    const browser = await chromium.launch({
        headless: HEADLESS,
        args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
        ]
    });

    const context = await browser.newContext({
        userAgent,
        viewport,
        locale: 'es-AR',
        timezoneId: 'America/Argentina/Buenos_Aires',
        geolocation: {
            latitude: -34.6037 + (Math.random() * 0.1 - 0.05),
            longitude: -58.3816 + (Math.random() * 0.1 - 0.05)
        },
        permissions: ['geolocation'],
    });

    await setupAntiDetection(context);
    const page = await context.newPage();

    // Datos de la cuenta
    const password = generatePassword();
    const birthdate = generateBirthdate(identity.age);
    const gender = identity.gender === 'male' ? 'male' : 'female';

    // Obtener apellido de identidades existentes o generar
    const apellidos = ['García', 'Rodríguez', 'Martínez', 'López', 'González',
        'Fernández', 'Pérez', 'Sánchez', 'Romero', 'Torres'];
    const apellido = apellidos[Math.floor(Math.random() * apellidos.length)];

    const accountData = {
        persona_id: identity.id,
        name: identity.name,
        apellido,
        email: emailConfig.email,
        password,
        birthdate,
        gender,
        created_at: new Date().toISOString(),
        status: 'pending'
    };

    try {
        console.log('   Navigating to Facebook...');
        await page.goto('https://www.facebook.com/', { waitUntil: 'networkidle' });
        await humanDelay(2000, 4000);

        // Screenshot inicial
        await page.screenshot({
            path: path.join(SCREENSHOTS_DIR, `${identity.id}-01-home.png`)
        });

        // Buscar y clickear "Create new account"
        console.log('   Looking for signup button...');

        // Intentar diferentes selectores
        const signupSelectors = [
            'a[data-testid="open-registration-form-button"]',
            'text=Create new account',
            'text=Crear cuenta nueva',
            'text=Create New Account',
            'a[href*="reg"]',
        ];

        let clicked = false;
        for (const selector of signupSelectors) {
            try {
                const button = await page.$(selector);
                if (button) {
                    await humanClick(page, selector);
                    clicked = true;
                    console.log(`   ✓ Clicked signup button`);
                    break;
                }
            } catch (e) {
                continue;
            }
        }

        if (!clicked) {
            throw new Error('Could not find signup button');
        }

        await humanDelay(2000, 4000);
        await page.screenshot({
            path: path.join(SCREENSHOTS_DIR, `${identity.id}-02-signup-form.png`)
        });

        // Llenar formulario
        console.log('   Filling registration form...');

        // Facebook 2024 tiene formulario diferente
        // Detectar qué versión del formulario tenemos
        const isNewForm = await page.$('input[placeholder*="Nombre"]') !== null;

        if (isNewForm) {
            console.log('   Detected new Facebook form layout');

            // Nuevo formulario 2024
            // Nombre (primer input)
            const nameInputs = await page.$$('input[type="text"]');
            if (nameInputs.length >= 2) {
                await nameInputs[0].click();
                await humanDelay(300, 600);
                await page.keyboard.type(identity.name, { delay: 80 });
                await humanDelay(500, 1000);

                // Apellido (segundo input)
                await nameInputs[1].click();
                await humanDelay(300, 600);
                await page.keyboard.type(apellido, { delay: 80 });
                await humanDelay(500, 1000);
            }

            // Fecha de nacimiento (3 selects)
            const selects = await page.$$('select');
            if (selects.length >= 3) {
                // Día
                await selects[0].selectOption(String(birthdate.day));
                await humanDelay(300, 500);
                // Mes
                await selects[1].selectOption(String(birthdate.month));
                await humanDelay(300, 500);
                // Año
                await selects[2].selectOption(String(birthdate.year));
                await humanDelay(300, 500);
            }

            // Género (select o dropdown)
            const genderSelect = await page.$('select:has-text("género"), select[aria-label*="género"]');
            if (genderSelect) {
                const genderValue = gender === 'male' ? 'Masculino' : 'Femenino';
                await genderSelect.selectOption({ label: genderValue });
                await humanDelay(300, 500);
            } else {
                // Intentar con dropdown
                const genderDropdown = await page.$('div[aria-label*="género"], span:has-text("Selecciona tu género")');
                if (genderDropdown) {
                    await genderDropdown.click();
                    await humanDelay(500, 1000);
                    const genderOption = gender === 'male' ? 'Masculino' : 'Femenino';
                    await page.click(`text=${genderOption}`);
                    await humanDelay(300, 500);
                }
            }

            // Email (buscar por placeholder o label)
            const emailInput = await page.$('input[type="text"][placeholder*="celular"], input[type="text"][placeholder*="correo"], input[aria-label*="celular"]');
            if (emailInput) {
                await emailInput.click();
                await humanDelay(300, 600);
                await page.keyboard.type(emailConfig.email, { delay: 60 });
                await humanDelay(500, 1000);
            }

            // Password
            const passwordInput = await page.$('input[type="password"], input[placeholder*="Contraseña"]');
            if (passwordInput) {
                await passwordInput.click();
                await humanDelay(300, 600);
                await page.keyboard.type(password, { delay: 80 });
                await humanDelay(500, 1000);
            }

        } else {
            // Formulario antiguo (fallback)
            console.log('   Using legacy form selectors');

            // Nombre
            await humanType(page, 'input[name="firstname"]', identity.name);
            await humanDelay(500, 1000);

            // Apellido
            await humanType(page, 'input[name="lastname"]', apellido);
            await humanDelay(500, 1000);

            // Email
            await humanType(page, 'input[name="reg_email__"]', emailConfig.email);
            await humanDelay(1000, 2000);

            // El campo de confirmación aparece después de llenar el email
            try {
                const confirmSelector = 'input[name="reg_email_confirmation__"]';
                await page.waitForSelector(confirmSelector, { state: 'visible', timeout: 5000 });
                await page.fill(confirmSelector, emailConfig.email);
                await humanDelay(500, 1000);
            } catch (e) {
                // continuar
            }

            // Password
            await humanType(page, 'input[name="reg_passwd__"]', password);
            await humanDelay(500, 1000);

            // Fecha de nacimiento
            await page.selectOption('select[name="birthday_day"]', String(birthdate.day));
            await humanDelay(300, 600);
            await page.selectOption('select[name="birthday_month"]', String(birthdate.month));
            await humanDelay(300, 600);
            await page.selectOption('select[name="birthday_year"]', String(birthdate.year));
            await humanDelay(300, 600);

            // Género
            const genderValue = gender === 'male' ? '2' : '1';
            await page.click(`input[name="sex"][value="${genderValue}"]`);
            await humanDelay(500, 1000);
        }

        await page.screenshot({
            path: path.join(SCREENSHOTS_DIR, `${identity.id}-03-form-filled.png`)
        });

        // Submit
        console.log('   Submitting registration...');

        const submitSelectors = [
            'button:has-text("Enviar")',
            'button:has-text("Registrarte")',
            'button:has-text("Sign Up")',
            'button[name="websubmit"]',
            'button[type="submit"]',
        ];

        let submitted = false;
        for (const selector of submitSelectors) {
            try {
                const button = await page.$(selector);
                if (button && await button.isVisible()) {
                    await button.click();
                    submitted = true;
                    console.log(`   ✓ Clicked submit button`);
                    break;
                }
            } catch (e) {
                continue;
            }
        }

        if (!submitted) {
            // Intentar con cualquier botón visible con texto de submit
            await page.click('button:visible:has-text("Enviar"), button:visible:has-text("Registrarte")');
            console.log(`   ✓ Clicked submit button (fallback)`);
        }

        // Esperar respuesta
        await humanDelay(5000, 8000);

        await page.screenshot({
            path: path.join(SCREENSHOTS_DIR, `${identity.id}-04-after-submit.png`)
        });

        // Verificar resultado
        const currentUrl = page.url();
        const pageContent = await page.content();

        if (currentUrl.includes('checkpoint') || pageContent.includes('checkpoint')) {
            console.log('   ⚠️ Facebook requires additional verification');
            accountData.status = 'needs_verification';
        } else if (currentUrl.includes('confirm') || pageContent.includes('confirm')) {
            console.log('   ✓ Account created! Needs email confirmation');
            accountData.status = 'needs_email_confirm';
        } else if (pageContent.includes('error') || pageContent.includes('Error')) {
            console.log('   ❌ Registration error detected');
            accountData.status = 'error';
        } else {
            console.log('   ✓ Registration submitted');
            accountData.status = 'submitted';
        }

        // Guardar cookies
        const cookies = await context.cookies();
        const cookiesPath = path.join(COOKIES_DIR, `${identity.id}.json`);
        await fs.writeFile(cookiesPath, JSON.stringify(cookies, null, 2));
        console.log(`   ✓ Cookies saved to: ${cookiesPath}`);

        // Guardar datos de cuenta
        const accountsPath = path.join(__dirname, '../config/accounts.json');
        let accounts = [];
        try {
            accounts = JSON.parse(await fs.readFile(accountsPath, 'utf-8'));
        } catch { }
        accounts.push(accountData);
        await fs.writeFile(accountsPath, JSON.stringify(accounts, null, 2));

        console.log(`\n✅ Account creation completed for ${identity.name}`);
        console.log(`   Status: ${accountData.status}`);
        console.log(`   Password: ${password}`);

        return accountData;

    } catch (error) {
        console.error(`\n❌ Error creating account for ${identity.name}:`, error.message);

        await page.screenshot({
            path: path.join(SCREENSHOTS_DIR, `${identity.id}-error.png`)
        });

        accountData.status = 'error';
        accountData.error = error.message;
        return accountData;

    } finally {
        await browser.close();
    }
}

// ============================================
// ORQUESTADOR
// ============================================

async function createAccountsSequentially(startIndex = 0, count = 1) {
    console.log('🔐 Facebook Account Creator');
    console.log('============================\n');

    // Cargar identidades
    const identitiesPath = path.join(__dirname, '../config/synthetic-identities.json');
    const emailsPath = path.join(__dirname, '../config/email-mappings.json');

    let identities, emails;

    try {
        identities = JSON.parse(await fs.readFile(identitiesPath, 'utf-8'));
        emails = JSON.parse(await fs.readFile(emailsPath, 'utf-8'));
    } catch (error) {
        console.log('❌ Could not load identities or emails.');
        console.log('   Run: node generate-identities.js generate');
        console.log('   Run: node generate-emails.js gmail');
        return;
    }

    console.log(`📋 Found ${identities.length} identities`);
    console.log(`📧 Found ${emails.length} email mappings`);
    console.log(`\n🎯 Creating accounts ${startIndex + 1} to ${startIndex + count}\n`);

    const results = [];

    for (let i = startIndex; i < Math.min(startIndex + count, identities.length); i++) {
        const identity = identities[i];
        const emailConfig = emails.find(e => e.persona_id === identity.id);

        if (!emailConfig) {
            console.log(`⚠️ No email found for ${identity.id}, skipping`);
            continue;
        }

        console.log(`\n${'='.repeat(50)}`);
        console.log(`Processing ${i + 1}/${startIndex + count}: ${identity.name}`);
        console.log(`${'='.repeat(50)}`);

        const result = await createFacebookAccount(identity, emailConfig);
        results.push(result);

        // Delay entre cuentas (si hay más)
        if (i < startIndex + count - 1) {
            const waitTime = 30 + Math.random() * 30; // 30-60 segundos
            console.log(`\n⏳ Waiting ${Math.round(waitTime)} seconds before next account...`);
            console.log(`   💡 TIP: Toggle airplane mode NOW to change IP`);
            await new Promise(r => setTimeout(r, waitTime * 1000));
        }
    }

    // Resumen
    console.log('\n\n📊 SUMMARY');
    console.log('==========');
    console.log(`Total processed: ${results.length}`);
    console.log(`Successful: ${results.filter(r => r.status !== 'error').length}`);
    console.log(`Errors: ${results.filter(r => r.status === 'error').length}`);
    console.log(`Needs verification: ${results.filter(r => r.status === 'needs_verification').length}`);
    console.log(`Needs email confirm: ${results.filter(r => r.status === 'needs_email_confirm').length}`);

    return results;
}

// CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const command = process.argv[2];
    const start = parseInt(process.argv[3]) || 0;
    const count = parseInt(process.argv[4]) || 1;

    if (command === 'create') {
        createAccountsSequentially(start, count)
            .then(() => process.exit(0))
            .catch(err => {
                console.error(err);
                process.exit(1);
            });
    } else if (command === 'single') {
        // Crear una sola cuenta específica
        const personaId = process.argv[3] || 'persona-001';

        (async () => {
            const identitiesPath = path.join(__dirname, '../config/synthetic-identities.json');
            const emailsPath = path.join(__dirname, '../config/email-mappings.json');

            const identities = JSON.parse(await fs.readFile(identitiesPath, 'utf-8'));
            const emails = JSON.parse(await fs.readFile(emailsPath, 'utf-8'));

            const identity = identities.find(i => i.id === personaId);
            const emailConfig = emails.find(e => e.persona_id === personaId);

            if (!identity || !emailConfig) {
                console.log(`❌ Could not find ${personaId}`);
                process.exit(1);
            }

            await createFacebookAccount(identity, emailConfig);
            process.exit(0);
        })();
    } else {
        console.log(`
Facebook Account Creator
========================

Usage:
  node create-accounts.js create [start] [count]    Create accounts sequentially
  node create-accounts.js single <persona-id>       Create single specific account

Examples:
  node create-accounts.js create 0 3                Create first 3 accounts
  node create-accounts.js create 3 2                Create accounts 4-5
  node create-accounts.js single persona-001        Create only persona-001

Environment:
  HEADLESS=true      Run browser in headless mode
  HEADLESS=false     Run browser visibly (for debugging)

⚠️ IMPORTANT:
  - Create MAX 2-3 accounts per day
  - Toggle airplane mode between accounts to change IP
  - Wait for email verification before creating next
        `);
    }
}

export { createFacebookAccount, createAccountsSequentially };
