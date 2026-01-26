#!/usr/bin/env bun
/**
 * Guarda credenciales de demostración de Instagram en Supabase
 * Reemplaza con valores reales cuando tengas acceso a Meta
 *
 * Uso: bun scripts/instagram-save-demo-credentials.ts
 */

import { createClient } from "@supabase/supabase-js";

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(color: string, ...text: unknown[]) {
  console.log(`${color}${text.join(" ")}${colors.reset}`);
}

async function main() {
  console.clear();

  log(colors.cyan + colors.bright, `
╔════════════════════════════════════════════════════════════════╗
║   📸 GUARDAR CREDENCIALES DE INSTAGRAM (DEMOSTRACIÓN)          ║
╚════════════════════════════════════════════════════════════════╝
  `);

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    log(colors.red, `❌ Variables de entorno no configuradas`);
    log(colors.yellow, `Asegúrate de tener .env.local con:`);
    log(colors.yellow, `  SUPABASE_URL`);
    log(colors.yellow, `  SUPABASE_SERVICE_ROLE_KEY`);
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  log(colors.yellow, `💾 Guardando credenciales de demostración...`);

  // Valores de demostración (REEMPLAZA CON LOS REALES DESPUÉS)
  const demoValues = {
    account_id: "000000000000000",
    page_id: "000000000000000",
    access_token: "IGQVJYd3F0RWM_DEMO_TOKEN_REPLACE_WITH_REAL_TOKEN",
  };

  const tokenExpiry = new Date();
  tokenExpiry.setDate(tokenExpiry.getDate() + 60);

  const { error } = await supabase
    .from("social_media_credentials")
    .upsert(
      {
        platform: "instagram",
        access_token: demoValues.access_token,
        page_id: demoValues.page_id,
        account_id: demoValues.account_id,
        is_active: false,
        token_expires_at: tokenExpiry.toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "platform" }
    );

  if (error) {
    log(colors.red, `❌ Error: ${error.message}`);
    return;
  }

  log(colors.green, `
✅ CREDENCIALES GUARDADAS

📊 Valores guardados:
   Account ID: ${demoValues.account_id}
   Page ID: ${demoValues.page_id}
   Access Token: ${demoValues.access_token.substring(0, 30)}...
   Estado: ⚠️  DEMOSTRACIÓN (no funcional)
  `);

  log(colors.blue, `
📋 PRÓXIMOS PASOS:

1. Obtén tus valores REALES de Meta:
   https://developers.facebook.com/apps/4435998730015502/

2. Ejecuta el setup interactivo:
   bun scripts/instagram-setup-interactive.ts

3. Pega los valores reales cuando se pida

4. Verifica que funcionan:
   bun scripts/check-instagram-credentials.ts
  `);
}

main().catch((error) => {
  log(colors.red, `❌ Error: ${error.message}`);
  process.exit(1);
});
