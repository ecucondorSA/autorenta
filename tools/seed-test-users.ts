
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.test
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

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

const TEST_CREDENTIALS: any = {
  renter: {
    email: 'renter.final@autorenta.com',
    password: 'Password123!',
    role: 'renter'
  },
  owner: {
    email: process.env.TEST_OWNER_EMAIL || 'owner.test@autorenta.com',
    password: process.env.TEST_OWNER_PASSWORD || 'TestOwner123!',
    role: 'owner'
  },
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'admin.test@autorenta.com',
    password: process.env.TEST_ADMIN_PASSWORD || 'TestAdmin123!',
    role: 'admin',
    isAdmin: true
  }
};

async function seedUsers() {
  console.log(`🌱 Seeding test users to: ${supabaseUrl}`);

  const users = [
    TEST_CREDENTIALS.renter,
    TEST_CREDENTIALS.owner,
    TEST_CREDENTIALS.admin
  ];

  for (const user of users) {
    console.log(`\nProcessing user: ${user.email} (${user.role})...`);

    // 1. Check if user exists
    const { data: existingUsers, error: searchError } = await supabase.auth.admin.listUsers();

    if (searchError) {
      console.error(`  ❌ Error listing users: ${searchError.message}`);
      if (searchError.message.includes('Database error finding users')) {
        console.log('  ⚠️ This is a known Supabase issue when listing users in a fresh project or one with auth schema cache issues. Attempting direct creation...');
      } else {
        continue;
      }
    }

    let existingUser = existingUsers?.users?.find((u: any) => u.email === user.email);
    let userId = existingUser?.id;

    if (existingUser) {
      console.log(`  - User exists (ID: ${existingUser.id}). Deleting to ensure clean state...`);
      const { error: deleteError } = await supabase.auth.admin.deleteUser(existingUser.id);
      if (deleteError) {
        console.error(`  ❌ Error deleting user: ${deleteError.message}`);
        console.log(`  - Proceeding with existing user...`);
      } else {
        console.log('  ✅ User deleted.');
        userId = undefined;
      }
    }

    // 2. Create user if needed
    if (!userId) {
      console.log(`  - Creating user...`);
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          full_name: `Test ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}`,
          role: user.role,
          is_admin: (user as any).isAdmin || false
        }
      });

      if (createError) {
        // Handle case where user already exists but listUsers failed to find it
        if (createError.message.includes('already exists')) {
          console.log('  ⚠️ User already exists despite listUsers failure. We will need to update but we don\'t have the ID. This is problematic with listUsers failing.');
          // Since we can't get the ID, we'll try to get it by signing in or skip
        } else {
          console.error(`  ❌ Error creating user: ${createError.message}`);
          continue;
        }
      } else {
        console.log(`  ✅ User created successfully (ID: ${newUser.user!.id})`);
        userId = newUser.user!.id;
      }
    }

    // 3. Upsert profile with correct role
    if (userId) {
      console.log(`  - Upserting profile for ${user.email}...`);

      // ⚠️ P0 FIX: Match DB Check Constraints
      // The database uses Spanish roles: locatario, locador, ambos, admin
      let dbRole = user.role;
      if (user.role === 'renter') dbRole = 'locatario';
      if (user.role === 'owner') dbRole = 'locador';
      if (user.role === 'both') dbRole = 'ambos';

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          full_name: `Test ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}`,
          role: dbRole,
          email: user.email,
          is_admin: (user as any).isAdmin || false,
          onboarding: 'complete' // Mark as complete for testing
        });

      if (profileError) {
        console.error(`  ❌ Error updating profile: ${profileError.message}`);
      } else {
        console.log(`  ✅ Profile updated with role: ${dbRole}`);
      }
    }
  }

  console.log('\n🏁 Seeding completed.');
}

seedUsers().catch(console.error);
