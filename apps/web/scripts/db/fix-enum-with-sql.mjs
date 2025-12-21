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

console.log('🔧 Fixing user_role enum to include "both"...\n');

async function fixEnum() {
  console.log('Step 1: Creating new enum type with all values...');

  // Try to create new enum with all values
  const { data: step1, error: error1 } = await supabase.rpc('exec_sql', {
    query: `CREATE TYPE user_role_new AS ENUM ('owner', 'renter', 'both');`
  });

  if (error1) {
    console.log('   ⚠️  RPC exec_sql not available. Trying alternative approach...');
    console.log('   Error:', error1.message);

    // Try direct approach using Postgres functions
    console.log('\nAttempting to use ALTER TYPE directly via PostgREST...');

    // Since we can't execute arbitrary SQL via Supabase client, we need to use pg_temp schema trick
    // or create an RPC function first

    console.log('\n⚠️  Cannot execute SQL directly from Node.js client.');
    console.log('   The Supabase client does not support arbitrary SQL execution for security reasons.');
    console.log('\nCreating RPC function to do this...\n');

    // Try to create an RPC function
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION add_both_to_user_role()
      RETURNS void AS $$
      BEGIN
        -- Check if 'both' already exists
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum
          WHERE enumlabel = 'both'
          AND enumtypid = 'user_role'::regtype
        ) THEN
          ALTER TYPE user_role ADD VALUE 'both';
        END IF;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    console.log('SQL needed to create helper function:');
    console.log(createFunctionSQL);
    console.log('\nThen run: SELECT add_both_to_user_role();');

    return;
  }

  console.log('   ✓ New enum type created');

  console.log('\nStep 2: Updating profiles table to use new enum...');
  const { data: step2, error: error2 } = await supabase.rpc('exec_sql', {
    query: `ALTER TABLE profiles ALTER COLUMN role TYPE user_role_new USING role::text::user_role_new;`
  });

  if (error2) {
    console.error('   ❌ Error:', error2.message);
    return;
  }

  console.log('   ✓ Table updated');

  console.log('\nStep 3: Dropping old enum...');
  const { data: step3, error: error3 } = await supabase.rpc('exec_sql', {
    query: `DROP TYPE user_role;`
  });

  if (error3) {
    console.error('   ❌ Error:', error3.message);
    return;
  }

  console.log('   ✓ Old enum dropped');

  console.log('\nStep 4: Renaming new enum...');
  const { data: step4, error: error4 } = await supabase.rpc('exec_sql', {
    query: `ALTER TYPE user_role_new RENAME TO user_role;`
  });

  if (error4) {
    console.error('   ❌ Error:', error4.message);
    return;
  }

  console.log('   ✓ Enum renamed');

  console.log('\n✅ Success! The user_role enum now includes "both".');

  // Verify
  console.log('\nVerifying by testing an update...');
  const { data: profiles } = await supabase.from('profiles').select('id').limit(1);

  if (profiles && profiles.length > 0) {
    const { data: test, error: testError } = await supabase
      .from('profiles')
      .update({ role: 'both' })
      .eq('id', profiles[0].id)
      .select()
      .single();

    if (testError) {
      console.error('   ❌ Test failed:', testError.message);
    } else {
      console.log('   ✓ Test successful! Role updated to "both"');
      console.log('   Profile:', test);
    }
  }
}

fixEnum();
