
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { TEST_CREDENTIALS } from '../tests/fixtures/test-credentials';

// Load environment variables
dotenv.config({ path: '.env.test' });

const supabaseUrl = process.env.NG_APP_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing NG_APP_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.test');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function seedUsers() {
  console.log('🌱 Seeding test users...');

  const users = [
    TEST_CREDENTIALS.renter,
    TEST_CREDENTIALS.owner,
    TEST_CREDENTIALS.admin
  ];

  for (const user of users) {
    console.log(`Processing user: ${user.email} (${user.role})...`);

    // 1. Check if user exists
    const { data: existingUsers, error: searchError } = await supabase.auth.admin.listUsers();

    if (searchError) {
      console.error(`Error listing users: ${searchError.message}`);
      continue;
    }

    const existingUser = existingUsers.users.find(u => u.email === user.email);

    if (existingUser) {
      console.log(`  - User exists (ID: ${existingUser.id}). Deleting...`);
      const { error: deleteError } = await supabase.auth.admin.deleteUser(existingUser.id);
      if (deleteError) {
        console.error(`  ❌ Error deleting user: ${deleteError.message}`);
        continue;
      }
      console.log('  ✅ User deleted.');
    }

    // 2. Create user
    console.log(`  - Creating user...`);
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: {
        full_name: `Test ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}`,
        role: user.role // Note: This is metadata, actual role handling might depend on your app logic (e.g. public.users table triggers)
      }
    });

    if (createError) {
      console.error(`  ❌ Error creating user: ${createError.message}`);
    } else {
      console.log(`  ✅ User created successfully (ID: ${newUser.user.id})`);

      // 3. Upsert profile with correct role
      console.log(`  - Upserting profile for ${user.email}...`);
      // Map 'locador' to 'owner' and 'locatario' to 'renter' if needed, or use as is if DB expects specific values
      // Based on ProfileService, roles are 'renter', 'owner', 'both', 'admin'
      let dbRole = user.role;
      if (user.role === 'locador') dbRole = 'owner';
      if (user.role === 'locatario') dbRole = 'renter';

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: newUser.user.id,
          email: user.email,
          full_name: `Test ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}`,
          role: dbRole,
          country: 'AR'
        });

      if (profileError) {
        console.error(`  ❌ Error updating profile: ${profileError.message}`);
      } else {
        console.log(`  ✅ Profile updated with role: ${dbRole}`);
      }
    }
  }

  console.log('🏁 Seeding completed.');
}

seedUsers().catch(console.error);
