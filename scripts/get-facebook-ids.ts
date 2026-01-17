#!/usr/bin/env bun
/**
 * Obtener IDs de Facebook e Instagram desde Graph API
 */

const USER_TOKEN = process.argv[2] || "";

if (!USER_TOKEN) {
  console.error("❌ Error: Proporciona el User Token como argumento");
  console.error("Uso: bun get-facebook-ids.ts <USER_TOKEN>");
  process.exit(1);
}

console.log("🔍 Obteniendo información de Facebook...\n");

try {
  // Obtener información del usuario y sus páginas
  const response = await fetch(
    `https://graph.facebook.com/v20.0/me/accounts?access_token=${USER_TOKEN}`
  );

  if (!response.ok) {
    const error = await response.json();
    console.error("❌ Error de Facebook API:", error);
    process.exit(1);
  }

  const data = await response.json();

  console.log("✅ Páginas encontradas:\n");

  if (data.data && data.data.length > 0) {
    for (const page of data.data) {
      console.log(`📄 Página: ${page.name}`);
      console.log(`   ID: ${page.id}`);
      console.log(`   Access Token: ${page.access_token.substring(0, 20)}...`);
      console.log("");
    }

    // Usar la primera página
    const mainPage = data.data[0];
    console.log(`\n✨ Página principal seleccionada: ${mainPage.name}`);
    console.log(`📌 FACEBOOK_PAGE_ID=${mainPage.id}`);
    console.log(`🔑 FACEBOOK_ACCESS_TOKEN=${mainPage.access_token}`);

    // Intentar obtener Instagram Business Account
    console.log("\n📷 Buscando Instagram Business Account...\n");

    const igResponse = await fetch(
      `https://graph.facebook.com/v20.0/${mainPage.id}/instagram_business_account?access_token=${mainPage.access_token}`
    );

    if (igResponse.ok) {
      const igData = await igResponse.json();
      if (igData.instagram_business_account) {
        console.log(`✅ Instagram Business Account encontrado`);
        console.log(
          `📌 INSTAGRAM_BUSINESS_ID=${igData.instagram_business_account.id}`
        );
        console.log(
          `🔑 INSTAGRAM_ACCESS_TOKEN=${mainPage.access_token}`
        );
      } else {
        console.log("⚠️  No se encontró Instagram Business Account vinculado");
      }
    } else {
      console.log(
        "⚠️  No se pudo obtener Instagram Business Account (puede no estar vinculado)"
      );
    }
  } else {
    console.error("❌ No se encontraron páginas para este usuario");
  }
} catch (error) {
  console.error("❌ Error:", error);
  process.exit(1);
}
