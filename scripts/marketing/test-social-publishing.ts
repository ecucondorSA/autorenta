#!/usr/bin/env bun
/**
 * Test Script for Social Media Publishing
 * Verifica que edge functions y servicios logren publicar en Facebook/Instagram/LinkedIn
 */

import { createClient } from "@supabase/supabase-js";

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const SUPABASE_URL = process.env.NG_APP_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NG_APP_SUPABASE_ANON_KEY || "";
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN || "";
const FACEBOOK_PAGE_ID = process.env.FACEBOOK_PAGE_ID || "";
const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN || "";
const INSTAGRAM_BUSINESS_ID = process.env.INSTAGRAM_BUSINESS_ID || "";

const API_VERSION = "v20.0";
const TEST_IMAGE_URL =
  "https://images.unsplash.com/photo-1611332833111-511afe458d58?w=500&h=500&fit=crop";

// ============================================================================
// COLORES PARA OUTPUT
// ============================================================================

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(message: string, color: keyof typeof colors = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// ============================================================================
// TEST 1: VALIDAR CREDENCIALES
// ============================================================================

async function testCredentials() {
  log("\n🔐 TEST 1: VALIDANDO CREDENCIALES", "cyan");
  log("=".repeat(50), "cyan");

  const checks = [
    {
      name: "SUPABASE_URL",
      value: SUPABASE_URL,
    },
    {
      name: "SUPABASE_SERVICE_ROLE_KEY",
      value: SUPABASE_SERVICE_ROLE ? "✓" : "✗",
    },
    {
      name: "FACEBOOK_ACCESS_TOKEN",
      value: FACEBOOK_ACCESS_TOKEN ? "✓" : "✗",
    },
    {
      name: "FACEBOOK_PAGE_ID",
      value: FACEBOOK_PAGE_ID,
    },
    {
      name: "INSTAGRAM_ACCESS_TOKEN",
      value: INSTAGRAM_ACCESS_TOKEN ? "✓" : "✗",
    },
    {
      name: "INSTAGRAM_BUSINESS_ID",
      value: INSTAGRAM_BUSINESS_ID,
    },
  ];

  let allValid = true;
  for (const check of checks) {
    const status = check.value ? "✓" : "✗";
    const statusColor = check.value ? "green" : "red";
    log(`  ${status} ${check.name}: ${check.value}`, statusColor);
    if (!check.value) allValid = false;
  }

  return allValid;
}

// ============================================================================
// TEST 2: VALIDAR FACEBOOK TOKEN
// ============================================================================

async function testFacebookToken() {
  log("\n📘 TEST 2: VALIDANDO TOKEN DE FACEBOOK", "cyan");
  log("=".repeat(50), "cyan");

  try {
    const response = await fetch(
      `https://graph.facebook.com/${API_VERSION}/me?access_token=${FACEBOOK_ACCESS_TOKEN}`
    );

    if (!response.ok) {
      log(`  ✗ Error: ${response.statusText}`, "red");
      return false;
    }

    const data = await response.json();
    log(`  ✓ Token válido para: ${data.name}`, "green");
    log(`  ✓ Page ID: ${FACEBOOK_PAGE_ID}`, "green");
    return true;
  } catch (error) {
    log(`  ✗ Error: ${error}`, "red");
    return false;
  }
}

// ============================================================================
// TEST 3: VALIDAR INSTAGRAM CREDENTIALS
// ============================================================================

async function testInstagramCredentials() {
  log("\n📷 TEST 3: VALIDANDO INSTAGRAM BUSINESS ACCOUNT", "cyan");
  log("=".repeat(50), "cyan");

  try {
    const response = await fetch(
      `https://graph.instagram.com/${API_VERSION}/${INSTAGRAM_BUSINESS_ID}?access_token=${INSTAGRAM_ACCESS_TOKEN}`
    );

    if (!response.ok) {
      log(`  ✗ Error: ${response.statusText}`, "red");
      return false;
    }

    const data = await response.json();
    log(`  ✓ Instagram Business Account válido`, "green");
    log(`  ✓ ID: ${data.id}`, "green");
    return true;
  } catch (error) {
    log(`  ✗ Error: ${error}`, "red");
    return false;
  }
}

// ============================================================================
// TEST 4: LLAMAR EDGE FUNCTION
// ============================================================================

async function testEdgeFunction() {
  log("\n🚀 TEST 4: INVOCANDO EDGE FUNCTION (publish-to-social-media)", "cyan");
  log("=".repeat(50), "cyan");

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const payload = {
      campaignId: `test-${Date.now()}`,
      title: "🧪 Test Campaign",
      description:
        "This is a test campaign to verify social publishing endpoints are working correctly.",
      imageUrl: TEST_IMAGE_URL,
      ctaText: "Learn More",
      ctaUrl: "https://autorenta.test",
      platforms: ["facebook", "instagram"],
    };

    log(`  Payload:`, "blue");
    log(`    - Campaign ID: ${payload.campaignId}`, "blue");
    log(`    - Title: ${payload.title}`, "blue");
    log(`    - Platforms: ${payload.platforms.join(", ")}`, "blue");

    const { data, error } = await supabase.functions.invoke(
      "publish-to-social-media",
      {
        body: payload,
      }
    );

    if (error) {
      log(`  ✗ Edge Function error: ${error.message}`, "red");
      return false;
    }

    log(`  ✓ Edge Function executed successfully`, "green");
    log(`  Response:`, "blue");
    log(`    ${JSON.stringify(data, null, 2)}`, "blue");

    // Verificar resultados
    if (data.results) {
      for (const result of data.results) {
        const status = result.success ? "✓" : "✗";
        const statusColor = result.success ? "green" : "red";
        log(
          `    ${status} ${result.platform}: ${result.success ? "Published" : result.error}`,
          statusColor
        );
        if (result.postUrl) {
          log(`      URL: ${result.postUrl}`, "blue");
        }
      }
    }

    return true;
  } catch (error) {
    log(`  ✗ Error: ${error}`, "red");
    return false;
  }
}

