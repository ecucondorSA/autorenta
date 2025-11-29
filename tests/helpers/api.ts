import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import { generateTestCar, generateTestUser, TestUser } from './test-data';

/**
 * Helper centralizado para preparar/limpiar estado de backend de forma idempotente.
 *
 * Reglas:
 * - Siempre intenta primero un endpoint de seed/mantenimiento (TEST_API_URL o TEST_SEED_ENDPOINT).
 * - Si no existe, usa Supabase con la service role key para upserts directos.
 * - Nunca falla si falta configuración: degrada a no-op con logs visibles.
 */

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const getEnv = (key: string): string => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const env = (globalThis as any).process?.env;
    return env?.[key] || '';
  } catch {
    return '';
  }
};

const apiBaseUrl = getEnv('TEST_API_URL') || getEnv('API_BASE_URL') || '';
const seedEndpoint = getEnv('TEST_SEED_ENDPOINT');
const apiToken = getEnv('TEST_API_TOKEN');
const supabaseUrl = getEnv('NG_APP_SUPABASE_URL') || getEnv('SUPABASE_URL');
const supabaseServiceKey =
  getEnv('SUPABASE_SERVICE_ROLE_KEY') ||
  getEnv('SUPABASE_SERVICE_KEY') ||
  getEnv('NG_APP_SUPABASE_ANON_KEY');

const supabase: SupabaseClient | null =
  supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

const warn = (msg: string) => console.warn(`[tests/helpers/api] ${msg}`);
const info = (msg: string) => console.log(`[tests/helpers/api] ${msg}`);

