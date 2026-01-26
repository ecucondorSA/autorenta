#!/usr/bin/env bun
/**
 * Setup Meta Credentials - Guía interactiva para obtener credenciales de Facebook/Instagram
 */

import * as readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim());
    });
  });
}

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

function log(message: string, color: keyof typeof colors = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title: string) {
  log("\n", "cyan");
  log("╔" + "=".repeat(60) + "╗", "cyan");
  log(`║ ${title.padEnd(58)} ║`, "cyan");
  log("╚" + "=".repeat(60) + "╝", "cyan");
}

async function main() {
  log("\n🔐 SETUP META CREDENTIALS - GUÍA INTERACTIVA", "bold");
  log("=========================================", "cyan");

  // Paso 1: Verificar si ya tiene credenciales
  section("PASO 1: VERIFICAR CREDENCIALES EXISTENTES");

  const existingFbToken = process.env.FACEBOOK_ACCESS_TOKEN;
  const existingIgToken = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (existingFbToken || existingIgToken) {
    log("\n⚠️  Se encontraron credenciales existentes:", "yellow");
    if (existingFbToken) log("  ✓ FACEBOOK_ACCESS_TOKEN configurado", "green");
    if (existingIgToken)
      log("  ✓ INSTAGRAM_ACCESS_TOKEN configurado", "green");

    const override = await question(
      "\n¿Deseas crear nuevas credenciales? (s/n): "
    );
    if (override.toLowerCase() !== "s") {
      log(
        "\n✅ Usando credenciales existentes. Adiós!",
        "green"
      );
      rl.close();
      return;
    }
  }

  // Paso 2: Instrucciones para Meta Developers
  section("PASO 2: ACCEDER A META DEVELOPERS");

  log("\n📍 Abre esta URL en tu navegador:", "blue");
  log("   https://developers.facebook.com/", "blue");
  log("\n✓ Completa estos pasos:", "cyan");

  log("\n1️⃣  CREAR UNA APLICACIÓN", "bold");
  log("   • Click en 'My Apps' (arriba a la derecha)", "yellow");
  log("   • Click en 'Create App'", "yellow");
  log("   • App Type: Selecciona 'Business'", "yellow");
  log("   • App Name: 'AutoRenta Social Publishing'", "yellow");
  log("   • App Contact Email: tu email", "yellow");
  log("   • Click 'Create App'", "yellow");

  log("\n2️⃣  CONFIGURAR PERMISOS", "bold");
  log("   • En el dashboard, busca 'Products'", "yellow");
  log("   • Click en '+ Add Product'", "yellow");
  log("   • Busca 'Facebook Login' y click 'Set Up'", "yellow");
  log("   • Busca 'Graph API' y click 'Set Up'", "yellow");

  log("\n3️⃣  OBTENER ACCESS TOKEN", "bold");
  log("   • Ve a 'Tools & Support' → 'Access Token Tool'", "yellow");
  log("   • O ve a Settings → Basic → copia 'App ID' y 'App Secret'", "yellow");
  log("   • Luego en Tools & Support → Access Token Tool", "yellow");
  log("   • Selecciona tu app", "yellow");
  log("   • Copia el token (es muy largo, empieza con 'EAA')", "yellow");

  log("\n4️⃣  OBTENER FACEBOOK PAGE ID", "bold");
  log("   • Ve a tu Página de Facebook", "yellow");
  log("   • Click en 'Configuración'", "yellow");
  log("   • Ve a 'Información básica de la página'", "yellow");
  log("   • Copia el 'ID de la Página'", "yellow");

  log("\n5️⃣  CONECTAR INSTAGRAM A FACEBOOK", "bold");
  log("   • Ve a Facebook Business Suite: https://business.facebook.com/", "yellow");
  log("   • Click en 'Instagram' → 'Configuración'", "yellow");
  log("   • Busca 'Instagram Business Account ID'", "yellow");
  log("   • Copia el ID (números largos)", "yellow");

  section("PASO 3: INGRESAR CREDENCIALES");

  log("\n📋 Ahora ingresa tus credenciales obtenidas:", "cyan");
  log("(Pega los valores completos, sin espacios extras)\n", "yellow");

  let fbToken = "";
  let fbPageId = "";
  let igToken = "";
  let igBusinessId = "";

  while (!fbToken) {
    fbToken = await question(
      '→ FACEBOOK_ACCESS_TOKEN (empieza con "EAA"): '
    );
    if (!fbToken.startsWith("EAA") && fbToken.length < 50) {
      log("   ⚠️  Token inválido. Debe empezar con 'EAA' y ser muy largo", "red");
      fbToken = "";
    }
  }

  while (!fbPageId) {
    fbPageId = await question("→ FACEBOOK_PAGE_ID (números): ");
    if (!/^\d+$/.test(fbPageId)) {
      log("   ⚠️  Page ID inválido. Debe ser solo números", "red");
      fbPageId = "";
    }
  }

  while (!igToken) {
    igToken = await question(
      '→ INSTAGRAM_ACCESS_TOKEN (empieza con "EAA"): '
    );
    if (!igToken.startsWith("EAA") && igToken.length < 50) {
      log("   ⚠️  Token inválido. Debe empezar con 'EAA' y ser muy largo", "red");
      igToken = "";
    }
  }

  while (!igBusinessId) {
    igBusinessId = await question(
      "→ INSTAGRAM_BUSINESS_ID (números largos): "
    );
    if (!/^\d+$/.test(igBusinessId)) {
      log("   ⚠️  Business ID inválido. Debe ser solo números", "red");
      igBusinessId = "";
    }
  }

  section("PASO 4: GUARDAR CREDENCIALES");

  log("\n✅ Credenciales ingresadas correctamente!\n", "green");
  log("Ahora necesitas guardarlas en Supabase:", "blue");

  log("\n🔧 Opción A: Guardar en Supabase Secrets (RECOMENDADO)", "bold");
  log("Ejecuta estos comandos en tu terminal:\n", "cyan");

  log(`supabase secrets set FACEBOOK_ACCESS_TOKEN "${fbToken}"`, "yellow");
  log(`supabase secrets set FACEBOOK_PAGE_ID "${fbPageId}"`, "yellow");
  log(`supabase secrets set INSTAGRAM_ACCESS_TOKEN "${igToken}"`, "yellow");
  log(
    `supabase secrets set INSTAGRAM_BUSINESS_ID "${igBusinessId}"`,
    "yellow"
  );

  log("\n📋 O copia esto a tu archivo .env.local:\n", "cyan");
  log(`FACEBOOK_ACCESS_TOKEN=${fbToken}`, "yellow");
  log(`FACEBOOK_PAGE_ID=${fbPageId}`, "yellow");
  log(`INSTAGRAM_ACCESS_TOKEN=${igToken}`, "yellow");
  log(`INSTAGRAM_BUSINESS_ID=${igBusinessId}`, "yellow");

  log("\n⚠️  IMPORTANTE:", "red");
  log("  • NUNCA commitees credenciales al repositorio", "red");
  log("  • Usa solo Supabase Secrets o .env.local", "red");
  log("  • Los tokens expiran - renuévalos periódicamente", "red");

  section("PASO 5: VERIFICAR CREDENCIALES");

  const testNow = await question(
    "\n¿Deseas probar las credenciales ahora? (s/n): "
  );

  if (testNow.toLowerCase() === "s") {
    log("\n🧪 Ejecutando test de credenciales...\n", "blue");

    // Test Facebook
    log("📘 Probando Facebook...", "cyan");
    try {
      const fbResponse = await fetch(
        `https://graph.facebook.com/v20.0/me?access_token=${fbToken}`
      );
      if (fbResponse.ok) {
        const fbData = await fbResponse.json();
        log(`  ✅ Facebook válido: ${fbData.name}`, "green");
      } else {
        log("  ❌ Token de Facebook inválido", "red");
      }
    } catch (error) {
      log(`  ❌ Error: ${error}`, "red");
    }

    // Test Instagram
    log("📷 Probando Instagram...", "cyan");
    try {
      const igResponse = await fetch(
        `https://graph.instagram.com/v20.0/${igBusinessId}?access_token=${igToken}`
      );
      if (igResponse.ok) {
        log("  ✅ Instagram válido", "green");
      } else {
        log("  ❌ Token/ID de Instagram inválido", "red");
      }
    } catch (error) {
      log(`  ❌ Error: ${error}`, "red");
    }
  }

  section("¡LISTO!");

  log("\n✅ Una vez configuradas las credenciales, ejecuta:", "green");
  log("   bun scripts/test-social-publishing.ts\n", "yellow");

  log("📚 Para más información:", "cyan");
  log("   • Facebook Docs: https://developers.facebook.com/docs/", "blue");
  log(
    "   • Instagram Graph API: https://developers.facebook.com/docs/instagram-graph-api",
    "blue"
  );

  rl.close();
}

main().catch(console.error);
