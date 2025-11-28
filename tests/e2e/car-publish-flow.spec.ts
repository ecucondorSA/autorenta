import { test, expect, defineBlock } from '../checkpoint/fixtures'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { PublishCarPage } from '../page-objects/cars/PublishCarPage'

/**
 * E2E Test: Car Publish Flow (Owner)
 * MIGRADO A ARQUITECTURA CHECKPOINT & HYDRATE
 *
 * Flujo en 1 bloque atómico:
 * B1: Publicar auto y verificar estado pending en BD
 *
 * Priority: P0 (Owner Critical)
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

test.use({ storageState: 'tests/.auth/owner.json' })

test.skip(!hasEnvVars, 'Requires SUPABASE_SERVICE_ROLE_KEY')

test.describe('P0 - Publicación de auto (owner) - Checkpoint Architecture', () => {

  test('B1: Publicar auto y verificar estado pending', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b1-car-publish-pending', 'Publicar auto pending', {
      priority: 'P0',
      estimatedDuration: 45000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      const publishPage = new PublishCarPage(page)
      const uniquePlate = `E2E${randomUUID().slice(0, 8).toUpperCase()}`

      await publishPage.publishCar(
        {
          brand: 'Toyota',
          model: 'Corolla',
          year: 2022,
          color: 'Azul',
          licensePlate: uniquePlate,
          description: 'E2E publish flow',
          pricePerDay: 15000,
          city: 'Buenos Aires',
          address: 'Av. Corrientes 1234',
        },
        { useStockPhotos: false }
      )

      expect(await publishPage.isPublishSuccessful()).toBeTruthy()

      if (!supabase) throw new Error('Supabase client not initialized')
      const { data, error } = await supabase
        .from('cars')
        .select('id,status,plate,user_id')
        .eq('plate', uniquePlate)
        .single()

      expect(error).toBeNull()
      expect(data?.user_id).toBe(OWNER_ID)
      expect(data?.status).toBe('pending')
      console.log('✅ Auto publicado en estado pending')

      return { carId: data?.id, plate: uniquePlate, status: data?.status }
    })

    expect(result.state.status).toBe('passed')
  })
})
