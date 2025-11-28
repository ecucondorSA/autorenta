import { test, expect, defineBlock, requiresCheckpoint, withCheckpoint } from '../checkpoint/fixtures'
import { createClient } from '@supabase/supabase-js'

/**
 * Owner Test: Edit Published Car
 * MIGRADO A ARQUITECTURA CHECKPOINT & HYDRATE
 *
 * Flujo en 5 bloques atómicos:
 * B1: Setup - crear auto de test
 * B2: Navegar a "My Cars"
 * B3: Editar precio
 * B4: Editar descripción
 * B5: Verificar persistencia
 *
 * Prioridad: P1 (Owner Edit Flow)
 */

const supabaseUrl = process.env.NG_APP_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NG_APP_SUPABASE_ANON_KEY || ''

interface EditCarContext {
  supabase?: ReturnType<typeof createClient>
  testCarId?: string
  ownerUserId?: string
}

const ctx: EditCarContext = {}

test.use({ storageState: 'tests/.auth/owner.json' })

test.describe('Owner Edit Car - Checkpoint Architecture', () => {

  test.beforeEach(async () => {
    ctx.supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Get owner test user ID
    const { data: ownerProfile } = await ctx.supabase
      .from('profiles')
      .select('id')
      .ilike('email', '%owner.test%')
      .single()

    if (!ownerProfile) {
      throw new Error('Owner test user not found in database')
    }

    ctx.ownerUserId = ownerProfile.id

    // Create test car
    const { data: car, error } = await ctx.supabase
      .from('cars')
      .insert({
        owner_id: ctx.ownerUserId,
        title: `Test Car for Editing ${Date.now()}`,
        description: 'Original description for testing',
        brand: 'Toyota',
        model: 'Corolla',
        year: 2023,
        price_per_day: 5000,
        location_city: 'Montevideo',
        location_state: 'Montevideo',
        location_country: 'UY',
        status: 'active',
        seats: 5,
        transmission: 'automatic',
        fuel_type: 'gasoline',
      })
      .select()
      .single()

    if (error || !car) {
      throw new Error(`Failed to create test car: ${error?.message}`)
    }

    ctx.testCarId = car.id
    console.log(`✅ Created test car with ID: ${ctx.testCarId}`)
  })

  test.afterEach(async () => {
    if (ctx.testCarId && ctx.supabase) {
      await ctx.supabase.from('cars').delete().eq('id', ctx.testCarId)
      console.log(`🧹 Cleaned up test car: ${ctx.testCarId}`)
    }
  })

  test('B1: Navegar a "My Cars" page', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b1-edit-navigate-my-cars', 'Navegar a mis autos', {
      priority: 'P1',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: [],
      ...withCheckpoint('edit-my-cars-page')
    }))

    const result = await block.execute(async () => {
      await page.goto('/cars/mine')
      await expect(page.locator('h1, h2').filter({ hasText: /Mis (Autos|Vehículos)/i })).toBeVisible({
        timeout: 10000,
      })
      console.log('✅ Navegado a "My Cars" page')

      return { navigated: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B2: Listar autos del owner', async ({ page, checkpointManager, createBlock }) => {
    const prev = await checkpointManager.loadCheckpoint('edit-my-cars-page')
    if (prev) {
      await checkpointManager.restoreCheckpoint(prev)
    } else {
      await page.goto('/cars/mine')
    }

    const block = createBlock(defineBlock('b2-edit-list-cars', 'Listar autos', {
      priority: 'P1',
      estimatedDuration: 10000,
      preconditions: [requiresCheckpoint('edit-my-cars-page')],
      postconditions: [],
      ...withCheckpoint('edit-cars-listed')
    }))

    const result = await block.execute(async () => {
      await page.waitForTimeout(2000)

      const carCards = page.locator('app-car-card')
      const count = await carCards.count()

      expect(count).toBeGreaterThan(0)
      console.log(`✅ Found ${count} car(s) in "My Cars"`)

      return { carCount: count }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B3: Editar precio del auto', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b3-edit-price', 'Editar precio', {
      priority: 'P1',
      estimatedDuration: 15000,
      preconditions: [],
      postconditions: [],
      ...withCheckpoint('edit-price-done')
    }))

    const result = await block.execute(async () => {
      if (!ctx.testCarId || !ctx.supabase) {
        return { skipped: true, reason: 'no test car' }
      }

      await page.goto(`/cars/publish?edit=${ctx.testCarId}`)
      await page.waitForTimeout(2000)

      const priceInput = page.locator(
        'input[formControlName="price_per_day"], input[name="price_per_day"], input[placeholder*="precio" i]'
      ).first()

      await priceInput.waitFor({ state: 'visible', timeout: 10000 })

      const originalPrice = await priceInput.inputValue()
      const newPrice = '7500'

      await priceInput.clear()
      await priceInput.fill(newPrice)

      const submitButton = page.locator(
        'button[type="submit"]:has-text("Guardar"), button[type="submit"]:has-text("Actualizar"), button[type="submit"]:has-text("Save")'
      ).first()

      await submitButton.click()
      await page.waitForTimeout(3000)

      // Verificar en DB
      const { data: updatedCar } = await ctx.supabase
        .from('cars')
        .select('price_per_day')
        .eq('id', ctx.testCarId)
        .single()

      expect(updatedCar?.price_per_day).toBe(parseInt(newPrice))
      console.log(`✅ Price updated: ${originalPrice} → ${newPrice}`)

      return { priceUpdated: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B4: Editar descripción del auto', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b4-edit-description', 'Editar descripción', {
      priority: 'P1',
      estimatedDuration: 15000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      if (!ctx.testCarId || !ctx.supabase) {
        return { skipped: true, reason: 'no test car' }
      }

      await page.goto(`/cars/publish?edit=${ctx.testCarId}`)
      await page.waitForTimeout(2000)

      const descInput = page.locator(
        'textarea[formControlName="description"], textarea[name="description"], textarea[placeholder*="descripción" i]'
      ).first()

      await descInput.waitFor({ state: 'visible', timeout: 10000 })

      const newDescription = `Updated description at ${new Date().toISOString()}`

      await descInput.clear()
      await descInput.fill(newDescription)

      const submitButton = page.locator(
        'button[type="submit"]:has-text("Guardar"), button[type="submit"]:has-text("Actualizar"), button[type="submit"]:has-text("Save")'
      ).first()

      await submitButton.click()
      await page.waitForTimeout(3000)

      // Verificar en DB
      const { data: updatedCar } = await ctx.supabase
        .from('cars')
        .select('description')
        .eq('id', ctx.testCarId)
        .single()

      expect(updatedCar?.description).toContain('Updated description')
      console.log('✅ Description updated successfully')

      return { descriptionUpdated: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B5: Verificar persistencia después de navegación', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b5-edit-persistence', 'Verificar persistencia', {
      priority: 'P1',
      estimatedDuration: 20000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      if (!ctx.testCarId) {
        return { skipped: true, reason: 'no test car' }
      }

      // Editar auto
      await page.goto(`/cars/publish?edit=${ctx.testCarId}`)
      await page.waitForTimeout(2000)

      const newPrice = '9500'
      const priceInput = page.locator('input[formControlName="price_per_day"]').first()
      await priceInput.waitFor({ state: 'visible', timeout: 10000 })
      await priceInput.clear()
      await priceInput.fill(newPrice)

      const submitButton = page.locator('button[type="submit"]').first()
      await submitButton.click()
      await page.waitForTimeout(3000)

      // Navegar away
      await page.goto('/cars/mine')
      await page.waitForTimeout(2000)

      // Navegar back
      await page.goto(`/cars/publish?edit=${ctx.testCarId}`)
      await page.waitForTimeout(2000)

      // Verificar precio persistió
      const priceValue = await priceInput.inputValue()
      expect(priceValue).toBe(newPrice)
      console.log(`✅ Edit persisted after navigation: ${priceValue}`)

      return { persistenceVerified: true }
    })

    expect(result.state.status).toBe('passed')
  })
})
