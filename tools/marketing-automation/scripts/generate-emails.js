#!/usr/bin/env node

/**
 * Email Alias Generator for Synthetic Identities
 * 
 * Genera emails únicos para cada persona usando técnicas de aliasing:
 * 
 * OPCIÓN 1: Gmail Plus Aliasing (1 cuenta base)
 *   - tumail+persona1@gmail.com
 *   - tumail+persona2@gmail.com
 *   - Todos llegan al mismo inbox
 * 
 * OPCIÓN 2: Cloudflare Email Routing (requiere dominio)
 *   - martin@tudominio.com → tumail@gmail.com
 *   - lucia@tudominio.com → tumail@gmail.com
 * 
 * OPCIÓN 3: DuckDuckGo Email Protection
 *   - Genera aliases @duck.com ilimitados
 * 
 * OPCIÓN 4: ProtonMail
 *   - Crear cuentas gratis sin SMS
 */

import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// CONFIGURACIÓN
// ============================================

// Tu email base para recibir todos los aliases
const BASE_EMAIL = process.env.BASE_EMAIL || 'ecucondor@gmail.com';

// Dominio propio si tenés Cloudflare (opcional)
const CUSTOM_DOMAIN = process.env.CUSTOM_DOMAIN || null;

// ============================================
// GENERADORES DE EMAIL
// ============================================

/**
 * Gmail Plus Aliasing
 * tumail+alias@gmail.com → tumail@gmail.com
 */
function generateGmailAlias(identity, baseEmail) {
    const [user, domain] = baseEmail.split('@');
    const alias = `${identity.name.toLowerCase()}-${identity.id.replace('persona-', '')}`;
    return {
        email: `${user}+${alias}@${domain}`,
        type: 'gmail_alias',
        forwardsTo: baseEmail
    };
}

/**
 * Cloudflare Email Routing
 * Requiere dominio configurado en Cloudflare
 */
function generateCloudflareEmail(identity, domain, forwardTo) {
    const localPart = `${identity.name.toLowerCase()}${identity.age}`;
    return {
        email: `${localPart}@${domain}`,
        type: 'cloudflare_routing',
        forwardsTo: forwardTo,
        // Configuración para Cloudflare
        cloudflare_rule: {
            matchers: [{ type: 'literal', field: 'to', value: `${localPart}@${domain}` }],
            actions: [{ type: 'forward', value: [forwardTo] }]
        }
    };
}

/**
 * DuckDuckGo Email Protection
 * Genera direcciones @duck.com únicas
 */
function generateDuckAlias(identity) {
    // DuckDuckGo genera aliases aleatorios automáticamente
    // Esto es solo placeholder - necesitás activar cada uno manualmente
    const randomId = Math.random().toString(36).substring(2, 10);
    return {
        email: `${identity.name.toLowerCase()}_${randomId}@duck.com`,
        type: 'duckduckgo',
        note: 'Activar manualmente en DuckDuckGo settings'
    };
}

/**
 * Genera emails para todas las identidades
 */
async function generateEmailsForIdentities(strategy = 'gmail') {
    console.log('📧 Generating email aliases for 32 identities...\n');

    // Cargar identidades
    const identitiesPath = path.join(__dirname, '../config/synthetic-identities.json');
    let identities;

    try {
        identities = JSON.parse(await fs.readFile(identitiesPath, 'utf-8'));
    } catch {
        console.log('❌ No identities found. Run generate-identities.js first.');
        return;
    }

    const emailMappings = [];

    for (const identity of identities) {
        let emailConfig;

        switch (strategy) {
            case 'cloudflare':
                if (!CUSTOM_DOMAIN) {
                    console.log('❌ CUSTOM_DOMAIN not set. Use --strategy gmail or set domain.');
                    return;
                }
                emailConfig = generateCloudflareEmail(identity, CUSTOM_DOMAIN, BASE_EMAIL);
                break;

            case 'duckduckgo':
                emailConfig = generateDuckAlias(identity);
                break;

            case 'gmail':
            default:
                emailConfig = generateGmailAlias(identity, BASE_EMAIL);
                break;
        }

        emailMappings.push({
            persona_id: identity.id,
            persona_name: identity.name,
            ...emailConfig
        });

        console.log(`  ✅ ${identity.name}: ${emailConfig.email}`);
    }

    // Guardar mappings
    const outputPath = path.join(__dirname, '../config/email-mappings.json');
    await fs.writeFile(outputPath, JSON.stringify(emailMappings, null, 2));
    console.log(`\n📁 Saved to: ${outputPath}`);

    // Si es Cloudflare, generar script de configuración
    if (strategy === 'cloudflare') {
        await generateCloudflareScript(emailMappings);
    }

    // Generar guía de creación de cuentas
    await generateAccountCreationGuide(emailMappings, strategy);

    return emailMappings;
}

