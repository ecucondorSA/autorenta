#!/usr/bin/env bun
/**
 * Verifica credenciales de Instagram guardadas en Supabase
 *
 * Uso: bun scripts/check-instagram-credentials.ts
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
║   📸 VERIFICAR CREDENCIALES DE INSTAGRAM                       ║
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

  log(colors.yellow, `🔍 Consultando Supabase...`);

  try {
    // Verificar si existe la tabla
    const { data: tableCheck, error: tableError } = await supabase
      .from("social_media_credentials")
      .select("*")
      .limit(1);

    if (tableError && tableError.code === "PGRST116") {
      log(colors.red, `❌ Tabla 'social_media_credentials' no existe`);
      log(colors.yellow, `Ejecuta: supabase db push`);
      return;
    }

    // Obtener credenciales de Instagram
    const { data: instagramCreds, error: igError } = await supabase
      .from("social_media_credentials")
      .select("*")
      .eq("platform", "instagram")
      .single();

    if (igError && igError.code === "PGRST116") {
      log(colors.yellow, `
⚠️  NO HAY CREDENCIALES DE INSTAGRAM GUARDADAS

Opciones:
1. Formulario web:
   Abre: /home/edu/autorentar/instagram-setup.html

2. Terminal interactiva:
   bun scripts/instagram-setup-interactive.ts

3. Chrome Extension:
   chrome://extensions/ → Load unpacked
      `);
      return;
    }

    if (igError) {
      log(colors.red, `❌ Error consultando: ${igError.message}`);
      return;
    }

    // Mostrar credenciales
    log(colors.green, `
✅ CREDENCIALES DE INSTAGRAM ENCONTRADAS

📊 Detalles:
   Platform: ${instagramCreds.platform}
   Business Account ID: ${instagramCreds.account_id}
   Page ID: ${instagramCreds.page_id}
   Access Token: ${instagramCreds.access_token.substring(0, 30)}...
   Estado: ${instagramCreds.is_active ? "✅ Activo" : "❌ Inactivo"}

⏰ Vencimiento:
   ${new Date(instagramCreds.token_expires_at).toLocaleString("es-ES")}

📅 Actualizado:
   ${new Date(instagramCreds.updated_at).toLocaleString("es-ES")}
      `);

    // Verificar si el token está a punto de expirar
    const expiryDate = new Date(instagramCreds.token_expires_at);
    const daysUntilExpiry = Math.floor(
      (expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiry <= 0) {
      log(colors.red, `🔴 ¡TOKEN EXPIRADO!`);
      log(colors.yellow, `Ejecuta de nuevo el setup:`);
      log(colors.yellow, `  bun scripts/instagram-setup-interactive.ts`);
    } else if (daysUntilExpiry <= 7) {
      log(colors.yellow, `🟡 TOKEN PRÓXIMO A EXPIRAR (${daysUntilExpiry} días)`);
      log(colors.yellow, `Recomendación: Actualiza pronto`);
    } else {
      log(colors.green, `🟢 TOKEN VÁLIDO (${daysUntilExpiry} días restantes)`);
    }

    // Mostrar cómo verificar en Meta
    log(colors.blue, `
📋 PRÓXIMOS PASOS:

1. Verificar que funciona:
   Trigger una campaña en Instagram:

   gh workflow run campaign-renter-acquisition.yml \\
     -f template=free_credit_300 \\
     -f platform=instagram \\
     -f dry_run=false

2. Ver publicaciones:
   SELECT * FROM campaign_events
   WHERE platform = 'instagram'
   ORDER BY created_at DESC;

3. Ver en Meta:
   https://developers.facebook.com/apps/AutoRenta
   Instagram Graph API > Tools > Recent Posts
      `);

  } catch (error) {
    log(colors.red, `❌ Error: ${error.message}`);
  }
}

main().catch((error) => {
  log(colors.red, `❌ Error inesperado: ${error.message}`);
  process.exit(1);
});
