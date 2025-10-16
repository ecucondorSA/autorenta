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

console.log('🧪 Testing profile update with role="both"...\n');

async function testProfileUpdate() {
  // Get user profile
  const userEmail = 'ecucondor@gmail.com';

  console.log('1. Finding user profile...');
  const { data: profiles, error: findError } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);

  if (findError) {
    console.error('   ❌ Error finding profile:', findError.message);
    return;
  }

  if (!profiles || profiles.length === 0) {
    console.error('   ❌ No profiles found');
    return;
  }

  const profile = profiles[0];
  console.log('   ✓ Profile found:', profile);

  // Test update with role='both'
  console.log('\n2. Attempting to update role to "both"...');
  const { data: updated, error: updateError } = await supabase
    .from('profiles')
    .update({ role: 'both', full_name: 'EDUARDO MARQUES DA ROSA' })
    .eq('id', profile.id)
    .select()
    .single();

  if (updateError) {
    console.error('   ❌ Error updating profile:', updateError);
    console.error('   Error details:', JSON.stringify(updateError, null, 2));
    return;
  }

  console.log('   ✓ Profile updated successfully!');
  console.log('   Updated profile:', updated);

  // Verify update
  console.log('\n3. Verifying update...');
  const { data: verified, error: verifyError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', profile.id)
    .single();

  if (verifyError) {
    console.error('   ❌ Error verifying:', verifyError.message);
    return;
  }

  console.log('   ✓ Verified profile:', verified);
}

testProfileUpdate();