// ============================================================================
// TEST 5: VERIFICAR PUBLICACIONES EN BD
// ============================================================================

async function testPublishingLog() {
  log("\n📊 TEST 5: VERIFICANDO LOGS DE PUBLICACIÓN", "cyan");
  log("=".repeat(50), "cyan");

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

    const { data, error } = await supabase
      .from("social_publishing_log")
      .select("*")
      .order("attempted_at", { ascending: false })
      .limit(5);

    if (error) {
      log(`  ✗ Error querying logs: ${error.message}`, "red");
      return false;
    }

    log(`  ✓ Found ${data?.length || 0} recent publishing logs`, "green");

    if (data && data.length > 0) {
      log(`  Recent publications:`, "blue");
      for (const log_entry of data.slice(0, 3)) {
        const statusColor =
          log_entry.status === "success" ? "green" : "red";
        log(
          `    - ${log_entry.platform}: ${log_entry.status}`,
          statusColor
        );
        if (log_entry.post_url) {
          log(`      ${log_entry.post_url}`, "blue");
        }
      }
    }

    return true;
  } catch (error) {
    log(`  ✗ Error: ${error}`, "red");
    return false;
  }
}

// ============================================================================
// TEST 6: PROBAR FACEBOOK DIRECTO
// ============================================================================

async function testFacebookDirectPublish() {
  log("\n🔗 TEST 6: PUBLICAR EN FACEBOOK (DIRECTO)", "cyan");
  log("=".repeat(50), "cyan");

  try {
    const body = new URLSearchParams({
      message: `🧪 Test post - ${new Date().toISOString()}`,
      picture: TEST_IMAGE_URL,
      access_token: FACEBOOK_ACCESS_TOKEN,
    });

    const response = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${FACEBOOK_PAGE_ID}/feed`,
      {
        method: "POST",
        body: body,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      log(`  ✗ Facebook API error: ${errorText}`, "red");
      return false;
    }

    const data = await response.json();
    const postUrl = `https://www.facebook.com/${FACEBOOK_PAGE_ID}/posts/${data.id}`;

    log(`  ✓ Post published successfully!`, "green");
    log(`  ✓ Post URL: ${postUrl}`, "green");

    return true;
  } catch (error) {
    log(`  ✗ Error: ${error}`, "red");
    return false;
  }
}

// ============================================================================
// TEST 7: PROBAR INSTAGRAM DIRECTO
// ============================================================================