/**
 * Genera script para Cloudflare Email Routing
 */
async function generateCloudflareScript(mappings) {
    let script = `#!/bin/bash
# Cloudflare Email Routing Configuration
# Run with: bash setup-cloudflare-emails.sh

ZONE_ID="YOUR_ZONE_ID"
API_TOKEN="YOUR_API_TOKEN"

`;

    for (const mapping of mappings) {
        if (mapping.type === 'cloudflare_routing') {
            script += `
# ${mapping.persona_name}
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/email/routing/rules" \\
  -H "Authorization: Bearer $API_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(mapping.cloudflare_rule)}'
`;
        }
    }

    const scriptPath = path.join(__dirname, '../config/setup-cloudflare-emails.sh');
    await fs.writeFile(scriptPath, script);
    console.log(`\n📄 Cloudflare script saved to: ${scriptPath}`);
}

/**
 * Genera guía paso a paso para crear cuentas
 */
async function generateAccountCreationGuide(mappings, strategy) {
    let guide = `# Guía de Creación de Cuentas Facebook
Generado: ${new Date().toISOString()}

## Estrategia: ${strategy.toUpperCase()}

## Instrucciones Generales

### Antes de empezar:
1. Usá una VPN o Modo Avión (toggle datos móviles para IP nueva)
2. Usá browser en modo incógnito
3. Esperá mínimo 30 minutos entre cada cuenta
4. Nunca crees más de 2-3 cuentas por día

### Proceso por cuenta:

`;

    for (let i = 0; i < mappings.length; i++) {
        const m = mappings[i];
        guide += `
---

## Cuenta ${i + 1}: ${m.persona_name} (${m.persona_id})

**Email:** \`${m.email}\`
${m.forwardsTo ? `**Llega a:** ${m.forwardsTo}` : ''}

### Pasos:
1. Ve a facebook.com/signup
2. Nombre: ${m.persona_name} [buscar apellido en identities]
3. Email: ${m.email}
4. Password: [generar password único]
5. Verificar email (código llega a tu inbox)
6. NO agregar teléfono (skip)
7. NO subir foto aún

### Post-creación:
- [ ] Guardar cookies con: \`pnpm encrypt -- import ${m.persona_id}\`
- [ ] Esperar 24h antes de actividad
- [ ] Ejecutar warm-up día 1

`;
    }

    guide += `
---

## Rotación de IP (Gratis)

Para cada cuenta nueva:

1. **Celular Android/iOS:**
   - Activar Modo Avión
   - Esperar 10 segundos
   - Desactivar Modo Avión
   - Tu IP cambió

2. **Verificar:** 
   - Ir a whatismyip.com antes y después
   - Debe ser IP diferente

## Notas de Seguridad

- Las cuentas nuevas son FRÁGILES los primeros 7 días
- No hagas nada "raro" (muchos likes, comentarios, seguir gente)
- Dejá que el sistema de warm-up haga el trabajo
- Si te pide verificación adicional, abandoná esa cuenta
`;

    const guidePath = path.join(__dirname, '../config/account-creation-guide.md');
    await fs.writeFile(guidePath, guide);
    console.log(`\n📄 Account creation guide saved to: ${guidePath}`);
}

// CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const strategy = process.argv[2] || 'gmail';

    if (['gmail', 'cloudflare', 'duckduckgo'].includes(strategy)) {
        generateEmailsForIdentities(strategy)
            .then(() => process.exit(0))
            .catch(err => {
                console.error(err);
                process.exit(1);
            });
    } else {
        console.log(`
Usage:
  node generate-emails.js [strategy]

Strategies:
  gmail       - Use Gmail plus aliasing (default)
  cloudflare  - Use Cloudflare Email Routing (needs domain)
  duckduckgo  - Use DuckDuckGo Email Protection

Environment Variables:
  BASE_EMAIL      - Your base email (default: ecucondor@gmail.com)
  CUSTOM_DOMAIN   - Your domain for Cloudflare routing

Examples:
  node generate-emails.js gmail
  BASE_EMAIL=mymail@gmail.com node generate-emails.js gmail
        `);
    }
}

export { generateEmailsForIdentities };
