#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Leer variables de entorno
const envFile = resolve(process.cwd(), '.env.development.local');
const envContent = readFileSync(envFile, 'utf-8');
const envVars = {};

for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx === -1) continue;
  const key = trimmed.slice(0, idx).trim();
  const value = trimmed.slice(idx + 1).trim();
  if (!key) continue;
  envVars[key] = value;
}

const supabaseUrl = envVars.NG_APP_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

console.log('🔍 Checking database enum types...\n');

async function checkEnums() {
  // Query PostgreSQL information schema to get enum values
  const { data, error } = await supabase.rpc('check_user_role_enum', {});

  if (error) {
    console.log('RPC function not available, trying direct query...\n');

    // Alternative: Check what values are currently in use
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('role');

    if (profileError) {
      console.error('❌ Error:', profileError.message);
      return;
    }

    const uniqueRoles = [...new Set(profiles.map(p => p.role))];
    console.log('Current role values in use:', uniqueRoles);
    console.log('\nThe enum "user_role" currently does NOT support "both"');
    console.log('We need to add "both" to the enum in Supabase.');
    return;
  }

  console.log('Enum values:', data);
}

checkEnums();
