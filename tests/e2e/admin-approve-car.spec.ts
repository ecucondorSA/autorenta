import { test, expect, defineBlock } from '../checkpoint/fixtures'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage'

/**
 * E2E Test: Admin Car Approval
 * MIGRADO A ARQUITECTURA CHECKPOINT & HYDRATE
 *
 * Flujo en 1 bloque atómico:
 * B1: Aprobar auto pendiente y verificar estado en BD
 *
 * Priority: P0 (Admin Critical)
 */

const supabaseUrl =
  process.env.NG_APP_SUPABASE_URL || process.env.SUPABASE_URL || process.env.PLAYWRIGHT_SUPABASE_URL
const supabaseServiceRole =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE ||
  process.env.SUPABASE_SERVICE_KEY

const hasEnvVars = !!(supabaseUrl && supabaseServiceRole)

let supabase: SupabaseClient | null = null
if (hasEnvVars) {
  supabase = createClient(supabaseUrl!, supabaseServiceRole!)
}
const OWNER_ID = 'e2e-owner--0000-0000-000000000002'

async function ensurePendingCar(): Promise<{ id: string; plate: string }> {
  if (!supabase) throw new Error('Supabase client not initialized')
  const plate = `PEND${randomUUID().slice(0, 6).toUpperCase()}`
  const id = `e2e-car-pending-${randomUUID().replace(/-/g, '').slice(0, 12)}`
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
  })

  if (insert.error) throw insert.error
  return { id, plate }
}

test.use({ storageState: 'tests/.auth/admin.json' })

test.skip(!hasEnvVars, 'Requires SUPABASE_SERVICE_ROLE_KEY')

test.describe('P0 - Aprobación de auto (admin) - Checkpoint Architecture', () => {

  test('B1: Aprobar auto pendiente y verificar estado', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b1-admin-approve-car', 'Aprobar auto pendiente', {
      priority: 'P0',
      estimatedDuration: 30000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      const pendingCar = await ensurePendingCar()
      const adminPage = new AdminDashboardPage(page)

      await adminPage.goto()
      await adminPage.waitForStatsLoad()

      const pendingCount = await adminPage.getPendingCarsCount()
      expect(pendingCount).toBeGreaterThan(0)

      await adminPage.approveFirstCar()

      const { data, error } = await supabase!
        .from('cars')
        .select('status')
        .eq('id', pendingCar.id)
        .single()

      expect(error).toBeNull()
      expect(data?.status).toBe('active')
      console.log('✅ Auto aprobado correctamente')

      return { carId: pendingCar.id, status: data?.status }
    })

    expect(result.state.status).toBe('passed')
  })
})
