#!/usr/bin/env node
/**
 * Genera storageState para Playwright sin abrir el navegador.
 * Usa Supabase Auth para obtener el session token y lo guarda en tests/.auth/{role}.json
 *
 * Uso:
 *   node scripts/gen-auth-state.mjs renter
 *   node scripts/gen-auth-state.mjs owner
 *   node scripts/gen-auth-state.mjs admin
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Cargar variables de entorno (.env.test > .env)
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });
dotenv.config();

const [, , role] = process.argv;

if (!role || !['renter', 'owner', 'admin'].includes(role)) {
  console.error('Usage: node scripts/gen-auth-state.mjs <renter|owner|admin>');
  process.exit(1);
}

const supabaseUrl =
  process.env.NG_APP_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  process.env.PLAYWRIGHT_SUPABASE_URL;
const supabaseAnonKey =
  process.env.NG_APP_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.PLAYWRIGHT_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Faltan variables de entorno: NG_APP_SUPABASE_URL/ANON o SUPABASE_URL/ANON_KEY'
  );
  process.exit(1);
}

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ||
  process.env.E2E_WEB_URL ||
  process.env.WEB_URL ||
  'http://127.0.0.1:4200';

const credentials = {
  renter: {
    email: process.env.TEST_RENTER_EMAIL || 'renter.test@autorenta.com',
    password: process.env.TEST_RENTER_PASSWORD || 'TestRenter123!',
  },
  owner: {
    email: process.env.TEST_OWNER_EMAIL || 'owner.test@autorenta.com',
    password: process.env.TEST_OWNER_PASSWORD || 'TestOwner123!',
  },
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'admin.test@autorenta.com',
    password: process.env.TEST_ADMIN_PASSWORD || 'TestAdmin123!',
  },
}[role];

const client = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log(`▶️ Generando storageState para ${role} usando ${credentials.email}`);
  const { data, error } = await client.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });

  if (error || !data.session) {
    console.error('❌ Login falló:', error?.message || 'sin sesión');
    process.exit(1);
  }

  const sessionJson = JSON.stringify(data.session);
  let projectRef = '';
  try {
    projectRef = new URL(supabaseUrl).hostname.split('.')[0];
  } catch (e) {
    console.warn('No se pudo derivar projectRef del Supabase URL', e);
  }

  const storageState = {
    cookies: [],
    origins: [
      {
        origin: baseURL,
        localStorage: [
          { name: 'supabase.auth.token', value: sessionJson },
          { name: `sb-${projectRef}-auth-token`, value: sessionJson },
        ],
      },
    ],
  };

  const outDir = path.resolve(process.cwd(), 'tests/.auth');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${role}.json`);
  fs.writeFileSync(outPath, JSON.stringify(storageState, null, 2));

  console.log(`✅ StorageState guardado en ${outPath}`);
}

main().catch((err) => {
  console.error('❌ Error generando storageState', err);
  process.exit(1);
});