async function apiRequest<T = unknown>(path: string, method: HttpMethod, body?: any): Promise<T> {
  if (!apiBaseUrl) {
    throw new Error('API_BASE_URL/TEST_API_URL no configurado');
  }

  const res = await fetch(`${apiBaseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(apiToken ? { Authorization: `Bearer ${apiToken}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${method} ${path} -> ${res.status} ${res.statusText}: ${text}`);
  }

  return (await res.json()) as T;
}

async function ensureUser(user: TestUser): Promise<string | null> {
  if (!supabase) {
    warn('Supabase no configurado; omitiendo ensureUser');
    return null;
  }

  // Crear usuario en auth (idempotente: si existe, seguimos)
  try {
    const { data } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: {
        full_name: user.fullName,
        phone: user.phone,
        role: user.role,
      },
    });

    if (data?.user?.id) {
      info(`Usuario creado/obtenido: ${user.email}`);
      // Perfil
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email: user.email,
        full_name: user.fullName,
        phone: user.phone,
        role: user.role,
      });
      return data.user.id;
    }
  } catch (err: any) {
    const message = err?.message || String(err);
    if (!message.toLowerCase().includes('already')) {
      warn(`No se pudo crear usuario ${user.email}: ${message}`);
    }
  }

  // Intentar recuperar ID existente (best-effort)
  try {
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 100 });
    if (error) throw error;
    const existing = data.users.find((u) => u.email?.toLowerCase() === user.email.toLowerCase());
    if (existing?.id) {
      return existing.id;
    }
  } catch (err) {
    warn(`No se pudo listar usuarios para ${user.email}: ${String(err)}`);
  }

  return null;
}

async function ensureCar(ownerId: string) {
  if (!supabase) return;
  const car = generateTestCar();
  await supabase.from('cars').upsert({
    owner_id: ownerId,
    brand: car.brand,
    model: car.model,
    year: car.year,
    plate: car.plate,
    status: 'active',
    title: `${car.brand} ${car.model}`,
    category: car.category,
    daily_price: car.pricePerDay,
    city: car.city,
    address: car.address,
    features: car.features,
  });
}

async function ensureWallet(userId: string, cents: number) {
  if (!supabase) return;
  await supabase.from('user_wallets').upsert({
    user_id: userId,
    balance_cents: cents,
    available_balance_cents: cents,
    locked_balance_cents: 0,
    currency: 'ARS',
  });
}

async function ensureBooking(
  renterId: string,
  ownerId: string,
  carId: string,
  options: { startDate?: string; endDate?: string; amount?: number } = {},
): Promise<string | null> {
  if (!supabase) return null;

  const startDate = options.startDate || '2025-12-01';
  const endDate = options.endDate || '2025-12-05';
  const totalAmount = options.amount || 50000;

  // Intentar buscar uno existente
  const { data: existing } = await supabase
    .from('bookings')
    .select('id')
    .eq('renter_id', renterId)
    .eq('car_id', carId)
    .eq('status', 'pending')
    .maybeSingle();

  if (existing) return existing.id;

  // Crear nuevo
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      renter_id: renterId,
      owner_id: ownerId,
      car_id: carId,
      start_date: startDate,
      end_date: endDate,
      status: 'pending',
      total_amount: totalAmount,
      currency: 'ARS',
      payment_mode: 'instant',
      // Campos mínimos para que no falle la UI
      price_per_day: 10000,
      days: 5,
    })
    .select('id')
    .single();

  if (error) {
    warn(`Error creando booking: ${error.message}`);
    return null;
  }

  return data.id;
}

export async function createPendingBooking(
  renter: TestUser,
  owner: TestUser,
  options: { startDate?: string; endDate?: string; amount?: number } = {},
): Promise<string> {
  if (!supabase) throw new Error('Supabase no configurado para createPendingBooking');

  const renterId = await ensureUser(renter);
  const ownerId = await ensureUser(owner);

  if (!renterId || !ownerId) throw new Error('Error creando usuarios para booking');

  // Asegurar auto del dueño
  await ensureCar(ownerId);

  // Obtener ID del auto (asumimos que ensureCar creó uno o ya existía)
  const { data: car } = await supabase
    .from('cars')
    .select('id')
    .eq('owner_id', ownerId)
    .limit(1)
    .single();

  if (!car) throw new Error('No se pudo obtener el auto para el booking');

  const bookingId = await ensureBooking(renterId, ownerId, car.id, options);
  if (!bookingId) throw new Error('No se pudo crear el booking');

  return bookingId;
}

async function ensureSeedViaApi(payload: Record<string, unknown>) {
  if (!seedEndpoint) return false;
  try {
    await fetch(seedEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    info(`Seed ejecutado vía endpoint ${seedEndpoint}`);
    return true;
  } catch (err) {
    warn(`Seed endpoint falló: ${String(err)}`);
    return false;
  }
}

export type SeedOptions = {
  renter?: TestUser;
  owner?: TestUser;
  preloadWalletCents?: number;
  extraPayload?: Record<string, unknown>;
};

/**
 * Crea datos mínimos para flujos de booking/checkout.
 * Idempotente: usa upsert y claves fijas.
 */
export async function seedTestData(options: SeedOptions = {}) {
  const renter = options.renter || generateTestUser('locatario');
  const owner = options.owner || generateTestUser('locador');
  const payload = { renter, owner, ...options.extraPayload };

  // 1) Intentar seed por endpoint (más fiel al dominio si existe)
  if (await ensureSeedViaApi(payload)) return;

  // 2) Fallback: supabase directo (service role)
  if (!supabase) {
    warn('Sin TEST_SEED_ENDPOINT ni SUPABASE_SERVICE_ROLE_KEY; seedTestData es no-op');
    return;
  }

  const renterId = (await ensureUser(renter)) || '';
  const ownerId = (await ensureUser(owner)) || '';

  if (ownerId) {
    await ensureCar(ownerId);
  }
  if (renterId && options.preloadWalletCents) {
    await ensureWallet(renterId, options.preloadWalletCents);
  }

  info('Seed local completado (Supabase)');
}

/**
 * Limpieza best-effort de datos creados por seedTestData.
 * No falla si faltan permisos o tablas; loguea y sigue.
 */
export async function cleanupTestData(renterEmail?: string, ownerEmail?: string) {
  if (!supabase) {
    warn('Supabase no configurado; cleanup es no-op');
    return;
  }

  const emails = [renterEmail, ownerEmail].filter(Boolean) as string[];
  if (emails.length === 0) {
    warn('cleanupTestData sin emails específicos: omitiendo (evita borrar datos reales)');
    return;
  }

  try {
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) throw error;

    const toDelete = data.users.filter((u) => u.email && emails.includes(u.email));
    for (const user of toDelete) {
      await supabase.auth.admin.deleteUser(user.id);
      await supabase.from('profiles').delete().eq('id', user.id);
      await supabase.from('bookings').delete().or(`renter_id.eq.${user.id},owner_id.eq.${user.id}`);
      await supabase.from('cars').delete().eq('owner_id', user.id);
      await supabase.from('user_wallets').delete().eq('user_id', user.id);
      info(`Eliminado usuario de prueba ${user.email}`);
    }
  } catch (err) {
    warn(`cleanupTestData error: ${String(err)}`);
  }
}

/**
 * Navegación directa con preparación de backend vía API.
 * Útil para tests que quieren saltar pasos previos.
 */
export async function prepareAndGoto(
  page: any,
  entryPoint: string,
  prep: SeedOptions = {},
) {
  await seedTestData(prep);
  await page.goto(entryPoint);
}
