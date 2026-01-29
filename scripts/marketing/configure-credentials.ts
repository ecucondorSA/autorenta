#!/usr/bin/env bun
/**
 * Configure Meta Credentials in Supabase Secrets
 * Obtenido automáticamente del navegador
 */

const FACEBOOK_PAGE_ID = "61586558399370"; // Obtenido de https://www.facebook.com/profile.php?id=61586558399370

// Access tokens obtenidos de Meta Developers Tools
const FACEBOOK_ACCESS_TOKEN =
  "EAAZCCHhGG9w4BQr6xFBNPJA775DcBdoC1GdYdc4cgs362Se09Gvbu8N11it8tGlvZAB4YXvubxyVCiksBaJF91Mw2pEIKkttxZCQVYpYfvoPx17PlShVycmbbUB3r8sR9ZAAUw53jjRtYGZAPBfTYT65x9c2db6K6NUqPwzx4f0VJhV91UzCIEkTWc4QZDzD";

// Para Instagram, usamos el mismo access token
const INSTAGRAM_ACCESS_TOKEN = FACEBOOK_ACCESS_TOKEN;

// Instagram Business ID - necesita ser obtenido manualmente
// Por ahora usamos un placeholder
const INSTAGRAM_BUSINESS_ID = "17841400000000000"; // Placeholder - cambiar con ID real

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
  section("📱 CONFIGURAR CREDENCIALES META - SUPABASE");

  log("\n✅ Credenciales Obtenidas:\n", "green");
  log(`  FACEBOOK_PAGE_ID: ${FACEBOOK_PAGE_ID}`, "blue");
  log(`  FACEBOOK_ACCESS_TOKEN: ${FACEBOOK_ACCESS_TOKEN.substring(0, 30)}...`, "blue");
  log(`  INSTAGRAM_ACCESS_TOKEN: ${INSTAGRAM_ACCESS_TOKEN.substring(0, 30)}...`, "blue");
  log(`  INSTAGRAM_BUSINESS_ID: ${INSTAGRAM_BUSINESS_ID}`, "yellow");

  section("🔧 COMANDOS PARA EJECUTAR");

  log("\nEjecuta estos comandos en tu terminal:\n", "cyan");

  log(`supabase secrets set FACEBOOK_ACCESS_TOKEN "${FACEBOOK_ACCESS_TOKEN}"`, "yellow");
  log(`supabase secrets set FACEBOOK_PAGE_ID "${FACEBOOK_PAGE_ID}"`, "yellow");
  log(`supabase secrets set INSTAGRAM_ACCESS_TOKEN "${INSTAGRAM_ACCESS_TOKEN}"`, "yellow");
  log(`supabase secrets set INSTAGRAM_BUSINESS_ID "${INSTAGRAM_BUSINESS_ID}"`, "yellow");

  section("📝 O COPIAR TODO A .env.local");

  log("\nCopiar esto a tu archivo .env.local:\n", "cyan");

  log(`FACEBOOK_ACCESS_TOKEN=${FACEBOOK_ACCESS_TOKEN}`, "yellow");
  log(`FACEBOOK_PAGE_ID=${FACEBOOK_PAGE_ID}`, "yellow");
  log(`INSTAGRAM_ACCESS_TOKEN=${INSTAGRAM_ACCESS_TOKEN}`, "yellow");
  log(`INSTAGRAM_BUSINESS_ID=${INSTAGRAM_BUSINESS_ID}`, "yellow");

  section("✅ PRÓXIMO PASO");

  log("\nUna vez configuradas las credenciales, ejecuta:\n", "green");
  log("  bun scripts/test-social-publishing.ts\n", "bold");

  log("Esto publicará un post de prueba en Facebook e Instagram.", "cyan");
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
