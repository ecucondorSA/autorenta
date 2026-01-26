#!/usr/bin/env bun
/**
 * Instagram Setup - Asistente Interactivo
 * Copia los 3 valores de Meta Dashboard y pégalos aquí
 *
 * Uso: bun scripts/instagram-setup-interactive.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as readline from "readline";

// Colores ANSI
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",

  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function log(color: string, ...text: unknown[]) {
  console.log(`${color}${text.join(" ")}${colors.reset}`);
}

function clearScreen() {
  console.clear();
}

async function prompt(question: string, defaultValue?: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    const prompt = defaultValue ? `${question} (${defaultValue}): ` : `${question}: `;
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer || defaultValue || "");
    });
  });
}

async function main() {
  clearScreen();

  log(colors.cyan + colors.bright, `
╔════════════════════════════════════════════════════════════════╗
║   📸 INSTAGRAM BUSINESS ACCOUNT - SETUP AUTOMÁTICO             ║
║                                                                ║
║   AutoRenta Marketing Campaigns Configuration                  ║
╚════════════════════════════════════════════════════════════════╝
  `);

  log(colors.yellow, `
⏳ TIEMPO ESTIMADO: 5 minutos

📝 QUÉ NECESITAS:
   Abre en otra ventana: https://developers.facebook.com/apps/AutoRenta

   Ve a: Instagram Graph API > Settings

   Busca estos 3 valores y cópialos aquí cuando se pida.
  `);

  // Step 1: Instructions
  log(colors.blue, `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PASO 1: OBTENER BUSINESS ACCOUNT ID
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 Ubicación:
   1. https://developers.facebook.com/apps/AutoRenta
   2. Instagram Basic Display > App Roles
   3. Busca un número como: 17841402937654321 (~20 dígitos)

💡 Ejemplo: 17841402937654321
  `);

  let accountId = await prompt("📊 Pega INSTAGRAM BUSINESS ACCOUNT ID aquí");

  // Validate Account ID
  if (!accountId || !/^\d{18,22}$/.test(accountId)) {
    log(colors.red, `❌ Formato inválido. Debe ser 18-22 dígitos.`);
    log(colors.yellow, `   Ejemplo: 17841402937654321`);
    accountId = await prompt("📊 Intenta de nuevo");
  }

  if (!/^\d{18,22}$/.test(accountId)) {
    log(colors.red, `❌ Error: Account ID inválido.`);
    return;
  }

  log(colors.green, `✅ Account ID validado: ${accountId}`);

  // Step 2: Page ID
  log(colors.blue, `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PASO 2: OBTENER PAGE ID
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 Ubicación:
   1. https://www.facebook.com/
   2. Abre tu página de negocio
   3. Settings > Page Info
   4. Busca "Page ID" (número como 123456789012345)

💡 Ejemplo: 123456789012345
  `);

  let pageId = await prompt("📄 Pega PAGE ID aquí");

  // Validate Page ID
  if (!pageId || !/^\d{13,16}$/.test(pageId)) {
    log(colors.red, `❌ Formato inválido. Debe ser 13-16 dígitos.`);
    log(colors.yellow, `   Ejemplo: 123456789012345`);
    pageId = await prompt("📄 Intenta de nuevo");
  }

  if (!/^\d{13,16}$/.test(pageId)) {
    log(colors.red, `❌ Error: Page ID inválido.`);
    return;
  }

  log(colors.green, `✅ Page ID validado: ${pageId}`);

  // Step 3: Access Token
  log(colors.blue, `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PASO 3: OBTENER ACCESS TOKEN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 Ubicación:
   1. https://developers.facebook.com/apps/AutoRenta
   2. Instagram Graph API > Tools > Access Token Debugger
   3. O genera uno nuevo en: Instagram Basic Display > Get Token
   4. Busca un token largo que empieza con IGQVJYd...

⚠️ Nota: El token es LARGO (>100 caracteres)
💡 Ejemplo: IGQVJYd3F0RWM_vI8Wh...
  `);

  let accessToken = await prompt("🔑 Pega ACCESS TOKEN aquí");

  // Validate Access Token
  if (!accessToken || accessToken.length < 100) {
    log(colors.red, `❌ Formato inválido. El token es muy corto (<100 caracteres).`);
    log(colors.yellow, `   El token debe ser un string largo`);
    accessToken = await prompt("🔑 Intenta de nuevo");
  }

  if (accessToken.length < 100) {
    log(colors.red, `❌ Error: Access Token demasiado corto.`);
    return;
  }

  log(colors.green, `✅ Access Token validado (${accessToken.length} caracteres)`);

  // Step 4: Verify credentials
  log(colors.blue, `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PASO 4: VERIFICAR CREDENCIALES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);

  log(colors.yellow, `🔍 Verificando credenciales en Meta API...`);

  try {
    const meResponse = await fetch(
      `https://graph.instagram.com/me?access_token=${accessToken}`
    );
    const meData = await meResponse.json();

    if (meData.error) {
      log(colors.red, `❌ Error de acceso: ${meData.error.message}`);
      log(colors.yellow, `Verifica que el token es válido y no ha expirado.`);
      return;
    }

    log(colors.green, `✅ Token válido para: ${meData.username}`);
    log(colors.green, `   ID: ${meData.id}`);

    // Verify media endpoint
    const mediaResponse = await fetch(
      `https://graph.instagram.com/${accountId}/media?access_token=${accessToken}`
    );
    const mediaData = await mediaResponse.json();

    if (!mediaData.error) {
      log(colors.green, `✅ Acceso a media verificado`);
    } else {
      log(colors.yellow, `⚠️  Advertencia: ${mediaData.error.message}`);
    }
  } catch (error) {
    log(colors.red, `❌ Error conectando a Meta API: ${error.message}`);
    return;
  }

  // Step 5: Save to Supabase
  log(colors.blue, `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PASO 5: GUARDAR EN SUPABASE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    log(colors.red, `❌ Variables de entorno no configuradas.`);
    log(colors.yellow, `Asegúrate de tener .env.local con SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY`);
    return;
  }

  log(colors.yellow, `💾 Guardando en Supabase...`);

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const tokenExpiry = new Date();
    tokenExpiry.setDate(tokenExpiry.getDate() + 60); // 60 days

    const { error } = await supabase
      .from("social_media_credentials")
      .upsert(
        {
          platform: "instagram",
          access_token: accessToken,
          page_id: pageId,
          account_id: accountId,
          is_active: true,
          token_expires_at: tokenExpiry.toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "platform" }
      );

    if (error) {
      log(colors.red, `❌ Error guardando en Supabase: ${error.message}`);
      return;
    }

    log(colors.green, `✅ Credenciales guardadas en Supabase`);
  } catch (error) {
    log(colors.red, `❌ Error: ${error.message}`);
    return;
  }

  // Success
  log(colors.cyan + colors.bright, `
╔════════════════════════════════════════════════════════════════╗
║                    ✅ SETUP COMPLETADO                        ║
╚════════════════════════════════════════════════════════════════╝
  `);

  log(colors.green, `
✨ Instagram está listo para usar en AutoRenta

📊 Credenciales guardadas:
   • Business Account ID: ${accountId}
   • Page ID: ${pageId}
   • Access Token: ${accessToken.substring(0, 30)}...
   • Token expira: ${new Date(new Date().setDate(new Date().getDate() + 60)).toLocaleDateString("es-ES")}
  `);

  log(colors.blue, `
🚀 PRÓXIMOS PASOS:

1. Trigger de campaña en Instagram:
   gh workflow run campaign-renter-acquisition.yml \\
     -f template=free_credit_300 \\
     -f platform=instagram \\
     -f dry_run=false

2. Ver publicaciones:
   SELECT * FROM campaign_events
   WHERE platform = 'instagram'
   ORDER BY created_at DESC;

3. Renovar token en 60 días:
   bun scripts/instagram-setup-interactive.ts
  `);

  log(colors.magenta, `
📖 Documentación:
   • /home/edu/autorentar/docs/MARKETING_CAMPAIGNS_GUIDE.md
   • /home/edu/autorentar/INSTAGRAM_QUICK_START.md

⏰ Token expira en: 60 días
⚠️  Guarda este token en un lugar seguro
  `);
}

main().catch((error) => {
  log(colors.red, `❌ Error: ${error.message}`);
  process.exit(1);
});