async function testInstagramDirectPublish() {
  log("\n🎥 TEST 7: PUBLICAR EN INSTAGRAM (DIRECTO)", "cyan");
  log("=".repeat(50), "cyan");

  try {
    // Step 1: Create container
    log(`  Paso 1: Creando container de media...`, "blue");
    const containerBody = new URLSearchParams({
      image_url: TEST_IMAGE_URL,
      caption: `🧪 Test post - ${new Date().toISOString()}`,
      access_token: INSTAGRAM_ACCESS_TOKEN,
    });

    const containerResponse = await fetch(
      `https://graph.instagram.com/${API_VERSION}/${INSTAGRAM_BUSINESS_ID}/media`,
      {
        method: "POST",
        body: containerBody,
      }
    );

    if (!containerResponse.ok) {
      const errorText = await containerResponse.text();
      log(`  ✗ Error creating container: ${errorText}`, "red");
      return false;
    }

    const containerData = await containerResponse.json();
    log(`  ✓ Container creado: ${containerData.id}`, "green");

    // Step 2: Publish container
    log(`  Paso 2: Publicando container...`, "blue");
    const publishBody = new URLSearchParams({
      creation_id: containerData.id,
      access_token: INSTAGRAM_ACCESS_TOKEN,
    });

    const publishResponse = await fetch(
      `https://graph.instagram.com/${API_VERSION}/${INSTAGRAM_BUSINESS_ID}/media_publish`,
      {
        method: "POST",
        body: publishBody,
      }
    );

    if (!publishResponse.ok) {
      const errorText = await publishResponse.text();
      log(`  ✗ Error publishing: ${errorText}`, "red");
      return false;
    }

    const publishData = await publishResponse.json();
    const postUrl = `https://www.instagram.com/p/${publishData.id}`;

    log(`  ✓ Post published successfully!`, "green");
    log(`  ✓ Post URL: ${postUrl}`, "green");

    return true;
  } catch (error) {
    log(`  ✗ Error: ${error}`, "red");
    return false;
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  log("\n", "cyan");
  log("╔" + "=".repeat(48) + "╗", "cyan");
  log("║  🧪 SOCIAL MEDIA PUBLISHING TEST SUITE        ║", "cyan");
  log("╚" + "=".repeat(48) + "╝", "cyan");

  const results: Record<string, boolean> = {};

  // Test 1: Validar credenciales
  results["Credenciales"] = await testCredentials();

  // Test 2: Token de Facebook
  results["Facebook Token"] = await testFacebookToken();

  // Test 3: Instagram Credentials
  results["Instagram Credentials"] = await testInstagramCredentials();

  // Test 4: Edge Function
  results["Edge Function"] = await testEdgeFunction();

  // Test 5: Publishing Log
  results["Publishing Log"] = await testPublishingLog();

  // Test 6: Facebook Direct
  if (results["Facebook Token"]) {
    results["Facebook Direct Publish"] = await testFacebookDirectPublish();
  }

  // Test 7: Instagram Direct
  if (results["Instagram Credentials"]) {
    results["Instagram Direct Publish"] = await testInstagramDirectPublish();
  }

  // ========================================================================
  // RESUMEN
  // ========================================================================

  log("\n", "cyan");
  log("╔" + "=".repeat(48) + "╗", "cyan");
  log("║  📋 TEST RESULTS SUMMARY                      ║", "cyan");
  log("╚" + "=".repeat(48) + "╝", "cyan");

  let totalTests = 0;
  let passedTests = 0;

  for (const [testName, passed] of Object.entries(results)) {
    totalTests++;
    if (passed) {
      passedTests++;
      log(`  ✓ ${testName}`, "green");
    } else {
      log(`  ✗ ${testName}`, "red");
    }
  }

  log("\n", "cyan");
  const percentage = ((passedTests / totalTests) * 100).toFixed(1);
  const color =
    passedTests === totalTests ? "green" : passedTests > 0 ? "yellow" : "red";
  log(
    `  ${passedTests}/${totalTests} tests passed (${percentage}%)`,
    color
  );

  log("\n", "cyan");
  if (passedTests === totalTests) {
    log("  ✅ ALL TESTS PASSED! Social publishing is working correctly.", "green");
  } else if (passedTests > 0) {
    log(
      "  ⚠️  SOME TESTS FAILED. Check the errors above.",
      "yellow"
    );
  } else {
    log(
      "  ❌ ALL TESTS FAILED. Check your configuration.",
      "red"
    );
  }

  log("\n", "cyan");
}

// ============================================================================
// EJECUTAR
// ============================================================================

await runAllTests();
