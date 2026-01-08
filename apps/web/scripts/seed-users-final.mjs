import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pisqjmoklivzpwufhscx.supabase.co';
const SERVICE_KEY = 'sb_secret_qRFh5RZGAEyJgVf9B4HwQQ_91fSDRoF';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const PASSWORD = 'Ab.12345';

const TEST_USERS = [
  {
    email: 'renter@autorenta.test',
    role: 'renter',
    full_name: 'Gene Renter',
    phone: '+5491111111111',
    balance: 5000000,
  },
  {
    email: 'owner@autorenta.test',
    role: 'owner',
    full_name: 'Oscar Owner',
    phone: '+5491122222222',
    balance: 10000000,
  },
  {
    email: 'admin@autorenta.test',
    role: 'admin',
    full_name: 'Admin User',
    phone: '+5491199999999',
    balance: 99999999,
  }
];

async function seedUsers() {
  console.log('🌱 Seeding Test Users (Password: Ab.12345)...\n');

  for (const u of TEST_USERS) {
    try {
      console.log(`Processing ${u.email}...`);
      let userId;

      // Check existing user
      const { data: listData } = await supabase.auth.admin.listUsers();
      const existingUser = listData?.users?.find(user => user.email === u.email);

      if (existingUser) {
        userId = existingUser.id;
        console.log('   ✅ User exists. Updating password...');
        const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
          password: PASSWORD,
          email_confirm: true,
          user_metadata: { full_name: u.full_name }
        });
        if (updateError) console.error('   ⚠️ Update warning:', updateError.message);
        else console.log('   ✅ Password updated to Ab.12345');
      } else {
        console.log('   Creating new user...');
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: u.email,
          password: PASSWORD,
          email_confirm: true,
          user_metadata: { full_name: u.full_name }
        });
        if (createError) {
          console.error('   ❌ Create failed:', createError.message);
          continue;
        }
        userId = newUser.user.id;
        console.log('   ✅ Created new user');
      }

      // Wait for trigger
      await new Promise(r => setTimeout(r, 500));

      // Update profile
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: userId,
        full_name: u.full_name,
        email: u.email,
        role: u.role,
        phone: u.phone,
        is_verified: true,
        kyc_status: 'verified',
        mercadopago_connected: true
      });
      if (profileError) console.error('   ❌ Profile:', profileError.message);
      else console.log('   ✅ Profile verified');

      // Fund wallet
      const { data: wallet } = await supabase.from('wallets').select('id').eq('user_id', userId).maybeSingle();
      if (wallet) {
        await supabase.from('wallets').update({ available_balance: u.balance }).eq('user_id', userId);
        console.log(`   ✅ Wallet funded: $${u.balance}`);
      }

      // Admin role
      if (u.role === 'admin') {
        await supabase.from('admin_users').upsert({ user_id: userId, role: 'super_admin' });
        console.log('   ✅ Super Admin granted');
      }

      // Owner car
      if (u.role === 'owner') {
        const { data: cars } = await supabase.from('cars').select('id').eq('owner_id', userId);
        if (!cars?.length) {
          await supabase.from('cars').insert({
            owner_id: userId,
            brand: 'Toyota',
            model: 'Corolla Hybrid',
            year: 2024,
            price_per_day: 4500000,
            location_city: 'Buenos Aires',
            plate_last_digits: 'AB123',
            status: 'active'
          });
          console.log('   ✅ Test car created');
        }
      }

      console.log('');
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}\n`);
    }
  }

  console.log('Done!');
}

seedUsers();
