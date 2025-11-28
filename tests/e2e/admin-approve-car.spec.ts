import { test, expect } from '@playwright/test';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';

const supabaseUrl =
  process.env.NG_APP_SUPABASE_URL || process.env.SUPABASE_URL || process.env.PLAYWRIGHT_SUPABASE_URL;
const supabaseServiceRole =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE ||
  process.env.SUPABASE_SERVICE_KEY;

const hasEnvVars = !!(supabaseUrl && supabaseServiceRole);

// Solo crear cliente si tenemos las variables
let supabase: SupabaseClient | null = null;
if (hasEnvVars) {
  supabase = createClient(supabaseUrl!, supabaseServiceRole!);
}
const OWNER_ID = 'e2e-owner--0000-0000-000000000002';

async function ensurePendingCar(): Promise<{ id: string; plate: string }> {
  if (!supabase) throw new Error('Supabase client not initialized');
  const plate = `PEND${randomUUID().slice(0, 6).toUpperCase()}`;
  const id = `e2e-car-pending-${randomUUID().replace(/-/g, '').slice(0, 12)}`;
  const insert = await supabase.from('cars').insert({
    id,
    user_id: OWNER_ID,
    brand: 'Ford',
    model: 'Focus',
    year: 2021,
    plate,
    category: 'economy',
    price_per_day: 12000,
    city: 'Buenos Aires',
    address: 'Av. Rivadavia 444',
    latitude: -34.6092,
    longitude: -58.3842,
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (insert.error) throw insert.error;
  return { id, plate };
}

test.use({ storageState: 'tests/.auth/admin.json' });

// Skip si no hay env vars
test.skip(!hasEnvVars, 'Requires SUPABASE_SERVICE_ROLE_KEY');

test.describe('P0 - Aprobación de auto (admin)', () => {
  test('debería aprobar un auto pendiente y reflejar estado activo en BD', async ({ page }) => {
    const pendingCar = await ensurePendingCar();
    const adminPage = new AdminDashboardPage(page);

    await adminPage.goto();
    await adminPage.waitForStatsLoad();

    const pendingCount = await adminPage.getPendingCarsCount();
    expect(pendingCount).toBeGreaterThan(0);

    await adminPage.approveFirstCar();

    const { data, error } = await supabase
      .from('cars')
      .select('status')
      .eq('id', pendingCar.id)
      .single();

    expect(error).toBeNull();
    expect(data?.status).toBe('active');
  });
});
