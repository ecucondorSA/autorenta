
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

async function seedBookings() {
  console.log(`🌱 Seeding bookings to: ${supabaseUrl}`);

  // 1. Get Users
  // 1. Get Users (via SignIn because listUsers is failing)
  let renterId: string;
  let ownerId: string;

  try {
    const { data: renterData, error: renterError } = await supabase.auth.signInWithPassword({
      email: 'renter.final@autorenta.com',
      password: 'Password123!'
    });
    if (renterError || !renterData.user) {
      console.error('❌ Could not sign in as renter:', renterError?.message);
      return;
    }
    renterId = renterData.user.id;
    console.log(`✅ Found Renter ID: ${renterId}`);

    const { data: ownerData, error: ownerError } = await supabase.auth.signInWithPassword({
      email: 'owner.test@autorenta.com',
      password: 'TestOwner123!'
    });
    if (ownerError || !ownerData.user) {
      // Try env var password if default fails
      const envPass = process.env.TEST_OWNER_PASSWORD || 'TestOwner123!';
      const { data: ownerRetry, error: ownerRetryError } = await supabase.auth.signInWithPassword({
        email: 'owner.test@autorenta.com',
        password: envPass
      });
      if (ownerRetryError || !ownerRetry.user) {
        console.error('❌ Could not sign in as owner:', ownerError?.message);
        return;
      }
      ownerId = ownerRetry.user.id;
    } else {
      ownerId = ownerData.user.id;
    }
    console.log(`✅ Found Owner ID: ${ownerId}`);

  } catch (err) {
    console.error('❌ Error getting users:', err);
    return;
  }

  // 2. Get a Car (Owner's car)
  const { data: cars, error: carsError } = await supabase
    .from('cars')
    .select('id, brand, model')
    .eq('owner_id', ownerId)
    .limit(1);

  let carId: string;

  if (carsError || !cars || cars.length === 0) {
    console.log('⚠️ No car found for owner. Creating one...');
    const { data: newCar, error: createCarError } = await supabase
      .from('cars')
      .insert({
        owner_id: ownerId,
        title: 'Toyota Corolla Hybrid 2024',
        city: 'Buenos Aires',
        province: 'Buenos Aires',
        country: 'Argentina',
        brand: 'Toyota',
        model: 'Corolla Hybrid',
        year: 2024,
        price_per_day: 55, // USD
        status: 'active',
        location_city: 'Buenos Aires',
        location_state: 'BSAS',
        transmission: 'Automático',
        features: { bluetooth: true, air_conditioning: true, gps: true }
      })
      .select()
      .single();

    if (createCarError) {
      console.error('❌ Error creating car:', createCarError);
      return;
    }
    carId = newCar.id;
    console.log(`✅ Created Car: ${carId}`);
  } else {
    carId = cars[0].id;
    console.log(`✅ Using Car: ${carId} (${cars[0].brand} ${cars[0].model})`);
  }

  // 3. Create Bookings in different states
  const bookingsToCreate = [
    {
      label: 'PENDING PAYMENT (Test Payment Page)',
      data: {
        car_id: carId,
        renter_id: renterId,
        start_at: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        end_at: new Date(Date.now() + 86400000 * 4).toISOString(), // 3 days later
        status: 'pending_payment',
        total_amount: 165,
        currency: 'USD',
        payment_mode: null // Not selected yet
      }
    },
    {
      label: 'PENDING APPROVAL (Test Owner Logic)',
      data: {
        car_id: carId,
        renter_id: renterId,
        start_at: new Date(Date.now() + 86400000 * 5).toISOString(),
        end_at: new Date(Date.now() + 86400000 * 8).toISOString(),
        status: 'pending',
        total_amount: 165,
        currency: 'ARS', // Legacy/MercadoPago
        payment_mode: 'card',
        guarantee_type: 'hold',
        guarantee_amount_cents: 60000
      }
    },
    {
      label: 'IN PROGRESS (Test Check-in/Dashboard)',
      data: {
        car_id: carId,
        renter_id: renterId,
        start_at: new Date(Date.now() - 86400000).toISOString(), // Started yesterday
        end_at: new Date(Date.now() + 86400000 * 2).toISOString(), // Ends in 2 days
        status: 'in_progress',
        total_amount: 165,
        currency: 'USD',
        payment_mode: 'wallet',
        guarantee_type: 'security_credit',
        guarantee_amount_cents: 60000,
        owner_confirmed_delivery: true,
        renter_confirmed_payment: true // Paid
      }
    }
  ];

  // Re-initialize admin client for inserts (to bypass RLS/Auth state from previous sign-ins)
  const adminClient = createClient(supabaseUrl, serviceRoleKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('\n🚀 Creating Bookings...');

  for (const item of bookingsToCreate) {
    const { data: booking, error: insertError } = await adminClient
      .from('bookings')
      .insert(item.data)
      .select()
      .single();

    if (insertError) {
      console.error(`❌ Error creating ${item.label}:`, insertError.message);
    } else {
      console.log(`\n✅ [${item.label}] Created!`);
      console.log(`   ID: ${booking.id}`);
      console.log(`   Link: http://localhost:4200/bookings/${booking.id}/detail-payment`);
    }
  }

  console.log('\n🏁 Seeding Bookings completed.');
}

seedBookings().catch(console.error);
