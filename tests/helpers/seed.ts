import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import { generateTestCar } from './test-data';
import { seedTestData } from './api';

/**
 * Helper de seed para tests E2E.
 *
 * Flujo:
 * 1) Intenta un endpoint de seed (TEST_SEED_ENDPOINT) para mantener paridad con backend.
 * 2) Si no existe, usa Supabase (service role) para crear un owner con vehículos y bookings mínimos.
 * 3) Si tampoco hay credenciales, loguea y continúa sin romper el test (mejor que fallar por setup).
 */
export async function runOwnerSeed(): Promise<void> {
  const endpoint = process.env.TEST_SEED_ENDPOINT;

  if (endpoint) {
    try {
      const res = await fetch(endpoint, { method: 'POST' });
      if (!res.ok) throw new Error(`Seed failed: ${res.status} ${res.statusText}`);
      console.log('[tests/helpers/seed] Seed ejecutada vía endpoint');
      return;
    } catch (err) {
      console.warn('[tests/helpers/seed] Seed endpoint falló, usando fallback Supabase:', err);
    }
  }

  // Fallback: Supabase directo (idempotente)
  const supabaseUrl = process.env.NG_APP_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('[tests/helpers/seed] Sin TEST_SEED_ENDPOINT ni SUPABASE_SERVICE_ROLE_KEY; seed omitido');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const ownerEmail = 'owner.dashboard@example.com';
  const ownerPassword = 'TestOwnerDashboard123!';

  // 1) Crear usuario owner (idempotente)
  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email: ownerEmail,
    password: ownerPassword,
    email_confirm: true,
    user_metadata: { full_name: 'Owner Dashboard' },
  });

  if (userError && !userError.message.toLowerCase().includes('already')) {
    console.warn('[tests/helpers/seed] No se pudo crear owner:', userError.message);
  }

  const ownerId = userData?.user?.id;

  if (ownerId) {
    await supabase.from('profiles').upsert({
      id: ownerId,
      email: ownerEmail,
      full_name: 'Owner Dashboard',
      role: 'locador',
    });

    const car = generateTestCar('economy');
    await supabase.from('cars').upsert({
      owner_id: ownerId,
      title: `${car.brand} ${car.model}`,
      brand: car.brand,
      model: car.model,
      year: car.year,
      plate: car.plate,
      status: 'active',
      daily_price: car.pricePerDay,
      city: car.city,
      address: car.address,
      features: car.features,
    });

    // Booking placeholder (opcional, idempotente)
    await supabase.from('bookings').upsert({
      id: 'owner-dashboard-b1',
      car_id: (await supabase.from('cars').select('id').eq('owner_id', ownerId).limit(1)).data?.[0]?.id,
      owner_id: ownerId,
      renter_id: 'renter-dashboard-placeholder',
      start_at: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
      end_at: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString(),
      status: 'confirmed',
      total_amount: 150000,
      currency: 'ARS',
    });
  }

  // Cargar wallet básica (best-effort)
  if (ownerId) {
    await supabase.from('user_wallets').upsert({
      user_id: ownerId,
      balance_cents: 1276000,
      available_balance_cents: 1276000,
      locked_balance_cents: 0,
      currency: 'ARS',
    });
  }

  // Reutilizar seedTestData para renter/owner genéricos (cart, checkout, etc.)
  await seedTestData({ owner: { email: ownerEmail, password: ownerPassword, fullName: 'Owner Dashboard', phone: '+549111111111', role: 'locador' } });

  console.log('[tests/helpers/seed] Seed Supabase completado');
}
