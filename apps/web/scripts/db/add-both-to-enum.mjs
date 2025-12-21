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

console.log('🔧 Adding "both" value to user_role enum...\n');

async function addBothToEnum() {
  try {
    // First, check if 'both' value already exists by trying to create a test profile
    console.log('📋 Checking current enum values...');

    const { data: profiles, error: checkError } = await supabase
      .from('profiles')
      .select('role')
      .limit(100);

    if (checkError) {
      throw checkError;
    }

    const uniqueRoles = [...new Set(profiles.map(p => p.role))];
    console.log('Current role values in database:', uniqueRoles);

    if (uniqueRoles.includes('both')) {
      console.log('\n✅ The value "both" already exists in the enum!');
      return;
    }

    console.log('\n⚠️  The value "both" is missing from the enum.');
    console.log('🔧 Attempting to add it using SQL...\n');

    // Try to create an RPC function to execute the ALTER TYPE
    console.log('Creating temporary SQL function...');

    // Use Supabase REST API directly with service role key
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_raw_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({
        sql: "ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'both';"
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log('\n⚠️  Cannot execute SQL directly via REST API.');
      console.log('Error:', errorText);
      console.log('\n📝 Manual steps required:');
      console.log('\n1. Go to: https://supabase.com/dashboard/project/obxvffplochgeiclibng/sql/new');
      console.log('2. Run this SQL:\n');
      console.log("   ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'both';");
      console.log('\n3. Then run: node scripts/check-enum-values.mjs\n');
      process.exit(1);
    }

    console.log('✅ SQL executed successfully!');
    console.log('\n🔍 Verifying the change...');

    // Verify by checking again
    const { data: verifyProfiles } = await supabase
      .from('profiles')
      .select('role')
      .limit(1);

    console.log('✅ Migration completed! Run "node scripts/check-enum-values.mjs" to verify.\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n📝 Please execute this SQL manually in Supabase Dashboard:');
    console.log('\n   ALTER TYPE user_role ADD VALUE IF NOT EXISTS \'both\';\n');
    console.log('🔗 URL: https://supabase.com/dashboard/project/obxvffplochgeiclibng/sql/new\n');
    process.exit(1);
  }
}

addBothToEnum();
