/**
 * Helper de seed para tests E2E.
 *
 * Nota: este helper intenta localizar un endpoint de seed local (`TEST_SEED_ENDPOINT`) para
 * ejecutar automáticamente el SQL en un entorno de pruebas. Si no existe, el test debería
 * ejecutar manualmente `database/seed/owner-dashboard.sql` antes de correr los E2E.
 */
import fetch from 'node-fetch';

export async function runOwnerSeed(): Promise<void> {
  const endpoint = process.env.TEST_SEED_ENDPOINT;
  if (!endpoint) {
    console.warn('[tests/helpers/seed] No TEST_SEED_ENDPOINT configurado. Ejecutá database/seed/owner-dashboard.sql manualmente.');
    return;
  }

  try {
    const res = await fetch(endpoint, { method: 'POST' });
    if (!res.ok) throw new Error(`Seed failed: ${res.status} ${res.statusText}`);
    console.log('[tests/helpers/seed] Seed ejecutada correctamente');
  } catch (err) {
    console.warn('[tests/helpers/seed] Error ejecutando seed:', err);
  }
}
