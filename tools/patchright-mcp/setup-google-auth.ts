#!/usr/bin/env bun
/**
 * Script para configurar Google Sign-In para Android
 * Abre Chrome con perfil persistente y guía paso a paso
 */
import { chromium } from 'patchright';

const PROFILE_DIR = '/home/edu/.patchright-profile';

async function main() {
  console.log('🚀 Iniciando navegador con perfil persistente...\n');

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    channel: 'chrome',
    viewport: { width: 1400, height: 900 },
    args: ['--start-maximized'],
  });

  const page = context.pages()[0] || await context.newPage();

  // Paso 1: Google Play Console para obtener SHA-1
  console.log('📱 PASO 1: Obtener SHA-1 de Google Play Console\n');
  await page.goto('https://play.google.com/console/developers', { waitUntil: 'domcontentloaded' });

  await waitForUser(`
╔══════════════════════════════════════════════════════════════════╗
║  PASO 1: Obtener SHA-1 de Google Play Console                   ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  1. Si no estás logueado, inicia sesión con tu cuenta Google    ║
║  2. Selecciona la app "Autorentar"                              ║
║  3. Ve a: Release → Setup → App signing                         ║
║     (o Publicación → Configuración → Firma de la app)           ║
║  4. Busca "Upload key certificate"                              ║
║  5. Copia el SHA-1 certificate fingerprint                      ║
║                                                                  ║
║  Presiona ENTER cuando tengas el SHA-1 copiado...               ║
╚══════════════════════════════════════════════════════════════════╝
`);

  // Paso 2: Firebase Console para agregar SHA-1
  console.log('\n🔥 PASO 2: Agregar SHA-1 en Firebase Console\n');
  await page.goto('https://console.firebase.google.com/project/autorentar-e7254/settings/general', { waitUntil: 'domcontentloaded' });

  await waitForUser(`
╔══════════════════════════════════════════════════════════════════╗
║  PASO 2: Agregar SHA-1 en Firebase Console                      ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  1. Baja hasta ver tu app Android (app.autorentar)              ║
║  2. Click en "Add fingerprint"                                  ║
║  3. Pega el SHA-1 que copiaste                                  ║
║  4. Click "Save"                                                ║
║                                                                  ║
║  Presiona ENTER cuando hayas guardado el SHA-1...               ║
╚══════════════════════════════════════════════════════════════════╝
`);

  // Paso 3: Habilitar Google Sign-In en Firebase Auth
  console.log('\n🔐 PASO 3: Habilitar Google Sign-In en Firebase Auth\n');
  await page.goto('https://console.firebase.google.com/project/autorentar-e7254/authentication/providers', { waitUntil: 'domcontentloaded' });

  await waitForUser(`
╔══════════════════════════════════════════════════════════════════╗
║  PASO 3: Habilitar Google Sign-In                               ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  1. Busca "Google" en la lista de proveedores                   ║
║  2. Click en Google → Enable                                    ║
║  3. Configura el nombre del proyecto y email de soporte         ║
║  4. Click "Save"                                                ║
║                                                                  ║
║  Presiona ENTER cuando Google esté habilitado...                ║
╚══════════════════════════════════════════════════════════════════╝
`);

  // Paso 4: Crear Web Client ID en Google Cloud Console
  console.log('\n☁️  PASO 4: Crear Web Client ID para Supabase\n');
  await page.goto('https://console.cloud.google.com/apis/credentials?project=autorentar-e7254', { waitUntil: 'domcontentloaded' });

  await waitForUser(`
╔══════════════════════════════════════════════════════════════════╗
║  PASO 4: Crear Web Client ID                                    ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  1. Click "Create Credentials" → "OAuth client ID"              ║
║  2. Tipo: "Web application"                                     ║
║  3. Nombre: "AutoRenta Web"                                     ║
║  4. Authorized JavaScript origins:                              ║
║     - https://autorentar.com                                    ║
║     - http://localhost:4200                                     ║
║  5. Authorized redirect URIs:                                   ║
║     - https://pisqjmoklivzpwufhscx.supabase.co/auth/v1/callback ║
║  6. Click "Create"                                              ║
║  7. COPIA el Client ID y Client Secret                          ║
║                                                                  ║
║  Presiona ENTER cuando tengas el Client ID y Secret...          ║
╚══════════════════════════════════════════════════════════════════╝
`);

  // Paso 5: Configurar Supabase
  console.log('\n💾 PASO 5: Configurar Google en Supabase\n');
  await page.goto('https://supabase.com/dashboard/project/pisqjmoklivzpwufhscx/auth/providers', { waitUntil: 'domcontentloaded' });

  await waitForUser(`
╔══════════════════════════════════════════════════════════════════╗
║  PASO 5: Configurar Google en Supabase                          ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  1. Busca "Google" en la lista de proveedores                   ║
║  2. Activa el toggle "Enable Google"                            ║
║  3. Pega el Client ID del paso anterior                         ║
║  4. Pega el Client Secret del paso anterior                     ║
║  5. Click "Save"                                                ║
║                                                                  ║
║  Presiona ENTER cuando hayas guardado en Supabase...            ║
╚══════════════════════════════════════════════════════════════════╝
`);

  // Paso 6: Descargar nuevo google-services.json
  console.log('\n📥 PASO 6: Descargar nuevo google-services.json\n');
  await page.goto('https://console.firebase.google.com/project/autorentar-e7254/settings/general', { waitUntil: 'domcontentloaded' });

  await waitForUser(`
╔══════════════════════════════════════════════════════════════════╗
║  PASO 6: Descargar nuevo google-services.json                   ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  1. Baja hasta ver tu app Android (app.autorentar)              ║
║  2. Click en el botón de descarga (google-services.json)        ║
║  3. Guárdalo en:                                                 ║
║     /home/edu/autorenta/apps/web/android/app/google-services.json║
║                                                                  ║
║  Presiona ENTER cuando hayas descargado el archivo...           ║
╚══════════════════════════════════════════════════════════════════╝
`);

  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║  ✅ CONFIGURACIÓN COMPLETADA                                    ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  Ahora necesitas:                                                ║
║                                                                  ║
║  1. Decirme el nuevo Web Client ID que creaste                  ║
║     (para actualizar environment.ts)                            ║
║                                                                  ║
║  2. Reconstruir la app Android:                                 ║
║     pnpm build:web && cd apps/web && pnpm exec cap sync android ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
`);

  await context.close();
}

async function waitForUser(message: string): Promise<void> {
  console.log(message);
  process.stdout.write('> ');

  for await (const line of console) {
    break; // Any input continues
  }
}

main().catch(console.error);
